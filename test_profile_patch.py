import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'marketplace_core.settings')
django.setup()

from users_and_profiles.models import CustomUser
from users_and_profiles.serializers import InfluencerProfileSerializer

user = CustomUser.objects.filter(role='influencer').first()
if user:
    # Simulating what AccountInfoPage sends when followers_count is null
    data = {'followers_count': None, 'category': 'other'}
    serializer = InfluencerProfileSerializer(user.influencer_profile, data=data, partial=True)
    if not serializer.is_valid():
        print("Influencer profile save error:", serializer.errors)
    else:
        print("Influencer profile valid!")

    # Simulating profile picture upload (request.data only has profile_picture)
    data = {}
    serializer2 = InfluencerProfileSerializer(user.influencer_profile, data=data, partial=True)
    if not serializer2.is_valid():
        print("Picture upload error:", serializer2.errors)
    else:
        print("Picture upload valid!")
