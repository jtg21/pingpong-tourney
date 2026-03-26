from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.tournament import router

app = FastAPI(title="Ping Pong Tournament")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3002",
        "https://pingpong-tourney.scrytime.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
