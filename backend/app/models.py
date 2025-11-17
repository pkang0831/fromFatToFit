from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    daily_calorie_target = Column(Integer, nullable=False, default=2000)
    height_cm = Column(Float, nullable=True)  # 키 (cm)
    weight_kg = Column(Float, nullable=True)  # 몸무게 (kg)
    age = Column(Integer, nullable=True)  # 나이
    gender = Column(String(10), nullable=True)  # 성별: 'male' or 'female'
    activity_level = Column(String(20), nullable=True, default="sedentary")  # 활동 수준: 'sedentary', 'light', 'moderate', 'heavy', 'athlete'
    created_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)

    sessions = relationship("SessionToken", back_populates="user", cascade="all, delete-orphan")
    meals = relationship("Meal", back_populates="user", cascade="all, delete-orphan")
    summaries = relationship("DailySummary", back_populates="user", cascade="all, delete-orphan")
    weight_logs = relationship("WeightLog", back_populates="user", cascade="all, delete-orphan")
    workouts = relationship("WorkoutLog", back_populates="user", cascade="all, delete-orphan")
    body_fat_analyses = relationship("BodyFatAnalysis", back_populates="user", cascade="all, delete-orphan")


class SessionToken(Base):
    __tablename__ = "session_tokens"

    id = Column(Integer, primary_key=True)
    token = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")


class Meal(Base):
    __tablename__ = "meals"
    __table_args__ = (UniqueConstraint("user_id", "date", "name", name="uq_meal_user_date_name"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    date = Column(Date, nullable=False, default=dt.date.today)

    user = relationship("User", back_populates="meals")
    items = relationship("MealItem", back_populates="meal", cascade="all, delete-orphan")


class MealItem(Base):
    __tablename__ = "meal_items"

    id = Column(Integer, primary_key=True)
    meal_id = Column(Integer, ForeignKey("meals.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    quantity = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    meal = relationship("Meal", back_populates="items")
    food_entries = relationship("FoodEntry", back_populates="meal_item", cascade="all, delete-orphan")


class FoodEntry(Base):
    __tablename__ = "food_entries"

    id = Column(Integer, primary_key=True)
    meal_item_id = Column(Integer, ForeignKey("meal_items.id", ondelete="CASCADE"), nullable=False)
    calories = Column(Float, nullable=False)
    protein = Column(Float, nullable=True)
    carbs = Column(Float, nullable=True)
    fat = Column(Float, nullable=True)

    meal_item = relationship("MealItem", back_populates="food_entries")


class FoodItem(Base):
    __tablename__ = "food_items"
    __table_args__ = (
        UniqueConstraint("provider", "provider_food_id", name="uq_food_provider_id"),
    )

    id = Column(Integer, primary_key=True)
    provider = Column(String(50), nullable=False, default="local")
    provider_food_id = Column(String(100), nullable=False, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    brand_name = Column(String(255), nullable=True)
    serving_description = Column(String(255), nullable=True)
    calories = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)
    carbs = Column(Float, nullable=True)
    fat = Column(Float, nullable=True)
    search_count = Column(Integer, nullable=False, default=0)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_user = relationship("User")
    last_refreshed = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=dt.datetime.utcnow,
        onupdate=dt.datetime.utcnow,
        nullable=False,
    )


class DailySummary(Base):
    __tablename__ = "daily_summaries"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_summary_user_date"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, default=dt.date.today, nullable=False)
    total_calories = Column(Float, nullable=False, default=0.0)
    total_protein = Column(Float, nullable=False, default=0.0)
    total_carbs = Column(Float, nullable=False, default=0.0)
    total_fat = Column(Float, nullable=False, default=0.0)
    motivation_message = Column(Text, nullable=True)
    message_trigger = Column(String(50), nullable=True)
    message_push = Column(Text, nullable=True)
    message_email_subject = Column(String(255), nullable=True)
    message_email_body = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    user = relationship("User", back_populates="summaries")


class WeightLog(Base):
    __tablename__ = "weight_logs"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_weight_user_date"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, default=dt.date.today, nullable=False)
    weight_kg = Column(Float, nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="weight_logs")


class WorkoutLog(Base):
    __tablename__ = "workout_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, default=dt.date.today, nullable=False)
    activity_type = Column(String(100), nullable=False)  # 예: "Running", "Weight Training", "Yoga"
    duration_minutes = Column(Integer, nullable=True)  # 운동 시간 (분)
    calories_burned = Column(Float, nullable=True)  # 소모 칼로리
    distance_km = Column(Float, nullable=True)  # 거리 (km, 러닝/사이클링 등)
    notes = Column(Text, nullable=True)  # 메모
    created_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="workouts")


class BodyFatAnalysis(Base):
    __tablename__ = "body_fat_analyses"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, default=dt.date.today, nullable=False)
    image_path = Column(String(500), nullable=False)  # 업로드된 이미지 경로
    body_fat_percentage = Column(Float, nullable=True)  # AI로 계산된 체지방률
    percentile_rank = Column(Float, nullable=True)  # 상위 몇%인지
    created_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="body_fat_analyses")
