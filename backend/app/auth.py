from __future__ import annotations

import datetime as dt
import uuid

from passlib.context import CryptContext
from sqlalchemy.orm import Session
from typing import Optional

from . import models

pwd_context = CryptContext(
    schemes=["bcrypt", "bcrypt_sha256"],
    deprecated="auto",
    bcrypt_sha256__deprecated=True,
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_session_for_user(db: Session, user: models.User) -> models.SessionToken:
    token = str(uuid.uuid4())
    session = models.SessionToken(token=token, user=user)
    db.add(session)
    db.flush()
    return session


def get_user_by_token(db: Session, token: str) -> Optional[models.User]:
    if not token:
        return None
    session = (
        db.query(models.SessionToken)
        .filter(models.SessionToken.token == token)
        .order_by(models.SessionToken.created_at.desc())
        .first()
    )
    if session is None:
        return None
    if session.expires_at and session.expires_at < dt.datetime.utcnow():
        return None
    return session.user
