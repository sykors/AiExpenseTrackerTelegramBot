from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql://expenseuser:expensepass@db:5432/expensebot"

    # Groq AI
    GROQ_API_KEY: str

    # Security
    ENCRYPTION_KEY: str
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Telegram
    TELEGRAM_BOT_TOKEN: str

    # Access Control
    ALLOWED_GROUP_ID: int = -5028155280  # Group ID care poate folosi bot-ul
    ALLOWED_USER_IDS: str = ""  # Lista de user IDs separați prin virgulă
    DEFAULT_USER_ID: str = ""
    DOMAIN: str | None = None
    WEB_DOMAIN: str | None = None
    NEXT_PUBLIC_API_URL: str | None = None
    API_BASE_URL: str | None = None
    ADDITIONAL_CORS_ORIGINS: str = ""

    @property
    def allowed_origins(self) -> list[str]:
        """
        Build the list of origins that can talk to the API (used for CORS).
        Values come from env so Docker + Next.js only need .env updates.
        """
        origins: list[str] = []
        seen: set[str] = set()

        def add_origin(value: str | None, allow_plain_domain: bool = True):
            if not value:
                return

            raw = value.strip()
            if not raw:
                return

            # If scheme missing, add both https and http variants
            if allow_plain_domain and not raw.startswith(("http://", "https://")):
                candidates = [f"https://{raw}", f"http://{raw}"]
            else:
                candidates = [raw]

            for candidate in candidates:
                normalized = candidate.rstrip("/")
                if normalized not in seen:
                    seen.add(normalized)
                    origins.append(normalized)

        # Local defaults for development
        add_origin("http://localhost:3000", allow_plain_domain=False)
        add_origin("http://localhost:3001", allow_plain_domain=False)

        # Frontend/web app domain
        add_origin(self.WEB_DOMAIN)

        # Public API URL (browser uses this)
        add_origin(self.NEXT_PUBLIC_API_URL, allow_plain_domain=False)

        # API domain (useful if web app served from same domain)
        add_origin(self.DOMAIN)

        if self.ADDITIONAL_CORS_ORIGINS:
            extras = [item.strip() for item in self.ADDITIONAL_CORS_ORIGINS.split(",")]
            for extra in extras:
                add_origin(extra, allow_plain_domain=False)

        return origins


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
