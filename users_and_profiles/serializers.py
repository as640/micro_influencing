"""
users_and_profiles/serializers.py

Handles validation and data transformation for:
  - User registration (business + influencer, creates profile automatically)
  - JWT login
  - Current user ("me") response
"""

from django.contrib.auth import authenticate
from django.db import transaction
from rest_framework import serializers
from .models import (
    CustomUser, UserRole,
    InfluencerProfile,
    BusinessProfile,
    Campaign,
    Conversation,
    Message,
    Contract,
    ContractStatus,
)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

class RegisterSerializer(serializers.ModelSerializer):
    """
    Registers a new user and automatically creates their profile stub.

    Required for both roles:
        email, password, role

    Required only for role='influencer':
        instagram_handle, category, locality

    Required only for role='business':
        company_name, industry
    """
    password = serializers.CharField(write_only=True, min_length=8)

    # Influencer-specific (optional at serializer level — validated in validate())
    instagram_handle = serializers.CharField(max_length=255, required=False)
    category         = serializers.CharField(max_length=100,  required=False)
    locality         = serializers.CharField(max_length=100,  required=False)

    # Business-specific
    company_name     = serializers.CharField(max_length=255, required=False)
    industry         = serializers.CharField(max_length=100,  required=False)
    gstin            = serializers.CharField(max_length=15, required=False)
    reference_id     = serializers.CharField(required=False)
    otp              = serializers.CharField(max_length=6, required=False)

    class Meta:
        model  = CustomUser
        fields = ['email', 'password', 'role',
                  # influencer
                  'instagram_handle', 'category', 'locality',
                  # business
                  'company_name', 'industry', 'gstin', 'reference_id', 'otp']

    def validate(self, attrs):
        role = attrs.get('role')

        if role == UserRole.INFLUENCER:
            for field in ['instagram_handle', 'category', 'locality']:
                if not attrs.get(field):
                    raise serializers.ValidationError(
                        {field: f'Required for influencers.'}
                    )

        elif role == UserRole.BUSINESS:
            for field in ['gstin', 'reference_id', 'otp']:
                if not attrs.get(field):
                    raise serializers.ValidationError(
                        {field: f'GST verification required for business registration.'}
                    )
            
            # Ensure GSTIN uniqueness before hitting the Setu API
            gstin = attrs['gstin']
            if BusinessProfile.objects.filter(gstin=gstin).exists():
                raise serializers.ValidationError(
                    {'gstin': 'This GST number is already registered to another business account.'}
                )
            
            # Execute synchronous GST Auth call to block unauthorized CustomUser creations
            from . import setu_service
            try:
                gst_data = setu_service.verify_gst_otp(
                    reference_id=attrs['reference_id'],
                    otp=attrs['otp'],
                    gstin=attrs['gstin']
                )
                # Pass legal_name down to create()
                attrs['legal_name'] = gst_data.get('legalName', 'Verified Business')
            except ValueError as e:
                raise serializers.ValidationError({'otp': str(e)})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        # Prevent temporary state bugs
        legal_name       = validated_data.pop('legal_name', None)
        gstin            = validated_data.pop('gstin', None)
        validated_data.pop('reference_id', None)
        validated_data.pop('otp', None)
        
        # Pop profile fields before creating the user
        instagram_handle = validated_data.pop('instagram_handle', None)
        category         = validated_data.pop('category', None)
        locality         = validated_data.pop('locality', '')
        company_name     = validated_data.pop('company_name', None)
        industry         = validated_data.pop('industry', 'Other')

        password = validated_data.pop('password')
        user     = CustomUser(**validated_data)
        user.set_password(password)
        user.save()

        if user.role == UserRole.INFLUENCER:
            InfluencerProfile.objects.create(
                user=user,
                instagram_handle=instagram_handle,
                category=category,
                locality=locality,
            )
        elif user.role == UserRole.BUSINESS:
            BusinessProfile.objects.create(
                user=user,
                company_name=company_name or legal_name,
                industry=industry,
                locality=locality,
                gstin=gstin,
                legal_name=legal_name,
                is_verified=True
            )

        return user


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            username=attrs['email'],   # USERNAME_FIELD = 'email'
            password=attrs['password'],
        )
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('This account has been deactivated.')
        attrs['user'] = user
        return attrs


