/*
  Groq client wrapper.
  Uses the GROQ API via simple fetch so the code works even if the SDK differs.
  Exports a typed helper to call Groq's OpenAI-compatible Chat Completions endpoint.

  NOTE: Ensure `GROQ_API_KEY` is set in your environment (e.g., .env.local) before running.
*/

const GROQ_API_BASE = "https://api.groq.com/openai/v1";

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Missing GROQ_API_KEY environment variable");
  return key;
}

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function callGroqModel({ model, input, maxTokens = 1024 }: {
  model: string;
  input: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getApiKey();

  const payload = {
    model,
    messages: [
      {
        role: "user",
        content: input,
      },
    ],
    max_completion_tokens: maxTokens,
    temperature: 0.2,
  };

  const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API request failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const json: GroqResponse = await res.json();

  const content = json.choices?.[0]?.message?.content?.trim();
  if (content) return content;

  throw new Error("Groq API returned an unexpected response shape");
}

export default { callGroqModel };
