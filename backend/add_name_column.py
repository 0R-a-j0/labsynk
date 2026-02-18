import sqlite3
import os

# Database path
DB_PATH = "labsynk.db"

def add_name_column():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "name" in columns:
            print("Column 'name' already exists in 'users' table.")
        else:
            print("Adding 'name' column to 'users' table...")
            # Add column with default value 'test0'
            cursor.execute("ALTER TABLE users ADD COLUMN name TEXT DEFAULT 'test0'")
            conn.commit()
            print("Successfully added 'name' column.")
            
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_name_column()
