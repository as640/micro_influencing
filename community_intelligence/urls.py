"""
community_intelligence URLs — mounted at /api/community/ in marketplace_core/urls.py
"""

from django.urls import path

from .views import (
    TrendingTopicsView, TopicDetailView, MyCategoriesView,
    CommunityCampaignListCreateView, CommunityCampaignDetailView,
    EndorseCampaignView, RefreshTrendsView,
)

urlpatterns = [
    # Trends
    path('trends/',                    TrendingTopicsView.as_view(),  name='ci-trends'),
    path('trends/<uuid:pk>/',          TopicDetailView.as_view(),     name='ci-topic-detail'),
    path('categories/',                MyCategoriesView.as_view(),    name='ci-my-categories'),

    # Community Campaigns
    path('campaigns/',                 CommunityCampaignListCreateView.as_view(),
                                       name='ci-campaign-list-create'),
    path('campaigns/<uuid:pk>/',       CommunityCampaignDetailView.as_view(),
                                       name='ci-campaign-detail'),
    path('campaigns/<uuid:pk>/endorse/', EndorseCampaignView.as_view(),
                                         name='ci-campaign-endorse'),

    # Admin
    path('admin/refresh/',             RefreshTrendsView.as_view(),   name='ci-refresh'),
]
