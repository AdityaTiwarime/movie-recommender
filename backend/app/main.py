from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import recommend, movies
from app.startup import auto_setup


@asynccontextmanager
async def lifespan(app: FastAPI):
    auto_setup()
    yield


app = FastAPI(title="Movie Recommender API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommend.router)
app.include_router(movies.router)


@app.get("/")
def health():
    return {"status": "ok"}
