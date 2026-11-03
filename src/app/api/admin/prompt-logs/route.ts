import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";

export async function GET() {
  try {
    const response = await requestAdminApi("prompt-logs");
    return new Response(await response.arrayBuffer(), {
      headers: { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="eva-prompt-logs.zip"', "Cache-Control": "no-store" },
    });
  } catch (error) { return apiErrorResponse(error); }
}
