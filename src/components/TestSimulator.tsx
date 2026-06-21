import React, { useState } from "react";
import { generateForesightMemo } from "../services/simulatorService";

export default function TestSimulator(): JSX.Element {
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);

  const onGenerate = async () => {
    console.log("TEXTAREA VALUE", input);
    console.log("STATE VALUE", input);
    setError(null);
    setMarkdown(null);
    setLoading(true);
    try {
      const res = await generateForesightMemo(input);
      console.log("SERVICE INPUT", input);
      setMarkdown(res.markdown);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl">
      <h2 className="text-xl font-semibold mb-2">Scenario Simulator (Test)</h2>
      <textarea
        className="w-full border rounded p-2 mb-2 min-h-[120px]"
        placeholder="Describe a policy scenario..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="flex items-center gap-2 mb-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={onGenerate}
          disabled={loading || input.trim().length === 0}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
        <button
          className="px-3 py-2 border rounded"
          onClick={() => {
            setInput("");
            setMarkdown(null);
            setError(null);
          }}
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-100 rounded">Error: {error}</div>
      )}

      {markdown && (
        <div className="prose max-w-full p-4 border rounded bg-white">
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }} />
        </div>
      )}
    </div>
  );
}

function markdownToHtml(md: string): string {
  // Lightweight conversion for demo purposes: paragraphs and headings
  // For production, prefer a proper markdown renderer like `marked` or `react-markdown`.
  const escaped = escapeHtml(md);
  const html = escaped
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/\n/g, "<br />");

  return `<p>${html}</p>`;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
