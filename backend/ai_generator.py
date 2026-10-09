import asyncio
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
      - quiz: List[dict(question: str, options: List[str], correct_answer_index: int)]
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("Gemini API key is not set in environment variables")

    prompt = f"""
    You are an expert academic study assistant. Analyze the following lecture transcript.
    Provide the following structured study materials:
    1. **Summary**: A high-level list of key takeaways (5 to 8 bullet points).
    2. **Notes**: A list of structured sections, each with a 'title' (representing the concept) and 'bullets' (detailing definitions, examples, and key details).
    3. **Flashcards**: A comprehensive set of 10 to 20 question-and-answer pairs. The questions should be clear ("q") and answers should be descriptive ("a").
    4. **Quiz**: A set of 10 to 20 multiple-choice questions based on the transcript content. Each question should have a "question" text, a list of exactly 4 "options" as possible answers, and a 0-indexed "correct_answer_index" representing the correct option.
    
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
            },
            "quiz": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "question": {"type": "STRING"},
                        "options": {
                            "type": "ARRAY",
                            "items": {"type": "STRING"}
                        },
                        "correct_answer_index": {"type": "INTEGER"}
                    },
                    "required": ["question", "options", "correct_answer_index"]
                }
            }
        },
        "required": ["summary", "notes", "flashcards", "quiz"]
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
    
    base_url = "https://generativelanguage.googleapis.com/v1beta/models"
    transient_statuses = {429, 500, 502, 503}

    response = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/gemini-3.6-flash:generateContent",
                    params={"key": settings.GEMINI_API_KEY},
                    json=payload,
                    timeout=300.0,
                )
        except httpx.TransportError as e:
            if attempt == 2:
                raise Exception(f"Gemini API request failed after 3 attempts: {e}")
            await asyncio.sleep(2 ** attempt * 2)
            continue

        if response.status_code == 200:
            break
        if response.status_code not in transient_statuses or attempt == 2:
            break
        await asyncio.sleep(2 ** attempt * 2)

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
