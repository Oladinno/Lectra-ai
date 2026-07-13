from config import settings
import database
import models
import static_ffmpeg
import audio_processor

print("Checking environment configuration...")
print(f"DATABASE_URL available: {bool(settings.DATABASE_URL)}")
print(f"GROQ_API_KEY available: {bool(settings.GROQ_API_KEY)}")
print(f"GEMINI_API_KEY available: {bool(settings.GEMINI_API_KEY)}")
print(f"SUPABASE_URL available: {bool(settings.SUPABASE_URL)}")
print(f"SUPABASE_KEY available: {bool(settings.SUPABASE_KEY)}")

print("\nInitializing static-ffmpeg...")
try:
    static_ffmpeg.add_paths()
    print("static-ffmpeg initialized successfully! ffmpeg/ffprobe added to path.")
except Exception as e:
    print(f"Failed to initialize static-ffmpeg: {e}")

print("\nTesting database connection...")
try:
    db = database.SessionLocal()
    from sqlalchemy import text
    db.execute(text("SELECT 1"))
    print("Database connection verified successfully!")
    db.close()
except Exception as e:
    print(f"Database connection failed: {e}")
