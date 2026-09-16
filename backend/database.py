import ssl
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from config import settings

# Create engine for Neon database using pure-python pg8000 driver
db_url = settings.DATABASE_URL

# Normalize to postgresql+pg8000:// scheme
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+pg8000://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+pg8000://", 1)

# pg8000 does NOT accept ?sslmode= in the URL — strip it and use ssl_context instead
if "?" in db_url:
    db_url = db_url.split("?")[0]

# Build an SSL context that requires certificate verification (Neon uses valid certs)
ssl_context = ssl.create_default_context()

engine = create_engine(
    db_url,
    connect_args={"ssl_context": ssl_context},
    # pool_pre_ping tests each connection before use — automatically reconnects stale ones.
    # This is essential for Neon (serverless Postgres) which closes idle connections quickly.
    pool_pre_ping=True,
    # Recycle connections after 5 minutes to prevent them going stale in the pool.
    pool_recycle=300,
    # Keep pool small for a serverless DB (Neon has limited concurrent connections).
    pool_size=5,
    max_overflow=2,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def ensure_auth_schema():
    """
    Apply lightweight schema updates for Google auth on existing Neon DBs.
    create_all() will not alter columns on tables that already exist.
    """
    statements = [
        "ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR DEFAULT 'email'",
    ]
    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception:
                # Column already in desired state or table not created yet
                pass
        # Unique index for google_id (ignore if already present)
        try:
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id "
                    "ON users (google_id) WHERE google_id IS NOT NULL"
                )
            )
        except Exception:
            pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
