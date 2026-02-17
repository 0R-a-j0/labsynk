from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String) # "assistant", "hod", "principal", "admin"
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    department = relationship("Department", foreign_keys=[department_id])

class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String, default="") # e.g. "Components", "Equipment"
    total_quantity = Column(Integer, default=0)
    available_quantity = Column(Integer, default=0)
    faulty_quantity = Column(Integer, default=0)
    location = Column(String, default="") # e.g. "Lab 3"
    image_url = Column(String, nullable=True)
    description = Column(String, nullable=True)
    low_stock_threshold = Column(Integer, default=10)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    subject = Column(String, nullable=True)

    college = relationship("College", foreign_keys=[college_id])
    department = relationship("Department", foreign_keys=[department_id])

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    lab_name = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    course_name = Column(String)
    batch = Column(String)
    booked_by_id = Column(Integer, ForeignKey("users.id"))
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    semester = Column(Integer, nullable=True)
    subject = Column(String, nullable=True)
    instructor_name = Column(String, nullable=True)
    lab_room = Column(String, nullable=True)

    booked_by = relationship("User")


# ====== VLabs Models ======

class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    departments = relationship("Department", back_populates="college", cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    college = relationship("College", back_populates="departments")
    subjects = relationship("VLabSubject", back_populates="department", cascade="all, delete-orphan")


class VLabSubject(Base):
    __tablename__ = "vlab_subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    code = Column(String, nullable=True)
    semester = Column(Integer)  # 1-8
    department_id = Column(Integer, ForeignKey("departments.id"))
    default_compiler = Column(String, nullable=True)
    lab_manual_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="subjects")
    experiments = relationship("VLabExperiment", back_populates="subject", cascade="all, delete-orphan")


class VLabExperiment(Base):
    __tablename__ = "vlab_experiments"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("vlab_subjects.id"))
    unit = Column(Integer, nullable=True)
    topic = Column(String)
    description = Column(Text, nullable=True)
    suggested_simulation = Column(String, nullable=True)
    simulation_links = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("VLabSubject", back_populates="experiments")
