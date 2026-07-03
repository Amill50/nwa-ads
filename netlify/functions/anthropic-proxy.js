// Server-side proxy for Anthropic API calls.
//
// The browser can never call api.anthropic.com directly — Anthropic's API
// does not send CORS headers, and an API key must never be exposed
// client-side. This function runs on Netlify's servers, holds the real
// ANTHROPIC_API_KEY as a secret env var, and forwards the request.
//
// Set ANTHROPIC_API_KEY in Netlify: Site settings → Environment variables.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on the server' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { model, max_tokens, messages } = body;
  if (!model || !messages) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: model, messages' }) };
  }

  try {
    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens: max_tokens || 600, messages })
    });

    const data = await anthropicResp.json();

    return {
      statusCode: anthropicResp.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to reach Anthropic API', detail: err.message })
    };
  }
};
