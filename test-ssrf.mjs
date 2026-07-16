import { safeFetch } from "./lib/ssrf-guard.ts";

async function test(url) {
  try {
    const result = await safeFetch(url);
    console.log(`❌ NOT BLOCKED: ${url} -> status ${result.status}`);
  } catch (err) {
    console.log(`✅ BLOCKED: ${url} -> ${err.message}`);
  }
}

await test("http://169.254.169.254/");
await test("http://localhost:3000/");
await test("http://127.0.0.1/");