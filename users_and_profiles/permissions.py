"""
users_and_profiles/permissions.py

Custom DRF permission classes for role-based access control.
"""
from rest_framework.permissions import BasePermission
from .models import UserRole


class IsSuperUser(BasePermission):
    """Allows access only to superusers."""
    message = 'Only superusers can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_superuser
        )


class IsBusiness(BasePermission):
    """Allows access only to users with role='business'."""
    message = 'Only business accounts can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.BUSINESS
        )


class IsInfluencer(BasePermission):
    """Allows access only to users with role='influencer'."""
    message = 'Only influencer accounts can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.INFLUENCER
        )


class IsConversationParticipant(BasePermission):
    """
    Object-level permission.
    Only the business or influencer that is part of the conversation
    can read or write to it.
    """
    message = 'You are not a participant in this conversation.'

    def has_object_permission(self, request, view, obj):
        user = request.user
        # obj is a Conversation instance
        is_business    = (user.role == UserRole.BUSINESS    and
                          obj.business.user == user)
        is_influencer  = (user.role == UserRole.INFLUENCER  and
                          hasattr(user, 'influencer_profile') and
                          obj.influencer == user.influencer_profile)
        return is_business or is_influencer
