import sqlite3
import os

db_path = "zigmaa_crm.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(invoices)")
    cols = [col[1] for col in cursor.fetchall()]
    print("Existing cols:", cols)

    needed = [
        ("contact_id", "VARCHAR(36)"),
        ("client_name", "VARCHAR(255) DEFAULT ''"),
        ("client_company", "VARCHAR(255)"),
        ("client_email", "VARCHAR(255)"),
        ("client_phone", "VARCHAR(50)"),
        ("type", "VARCHAR(20) DEFAULT 'QUOTE'"),
        ("status", "VARCHAR(20) DEFAULT 'DRAFT'"),
        ("issue_date", "DATE"),
        ("discount", "NUMERIC(12, 2) DEFAULT 0.00"),
        ("notes", "TEXT")
    ]
    for col_name, col_def in needed:
        if col_name not in cols:
            print(f"Adding missing column: {col_name}")
            cursor.execute(f"ALTER TABLE invoices ADD COLUMN {col_name} {col_def}")
    conn.commit()
    conn.close()
    print("Migration finished!")
else:
    print("No sqlite db found to alter.")
