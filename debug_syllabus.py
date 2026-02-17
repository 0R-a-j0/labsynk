import os
import sys
from pypdf import PdfReader
import google.generativeai as genai
from dotenv import load_dotenv

# Load env from backend/.env
load_dotenv('backend/.env')

FILE_PATH = "5th Sem Syllabus1.pdf"

def test_pdf_extraction(path):
    print(f"--- Testing PDF Extraction for '{path}' ---")
    if not os.path.exists(path):
        print(f"❌ File not found: {path}")
        return None
    
    try:
        reader = PdfReader(path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        if not text.strip():
            print("❌ PDF extracted text is empty! The PDF might be scanned/image-based.")
            return None
        
        print(f"✅ PDF Extraction Successful. Character count: {len(text)}")
        return text
    except Exception as e:
        print(f"❌ PDF Extraction Failed: {e}")
        return None

def test_gemini(text):
    print("\n--- Testing Gemini API ---")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY missing in .env")
        return

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        print(f"Testing with text length: {len(text)}. Sending first 500 chars...")
        
        prompt = f"Summarize this syllabus in one sentence: {text[:500]}"
        response = model.generate_content(prompt)
        print(f"✅ Gemini Response: {response.text}")
    except Exception as e:
        print(f"❌ Gemini API Failed: {e}")

if __name__ == "__main__":
    text = test_pdf_extraction(FILE_PATH)
    if text:
        test_gemini(text)
