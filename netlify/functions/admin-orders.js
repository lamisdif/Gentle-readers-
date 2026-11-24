// Netlify Serverless Function: Secure Admin Orders Access
// Bypasses RLS strictly on the server side using the Supabase Service Role Key
// Validates admin password against environment variable before returning data

exports.handler = async function (event, context) {
  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      body = {};
    }

    // 1. Strict Password Verification
    const expectedPassword = process.env.ADMIN_PASSWORD || 'gentleadmin';
    const providedPassword = (body && typeof body.password === 'string') ? body.password.trim() : '';

    if (!providedPassword || providedPassword !== expectedPassword) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized: Incorrect or missing admin password.' })
      };
    }

    // 2. Supabase Service Role Credentials (Server-Side Only)
    const supabaseUrl = process.env.SUPABASE_URL || 'https://fsximdllrhglabxbqvay.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Configuration Error: SUPABASE_SERVICE_ROLE_KEY is not configured in Netlify environment variables.'
        })
      };
    }

    // 3. Fetch Orders via Service Role (Bypasses Table RLS on Server Side Only)
    const targetUrl = `${supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc`;
    const response = await fetch(targetUrl, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Supabase database error: ${errText}` })
      };
    }

    const orders = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      },
      body: JSON.stringify({ orders: orders })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Internal server error: ${err.message}` })
    };
  }
};
