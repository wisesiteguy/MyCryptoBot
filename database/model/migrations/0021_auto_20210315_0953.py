# Generated by Django 2.2.5 on 2021-03-15 14:53

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('model', '0020_messariapi_interval'),
    ]

    operations = [
        migrations.CreateModel(
            name='AssetResources',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField(null=True)),
                ('url', models.TextField(null=True)),
            ],
        ),
        migrations.AddField(
            model_name='asset',
            name='all_time_high_date',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='all_time_high_price',
            field=models.FloatField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='asset_created_at',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='category',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='developer_activity_commits_last_1_year',
            field=models.IntegerField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='developer_activity_commits_last_3_months',
            field=models.IntegerField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='developer_activity_stars',
            field=models.IntegerField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='overview',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='sector',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='slug',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='stats_date',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='tagline',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='technology',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='token_emission_type_general',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='token_emission_type_precise',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='token_initial_supply',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='token_is_treasury_centralized',
            field=models.NullBooleanField(),
        ),
        migrations.AddField(
            model_name='asset',
            name='token_launch_style',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='token_max_supply',
            field=models.FloatField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='token_mining_algorithm',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='token_next_halving_date',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='token_type',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='token_usage',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='relevant_resources',
            field=models.ManyToManyField(to='model.AssetResources'),
        ),
    ]