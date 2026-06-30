"""
Database configuration and session management.

Uses SQLite by default (file-based, zero external dependency, perfect for a
containerized demo project). Can be swapped for Postgres by changing
DATABASE_URL in the environment without touching any other code, since all
access goes through SQLAlchemy's ORM layer.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////app/data/movies.db")

# check_same_thread is only required for SQLite; harmless to set conditionally.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session and ensures it closes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
