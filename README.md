# Expense Bot AI

AI-powered expense tracking bot that extracts expense data from photos, voice messages, and manual text input using Groq AI.

## Features

- **Photo Receipt Scanning**: Upload receipt photos - Groq vision AI extracts all expense details
- **Voice Input**: Record voice messages - Groq speech model transcribes and parses expenses
- **Manual Text Entry**: Type expenses naturally - AI normalizes and categorizes automatically
- **Custom Categories**: Define your own expense categories with colors and icons
- **End-to-End Encryption**: All sensitive data encrypted with AES-GCM
- **Multi-platform**: Telegram bot integration ready
- **Privacy First**: User data isolation with group sharing support

## Tech Stack

- **Backend**: Python 3.11 + FastAPI
- **Database**: PostgreSQL 15
- **AI**: Groq AI (LLaMA, Whisper, Vision models)
- **Encryption**: AES-GCM with cryptography library
- **Containerization**: Docker + Docker Compose
- **ORM**: SQLAlchemy + Alembic migrations

## Run Locally with npm (no Docker)

This repo now boots the Python API and the Next.js dashboard without Docker, only using `npm` commands:

1. **Configure environment**  
   ```bash
   cp .env.example .env            # fill in GROQ_API_KEY, TELEGRAM_BOT_TOKEN, ENCRYPTION_KEY, etc.
   ```
   When `npm run backend:setup` runs it will read the credentials from `.env`. Without the keys the Telegram bot and Groq features will not work.

2. **Install tooling** (installs the root dev tool + Next.js workspace)  
   ```bash
   npm install
   ```

3. **Bootstrap the backend virtualenv + DB**  
   ```bash
   npm run bootstrap   # creates venv, pip install, alembic upgrade, double‑checks web deps
   ```

4. **Start everything**  
   ```bash
   npm run dev
   ```
   This runs the FastAPI server on `http://localhost:8000` and the Next.js app on `http://localhost:3000` via `concurrently`. The UI automatically points to `NEXT_PUBLIC_API_URL` (defaults to the local API).

> By default these scripts point `DATABASE_URL` to the local SQLite file `expensebot.db`. Export your own `DATABASE_URL` before running the scripts if you prefer Postgres.

Useful extra scripts:

- `npm run backend:dev` – run only the FastAPI server (requires previous `npm run backend:setup`)
- `npm run web:dev` – run only the Next.js UI (`expense-web`)
- `npm run web:build` / `npm run web:start` – production build + start for the UI

