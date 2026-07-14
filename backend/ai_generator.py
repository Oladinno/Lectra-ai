import json
import httpx
from config import settings

async def generate_lecture_insights(transcript_text: str) -> dict:
    """
    Sends the full text of the transcript to Gemini API and receives structured 
    JSON output containing:
      - summary: List[str]
      - notes: List[dict(title: str, bullets: List[str])]
      - flashcards: List[dict(q: str, a: str)]
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("Gemini API key is not set in environment variables")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={settings.GEMINI_API_KEY}"
    
    prompt = f"""
    You are an expert academic study assistant. Analyze the following lecture transcript.
    Provide the following structured study materials:
    1. **Summary**: A high-level list of key takeaways (5 to 8 bullet points).
    2. **Notes**: A list of structured sections, each with a 'title' (representing the concept) and 'bullets' (detailing definitions, examples, and key details).
    3. **Flashcards**: A set of 5 to 10 question-and-answer pairs. The questions should be clear ("q") and answers should be descriptive ("a").
    
    Transcript:
    \"\"\"
    {transcript_text}
    \"\"\"
    """
    
    # Define response schema matching the frontend's structures
    schema = {
        "type": "OBJECT",
        "properties": {
            "summary": {
                "type": "ARRAY",
                "items": {"type": "STRING"}
            },
            "notes": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "title": {"type": "STRING"},
                        "bullets": {
                            "type": "ARRAY",
                            "items": {"type": "STRING"}
                        }
                    },
                    "required": ["title", "bullets"]
                }
            },
            "flashcards": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "q": {"type": "STRING"},
                        "a": {"type": "STRING"}
                    },
                    "required": ["q", "a"]
                }
            }
        },
        "required": ["summary", "notes", "flashcards"]
    }
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, timeout=300.0)
        
        if response.status_code != 200:
            raise Exception(f"Gemini API returned {response.status_code}: {response.text}")
            
        result_json = response.json()
        
        try:
            # Extract text candidate and parse
            content_text = result_json["candidates"][0]["content"]["parts"][0]["text"]
            insights = json.loads(content_text)
            return insights
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            raise Exception(f"Error parsing Gemini structured JSON output: {e}. Raw response: {result_json}")
