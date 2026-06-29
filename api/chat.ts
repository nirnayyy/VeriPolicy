// Vercel serverless function for the AI chat assistant.
import { handleChatRequest } from "../server/chat.js";

export async function POST(request: Request): Promise<Response> {
  return handleChatRequest(request);
}
