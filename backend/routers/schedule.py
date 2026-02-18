from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List
from datetime import datetime

import models, schemas
from database import get_db

router = APIRouter(
    prefix="/schedule",
    tags=["schedule"],
)

@router.get("/", response_model=List[schemas.Schedule])
def read_schedules(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Auto-delete past schedules (lazy cleanup)
    now = datetime.now()
    db.query(models.Schedule).filter(models.Schedule.end_time < now).delete(synchronize_session=False)
    db.commit()

    return db.query(models.Schedule).offset(skip).limit(limit).all()

@router.get("/rooms", response_model=List[str])
def get_lab_rooms(db: Session = Depends(get_db)):
    """Get distinct lab rooms that have been used/scheduled"""
    # Fetch distinct lab_room values where it's not null
    rooms = db.query(models.Schedule.lab_room).distinct().filter(models.Schedule.lab_room != None).all()
    # Flatten the list of tuples [('Room 1',), ('Room 2',)] -> ['Room 1', 'Room 2']
    return [r[0] for r in rooms if r[0]]

@router.post("/", response_model=schemas.Schedule)
def create_schedule(schedule: schemas.ScheduleCreate, db: Session = Depends(get_db)):
    # Conflict Detection Logic
    # Check if there is any existing schedule for the same lab that overlaps with the requested time
    conflict = db.query(models.Schedule).filter(
        models.Schedule.lab_name == schedule.lab_name,
        or_(
            and_(models.Schedule.start_time <= schedule.start_time, models.Schedule.end_time > schedule.start_time),
            and_(models.Schedule.start_time < schedule.end_time, models.Schedule.end_time >= schedule.end_time),
            and_(models.Schedule.start_time >= schedule.start_time, models.Schedule.end_time <= schedule.end_time)
        )
    ).first()

    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Time slot conflict! Lab '{schedule.lab_name}' is already booked from {conflict.start_time} to {conflict.end_time}."
        )

    db_schedule = models.Schedule(**schedule.dict())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    db_schedule = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if db_schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    db.delete(db_schedule)
    db.commit()
    return {"ok": True}
