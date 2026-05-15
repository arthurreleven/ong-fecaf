from flask import Blueprint, request, jsonify
from app.services.auth_service import AuthService
from app.services.limiter import limiter
from app.services.decorators import login_required, admin_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


# ── Login com proteção contra força bruta ─────────────────────────────────────
#
# Regras por IP:
#   5 tentativas por minuto  → bloqueia por ~1 minuto
#   20 tentativas por hora   → bloqueia por ~1 hora
#
# Flask-Limiter retorna 429 automaticamente se ultrapassar.
# O contador reseta sozinho após a janela de tempo.

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
@limiter.limit("20 per hour")
def login():
    dados = request.get_json()
    if not dados:
        return jsonify({"erro": "Body obrigatório."}), 400

    email = dados.get("email", "").strip()
    senha = dados.get("senha", "")

    if not email or not senha:
        return jsonify({"erro": "E-mail e senha obrigatórios."}), 400

    usuario = AuthService.login(email, senha)
    if not usuario:
        # Mensagem genérica — não revela se o e-mail existe
        return jsonify({"erro": "E-mail ou senha incorretos."}), 401

    return jsonify({"mensagem": "Login realizado com sucesso.", "usuario": usuario.to_dict()}), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    AuthService.logout()
    return jsonify({"mensagem": "Logout realizado."}), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    usuario = AuthService.usuario_atual()
    return jsonify(usuario.to_dict()), 200


@auth_bp.route("/usuarios", methods=["GET"])
@admin_required
def listar_usuarios():
    return jsonify(AuthService.listar_usuarios()), 200


@auth_bp.route("/usuarios", methods=["POST"])
@admin_required
def criar_usuario():
    dados = request.get_json()
    if not dados:
        return jsonify({"erro": "Body obrigatório."}), 400
    try:
        u = AuthService.criar_usuario(dados.get("nome",""), dados.get("email",""), dados.get("senha",""), dados.get("papel","funcionario"))
        return jsonify(u.to_dict()), 201
    except ValueError as e:
        return jsonify({"erro": str(e)}), 400


@auth_bp.route("/usuarios/<int:uid>", methods=["PATCH"])
@admin_required
def atualizar_usuario(uid: int):
    dados = request.get_json()
    if not dados:
        return jsonify({"erro": "Body obrigatório."}), 400
    try:
        u = AuthService.atualizar_usuario(uid, dados)
        if not u:
            return jsonify({"erro": "Usuário não encontrado."}), 404
        return jsonify(u.to_dict()), 200
    except ValueError as e:
        return jsonify({"erro": str(e)}), 400


@auth_bp.route("/usuarios/<int:uid>", methods=["DELETE"])
@admin_required
def deletar_usuario(uid: int):
    admin = AuthService.usuario_atual()
    try:
        ok = AuthService.deletar_usuario(uid, admin.id)
        if not ok:
            return jsonify({"erro": "Usuário não encontrado."}), 404
        return jsonify({"mensagem": "Usuário removido."}), 200
    except ValueError as e:
        return jsonify({"erro": str(e)}), 400