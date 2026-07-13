import ssl
from sqlalchemy import create_engine
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
    connect_args={"ssl_context": ssl_context}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