# ---------------------------------------------------------------------------
# Current User ("Me")
# ---------------------------------------------------------------------------

class InfluencerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = InfluencerProfile
        exclude = ['user']


class BusinessProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BusinessProfile
        exclude = ['user']


class UserMeSerializer(serializers.ModelSerializer):
    """Returns the current authenticated user + their profile."""
    influencer_profile = InfluencerProfileSerializer(read_only=True)
    business_profiles  = BusinessProfileSerializer(many=True, read_only=True)

    class Meta:
        model  = CustomUser
        fields = ['id', 'email', 'role', 'created_at', 'is_superuser',
                  'influencer_profile', 'business_profiles']


# ---------------------------------------------------------------------------
# Discovery — Influencer Serializers
# ---------------------------------------------------------------------------

class InfluencerListSerializer(serializers.ModelSerializer):
    """
    Compact card shown in the influencer search grid.
    Includes only the fields a business needs to scan quickly.
    """
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model  = InfluencerProfile
        fields = [
            'id', 'email', 'instagram_handle', 'category', 'locality',
            'is_verified', 'followers_count', 'avg_reach',
            'avg_likes_per_reel', 'price_min', 'price_max',
        ]


class InfluencerDetailSerializer(serializers.ModelSerializer):
    """
    Full influencer profile — all metrics, shown on public profile page.
    """
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model  = InfluencerProfile
        fields = [
            'id', 'email',
            'instagram_handle', 'category', 'locality', 'bio',
            'is_verified',
            # Stats
            'followers_count', 'following_count', 'posts_count',
            # Performance metrics
            'avg_reach', 'avg_likes_per_post', 'avg_likes_per_reel',
            # Audience demographics (from Instagram verification)
            'follower_gender_ratio', 'follower_age_ratio', 'top_audience_locality',
            # Pricing
            'price_min', 'price_max',
            'updated_at',
        ]


# ---------------------------------------------------------------------------
# Discovery — Campaign Serializers
# ---------------------------------------------------------------------------

class BusinessProfilePublicSerializer(serializers.ModelSerializer):
    """Minimal business info shown inside a campaign card."""
    class Meta:
        model  = BusinessProfile
        fields = ['id', 'company_name', 'industry', 'locality']


class CampaignSerializer(serializers.ModelSerializer):
    """
    Serializer for Campaigns.
    - GET  → includes nested business info
    - POST → business is auto-set from the authenticated user
    """
    # Read-only nested field shown in listing/detail
    business_info = BusinessProfilePublicSerializer(
        source='business', read_only=True
    )

    class Meta:
        model  = Campaign
        fields = [
            'id', 'title', 'required_ad_type',
            'budget_min', 'budget_max', 'description',
            'is_active', 'created_at', 'updated_at',
            # nested
            'business', 'business_info',
        ]
        extra_kwargs = {
            # 'business' is write-only (we set it from the view via request.user)
            'business':    {'write_only': True, 'required': False},
            'is_active':   {'required': False},
            'description': {'required': False},
        }


# ---------------------------------------------------------------------------
# Messaging — Serializers
# ---------------------------------------------------------------------------

class MessageSerializer(serializers.ModelSerializer):
    """
    A single chat message.
    Includes sender's email + role for display in the inbox.
    """
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    sender_role  = serializers.CharField(source='sender.role',  read_only=True)

    class Meta:
        model  = Message
        fields = [
            'id', 'conversation',
            'sender', 'sender_email', 'sender_role',
            'content', 'is_read', 'created_at',
        ]
        extra_kwargs = {
            'conversation': {'write_only': True},
            'sender':       {'write_only': True},
        }


