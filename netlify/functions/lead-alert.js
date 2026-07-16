// Receives Supabase Database Webhook POSTs and forwards a human-readable
// push notification to ntfy.sh.
//
// Required env vars (Netlify → Site settings → Environment variables):
//   LEAD_ALERT_SECRET  — shared secret; set the same value in the Supabase
//                        webhook's custom header x-lead-secret
//   NTFY_TOPIC         — your ntfy.sh topic name (keep it unguessable)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const secret = process.env.LEAD_ALERT_SECRET;
  if (!secret || event.headers['x-lead-secret'] !== secret) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.error('lead-alert: NTFY_TOPIC not configured');
    return { statusCode: 200, body: 'ok (ntfy topic not configured)' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { type, record, old_record } = payload;
  if (!record) {
    return { statusCode: 400, body: 'Missing record' };
  }

  // Build title
  let title;
  if (type === 'INSERT') {
    title = record.status === 'draft' ? '📝 New proposal draft' : '🔔 New campaign request';
  } else if (type === 'UPDATE') {
    const oldStatus = (old_record || {}).status || '?';
    const newStatus = record.status || '?';
    title = `🔄 Campaign status: ${oldStatus} → ${newStatus}`;
  } else {
    return { statusCode: 200, body: 'ok (ignored event type)' };
  }

  const screenCount = Object.keys(record.cart || {}).length;
  const who = record.company_name || record.contact_email || '(unknown)';
  const budget = record.budget ? `$${Number(record.budget).toLocaleString()}` : '—';

  const body = [
    `Company: ${who}`,
    `Goal: ${record.goal || '—'}`,
    `Budget: ${budget}`,
    `Screens: ${screenCount}`,
    `ID: ${record.id}`,
  ].join('\n');

  const isHighPriority = type === 'INSERT' && record.status !== 'draft';

  try {
    const resp = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Title': title,
        'Priority': isHighPriority ? 'high' : 'default',
        'Tags': 'moneybag',
      },
      body,
    });
    if (!resp.ok) {
      console.error(`lead-alert: ntfy responded ${resp.status}`);
    }
  } catch (err) {
    console.error('lead-alert: failed to reach ntfy.sh:', err.message);
  }

  return { statusCode: 200, body: 'ok' };
};
