/**
 * @file tests/unit/security/remote-media-ssrf.test.ts
 * @description Regression coverage for remote-media SSRF protections.
 *
 * ### Features:
 * - ensures every remote-upload action uses the redirect-aware egress guard
 * - prevents accidental reintroduction of direct fetch calls at these sinks
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const REMOTE_UPLOAD_ROUTES = [
  "src/routes/(app)/mediagallery/+page.server.ts",
  "src/routes/(app)/mediagallery/upload-media/+page.server.ts",
];

describe("remote media SSRF protection", () => {
  it.each(REMOTE_UPLOAD_ROUTES)("uses safeFetch in %s", (path) => {
    const source = readFileSync(path, "utf8");
    const remoteUpload = source.slice(source.indexOf("remoteUpload:"));

    expect(remoteUpload).toContain("safeFetch(url");
    expect(remoteUpload).not.toContain("await fetch(url)");
    expect(remoteUpload).toContain('hasPermissionWithRoles(user, "media:write"');
  });
});
