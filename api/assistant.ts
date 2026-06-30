import { handleAssistantRequest } from "../server/assistant.js";

export async function POST(request: Request): Promise<Response> {
  return handleAssistantRequest(request);
}
