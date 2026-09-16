import os
from dotenv import load_dotenv

# Load from .env file
load_dotenv()

class Settings:
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET", "lectures")
    # Comma-separated list of Google OAuth client IDs (web, iOS, Android)
    # Tokens from any of these audiences are accepted.
    GOOGLE_CLIENT_IDS: str = os.getenv("GOOGLE_CLIENT_IDS", "") or os.getenv("GOOGLE_CLIENT_ID", "")

    def google_client_id_list(self) -> list[str]:
        return [c.strip() for c in self.GOOGLE_CLIENT_IDS.split(",") if c.strip()]

settings = Settings()
