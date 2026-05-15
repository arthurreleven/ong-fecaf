from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app.database.db import db


class Usuario(db.Model):
    __tablename__ = "usuarios"

    id         = db.Column(db.Integer, primary_key=True)
    nome       = db.Column(db.String(120), nullable=False)
    email      = db.Column(db.String(120), unique=True, nullable=False, index=True)
    senha_hash = db.Column(db.String(256), nullable=False)

    # "admin" | "funcionario"
    papel   = db.Column(db.String(20), nullable=False, default="funcionario")
    ativo   = db.Column(db.Boolean,    nullable=False, default=True)

    data_criacao  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    ultimo_acesso = db.Column(db.DateTime, nullable=True)

    def set_senha(self, senha: str) -> None:
        self.senha_hash = generate_password_hash(senha)

    def verificar_senha(self, senha: str) -> bool:
        return check_password_hash(self.senha_hash, senha)

    def is_admin(self) -> bool:
        return self.papel == "admin"

    def to_dict(self) -> dict:
        return {
            "id":           self.id,
            "nome":         self.nome,
            "email":        self.email,
            "papel":        self.papel,
            "ativo":        self.ativo,
            "data_criacao": self.data_criacao.isoformat(),
            "ultimo_acesso": self.ultimo_acesso.isoformat() if self.ultimo_acesso else None,
        }