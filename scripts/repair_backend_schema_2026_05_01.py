import os
import sys

sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ["DEBUG"] = "False"

import django

django.setup()

from django.apps import apps
from django.db import connection
from django.db.utils import IntegrityError, ProgrammingError


def table_exists(table_name):
    with connection.cursor() as cursor:
        return table_name in connection.introspection.table_names(cursor)


def column_exists(table_name, column_name):
    with connection.cursor() as cursor:
        columns = connection.introspection.get_table_description(cursor, table_name)
    return any(column.name == column_name for column in columns)


def constraint_exists(table_name, constraint_name):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_schema = current_schema()
              AND table_name = %s
              AND constraint_name = %s
            """,
            [table_name, constraint_name],
        )
        return cursor.fetchone() is not None


def add_fk_if_missing(table_name, constraint_name, column_name, ref_table, ref_column, on_delete):
    if constraint_exists(table_name, constraint_name):
        return f"{constraint_name}: exists"

    if not table_exists(table_name) or not table_exists(ref_table):
        return f"{constraint_name}: skipped, table missing"

    if not column_exists(table_name, column_name):
        return f"{constraint_name}: skipped, column missing"

    sql = (
        f'ALTER TABLE "{table_name}" '
        f'ADD CONSTRAINT "{constraint_name}" '
        f'FOREIGN KEY ("{column_name}") '
        f'REFERENCES "{ref_table}" ("{ref_column}") '
        f'DEFERRABLE INITIALLY DEFERRED'
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql)
        return f"{constraint_name}: added ({on_delete} handled by Django)"
    except IntegrityError:
        # Existing rows can be orphaned if the referenced table was dropped.
        # NOT VALID enforces the FK for future writes without requiring old rows
        # to have recoverable parent records.
        connection.rollback()
        sql = sql + " NOT VALID"
        with connection.cursor() as cursor:
            cursor.execute(sql)
        return f"{constraint_name}: added NOT VALID; existing orphan rows remain"


def repair():
    actions = []

    Box = apps.get_model("barcode", "Box")
    box_table = Box._meta.db_table

    if not table_exists(box_table):
        with connection.schema_editor() as schema_editor:
            schema_editor.create_model(Box)
        actions.append(f"{box_table}: created from current Django model")
    else:
        actions.append(f"{box_table}: already exists")

    LineClearance = apps.get_model("production_execution", "LineClearance")
    lc_table = LineClearance._meta.db_table
    lc_field = LineClearance._meta.get_field("production_incharge_sign")

    if table_exists(lc_table) and not column_exists(lc_table, lc_field.column):
        with connection.schema_editor() as schema_editor:
            schema_editor.add_field(LineClearance, lc_field)
        actions.append(f"{lc_table}.{lc_field.column}: added")
    elif table_exists(lc_table):
        actions.append(f"{lc_table}.{lc_field.column}: already exists")
    else:
        actions.append(f"{lc_table}: missing, column repair skipped")

    # If the original barcode_box table was dropped with CASCADE, dependent FK
    # constraints may also be gone while the dependent tables still exist.
    fk_checks = [
        ("barcode_boxmovement", "barcode_boxmovement_box_id_fk", "box_id", "barcode_box", "id", "CASCADE"),
        ("barcode_loosestock", "barcode_loosestock_source_box_id_fk", "source_box_id", "barcode_box", "id", "SET_NULL"),
        ("barcode_loosestock", "barcode_loosestock_repacked_into_box_id_fk", "repacked_into_box_id", "barcode_box", "id", "SET_NULL"),
    ]
    for check in fk_checks:
        try:
            actions.append(add_fk_if_missing(*check))
        except ProgrammingError as exc:
            actions.append(f"{check[1]}: skipped/error {exc.__class__.__name__}: {exc}")

    with connection.cursor() as cursor:
        cursor.execute('SELECT COUNT(*) FROM "barcode_box"')
        box_count = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM "barcode_pallet"')
        pallet_count = cursor.fetchone()[0]

    print("Schema repair actions:")
    for action in actions:
        print(f"- {action}")
    print(f"barcode_box rows: {box_count}")
    print(f"barcode_pallet rows: {pallet_count}")


if __name__ == "__main__":
    repair()
