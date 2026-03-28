"""
marketplace_core/urls.py — Central URL router.

/admin/      → Django admin panel
/api/auth/   → Auth endpoints (register, login, logout, me, token/refresh)
/api/         → Discovery endpoints (influencers, campaigns)
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # All API endpoints (auth + discovery) are in users_and_profiles.urls
    # The app prefixes auth routes with auth/ internally
    path('api/', include('users_and_profiles.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
