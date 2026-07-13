import os
import uuid
from supabase import create_client, Client
from config import settings

class SupabaseStorageService:
    def __init__(self):
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("Supabase URL and Key must be set in env")
        self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        
    def upload_file(self, file_bytes: bytes, original_file_name: str) -> str:
        """
        Uploads file bytes to Supabase storage and returns the public URL.
        """
        ext = os.path.splitext(original_file_name)[1] or ".m4a"
        unique_name = f"{uuid.uuid4()}{ext}"
        
        # Try to create bucket if it doesn't exist
        try:
            self.client.storage.create_bucket(settings.SUPABASE_BUCKET, options={"public": True})
        except Exception:
            # Bucket likely already exists, which is expected
            pass
            
        content_type = "audio/x-m4a" if ext == ".m4a" else "audio/mpeg"
        
        # Upload
        self.client.storage.from_(settings.SUPABASE_BUCKET).upload(
            path=unique_name,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        
        # Retrieve public URL
        public_url = self.client.storage.from_(settings.SUPABASE_BUCKET).get_public_url(unique_name)
        return public_url

storage_service = SupabaseStorageService()
