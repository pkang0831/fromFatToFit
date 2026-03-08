from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
import logging

from .config import settings
from .rate_limit import limiter
from .routers import auth, food, workout, body, payments, dashboard, food_database, food_decision, weight, notifications, chat, beauty, fashion, guest

logging.basicConfig(
    level=logging.INFO if not settings.is_production else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Health & Wellness API")
    logger.info(f"Environment: {settings.environment}")
    yield
    logger.info("Shutting down Health & Wellness API")


app = FastAPI(
    title="Health & Wellness API",
    description="Backend API for health tracking, AI analysis, and wellness features",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "img-src 'self' data: blob: https:; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.openai.com https://api.replicate.com; "
                "frame-src https://js.stripe.com;"
            )
        return response


app.add_middleware(SecurityHeadersMiddleware)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests that exceed the upload size limit."""
    async def dispatch(self, request: StarletteRequest, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > settings.max_upload_bytes:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={"detail": f"Request body too large. Maximum size is {settings.max_upload_size_mb}MB."}
            )
        return await call_next(request)


app.add_middleware(RequestSizeLimitMiddleware)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc), "type": "validation_error"}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": "server_error"}
    )


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.environment,
        "version": "1.0.0"
    }


app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(food.router, prefix="/api/food", tags=["Food & Nutrition"])
app.include_router(food_database.router, prefix="/api/food-database", tags=["Food Database"])
app.include_router(food_decision.router)
app.include_router(workout.router, prefix="/api/workout", tags=["Workouts"])
app.include_router(body.router, prefix="/api/body", tags=["Body Analysis"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(weight.router, prefix="/api", tags=["Weight Tracking"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI Coach Chat"])
app.include_router(beauty.router, prefix="/api/beauty", tags=["Beauty Analysis"])
app.include_router(fashion.router, prefix="/api/fashion", tags=["Fashion Styling"])
app.include_router(guest.router, prefix="/api/guest", tags=["Guest (No Auth)"])


@app.get("/")
async def root():
    return {
        "message": "Health & Wellness API",
        "docs": "/docs" if not settings.is_production else None,
        "health": "/health"
    }
