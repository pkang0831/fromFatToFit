from __future__ import annotations

import asyncio
import datetime as dt
import logging
import uuid
import math
from typing import Any, Dict, List, Optional, Tuple

import os

from fastapi import Depends, FastAPI, File, HTTPException, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from . import auth, models, schemas
from .database import Base, engine
from .dependencies import get_current_user, get_db, get_token
from .services.motivation import MotivationMessageService
from .services.usda_db import (
    search_usda_foods,
    get_usda_food_detail,
    get_usda_gold_macros,
    preload_usda_gold,
)
from .services.exercise_db import search_exercises, calculate_calories_burned, get_categories


def calculate_bmr(height_cm: Optional[float], weight_kg: Optional[float], age: Optional[int], gender: Optional[str]) -> Optional[float]:
    """Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation.
    
    Returns None if any required parameter is missing.
    """
    if height_cm is None or weight_kg is None or age is None or gender is None:
        return None
    
    # BMR calculation (Mifflin-St Jeor equation)
    if gender.lower() == "male":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    elif gender.lower() == "female":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    else:
        return None
    
    return bmr


def get_activity_factor(activity_level: Optional[str]) -> float:
    """Get activity factor based on activity level."""
    activity_factors = {
        "sedentary": 1.2,      # Little to no exercise
        "light": 1.375,         # Light exercise 1-3 days/week
        "moderate": 1.55,       # Moderate exercise 3-5 days/week
        "heavy": 1.725,         # Heavy exercise 6-7 days/week
        "athlete": 1.9,         # Very heavy exercise, physical job
    }
    return activity_factors.get(activity_level or "sedentary", 1.2)


def calculate_tdee(height_cm: Optional[float], weight_kg: Optional[float], age: Optional[int], gender: Optional[str], activity_level: Optional[str] = None) -> Optional[float]:
    """Calculate TDEE (Total Daily Energy Expenditure) using BMR and activity level.
    
    Returns None if any required parameter is missing.
    """
    bmr = calculate_bmr(height_cm, weight_kg, age, gender)
    if bmr is None:
        return None
    
    activity_factor = get_activity_factor(activity_level)
    tdee = bmr * activity_factor
    
    return tdee


def calculate_bmi(weight_kg: Optional[float], height_cm: Optional[float]) -> Optional[float]:
    """Calculate BMI (Body Mass Index).
    
    Formula: weight_kg / (height_m)^2
    """
    if weight_kg is None or height_cm is None or height_cm <= 0:
        return None
    
    height_m = height_cm / 100.0
    bmi = weight_kg / (height_m * height_m)
    
    return bmi


def get_bmi_category(bmi: Optional[float]) -> str:
    """Get BMI category based on BMI value."""
    if bmi is None:
        return "Unknown"
    
    if bmi < 18.5:
        return "Underweight"
    elif bmi < 25:
        return "Normal Weight"
    elif bmi < 30:
        return "Overweight"
    else:
        return "Obese"


def calculate_fat_loss(tdee: Optional[float], total_calories: float) -> float:
    """Calculate fat loss in grams based on TDEE and total calories consumed.
    
    Formula: (TDEE - total_calories) * 0.7 / 9
    """
    if tdee is None:
        return 0.0
    
    calorie_deficit = tdee - total_calories
    if calorie_deficit <= 0:
        return 0.0
    
    # 지방 1g = 9kcal, 칼로리 부족분의 70%가 지방에서 온다고 가정
    fat_loss_g = (calorie_deficit * 0.7) / 9.0
    
    return max(0.0, fat_loss_g)

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

# 정적 파일 서빙 (업로드된 이미지)
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


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
    consumed_fat = sum((entry.fat or 0.0) for entry in totals) if totals else 0.0

    # 지방 감량 계산: (TDEE - 오늘 총 칼로리) * 0.7 / 9
    # Note: fat_loss는 계산되지만 별도 필드가 없으므로 현재는 저장하지 않음
    # total_fat는 실제 섭취한 지방을 저장해야 함 (프론트엔드에서 매크로 비율 계산에 사용)
    tdee = calculate_tdee(user.height_cm, user.weight_kg, user.age, user.gender, user.activity_level)
    fat_loss = calculate_fat_loss(tdee, total_calories)

    summary = _ensure_daily_summary(db, user, date)
    summary.total_calories = total_calories
    summary.total_protein = total_protein
    summary.total_carbs = total_carbs
    summary.total_fat = consumed_fat  # 실제 섭취한 지방 저장
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
        height_cm=user_in.height_cm,
        weight_kg=user_in.weight_kg,
        age=user_in.age,
        gender=user_in.gender,
        activity_level=user_in.activity_level or "sedentary",
    )
    db.add(user)
    db.flush()

    session = auth.create_session_for_user(db, user)
    response.set_cookie(
        key="session_token",
        value=session.token,
        httponly=True,
        samesite="lax",
        secure=False,  # 로컬 개발 환경에서는 False
        path="/",
    )
    return schemas.SessionOut(token=session.token, user=schemas.UserOut.from_orm(user))


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
    response.set_cookie(
        key="session_token",
        value=session.token,
        httponly=True,
        samesite="lax",
        secure=False,  # 로컬 개발 환경에서는 False
        path="/",
    )
    return schemas.SessionOut(token=session.token, user=schemas.UserOut.from_orm(user))


