import os
import uuid
import tempfile
import subprocess
import json
import static_ffmpeg

# Set up static-ffmpeg to add ffmpeg/ffprobe to our environment PATH.
_ffmpeg_initialized = False
_ffmpeg_path = "ffmpeg"
_ffprobe_path = "ffprobe"

def _init_ffmpeg():
    global _ffmpeg_initialized, _ffmpeg_path, _ffprobe_path
    if _ffmpeg_initialized:
        return
    try:
        paths = static_ffmpeg.add_paths()
        # static_ffmpeg.add_paths() returns a dict with 'ffmpeg' and 'ffprobe' paths
        if isinstance(paths, dict):
            _ffmpeg_path = paths.get("ffmpeg", "ffmpeg")
            _ffprobe_path = paths.get("ffprobe", "ffprobe")
        _ffmpeg_initialized = True
        print(f"static-ffmpeg initialized: ffmpeg={_ffmpeg_path}")
    except Exception as e:
        print(f"Warning: static-ffmpeg init error: {e}. Falling back to system ffmpeg.")
        _ffmpeg_initialized = True

def format_duration(seconds: float) -> str:
    """
    Format seconds into MM:SS or HH:MM:SS
    """
    total = int(seconds)
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def get_audio_duration_str(file_path: str) -> str:
    """
    Returns formatted duration (e.g. '45:12') from an audio file using ffprobe.
    """
    _init_ffmpeg()
    try:
        result = subprocess.run(
            [
                _ffprobe_path, "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                file_path
            ],
            capture_output=True, text=True, timeout=30
        )
        data = json.loads(result.stdout)
        duration_sec = float(data["format"]["duration"])
        return format_duration(duration_sec)
    except Exception as e:
        print(f"Error getting audio duration: {e}")
        return "Unknown"

def get_audio_duration_ms(file_path: str) -> int:
    """
    Returns duration in milliseconds using ffprobe.
    """
    _init_ffmpeg()
    try:
        result = subprocess.run(
            [
                _ffprobe_path, "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                file_path
            ],
            capture_output=True, text=True, timeout=30
        )
        data = json.loads(result.stdout)
        duration_sec = float(data["format"]["duration"])
        return int(duration_sec * 1000)
    except Exception as e:
        print(f"Error getting audio duration ms: {e}")
        return 0

def split_audio_into_chunks(file_path: str, chunk_minutes: int = 10) -> list[str]:
    """
    Splits the audio file at file_path into chunks of chunk_minutes.
    Uses ffmpeg directly — no pydub required.
    Returns list of paths to the temporary chunk files.
    """
    _init_ffmpeg()

    duration_ms = get_audio_duration_ms(file_path)
    if duration_ms == 0:
        # Fallback: treat whole file as one chunk
        return [file_path]

    chunk_length_ms = chunk_minutes * 60 * 1000
    chunk_paths = []
    temp_dir = tempfile.gettempdir()

    start_ms = 0
    chunk_index = 0

    while start_ms < duration_ms:
        start_sec = start_ms / 1000.0
        duration_sec = chunk_length_ms / 1000.0

        chunk_name = f"chunk_{chunk_index}_{uuid.uuid4().hex}.m4a"
        chunk_file_path = os.path.join(temp_dir, chunk_name)

        # Use ffmpeg to extract the segment: -ss (start) -t (duration) -c copy (no re-encode)
        subprocess.run(
            [
                _ffmpeg_path,
                "-y",                  # overwrite output if exists
                "-i", file_path,
                "-ss", str(start_sec),
                "-t", str(duration_sec),
                "-c", "copy",          # copy codec — very fast, no re-encoding
                chunk_file_path
            ],
            capture_output=True, timeout=120
        )

        if os.path.exists(chunk_file_path) and os.path.getsize(chunk_file_path) > 0:
            chunk_paths.append(chunk_file_path)

        start_ms += chunk_length_ms
        chunk_index += 1

    # If nothing was split (very short file), return original
    if not chunk_paths:
        return [file_path]

    return chunk_paths
