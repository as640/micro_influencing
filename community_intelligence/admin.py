from django.contrib import admin
from .models import (
    Topic, TopicSource, SentimentSnapshot, AdvocacyAction,
    CommunityCampaign, CampaignEndorsement,
)


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('title', 'risk_level', 'public_impact_score',
                    'growth_velocity', 'is_active', 'last_refreshed')
    list_filter = ('risk_level', 'is_active', 'needs_verification')
    search_fields = ('title', 'summary')


@admin.register(TopicSource)
class TopicSourceAdmin(admin.ModelAdmin):
    list_display = ('platform', 'title', 'engagement', 'topic')
    list_filter = ('platform',)


@admin.register(SentimentSnapshot)
class SentimentSnapshotAdmin(admin.ModelAdmin):
    list_display = ('topic', 'positive', 'negative', 'neutral', 'captured_at')


@admin.register(AdvocacyAction)
class AdvocacyActionAdmin(admin.ModelAdmin):
    list_display = ('headline', 'kind', 'topic', 'created_at')
    list_filter = ('kind',)


class CampaignEndorsementInline(admin.TabularInline):
    model = CampaignEndorsement
    extra = 0
    readonly_fields = ('user', 'note', 'created_at')


@admin.register(CommunityCampaign)
class CommunityCampaignAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'risk_level', 'suggested_by',
                    'endorsement_count', 'created_at')
    list_filter = ('status', 'risk_level')
    search_fields = ('title', 'description')
    inlines = [CampaignEndorsementInline]
    actions = ['approve_campaigns', 'reject_campaigns']

    def approve_campaigns(self, request, queryset):
        queryset.update(status='active')
    approve_campaigns.short_description = 'Approve selected campaigns'

    def reject_campaigns(self, request, queryset):
        queryset.update(status='rejected')
    reject_campaigns.short_description = 'Reject selected campaigns'
