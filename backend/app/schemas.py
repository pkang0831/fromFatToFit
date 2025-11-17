from __future__ import annotations

import datetime as dt
from typing import Dict, List, Optional, TYPE_CHECKING, Literal

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    daily_calorie_target: int = Field(default=2000, ge=1000, le=10000)
    height_cm: Optional[float] = Field(default=None, ge=50, le=300)
    weight_kg: Optional[float] = Field(default=None, ge=20, le=500)
    age: Optional[int] = Field(default=None, ge=1, le=150)
    gender: Optional[str] = Field(default=None, pattern="^(male|female)$")
    activity_level: Optional[str] = Field(default="sedentary", pattern="^(sedentary|light|moderate|heavy|athlete)$")


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    daily_calorie_target: Optional[int] = Field(default=None, ge=1000, le=10000)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    daily_calorie_target: int
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CalorieTargetUpdate(BaseModel):
    daily_calorie_target: int = Field(ge=1000, le=10000)


class UserProfileUpdate(BaseModel):
    height_cm: Optional[float] = Field(default=None, ge=50, le=300)
    weight_kg: Optional[float] = Field(default=None, ge=20, le=500)
    age: Optional[int] = Field(default=None, ge=1, le=150)
    gender: Optional[str] = Field(default=None, pattern="^(male|female)$")
    activity_level: Optional[str] = Field(default=None, pattern="^(sedentary|light|moderate|heavy|athlete)$")


class SessionOut(BaseModel):
    token: str
    user: UserOut


class FoodEntryCreate(BaseModel):
    calories: float
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None


class MealItemCreate(BaseModel):
    name: str
    quantity: Optional[str] = None
    notes: Optional[str] = None
    nutrition: FoodEntryCreate


class MealCreate(BaseModel):
    name: str
    date: Optional[dt.date] = None
    items: List[MealItemCreate]


class FoodEntryOut(BaseModel):
    calories: float
    protein: Optional[float]
    carbs: Optional[float]
    fat: Optional[float]

    model_config = ConfigDict(from_attributes=True)


class MealItemOut(BaseModel):
    id: int
    name: str
    quantity: Optional[str]
    notes: Optional[str]
    food_entries: List[FoodEntryOut]

    model_config = ConfigDict(from_attributes=True)


class MealOut(BaseModel):
    id: int
    name: str
    date: dt.date
    items: List[MealItemOut]

    model_config = ConfigDict(from_attributes=True)


class MotivationMessageChannels(BaseModel):
    in_app: Optional[str] = None
    push: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None


class DailySummaryOut(BaseModel):
    date: dt.date
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    motivation_message: Optional[str]
    message_trigger: Optional[str] = None
    message_push: Optional[str] = None
    message_email_subject: Optional[str] = None
    message_email_body: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DashboardResponse(BaseModel):
    user: UserOut
    meals: List[MealOut]
    summary: DailySummaryOut


class FoodItemBase(BaseModel):
    name: str
    brand_name: Optional[str] = None
    serving_description: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    kcal_per_g: Optional[float] = None
    protein_per_g: Optional[float] = None
    carb_per_g: Optional[float] = None
    fat_per_g: Optional[float] = None


class FoodItemCreate(FoodItemBase):
    calories: float = Field(gt=0)


class FoodItemOut(FoodItemBase):
    id: int
    provider: str
    provider_food_id: str
    created_by_user_id: Optional[int] = None
    last_refreshed: Optional[dt.datetime]

    model_config = ConfigDict(from_attributes=True)


class FoodSearchResponse(BaseModel):
    query: str
    results: List[FoodItemOut]


class MicronutrientEntry(BaseModel):
    amount: float
    unit: Optional[str]
    label: str


class FoodPerHundred(BaseModel):
    unit: str
    amount: float
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None


class FoodPerGram(BaseModel):
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None


class FoodNutritionDetail(BaseModel):
    id: Optional[int] = None
    provider: str
    provider_food_id: Optional[str] = None
    name: str
    brand_name: Optional[str] = None
    serving_description: Optional[str] = None
    serving_size: Optional[float] = None
    serving_size_unit: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    kcal_per_g: Optional[float] = None
    protein_per_g: Optional[float] = None
    carb_per_g: Optional[float] = None
    fat_per_g: Optional[float] = None
    micronutrients: Dict[str, MicronutrientEntry]
    per_100: FoodPerHundred
    unit_category: Literal["mass", "volume"]
    per_gram: Optional[FoodPerGram] = None


class MotivationMessageOut(BaseModel):
    date: dt.date
    trigger: Optional[str] = None
    channels: MotivationMessageChannels


if TYPE_CHECKING:  # pragma: no cover - import only used for typing
    from . import models


def build_message_response(summary: "models.DailySummary") -> MotivationMessageOut:
    return MotivationMessageOut(
        date=summary.date,
        trigger=summary.message_trigger,
        channels=MotivationMessageChannels(
            in_app=summary.motivation_message,
            push=summary.message_push,
            email_subject=summary.message_email_subject,
            email_body=summary.message_email_body,
        ),
    )


# Workout Log Schemas
class WorkoutLogCreate(BaseModel):
    date: Optional[dt.date] = None
    activity_type: str = Field(..., min_length=1, max_length=100)
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    calories_burned: Optional[float] = Field(default=None, ge=0)
    distance_km: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None


class WorkoutLogOut(BaseModel):
    id: int
    date: dt.date
    activity_type: str
    duration_minutes: Optional[int]
    calories_burned: Optional[float]
    distance_km: Optional[float]
    notes: Optional[str]
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


# Body Fat Analysis Schemas
class BodyFatAnalysisCreate(BaseModel):
    date: Optional[dt.date] = None
    body_fat_percentage: Optional[float] = Field(default=None, ge=0, le=100)


class BodyFatAnalysisOut(BaseModel):
    id: int
    date: dt.date
    image_path: str
    body_fat_percentage: Optional[float]
    percentile_rank: Optional[float]
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class BodyFatProjectionOut(BaseModel):
    """체지방률 감소 시 예상 몸 이미지"""
    reduction_percentage: float  # 5, 10, 15, 20
    projected_body_fat: float  # 예상 체지방률
    projected_image_path: Optional[str] = None  # AI 생성 이미지 경로
