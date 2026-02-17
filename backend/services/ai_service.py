try:
    from google import genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    genai = None

from core.config import settings
import json

# Configure Gemini
# Client initialization happens in get_gemini_client

def get_gemini_client():
    if not HAS_GENAI or not settings.GEMINI_API_KEY:
        return None
    return genai.Client(api_key=settings.GEMINI_API_KEY)

async def parse_syllabus_pdf(pdf_text: str):
    """
    Parses syllabus text to extract experiments.
    """
    client = get_gemini_client()
    if not client:
        # Mock response if no key
        return [
            {"subject": "Mock Subject", "experiment": "Experiment 1: Mock Experiment", "simulation_link": "http://vlabs.iitb.ac.in/mock"}
        ]

    prompt = f"""
    You are an academic assistant. Extract the list of laboratory experiments from the following syllabus text.
    For each experiment, identify the subject name and the experiment title.
    
    Also, try to PREDICT a likely vLabs IIT Bombay simulation link for this experiment based on its title. 
    If you are not sure, provide a general link to vlabs.iitb.ac.in.

    Return the output as a valid JSON list of objects with keys: "subject", "experiment", "simulation_link".
    Do not use markdown code blocks. Just return the raw JSON string.

    Syllabus Text:
    {pdf_text[:10000]} 
    """ # Truncate to avoid token limits if necessary

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        # Cleanup response if it contains markdown
        text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(text)
    except Exception as e:
        print(f"AI Error: {e}")
        return []

async def chat_with_student(query: str, context: str = ""):
    """
    Chat with student helper.
    """
    client = get_gemini_client()
    if not client:
        return "I am running in offline mode. Please configure the Gemini API Key."

    prompt = f"""
    You are a helpful engineering lab assistant. Answer the student's question.
    Context (Inventory/Schedule info): {context}
    
    Student Question: {query}
    """
    
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=prompt
    )
    return response.text
