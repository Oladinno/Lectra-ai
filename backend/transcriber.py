import os
import asyncio
import httpx
from config import settings

def format_seconds(seconds: float) -> str:
    """
    Format seconds into MM:SS or HH:MM:SS
    """
    total_seconds = int(seconds)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

async def transcribe_chunk(client: httpx.AsyncClient, chunk_path: str, chunk_idx: int) -> dict:
    """
    Sends a single audio chunk to the Groq Whisper API for transcription.
    """
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
    
    filename = os.path.basename(chunk_path)
    with open(chunk_path, "rb") as f:
        file_content = f.read()
        
    files = {"file": (filename, file_content, "audio/x-m4a")}
    data = {
        "model": "whisper-large-v3",
        "response_format": "verbose_json"
    }
    
    response = await client.post(url, headers=headers, files=files, data=data, timeout=180.0)
    if response.status_code != 200:
        raise Exception(f"Groq Whisper API returned {response.status_code}: {response.text}")
        
    return {
        "chunk_idx": chunk_idx,
        "data": response.json()
    }

async def transcribe_all_chunks(chunk_paths: list[str]) -> list[dict]:
    """
    Sends all chunks to Groq Whisper in parallel and returns them sorted by chunk order.
    """
    async with httpx.AsyncClient() as client:
        tasks = [
            transcribe_chunk(client, path, idx)
            for idx, path in enumerate(chunk_paths)
        ]
        results = await asyncio.gather(*tasks)
        # Sort results chronologically
        results.sort(key=lambda x: x["chunk_idx"])
        return [r["data"] for r in results]

def merge_transcripts(transcriptions: list[dict], chunk_minutes: int = 10) -> list[dict]:
    """
    Merges transcription segments across chunks and groups them into paragraph objects.
    Each paragraph is around 1.5 - 2 minutes long or grouped by sentence endings.
    
    Output format: [{"time": "02:15", "text": "..."}]
    """
    all_segments = []
    chunk_seconds = chunk_minutes * 60
    
    for idx, data in enumerate(transcriptions):
        offset = idx * chunk_seconds
        segments = data.get("segments", [])
        for seg in segments:
            all_segments.append({
                "start": seg.get("start", 0) + offset,
                "end": seg.get("end", 0) + offset,
                "text": seg.get("text", "").strip()
            })
            
    # Sort all segments chronologically just in case
    all_segments.sort(key=lambda x: x["start"])
    
    paragraphs = []
    curr_start_time = 0.0
    curr_text = []
    
    # Target 90 seconds (1.5 minutes) per paragraph block
    target_paragraph_duration = 90.0 
    
    for seg in all_segments:
        curr_text.append(seg["text"])
        
        # If we have reached the target duration, wrap up the paragraph
        if (seg["end"] - curr_start_time) >= target_paragraph_duration:
            paragraph_text = " ".join(curr_text)
            # Ensure it ends nicely
            paragraphs.append({
                "time": format_seconds(curr_start_time),
                "text": paragraph_text
            })
            curr_start_time = seg["end"]
            curr_text = []
            
    # Add any remaining text
    if curr_text:
        paragraphs.append({
            "time": format_seconds(curr_start_time),
            "text": " ".join(curr_text)
        })
        
    return paragraphs
