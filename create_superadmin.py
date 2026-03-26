import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'marketplace_core.settings')
django.setup()

from users_and_profiles.models import CustomUser

# Create superadmin
if not CustomUser.objects.filter(email='superadmin@example.com').exists():
    CustomUser.objects.create_superuser('superadmin@example.com', 'admin@123321')
    print("Superuser created successfully!")
else:
    print("Superuser already exists.")
