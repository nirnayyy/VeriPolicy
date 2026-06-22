# Gemini API Integration Setup Guide

## Summary of Changes

✅ **Simulator Tab (Foresight Memos)**
- Removed: Groq API integration
- Added: Google Gemini API integration
- Model: `gemini-1.5-flash` 
- Context boundary added: Off-context questions are blocked
- Enhanced prompt with stricter instructions for analytical rigor

✅ **Policy Tracker Tab**
- No changes made (uses NewsData API independently)
- Continues to work as before

---

## What You Need to Do Manually

### 1. **Get Your Gemini API Key**
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Click "Create API Key"
- Copy the generated key (keep it safe)

### 2. **Set Environment Variables**

#### For Local Development (`.env.local`)
Create or update `.env.local` in your project root:
```
GEMINI_API_KEY=your_actual_api_key_here
```

#### For Vercel Deployment
1. Go to your [Vercel Project Settings](https://vercel.com/dashboard)
2. Navigate to **Settings → Environment Variables**
3. Add new variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** Your Gemini API key
   - **Environments:** Select Production, Preview, Development (all three)
4. Save and redeploy

### 3. **Test Locally**
```bash
npm run dev
```
Then navigate to the **Simulator** tab and test with a scenario like:
```
India: +15% defence, -20% fuel subsidies
```

You should see:
- ✅ Scenario Summary
- ✅ Emissions Trajectory
- ✅ Defense Industrial Effects
- ✅ Economic Spillovers
- ✅ Confidence Assessment
- ✅ Chart visualization

### 4. **Verify Off-Context Protection**
Try entering something unrelated like: "What's the capital of France?"

Expected behavior: Should get a response stating it's not a valid policy scenario.

### 5. **Deploy to Vercel**
Once tested locally:
```bash
git add .
git commit -m "chore: Replace Groq with Gemini API for simulator"
git push
```

Vercel will auto-deploy. The simulator should work on production within minutes.

---

## Files Modified

| File | Change |
|------|--------|
| `/server/gemini.ts` | ✨ NEW - Gemini API wrapper |
| `/server/foresight.ts` | Updated import (Groq → Gemini), enhanced prompt with context boundary |
| `/api/foresight.ts` | No changes (handler stays the same) |
| `/src/services/simulatorService.ts` | No changes (client flow unchanged) |
| `/src/routes/simulator.tsx` | No changes (UI unchanged) |

---

## Gemini API Configuration

The Gemini model is configured with:
- **Model:** `gemini-1.5-flash` (fast, cost-effective, 1M token context)
- **Temperature:** 0.3 (more deterministic, less hallucination)
- **Max Tokens:** 2048 (adequate for detailed memos)
- **Safety Settings:** All set to `BLOCK_NONE` (for policy analysis content)
- **System Instruction:** Embedded to enforce policy analyst role + context boundary

---

## Key Improvements

1. **Better Error Handling** - Gracefully catches JSON parse errors
2. **Stricter Analysis** - Explicit instructions to avoid off-context answers
3. **Context Boundary** - Model instructed to reject non-policy questions
4. **Scenario Memos** - Clear structured format for policy analysis
5. **Chart Integration** - Maintained automatic chart generation based on country detection

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Missing GEMINI_API_KEY"** | Check `.env.local` (dev) or Vercel env vars (production) |
| **"Unexpected token '<'"** | Verify API key is correct; check Vercel logs |
| **No response for hours** | Gemini API might be rate-limited; wait a bit and retry |
| **Charts not showing** | Check country names match the `AVAILABLE_ANALYTICS_COUNTRIES` list |

---

## Rollback Instructions (if needed)

If you need to revert to Groq:
```bash
git log --oneline | grep "Gemini"
git revert [commit-hash]
git push
```

Then restore the Groq API key in Vercel env vars.

---

## Cost Comparison

- **Groq:** Previously had quota/rate issues → error responses returned as HTML
- **Gemini 1.5 Flash:** 
  - 1M input tokens: $0.075/1M
  - 1M output tokens: $0.30/1M
  - Daily free tier: 15 API calls/day (sufficient for testing)

---

**Status:** Ready to deploy after setting `GEMINI_API_KEY`! 🚀
