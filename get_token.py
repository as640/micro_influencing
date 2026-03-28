import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'marketplace_core.settings')
django.setup()
from users_and_profiles.models import CustomUser
from rest_framework_simplejwt.tokens import RefreshToken
u = CustomUser.objects.filter(role='influencer').first()
if u:
    token = str(RefreshToken.for_user(u).access_token)
    print("TOKEN_INFLUENCER=", token)
    
u2 = CustomUser.objects.filter(role='business').first()
if u2:
    token2 = str(RefreshToken.for_user(u2).access_token)
    print("TOKEN_BUSINESS=", token2)
