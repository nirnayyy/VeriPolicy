# VeriPolicy Gemini Integration - Ready to Deploy ✅

## Changes Made

### ✅ New Files
- `/server/gemini.ts` - Google Gemini API wrapper (complete with context boundary)

### ✅ Updated Files  
- `/server/foresight.ts` - Switched from Groq to Gemini, enhanced prompt with strict context boundaries
- `/api/foresight.ts` - No changes (handler routing stays the same)

### ✅ Untouched (as requested)
- `/server/impactBriefService.ts` - Still uses Groq for policy tracker impact briefs
- `/server/groq.ts` - Kept for impact brief generation
- All policy tracker endpoints - Fully preserved

---

## Manual Steps Required

### Step 1: Add Gemini API Key to Environment Files

**For Local Testing** - Update `.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

**Get your free Gemini key:**
1. Visit https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

**For Vercel Production Deployment:**
1. Go to Vercel Project Settings
2. Environment Variables → Add Variable
3. Name: `GEMINI_API_KEY`
4. Value: Your Gemini API key
5. Apply to: All environments (Production, Preview, Development)

### Step 2: Test Locally
```bash
npm run dev
```
Then go to the **Simulator** tab and test with:
- ✅ "India: +15% defence, -20% fuel subsidies"
- ✅ Should generate memo + show chart
- ✅ Try an off-context question to verify context boundary works

### Step 3: Build & Deploy
```bash
npm run build
git add .
git commit -m "feat: Replace Groq with Gemini API for simulator section"
git push
```

---

## Architecture Overview

```
USER REQUEST (Simulator)
    ↓
/src/routes/simulator.tsx (React UI - unchanged)
    ↓
/src/services/simulatorService.ts (Client - unchanged)
    ↓
POST /api/foresight (Handler - unchanged routing)
    ↓
/server/foresight.ts (NEW LOGIC - now calls Gemini)
    ↓
/server/gemini.ts (NEW - Gemini API wrapper)
    ↓
Google Gemini API (gemini-1.5-flash)
    ↓
Scenario Memo + Historical Matches
    ↓
Back to Simulator UI for display + chart generation
```

**Policy Tracker (UNCHANGED):**
```
USER REQUEST (Policy Tracker)
    ↓
Fetches from NewsData API
    ↓
Stores in Supabase
    ↓
/server/impactBriefService.ts (Still uses Groq)
    ↓
Generates Impact Briefs
```

---

## What You'll See

### Before (Groq Error)
```
Error: Unexpected token '<', "<!doctype "...is not valid JSON
```

### After (Gemini Success)
```json
{
  "memo": "# Scenario Summary\nIndia increases defence spending...",
  "confidence": "High",
  "historicalMatches": [
    { "country": "India", "period": "2001-2005", "similarity": 0.87 }
  ]
}
```

Plus automatic chart visualization with India data!

---

## Key Features Enabled

✅ Off-context question blocking  
✅ Structured scenario memos  
✅ Historical precedent reasoning  
✅ Confidence scoring  
✅ Chart auto-generation  
✅ Full error handling  

---

## Timeline

| Step | Time |
|------|------|
| Local testing | ~2 min |
| Git push | ~1 min |
| Vercel redeploy | ~3-5 min |
| **Total** | **~10 min** |

---

## Questions?

If you hit any issues:
1. Check `.env.local` / Vercel env vars have `GEMINI_API_KEY`
2. Verify API key is active (test at https://aistudio.google.com)
3. Check Vercel logs for detailed error messages
4. Simulator UI should load but show error if API key is missing

---

**Status: READY TO PUSH** 🚀
