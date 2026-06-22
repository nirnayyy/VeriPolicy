import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { loadEnv } from "vite";

type Handler = (request: Request) => Promise<Response>;

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "localhost";
  const url = `http://${host}${req.url ?? "/"}`;
  const body = await readBody(req);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry));
    } else {
      headers.set(key, value);
    }
  }
  return new Request(url, { method: req.method, headers, body: body ?? undefined });
}

async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}

async function resolveHandler(pathname: string, method: string): Promise<Handler | null> {
  if (pathname === "/api/foresight" && method === "POST") {
    const { handleForesightRequest } = await import("./server/foresight.ts");
    return handleForesightRequest;
  }
  if (pathname === "/api/simulation-history" && method === "GET") {
    const { handleSimulationHistoryRequest } = await import("./server/foresight.ts");
    return handleSimulationHistoryRequest;
  }
  if (pathname === "/api/generate-impact-brief" && method === "POST") {
    const { handleGenerateImpactBriefRequest } = await import("./server/generateImpactBrief.ts");
    return handleGenerateImpactBriefRequest;
  }
  if (pathname === "/api/generate-all-impact-briefs" && method === "POST") {
    const { handleGenerateAllImpactBriefsRequest } = await import("./server/generateAllImpactBriefs.ts");
    return handleGenerateAllImpactBriefsRequest;
  }
  if (pathname === "/api/policy-sync" && method === "POST") {
    const { handlePolicySyncRequest } = await import("./server/policySync.ts");
    return handlePolicySyncRequest;
  }
  return null;
}

export function devApiPlugin(): Plugin {
  return {
    name: "dev-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir, "");
      Object.assign(process.env, env);

      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url ?? "/").split("?")[0];
        if (!pathname.startsWith("/api/")) {
          next();
          return;
        }

        try {
          const handler = await resolveHandler(pathname, req.method ?? "GET");
          if (!handler) {
            res.statusCode = 404;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: `No dev API handler for ${req.method} ${pathname}` }));
            return;
          }

          const request = await toWebRequest(req);
          const response = await handler(request);
          await sendWebResponse(res, response);
        } catch (error) {
          console.error(`[dev-api] ${req.method} ${pathname}`, error);
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
        }
      });
    },
  };
}
