from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

import models, schemas
from database import get_db

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"],
)

@router.get("/", response_model=List[schemas.Inventory])
def read_inventory(
    skip: int = 0,
    limit: int = 100,
    college_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    subject: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(models.InventoryItem)
    if college_id is not None:
        query = query.filter(models.InventoryItem.college_id == college_id)
    if department_id is not None:
        query = query.filter(models.InventoryItem.department_id == department_id)
    if subject is not None:
        query = query.filter(models.InventoryItem.subject.contains(subject))
    items = query.offset(skip).limit(limit).all()
    return items

@router.post("/", response_model=schemas.Inventory)
def create_inventory_item(item: schemas.InventoryCreate, db: Session = Depends(get_db)):
    db_item = models.InventoryItem(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/search", response_model=List[schemas.Inventory])
def search_inventory(q: str, db: Session = Depends(get_db)):
    items = db.query(models.InventoryItem).filter(
        models.InventoryItem.name.contains(q) |
        models.InventoryItem.category.contains(q)
    ).all()
    return items

@router.get("/{item_id}", response_model=schemas.Inventory)
def read_inventory_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.put("/{item_id}", response_model=schemas.Inventory)
def update_inventory_item(item_id: int, item: schemas.InventoryUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    for key, value in item.dict(exclude_unset=True).items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_inventory_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(db_item)
    db.commit()
    return {"ok": True}
