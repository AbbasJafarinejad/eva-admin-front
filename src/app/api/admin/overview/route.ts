import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";

export async function GET(request: Request) {
  try {
    const { search } = new URL(request.url);
    const days = searchParamsDays(search);
    const response = await requestAdminApi("overview", `?days=${days}`);
    return Response.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}

function searchParamsDays(search: string) {
  const value = Number(new URLSearchParams(search).get("days") || 30);
  return Number.isInteger(value) && value >= 1 && value <= 365 ? value : 30;
}
