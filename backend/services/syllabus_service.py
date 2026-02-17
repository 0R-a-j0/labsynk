import os
try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    genai = None
    types = None

from pypdf import PdfReader
import pdfplumber
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
    return genai.Client(api_key=api_key)

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extracts text from a PDF file byte stream."""
    try:
        reader = PdfReader(BytesIO(file_content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def parse_syllabus_with_pdfplumber(file_content: bytes) -> dict:
    """
    Parse syllabus using pdfplumber for accurate table extraction.
    Extracts subject name from page header (first line) and experiments from table rows.
    Returns structured data with subjects and experiments.
    """
    subjects = []
    
    try:
        with pdfplumber.open(BytesIO(file_content)) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                if not text:
                    continue
                
                # First line is the lab/subject name (largest heading)
                lines = [l.strip() for l in text.split('\n') if l.strip()]
                subject_name = lines[0] if lines else "Unknown Subject"
                
                # Clean up subject name
                subject_name = subject_name.strip()
                
                # Extract subject code from table
                subject_code = ""
                tables = page.extract_tables()
                for table in tables:
                    if not table:
                        continue
                    for row in table:
                        if row and row[0] and 'SUBJECT' in str(row[0]).upper() and 'CODE' in str(row[0]).upper():
                            # Extract code like "2018506" or "2018507A" from "SUBJECT\nCODE:\n2018506"
                            code_match = re.search(r'(\d{7}[A-Z]?)', str(row[0]))
                            if code_match:
                                subject_code = code_match.group(1)
                
                # Extract experiments from tables
                experiments = []
                exp_id = 1
                for table in tables:
                    if not table:
                        continue
                    for row in table:
                        if not row or not row[0]:
                            continue
                        # Match UNIT – XX or UNIT - XX pattern
                        unit_match = re.match(r'UNIT\s*[–\-]\s*(\d+)', str(row[0]), re.IGNORECASE)
                        if unit_match and len(row) > 1 and row[1]:
                            topic = str(row[1]).strip()
                            # Clean up topic text
                            topic = re.sub(r'\s+', ' ', topic)
                            if topic and len(topic) > 5:
                                experiments.append({
                                    "id": exp_id,
                                    "unit": int(unit_match.group(1)),
                                    "topic": topic,
                                    "description": f"Practical: {topic}",
                                    "suggested_simulation": topic
                                })
                                exp_id += 1
                
                if experiments:
                    subjects.append({
                        "subject": subject_name,
                        "subject_code": subject_code,
                        "experiments": experiments
                    })
                    print(f"✅ Page {page_num+1}: {subject_name} ({subject_code}) - {len(experiments)} experiments")
    
    except Exception as e:
        print(f"❌ pdfplumber parsing error: {e}")
        import traceback
        traceback.print_exc()
        return {"branch": "", "subjects": []}
    
    print(f"✅ Total: Parsed {len(subjects)} subject(s) from PDF")
    return {"branch": "", "subjects": subjects}


def parse_syllabus_with_regex(text: str) -> dict:
    """
    Parse syllabus using regex patterns - handles multiple subjects in one PDF!
    Returns structured data with all subjects, their metadata, and experiments.
    """
    # Try to split text into multiple subjects
    # Look for subject headers/boundaries
    subject_boundary_pattern = r'(?:^|\n)(?:SUBJECT|Subject|Course)[:\s]*(?:CODE|Code)[:\s]*([A-Z0-9]+)[^\n]*\n([^\n]+)'
    subject_matches = list(re.finditer(subject_boundary_pattern, text, re.MULTILINE))
    
    subjects = []
    
    if len(subject_matches) > 0:
        # Multiple subjects detected
        for i, match in enumerate(subject_matches):
            start_pos = match.start()
            end_pos = subject_matches[i + 1].start() if i + 1 < len(subject_matches) else len(text)
            subject_text = text[start_pos:end_pos]
            
            subject_code = match.group(1).strip()
            subject_name = match.group(2).strip()
            
            # Parse this subject's experiments
            subject_data = parse_single_subject(subject_text, subject_code, subject_name)
            if subject_data["experiments"]:
                subjects.append(subject_data)
    else:
        # Single subject - parse entire document
        subject_data = parse_single_subject(text, "", "")
        if subject_data["experiments"]:
            subjects.append(subject_data)
    
    # Extract global branch/department if present
    branch = ""
    branch_match = re.search(r'(?:Branch|Department|Program)[:\s]*([A-Z][A-Za-z\s&]+)', text[:1000], re.IGNORECASE)
    if branch_match:
        branch = branch_match.group(1).strip()
    
    print(f"✅ Parsed {len(subjects)} subject(s) from PDF")
    for subj in subjects:
        print(f"   - {subj['subject']} ({subj['subject_code']}): {len(subj['experiments'])} experiments")
    
    return {
        "branch": branch,
        "subjects": subjects
    }

def parse_single_subject(text: str, subject_code: str = "", subject_name: str = "") -> dict:
    """Parse experiments for a single subject."""
    
    # Extract subject metadata if not provided
    if not subject_name:
        subject_patterns = [
            r'(?:Subject|Course)[:\s]*([A-Z][A-Za-z\s&]+(?:Lab|Laboratory|Practical))',
            r'^([A-Z][A-Za-z\s&]+(?:Lab|Laboratory|Practical))',
        ]
        for pattern in subject_patterns:
            match = re.search(pattern, text[:500], re.MULTILINE | re.IGNORECASE)
            if match:
                subject_name = match.group(1).strip()
                break
    
    if not subject_code:
        code_match = re.search(r'(?:CODE|Subject Code)[:\s]*([A-Z0-9]+)', text[:500], re.IGNORECASE)
        if code_match:
            subject_code = code_match.group(1).strip()
    
    experiments = []
    experiment_id = 1
    
    # Pattern 1: UNIT_XX format with unit number extraction
    unit_pattern = r'(?:UNIT[_\s-]?(\d+)|Unit[_\s-]?(\d+)|Experiment[_\s-]?(\d+)|Lab[_\s-]?(\d+))[:\s]*([^\n\r\[]{10,200})'
    matches = re.finditer(unit_pattern, text, re.IGNORECASE)
    
    for match in matches:
        unit_num = match.group(1) or match.group(2) or match.group(3) or match.group(4)
        topic = match.group(5).strip()
        
        # Clean up the topic
        topic = re.sub(r'\s+', ' ', topic)
        topic = re.sub(r'[\[\]\(\)\{\}].*$', '', topic)
        topic = re.sub(r'\s*\[.*?\]\s*$', '', topic)  # Remove trailing brackets
        
        if len(topic) > 10 and not any(skip in topic.lower() for skip in ['marks', 'hrs', 'credits']):
            experiments.append({
                "id": experiment_id,
                "unit": int(unit_num) if unit_num else None,
                "topic": topic,
                "description": f"Practical exercise: {topic}",
                "suggested_simulation": topic
            })
            experiment_id += 1
    
    # Pattern 2: Numbered lists (if we didn't find many units)
    if len(experiments) < 3:
        numbered_pattern = r'^\s*(\d+)\.\s+([^\n\r]{15,200})'
        matches = re.finditer(numbered_pattern, text, re.MULTILINE)
        
        for match in matches:
            topic = match.group(2).strip()
            topic = re.sub(r'\s+', ' ', topic)
            
            if any(keyword in topic.lower() for keyword in ['write', 'program', 'exercise', 'implement', 'create', 'develop', 'design', 'build', 'test', 'analyze', 'measure', 'observe', 'calculate']):
                experiments.append({
                    "id": experiment_id,
                    "unit": None,
                    "topic": topic,
                    "description": f"Lab activity: {topic}",
                    "suggested_simulation": topic
                })
                experiment_id += 1
    
    return {
        "subject": subject_name or "Unknown Subject",
        "subject_code": subject_code or "",
        "experiments": experiments[:20]
    }

def generate_syllabus_structure(text: str, use_ai: bool = False):
    """
    Parse syllabus text into structured topics.
    Handles multiple subjects in one PDF.
    First tries regex-based parsing (fast, free, no quota limits).
    """
    # Try regex parsing first (no API calls, instant results)
    result = parse_syllabus_with_regex(text)
    subjects = result.get("subjects", [])
    branch = result.get("branch", "")
    
    if len(subjects) > 0:
        total_experiments = sum(len(s["experiments"]) for s in subjects)
        print(f"✅ Using regex-parsed results ({len(subjects)} subjects, {total_experiments} total experiments)")
        return {"branch": branch, "subjects": subjects}
    
    # Only use AI if explicitly requested and regex found nothing
    if not use_ai:
        print("ℹ️  Regex found no experiments. Set use_ai=True to try Gemini API.")
        return {"branch": branch, "subjects": []}
    
    print("⚠️  Regex found nothing, trying Gemini AI...")
    # AI fallback would go here
    return {"branch": branch, "subjects": []}
    
    prompt = f"""
    You are an intelligent education assistant analyzing a laboratory syllabus.
    
    TASK: Extract ALL laboratory experiments, practical topics, or hands-on activities from the text below.
    
    IMPORTANT INSTRUCTIONS:
    - Look for content in TABLES with columns like "UNIT", "CONTENTS", "Practical", etc.
    - Look for numbered items like "UNIT_01", "UNIT_02", "Experiment 1", "Lab 1", etc.
    - Look for experiment descriptions, programming exercises, practical sessions
    - Each row in a "CONTENTS" or "Practical" table is likely a separate experiment
    - Include the unit/experiment number if present
    - Be generous - if something looks like it could be a lab topic, include it
    - Create a brief description for each topic
    - Suggest a relevant virtual lab simulation name
    
    EXAMPLES of what to extract:
    - "Write programs using Java built-in functions using data types" → Extract as experiment
    - "Exercise on inheritance" → Extract as experiment
    - "UNIT_01: Write program using constructors" → Extract as experiment
    
    OUTPUT FORMAT: Return ONLY a valid JSON array (no markdown, no code blocks, no extra text) with this structure:
    [
      {{
        "id": 1,
        "topic": "Write programs using Java built-in functions",
        "description": "Learn to use Java's built-in functions with different data types",
        "suggested_simulation": "Java Programming Basics"
      }},
      {{
        "id": 2,
        "topic": "Exercise on inheritance",
        "description": "Practice object-oriented programming concepts with inheritance",
        "suggested_simulation": "Java OOP Concepts"
      }}
    ]
    
    SYLLABUS TEXT:
    {text[:15000]}
    
    CRITICAL: Return ONLY the JSON array starting with [ and ending with ]. No explanations, no markdown formatting, no code blocks.
    If you cannot find any experiments, return an empty array: []
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
        print(f"Gemini raw response (first 500 chars): {response.text[:500]}...")
        
        # Clean up code blocks if Gemini returns ```json ... ```
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        
        # Try to extract JSON if there's extra text
        import re
        json_match = re.search(r'\[.*\]', clean_text, re.DOTALL)
        if json_match:
            clean_text = json_match.group(0)
        
        data = json.loads(clean_text)
        print(f"✅ Successfully parsed {len(data)} topics from Gemini")
        return data
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {e}")
        print(f"Attempted to parse: {clean_text[:500]}...")
        return []
    except Exception as e:
        print(f"❌ Error calling Gemini: {e}")
        print(f"Response text: {response.text if 'response' in locals() else 'No response'}")
        return []

def get_simulation_links(simulation_name: str, subject_name: str = "") -> list:
    """
    Generates relevant simulation/practice links based on the topic.
    Detects the programming language from the subject name first, then topic.
    Uses only Programiz for online compilers + YouTube for tutorials.
    """
    # Combine subject name + topic for language detection (subject takes priority)
    combined_text = f"{subject_name} {simulation_name}".lower()
    links = []

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
        search_query = simulation_name.replace(' ', '+')

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
    yt_query = simulation_name.replace(' ', '+')
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

    model = get_gemini_client()
    
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
