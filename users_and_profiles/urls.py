"""
users_and_profiles/urls.py — All API URL patterns, mounted at /api/ in root urls.py

Auth:        /api/auth/register|login|logout|me|token/refresh
Discovery:   /api/influencers/<?>    /api/campaigns/<?>
Messaging:   /api/conversations/<?>  /api/conversations/<id>/messages|read
Contracts:   /api/contracts/         /api/contracts/<id>/status/
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    # Auth
    RegisterView, LoginView, LogoutView, MeView,
    PasswordResetRequestView, PasswordResetConfirmView,
    # Discovery
    InfluencerListView, InfluencerDetailView,
    CampaignListCreateView, CampaignDetailView,
    # Messaging
    ConversationListCreateView, ConversationDetailView,
    MessageCreateView, MarkMessagesReadView,
    # Contracts
    ContractListCreateView, ContractDetailView, ContractStatusView,
    # Payments (Escrow)
    ContractPaymentCreateView, ContractPaymentVerifyView,
    # Instagram OAuth
    InstagramAuthURLView, InstagramCallbackView,
    # Superadmin
    SuperadminDashboardStatsView,
    # GST / Setu
    PublicBusinessGSTRequestOTPView, BusinessGSTRequestOTPView, BusinessGSTVerifyOTPView,
    # Admin helpers
    BusinessListView,
    # Disputes
    DisputeListCreateView, DisputeResolveView, SuperadminDisputeListView,
)

urlpatterns = [

    # ── Superadmin ───────────────────────────────────────────
    path('superadmin/dashboard-stats/', SuperadminDashboardStatsView.as_view(), name='superadmin-dashboard-stats'),

    # ── Auth ─────────────────────────────────────────────────
    path('auth/register/',      RegisterView.as_view(),      name='auth-register'),
    path('auth/login/',         LoginView.as_view(),         name='auth-login'),
    path('auth/logout/',        LogoutView.as_view(),        name='auth-logout'),
    path('auth/me/',            MeView.as_view(),            name='auth-me'),
    path('auth/business/gst-request/', PublicBusinessGSTRequestOTPView.as_view(), name='public-gst-request'),
    path('auth/token/refresh/', TokenRefreshView.as_view(),  name='token-refresh'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),

    # ── Business Entities (GST) ──────────────────────────────
    path('business/gst-request/', BusinessGSTRequestOTPView.as_view(), name='business-gst-request'),
    path('business/gst-verify/',  BusinessGSTVerifyOTPView.as_view(),  name='business-gst-verify'),

    # ── Influencers ───────────────────────────────────────────
    path('influencers/',           InfluencerListView.as_view(),   name='influencer-list'),
    path('influencers/<uuid:pk>/', InfluencerDetailView.as_view(), name='influencer-detail'),

    # ── All Businesses (superadmin) ───────────────────────────
    path('businesses/', BusinessListView.as_view(), name='business-list'),

    # ── Campaigns ────────────────────────────────────────────
    path('campaigns/',           CampaignListCreateView.as_view(), name='campaign-list-create'),
    path('campaigns/<uuid:pk>/', CampaignDetailView.as_view(),    name='campaign-detail'),

    # ── Conversations (Inbox) ─────────────────────────────────
    path('conversations/',
         ConversationListCreateView.as_view(), name='conversation-list-create'),
    path('conversations/<uuid:pk>/',
         ConversationDetailView.as_view(),     name='conversation-detail'),
    path('conversations/<uuid:pk>/messages/',
         MessageCreateView.as_view(),          name='message-create'),
    path('conversations/<uuid:pk>/read/',
         MarkMessagesReadView.as_view(),       name='messages-mark-read'),

    # ── Contracts ────────────────────────────────────────────
    # GET  /api/contracts/          — list my contracts
    # POST /api/contracts/          — business proposes a contract
    path('contracts/',
         ContractListCreateView.as_view(),  name='contract-list-create'),
    # GET  /api/contracts/<uuid>/   — contract detail
    path('contracts/<uuid:pk>/',
         ContractDetailView.as_view(),     name='contract-detail'),
    # PATCH /api/contracts/<uuid>/status/  — update status (accept/complete/cancel)
    path('contracts/<uuid:pk>/status/',
         ContractStatusView.as_view(),     name='contract-status'),

    # ── Payments (Escrow) ─────────────────────────────────────
    path('contracts/<uuid:pk>/payment/create/',
         ContractPaymentCreateView.as_view(), name='contract-payment-create'),
    path('contracts/<uuid:pk>/payment/verify/',
         ContractPaymentVerifyView.as_view(), name='contract-payment-verify'),

    # ── Instagram OAuth (Verification Engine) ─────────────────
    path('instagram/auth-url/',
         InstagramAuthURLView.as_view(),   name='instagram-auth-url'),
    path('instagram/callback/',
         InstagramCallbackView.as_view(),  name='instagram-callback'),

    # ── Disputes ─────────────────────────────────────────────
    path('disputes/',
         DisputeListCreateView.as_view(), name='dispute-list-create'),
    path('disputes/<uuid:pk>/resolve/',
         DisputeResolveView.as_view(),    name='dispute-resolve'),
    path('disputes/all/',
         SuperadminDisputeListView.as_view(), name='dispute-all'),
]
