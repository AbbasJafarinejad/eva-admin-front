import { apiErrorResponse, requestAdminApi } from "@/lib/admin-api";
import { hasAdminSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    if (!(await hasAdminSession())) {
      return Response.json(
        { error: "unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const featureKey = process.env.ADMIN_FEATURE_FULL_BACKUP_KEY || "";
    if (featureKey.length < 16) {
      return Response.json(
        { error: "feature_disabled" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const url = new URL(request.url);
    const includeLogs = url.searchParams.get("include_logs") === "true";
    const backupKey = request.headers.get("x-admin-backup-key") || "";
    if (backupKey.length < 16) {
      return Response.json(
        { error: "invalid_backup_key" },
        { status: 422, headers: { "Cache-Control": "no-store" } },
      );
    }

    const upstream = await requestAdminApi(
      "backup",
      `?include_logs=${includeLogs ? "true" : "false"}`,
      {
        method: "POST",
        signal: request.signal,
        headers: {
          "X-Admin-Feature-Key": featureKey,
          "X-Admin-Backup-Key": backupKey,
        },
      },
    );

    const filename =
      upstream.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] ||
      "eva-backup.eva.enc";

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        ...(upstream.headers.get("X-Backup-Alg")
          ? { "X-Backup-Alg": upstream.headers.get("X-Backup-Alg")! }
          : {}),
        ...(upstream.headers.get("X-Backup-Nonce")
          ? { "X-Backup-Nonce": upstream.headers.get("X-Backup-Nonce")! }
          : {}),
        ...(upstream.headers.get("X-Backup-Tag")
          ? { "X-Backup-Tag": upstream.headers.get("X-Backup-Tag")! }
          : {}),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
