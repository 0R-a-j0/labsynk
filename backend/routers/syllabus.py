from utils.uploads import read_pdf
from services.syllabus_scanner import ScanError, scan_pdf
from starlette.concurrency import run_in_threadpool
from utils.auth import require_role
from fastapi import Depends, APIRouter, UploadFile, File, HTTPException, status
from typing import List, Annotated
from services import syllabus_service
from pydantic import BaseModel, Field

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
    source_page: int | None = None

class SyllabusResponse(BaseModel):
    branch: str = ""
    experiments: List[SyllabusExperiment]
    page_count: int = 0
    ocr_pages: List[int] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

# Keep old model for manual endpoint compatibility
class SyllabusTopic(BaseModel):
    id: int
    topic: str
    description: str
    suggested_simulation: str
    simulation_links: List[SimulationLink]

@router.post("/upload", response_model=SyllabusResponse, dependencies=[Depends(require_role("assistant"))])
async def upload_syllabus(file: UploadFile = File(...)):
    content = await read_pdf(file)

    try:
        result = await run_in_threadpool(scan_pdf, content)
    except ScanError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from None
    subjects_data = result["subjects"]

    # 3. Process all subjects and add simulation links
    all_experiments = []
    experiment_counter = 1
    
    for subject in subjects_data:
        for exp in subject["experiments"]:
            links = syllabus_service.get_simulation_links(
                exp.get("suggested_simulation", exp["topic"]),
                subject_name=subject["subject"]
            )
            all_experiments.append({
                "id": experiment_counter,
                "subject": subject["subject"],
                "subject_code": subject["subject_code"],
                "unit": exp.get("unit"),
                "topic": exp.get("topic"),
                "description": exp.get("description"),
                "suggested_simulation": exp.get("suggested_simulation"),
                "simulation_links": links,
                "source_page": exp.get("source_page")
            })
            experiment_counter += 1
    
    return {
        "branch": result["branch"],
        "page_count": result["page_count"],
        "ocr_pages": result["ocr_pages"],
        "warnings": result["warnings"],
        "experiments": all_experiments
    }

class ManualSyllabusRequest(BaseModel):
    topics: List[Annotated[str, Field(min_length=1, max_length=500)]] = Field(min_length=1, max_length=100)
    subject: str = Field(default="", max_length=200)


@router.post("/manual", response_model=List[SyllabusTopic], dependencies=[Depends(require_role("assistant"))])
async def manual_syllabus(data: ManualSyllabusRequest):
    # Expected data: {"topics": ["Exp 1", "Exp 2"], "subject": "..."}
    topics = data.topics
    if not topics:
        raise HTTPException(status_code=400, detail="No topics provided")

    # Reuse service to generate structure/links relative to these topics
    # We can skip the Gemini parsing since we have the list, 
    # OR we can ask Gemini to find descriptions/simulations for these list items.
    # Let's use Gemini to "enrich" the list.
    
    enriched_data = await run_in_threadpool(syllabus_service.enrich_topics, topics, data.subject)
    
    return enriched_data
