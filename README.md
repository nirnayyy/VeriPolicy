# 🏛️ VeriPolicy

> **AI-Powered Geopolitical Scenario Simulation & Policy Tracking Platform**  
> VeriPolicy enables researchers, analysts, and organizations to model the downstream impacts of policy decisions and global events through Retrieval-Augmented Generation (RAG) and historical analogies.

<p align="center">
  <img src="https://img.shields.io/badge/Stack-Next.js%20%7C%20FastAPI%20%7C%20Supabase-10b981?style=flat-square" alt="Tech Stack">
  <img src="https://img.shields.io/badge/AI-OpenAI%20%7C%20Embeddings-blue?style=flat-square" alt="AI Features">
  <img src="https://img.shields.io/badge/License-MIT-black?style=flat-square" alt="License">
</p>

---

## 🌍 Overview

In a volatile global landscape, policy makers and businesses struggle to anticipate how geopolitical actions shift supply chains, defense postures, and economic balances. 

VeriPolicy resolves this complexity by compiling a dynamic feed of real-time policy events and using **embeddings** to retrieve contextually similar historical events. It then executes large-language models (LLMs) to synthesize targeted **foresight memos** detailing projected outcomes.

```
                  ┌──────────────────────┐
                  │ Global News Feed API │
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │   News Ingestion     │
                  │   & Extraction       │
                  └──────────┬───────────┘
                             ▼
┌──────────────┐  ┌──────────────────────┐
│  Historical  │  │   Supabase Database  │
│  Analogies   ├─►│                      │
│ (Embeddings) │  │  Geopolitical State  │
└──────────────┘  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │  FastAPI Analytics   │
                  │       (RAG)          │
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │  Next.js Dashboard   │
                  └──────────────────────┘
```

---

## ⚡ Core Engines

### 1. Geopolitical Scenario Simulator
Test hypothetical scenarios (e.g., *"Germany cuts defense spending by 30%"*, *"Major restrictions on rare earth exports"*) and observe simulated geopolitical friction.
* **Analogy Search:** Searches database vector space using cosine similarity to retrieve matching historical events.
* **Foresight Generation:** Compiles analogical events into a rich prompt context to output structured policy briefing memos.

### 2. Live Policy Tracker
Maintains an ingestion pipeline checking news feeds for policy changes.
* **Ingestion:** Periodic fetches from news aggregators.
* **Classification:** Categorizes stories into defense, trade, energy, or monetary policies.
* **Briefing:** Generates concise impact notes automatically stored in Supabase.

---

## 🛠️ Repository & Architecture Structure

```
├── client/                 # Next.js frontend application
│   ├── src/
│   │   ├── components/     # UI elements (charts, feeds, panels)
│   │   └── pages/          # Main dashboard views
│   └── package.json
├── server/                 # FastAPI backend analytics engine
│   ├── app/
│   │   ├── main.py         # App entrypoint
│   │   ├── routes/         # Simulation and tracking endpoints
│   │   └── core/           # Embeddings extraction & prompt pipelines
│   └── requirements.txt
└── README.md
```

---

## ⚙️ Local Development Setup

### Backend (FastAPI Server)

1. **Clone & Navigate:**
   ```bash
   cd server
   ```

2. **Virtual Environment & Dependencies:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables (`.env`):**
   ```env
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_service_role_key
   NEWS_API_KEY=your_newsdata_key
   ```

4. **Launch Server:**
   ```bash
   uvicorn app.main:app --reload
   ```
   The interactive API docs will be active at `http://localhost:8000/docs`.

### Frontend (Next.js Client)

1. **Navigate & Install:**
   ```bash
   cd client
   npm install
   ```

2. **Configure Environment Variables (`.env.local`):**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run Dev Environment:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to interact with the platform.

---

## 🧭 Project Status & Roadmap

- [x] Ingestion pipeline with automated classification
- [x] Cosine-similarity historical analogy retriever
- [x] Next.js interactive scenario modeler
- [ ] Multi-agent simulation (competing actor models)
- [ ] Exportable PDF intelligence briefs

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
