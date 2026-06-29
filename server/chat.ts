/**
 * Server handler for the floating AI chat assistant.
 *
 * Calls Gemini with a VeriPolicy-specific system prompt so the assistant
 * can answer questions about the platform, policy analysis, defence data,
 * climate data, and general policy intelligence topics.
 */

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY environment variable");
  return key;
}

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

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

const SYSTEM_PROMPT = `You are VeriPolicy's built-in policy intelligence assistant. You help analysts working at the intersection of defence, climate, and strategic technology.

About VeriPolicy:
- It generates analyst-grade foresight memos from policy scenarios using historical analogies.
- It uses SIPRI military expenditure and global CO2 emissions data across 47 jurisdictions and 2.1M indexed records.
- The Scenario Simulator lets users enter a policy scenario (e.g. "India increases defence spending by 15%") and generates a structured foresight memo using Gemini + historical RAG retrieval.
- The Comparison Dashboard lets users compare CO2 vs military expenditure trends across countries.
- The Policy Tracker shows live tracked policies.
- Historical analogies are retrieved via all-MiniLM-L6-v2 embeddings matched against a Supabase vector store.

Rules:
1. Be concise. No filler. Every sentence must add value.
2. If asked about policy topics (defence, climate, trade, energy, sanctions, budgets), give a direct, knowledgeable answer grounded in real-world context.
3. If asked about VeriPolicy features, explain them clearly.
4. If asked to analyze a scenario, give a brief preliminary take and suggest using the Scenario Simulator for a full memo.
5. Keep answers under 3-4 sentences unless the user asks for depth.
6. Never hallucinate statistics. If unsure, say so.`;

export async function handleChatRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: { message: string; history?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const userMessage = String(body.message ?? "").trim();
  if (!userMessage) {
    return new Response(JSON.stringify({ error: "Empty message" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Build conversation history for Gemini
  const contents: GeminiContent[] = [];

  // Add system prompt as the first user turn (Gemini doesn't have a "system" role in v1beta)
  const history = body.history ?? [];

  // Build multi-turn conversation
  // First message includes system prompt
  if (history.length === 0) {
    contents.push({
      role: "user",
      parts: [{ text: `${SYSTEM_PROMPT}\n\nUser question: ${userMessage}` }],
    });
  } else {
    // First turn: system prompt + first user message from history
    const firstUserMsg = history.find((m) => m.role === "user");
    contents.push({
      role: "user",
      parts: [{ text: `${SYSTEM_PROMPT}\n\nUser question: ${firstUserMsg?.text ?? ""}` }],
    });

    // Add remaining history turns
    let skipFirst = true;
    for (const msg of history) {
      if (msg.role === "user" && skipFirst) {
        skipFirst = false;
        continue;
      }
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      });
    }

    // Add current message
    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });
  }

  try {
    const apiKey = getApiKey();
    const model = "gemini-2.0-flash";
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.4,
          topP: 0.9,
          topK: 40,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini chat API error:", errText);
      return new Response(
        JSON.stringify({ error: `Gemini API failed: ${res.status}` }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }

    const json: GeminiResponse = await res.json();
    const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
      return new Response(
        JSON.stringify({ error: "No response from Gemini" }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("Chat handler error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
