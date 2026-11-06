import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";

export async function GET(request: Request) {
  try {
    // Tie the upstream fetch to the client connection so aborts propagate, while still applying a sane timeout.
    const upstream = await requestAdminApi("prompt-logs", "", { signal: request.signal });
    // Stream the upstream body through without buffering to avoid loading large ZIPs into memory.
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="eva-prompt-logs.zip"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) { return apiErrorResponse(error); }
}
