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
  model = "gemini-1.5-flash-latest",
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

  const systemPrompt = `You are a strategic policy analyst with expertise in defense, emissions, economic policy, and industrial effects. 

CONTEXT-BOUNDARY: Only analyze policy scenarios. Do not respond to off-context or unrelated questions.

Instructions:
1. Use ONLY the provided historical analogies as the basis for reasoning
2. Reference specific historical cases when making claims
3. If similarity is low, explicitly state uncertainty
4. If similarity is high, note stronger historical precedent exists
5. Never invent statistics or assumptions beyond the provided data
6. Maintain analytical rigor throughout
7. If the input is not a valid policy scenario, explicitly state that and refuse to continue

Respond with a structured Scenario Memo in Markdown format.`;

  const contents: GeminiContent[] = [
    {
      role: "user",
      parts: [{ text: `${systemPrompt}\n\n${input}` }],
    },
  ];

  const payload = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      topP: 0.95,
      topK: 40,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
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
