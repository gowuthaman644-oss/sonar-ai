from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os

from backend.api.analyze import router as analyze_router
from backend.api.history import router as history_router
from backend.api.stats import router as stats_router

from backend.database.database import Base, engine
from backend.database import models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SONAR-AI API",
    description="AI-powered Side-Scan Sonar Analysis Platform",
    version="1.0.0",
)

# Ensure upload directory exists before mounting
os.makedirs("outputs/uploads", exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory="outputs/uploads"), name="uploads")


app.include_router(analyze_router)
app.include_router(history_router)
app.include_router(stats_router)


@app.get("/")
def root():

    return {
        "message": "SONAR-AI API is running",
        "status": "ok"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }
