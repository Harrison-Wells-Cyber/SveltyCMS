/**
 * @file src/routes/api/collaboration/yjs/+server.ts
 * @description API endpoint for receiving Yjs updates from clients.
 */

import { json } from "@sveltejs/kit";
import { apiHandler } from "@utils/api-handler";
import { AppError } from "@utils/error-handling";
import { pubSub } from "@src/services/background/pub-sub";
import { encodeYjsToBase64, decodeBase64ToYjs } from "@utils/tenant";
import { hasPermissionWithRoles } from "@src/databases/auth/permissions";

const COLLABORATION_DOC_ID = /^entry:([^:]+):([^:]+)$/;

function requireDocumentPermission(
  locals: App.Locals,
  docId: unknown,
  permission: "collection:read" | "collection:write",
): string {
  if (typeof docId !== "string" || !COLLABORATION_DOC_ID.test(docId)) {
    throw new AppError("Invalid collaboration document ID", 400, "BAD_REQUEST");
  }

  const { user } = locals;
  if (
    !user ||
    (!locals.isAdmin &&
      !user.isAdmin &&
      !hasPermissionWithRoles(user, permission, locals.roles ?? []))
  ) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  return docId;
}

export const POST = apiHandler(async ({ locals, request }) => {
  const { user, tenantId } = locals;
  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  const { docId: requestedDocId, updateBase64 } = await request.json();
  const docId = requireDocumentPermission(locals, requestedDocId, "collection:write");
  if (!docId || !updateBase64) {
    throw new AppError("docId and updateBase64 are required", 400, "BAD_REQUEST");
  }

  // Convert base64 back to Uint8Array using native helper
  const update = decodeBase64ToYjs(updateBase64);

  // Publish to internal event bus
  // The YjsService will pick this up and apply it to the server-side doc
  pubSub.publish("yjs:update", {
    docId,
    update,
    origin: user._id,
    tenantId: tenantId as string,
  });

  return json({ success: true });
});

/**
 * GET endpoint to fetch the full initial state of a document
 */
export const GET = apiHandler(async ({ locals, url }) => {
  const { user, tenantId } = locals;
  if (!user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

  const docId = requireDocumentPermission(
    locals,
    url.searchParams.get("docId"),
    "collection:read",
  );
  if (!docId) throw new AppError("docId is required", 400, "BAD_REQUEST");

  const { yjsService } = await import("@src/services/collaboration/yjs-service");
  const state = yjsService.getFullState(docId, tenantId as string);

  return json({
    success: true,
    stateBase64: encodeYjsToBase64(state),
  });
});
