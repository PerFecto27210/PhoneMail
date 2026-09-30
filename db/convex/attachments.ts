import { ConvexError, v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation } from "./_generated/server";
import { conversationHasBlockRelationship } from "./blockPolicy";
import {
  matchesStorageContentType,
  MAX_ATTACHMENTS_PER_MESSAGE,
  validateAttachment,
} from "./attachmentPolicy";
import { requireCurrentUser } from "./user";

const UPLOAD_TTL_MS = 30 * 60 * 1000;

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

async function requireMembership(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("conversationMembers")
    .withIndex("by_user_conversation", (q) =>
      q.eq("userId", userId).eq("conversationId", conversationId),
    )
    .first();
  if (!membership) fail("forbidden", "You are not a member of this conversation.");
}

async function requireMessagingAllowed(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
) {
  if (await conversationHasBlockRelationship(ctx, conversationId)) {
    fail("blocked", "You cannot send attachments in this conversation.");
  }
}

const expireUploadRef = makeFunctionReference<
  "mutation",
  { uploadId: Id<"attachmentUploads">; expiresAt: number }
>("attachments:expireUpload");

export const createUpload = mutation({
  args: {
    conversationId: v.id("conversations"),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireMembership(ctx, args.conversationId, user._id);
    await requireMessagingAllowed(ctx, args.conversationId);

    const file = validateAttachment(args.fileName, args.mimeType, args.size);
    if (!file) {
      fail("invalid_attachment", "This file type or size is not supported.");
    }

    const now = Date.now();
    const expiresAt = now + UPLOAD_TTL_MS;
    const uploadUrl = await ctx.storage.generateUploadUrl();
    const uploadId = await ctx.db.insert("attachmentUploads", {
      conversationId: args.conversationId,
      userId: user._id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      status: "uploading",
      createdAt: now,
      expiresAt,
    });
    await ctx.scheduler.runAfter(UPLOAD_TTL_MS, expireUploadRef, { uploadId, expiresAt });
    return { uploadId, uploadUrl, mimeType: file.mimeType };
  },
});

export const completeUpload = mutation({
  args: {
    uploadId: v.id("attachmentUploads"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { uploadId, storageId }) => {
    const user = await requireCurrentUser(ctx);
    const upload = await ctx.db.get(uploadId);
    if (!upload || upload.userId !== user._id) {
      fail("upload_not_found", "This upload is not available to your account.");
    }
    if (upload.status !== "uploading" || upload.expiresAt <= Date.now()) {
      fail("upload_expired", "This upload has expired. Please select the file again.");
    }
    await requireMembership(ctx, upload.conversationId, user._id);
    await requireMessagingAllowed(ctx, upload.conversationId);

    const [metadata, existingReference] = await Promise.all([
      ctx.db.system.get("_storage", storageId),
      ctx.db.query("attachmentUploads")
        .withIndex("by_storage", (q) => q.eq("storageId", storageId))
        .first(),
    ]);
    if (!metadata || metadata._creationTime < upload.createdAt) {
      fail("invalid_attachment", "The uploaded file does not match this upload request.");
    }
    if (existingReference) {
      fail("invalid_attachment", "This stored file has already been claimed.");
    }
    if (
      metadata.size !== upload.size ||
      !matchesStorageContentType(upload.mimeType, metadata.contentType)
    ) {
      fail("invalid_attachment", "The uploaded file metadata does not match the selected file.");
    }

    await ctx.db.patch(uploadId, { storageId, status: "ready" });
    return { uploadId, fileName: upload.fileName, mimeType: upload.mimeType, size: upload.size };
  },
});

export const discardUpload = mutation({
  args: { uploadId: v.id("attachmentUploads"), storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { uploadId, storageId }) => {
    const user = await requireCurrentUser(ctx);
    const upload = await ctx.db.get(uploadId);
    if (!upload || upload.userId !== user._id) return false;
    if (upload.status === "attached") {
      fail("attachment_in_use", "A sent attachment cannot be removed here.");
    }
    if (upload.storageId) await ctx.storage.delete(upload.storageId);
    else if (storageId) {
      const metadata = await ctx.db.system.get("_storage", storageId);
      if (metadata && metadata._creationTime >= upload.createdAt) await ctx.storage.delete(storageId);
    }
    await ctx.db.delete(uploadId);
    return true;
  },
});

export const expireUpload = internalMutation({
  args: { uploadId: v.id("attachmentUploads"), expiresAt: v.number() },
  handler: async (ctx, { uploadId, expiresAt }) => {
    const upload = await ctx.db.get(uploadId);
    if (!upload || upload.status === "attached" || upload.expiresAt !== expiresAt || expiresAt > Date.now()) {
      return false;
    }
    if (upload.storageId) await ctx.storage.delete(upload.storageId);
    await ctx.db.delete(uploadId);
    return true;
  },
});

export async function resolveAttachmentUploads(
  ctx: MutationCtx,
  userId: Id<"users">,
  conversationId: Id<"conversations">,
  uploadIds: Id<"attachmentUploads">[],
) {
  if (uploadIds.length > MAX_ATTACHMENTS_PER_MESSAGE || new Set(uploadIds).size !== uploadIds.length) {
    fail("invalid_attachment", `A message can include up to ${MAX_ATTACHMENTS_PER_MESSAGE} unique files.`);
  }
  const uploads = await Promise.all(uploadIds.map((id) => ctx.db.get(id)));
  const ready = [];
  for (let index = 0; index < uploads.length; index += 1) {
    const upload = uploads[index];
    if (
      !upload ||
      upload.userId !== userId ||
      upload.conversationId !== conversationId ||
      upload.status !== "ready" ||
      upload.expiresAt <= Date.now() ||
      !upload.storageId
    ) {
      fail("invalid_attachment", "One or more files are not ready to send.");
    }
    const metadata = await ctx.db.system.get("_storage", upload.storageId);
    if (
      !metadata ||
      metadata.size !== upload.size ||
      !matchesStorageContentType(upload.mimeType, metadata.contentType)
    ) {
      fail("invalid_attachment", "One or more uploaded files are no longer available.");
    }
    ready.push({ upload, attachment: {
      storageId: upload.storageId,
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      size: upload.size,
    } });
  }
  return ready;
}
