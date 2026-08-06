// Plesk Passenger Entry Point for SveltyCMS (SvelteKit)
// Responsibility: Start the Node.js server and listen on the port provided by Passenger.

async function loadApp() {
  console.log("[SveltyCMS] Initializing application...");

  // Import the SvelteKit handler
  const { handler } = await import("./build/handler.js");
  const http = await import("node:http");

  // Production configuration
  process.env.BODY_SIZE_LIMIT = "104857600"; // 100MB
  // Prefer explicit ORIGIN. For local/CI preview (127.0.0.1 / localhost) default to
  // the listening URL so SvelteKit remote CSRF (completeSetup) is not rejected as
  // cross-site against the demo production host.
  if (!process.env.ORIGIN) {
    const host = process.env.HOST || "127.0.0.1";
    const port = process.env.PORT || "4173";
    const isLocal =
      host === "127.0.0.1" ||
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "::" ||
      process.env.TEST_MODE === "true";
    process.env.ORIGIN = isLocal
      ? `http://${host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host}:${port}`
      : "https://demo.sveltycms.com";
  }
  // Preserve harness NODE_ENV so /api/testing + test bypass stay open.
  // Forcing production here was blocking BENCHMARK/TEST_MODE matrix seeding.
  const isHarness =
    process.env.TEST_MODE === "true" ||
    process.env.BENCHMARK === "true" ||
    process.env.SVELTY_BENCHMARK_SUITE === "true" ||
    process.env.PLAYWRIGHT_TEST === "true" ||
    process.env.PLAYWRIGHT_TEST === "1";
  if (!isHarness) {
    process.env.NODE_ENV = "production";
  } else if (!process.env.NODE_ENV || process.env.NODE_ENV === "production") {
    process.env.NODE_ENV = "test";
  }

  // PROXY HEADERS: Fix for "Too Many Requests" issue & Header mismatches
  process.env.ADDRESS_HEADER = "x-forwarded-for";
  process.env.PROTOCOL_HEADER = "x-forwarded-proto";
  process.env.HOST_HEADER = "host";

  // Plesk Passenger provides the PORT environment variable
  const port = process.env.PORT || "4173";

  // Create and start the HTTP server
  const server = http.createServer((req, res) => {
    if (process.env.DEBUG_HEADERS) {
      console.log(`[SveltyCMS] Request: ${req.method} ${req.url}`);
      console.log("[SveltyCMS] Headers:", JSON.stringify(req.headers));
    }
    handler(req, res);
  });

  server.listen(port, () => {
    console.log(`[SveltyCMS] Server listening on port ${port}`);
  });

  // Handle signals for graceful shutdown
  process.on("SIGTERM", () => {
    server.close();
  });
  process.on("SIGINT", () => {
    server.close();
  });
}

loadApp().catch((err) => {
  console.error("[SveltyCMS] CRITICAL: Failed to start server:", err);
  process.exit(1);
});
