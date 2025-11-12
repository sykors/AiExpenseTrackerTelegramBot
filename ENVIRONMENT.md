# Environment Reference

Everything in this project is configured through `.env`.  
Fill in the values once and both Docker Compose files (backend + Next.js web) will read them.

## Setup rapid

Rulează `./scripts/bootstrap_env.sh` pentru un wizard interactiv care îți generează `.env` (îți cere domeniul, email-ul SSL și cheile necesare).

## Minimal values you must set

| Variable | Required | Used By | Why it matters |
| --- | --- | --- | --- |
| `GROQ_API_KEY` / `GROQAPIKEY` | ✅ | FastAPI | Groq AI models for OCR/voice/text |
| `TELEGRAM_BOT_TOKEN` / `telegramToken` | ✅ | FastAPI bot handlers | Allows the API to send/receive messages via Telegram |
| `ENCRYPTION_KEY` | ✅ | FastAPI | AES‑GCM encryption of sensitive columns (generate with `openssl rand -hex 32`) |
| `JWT_SECRET_KEY` | ✅ | FastAPI | Issues session tokens for the web UI |
| `DOMAIN` | ✅ | Nginx, SSL, web UI | Public hostname that will serve the API (ex: `api.example.com`) |
| `WEB_DOMAIN` | ✅ | Nginx, web UI | Public hostname for interfața Next.js – poate fi același cu `DOMAIN` dacă vrei totul pe un singur domeniu |
| `NEXT_PUBLIC_API_URL` | ✅ | Next.js (client) | Browser calls hit this URL (implicit `https://<DOMAIN>/api`) |
| `API_BASE_URL` | ✅ | Next.js (server) | Server components call the API through this URL (`http://app:8000` when everything runs in Docker) |
| `SSL_EMAIL` | ✅ (production) | `setup-ssl.sh` | Used by Let's Encrypt when issuing certificates |

## Service-specific variables

### Telegram Bot
- `TELEGRAM_BOT_TOKEN` (preferred) or `telegramToken`: token from [@BotFather](https://t.me/BotFather).
- After the stack is up, point the webhook to `https://<DOMAIN>/api/v1/telegram/webhook` using `./update-webhook.sh` or `setup_telegram_bot.sh`.
- Optional access control:
  - `ALLOWED_GROUP_ID`: numeric chat/group id that is allowed to talk to the bot.
  - `ALLOWED_USER_IDS`: comma-separated list of Telegram user IDs.

### Database + Redis
- `DATABASE_URL`: default already points to the Postgres container (`postgresql://expenseuser:expensepass@db:5432/expensebot`).
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`: keep in sync with the value used in `DATABASE_URL`.
- `REDIS_URL`: defaults to `redis://redis:6379` which hits the Redis container.

### Security / Auth
- `ENCRYPTION_KEY`: 32-byte hex string (`openssl rand -hex 32`).
- `JWT_SECRET_KEY`: random base64 string for signing JWTs.
- `JWT_ALGORITHM`, `JWT_EXPIRATION_HOURS`: advanced overrides, defaults are fine.
- `DEFAULT_USER_ID`: optional fixed UUID if you pre-create demo data.

- `DOMAIN`: hostname-ul public. Dacă `WEB_DOMAIN` nu este setat, și UI și API-ul folosesc același domeniu.
- `WEB_DOMAIN`: seteaz-o doar dacă vrei UI-ul pe alt host (ex. `app.domain.com`). Lasă goală pentru același domeniu.
- `NEXT_PUBLIC_API_URL`: URL-ul public pe care îl folosește browserul (`https://domain.com/api` by default).
- `API_BASE_URL`: URL that the Next.js server components use. In Docker keep it internal: `http://app:8000`.
- `ADDITIONAL_CORS_ORIGINS`: comma-separated list of extra origins if you expose more frontends.

### Miscellaneous
- `APP_PORT`: defaults to `8000`.
- `LOG_LEVEL`: defaults to `info`.
- `SERVER_IP`: optional helper for scripts/documentation.

## Fill `.env` in this order

```env
# 1. External domains + SSL
DOMAIN=example.com
WEB_DOMAIN=example.com          # sau app.example.com dacă vrei domeniu separat
NEXT_PUBLIC_API_URL=https://example.com/api
API_BASE_URL=http://app:8000
SSL_EMAIL=you@example.com

# 2. Secrets
GROQ_API_KEY=...
TELEGRAM_BOT_TOKEN=...
ENCRYPTION_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -base64 32)

# 3. Data layer
DATABASE_URL=postgresql://expenseuser:expensepass@db:5432/expensebot
DB_USER=expenseuser
DB_PASSWORD=expensepass
DB_NAME=expensebot
REDIS_URL=redis://redis:6379
```

Once this file is ready you can:

1. Run `./setup-ssl.sh` to issue certificates for both domains.
2. `docker-compose -f docker-compose.prod.yml up -d` (or `make prod`) to start **Postgres + Redis + FastAPI + Next.js + Nginx**.
3. Execute `./update-webhook.sh` to point Telegram to `https://DOMAIN/api/v1/telegram/webhook`.

If anything fails, re-check that DNS for both `DOMAIN` and `WEB_DOMAIN` points to your server IP and that ports `80` and `443` are open.
