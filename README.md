# VeriPolicy

AI-powered policy intelligence platform for policy tracking, geopolitical scenario simulation, and impact analysis.

## Overview

VeriPolicy helps users understand how policy decisions, geopolitical events, defense spending changes, climate initiatives, and economic shifts may affect countries, industries, and global systems.

The platform combines:

* Real-time policy monitoring
* AI-generated impact briefs
* Historical analogy retrieval
* Scenario simulation and foresight analysis
* Data-driven policy intelligence

---

## Key Features

### Scenario Simulator

Generate AI-powered foresight memos for hypothetical scenarios.

Examples:

* Germany cuts defense spending by 30%
* China restricts rare earth exports
* Global carbon tax implementation
* Major military spending increases

Workflow:

1. User submits a scenario
2. Historical analogies are retrieved using embeddings
3. Relevant historical events are ranked by similarity
4. AI generates a structured foresight memo
5. Results are stored for future analysis

---

### Policy Tracker

Tracks policy-related developments from live news sources.

Pipeline:

NewsData API → Policy Extraction → Supabase → AI Analysis → Impact Brief Generation

Capabilities:

* Automated policy ingestion
* Policy categorization
* AI-generated impact briefs
* Searchable policy feed
* Daily policy monitoring

---

## Historical Analogy Engine

VeriPolicy uses retrieval-augmented generation (RAG) to ground AI reasoning in historical precedent.

Workflow:

Historical Dataset → Embeddings → Vector Search → Similar Events → AI Analysis

Datasets Used:

* OWID CO₂ Dataset
* SIPRI Military Expenditure Dataset

Embedding Model:

* Xenova/all-MiniLM-L6-v2

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* TanStack Router
* Tailwind CSS

### Backend & Database

* Supabase
* PostgreSQL
* Row Level Security (RLS)

### AI & Analytics

* Groq API
* Llama Models
* Vector Embeddings
* Retrieval-Augmented Generation (RAG)

### External APIs

* NewsData API

---

## Project Structure

```text
src/
├── components/
├── routes/
├── services/
├── lib/
├── hooks/
├── contexts/

supabase/
├── migrations/
├── seeds/

Dataset/
├── owid-co2-data.csv
├── SIPRI-Milex-data-1949-2025_v1.2.xlsx
```

## Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
NEWSDATA_API_KEY=
GROQ_API_KEY=
```

Do not commit real API keys.

---

## Local Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

## Deployment

The application is deployed using:

* GitHub
* Vercel
* Supabase

Environment variables are configured through the Vercel dashboard.

---

## Future Enhancements

* Advanced forecasting models
* Scenario comparison engine
* Interactive policy dashboards
* Geopolitical risk scoring
* Regional policy heatmaps

---

## Author

Nirnay Singh

Built as an AI-powered policy intelligence and foresight platform combining real-time policy monitoring, retrieval systems, and generative AI.
