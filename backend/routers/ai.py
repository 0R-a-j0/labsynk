from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services import ai_service
import shutil

router = APIRouter(
    prefix="/ai",
    tags=["ai"],
)

class ChatRequest(BaseModel):
    query: str
    context: Optional[str] = ""

class ChatResponse(BaseModel):
    response: str

@router.post("/parse-syllabus")
async def parse_syllabus(file: UploadFile = File(...)):
    # In a real app, we'd use a PDF library like pypdf to extracting text
    # For this prototype, we'll assume the user uploads a text file or we attempt basic extraction
    # Or for simplicity, we mock reading the PDF content if it's too complex without extra libs
    
    content = ""
    try:
        # Simple text extraction attempt
        content_bytes = await file.read()
        try:
             content = content_bytes.decode('utf-8')
        except:
             # If binary PDF, we can't easily read without pypdf. 
             # Let's mock the content for the prototype or assume text file.
             content = "Mock Syllabus Content: Experiment 1 - Introduction to Arduino. Experiment 2 - LED Blinking."
        
        experiments = await ai_service.parse_syllabus_pdf(content)
        return experiments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    response = await ai_service.chat_with_student(request.query, request.context)
    return ChatResponse(response=response)
