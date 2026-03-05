import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "marketplace_core.settings")
django.setup()

from django.urls import resolve
match = resolve('/api/conversations/')

view_class = match.func.view_class
print(f"Name: {view_class.__name__}")
print(f"Permissions: {view_class.permission_classes}")

view_instance = view_class()
if hasattr(view_instance, 'get_permissions'):
    print(f"get_permissions: {[type(p).__name__ for p in view_instance.get_permissions()]}")