> Tip: If you ever change Python dependencies, re-run `npm run backend:setup`. If you reset your database, delete `expensebot.db` and repeat the bootstrap step.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Groq API Key ([get one here](https://console.groq.com))
- Telegram Bot Token (optional, for bot integration)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd TelegramBotAI
```

2. **Configure environment variables**
```bash
cp .env.example .env
# sau rulează wizard-ul: ./scripts/bootstrap_env.sh
```

Edit `.env` and add your credentials:
```env
DATABASE_URL=postgresql://expenseuser:expensepass@db:5432/expensebot
GROQ_API_KEY=your_groq_api_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
ENCRYPTION_KEY=your_base64_encoded_32_byte_key
JWT_SECRET_KEY=your_jwt_secret_key
DOMAIN=example.com
WEB_DOMAIN=example.com
NEXT_PUBLIC_API_URL=https://example.com/api
API_BASE_URL=http://app:8000
```

- `DOMAIN` este domeniul care pointează spre server (FastAPI + Next.js).
- `WEB_DOMAIN` poate fi același cu `DOMAIN` (totul pe un singur host) sau un subdomeniu separat pentru UI.
- `NEXT_PUBLIC_API_URL` este URL-ul public folosit de browser (implicit `https://DOMAIN/api`).
- `API_BASE_URL` is the internal URL that the Next.js server components use when running inside Docker (defaults to `http://app:8000`).
- For a detailed description of every variable see [`ENVIRONMENT.md`](ENVIRONMENT.md).

3. **Start the application**
```bash
docker-compose up --build
```

The API will be available at `http://localhost:8000`

4. **Run database migrations**
```bash
docker-compose exec app alembic upgrade head
```

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Expenses
- `POST /api/v1/expenses/photo` - Upload receipt photo
- `POST /api/v1/expenses/voice` - Upload voice message
- `POST /api/v1/expenses/manual` - Submit text expense
- `GET /api/v1/expenses` - List all expenses

#### Categories
- `POST /api/v1/categories` - Create category
- `GET /api/v1/categories` - List categories
- `PUT /api/v1/categories/{id}` - Update category
- `DELETE /api/v1/categories/{id}` - Delete category

#### Authentication
- `POST /auth/telegram_bind` - Bind Telegram account

### Example Usage

**Manual Text Entry:**
```bash
curl -X POST "http://localhost:8000/api/v1/expenses/manual" \
  -H "Content-Type: application/json" \
  -d '{"text": "Am cumpărat cafea la Starbucks, 50 lei"}'
```

Response:
```json
{
  "status": "success",
  "expense_id": "123e4567-e89b-12d3-a456-426614174000",
  "data": {
    "amount": 50.0,
    "currency": "MDL",
    "vendor": "Starbucks",
    "category": "Food",
    "confidence": 0.95
  }
}
```

**Photo Upload:**
```bash
curl -X POST "http://localhost:8000/api/v1/expenses/photo" \
  -F "file=@receipt.jpg"
```

**Create Custom Category:**
```bash
curl -X POST "http://localhost:8000/api/v1/categories" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Groceries",
    "color": "#4CAF50",
    "icon": "🛒"
  }'
```

## Development

### Project Structure

```
TelegramBotAI/
├── app/
│   ├── api/              # API endpoints
│   │   ├── auth.py
│   │   ├── categories.py
│   │   ├── expenses.py
│   │   └── schemas.py
│   ├── models/           # SQLAlchemy models
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── expense.py
│   │   └── database.py
│   ├── services/         # Business logic
│   │   └── groq_client.py
│   ├── utils/            # Utilities
│   │   ├── config.py
│   │   └── crypto.py
│   └── main.py           # FastAPI app
├── migrations/           # Alembic migrations
├── tests/                # Unit tests
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

### Running Tests

```bash
# Install dev dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/
```

### Database Migrations

```bash
# Create new migration
docker-compose exec app alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec app alembic upgrade head

# Rollback
docker-compose exec app alembic downgrade -1
```

## Security

- **Encryption**: All sensitive data (vendor names, json_data) encrypted with AES-GCM
- **User Isolation**: Each user sees only their own expenses
- **Group Permissions**: Optional group sharing with role-based access
- **JWT Authentication**: 24-hour token expiration
- **Environment Variables**: Sensitive keys stored in .env (never committed)

## Groq AI Integration

### Models Used

- **Text/Chat**: `llama-3.3-70b-versatile` - Expense parsing from text
- **Vision**: `llama-3.2-90b-vision-preview` - Receipt OCR and parsing
- **Speech**: `whisper-large-v3` - Voice transcription

### Response Format

All Groq endpoints return a consistent JSON structure:
```json
{
  "amount": 250.50,
  "currency": "MDL",
  "vendor": "Kaufland",
  "purchase_date": "2025-11-02",
  "category": "Groceries",
  "items": [
    {"name": "Coffee", "qty": 1, "price": 199.90},
    {"name": "Milk", "qty": 1, "price": 50.60}
  ],
  "notes": "Receipt info",
  "language": "ro",
  "confidence": 0.94
}
```

## Roadmap

### MVP (Completed)
- ✅ Docker infrastructure
- ✅ Database models and migrations
- ✅ AES-GCM encryption
- ✅ Groq AI integration
- ✅ Photo/Voice/Manual endpoints
- ✅ Custom categories
- ⚠️ JWT authentication (TODO)
- ⚠️ User/group permissions (TODO)

### Post-MVP
- [ ] Telegram bot interface
- [ ] CSV export functionality
- [ ] Web dashboard (React/Next.js)
- [ ] Google Sheets sync
- [ ] Daily expense notifications
- [ ] Multi-currency support
- [ ] Expense analytics

## License

MIT

## Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: See [CLAUDE.md](CLAUDE.md) for development guide
