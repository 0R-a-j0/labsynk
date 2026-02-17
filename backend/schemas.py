from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# Inventory Schemas
class InventoryBase(BaseModel):
    name: str
    category: str = ""
    total_quantity: int = 0
    available_quantity: int = 0
    faulty_quantity: int = 0
    location: str = ""
    image_url: Optional[str] = None
    description: Optional[str] = None
    low_stock_threshold: int = 10
    college_id: Optional[int] = None
    department_id: Optional[int] = None
    subject: Optional[str] = None

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    total_quantity: Optional[int] = None
    available_quantity: Optional[int] = None
    faulty_quantity: Optional[int] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    low_stock_threshold: Optional[int] = None
    college_id: Optional[int] = None
    department_id: Optional[int] = None
    subject: Optional[str] = None

class Inventory(InventoryBase):
    id: int

    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    email: str
    role: str

class UserCreate(UserBase):
    password: str
    department_id: Optional[int] = None

class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    department_id: Optional[int] = None

class User(UserBase):
    id: int
    department_id: Optional[int] = None

    class Config:
        from_attributes = True

# Schedule Schemas
class ScheduleBase(BaseModel):
    lab_name: str
    start_time: datetime
    end_time: datetime
    course_name: str
    batch: str
    booked_by_id: Optional[int] = None
    college_id: Optional[int] = None
    department_id: Optional[int] = None
    semester: Optional[int] = None
    subject: Optional[str] = None
    instructor_name: Optional[str] = None
    lab_room: Optional[str] = None

class ScheduleCreate(ScheduleBase):
    pass

class Schedule(ScheduleBase):
    id: int

    class Config:
        from_attributes = True
