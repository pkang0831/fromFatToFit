import logging
import stripe
from typing import Dict, Any
from datetime import datetime, timedelta, timezone
from ..config import settings
from ..database import get_supabase

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.stripe_secret_key


CREDIT_PACK_PRICES = {
    50: 499,   # $4.99
    100: 899,  # $8.99
    200: 1599, # $15.99
}


async def create_checkout_session(user_id: str, price_id: str, success_url: str, cancel_url: str) -> Dict[str, Any]:
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=user_id,
            metadata={'user_id': user_id, 'purchase_type': 'subscription'}
        )
        
        return {
            "session_id": session.id,
            "checkout_url": session.url
        }
        
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise


async def create_credit_pack_checkout(user_id: str, pack_size: int, success_url: str, cancel_url: str) -> Dict[str, Any]:
    price_cents = CREDIT_PACK_PRICES.get(pack_size)
    if not price_cents:
        raise ValueError(f"Invalid pack size: {pack_size}. Available: {list(CREDIT_PACK_PRICES.keys())}")

    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': f'{pack_size} Credit Pack',
                    'description': f'{pack_size} credits for Devenira AI features (never expire)',
                },
                'unit_amount': price_cents,
            },
            'quantity': 1,
        }],
        mode='payment',
        success_url=success_url,
        cancel_url=cancel_url,
        client_reference_id=user_id,
        metadata={
            'user_id': user_id,
            'purchase_type': 'credit_pack',
            'credit_amount': str(pack_size),
        }
    )

    return {
        "session_id": session.id,
        "checkout_url": session.url
    }


async def handle_stripe_webhook(payload: bytes, signature: str) -> Dict[str, Any]:
    """
    Handle Stripe webhook events
    
    Args:
        payload: Raw webhook payload
        signature: Stripe signature header
        
    Returns:
        Dictionary with processing result
    """
    try:
        event = stripe.Webhook.construct_event(
            payload, signature, settings.stripe_webhook_secret
        )
        
        event_type = event['type']
        event_data = event['data']['object']
        
        if event_type == 'checkout.session.completed':
            await handle_checkout_completed(event_data)
        elif event_type == 'customer.subscription.created':
            await handle_subscription_created(event_data)
        elif event_type == 'customer.subscription.updated':
            await handle_subscription_updated(event_data)
        elif event_type == 'customer.subscription.deleted':
            await handle_subscription_deleted(event_data)
        
        return {"status": "processed", "event_type": event_type}
        
    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        raise


