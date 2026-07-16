// Returns a JSON digest of recent campaigns from Supabase.
// GET /.netlify/functions/leads-digest?key=<LEAD_ALERT_SECRET>&hours=24
//
// Required env vars:
//   LEAD_ALERT_SECRET         — same secret used by lead-alert.js
//   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
//
// The Supabase project URL is hardcoded because it is not a secret and
// never changes for this project.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://etytgvxkjqjnriflktzv.supabase.co';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const secret = process.env.LEAD_ALERT_SECRET;
  const { key, hours: hoursParam } = event.queryStringParameters || {};
  if (!secret || key !== secret) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }),
    };
  }

  const hours = Math.min(Math.max(parseInt(hoursParam, 10) || 24, 1), 168);
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  const sb = createClient(SUPABASE_URL, serviceKey);

  const { data, error } = await sb
    .from('campaigns')
    .select('id, company_name, contact_email, goal, budget, status, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }

  const rows = data || [];

  // Totals
  const countByStatus = {};
  let budgetSum = 0;
  for (const row of rows) {
    countByStatus[row.status] = (countByStatus[row.status] || 0) + 1;
    if (row.budget) budgetSum += Number(row.budget);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      since,
      new_leads: rows,
      totals: {
        count: rows.length,
        by_status: countByStatus,
        budget_sum: budgetSum,
      },
    }),
  };
};
