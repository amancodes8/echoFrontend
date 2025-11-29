// api/gemini-chat.js
// Deploy on Vercel (Node serverless function).
export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // Basic body validation
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "invalid_request", detail: "missing messages array" });
  }

  // Basic rate-limiting hint (stateless): You should add a true rate-limiter (Redis, Cloudflare, etc.)
  // Optionally check an API key or origin header here.
  const PROVIDER_URL = process.env.PROVIDER_URL; // e.g. "https://api.your-llm.com/v1/chat"
  const PROVIDER_KEY = process.env.GEMINI_API_KEY; // server-only secret
  if (!PROVIDER_URL || !PROVIDER_KEY) {
    return res.status(500).json({ error: "server_misconfigured", detail: "provider url/key missing" });
  }

  try {
    const providerResp = await fetch(PROVIDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Use whatever header your provider expects. Common options:
        // "Authorization": `Bearer ${PROVIDER_KEY}`
        // or "x-api-key": PROVIDER_KEY
        "Authorization": `Bearer ${PROVIDER_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });

    const data = await providerResp.text();
    // Try parse JSON, but if provider returns text forward it too
    try {
      const json = JSON.parse(data);
      return res.status(providerResp.status).json(json);
    } catch {
      return res.status(providerResp.status).send(data);
    }
  } catch (err) {
    console.error("proxy error", err);
    return res.status(502).json({ error: "upstream_error", detail: String(err) });
  }
}
