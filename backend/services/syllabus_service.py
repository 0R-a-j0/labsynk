from utils.uploads import MAX_PDF_PAGES
from urllib.parse import quote_plus
import os
from services.vlabs_matcher import find_vlabs_link
try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    genai = None
    types = None

from pypdf import PdfReader
from io import BytesIO
import json
import re

# Configure Gemini
# ensure GEMINI_API_KEY is loaded in environment before calling this
# Configure Gemini
# ensure GEMINI_API_KEY is loaded in environment before calling this
def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not HAS_GENAI or not api_key:
        return None
    return genai.Client(api_key=api_key, http_options={"timeout": 30000})

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extracts text from a PDF file byte stream."""
    try:
        reader = PdfReader(BytesIO(file_content))
        text = ""
        if len(reader.pages) > MAX_PDF_PAGES:
            raise ValueError("PDF exceeds page limit")
        for page in reader.pages:
            text += (page.extract_text() or "") + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def parse_syllabus_with_pdfplumber(file_content: bytes) -> dict:
    """Compatibility entry point; new upload routes expose actionable ScanErrors."""
    from services.syllabus_scanner import ScanError, scan_pdf
    try:
        return scan_pdf(file_content)
    except ScanError:
        return {"branch": "", "subjects": []}


def get_simulation_links(simulation_name: str, subject_name: str = "") -> list:
    """
    Generates relevant simulation/practice links based on the topic.
    Detects the programming language from the subject name first, then topic.
    Includes IIT VLabs links when a match is found in the VLabs database.
    Uses only Programiz for online compilers + YouTube for tutorials.
    """
    # Combine subject name + topic for language detection (subject takes priority)
    combined_text = f"{subject_name} {simulation_name}".lower()
    links = []

    # ===== IIT VLabs match (prepend if found) =====
    vlabs_link = find_vlabs_link(simulation_name, subject_name)
    if vlabs_link:
        links.append(vlabs_link)

    # ===== Programiz language URL map =====
    # Key: keyword to detect | Value: Programiz URL slug
    lang_map = {
        'c++':         {'slug': 'cpp-programming', 'label': 'C++'},
        'cpp':         {'slug': 'cpp-programming', 'label': 'C++'},
        'c#':          {'slug': 'csharp', 'label': 'C#'},
        'c sharp':     {'slug': 'csharp', 'label': 'C#'},
        '.net':        {'slug': 'csharp', 'label': 'C#'},
        'java':        {'slug': 'java-programming', 'label': 'Java'},
        'python':      {'slug': 'python-programming', 'label': 'Python'},
        'javascript':  {'slug': 'javascript', 'label': 'JavaScript'},
        'typescript':  {'slug': 'typescript', 'label': 'TypeScript'},
        'html':        {'slug': 'html-css', 'label': 'HTML/CSS'},
        'css':         {'slug': 'html-css', 'label': 'HTML/CSS'},
        'php':         {'slug': 'php', 'label': 'PHP'},
        'sql':         {'slug': 'sql', 'label': 'SQL'},
        'r programming': {'slug': 'r-programming', 'label': 'R'},
        'ruby':        {'slug': 'ruby', 'label': 'Ruby'},
        'kotlin':      {'slug': 'kotlin', 'label': 'Kotlin'},
        'swift':       {'slug': 'swift', 'label': 'Swift'},
        'golang':      {'slug': 'golang', 'label': 'Go'},
        'go lang':     {'slug': 'golang', 'label': 'Go'},
        'rust':        {'slug': 'rust', 'label': 'Rust'},
        'dart':        {'slug': 'dart', 'label': 'Dart'},
        'scala':       {'slug': 'scala', 'label': 'Scala'},
    }

    # Also detect plain 'c ' as C language (avoid matching 'c++', 'c#' etc.)
    is_c_lang = any(p in combined_text for p in [
        'c program', 'c language', 'programming in c ',
        'basic c ', ' in c.', ' in c,', ' using c',
        'through c ', 'with c ', 'c coding',
    ])

    # Try to detect language from combined text
    detected = None
    for lang_key, lang_info in lang_map.items():
        if lang_key in combined_text:
            detected = lang_info
            break

    # Fallback to C if no specific match but C indicators found
    if not detected and is_c_lang:
        detected = {'slug': 'c-programming', 'label': 'C'}

    # ===== Generate links =====
    if detected:
        # Programming topic → Programiz online compiler
        links.append({
            "source": f"Programiz ({detected['label']})",
            "url": f"https://www.programiz.com/{detected['slug']}/online-compiler/",
            "description": f"Online {detected['label']} compiler — ready to code"
        })
    else:
        # Non-programming: science / engineering topics
        search_query = quote_plus(simulation_name)

        links.append({
            "source": "PhET Simulations",
            "url": f"https://phet.colorado.edu/en/simulations/filter?sort=relevance&q={search_query}",
            "description": "Interactive STEM simulations by University of Colorado"
        })

        links.append({
            "source": "Virtual Labs India",
            "url": f"https://www.vlab.co.in/broad-area-computer-science-and-engineering",
            "description": "IIT virtual lab experiments"
        })

        links.append({
            "source": "OLabs",
            "url": f"https://www.olabs.edu.in/?pg=search&q={search_query}",
            "description": "Virtual science labs for schools and colleges"
        })

    # Always add YouTube search
    yt_query = quote_plus(simulation_name)
    links.append({
        "source": "Search on YouTube",
        "url": f"https://www.youtube.com/results?search_query={yt_query}+tutorial",
        "description": f"Watch tutorials on YouTube for: {simulation_name}"
    })

    return links

def enrich_topics(topics: list, subject: str = ""):
    """
    Takes a list of raw topic strings and uses Gemini to find descriptions 
    and suggested simulations.
    """
    if not topics:
        return []

    # Create a prompt for the list
    topics_str = "\n".join([f"- {t}" for t in topics])
    
    prompt = f"""
    You are an intelligent education assistant. 
    I have a list of laboratory experiments/topics for the subject: "{subject}".
    
    For each topic, provide a brief 1-sentence description and a suggested "Virtual Lab" simulation title.
    
    Return the response ONLY as a valid JSON list of objects with the following keys:
    - "id": integer index (1-based)
    - "topic": The exact topic name provided
    - "description": A brief summary
    - "suggested_simulation": A likely name for a virtual lab simulation
    
    Topics:
    {topics_str}
    """
    
    try:
        client = get_gemini_client()
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type='application/json'
            )
        )
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        # Fallback: just return original topics with empty description
        data = [{"id": i+1, "topic": t, "description": "", "suggested_simulation": t} for i, t in enumerate(topics)]

    # Add links
    results = []
    for item in data:
        links = get_simulation_links(item.get("suggested_simulation", item["topic"]))
        results.append({
            "id": item.get("id"),
            "topic": item.get("topic"),
            "description": item.get("description"),
            "suggested_simulation": item.get("suggested_simulation"),
            "simulation_links": links
        })
        
    return results
