from datetime import datetime, timezone
from app.database.db import db


class Doacao(db.Model):
    __tablename__ = "doacoes"

    # ── Identificação ──────────────────────────────────────────────────────────
    id      = db.Column(db.Integer, primary_key=True)
    # Para PIX via MP: payment_id do Mercado Pago. Único para evitar duplicatas.
    e2e_id  = db.Column(db.String(50), unique=True, nullable=True, index=True)

    # ── Dados do doador ────────────────────────────────────────────────────────
    doador_nome  = db.Column(db.String(120), nullable=False)
    doador_email = db.Column(db.String(120), nullable=True)   # retornado pelo MP

    # ── Valores ────────────────────────────────────────────────────────────────
    valor = db.Column(db.Numeric(10, 2), nullable=False)

    # ── Tipo e origem ──────────────────────────────────────────────────────────
    # "pix" | "transferencia" | "dinheiro" | "item"
    tipo   = db.Column(db.String(20), nullable=False, default="pix")
    # "webhook" = automático via MP | "manual" = cadastrado pela equipe
    origem = db.Column(db.String(10), nullable=False, default="manual")

    # Para doações de itens físicos
    descricao  = db.Column(db.Text,    nullable=True)
    categoria  = db.Column(db.String(50), nullable=True)
    quantidade = db.Column(db.Integer, nullable=True)

    # ── Status ─────────────────────────────────────────────────────────────────
    # "pendente" | "confirmado" | "cancelado"
    status = db.Column(db.String(20), nullable=False, default="pendente")

    # ── Datas ──────────────────────────────────────────────────────────────────
    data_doacao      = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    data_criacao     = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    data_atualizacao = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    # ── Payload bruto do MP (para auditoria) ───────────────────────────────────
    webhook_payload = db.Column(db.JSON, nullable=True)

    def to_dict(self) -> dict:
        return {
            "id":           self.id,
            "e2e_id":       self.e2e_id,
            "doador_nome":  self.doador_nome,
            "doador_email": self.doador_email,
            "valor":        float(self.valor),
            "tipo":         self.tipo,
            "origem":       self.origem,
            "descricao":    self.descricao,
            "categoria":    self.categoria,
            "quantidade":   self.quantidade,
            "status":       self.status,
            "data_doacao":  self.data_doacao.isoformat(),
            "data_criacao": self.data_criacao.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Doacao id={self.id} valor={self.valor} status={self.status}>"