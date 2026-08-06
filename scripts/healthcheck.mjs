const baseUrl = process.env.HEALTHCHECK_URL ?? "http://127.0.0.1:3333";
const response = await fetch(new URL("/health/ready", baseUrl), {
  signal: AbortSignal.timeout(5000),
});
if (!response.ok) {
  throw new Error(`Readiness check failed with HTTP ${response.status}.`);
}
const payload = await response.json();
if (payload.status !== "ready") throw new Error("API is not ready.");
process.stdout.write("API readiness check passed.\n");
