import sys
import os
from sqlalchemy.schema import CreateTable
from sqlalchemy import create_engine
from models import Base, User, InventoryItem, ResourceSuggestion, Schedule, InventoryReport
from database import engine

def generate_schema():
    # Print CreateTable statements for all models
    # Note: This generates generic SQL. Specific dialects might vary slightly but usually fine for Postgres.
    
    # Create the engine with a mock strategy to just dump DDL? 
    # Or just iterate models.
    
    # Correct approach: Use the engine to compile the CreateTable construct
    # postgres_engine = create_engine('postgresql://')
    
    from sqlalchemy.dialects import postgresql
    
    print("-- Auto-generated Schema --")
    
    for table_name, table in Base.metadata.tables.items():
        create_table_stmt = CreateTable(table).compile(engine, dialect=postgresql.dialect())
        print(str(create_table_stmt))
        print(";") # Add semicolon

if __name__ == "__main__":
    generate_schema()
