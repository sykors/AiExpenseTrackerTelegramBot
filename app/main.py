from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import expenses, categories, auth, webhook, statistics
from app.utils.config import settings

app = FastAPI(
    title="Expense Bot AI",
    description="AI-powered expense tracking with Groq integration",
    version="1.0.0"
)

# CORS middleware - Allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(expenses.router, prefix="/api/v1/expenses", tags=["Expenses"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(statistics.router, prefix="/api/v1/statistics", tags=["Statistics"])
app.include_router(webhook.router, prefix="/api/v1/telegram", tags=["Telegram Bot"])

@app.get("/")
async def root():
    return {"message": "Expense Bot AI - API is running"}

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "expense-bot-ai"
    }
