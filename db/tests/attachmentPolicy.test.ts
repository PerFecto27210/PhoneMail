import assert from "node:assert/strict";
import test from "node:test";
import { MAX_ATTACHMENT_SIZE, matchesStorageContentType, validateAttachment } from "../convex/attachmentPolicy.ts";

test("accepts supported files and canonicalizes their MIME type", () => {
  assert.deepEqual(validateAttachment("photo.PNG", "image/png", 1024), {
    fileName: "photo.PNG",
    mimeType: "image/png",
    size: 1024,
  });
  assert.equal(validateAttachment("clip.mp4", "application/octet-stream", 1024)?.mimeType, "video/mp4");
});

test("rejects unsupported, oversized, and mismatched files", () => {
  assert.equal(validateAttachment("payload.exe", "application/octet-stream", 1024), null);
  assert.equal(validateAttachment("photo.png", "image/jpeg", 1024), null);
  assert.equal(validateAttachment("large.pdf", "application/pdf", MAX_ATTACHMENT_SIZE + 1), null);
  assert.equal(validateAttachment("../photo.png", "image/png", 1024), null);
});

test("storage metadata must match the selected file type", () => {
  assert.equal(matchesStorageContentType("image/png", "image/png"), true);
  assert.equal(matchesStorageContentType("image/png", "application/octet-stream"), true);
  assert.equal(matchesStorageContentType("image/png", "image/jpeg"), false);
  assert.equal(matchesStorageContentType("image/png", null), false);
});
