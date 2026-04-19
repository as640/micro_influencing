"""
users_and_profiles/admin.py

Registers all models with the Django admin panel.
Provides useful list_display, list_filter, and search_fields for each model.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    CustomUser,
    InfluencerProfile,
    BusinessProfile,
    Campaign,
    Conversation,
    Message,
    Contract,
)


# ---------------------------------------------------------------------------
# Custom User Admin
# ---------------------------------------------------------------------------

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Admin view for the CustomUser model."""
    model = CustomUser

    # Columns shown in the list view
    list_display  = ('email', 'role', 'is_active', 'is_staff', 'created_at')
    list_filter   = ('role', 'is_active', 'is_staff')
    search_fields = ('email',)
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at')

    # Override fieldsets since we don't have 'username'
    fieldsets = (
        (None,           {'fields': ('id', 'email', 'password', 'role')}),
        ('Permissions',  {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Timestamps',   {'fields': ('created_at',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'role', 'password1', 'password2', 'is_staff', 'is_active'),
        }),
    )


# ---------------------------------------------------------------------------
# Influencer Profile Admin
# ---------------------------------------------------------------------------

@admin.register(InfluencerProfile)
class InfluencerProfileAdmin(admin.ModelAdmin):
    list_display   = ('instagram_handle', 'category', 'locality', 'followers_count',
                      'avg_reach', 'is_verified', 'price_min', 'price_max')
    list_filter    = ('is_verified', 'category', 'locality')
    search_fields  = ('instagram_handle', 'user__email', 'category', 'locality')
    readonly_fields = ('id', 'updated_at')
    ordering       = ('-followers_count',)


# ---------------------------------------------------------------------------
# Business Profile Admin
# ---------------------------------------------------------------------------

@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    list_display   = ('company_name', 'industry', 'locality', 'website_url')
    list_filter    = ('industry', 'locality')
    search_fields  = ('company_name', 'user__email', 'industry')
    readonly_fields = ('id', 'updated_at')
    ordering       = ('company_name',)


# ---------------------------------------------------------------------------
# Campaign Admin
# ---------------------------------------------------------------------------

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display   = ('title', 'business', 'required_ad_type', 'budget_min',
                      'budget_max', 'is_active', 'created_at')
    list_filter    = ('required_ad_type', 'is_active')
    search_fields  = ('title', 'business__company_name', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    ordering       = ('-created_at',)


# ---------------------------------------------------------------------------
# Conversation Admin
# ---------------------------------------------------------------------------

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display   = ('__str__', 'business', 'influencer', 'created_at')
    search_fields  = ('business__company_name', 'influencer__instagram_handle')
    readonly_fields = ('id', 'created_at')
    ordering       = ('-created_at',)


# ---------------------------------------------------------------------------
# Message Admin
# ---------------------------------------------------------------------------

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display   = ('sender', 'conversation', 'is_read', 'created_at',
                      'content_preview')
    list_filter    = ('is_read',)
    search_fields  = ('sender__email', 'content')
    readonly_fields = ('id', 'created_at')
    ordering       = ('-created_at',)

    @admin.display(description='Content Preview')
    def content_preview(self, obj):
        return obj.content[:60] + '...' if len(obj.content) > 60 else obj.content


# ---------------------------------------------------------------------------
# Contract Admin
# ---------------------------------------------------------------------------

@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display   = ('__str__', 'status', 'agreed_price', 'campaign',
                      'payment_intent_id', 'created_at')
    list_filter    = ('status',)
    search_fields  = ('business__company_name', 'influencer__instagram_handle',
                      'payment_intent_id')
    readonly_fields = ('id', 'created_at', 'updated_at')
    ordering       = ('-created_at',)