@app.get("/auth/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.patch("/auth/calorie-target", response_model=schemas.UserOut)
def update_calorie_target(
    target_update: schemas.CalorieTargetUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.daily_calorie_target = target_update.daily_calorie_target
    db.commit()
    db.refresh(current_user)
    return schemas.UserOut.from_orm(current_user)


@app.patch("/auth/profile", response_model=schemas.UserOut)
def update_user_profile(
    profile_update: schemas.UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if profile_update.height_cm is not None:
        current_user.height_cm = profile_update.height_cm
    if profile_update.weight_kg is not None:
        current_user.weight_kg = profile_update.weight_kg
    if profile_update.age is not None:
        current_user.age = profile_update.age
    if profile_update.gender is not None:
        current_user.gender = profile_update.gender
    if profile_update.activity_level is not None:
        current_user.activity_level = profile_update.activity_level
    
    db.commit()
    db.refresh(current_user)
    
    # 사용자 정보가 업데이트되면 오늘 날짜의 summary를 재계산
    today = dt.date.today()
    _recalculate_summary(db, current_user, today)
    db.commit()
    
    return schemas.UserOut.from_orm(current_user)


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


@app.patch("/meals/{meal_id}", response_model=schemas.MealOut)
def update_meal(
    meal_id: int,
    meal_update: schemas.MealUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Meal 정보 업데이트 (이름, 날짜)"""
    meal = (
        db.query(models.Meal)
        .filter(models.Meal.id == meal_id, models.Meal.user_id == current_user.id)
        .first()
    )
    if meal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")

    old_date = meal.date
    
    if meal_update.name is not None:
        meal.name = meal_update.name
    if meal_update.date is not None:
        meal.date = meal_update.date

    db.flush()
    
    # 날짜가 변경된 경우 두 날짜 모두 재계산
    if meal_update.date is not None and meal_update.date != old_date:
        _recalculate_summary(db, current_user, old_date)
        _recalculate_summary(db, current_user, meal.date)
    else:
        _recalculate_summary(db, current_user, meal.date)
    
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


@app.patch("/meals/{meal_id}/items/{item_id}", response_model=schemas.MealItemOut)
def update_meal_item(
    meal_id: int,
    item_id: int,
    item_update: schemas.MealItemUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Meal item 업데이트 (이름, 양)"""
    meal = (
        db.query(models.Meal)
        .filter(models.Meal.id == meal_id, models.Meal.user_id == current_user.id)
        .first()
    )
    if meal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")

    meal_item = (
        db.query(models.MealItem)
        .filter(models.MealItem.id == item_id, models.MealItem.meal_id == meal_id)
        .first()
    )
    if meal_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal item not found")

    if item_update.name is not None:
        meal_item.name = item_update.name
    if item_update.quantity is not None:
        meal_item.quantity = item_update.quantity

    db.flush()
    _recalculate_summary(db, current_user, meal.date)
    db.refresh(meal_item)
    return meal_item


@app.delete("/meals/{meal_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_item(
    meal_id: int,
    item_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Meal item 삭제"""
    meal = (
        db.query(models.Meal)
        .filter(models.Meal.id == meal_id, models.Meal.user_id == current_user.id)
        .first()
    )
    if meal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")

    meal_item = (
        db.query(models.MealItem)
        .filter(models.MealItem.id == item_id, models.MealItem.meal_id == meal_id)
        .first()
    )
    if meal_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal item not found")

    meal_date = meal.date
    db.delete(meal_item)
    db.flush()
    _recalculate_summary(db, current_user, meal_date)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/meals/recent", response_model=List[schemas.MealOut])
def get_recent_meals(
    days: int = 30,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """최근 N일간의 모든 meals를 반환합니다."""
    start_date = dt.date.today() - dt.timedelta(days=days - 1)
    meals: List[models.Meal] = (
        db.query(models.Meal)
        .filter(
            models.Meal.user_id == current_user.id,
            models.Meal.date >= start_date
        )
        .order_by(models.Meal.date.desc(), models.Meal.id.desc())
        .all()
    )
    return meals


@app.get("/dashboard", response_model=schemas.DashboardResponse)
def get_dashboard(
    date: Optional[dt.date] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_date = date or dt.date.today()
    meals: List[models.Meal] = (
        db.query(models.Meal)
        .filter(models.Meal.user_id == current_user.id, models.Meal.date == target_date)
        .order_by(models.Meal.id.desc())
        .all()
    )
    summary = _recalculate_summary(db, current_user, target_date)
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
            db.commit()
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
    response_entries: List[Dict[str, Any]] = []
    per_g_keys = ("kcal_per_g", "protein_per_g", "fat_per_g", "carb_per_g")

    # Search only from food_data.parquet (no database storage)
    usda_results = search_usda_foods(normalized_query, limit=limit, include_micronutrients=False)
    
    # Convert USDA results to response format
    for usda_food in usda_results:
        per_g_payload = {key: usda_food.get(key) for key in per_g_keys}
        response_entries.append({
            "id": usda_food.get("fdc_id"),
            "provider": "usda",
            "provider_food_id": str(usda_food.get("fdc_id", "")),
            "name": usda_food.get("description", ""),
            "brand_name": usda_food.get("brand_owner"),
            "serving_description": (
                f"{usda_food.get('serving_size', '')} {usda_food.get('serving_size_unit', '')}".strip()
                if usda_food.get("serving_size")
                else None
            ),
            "calories": usda_food.get("kcal"),
            "protein": usda_food.get("protein_g"),
            "carbs": usda_food.get("carb_g"),
            "fat": usda_food.get("fat_g"),
            "created_by_user_id": None,
            "last_refreshed": None,
            **per_g_payload,
        })
    
    # Also search user-created custom foods from database
    custom_items: List[models.FoodItem] = []
    if len(response_entries) < limit:
        remaining = limit - len(response_entries)
        custom_items = (
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
            .filter(models.FoodItem.provider != "usda")  # Exclude old USDA data
            .order_by(models.FoodItem.search_count.desc(), models.FoodItem.updated_at.desc())
            .limit(remaining)
            .all()
        )
        for item in custom_items:
            response_entries.append({
                "id": item.id,
                "provider": item.provider,
                "provider_food_id": item.provider_food_id,
                "name": item.name,
                "brand_name": item.brand_name,
                "serving_description": item.serving_description,
                "calories": item.calories,
                "protein": item.protein,
                "carbs": item.carbs,
                "fat": item.fat,
                "created_by_user_id": item.created_by_user_id,
                "last_refreshed": item.last_refreshed,
                "kcal_per_g": None,
                "protein_per_g": None,
                "fat_per_g": None,
                "carb_per_g": None,
            })
    
    # Update search counts for custom items only
    for item in custom_items:
        if hasattr(item, 'search_count'):
            item.search_count += 1
    
    if custom_items:
        db.commit()

    def _clean_float(value: Any) -> Any:
        if isinstance(value, float) and not math.isfinite(value):
            return None
        return value

    # Convert response entries to FoodItemOut models
    response_models: List[schemas.FoodItemOut] = []
    for entry in response_entries[:limit]:
        # Clean float values
        cleaned_entry = {k: _clean_float(v) for k, v in entry.items()}
        response_models.append(schemas.FoodItemOut.parse_obj(cleaned_entry))

    return schemas.FoodSearchResponse(query=normalized_query, results=response_models)


@app.get("/foods/{food_id}/nutrition", response_model=schemas.FoodNutritionDetail)
def get_food_nutrition(
    food_id: int,
    provider: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # If provider is "usda", treat food_id as fdc_id and get directly from USDA data
    if provider == "usda":
        fdc_id = food_id
        logger.info("Fetching USDA food directly with fdc_id=%s", fdc_id)
        usda_detail = get_usda_food_detail(fdc_id)
        if not usda_detail:
            logger.warning("USDA food not found for fdc_id=%s", fdc_id)
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food not found")
        logger.info("USDA food found: %s (fdc_id=%s)", usda_detail.get("description"), fdc_id)
        
        payload = {
            "id": fdc_id,
            "provider": "usda",
            "provider_food_id": str(fdc_id),
            "name": usda_detail.get("description", ""),
            "brand_name": usda_detail.get("brand_owner"),
            "serving_description": (
                f"{usda_detail.get('serving_size', '')} {usda_detail.get('serving_size_unit', '')}".strip()
                if usda_detail.get("serving_size")
                else None
            ),
            "serving_size": usda_detail.get("serving_size"),
            "serving_size_unit": usda_detail.get("serving_size_unit"),
            "calories": usda_detail.get("kcal"),
            "protein": usda_detail.get("protein_g"),
            "carbs": usda_detail.get("carb_g"),
            "fat": usda_detail.get("fat_g"),
            "kcal_per_g": usda_detail.get("kcal_per_g"),
            "protein_per_g": usda_detail.get("protein_per_g"),
            "carb_per_g": usda_detail.get("carb_per_g"),
            "fat_per_g": usda_detail.get("fat_per_g"),
            "micronutrients": usda_detail.get("micronutrients", {}),
            "per_100": usda_detail.get("per_100"),
            "unit_category": usda_detail.get("unit_category", "mass"),
            "per_gram": usda_detail.get("per_gram"),
        }
        
        return schemas.FoodNutritionDetail(**payload)
    
    # First, try to find in FoodItem table (for user-created custom foods)
    food: Optional[models.FoodItem] = (
        db.query(models.FoodItem)
        .filter(models.FoodItem.id == food_id)
        .first()
    )

    # If found in DB, use it (but check permissions)
    if food is not None:
        if food.created_by_user_id and food.created_by_user_id != current_user.id:
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
            "kcal_per_g": None,
            "protein_per_g": None,
            "carb_per_g": None,
            "fat_per_g": None,
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
            "per_gram": None,
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
                            "kcal_per_g": usda_detail.get("kcal_per_g", payload["kcal_per_g"]),
                            "protein_per_g": usda_detail.get("protein_per_g", payload["protein_per_g"]),
                            "carb_per_g": usda_detail.get("carb_per_g", payload["carb_per_g"]),
                            "fat_per_g": usda_detail.get("fat_per_g", payload["fat_per_g"]),
                            "micronutrients": usda_detail.get("micronutrients", {}),
                            "per_100": usda_detail.get("per_100", payload["per_100"]),
                            "unit_category": usda_detail.get("unit_category", payload["unit_category"]),
                            "per_gram": usda_detail.get("per_gram", payload["per_gram"]),
                        }
                    )

        return schemas.FoodNutritionDetail(**payload)
    
    # If not found in DB and provider is not "usda", return 404
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food not found")


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


# ============================================================================
# Workout Log API (Template 2)
# ============================================================================

@app.get("/exercises/search", response_model=List[Dict[str, Any]])
def search_exercises_api(
    query: str,
    limit: int = 20,
):
    """운동 검색"""
    try:
        results = search_exercises(query, limit)
        return results
    except Exception as e:
        logger.error(f"Error searching exercises: {e}")
        return []


@app.get("/exercises/calculate-calories")
def calculate_exercise_calories(
    exercise_name: str,
    duration_minutes: float,
    weight_kg: Optional[float] = None,
    category: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
):
    """운동 칼로리 계산"""
    # 사용자 체중이 없으면 기본값 사용
    user_weight = weight_kg or current_user.weight_kg or 70.0
    
    try:
        calories = calculate_calories_burned(
            exercise_name=exercise_name,
            duration_minutes=duration_minutes,
            weight_kg=user_weight,
            category=category,
        )
        return {"calories_burned": calories}
    except Exception as e:
        logger.error(f"Error calculating calories: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@app.get("/exercises/categories", response_model=List[str])
def get_exercise_categories():
    """운동 카테고리 목록"""
    try:
        return get_categories()
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        return []


@app.post("/workouts", response_model=schemas.WorkoutLogOut, status_code=status.HTTP_201_CREATED)
def create_workout(
    workout_in: schemas.WorkoutLogCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """운동 로그 생성"""
    workout_date = workout_in.date or dt.date.today()
    
    # 칼로리가 제공되지 않았고, 운동 이름과 시간이 있으면 자동 계산
    calories_burned = workout_in.calories_burned
    if calories_burned is None and workout_in.activity_type and workout_in.duration_minutes:
        try:
            # 운동 이름에서 카테고리와 운동명 추출 시도
            # 형식: "Category - Exercise Name" 또는 "Exercise Name"
            activity_parts = workout_in.activity_type.split(" - ", 1)
            if len(activity_parts) == 2:
                category, exercise_name = activity_parts
            else:
                category = None
                exercise_name = workout_in.activity_type
            
            calories_burned = calculate_calories_burned(
                exercise_name=exercise_name,
                duration_minutes=workout_in.duration_minutes,
                weight_kg=current_user.weight_kg or 70.0,
                category=category,
            )
        except Exception as e:
            logger.warning(f"Could not auto-calculate calories: {e}")
            calories_burned = None
    
    workout = models.WorkoutLog(
        user=current_user,
        date=workout_date,
        activity_type=workout_in.activity_type,
        duration_minutes=workout_in.duration_minutes,
        calories_burned=calories_burned,
        distance_km=workout_in.distance_km,
        notes=workout_in.notes,
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)
    return workout


@app.get("/workouts", response_model=List[schemas.WorkoutLogOut])
def get_workouts(
    date: Optional[dt.date] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """운동 로그 조회"""
    query = db.query(models.WorkoutLog).filter(models.WorkoutLog.user_id == current_user.id)
    
    if date:
        query = query.filter(models.WorkoutLog.date == date)
    
    workouts = query.order_by(models.WorkoutLog.date.desc(), models.WorkoutLog.id.desc()).all()
    return workouts


@app.delete("/workouts/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    workout_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """운동 로그 삭제"""
    workout = (
        db.query(models.WorkoutLog)
        .filter(models.WorkoutLog.id == workout_id, models.WorkoutLog.user_id == current_user.id)
        .first()
    )
    if workout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
    
    db.delete(workout)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Body Fat Analysis API (Template 3)
# ============================================================================

@app.post("/body-fat/analyze", response_model=schemas.BodyFatAnalysisOut, status_code=status.HTTP_201_CREATED)
async def analyze_body_fat(
    file: UploadFile = File(...),
    date: Optional[dt.date] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """체지방률 분석 (이미지 업로드 및 AI 분석)"""
    # TODO: 실제 AI 모델 통합
    # 현재는 더미 데이터 반환
    analysis_date = date or dt.date.today()
    
    # 이미지 저장
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "uploads", "body_fat")
    os.makedirs(upload_dir, exist_ok=True)
    
    # 파일 확장자 확인
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    if file_ext.lower() not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only JPG, JPEG, PNG files are allowed")
    
    image_filename = f"{current_user.id}_{analysis_date.isoformat()}_{uuid.uuid4().hex[:8]}{file_ext}"
    image_path = os.path.join(upload_dir, image_filename)
    
    # 파일 저장
    with open(image_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # 상대 경로로 저장 (정적 파일이 /uploads에 마운트되어 있으므로, 
    # 마운트 지점 기준 상대 경로만 저장: "body_fat/{image_filename}")
    # 프론트엔드에서 /uploads + relative_image_path로 접근하면 /uploads/body_fat/...가 됨
    relative_image_path = f"body_fat/{image_filename}"
    
    # 더미 체지방률 계산 (실제로는 AI 모델 사용)
    body_fat_percentage = 15.0  # TODO: AI 모델로 계산
    
    # 더미 percentile 계산 (실제로는 통계 데이터 기반)
    percentile_rank = 50.0  # TODO: 실제 통계 데이터 기반 계산
    
    analysis = models.BodyFatAnalysis(
        user=current_user,
        date=analysis_date,
        image_path=relative_image_path,
        body_fat_percentage=body_fat_percentage,
        percentile_rank=percentile_rank,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


@app.get("/body-fat/analyses", response_model=List[schemas.BodyFatAnalysisOut])
def get_body_fat_analyses(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """체지방률 분석 기록 조회"""
    analyses = (
        db.query(models.BodyFatAnalysis)
        .filter(models.BodyFatAnalysis.user_id == current_user.id)
        .order_by(models.BodyFatAnalysis.date.desc(), models.BodyFatAnalysis.id.desc())
        .all()
    )
    return analyses


@app.get("/body-fat/projections/{analysis_id}", response_model=List[schemas.BodyFatProjectionOut])
def get_body_fat_projections(
    analysis_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """체지방률 감소 시 예상 몸 이미지 생성"""
    analysis = (
        db.query(models.BodyFatAnalysis)
        .filter(
            models.BodyFatAnalysis.id == analysis_id,
            models.BodyFatAnalysis.user_id == current_user.id
        )
        .first()
    )
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    
    if analysis.body_fat_percentage is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Body fat percentage not calculated")
    
    current_bf = analysis.body_fat_percentage
    reductions = [5, 10, 15, 20]
    
    projections = []
    for reduction in reductions:
        projected_bf = max(0, current_bf - reduction)
        # TODO: AI 이미지 생성 (Stable Diffusion 등 사용)
        projections.append(schemas.BodyFatProjectionOut(
            reduction_percentage=reduction,
            projected_body_fat=projected_bf,
            projected_image_path=None,  # TODO: AI 생성 이미지 경로
        ))
    
    return projections
