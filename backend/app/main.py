from __future__ import annotations

import asyncio
import datetime as dt
import logging
import uuid
from typing import List, Optional

import os

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from . import auth, models, schemas
from .database import Base, engine
from .dependencies import get_current_user, get_db, get_token
from .services.motivation import MotivationMessageService
from .services.usda_db import search_usda_foods, get_usda_db, get_usda_food_detail, preload_usda_gold

# Configure logging
logging.basicConfig(level=logging.INFO)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="From Fat To Fit API", version="0.1.0")

logger = logging.getLogger(__name__)

# Preload USDA gold table at startup so first autocomplete is fast
@app.on_event("startup")
async def _preload_usda_gold() -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, preload_usda_gold)

# Initialize USDA database on startup (lazy - only when needed)
# Note: We don't initialize on startup to avoid reload loops with uvicorn --reload
# The database will initialize automatically on first search request

DEFAULT_ALLOWED_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}


def _get_allowed_origins() -> list[str]:
    raw_origins = os.environ.get("CORS_ALLOW_ORIGINS")
    if not raw_origins:
        return sorted(DEFAULT_ALLOWED_ORIGINS)
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
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
    db.flush()
    MotivationMessageService(db).apply(user, summary)
    return summary


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


@app.delete("/meals/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(
    meal_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meal = (
        db.query(models.Meal)
        .filter(models.Meal.id == meal_id, models.Meal.user_id == current_user.id)
        .first()
    )
    if meal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")

    meal_date = meal.date
    db.delete(meal)
    db.flush()
    _recalculate_summary(db, current_user, meal_date)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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


@app.get("/messages/today", response_model=schemas.MotivationMessageOut)
def get_today_message(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = dt.date.today()
    summary = _recalculate_summary(db, current_user, today)
    return schemas.build_message_response(summary)


@app.get("/messages/{date}", response_model=schemas.MotivationMessageOut)
def get_message_by_date(
    date: dt.date,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    summary = _recalculate_summary(db, current_user, date)
    return schemas.build_message_response(summary)


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


@app.get("/foods/search", response_model=schemas.FoodSearchResponse)
def search_foods(
    query: str,
    limit: int = 10,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    normalized_query = query.strip()
    if len(normalized_query) < 2:
        return schemas.FoodSearchResponse(query=normalized_query, results=[])

    limit = max(1, min(limit, 25))
    results: List[models.FoodItem] = []
    
    # First, search USDA database
    usda_results = search_usda_foods(normalized_query, limit=limit, include_micronutrients=False)
    for usda_food in usda_results:
        # Check if already imported
        existing = db.query(models.FoodItem).filter(
            models.FoodItem.provider == "usda",
            models.FoodItem.provider_food_id == str(usda_food["fdc_id"])
        ).first()
        
        if existing:
            results.append(existing)
        else:
            # Import USDA food into FoodItem table
            food_item = models.FoodItem(
                provider="usda",
                provider_food_id=str(usda_food["fdc_id"]),
                name=usda_food.get("description", ""),
                brand_name=usda_food.get("brand_owner"),
                serving_description=(
                    f"{usda_food.get('serving_size', '')} {usda_food.get('serving_size_unit', '')}".strip()
                    if usda_food.get("serving_size") else None
                ),
                calories=usda_food.get("kcal"),
                protein=usda_food.get("protein_g"),
                carbs=usda_food.get("carb_g"),
                fat=usda_food.get("fat_g"),
            )
            db.add(food_item)
            db.flush()
            results.append(food_item)
    
    # If we don't have enough results, search local FoodItem table
    if len(results) < limit:
        remaining = limit - len(results)
        cached_items: List[models.FoodItem] = (
            db.query(models.FoodItem)
            .filter(
                or_(
                    models.FoodItem.name.ilike(f"%{normalized_query}%"),
                    models.FoodItem.brand_name.ilike(f"%{normalized_query}%"),
                )
            )
            .filter(
                or_(
                    models.FoodItem.created_by_user_id.is_(None),
                    models.FoodItem.created_by_user_id == current_user.id,
                )
            )
            .filter(
                ~models.FoodItem.id.in_([r.id for r in results] if results else [])
            )
            .order_by(models.FoodItem.search_count.desc(), models.FoodItem.updated_at.desc())
            .limit(remaining)
            .all()
        )
        results.extend(cached_items)
    
    # Update search counts
    for item in results:
        if hasattr(item, 'search_count'):
            item.search_count += 1
    
    db.commit()
    return schemas.FoodSearchResponse(query=normalized_query, results=results[:limit])


@app.get("/foods/{food_id}/nutrition", response_model=schemas.FoodNutritionDetail)
def get_food_nutrition(
    food_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    food: Optional[models.FoodItem] = (
        db.query(models.FoodItem)
        .filter(models.FoodItem.id == food_id)
        .first()
    )

    if food is None or (food.created_by_user_id and food.created_by_user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food not found")

    payload = {
        "id": food.id,
        "provider": food.provider,
        "provider_food_id": food.provider_food_id,
        "name": food.name,
        "brand_name": food.brand_name,
        "serving_description": food.serving_description,
        "calories": food.calories,
        "protein": food.protein,
        "carbs": food.carbs,
        "fat": food.fat,
        "micronutrients": {},
        "per_100": {
            "unit": "serving",
            "amount": 1.0,
            "calories": food.calories,
            "protein": food.protein,
            "carbs": food.carbs,
            "fat": food.fat,
        },
        "unit_category": "mass",
    }

    if food.provider == "usda" and food.provider_food_id:
        try:
            fdc_id = int(food.provider_food_id)
        except ValueError:
            fdc_id = None

        if fdc_id is not None:
            usda_detail = get_usda_food_detail(fdc_id)
            if usda_detail:
                payload.update(
                    {
                        "name": usda_detail.get("description") or payload["name"],
                        "brand_name": usda_detail.get("brand_owner") or payload["brand_name"],
                        "serving_size": usda_detail.get("serving_size"),
                        "serving_size_unit": usda_detail.get("serving_size_unit"),
                        "calories": usda_detail.get("kcal", payload["calories"]),
                        "protein": usda_detail.get("protein_g", payload["protein"]),
                        "carbs": usda_detail.get("carb_g", payload["carbs"]),
                        "fat": usda_detail.get("fat_g", payload["fat"]),
                        "micronutrients": usda_detail.get("micronutrients", {}),
                        "per_100": usda_detail.get("per_100", payload["per_100"]),
                        "unit_category": usda_detail.get("unit_category", payload["unit_category"]),
                    }
                )

    return schemas.FoodNutritionDetail(**payload)


@app.post("/foods", response_model=schemas.FoodItemOut, status_code=status.HTTP_201_CREATED)
def create_food_item(
    food_in: schemas.FoodItemCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = food_in.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Food name is required")

    def _clean(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    brand_name = _clean(food_in.brand_name)
    serving_description = _clean(food_in.serving_description)

    existing = (
        db.query(models.FoodItem)
        .filter(
            models.FoodItem.provider == "local",
            models.FoodItem.created_by_user_id == current_user.id,
            models.FoodItem.name.ilike(name),
            (models.FoodItem.brand_name == brand_name),
            (models.FoodItem.serving_description == serving_description),
        )
        .first()
    )

    target = existing or models.FoodItem(
        provider="local",
        provider_food_id=str(uuid.uuid4()),
        created_by_user=current_user,
    )

    target.name = name
    target.brand_name = brand_name
    target.serving_description = serving_description
    target.calories = food_in.calories
    target.protein = food_in.protein
    target.carbs = food_in.carbs
    target.fat = food_in.fat
    target.last_refreshed = dt.datetime.utcnow()

    if existing is None:
        db.add(target)

    db.flush()
    return target
