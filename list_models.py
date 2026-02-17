import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load env from backend/.env
load_dotenv('backend/.env')

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("NO_KEY")
    exit(1)

genai.configure(api_key=api_key)

print("Listing models...")
try:
    with open("models.txt", "w") as f:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                f.write(m.name + "\n")
    print("Models written to models.txt")
except Exception as e:
    print(f"Error listing models: {e}")
