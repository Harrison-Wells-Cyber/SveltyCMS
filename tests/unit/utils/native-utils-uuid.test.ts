/**
 * @file tests/unit/utils/native-utils-uuid.test.ts
 * @description Regression tests for secure UUID generation outside secure browser contexts.
 *
 * ### Features:
 * - uses randomUUID when the runtime exposes it
 * - falls back to getRandomValues without weak randomness
 * - fails closed when no CSPRNG is available
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { generateUUID } from "@src/utils/native-utils";

const originalCrypto = globalThis.crypto;

describe("generateUUID", () => {
  afterEach(() => {
    vi.stubGlobal("crypto", originalCrypto);
  });

  it("generates an RFC 4122 v4 UUID when randomUUID is unavailable", () => {
    let next = 0;
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        for (let index = 0; index < bytes.length; index++) bytes[index] = next++;
        return bytes;
      },
    });

    const uuid = generateUUID();

    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("throws rather than using weak randomness when crypto is unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    expect(() => generateUUID()).toThrow("Secure random number generation is unavailable");
  });
});
