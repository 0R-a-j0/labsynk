from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import List
from services import syllabus_service
from pydantic import BaseModel

router = APIRouter(
    prefix="/syllabus",
    tags=["syllabus"],
)

class SimulationLink(BaseModel):
    source: str
    url: str
    description: str

class SyllabusExperiment(BaseModel):
    id: int
    subject: str
    subject_code: str = ""
    unit: int | None = None
    topic: str
    description: str
    suggested_simulation: str
    simulation_links: List[SimulationLink]

class SyllabusResponse(BaseModel):
    branch: str = ""
    experiments: List[SyllabusExperiment]

# Keep old model for manual endpoint compatibility
class SyllabusTopic(BaseModel):
    id: int
    topic: str
    description: str
    suggested_simulation: str
    simulation_links: List[SimulationLink]

@router.post("/upload", response_model=SyllabusResponse)
async def upload_syllabus(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        content = await file.read()
        print(f"PDF file received: {file.filename}, size: {len(content)} bytes")
    except Exception as e:
        print(f"Error reading file: {e}")
        raise HTTPException(status_code=400, detail=f"Could not read file: {str(e)}")
    
    # Parse with pdfplumber (more accurate table extraction)
    try:
        print("Parsing with pdfplumber for accurate extraction...")
        result = syllabus_service.parse_syllabus_with_pdfplumber(content)
        
        branch = result.get("branch", "")
        subjects_data = result.get("subjects", [])
        
        print(f"Parser returned {len(subjects_data)} subject(s)")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Parser error: {e}")
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")
    
    if not subjects_data:
        raise HTTPException(status_code=500, detail="No experiments found in PDF. The PDF might not contain recognizable lab content.")

    # 3. Process all subjects and add simulation links
    all_experiments = []
    experiment_counter = 1
    
    for subject in subjects_data:
        for exp in subject["experiments"]:
            links = syllabus_service.get_simulation_links(exp.get("suggested_simulation", exp["topic"]))
            all_experiments.append({
                "id": experiment_counter,
                "subject": subject["subject"],
                "subject_code": subject["subject_code"],
                "unit": exp.get("unit"),
                "topic": exp.get("topic"),
                "description": exp.get("description"),
                "suggested_simulation": exp.get("suggested_simulation"),
                "simulation_links": links
            })
            experiment_counter += 1
    
    return {
        "branch": branch,
        "experiments": all_experiments
    }

@router.post("/manual", response_model=List[SyllabusTopic])
async def manual_syllabus(data: dict):
    # Expected data: {"topics": ["Exp 1", "Exp 2"], "subject": "..."}
    topics = data.get("topics", [])
    if not topics:
        raise HTTPException(status_code=400, detail="No topics provided")

    # Reuse service to generate structure/links relative to these topics
    # We can skip the Gemini parsing since we have the list, 
    # OR we can ask Gemini to find descriptions/simulations for these list items.
    # Let's use Gemini to "enrich" the list.
    
    enriched_data = syllabus_service.enrich_topics(topics, data.get("subject", ""))
    
    return enriched_data
