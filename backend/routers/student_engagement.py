from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from routers.auth import get_current_user, get_current_user_optional

router = APIRouter(
    prefix="/engagement",
    tags=["engagement"],
)

@router.post("/resources/suggest", response_model=schemas.ResourceSuggestion)
def suggest_resource(suggestion: schemas.ResourceSuggestionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_suggestion = models.ResourceSuggestion(**suggestion.dict(), user_id=current_user.id)
    db.add(db_suggestion)
    db.commit()
    db.refresh(db_suggestion)
    return db_suggestion

@router.get("/resources/suggestions", response_model=List[schemas.ResourceSuggestion])
def get_suggestions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["admin", "principal", "hod", "assistant"]:
         raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.ResourceSuggestion).all()

@router.patch("/resources/suggestions/{id}/status")
def update_suggestion_status(id: int, status: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["admin", "principal", "hod", "assistant"]:
         raise HTTPException(status_code=403, detail="Not authorized")
    
    suggestion = db.query(models.ResourceSuggestion).filter(models.ResourceSuggestion.id == id).first()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    
    suggestion.status = status
    db.commit()
    return {"status": "success"}

@router.post("/inventory/report", response_model=schemas.InventoryReport)
def report_inventory_issue(
    report: schemas.InventoryReportCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user_optional) # Changed to optional
):
    user_id = current_user.id if current_user else None
    
    # If not logged in, name is required in the report data
    if not user_id and not report.reporter_name:
        raise HTTPException(status_code=400, detail="Name is required for anonymous reports")

    db_report = models.InventoryReport(
        **report.dict(), 
        user_id=user_id
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("/inventory/reports", response_model=List[schemas.InventoryReport])
def get_inventory_reports(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["admin", "principal", "hod", "assistant"]:
         raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.InventoryReport).all()

@router.patch("/inventory/reports/{id}/status")
def update_report_status(id: int, status: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["admin", "principal", "hod", "assistant"]:
         raise HTTPException(status_code=403, detail="Not authorized")
    
    report = db.query(models.InventoryReport).filter(models.InventoryReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = status
    db.commit()
    return {"status": "success"}
