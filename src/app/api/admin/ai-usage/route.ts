import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const rawDays = Number(params.get("days") || 30);
    const days = Number.isInteger(rawDays) && rawDays >= 1 && rawDays <= 365 ? rawDays : 30;
    const response = await requestAdminApi("ai-usage", `?days=${days}`);
    return Response.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
