/*
  Google Gemini API client wrapper (server-only).

  Uses Google's Generative AI REST API via plain fetch.
  Lives inside /server so the Vercel serverless functions can resolve it.
  The GEMINI_API_KEY secret is only available server-side.

  NOTE: Ensure `GEMINI_API_KEY` is set in your Vercel project env before deploying.
*/

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY environment variable");
  return key;
}

type GeminiContent = {
  role: string;
  parts: Array<{ text: string }>;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export async function callGeminiModel({
  model = "gemini-1.5-flash",
  input,
  maxTokens = 2048,
  temperature = 0.3,
}: {
  model?: string;
  input: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = getApiKey();

  const contents: GeminiContent[] = [
    {
      role: "user",
      parts: [{ text: input }],
    },
  ];

  const systemInstruction = {
    parts: [
      {
        text: "You are a strategic policy analyst with expertise in defense, emissions, economic policy, and industrial effects. You analyze policy scenarios using historical precedent and provide structured, evidence-based foresight memos. You avoid speculation beyond the provided historical cases. You maintain analytical rigor and acknowledge uncertainty when similarity scores are low.",
      },
    ],
  };

  const payload = {
    system: systemInstruction,
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      topP: 0.95,
      topK: 40,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_UNSPECIFIED", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DEROGATORY_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_VIOLENCE", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUAL_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_MEDICAL_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API request failed: ${res.status} ${res.statusText} - ${text}`);
  }

  let json: GeminiResponse;
  try {
    json = await res.json();
  } catch (parseError) {
    const text = await res.text();
    throw new Error(`Failed to parse Gemini API response: ${text}`);
  }

  const content = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (content) return content;

  throw new Error("Gemini API returned an unexpected response shape");
}
