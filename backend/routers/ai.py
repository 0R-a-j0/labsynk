from utils.auth import require_role
from fastapi import Depends, APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from services import ai_service
from routers.syllabus import upload_syllabus

router = APIRouter(
    prefix="/ai",
    tags=["ai"],
)

class ChatRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    context: str = Field(default="", max_length=12000)

class ChatResponse(BaseModel):
    response: str

@router.post("/parse-syllabus", dependencies=[Depends(require_role("assistant"))])
async def parse_syllabus(file: UploadFile = File(...)):
    # Keep the legacy response shape while sharing the same validated scanner.
    result = await upload_syllabus(file)
    return [{"subject": item["subject"], "experiment": item["topic"],
             "simulation_link": item["simulation_links"][0]["url"] if item["simulation_links"] else ""}
            for item in result["experiments"]]

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        response = await ai_service.chat_with_student(request.query, request.context)
    except Exception:
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable") from None
    return ChatResponse(response=response)
