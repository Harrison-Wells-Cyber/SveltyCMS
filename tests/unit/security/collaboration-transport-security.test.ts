/**
 * @file tests/unit/security/collaboration-transport-security.test.ts
 * @description Regression coverage for the production collaboration transport boundary.
 *
 * ### Features:
 * - ensures the production entry point does not mount the unauthenticated Yjs server
 * - ensures in-process collaboration documents use tenant-scoped map keys
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("collaboration transport security", () => {
  it("does not mount the unauthenticated standalone Yjs WebSocket server", () => {
    const entrypoint = readFileSync("index.cjs", "utf8");

    expect(entrypoint).not.toContain("startYjsSyncServer");
    expect(entrypoint).not.toContain('path: "/ws"');
  });

  it("keys in-process Yjs documents by tenant and document ID", () => {
    const service = readFileSync("src/services/collaboration/yjs-service.ts", "utf8");

    expect(service).toContain("const key = `${tenantId}:${docId}`");
    expect(service).toContain("this.docs.set(key, doc)");
  });
});
