from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# database.py is at backend/app/database.py
# So parents[1] = backend/, parents[0] = backend/app/
BACKEND_ROOT = Path(__file__).resolve().parents[1]
# Use .as_posix() to ensure forward slashes on Windows
DATABASE_URL = f"sqlite:///{(BACKEND_ROOT / 'app.db').as_posix()}"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}, future=True, echo=False
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

Base = declarative_base()


@contextmanager
def get_session() -> Generator[Session, None, None]:
    session: Session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
