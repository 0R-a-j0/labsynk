import sqlite3
import os

# Database path
DB_PATH = "labsynk.db"

def add_reporter_name_column():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(inventory_reports)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "reporter_name" in columns:
            print("Column 'reporter_name' already exists in 'inventory_reports' table.")
        else:
            print("Adding 'reporter_name' column to 'inventory_reports' table...")
            cursor.execute("ALTER TABLE inventory_reports ADD COLUMN reporter_name TEXT")
            conn.commit()
            print("Successfully added 'reporter_name' column.")
            
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_reporter_name_column()
