from functools import wraps
from flask import jsonify
from app.services.auth_service import AuthService


def login_required(f):
    """Bloqueia rotas para usuários não autenticados."""
    @wraps(f)
    def decorated(*args, **kwargs):
        usuario = AuthService.usuario_atual()
        if not usuario:
            return jsonify({"erro": "Autenticação necessária."}), 401
        if not usuario.ativo:
            return jsonify({"erro": "Conta desativada."}), 403
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Bloqueia rotas para usuários que não são administradores."""
    @wraps(f)
    def decorated(*args, **kwargs):
        usuario = AuthService.usuario_atual()
        if not usuario:
            return jsonify({"erro": "Autenticação necessária."}), 401
        if not usuario.is_admin():
            return jsonify({"erro": "Acesso restrito a administradores."}), 403
        return f(*args, **kwargs)
    return decorated