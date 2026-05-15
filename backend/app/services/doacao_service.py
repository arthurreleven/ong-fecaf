import hashlib
import hmac
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional

import requests
from flask import current_app

from app.database.db import db
from app.models.doacao import Doacao


class MercadoPagoClient:
    """Wrapper mínimo para a API do Mercado Pago."""

    BASE_URL = "https://api.mercadopago.com"

    @staticmethod
    def buscar_pagamento(payment_id: str) -> dict:
        """GET /v1/payments/{id} — retorna todos os detalhes do pagamento."""
        token = current_app.config["MP_ACCESS_TOKEN"]
        url   = f"{MercadoPagoClient.BASE_URL}/v1/payments/{payment_id}"

        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()


class DoacaoService:

    @staticmethod
    def verificar_assinatura_mp(
        payload_id: str,
        request_id: str,
        ts: str,
        v1: str,
    ) -> bool:
        """
        Valida a assinatura do webhook do Mercado Pago.
        O MP assina: "id:{data.id};request-id:{x-request-id};ts:{ts};"
        Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
        """
        secret = current_app.config.get("MP_WEBHOOK_SECRET", "")
        if not secret:
            current_app.logger.warning("MP_WEBHOOK_SECRET não configurado — pulando validação.")
            return True

        manifest = f"id:{payload_id};request-id:{request_id};ts:{ts};"
        mac = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(mac, v1)

    @staticmethod
    def criar_de_webhook(payload: dict, request_id: str, x_signature: str) -> Optional[Doacao]:
        """
        Processa a notificação do Mercado Pago.

        O MP envia apenas { "type": "payment", "data": { "id": "12345" } }.
        Precisamos consultar a API deles para obter valor, pagador, etc.
        """
        # Só nos interessa o evento de pagamento via webhook novo.
        # O MP também envia notificações IPN legadas com type=None — ignoramos.
        if payload.get("type") != "payment":
            current_app.logger.info("Notificacao ignorada — type=%s", payload.get("type"))
            return None

        payment_id = str(payload.get("data", {}).get("id", ""))
        if not payment_id:
            return None

        # ── Validar assinatura ────────────────────────────────────────────────
        # Header x-signature vem como: "ts=1234567890,v1=abcdef..."
        ts, v1 = "", ""
        for parte in x_signature.split(","):
            parte = parte.strip()
            if parte.startswith("ts="):
                ts = parte[3:]
            elif parte.startswith("v1="):
                v1 = parte[3:]

        if not DoacaoService.verificar_assinatura_mp(payment_id, request_id, ts, v1):
            current_app.logger.warning("Assinatura inválida no webhook do MP.")
            return None

        # Idempotência: ignora se já processamos este payment_id
        if Doacao.query.filter_by(e2e_id=payment_id).first():
            current_app.logger.info(f"Webhook duplicado ignorado: payment_id={payment_id}")
            return None

        # ── Buscar detalhes do pagamento na API do MP ─────────────────────────
        try:
            dados = MercadoPagoClient.buscar_pagamento(payment_id)
        except requests.RequestException as e:
            current_app.logger.error(f"Erro ao buscar pagamento {payment_id} no MP: {e}")
            return None

        # Só confirmamos pagamentos aprovados
        if dados.get("status") != "approved":
            current_app.logger.info(f"Pagamento {payment_id} ignorado — status: {dados.get('status')}")
            return None

        # Só registramos se for PIX
        if dados.get("payment_method_id") != "pix":
            current_app.logger.info(f"Pagamento {payment_id} ignorado — método: {dados.get('payment_method_id')}")
            return None

        # ── Extrair dados do pagador ───────────────────────────────────────────
        pagador      = dados.get("payer", {})
        first_name   = pagador.get("first_name") or ""
        last_name    = pagador.get("last_name")  or ""
        nome_completo = f"{first_name} {last_name}".strip()

        # Tenta pegar o nome do banco via bank_info quando o MP não retorna
        bank_info    = dados.get("point_of_interaction", {}) \
                           .get("transaction_data", {}) \
                           .get("bank_info", {}) \
                           .get("payer", {})
        banco_nome   = bank_info.get("long_name") or ""

        doador_nome  = nome_completo or banco_nome or "Doador Anônimo"
        doador_email = pagador.get("email")

        # ── Salvar no banco ───────────────────────────────────────────────────
        doacao = Doacao(
            e2e_id          = payment_id,
            doador_nome     = doador_nome,
            doador_email    = doador_email,
            valor           = Decimal(str(dados.get("transaction_amount", 0))),
            tipo            = "pix",
            origem          = "webhook",
            status          = "confirmado",
            data_doacao     = datetime.fromisoformat(
                                dados.get("date_approved", datetime.now(timezone.utc).isoformat())
                              ),
            webhook_payload = dados,
        )

        db.session.add(doacao)
        db.session.commit()
        current_app.logger.info(f"Doação via PIX salva: id={doacao.id} valor={doacao.valor}")
        return doacao

    @staticmethod
    def criar_manual(dados: dict) -> Doacao:
        """Cria uma doação manualmente pela equipe da ONG."""
        doacao = Doacao(
            doador_nome  = dados["doador_nome"],
            doador_email = dados.get("doador_email"),
            valor        = Decimal(str(dados.get("valor", 0))),
            tipo         = dados.get("tipo", "dinheiro"),
            origem       = "manual",
            status       = dados.get("status", "pendente"),
            descricao    = dados.get("descricao"),
            categoria    = dados.get("categoria"),
            quantidade   = dados.get("quantidade"),
            data_doacao  = datetime.fromisoformat(dados["data_doacao"])
                           if dados.get("data_doacao")
                           else datetime.now(timezone.utc),
        )
        db.session.add(doacao)
        db.session.commit()
        return doacao

    @staticmethod
    def listar(
        tipo:       Optional[str] = None,
        status:     Optional[str] = None,
        pagina:     int = 1,
        por_pagina: int = 20,
    ) -> dict:
        query = Doacao.query.order_by(Doacao.data_criacao.desc())
        if tipo:
            query = query.filter_by(tipo=tipo)
        if status:
            query = query.filter_by(status=status)

        paginado = query.paginate(page=pagina, per_page=por_pagina, error_out=False)
        return {
            "items":         [d.to_dict() for d in paginado.items],
            "total":         paginado.total,
            "pagina":        pagina,
            "total_paginas": paginado.pages,
        }

    @staticmethod
    def atualizar_status(doacao_id: int, status: str) -> Optional[Doacao]:
        doacao = Doacao.query.get(doacao_id)
        if not doacao:
            return None
        doacao.status = status
        db.session.commit()
        return doacao

    @staticmethod
    def resumo() -> dict:
        from sqlalchemy import func
        from datetime import date

        total_dinheiro = db.session.query(
            func.sum(Doacao.valor)
        ).filter(
            Doacao.status == "confirmado",
            Doacao.tipo.in_(["pix", "transferencia", "dinheiro"])
        ).scalar() or 0

        total_itens = db.session.query(
            func.sum(Doacao.quantidade)
        ).filter(
            Doacao.status == "confirmado",
            Doacao.tipo == "item"
        ).scalar() or 0

        mes_atual = date.today().replace(day=1)
        do_mes    = Doacao.query.filter(Doacao.data_criacao >= mes_atual).count()
        pendentes = Doacao.query.filter_by(status="pendente").count()

        return {
            "total_dinheiro": float(total_dinheiro),
            "total_itens":    int(total_itens),
            "do_mes":         do_mes,
            "pendentes":      pendentes,
        }