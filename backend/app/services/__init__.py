from flask import Flask
from flask_cors import CORS

from app.config.settings import Config
from app.database.db import init_db


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # CORS — permite o React (porta 5173) acessar a API
    # CORS(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)
    CORS(
        app,
        origins=app.config["CORS_ORIGINS"],
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Banco de dados
    init_db(app)

    # Blueprints
    app.register_blueprint(doacoes_bp)

    # Rota de health-check
    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app