async def handle_checkout_completed(session_data: Dict[str, Any]):
    """Handle successful checkout completion"""
    from .usage_limiter import add_credits

    user_id = session_data.get('client_reference_id')
    metadata = session_data.get('metadata', {})
    purchase_type = metadata.get('purchase_type', 'subscription')

    if not user_id:
        logger.error(f"Checkout completed but no user_id found in session: {session_data.get('id', 'unknown')}")
        return

    supabase = get_supabase()

    if purchase_type == 'credit_pack':
        credit_amount = int(metadata.get('credit_amount', 0))
        if credit_amount > 0:
            await add_credits(user_id, credit_amount, credit_type="bonus")
            logger.info(f"Added {credit_amount} bonus credits for user {user_id}")
    else:
        supabase.table("user_profiles").update({
            "premium_status": True,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("user_id", user_id).execute()

        from .usage_limiter import add_credits, PRO_MONTHLY_CREDITS, FREE_MONTHLY_CREDITS
        upgrade_credits = PRO_MONTHLY_CREDITS - FREE_MONTHLY_CREDITS
        await add_credits(user_id, upgrade_credits, credit_type="monthly")
        logger.info(f"Checkout completed for user {user_id}, added {upgrade_credits} monthly credits")


async def handle_subscription_created(subscription_data: Dict[str, Any]):
    """Handle new subscription creation"""
    customer_id = subscription_data.get('customer')
    subscription_id = subscription_data['id']
    status = subscription_data['status']
    current_period_end = subscription_data['current_period_end']
    
    # Get user_id from customer
    supabase = get_supabase()
    result = supabase.table("user_profiles").select("user_id").eq("stripe_customer_id", customer_id).execute()
    
    if result.data:
        user_id = result.data[0]["user_id"]
        
        # Create subscription record
        supabase.table("user_subscriptions").insert({
            "user_id": user_id,
            "subscription_id": subscription_id,
            "subscription_type": "premium",
            "status": status,
            "payment_provider": "stripe",
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": datetime.fromtimestamp(current_period_end, tz=timezone.utc).isoformat(),
            "auto_renew": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        
        logger.info(f"Subscription created for user {user_id}")


async def handle_subscription_updated(subscription_data: Dict[str, Any]):
    """Handle subscription updates"""
    subscription_id = subscription_data['id']
    status = subscription_data['status']
    current_period_end = subscription_data['current_period_end']
    
    supabase = get_supabase()
    supabase.table("user_subscriptions").update({
        "status": status,
        "end_date": datetime.fromtimestamp(current_period_end, tz=timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("subscription_id", subscription_id).execute()
    
    logger.info(f"Subscription {subscription_id} updated to status {status}")


async def handle_subscription_deleted(subscription_data: Dict[str, Any]):
    """Handle subscription cancellation"""
    subscription_id = subscription_data['id']
    
    supabase = get_supabase()
    
    # Update subscription status
    supabase.table("user_subscriptions").update({
        "status": "canceled",
        "auto_renew": False,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("subscription_id", subscription_id).execute()
    
    # Get user_id and update premium status
    result = supabase.table("user_subscriptions").select("user_id").eq("subscription_id", subscription_id).execute()
    if result.data:
        user_id = result.data[0]["user_id"]
        supabase.table("user_profiles").update({
            "premium_status": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("user_id", user_id).execute()
    
    logger.info(f"Subscription {subscription_id} canceled")


async def verify_revenuecat_purchase(receipt_token: str, platform: str) -> bool:
    """
    Verify purchase with RevenueCat
    
    Args:
        receipt_token: Receipt/purchase token
        platform: ios or android
        
    Returns:
        True if purchase is valid
    """
    try:
        import httpx
        
        headers = {
            "Authorization": f"Bearer {settings.revenuecat_api_key}",
            "Content-Type": "application/json"
        }
        
        # RevenueCat API endpoint
        url = "https://api.revenuecat.com/v1/receipts"
        
        data = {
            "app_user_id": receipt_token,
            "fetch_token": receipt_token,
            "platform": platform
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=data)
            
            if response.status_code == 200:
                result = response.json()
                # Check if user has active subscription
                subscriber = result.get("subscriber", {})
                entitlements = subscriber.get("entitlements", {})
                
                return "premium_access" in entitlements and entitlements["premium_access"]["expires_date"] is not None
            
            return False
        
    except Exception as e:
        logger.error(f"Error verifying RevenueCat purchase: {e}")
        return False


async def _ensure_credit_record(user_id: str) -> None:
    """Create a credit record for the user if one doesn't exist."""
    supabase = get_supabase()
    existing = supabase.table("user_credits").select("user_id").eq("user_id", user_id).execute()
    if not existing.data:
        next_month = (datetime.now(timezone.utc).replace(day=1) + timedelta(days=32)).replace(day=1)
        supabase.table("user_credits").insert({
            "user_id": user_id,
            "monthly_credits": 10,
            "bonus_credits": 0,
            "reset_date": next_month.isoformat(),
        }).execute()
        logger.info(f"Created credit record for user {user_id} with 10 monthly credits")


async def deduct_credits(user_id: str, amount: int, feature: str = "unknown") -> Dict[str, Any]:
    """Atomically deduct credits from a user's balance via Supabase RPC."""
    try:
        supabase = get_supabase()

        await _ensure_credit_record(user_id)

        result = supabase.rpc("deduct_user_credits", {
            "p_user_id": user_id,
            "p_amount": amount,
        }).execute()

        data = result.data if result.data else {}
        if isinstance(data, list) and len(data) > 0:
            data = data[0]
        if isinstance(data, str):
            import json
            data = json.loads(data)

        if not data.get("success"):
            error_msg = data.get("error", "Credit deduction failed")
            logger.warning(f"Credit deduction failed for {user_id}: {error_msg} (feature={feature})")
            from fastapi import HTTPException
            raise HTTPException(status_code=402, detail=error_msg)

        logger.info(f"Deducted {amount} credits from {user_id} for {feature}. Remaining: {data.get('total')}")
        return data

    except Exception as e:
        if "HTTPException" in type(e).__name__:
            raise
        logger.error(f"Error deducting credits: {e}")
        raise


async def check_premium_status(user_id: str) -> bool:
    """
    Check if user has active premium subscription
    
    Args:
        user_id: User's ID
        
    Returns:
        True if user has premium
    """
    try:
        supabase = get_supabase()
        
        # Check user_profiles for premium status
        result = supabase.table("user_profiles").select("premium_status").eq("user_id", user_id).execute()
        
        if result.data and result.data[0].get("premium_status"):
            return True
        
        # Check active subscriptions
        result = supabase.table("user_subscriptions").select("*").eq("user_id", user_id).eq("status", "active").execute()
        
        if result.data:
            # Check if subscription is still valid
            for sub in result.data:
                end_date = datetime.fromisoformat(sub["end_date"].replace("Z", "+00:00"))
                if end_date > datetime.now(timezone.utc):
                    return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error checking premium status: {e}")
        return False
