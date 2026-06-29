# VeriPolicy

AI-powered policy intelligence platform that combines geopolitical scenario simulation with real-time policy tracking and impact analysis.

## Overview

VeriPolicy helps users understand how policy decisions, geopolitical events, and economic changes may influence global outcomes. The platform combines historical analogies, AI-generated foresight analysis, and real-time policy monitoring into a single interface.

The project consists of two major modules:

### Tab 1 — Scenario Simulator

The Scenario Simulator allows users to model hypothetical policy and geopolitical events and generate foresight memos grounded in historical precedents.

Example scenarios:

* Germany cuts defense spending by 30%
* China restricts rare earth exports
* Major carbon tax implementation
* Large-scale defense budget increases

The simulator:

1. Accepts a user-defined scenario
2. Retrieves historically similar events using vector embeddings
3. Uses AI to analyze potential outcomes
4. Generates a structured foresight memo
5. Stores simulation history for future reference

### Tab 2 — Policy Tracker

The Policy Tracker continuously collects policy-related news and generates AI-powered impact briefs.

Pipeline:

NewsData API
→ Policy Extraction
→ Supabase Storage
→ AI Analysis (Groq Llama)
→ Impact Brief Generation
→ Policy Dashboard

The tracker provides:

* Real-time policy monitoring
* Categorized policy updates
* AI-generated impact summaries
* Historical policy archive
* Automated daily updates

---

## Architecture

Frontend:

* React
* TypeScript
* Vite
* TanStack Router
* Tailwind CSS

Backend & Data:

* Supabase
* PostgreSQL
* Row Level Security (RLS)

AI & Intelligence:

* Groq API
* Llama Models
* Xenova/all-MiniLM-L6-v2 Embeddings

External Data Sources:

* NewsData API
* OWID CO₂ Dataset
* SIPRI Military Expenditure Dataset

---

## Historical Analogy Engine

To improve reasoning quality, VeriPolicy uses embedding-based retrieval.

Workflow:

Historical Dataset
→ Embedding Generation
→ Vector Storage
→ Similarity Search
→ Relevant Analogies
→ AI Reasoning

This grounds AI outputs in historical context rather than producing unsupported speculation.

---

## Features

### Scenario Simulator

* Historical analogy retrieval
* AI-generated foresight memos
* Scenario history tracking
* Similarity scoring
* Structured policy analysis

### Policy Tracker

* Automated news ingestion
* Policy extraction pipeline
* AI-generated impact briefs
* Daily policy monitoring
* Searchable policy feed

---

## Project Structure

```text
src/
├── components/
├── routes/
├── services/
├── lib/
├── contexts/

supabase/
├── migrations/

Dataset/
├── owid-co2-data
├── SIPRI-Milex-data

public/
```

## Environment Variables

Required:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
NEWSDATA_API_KEY=
GROQ_API_KEY=
```

Never commit real API keys.

---

## Local Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

---

## Deployment

Frontend deployment is handled through Vercel.

Environment variables are configured through the Vercel dashboard.

---

## Future Improvements

* Advanced policy forecasting
* Multi-model AI evaluation
* Interactive scenario comparison
* Geographic visualization
* Automated policy recommendation engine

---

## Contributors

Developed as part of a policy intelligence and foresight analytics project using AI, retrieval systems, and real-time policy monitoring.
