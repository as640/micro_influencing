"""
marketplace_core/urls.py — Central URL router.

/admin/      → Django admin panel
/api/auth/   → Auth endpoints (register, login, logout, me, token/refresh)
/api/         → Discovery endpoints (influencers, campaigns)
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # All API endpoints (auth + discovery) are in users_and_profiles.urls
    # The app prefixes auth routes with auth/ internally
    path('api/', include('users_and_profiles.urls')),
]
