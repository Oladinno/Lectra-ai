# Lectra AI (LecVoice AI) 🎙️📚

> An intelligent, multimodal lecture recording and AI study companion built with **Expo SDK 54 (React Native)** and **FastAPI**.

Transform recorded or uploaded lectures into time-synchronized transcripts, structured Cornell notes, executive summaries, interactive 3D flip flashcards, and self-assessment quizzes in minutes.

---

## 📖 Complete Technical Documentation

For the comprehensive system architecture, database diagrams, execution pipelines, and workflow models, see:

👉 **[DOCUMENTATION.md](file:///c:/Users/DELL/Documents/Coding%20Projects/lectra-ai/DOCUMENTATION.md)**

Included in the documentation:
1. **High-Level Design (HLD)** & Tiered Architecture Diagram
2. **Entity-Relationship (ER) Diagram** with Full Data Dictionary & JSON Schemas
3. **Use Case Diagram** & Actor Interaction Specifications
4. **Sequence Diagrams** (End-to-End Processing, Auth Flow, and Study/Export Session)
5. **How It Works**: Deep-Dive Execution Pipeline (Audio Slicing, Groq Whisper ASR, Gemini Flash generation, and client hydration)
6. **API Specification** (REST Endpoints & Payloads)
7. **Security, Scalability & Resilience**

---

## 🚀 Tech Stack

- **Frontend**: React Native, Expo SDK 54, Expo Router, React Native Reanimated, Expo Audio, Expo Print
- **Backend API**: FastAPI (Python 3.11+), Uvicorn, Pydantic, SQLAlchemy, Pg8000
- **Audio Processing**: `static-ffmpeg` & `ffprobe` (zero-transcode 10-minute segmenting)
- **Speech-to-Text**: Groq Cloud API (`whisper-large-v3` LPU acceleration)
- **Pedagogical AI**: Google Gemini Flash API (Strict JSON schema generation)
- **Database**: Neon Serverless PostgreSQL
- **Object Storage**: Supabase Storage (`lectures` bucket)

---

## 🛠️ Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Ensure your `.env` contains:
- `DATABASE_URL` (Neon PostgreSQL)
- `SUPABASE_URL` & `SUPABASE_KEY`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_IDS` (Optional for Google OAuth)

### 2. Mobile App Setup

```bash
# In the root directory
npm install
npx expo start
```

