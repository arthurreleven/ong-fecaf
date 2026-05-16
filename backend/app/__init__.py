from datetime import timedelta
from flask import Flask
from flask_cors import CORS

from app.config.settings import Config
from app.database.db import init_db
from app.routes.doacoes import doacoes_bp
from app.routes.auth import auth_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # Sessão permanente de 8h
    app.permanent_session_lifetime = timedelta(hours=8)

    # CORS(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)
    CORS(
    app,
    origins="*",
    supports_credentials=False,  # OBRIGATÓRIO com origins="*"
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

    init_db(app)

    app.register_blueprint(doacoes_bp)
    app.register_blueprint(auth_bp)

    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app