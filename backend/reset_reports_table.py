from database import engine
from models import Base, InventoryReport
from sqlalchemy import text

def reset_reports_table():
    print("Dropping inventory_reports table...")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS inventory_reports"))
        conn.commit()
    
    print("Recreating inventory_reports table...")
    Base.metadata.create_all(bind=engine)
    print("Done!")

if __name__ == "__main__":
    reset_reports_table()
