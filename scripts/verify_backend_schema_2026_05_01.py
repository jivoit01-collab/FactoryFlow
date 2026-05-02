import os
import sys

sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ["DEBUG"] = "False"

import django

django.setup()

from django.apps import apps
from django.db import connection
from rest_framework.test import APIClient


def table_names():
    with connection.cursor() as cursor:
        return set(connection.introspection.table_names(cursor))


def columns_for(table_name):
    with connection.cursor() as cursor:
        return {col.name for col in connection.introspection.get_table_description(cursor, table_name)}


def current_model_drift():
    existing = table_names()
    missing_tables = []
    column_drift = []

    for model in apps.get_models(include_auto_created=True):
        if not model._meta.managed or model._meta.proxy:
            continue
        table = model._meta.db_table
        label = model._meta.label
        if table not in existing:
            missing_tables.append((label, table))
            continue
        actual_columns = columns_for(table)
        expected_columns = {
            field.column
            for field in model._meta.local_fields
            if getattr(field, "column", None)
        }
        missing_columns = sorted(expected_columns - actual_columns)
        if missing_columns:
            column_drift.append((label, table, missing_columns))

    return missing_tables, column_drift


def count_orphans(table_name, column_name, ref_table):
    if table_name not in table_names() or ref_table not in table_names():
        return None
    with connection.cursor() as cursor:
        cursor.execute(
            f'''
            SELECT COUNT(*)
            FROM "{table_name}" child
            LEFT JOIN "{ref_table}" parent ON parent."id" = child."{column_name}"
            WHERE child."{column_name}" IS NOT NULL
              AND parent."id" IS NULL
            '''
        )
        return cursor.fetchone()[0]


def endpoint_statuses():
    User = apps.get_model("accounts", "User")
    UserCompany = apps.get_model("company", "UserCompany")
    user = User.objects.filter(email="jivo@jivo.in").first() or User.objects.filter(is_superuser=True).first()
    user_company = UserCompany.objects.filter(user=user, is_active=True).select_related("company").first()

    client = APIClient()
    client.force_authenticate(user=user)
    headers = {"HTTP_COMPANY_CODE": user_company.company.code}

    paths = [
        "/api/v1/barcode/boxes/",
        "/api/v1/barcode/boxes/?status=ACTIVE",
        "/api/v1/barcode/pallets/",
        "/api/v1/barcode/pallets/?status=ACTIVE",
        "/api/v1/barcode/loose/",
        "/api/v1/barcode/scan/history/",
        "/api/v1/barcode/print/history/",
    ]
    return [(path, client.get(path, **headers).status_code) for path in paths]


missing_tables, column_drift = current_model_drift()

print("Current model missing tables:")
print(missing_tables or "none")
print("Current model missing columns:")
print(column_drift or "none")

print("Barcode orphan rows:")
print(f"barcode_boxmovement.box_id: {count_orphans('barcode_boxmovement', 'box_id', 'barcode_box')}")
print(f"barcode_loosestock.source_box_id: {count_orphans('barcode_loosestock', 'source_box_id', 'barcode_box')}")
print(f"barcode_loosestock.repacked_into_box_id: {count_orphans('barcode_loosestock', 'repacked_into_box_id', 'barcode_box')}")

with connection.cursor() as cursor:
    cursor.execute('SELECT COUNT(*) FROM "barcode_box"')
    print(f"barcode_box rows: {cursor.fetchone()[0]}")
    cursor.execute('SELECT COUNT(*) FROM "barcode_pallet"')
    print(f"barcode_pallet rows: {cursor.fetchone()[0]}")

print("Endpoint statuses:")
for path, status_code in endpoint_statuses():
    print(f"{status_code} {path}")
