const http = require("http");
const url = require("url");

const port = process.env.MOCK_BACKEND_PORT ? Number(process.env.MOCK_BACKEND_PORT) : 3333;

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body && typeof body.pipe === "function") {
    body.pipe(res);
  } else {
    res.end(body || "");
  }
}

function asISO(date) {
  return new Date(date).toISOString();
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || "", true);
  const pathname = parsed.pathname || "";

  // Simple routing for the admin v1 endpoints
  if (pathname === "/api/admin/v1/prompt-turns") {
    const items = [
      { oid: "t1", ts: asISO("2026-11-06T10:00:00Z"), source: "web", model: "gpt-4o-mini", status: "ok", latency_ms: 123, tokens: 345, silence: false, routing_decision: "direct" },
      { oid: "t2", ts: asISO("2026-11-06T10:10:00Z"), source: "telegram", model: "gpt-4o-mini", status: "error", latency_ms: 2500, tokens: 0, silence: true, routing_decision: "fallback" },
    ];
    const body = JSON.stringify({ schema_version: "v1", truncated: true, items });
    return send(res, 200, { "Content-Type": "application/json", "Cache-Control": "no-store" }, body);
  }

  if (pathname === "/api/admin/v1/prompt-turns.csv") {
    const csv = [
      "oid,ts,source,model,status,latency_ms,tokens,silence,routing_decision",
      "t1,2026-11-06T10:00:00Z,web,gpt-4o-mini,ok,123,345,false,direct",
      "t2,2026-11-06T10:10:00Z,telegram,gpt-4o-mini,error,2500,0,true,fallback",
      "",
    ].join("\n");
    return send(res, 200, { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store", "X-Export-Truncated": "true" }, csv);
  }

  if (pathname === "/api/admin/v1/prompt-turns.jsonl") {
    const lines = [
      JSON.stringify({ oid: "t1", ts: asISO("2026-11-06T10:00:00Z"), source: "web", model: "gpt-4o-mini", status: "ok", latency_ms: 123, tokens: 345, silence: false, routing_decision: "direct" }),
      JSON.stringify({ oid: "t2", ts: asISO("2026-11-06T10:10:00Z"), source: "telegram", model: "gpt-4o-mini", status: "error", latency_ms: 2500, tokens: 0, silence: true, routing_decision: "fallback" }),
      "",
    ].join("\n");
    return send(res, 200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Export-Truncated": "true" }, lines);
  }

  if (pathname.startsWith("/api/admin/v1/prompt-turns/")) {
    const oid = pathname.split("/").pop();
    const body = JSON.stringify({ oid, prompt: "User: [redacted]", response: "Answer: …" });
    return send(res, 200, { "Content-Type": "application/json", "Cache-Control": "no-store" }, body);
  }

  return send(res, 404, { "Content-Type": "application/json" }, JSON.stringify({ error: "not_found" }));
});

server.listen(port, "127.0.0.1", () => {
  console.error(`[mock-backend] listening on http://127.0.0.1:${port}`);
});