class ConversationSerializer(serializers.ModelSerializer):
    """
    Compact conversation card shown in the inbox thread list.
    Shows participants and an unread message count.
    """
    # Surfaced info for each party
    business_name      = serializers.CharField(source='business.company_name',        read_only=True)
    influencer_handle  = serializers.CharField(source='influencer.instagram_handle',  read_only=True)
    # Expose IDs as readable fields (FK fields themselves are write-only)
    influencer_id      = serializers.UUIDField(source='influencer.id', read_only=True)
    business_id        = serializers.UUIDField(source='business.id',   read_only=True)
    unread_count       = serializers.SerializerMethodField()
    last_message       = serializers.SerializerMethodField()

    class Meta:
        model  = Conversation
        fields = [
            'id', 'created_at',
            'business', 'business_name', 'business_id',
            'influencer', 'influencer_handle', 'influencer_id',
            'unread_count', 'last_message',
        ]
        extra_kwargs = {
            'business':   {'write_only': True},
            'influencer': {'write_only': True},
        }

    def get_unread_count(self, obj):
        """Count messages NOT sent by the current user that are unread."""
        request = self.context.get('request')
        if not request:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if not msg:
            return None
        return {
            'content':    msg.content[:80] + ('…' if len(msg.content) > 80 else ''),
            'sender_email': msg.sender.email,
            'created_at': msg.created_at,
        }


class ConversationDetailSerializer(ConversationSerializer):
    """
    Full conversation view — all fields from ConversationSerializer
    plus the complete message thread.
    """
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ['messages']


# ---------------------------------------------------------------------------
# Contracts — Serializers
# ---------------------------------------------------------------------------

class ContractSerializer(serializers.ModelSerializer):
    """
    Used for both creating and reading contracts.

    On write (POST):
        Required: influencer_id, agreed_price, deliverables
        Optional: campaign_id

    On read (GET):
        Returns nested business + influencer info alongside all contract fields.
    """
    # Nested read-only display fields
    business_name      = serializers.CharField(source='business.company_name',        read_only=True)
    influencer_handle  = serializers.CharField(source='influencer.instagram_handle',  read_only=True)
    campaign_title     = serializers.CharField(source='campaign.title', default=None, read_only=True)
    has_open_dispute   = serializers.SerializerMethodField()

    class Meta:
        model  = Contract
        fields = [
            'id', 'status', 'has_open_dispute',
            'agreed_price', 'deliverables', 'payment_intent_id',
            'created_at', 'updated_at',
            # write-only FKs
            'business', 'influencer', 'campaign',
            # read-only display
            'business_name', 'influencer_handle', 'campaign_title',
        ]
        extra_kwargs = {
            'business':          {'write_only': True, 'required': False},
            'influencer':        {'write_only': True},
            'campaign':          {'write_only': True, 'required': False},
            'payment_intent_id': {'required': False},
            'status':            {'required': False},
        }

    def get_has_open_dispute(self, obj):
        # Prevent N+1 issues if preferred, but since it's a small list this is fine
        return obj.disputes.filter(status='open').exists()

# ---------------------------------------------------------------------------
# Password Reset
# ---------------------------------------------------------------------------

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email.")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)


# ---------------------------------------------------------------------------
# Disputes
# ---------------------------------------------------------------------------

class DisputeSerializer(serializers.ModelSerializer):
    raised_by_email       = serializers.EmailField(source='raised_by.email',            read_only=True)
    business_name         = serializers.CharField(source='contract.business.company_name', read_only=True)
    influencer_handle     = serializers.CharField(source='contract.influencer.instagram_handle', read_only=True)
    resolved_by_email     = serializers.EmailField(source='resolved_by.email', default=None, read_only=True)

    class Meta:
        from .models import Dispute
        model  = Dispute
        fields = [
            'id', 'contract', 'raised_by', 'raised_by_email',
            'business_name', 'influencer_handle',
            'reason', 'status', 'resolution_note',
            'resolved_by', 'resolved_by_email',
            'created_at', 'resolved_at',
        ]
        extra_kwargs = {
            'raised_by':  {'read_only': True},
            'resolved_by': {'read_only': True},
            'status':     {'read_only': True},
            'resolved_at': {'read_only': True},
        }

