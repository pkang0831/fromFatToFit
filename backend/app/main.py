from __future__ import annotations

import datetime as dt
from typing import List

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import auth, models, schemas
from .database import Base, engine
from .dependencies import get_current_user, get_db, get_token

Base.metadata.create_all(bind=engine)

app = FastAPI(title="From Fat To Fit API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _ensure_daily_summary(db: Session, user: models.User, date: dt.date) -> models.DailySummary:
    summary = (
        db.query(models.DailySummary)
        .filter(models.DailySummary.user_id == user.id, models.DailySummary.date == date)
        .first()
    )
    if summary is None:
        summary = models.DailySummary(user=user, date=date)
        db.add(summary)
        db.flush()
    return summary


def _recalculate_summary(db: Session, user: models.User, date: dt.date) -> models.DailySummary:
    totals = (
        db.query(
            models.FoodEntry.calories,
            models.FoodEntry.protein,
            models.FoodEntry.carbs,
            models.FoodEntry.fat,
        )
        .join(models.MealItem, models.MealItem.id == models.FoodEntry.meal_item_id)
        .join(models.Meal, models.Meal.id == models.MealItem.meal_id)
        .filter(models.Meal.user_id == user.id, models.Meal.date == date)
        .all()
    )

    total_calories = sum(entry.calories for entry in totals) if totals else 0.0
    total_protein = sum((entry.protein or 0.0) for entry in totals) if totals else 0.0
    total_carbs = sum((entry.carbs or 0.0) for entry in totals) if totals else 0.0
    total_fat = sum((entry.fat or 0.0) for entry in totals) if totals else 0.0

    summary = _ensure_daily_summary(db, user, date)
    summary.total_calories = total_calories
    summary.total_protein = total_protein
    summary.total_carbs = total_carbs
    summary.total_fat = total_fat
    summary.motivation_message = _generate_message(user.daily_calorie_target, total_calories)
    db.flush()
    return summary


def _generate_message(target: int, total: float) -> str:
    diff = total - target
    if diff > 200:
        return "You're in a calorie surplus today. Consider a light evening walk to balance things out!"
    if diff < -200:
        return "Nice deficit! Make sure you're fueling enough to keep energy levels high."
    return "Right on target—consistency pays off. Keep it up!"


@app.post("/auth/register", response_model=schemas.SessionOut, status_code=status.HTTP_201_CREATED)
def register_user(user_in: schemas.UserCreate, response: Response, db: Session = Depends(get_db)):
    existing = db.execute(select(models.User).where(models.User.email == user_in.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = models.User(
        email=user_in.email,
        password_hash=auth.hash_password(user_in.password),
        daily_calorie_target=user_in.daily_calorie_target,
    )
    db.add(user)
    db.flush()

    session = auth.create_session_for_user(db, user)
    response.set_cookie(key="session_token", value=session.token, httponly=True)
    return schemas.SessionOut(token=session.token, user=user)


@app.post("/auth/login", response_model=schemas.SessionOut)
def login_user(
    credentials: schemas.UserLogin, response: Response, db: Session = Depends(get_db)
):
    user = db.execute(select(models.User).where(models.User.email == credentials.email)).scalar_one_or_none()
    if user is None or not auth.verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if credentials.daily_calorie_target and credentials.daily_calorie_target != user.daily_calorie_target:
        user.daily_calorie_target = credentials.daily_calorie_target

    session = auth.create_session_for_user(db, user)
    response.set_cookie(key="session_token", value=session.token, httponly=True)
    return schemas.SessionOut(token=session.token, user=user)


@app.get("/auth/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.post("/meals", response_model=schemas.MealOut, status_code=status.HTTP_201_CREATED)
def create_meal(
    meal_in: schemas.MealCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meal_date = meal_in.date or dt.date.today()

    meal = models.Meal(user=current_user, name=meal_in.name, date=meal_date)
    db.add(meal)
    db.flush()

    for item in meal_in.items:
        meal_item = models.MealItem(
            meal=meal,
            name=item.name,
            quantity=item.quantity,
            notes=item.notes,
        )
        db.add(meal_item)
        db.flush()
        db.add(
            models.FoodEntry(
                meal_item=meal_item,
                calories=item.nutrition.calories,
                protein=item.nutrition.protein,
                carbs=item.nutrition.carbs,
                fat=item.nutrition.fat,
            )
        )

    _recalculate_summary(db, current_user, meal_date)
    db.refresh(meal)
    return meal


@app.get("/dashboard", response_model=schemas.DashboardResponse)
def get_dashboard(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = dt.date.today()
    meals: List[models.Meal] = (
        db.query(models.Meal)
        .filter(models.Meal.user_id == current_user.id, models.Meal.date == today)
        .order_by(models.Meal.id.desc())
        .all()
    )
    summary = _recalculate_summary(db, current_user, today)
    return schemas.DashboardResponse(user=current_user, meals=meals, summary=summary)


@app.get("/summaries/{date}", response_model=schemas.DailySummaryOut)
def get_summary_by_date(
    date: dt.date,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    summary = _recalculate_summary(db, current_user, date)
    return summary


@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    token: str = Depends(get_token),
    db: Session = Depends(get_db),
):
    user = auth.get_user_by_token(db, token)
    if user is not None:
        session = (
            db.query(models.SessionToken)
            .filter(models.SessionToken.user_id == user.id, models.SessionToken.token == token)
            .first()
        )
        if session:
            db.delete(session)
    response.delete_cookie("session_token")
    return response
