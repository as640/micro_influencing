"""
Django settings for marketplace_core project.

Credentials and secrets are loaded from the .env file via python-decouple.
Copy .env.example → .env and fill in your values before running the server.
"""

from pathlib import Path
from decouple import config

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Core Security
# ---------------------------------------------------------------------------
DEBUG = config('DEBUG', default=False, cast=bool)

if DEBUG:
    SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')
    ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='127.0.0.1,localhost').split(',')
else:
    # Fail fast in production if these are missing
    SECRET_KEY = config('SECRET_KEY')
    # Use a permissive default for ALLOWED_HOSTS if not explicitly set so Railway generated domains work
    ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='*').split(',')
    
    # HTTPS and strict security settings
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
    SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=True, cast=bool)
    CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=True, cast=bool)
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True, cast=bool)
    SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=True, cast=bool)

# ---------------------------------------------------------------------------
# Email Configuration
# ---------------------------------------------------------------------------
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@microfluence.local')

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    # Django built-ins
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',

    # Our apps
    'users_and_profiles',
    'community_intelligence',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',      # ← MUST be first
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # ← Whitenoise for static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'marketplace_core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'marketplace_core.wsgi.application'

# ---------------------------------------------------------------------------
# Database — PostgreSQL (values read from .env or DATABASE_URL on Railway)
# ---------------------------------------------------------------------------
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default=f"postgres://{config('DB_USER', default='')}:{config('DB_PASSWORD', default='')}@{config('DB_HOST', default='localhost')}:{config('DB_PORT', default='5432')}/{config('DB_NAME', default='')}",
        conn_max_age=600
    )
}

# ---------------------------------------------------------------------------
# Custom Authentication
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = 'users_and_profiles.CustomUser'

# ---------------------------------------------------------------------------
# Password Validation
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static Files
# ---------------------------------------------------------------------------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ---------------------------------------------------------------------------
# Primary Key
# ---------------------------------------------------------------------------
# Individual models override this with UUIDField; this is the fallback.
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# ---------------------------------------------------------------------------
# JWT Configuration (djangorestframework-simplejwt)
# ---------------------------------------------------------------------------
from datetime import timedelta

SIMPLE_JWT = {
    # Access token expires quickly for security; refresh token lasts longer
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),

    # Rotate refresh tokens on every use — old one is blacklisted
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,

    # Token format
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',

    # Embed user identity in the token payload
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ---------------------------------------------------------------------------
# Instagram OAuth (Phase 5 — Verification Engine)
# ---------------------------------------------------------------------------
# Get these from https://developers.facebook.com/ → Your App → Instagram → Basic Display
INSTAGRAM_APP_ID        = config('INSTAGRAM_APP_ID',       default='')
INSTAGRAM_APP_SECRET    = config('INSTAGRAM_APP_SECRET',   default='')
# Must exactly match a URI you registered in Meta for Developers
INSTAGRAM_REDIRECT_URI  = config('INSTAGRAM_REDIRECT_URI', default='http://localhost:5173/instagram/callback')

# ---------------------------------------------------------------------------
# Razorpay Payments (Phase 6 — Escrow)
# ---------------------------------------------------------------------------
RAZORPAY_KEY_ID         = config('RAZORPAY_KEY_ID',     default='')
RAZORPAY_KEY_SECRET     = config('RAZORPAY_KEY_SECRET', default='')

# ---------------------------------------------------------------------------
# Community Intelligence Engine
# ---------------------------------------------------------------------------
# LLM (Anthropic Claude) — required for summaries / sentiment / advocacy.
# Pipeline degrades to heuristic fallbacks when missing.
ANTHROPIC_API_KEY                     = config('ANTHROPIC_API_KEY', default='')
COMMUNITY_INTELLIGENCE_LLM_MODEL      = config('COMMUNITY_INTELLIGENCE_LLM_MODEL',
                                               default='claude-haiku-4-5')

# Optional paid scraper keys — each scraper picks its own free fallback.
NEWSAPI_KEY            = config('NEWSAPI_KEY',            default='')
YOUTUBE_API_KEY        = config('YOUTUBE_API_KEY',        default='')
SCRAPEBADGER_API_KEY   = config('SCRAPEBADGER_API_KEY',   default='')
APIFY_TOKEN            = config('APIFY_TOKEN',            default='')

# Free-source overrides
NITTER_HOST            = config('NITTER_HOST',            default='https://nitter.net')
COMMUNITY_INTELLIGENCE_YT_REGION = config('COMMUNITY_INTELLIGENCE_YT_REGION', default='IN')

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
if DEBUG:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    _extra_dev_origins = config('CORS_ALLOWED_ORIGINS', default='')
    if _extra_dev_origins:
        for origin in _extra_dev_origins.split(','):
            origin = origin.strip()
            if origin and origin not in CORS_ALLOWED_ORIGINS:
                CORS_ALLOWED_ORIGINS.append(origin)
else:
    CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=True, cast=bool)
    _cors_origins = config('CORS_ALLOWED_ORIGINS', default='')
    if _cors_origins:
        CORS_ALLOWED_ORIGINS = _cors_origins.split(',')

CORS_ALLOW_CREDENTIALS = True
