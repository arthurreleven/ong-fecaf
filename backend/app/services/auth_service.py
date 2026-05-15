from datetime import datetime, timezone
from typing import Optional
from flask import session
from app.database.db import db
from app.models.usuario import Usuario


class AuthService:

    @staticmethod
    def login(email: str, senha: str) -> Optional[Usuario]:
        """Valida credenciais e inicia a sessão. Retorna None se inválido."""
        usuario = Usuario.query.filter_by(email=email.lower().strip(), ativo=True).first()
        if not usuario or not usuario.verificar_senha(senha):
            return None

        # Salva na sessão Flask
        session["usuario_id"] = usuario.id
        session["papel"]      = usuario.papel
        session.permanent     = True

        # Atualiza último acesso
        usuario.ultimo_acesso = datetime.now(timezone.utc)
        db.session.commit()

        return usuario

    @staticmethod
    def logout() -> None:
        session.clear()

    @staticmethod
    def usuario_atual() -> Optional[Usuario]:
        usuario_id = session.get("usuario_id")
        if not usuario_id:
            return None
        return Usuario.query.get(usuario_id)

    @staticmethod
    def criar_usuario(nome: str, email: str, senha: str, papel: str = "funcionario") -> Usuario:
        if papel not in ("admin", "funcionario"):
            raise ValueError("Papel inválido. Use 'admin' ou 'funcionario'.")

        if Usuario.query.filter_by(email=email.lower().strip()).first():
            raise ValueError("E-mail já cadastrado.")

        usuario = Usuario(nome=nome, email=email.lower().strip(), papel=papel)
        usuario.set_senha(senha)
        db.session.add(usuario)
        db.session.commit()
        return usuario

    @staticmethod
    def atualizar_usuario(usuario_id: int, dados: dict) -> Optional[Usuario]:
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return None

        if "nome" in dados:
            usuario.nome = dados["nome"]
        if "email" in dados:
            novo_email = dados["email"].lower().strip()
            if novo_email != usuario.email and Usuario.query.filter_by(email=novo_email).first():
                raise ValueError("E-mail já em uso.")
            usuario.email = novo_email
        if "papel" in dados:
            if dados["papel"] not in ("admin", "funcionario"):
                raise ValueError("Papel inválido.")
            usuario.papel = dados["papel"]
        if "ativo" in dados:
            usuario.ativo = bool(dados["ativo"])
        if "senha" in dados and dados["senha"]:
            usuario.set_senha(dados["senha"])

        db.session.commit()
        return usuario

    @staticmethod
    def deletar_usuario(usuario_id: int, admin_id: int) -> bool:
        """Admin não pode se auto-deletar."""
        if usuario_id == admin_id:
            raise ValueError("Você não pode remover sua própria conta.")
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return False
        db.session.delete(usuario)
        db.session.commit()
        return True

    @staticmethod
    def listar_usuarios() -> list:
        return [u.to_dict() for u in Usuario.query.order_by(Usuario.data_criacao.desc()).all()]