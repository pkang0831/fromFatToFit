from __future__ import annotations

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from . import auth, models
from .database import get_session


def get_db() -> Session:
    with get_session() as session:
        yield session


async def get_token(
    authorization: str | None = Header(default=None), session_token: str | None = Cookie(default=None)
) -> str:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1]
    if session_token:
        return session_token
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing session token")


async def get_current_user(token: str = Depends(get_token), db: Session = Depends(get_db)) -> models.User:
    user = auth.get_user_by_token(db, token)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token")
    return user
