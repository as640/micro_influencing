"""
Manual migration: add payout fields to influencer_profiles.
Only adds columns that don't already exist in the database.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users_and_profiles', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='influencerprofile',
            name='upi_id',
            field=models.CharField(
                blank=True, default='', max_length=100,
                help_text='e.g. name@upi or 9876543210@paytm'
            ),
        ),
        migrations.AddField(
            model_name='influencerprofile',
            name='bank_account_number',
            field=models.CharField(blank=True, default='', max_length=30),
        ),
        migrations.AddField(
            model_name='influencerprofile',
            name='bank_ifsc_code',
            field=models.CharField(blank=True, default='', max_length=15),
        ),
        migrations.AddField(
            model_name='influencerprofile',
            name='bank_account_holder_name',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
    ]
