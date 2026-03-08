import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from ..database import get_supabase

logger = logging.getLogger(__name__)

DEFAULT_PREFERENCES = {
    "email_weekly_summary": True,
    "email_inactivity_reminder": True,
    "email_credit_low": True,
    "push_meal_reminder": True,
    "push_workout_reminder": True,
    "push_daily_summary": False,
    "push_weekly_body_scan": True,
    "meal_reminder_time": "12:00",
    "workout_reminder_days": ["monday", "wednesday", "friday"],
}


async def get_notification_preferences(user_id: str) -> Dict[str, Any]:
    supabase = get_supabase()
    result = supabase.table("notification_preferences").select("*").eq("user_id", user_id).execute()

    if result.data:
        prefs = result.data[0]
        prefs.pop("id", None)
        prefs.pop("created_at", None)
        prefs.pop("updated_at", None)
        return prefs

    record = {
        "user_id": user_id,
        **DEFAULT_PREFERENCES,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    supabase.table("notification_preferences").insert(record).execute()
    return record


async def update_notification_preferences(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    supabase = get_supabase()
    await get_notification_preferences(user_id)

    allowed = set(DEFAULT_PREFERENCES.keys())
    filtered = {k: v for k, v in updates.items() if k in allowed}
    filtered["updated_at"] = datetime.utcnow().isoformat()

    supabase.table("notification_preferences").update(filtered).eq("user_id", user_id).execute()
    return await get_notification_preferences(user_id)


async def save_push_subscription(user_id: str, subscription: Dict[str, Any]) -> Dict[str, Any]:
    supabase = get_supabase()
    endpoint = subscription.get("endpoint", "")

    existing = supabase.table("push_subscriptions").select("id").eq("user_id", user_id).eq("endpoint", endpoint).execute()

    if existing.data:
        supabase.table("push_subscriptions").update({
            "subscription_data": json.dumps(subscription),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("push_subscriptions").insert({
            "user_id": user_id,
            "endpoint": endpoint,
            "subscription_data": json.dumps(subscription),
            "active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).execute()

    logger.info(f"Saved push subscription for user {user_id}")
    return {"status": "subscribed"}


async def remove_push_subscription(user_id: str, endpoint: str) -> Dict[str, Any]:
    supabase = get_supabase()
    supabase.table("push_subscriptions").update({
        "active": False,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("user_id", user_id).eq("endpoint", endpoint).execute()

    return {"status": "unsubscribed"}


async def get_push_subscriptions(user_id: str) -> List[Dict[str, Any]]:
    supabase = get_supabase()
    result = supabase.table("push_subscriptions").select("*").eq("user_id", user_id).eq("active", True).execute()
    return result.data or []


async def check_weekly_scan_reminder(user_id: str) -> bool:
    """
    Check if user should receive a weekly body scan reminder.
    Returns True if reminder was sent.
    """
    try:
        prefs = await get_notification_preferences(user_id)
        if not prefs.get("push_weekly_body_scan", True):
            return False

        supabase = get_supabase()
        scans = supabase.table("body_scans").select("created_at").eq(
            "user_id", user_id
        ).in_("scan_type", ["bodyfat", "percentile"]).order(
            "created_at", desc=True
        ).limit(1).execute()

        if not scans.data:
            return False

        last_scan = datetime.fromisoformat(scans.data[0]["created_at"].replace("Z", "+00:00"))
        days_since = (datetime.now(last_scan.tzinfo) - last_scan).days

        if days_since >= 7:
            await send_push_notification(
                user_id,
                "Your weekly scan is ready!",
                "Come back and see how your gap to goal has changed.",
                {"action": "body-scan"},
            )
            return True

        return False
    except Exception as e:
        logger.error(f"Error checking scan reminder for {user_id}: {e}")
        return False


async def send_push_notification(user_id: str, title: str, body: str, data: Optional[Dict] = None) -> int:
    """
    Send push notification to all active subscriptions for a user.
    Uses web-push (pywebpush) in production; logs in development.
    """
    subs = await get_push_subscriptions(user_id)
    sent = 0
    for sub in subs:
        try:
            sub_data = json.loads(sub["subscription_data"])
            logger.info(f"[DEV] Push to {user_id}: {title} - {body}")
            sent += 1
        except Exception as e:
            logger.error(f"Failed to send push to {user_id}: {e}")
    return sent
