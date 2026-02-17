import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("NO_KEY")
    exit(1)

try:
    client = genai.Client(api_key=api_key)
    # Use a very short prompt to be fast
    response = client.models.generate_content(
        model='gemini-2.0-flash', contents='Hi'
    )
    print("SUCCESS")
except Exception as e:
    print(f"FAIL: {e}")
