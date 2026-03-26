import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://localhost/pingpong-tourney")
PORT = int(os.getenv("PORT", "3001"))
