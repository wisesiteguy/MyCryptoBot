# Generated by Django 3.2 on 2022-01-23 12:02

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('model', '0062_alter_trade_side'),
    ]

    operations = [
        migrations.AddField(
            model_name='pipeline',
            name='open_time',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
    ]