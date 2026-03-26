import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "marketplace_core.settings")
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()
pw = "SecureAdmin123!"
user, created = User.objects.get_or_create(email="anubhavsharmasharma10@gmail.com")
user.set_password(pw)
user.is_superuser = True
user.is_staff = True
user.save()
print("Superadmin guaranteed with password: " + pw)
