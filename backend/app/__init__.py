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

    app.permanent_session_lifetime = timedelta(hours=8)

    CORS(app, origins="*", supports_credentials=False)

    # Garantia manual — injeta CORS em TODAS as respostas
    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

    # Responde preflight OPTIONS globalmente
    @app.before_request
    def handle_options():
        if request.method == "OPTIONS":
            res = app.make_default_options_response()
            res.headers["Access-Control-Allow-Origin"] = "*"
            res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            res.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            return res

            
    init_db(app)

    app.register_blueprint(doacoes_bp)
    app.register_blueprint(auth_bp)

    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app