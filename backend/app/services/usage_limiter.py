import logging
from typing import Dict, Any
from datetime import datetime
from ..database import get_supabase

logger = logging.getLogger(__name__)

# Feature usage limits for free tier
USAGE_LIMITS = {
    "food_scan": 5,
    "body_fat_scan": 1,
    "percentile_scan": 1,
    "form_check": 0,  # Premium only
    "transformation": 0  # Premium only
}


class UsageLimitExceeded(Exception):
    """Raised when user exceeds their usage limit"""
    pass


async def check_usage_limit(user_id: str, feature_type: str, is_premium: bool = False) -> Dict[str, Any]:
    """
    Check if user has remaining usage for a feature
    
    Args:
        user_id: User's ID
        feature_type: Type of feature (food_scan, body_fat_scan, etc.)
        is_premium: Whether user has premium subscription
        
    Returns:
        Dictionary with usage info
        
    Raises:
        UsageLimitExceeded: If limit is reached
    """
    try:
        # Premium users have unlimited access
        if is_premium:
            return {
                "allowed": True,
                "current_count": 0,
                "limit": -1,  # Unlimited
                "remaining": -1
            }
        
        # Get feature limit
        limit = USAGE_LIMITS.get(feature_type, 0)
        
        if limit == 0:
            raise UsageLimitExceeded(f"{feature_type} requires premium subscription")
        
        # Query current usage from database
        supabase = get_supabase()
        result = supabase.table("usage_limits").select("*").eq("user_id", user_id).eq("feature_type", feature_type).execute()
        
        if result.data:
            current_count = result.data[0]["count"]
        else:
            current_count = 0
        
        remaining = limit - current_count
        
        if remaining <= 0:
            raise UsageLimitExceeded(f"Usage limit exceeded for {feature_type}. Upgrade to premium for unlimited access.")
        
        return {
            "allowed": True,
            "current_count": current_count,
            "limit": limit,
            "remaining": remaining
        }
        
    except UsageLimitExceeded:
        raise
    except Exception as e:
        logger.error(f"Error checking usage limit: {e}")
        raise


async def increment_usage(user_id: str, feature_type: str) -> int:
    """
    Increment usage count for a feature
    
    Args:
        user_id: User's ID
        feature_type: Type of feature
        
    Returns:
        New usage count
    """
    try:
        supabase = get_supabase()
        
        # Check if record exists
        result = supabase.table("usage_limits").select("*").eq("user_id", user_id).eq("feature_type", feature_type).execute()
        
        if result.data:
            # Update existing record
            new_count = result.data[0]["count"] + 1
            supabase.table("usage_limits").update({
                "count": new_count,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("user_id", user_id).eq("feature_type", feature_type).execute()
        else:
            # Create new record
            new_count = 1
            supabase.table("usage_limits").insert({
                "user_id": user_id,
                "feature_type": feature_type,
                "count": new_count,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }).execute()
        
        return new_count
        
    except Exception as e:
        logger.error(f"Error incrementing usage: {e}")
        raise


async def get_all_usage_limits(user_id: str, is_premium: bool = False) -> Dict[str, Dict[str, Any]]:
    """
    Get all usage limits for a user
    
    Args:
        user_id: User's ID
        is_premium: Whether user has premium subscription
        
    Returns:
        Dictionary of feature usage data
    """
    try:
        if is_premium:
            return {
                feature: {
                    "current_count": 0,
                    "limit": -1,
                    "remaining": -1,
                    "is_premium": True
                }
                for feature in USAGE_LIMITS.keys()
            }
        
        supabase = get_supabase()
        result = supabase.table("usage_limits").select("*").eq("user_id", user_id).execute()
        
        usage_data = {}
        for feature_type, limit in USAGE_LIMITS.items():
            current = next((item for item in result.data if item["feature_type"] == feature_type), None)
            current_count = current["count"] if current else 0
            
            usage_data[feature_type] = {
                "current_count": current_count,
                "limit": limit,
                "remaining": max(0, limit - current_count),
                "is_premium": False
            }
        
        return usage_data
        
    except Exception as e:
        logger.error(f"Error getting usage limits: {e}")
        raise


async def get_credit_balance(user_id: str, is_premium: bool = False) -> Dict[str, Any]:
    """
    Get user's credit balance (monthly + bonus = total).
    Returns dict suitable for CreditBalanceResponse.
    """
    try:
        supabase = get_supabase()
        result = supabase.table("user_credits").select("*").eq("user_id", user_id).execute()
        row = result.data[0] if result.data else None

        if row:
            monthly = int(row.get("monthly_credits", 0))
            bonus = int(row.get("bonus_credits", 0))
            total = int(row.get("total_credits", monthly + bonus))
            reset_date = row.get("reset_date")
        else:
            monthly = 10
            bonus = 0
            total = 10
            reset_date = None

        pro_free_features = {"body_fat_scan", "percentile_scan"}
        credit_costs = {
            "food_scan": 1,
            "body_fat_scan": 0 if is_premium else 10,
            "percentile_scan": 0 if is_premium else 10,
            "transformation": 30,
            "enhancement": 50,
            "region_transform": 15,
            "beauty_scan": 10,
            "beauty_styling": 30,
            "fashion_recommend": 5,
            "fashion_images": 15,
        }

        return {
            "monthly_credits": monthly,
            "bonus_credits": bonus,
            "total_credits": total,
            "reset_date": reset_date,
            "credit_costs": credit_costs,
        }
    except Exception as e:
        logger.error(f"Error getting credit balance: {e}")
        return {
            "monthly_credits": 10,
            "bonus_credits": 0,
            "total_credits": 10,
            "reset_date": None,
            "credit_costs": {"food_scan": 1, "body_fat_scan": 10, "percentile_scan": 10, "transformation": 30, "enhancement": 50, "region_transform": 15},
        }
