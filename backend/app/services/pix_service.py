import uuid
from typing import Optional

import requests
from flask import current_app


class PixService:

    @staticmethod
    def gerar_cobranca(valor: float, email: str, nome: str) -> Optional[dict]:
        """
        Cria uma cobrança PIX no Mercado Pago e retorna o QR code para o doador.

        Fluxo:
          1. POST /v1/payments com payment_method_id=pix
          2. MP retorna qr_code (texto) e qr_code_base64 (imagem)
          3. Frontend exibe o QR code → doador paga → MP chama /pix/webhook
        """
        token        = current_app.config["MP_ACCESS_TOKEN"]
        webhook_url  = current_app.config.get("MP_WEBHOOK_URL", "")
        nome_parts   = nome.strip().split(" ", 1)
        first_name   = nome_parts[0]
        last_name    = nome_parts[1] if len(nome_parts) > 1 else "."

        payload = {
            "transaction_amount": round(valor, 2),
            "description":        "Doação ONG",
            "payment_method_id":  "pix",
            "notification_url":   webhook_url,
            "payer": {
                "email":      email,
                "first_name": first_name,
                "last_name":  last_name,
            },
        }

        try:
            response = requests.post(
                "https://api.mercadopago.com/v1/payments",
                json=payload,
                headers={
                    "Authorization":    f"Bearer {token}",
                    "Content-Type":     "application/json",
                    "X-Idempotency-Key": str(uuid.uuid4()),
                },
                timeout=15,
            )
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as e:
            current_app.logger.error(f"Erro ao criar cobrança PIX no MP: {e}")
            return None

        # Extrai os dados do QR code da resposta do MP
        tx_data  = data.get("point_of_interaction", {}).get("transaction_data", {})
        qr_code  = tx_data.get("qr_code")          # texto "copia e cola"
        qr_image = tx_data.get("qr_code_base64")   # imagem PNG em base64

        if not qr_code:
            current_app.logger.error(f"MP não retornou qr_code. Resposta: {data}")
            return None

        current_app.logger.info(f"QR code PIX gerado: payment_id={data.get('id')} valor={valor}")

        return {
            "payment_id":     data.get("id"),
            "status":         data.get("status"),          # "pending"
            "valor":          valor,
            "qr_code":        qr_code,        # para "copia e cola"
            "qr_code_base64": qr_image,       # para exibir a imagem no frontend
            "expiracao":      data.get("date_of_expiration"),
        }

    @staticmethod
    def consultar_status(payment_id: str) -> Optional[str]:
        """
        Consulta o status de um pagamento no MP.
        Útil para o frontend verificar se o doador já pagou (polling).
        Retorna: "pending" | "approved" | "rejected" | "cancelled"
        """
        token = current_app.config["MP_ACCESS_TOKEN"]

        try:
            response = requests.get(
                f"https://api.mercadopago.com/v1/payments/{payment_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            response.raise_for_status()
            return response.json().get("status")
        except requests.RequestException as e:
            current_app.logger.error(f"Erro ao consultar payment {payment_id}: {e}")
            return None








            