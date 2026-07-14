"""
ONE-TIME MIGRATION - only needed if you already had this app running
(with real data in game_sessions) BEFORE the Billing edit/manual-entry
feature was added.

What changed in the schema:
  - game_sessions.asset_id became nullable (manual entries may have none)
  - game_sessions gained: asset_label_override, is_manual_entry,
    was_edited, last_edited_at

SQLAlchemy's Base.metadata.create_all() only creates missing TABLES, not
new COLUMNS on existing tables - so on a brand new database you don't need
this script at all (the table is created correctly from scratch). Run this
only if `python seed_admin.py` or the app's normal startup already created
the old, narrower version of game_sessions and you want to keep its data.

Usage:
    python migrate_add_billing_edit_columns.py

Safe to run multiple times - each statement checks before altering.
"""
from sqlalchemy import inspect, text
from app.database import engine

NEW_COLUMNS = [
    ("asset_label_override", "VARCHAR(80)"),
    ("is_manual_entry", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("was_edited", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("last_edited_at", "TIMESTAMP WITH TIME ZONE"),
]


def column_exists(inspector, table, column):
    return any(col["name"] == column for col in inspector.get_columns(table))


def main():
    inspector = inspect(engine)
    if "game_sessions" not in inspector.get_table_names():
        print("game_sessions table doesn't exist yet - nothing to migrate. "
              "Just run the app normally; it will be created with the new schema.")
        return

    with engine.begin() as conn:
        # Make asset_id nullable (Postgres syntax; SQLite ignores ALTER COLUMN
        # constraints the same way, so this only really matters on Postgres).
        try:
            conn.execute(text("ALTER TABLE game_sessions ALTER COLUMN asset_id DROP NOT NULL"))
            print("✓ asset_id is now nullable")
        except Exception as e:
            print(f"  (skipped asset_id nullability change: {e})")

        for col_name, col_type in NEW_COLUMNS:
            if column_exists(inspector, "game_sessions", col_name):
                print(f"  (already present: {col_name})")
                continue
            conn.execute(text(f"ALTER TABLE game_sessions ADD COLUMN {col_name} {col_type}"))
            print(f"✓ added column: {col_name}")

    print("\nMigration complete.")


if __name__ == "__main__":
    main()
