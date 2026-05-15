from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Usa o IP do cliente como chave de identificação.
# Em produção atrás de proxy (nginx), configure PROPAGATE_EXCEPTIONS e
# use get_remote_address ou uma função que leia X-Forwarded-For com confiança.
limiter = Limiter(
    key_func=get_remote_address,
    # Armazena contadores em memória por padrão.
    # Em produção com múltiplos workers, use Redis:
    # storage_uri="redis://localhost:6379"
    default_limits=[],  # sem limite global — só aplicamos onde queremos
    headers_enabled=True,  # envia X-RateLimit-* nos headers da resposta
)

def init_limiter(app):
    limiter.init_app(app)