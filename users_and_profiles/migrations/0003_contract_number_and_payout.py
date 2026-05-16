"""
Migration: add contract_number and payout_transfer_id to contracts table.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users_and_profiles', '0002_add_influencer_payout_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='contract',
            name='contract_number',
            field=models.PositiveIntegerField(
                null=True, unique=True, editable=False,
                help_text='Auto-incrementing human-readable contract number'
            ),
        ),
        migrations.AddField(
            model_name='contract',
            name='payout_transfer_id',
            field=models.CharField(
                max_length=255, blank=True, null=True,
                help_text='Razorpay transfer ID when payout is sent to influencer'
            ),
        ),
    ]
