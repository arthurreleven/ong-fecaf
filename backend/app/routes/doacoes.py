from flask import Blueprint, request, jsonify, current_app

from app.services.doacao_service import DoacaoService
from app.services.pix_service import PixService

doacoes_bp = Blueprint("doacoes", __name__, url_prefix="/api")


# ── Webhook Mercado Pago ───────────────────────────────────────────────────────

@doacoes_bp.route("/pix/webhook", methods=["POST", "OPTIONS"])
def pix_webhook():
    payload    = request.get_json(force=True, silent=True) or {}
    x_sig      = request.headers.get("x-signature", "")
    request_id = request.headers.get("x-request-id", "")

    current_app.logger.info(f"Webhook MP recebido: type={payload.get('type')} data={payload.get('data')}")

    doacao = DoacaoService.criar_de_webhook(payload, request_id, x_sig)
    if doacao:
        current_app.logger.info(f"Nova doação registrada: id={doacao.id} valor={doacao.valor}")

    return jsonify({"status": "ok"}), 200


# ── Gerar QR Code PIX ─────────────────────────────────────────────────────────

@doacoes_bp.route("/doacoes/gerar-pix", methods=["POST", "OPTIONS"])
def gerar_pix():
    try:
        dados = request.get_json()

        valor = dados.get("valor")
        email = dados.get("email", "doador@email.com")
        nome  = dados.get("nome",  "Doador")

        resultado = PixService.gerar_cobranca(
            valor=float(valor),
            email=email,
            nome=nome,
        )

        return jsonify(resultado), 201

    except Exception as e:
        return jsonify({
            "erro": str(e)
        }), 500


# ── CRUD de doações ────────────────────────────────────────────────────────────

@doacoes_bp.route("/doacoes", methods=["GET", "OPTIONS"])
def listar_doacoes():
    tipo       = request.args.get("tipo")
    status     = request.args.get("status")
    pagina     = int(request.args.get("pagina", 1))
    por_pagina = int(request.args.get("por_pagina", 20))

    resultado = DoacaoService.listar(
        tipo=tipo, status=status,
        pagina=pagina, por_pagina=por_pagina,
    )
    return jsonify(resultado), 200


@doacoes_bp.route("/doacoes", methods=["POST", "OPTIONS"])
def criar_doacao():
    dados = request.get_json()
    if not dados or not dados.get("doador_nome"):
        return jsonify({"erro": "doador_nome é obrigatório"}), 400

    doacao = DoacaoService.criar_manual(dados)
    return jsonify(doacao.to_dict()), 201


@doacoes_bp.route("/doacoes/<int:doacao_id>/status", methods=["PATCH"])
def atualizar_status(doacao_id: int):
    dados  = request.get_json()
    status = dados.get("status") if dados else None

    status_validos = {"pendente", "confirmado", "cancelado"}
    if status not in status_validos:
        return jsonify({"erro": f"Status inválido. Use: {status_validos}"}), 400

    doacao = DoacaoService.atualizar_status(doacao_id, status)
    if not doacao:
        return jsonify({"erro": "Doação não encontrada"}), 404

    return jsonify(doacao.to_dict()), 200


@doacoes_bp.route("/doacoes/resumo", methods=["GET", "OPTIONS"])
def resumo():
    return jsonify(DoacaoService.resumo()), 200


# ── Consultar status do pagamento (polling do frontend) ───────────────────────

@doacoes_bp.route("/doacoes/pix/<payment_id>/status", methods=["GET", "OPTIONS"])
def status_pix(payment_id: str):
    """
    O frontend chama esse endpoint a cada 5s para saber se o doador já pagou.
    Quando retornar approved, exibe a mensagem de agradecimento.
    """
    from app.services.pix_service import PixService
    status = PixService.consultar_status(payment_id)
    if status is None:
        return jsonify({"erro": "Pagamento não encontrado"}), 404
    return jsonify({"payment_id": payment_id, "status": status}), 200