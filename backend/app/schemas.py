from __future__ import annotations

import datetime as dt
from typing import Dict, List, Optional, TYPE_CHECKING, Literal

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    daily_calorie_target: int = Field(default=2000, ge=1000, le=10000)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    daily_calorie_target: Optional[int] = Field(default=None, ge=1000, le=10000)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    daily_calorie_target: int

    class Config:
        orm_mode = True


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

    class Config:
        orm_mode = True


class MealItemOut(BaseModel):
    id: int
    name: str
    quantity: Optional[str]
    notes: Optional[str]
    food_entries: List[FoodEntryOut]

    class Config:
        orm_mode = True


class MealOut(BaseModel):
    id: int
    name: str
    date: dt.date
    items: List[MealItemOut]

    class Config:
        orm_mode = True


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

    class Config:
        orm_mode = True


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


class FoodItemCreate(FoodItemBase):
    calories: float = Field(gt=0)


class FoodItemOut(FoodItemBase):
    id: int
    provider: str
    provider_food_id: str
    created_by_user_id: Optional[int] = None
    last_refreshed: Optional[dt.datetime]

    class Config:
        orm_mode = True


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
    micronutrients: Dict[str, MicronutrientEntry]
    per_100: FoodPerHundred
    unit_category: Literal["mass", "volume"]


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
