import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'marketplace_core.settings')
django.setup()

from django.test import RequestFactory
from users_and_profiles.models import CustomUser
from users_and_profiles.views import MeView
import traceback

user = CustomUser.objects.filter(role='influencer').last()
print("Testing with user:", user.email)

factory = RequestFactory()
request = factory.patch('/api/auth/me/', {'terms_accepted': True}, content_type='application/json')
request.user = user

view = MeView()
try:
    response = view.patch(request)
    print("Response status:", response.status_code)
    print("Response data:", response.data)
except Exception as e:
    print("EXCEPTION CAUGHT:")
    traceback.print_exc()
