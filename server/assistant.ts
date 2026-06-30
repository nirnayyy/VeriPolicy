import { callGeminiModel } from "./gemini.js";

export async function handleAssistantRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Request body must be valid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const message = String(body?.message ?? "").trim();
  const history = Array.isArray(body?.history) ? body.history : [];

  if (!message) {
    return new Response(JSON.stringify({ error: "Missing message in request body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const systemPrompt = `You are the VeriPolicy Assistant, an expert AI advisor built for the Office of Policy Intelligence.
You help policy analysts research defense budgets, greenhouse emissions, geopolitical risks, and strategic reallocations.

KEY INFORMATION:
- VeriPolicy covers 47 jurisdictions with 2.1M indexed records (SIPRI military spending + OWID emissions datasets).
- The platform features:
  1. Scenario Simulator: Analyst-grade foresight briefs generated from hypothetical reallocations.
  2. Policy Tracker: Live news ingestion from global feeds with AI-generated Impact Briefs.
  3. Comparison Dashboard: Interactively plots CO2 vs defense budgets.
- Answer user queries in a professional, concise, policy-analysis tone. Limit responses to 200 words. Use bullet points for structured lists.
- If asked about non-policy topics, politely decline and steer them back to VeriPolicy features.`;

  const formattedHistory = history.map((msg: any) => {
    const senderName = msg.sender === "user" ? "User" : "Assistant";
    return `${senderName}: ${msg.text}`;
  }).join("\n");

  const promptInput = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${formattedHistory}\n\nUser: ${message}\nAssistant:`;

  try {
    const reply = await callGeminiModel({
      model: "gemini-2.0-flash",
      input: promptInput,
      maxTokens: 1024,
      temperature: 0.7,
    });

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error: any) {
    console.error("Assistant API error", error);
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
