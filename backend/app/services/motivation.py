from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from sqlalchemy.orm import Session

from .. import models


class MessageTrigger(str, Enum):
    """Well known motivational message triggers."""

    CALORIE_SURPLUS = "calorie_surplus"
    CALORIE_DEFICIT = "calorie_deficit"
    LOGGING_STREAK = "logging_streak"
    WEIGHT_UPDATE = "weight_update"
    ON_TARGET = "on_target"


@dataclass
class MessagePayload:
    """Concrete channel copy for a motivational message."""

    trigger: MessageTrigger
    in_app: str
    push: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None


class MotivationMessageService:
    """Selects the best motivational message for a user and day."""

    CALORIE_MARGIN = 200
    LOGGING_STREAK_MILESTONES = (3, 7, 14, 30)

    def __init__(self, db: Session):
        self.db = db

    def apply(self, user: models.User, summary: models.DailySummary) -> MessagePayload:
        """Determine and persist the motivation message for *summary*."""

        message = (
            self._weight_update_message(user, summary)
            or self._logging_streak_message(user, summary)
            or self._calorie_balance_message(user, summary)
            or self._on_target_message(user, summary)
        )

        summary.motivation_message = message.in_app
        summary.message_trigger = message.trigger.value
        summary.message_push = message.push
        summary.message_email_subject = message.email_subject
        summary.message_email_body = message.email_body
        return message

    # ------------------------------------------------------------------
    # Trigger helpers

    def _calorie_balance_message(
        self, user: models.User, summary: models.DailySummary
    ) -> Optional[MessagePayload]:
        diff = summary.total_calories - user.daily_calorie_target
        if diff >= self.CALORIE_MARGIN:
            over = int(round(diff))
            total = int(round(summary.total_calories))
            return MessagePayload(
                trigger=MessageTrigger.CALORIE_SURPLUS,
                in_app=(
                    "Calorie surplus alert: you are about "
                    f"{over} kcal over today's target ({total} kcal consumed)."
                    " A walk or lighter dinner could even things out."
                ),
                push=f"{over} kcal over your goal today — finish strong!",
                email_subject="Heads up: calories are over target today",
                email_body=(
                    "Hi there,\n\n"
                    f"Your food log for {summary.date:%B %d} came in at {total} kcal,"
                    f" which is about {over} kcal higher than the {user.daily_calorie_target} kcal goal. "
                    "Consider an active break or adjusting your evening meal to stay on track.\n\n"
                    "You've got this!"
                ),
            )
        if diff <= -self.CALORIE_MARGIN:
            under = abs(int(round(diff)))
            total = int(round(summary.total_calories))
            return MessagePayload(
                trigger=MessageTrigger.CALORIE_DEFICIT,
                in_app=(
                    "Nice calorie deficit! You're about "
                    f"{under} kcal under your goal with {total} kcal logged."
                    " Fuel up with quality foods to keep energy high."
                ),
                push=f"{under} kcal under goal — keep fueling wisely!",
                email_subject="Great work: you're under goal today",
                email_body=(
                    "Hi there,\n\n"
                    f"You logged {total} kcal for {summary.date:%B %d}, putting you roughly {under} kcal below "
                    f"your {user.daily_calorie_target} kcal target. Keep an eye on energy levels and plan a balanced meal.\n\n"
                    "Consistency wins!"
                ),
            )
        return None

    def _logging_streak_message(
        self, user: models.User, summary: models.DailySummary
    ) -> Optional[MessagePayload]:
        streak = self._calculate_logging_streak(user, summary.date)
        if streak in self.LOGGING_STREAK_MILESTONES:
            return MessagePayload(
                trigger=MessageTrigger.LOGGING_STREAK,
                in_app=(
                    f"{streak}-day logging streak! Keeping tabs daily is building lasting habits."
                ),
                push=f"{streak}-day logging streak — awesome dedication!",
                email_subject=f"You're on a {streak}-day logging streak!",
                email_body=(
                    "Hi there,\n\n"
                    f"You've logged meals {streak} days in a row through {summary.date:%B %d}."
                    " That kind of consistency builds unstoppable momentum."
                    " Keep the streak alive — future you will thank you!\n\n"
                    "Cheering for you,\nFrom Fat To Fit"
                ),
            )
        return None

    def _weight_update_message(
        self, user: models.User, summary: models.DailySummary
    ) -> Optional[MessagePayload]:
        latest = (
            self.db.query(models.WeightLog)
            .filter(
                models.WeightLog.user_id == user.id,
                models.WeightLog.date == summary.date,
            )
            .order_by(models.WeightLog.created_at.desc())
            .first()
        )
        if latest is None:
            return None

        previous = (
            self.db.query(models.WeightLog)
            .filter(
                models.WeightLog.user_id == user.id,
                models.WeightLog.date < latest.date,
            )
            .order_by(models.WeightLog.date.desc(), models.WeightLog.created_at.desc())
            .first()
        )

        if previous is None:
            body = (
                "Hi there,\n\n"
                f"Thanks for logging your weight today ({latest.weight_kg:.1f} kg). "
                "This gives us an even clearer picture of your progress. Keep tracking — it works!\n\n"
                "You've got a strong start!"
            )
            return MessagePayload(
                trigger=MessageTrigger.WEIGHT_UPDATE,
                in_app=(
                    f"Weight log received: {latest.weight_kg:.1f} kg. Thanks for keeping tabs on progress!"
                ),
                push="Weight update logged — great job staying mindful!",
                email_subject="Thanks for updating your weight",
                email_body=body,
            )

        diff = latest.weight_kg - previous.weight_kg
        direction = "down" if diff < 0 else "up"
        diff_abs = abs(diff)
        if diff_abs < 0.1:
            delta_phrase = "holding steady"
        else:
            delta_phrase = f"{diff_abs:.1f} kg {direction}"

        return MessagePayload(
            trigger=MessageTrigger.WEIGHT_UPDATE,
            in_app=(
                f"Weight update noted: {latest.weight_kg:.1f} kg ({delta_phrase} since last check-in)."
            ),
            push=f"Weight log in: {delta_phrase}!",
            email_subject="Today's weight check-in",
            email_body=(
                "Hi there,\n\n"
                f"You logged {latest.weight_kg:.1f} kg today, {delta_phrase} compared to "
                f"{previous.weight_kg:.1f} kg."
                " Pair this insight with your food log to keep calibrating the plan.\n\n"
                "We're cheering you on!"
            ),
        )

    def _on_target_message(
        self, user: models.User, summary: models.DailySummary
    ) -> MessagePayload:
        total = int(round(summary.total_calories))
        return MessagePayload(
            trigger=MessageTrigger.ON_TARGET,
            in_app=(
                "Right on target today. Consistent logging and mindful meals are paying off."
            ),
            push="Solid work staying on target today!",
            email_subject="You're right on target",
            email_body=(
                "Hi there,\n\n"
                f"Your total for {summary.date:%B %d} was {total} kcal against a target of "
                f"{user.daily_calorie_target} kcal. That's the kind of consistency that builds long-term results."
                " Keep it going!\n\n"
                "High fives from the From Fat To Fit team"
            ),
        )

    # ------------------------------------------------------------------
    # Utility helpers

    def _calculate_logging_streak(self, user: models.User, date: dt.date) -> int:
        streak = 0
        current = date
        while True:
            summary = (
                self.db.query(models.DailySummary)
                .filter(
                    models.DailySummary.user_id == user.id,
                    models.DailySummary.date == current,
                )
                .first()
            )
            if summary is None or summary.total_calories <= 0:
                break
            streak += 1
            current -= dt.timedelta(days=1)
        return streak
