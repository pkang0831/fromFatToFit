from __future__ import annotations

import datetime as dt
from typing import List, Optional

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


class DailySummaryOut(BaseModel):
    date: dt.date
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    motivation_message: Optional[str]

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
