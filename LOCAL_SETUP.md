# Local Development Setup (Without Docker)

Run the Expense Bot AI directly on your machine without Docker!

## TL;DR – npm workflow

```bash
cp .env.example .env   # fill in GROQ_API_KEY, TELEGRAM_BOT_TOKEN, etc.
npm install
npm run bootstrap      # prepares Python venv + SQLite DB
npm run dev            # starts FastAPI (8000) + Next.js (3000)
```

- The scripts default to `DATABASE_URL=sqlite:///./expensebot.db`. Export `DATABASE_URL` before running them if you want to point at Postgres or another database.
- `npm run backend:dev` starts only the API (useful for debugging the bot)
- `npm run web:dev` starts only the Next.js dashboard inside `expense-web`
- `npm run backend:setup` can be re-run anytime you update Python deps or want to recreate the DB

The rest of this guide documents manual control of the backend if you prefer running each command yourself.

## Prerequisites

- Python 3.11 or higher
- pip (Python package manager)

**No need for:**
- ❌ Docker
- ❌ PostgreSQL
- ❌ Redis

We use **SQLite** for local development - it's built into Python!

## Quick Start (Automatic)

### macOS / Linux

```bash
./run_local.sh
```

### Windows

```bash
run_local.bat
```

That's it! The script will:
1. Create virtual environment
2. Install dependencies
3. Run database migrations
4. Start the server

## Manual Setup

If you prefer to run commands manually:

### 1. Create Virtual Environment

```bash
# macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements-local.txt
```

### 3. Run Database Migrations

```bash
alembic upgrade head
```

This creates the SQLite database file: `expensebot.db`

### 4. Start the Server

```bash
uvicorn app.main:app --reload
```

## Verify Setup

Open your browser:
- **API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health

Or use curl:
```bash
curl http://localhost:8000/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "service": "expense-bot-ai"
}
```

## Test the API

### Create a Category

```bash
curl -X POST "http://localhost:8000/api/v1/categories" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Food",
    "color": "#FF9800",
    "icon": "🍔"
  }'
```

### Add an Expense

```bash
curl -X POST "http://localhost:8000/api/v1/expenses/manual" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bought coffee at Starbucks for 50 MDL"
  }'
```

### List Expenses

```bash
curl http://localhost:8000/api/v1/expenses
```

## Database Management

### View Database

The SQLite database is in: `expensebot.db`

You can view it with:
- **DB Browser for SQLite**: https://sqlitebrowser.org/
- **SQLite CLI**:
  ```bash
  sqlite3 expensebot.db
  .tables
  SELECT * FROM expenses;
  .quit
  ```

### Reset Database

```bash
# Delete database file
rm expensebot.db

# Re-run migrations
alembic upgrade head
```

### Create New Migration

```bash
alembic revision --autogenerate -m "description of changes"
alembic upgrade head
```

## Environment Variables

The `.env` file is already configured for local development:

```env
# SQLite database (local file)
DATABASE_URL=sqlite:///./expensebot.db

# Your Groq API key (already configured)
GROQ_API_KEY=gsk_o15R...

# Telegram token (already configured)
TELEGRAM_BOT_TOKEN=8260315731:AAH...

# Encryption & JWT (already configured)
ENCRYPTION_KEY=dGhpc...
JWT_SECRET_KEY=super-secret...
```

**No changes needed!**

## Hot Reload

The server runs with `--reload` flag, so code changes auto-restart the server:

1. Edit any `.py` file
2. Save it
3. Server restarts automatically
4. Refresh your browser or re-run curl

## Development Workflow

```bash
# Start server
./run_local.sh

# In another terminal, test API
curl http://localhost:8000/docs

# Make code changes in your editor
# Server restarts automatically

# Stop server: Ctrl+C
```

## Troubleshooting

### Port Already in Use

```bash
# Use different port
uvicorn app.main:app --reload --port 8001
```

### Module Not Found

```bash
# Make sure virtual environment is activated
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements-local.txt
```

### Database Locked

```bash
# Stop any running server instances
# Then restart
./run_local.sh
```

### Groq API Error

Check your API key:
```bash
cat .env | grep GROQ_API_KEY
```

Verify at: https://console.groq.com

## VS Code Integration

### Recommended Extensions

- Python
- Pylance
- SQLite Viewer

### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "app.main:app",
        "--reload"
      ],
      "jinja": true
    }
  ]
}
```

Now you can debug with F5!

## Testing

### Run Tests

```bash
pytest tests/ -v
```

### Run Specific Test

```bash
pytest tests/test_crypto.py -v
```

### Coverage Report

```bash
pip install pytest-cov
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

## Differences from Docker Setup

| Feature | Local (SQLite) | Docker (Postgres) |
|---------|----------------|-------------------|
| Database | SQLite file | PostgreSQL container |
| Setup Time | 30 seconds | 2-3 minutes |
| Dependencies | Python only | Docker required |
| Data Persistence | `expensebot.db` | Docker volume |
| Redis | Not used | Available |
| Production Ready | No | Yes |

**For development**: Local setup is faster and easier.
**For production**: Use Docker with PostgreSQL.

## Switching to Docker

To switch back to Docker later:

1. Edit `.env`:
   ```env
   DATABASE_URL=postgresql://expenseuser:expensepass@db:5432/expensebot
   ```

2. Start Docker:
   ```bash
   docker-compose up --build
   ```

## Next Steps

1. ✅ Server is running locally
2. 📚 Read [API_EXAMPLES.md](API_EXAMPLES.md) for all endpoints
3. 🧪 Test features with Swagger UI
4. 💻 Start coding!

## Support

- **Groq API Docs**: https://console.groq.com/docs
- **FastAPI Tutorial**: https://fastapi.tiangolo.com/tutorial/
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org/

---

**Happy Local Development!** 🚀

All core features work locally:
- ✅ Photo receipt scanning with Groq AI
- ✅ Voice message parsing
- ✅ Manual text entry
- ✅ Custom categories
- ✅ Encryption
