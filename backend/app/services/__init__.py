from flask import Flask
from flask_cors import CORS

from app.config.settings import Config
from app.database.db import init_db


def create_app() -> Flask:
     app = Flask(__name__)
    app.config.from_object(Config)

    app.permanent_session_lifetime = timedelta(hours=8)

    CORS(app, origins="*", supports_credentials=False)

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

    # Banco de dados
    init_db(app)

    # Blueprints
    app.register_blueprint(doacoes_bp)

    # Rota de health-check
    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app