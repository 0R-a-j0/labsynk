from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import json
import os
import uuid

from database import get_db
from models import College, Department, VLabSubject, VLabExperiment
from services import syllabus_service

router = APIRouter(
    prefix="/vlabs",
    tags=["vlabs"],
)


# ====== Pydantic Schemas ======

class CollegeCreate(BaseModel):
    name: str

class CollegeResponse(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True

class DepartmentCreate(BaseModel):
    name: str
    college_id: int

class DepartmentResponse(BaseModel):
    id: int
    name: str
    college_id: int
    
    class Config:
        from_attributes = True

class VLabSubjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    semester: int
    department_id: int
    default_compiler: Optional[str] = None
    lab_manual_url: Optional[str] = None

class VLabSubjectResponse(BaseModel):
    id: int
    name: str
    code: Optional[str]
    semester: int
    department_id: int
    default_compiler: Optional[str]
    lab_manual_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class VLabSubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    semester: Optional[int] = None
    default_compiler: Optional[str] = None
    lab_manual_url: Optional[str] = None

class SimulationLink(BaseModel):
    source: str
    url: str
    description: Optional[str] = None

class VLabExperimentCreate(BaseModel):
    subject_id: int
    unit: Optional[int] = None
    topic: str
    description: Optional[str] = None
    suggested_simulation: Optional[str] = None
    simulation_links: List[SimulationLink] = []

class VLabExperimentUpdate(BaseModel):
    topic: Optional[str] = None
    unit: Optional[int] = None
    description: Optional[str] = None
    suggested_simulation: Optional[str] = None
    simulation_links: Optional[List[SimulationLink]] = None

class VLabExperimentResponse(BaseModel):
    id: int
    subject_id: int
    unit: Optional[int]
    topic: str
    description: Optional[str]
    suggested_simulation: Optional[str]
    simulation_links: List[SimulationLink]
    
    class Config:
        from_attributes = True

class SaveToVLabsRequest(BaseModel):
    college_id: int
    department_id: int
    semester: int
    subjects: List[dict]  # Parsed subjects with experiments


# ====== College Endpoints ======

@router.get("/colleges", response_model=List[CollegeResponse])
def get_colleges(db: Session = Depends(get_db)):
    """Get all colleges"""
    return db.query(College).order_by(College.name).all()

@router.post("/colleges", response_model=CollegeResponse)
def create_college(data: CollegeCreate, db: Session = Depends(get_db)):
    """Create a new college (admin only)"""
    # Check if already exists
    existing = db.query(College).filter(College.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="College already exists")
    
    college = College(name=data.name)
    db.add(college)
    db.commit()
    db.refresh(college)
    return college

@router.delete("/colleges/{college_id}")
def delete_college(college_id: int, db: Session = Depends(get_db)):
    """Delete a college and all its departments (admin only)"""
    college = db.query(College).filter(College.id == college_id).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
    
    # Store info for response before deletion
    college_name = college.name
    dept_count = db.query(Department).filter(Department.college_id == college_id).count()
    
    db.delete(college)  # Cascade will delete departments
    db.commit()
    
    return {"success": True, "message": f"Deleted '{college_name}' with {dept_count} departments"}


# ====== Department Endpoints ======

@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(
    college_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get departments, optionally filtered by college"""
    query = db.query(Department)
    if college_id:
        query = query.filter(Department.college_id == college_id)
    return query.order_by(Department.name).all()

@router.post("/departments", response_model=DepartmentResponse)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db)):
    """Create a new department (admin only)"""
    # Check if college exists
    college = db.query(College).filter(College.id == data.college_id).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
    
    # Check if already exists
    existing = db.query(Department).filter(
        Department.name == data.name,
        Department.college_id == data.college_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists in this college")
    
    department = Department(name=data.name, college_id=data.college_id)
    db.add(department)
    db.commit()
    db.refresh(department)
    return department

@router.delete("/departments/{department_id}")
def delete_department(department_id: int, db: Session = Depends(get_db)):
    """Delete a department and all its subjects (admin only)"""
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    dept_name = department.name
    subject_count = db.query(VLabSubject).filter(VLabSubject.department_id == department_id).count()
    
    db.delete(department)  # Cascade will delete subjects and experiments
    db.commit()
    
    return {"success": True, "message": f"Deleted '{dept_name}' with {subject_count} subjects"}


# ====== Subject Endpoints ======

@router.get("/subjects", response_model=List[VLabSubjectResponse])
def get_subjects(
    department_id: Optional[int] = Query(None),
    semester: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get subjects, optionally filtered by department and/or semester"""
    query = db.query(VLabSubject)
    if department_id:
        query = query.filter(VLabSubject.department_id == department_id)
    if semester:
        query = query.filter(VLabSubject.semester == semester)
    return query.order_by(VLabSubject.name).all()

@router.post("/subjects", response_model=VLabSubjectResponse)
def create_subject(data: VLabSubjectCreate, db: Session = Depends(get_db)):
    """Create a new subject"""
    # Check if department exists
    department = db.query(Department).filter(Department.id == data.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    subject = VLabSubject(
        name=data.name,
        code=data.code,
        semester=data.semester,
        department_id=data.department_id,
        default_compiler=data.default_compiler
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    db.refresh(subject)
    return subject

@router.put("/subjects/{subject_id}", response_model=VLabSubjectResponse)
def update_subject(subject_id: int, data: VLabSubjectUpdate, db: Session = Depends(get_db)):
    """Update a subject"""
    subject = db.query(VLabSubject).filter(VLabSubject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    if data.name is not None:
        subject.name = data.name
    if data.code is not None:
        subject.code = data.code
    if data.semester is not None:
        subject.semester = data.semester
    if data.default_compiler is not None:
        subject.default_compiler = data.default_compiler
    if data.lab_manual_url is not None:
        subject.lab_manual_url = data.lab_manual_url
    
    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    """Delete a subject and its experiments"""
    subject = db.query(VLabSubject).filter(VLabSubject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    db.delete(subject)
    db.commit()
    return {"success": True, "message": "Subject deleted"}


# ====== Lab Manual Upload ======

LAB_MANUALS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "lab_manuals")
os.makedirs(LAB_MANUALS_DIR, exist_ok=True)

@router.post("/subjects/{subject_id}/lab-manual")
async def upload_lab_manual(subject_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a lab manual PDF for a subject"""
    subject = db.query(VLabSubject).filter(VLabSubject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(LAB_MANUALS_DIR, filename)
    
    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Update subject with manual URL
    manual_url = f"/vlabs/lab-manuals/{filename}"
    subject.lab_manual_url = manual_url
    db.commit()
    db.refresh(subject)
    
    return {"success": True, "lab_manual_url": manual_url, "filename": file.filename}

@router.get("/lab-manuals/{filename}")
async def serve_lab_manual(filename: str):
    """Serve a lab manual PDF file"""
    filepath = os.path.join(LAB_MANUALS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Lab manual not found")
    return FileResponse(filepath, media_type="application/pdf")


# ====== Experiment Endpoints ======

@router.get("/experiments")
def get_experiments(
    subject_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    semester: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get experiments with filters"""
    query = db.query(VLabExperiment).join(VLabSubject)
    
    if subject_id:
        query = query.filter(VLabExperiment.subject_id == subject_id)
    if department_id:
        query = query.filter(VLabSubject.department_id == department_id)
    if semester:
        query = query.filter(VLabSubject.semester == semester)
    
    experiments = query.order_by(VLabExperiment.unit).all()
    
    # Generate simulation links dynamically based on topic + subject name
    result = []
    for exp in experiments:
        # Pass both subject name and topic for better language detection
        links = syllabus_service.get_simulation_links(
            exp.topic or exp.suggested_simulation or "",
            subject_name=exp.subject.name or ""
        )
        result.append({
            "id": exp.id,
            "subject_id": exp.subject_id,
            "subject_name": exp.subject.name,
            "subject_code": exp.subject.code,
            "unit": exp.unit,
            "topic": exp.topic,
            "description": exp.description,
            "suggested_simulation": exp.suggested_simulation,
            "simulation_links": links
        })
    
    return result

@router.post("/experiments", response_model=VLabExperimentResponse)
def create_experiment(data: VLabExperimentCreate, db: Session = Depends(get_db)):
    """Create a new experiment"""
    subject = db.query(VLabSubject).filter(VLabSubject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Process links
    links_json = json.dumps([link.dict() for link in data.simulation_links])
    
    experiment = VLabExperiment(
        subject_id=data.subject_id,
        unit=data.unit,
        topic=data.topic,
        description=data.description,
        suggested_simulation=data.suggested_simulation,
        simulation_links=links_json
    )
    db.add(experiment)
    db.commit()
    db.refresh(experiment)
    
    # Parse back the links for response
    experiment.simulation_links = json.loads(experiment.simulation_links) if experiment.simulation_links else []
    return experiment

@router.put("/experiments/{experiment_id}", response_model=VLabExperimentResponse)
def update_experiment(experiment_id: int, data: VLabExperimentUpdate, db: Session = Depends(get_db)):
    """Update an experiment"""
    experiment = db.query(VLabExperiment).filter(VLabExperiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    if data.topic is not None:
        experiment.topic = data.topic
    if data.unit is not None:
        experiment.unit = data.unit
    if data.description is not None:
        experiment.description = data.description
    if data.suggested_simulation is not None:
        experiment.suggested_simulation = data.suggested_simulation
    if data.simulation_links is not None:
        experiment.simulation_links = json.dumps([link.dict() for link in data.simulation_links])
    
    db.commit()
    db.refresh(experiment)
    
    # Parse back links
    experiment.simulation_links = json.loads(experiment.simulation_links) if experiment.simulation_links else []
    return experiment

@router.delete("/experiments/{experiment_id}")
def delete_experiment(experiment_id: int, db: Session = Depends(get_db)):
    """Delete an experiment"""
    experiment = db.query(VLabExperiment).filter(VLabExperiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    db.delete(experiment)
    db.commit()
    return {"success": True, "message": "Experiment deleted"}


# ====== Save Parsed Syllabus ======

@router.post("/save")
def save_to_vlabs(data: SaveToVLabsRequest, db: Session = Depends(get_db)):
    """Save parsed syllabus results to VLabs storage"""
    
    # Verify department and college
    department = db.query(Department).filter(Department.id == data.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    if department.college_id != data.college_id:
        raise HTTPException(status_code=400, detail="Department does not belong to the specified college")
    
    saved_subjects = []
    saved_experiments = 0
    
    for subj_data in data.subjects:
        # Create or find subject
        subject = db.query(VLabSubject).filter(
            VLabSubject.name == subj_data.get("subject"),
            VLabSubject.department_id == data.department_id,
            VLabSubject.semester == data.semester
        ).first()
        
        if not subject:
            subject = VLabSubject(
                name=subj_data.get("subject", "Unknown"),
                code=subj_data.get("subject_code", ""),
                semester=data.semester,
                department_id=data.department_id
            )
            db.add(subject)
            db.commit()
            db.refresh(subject)
        
        saved_subjects.append(subject.name)
        
        # Add experiments
        for exp_data in subj_data.get("experiments", []):
            # Get simulation links
            links = syllabus_service.get_simulation_links(
                exp_data.get("suggested_simulation", exp_data.get("topic", ""))
            )
            
            experiment = VLabExperiment(
                subject_id=subject.id,
                unit=exp_data.get("unit"),
                topic=exp_data.get("topic", ""),
                description=exp_data.get("description", ""),
                suggested_simulation=exp_data.get("suggested_simulation", ""),
                simulation_links=json.dumps(links)
            )
            db.add(experiment)
            saved_experiments += 1
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Saved {len(saved_subjects)} subject(s) with {saved_experiments} experiment(s)",
        "subjects": saved_subjects
    }
