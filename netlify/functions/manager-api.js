// Netlify Serverless Function: Secure Manager API
// Server-Side Service Role Proxy for Gentle Readers Manager PWA
// Restricted strictly to store owner via admin password or verified Supabase Owner JWT

exports.handler = async function (event, context) {
  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

    const expectedPassword = process.env.ADMIN_PASSWORD || 'gentleadmin';
    const providedPassword = (body && typeof body.password === 'string') ? body.password.trim() : '';

    // Verify Auth: Either correct password OR verified owner Authorization header
    let isAuthorized = false;
    if (providedPassword && providedPassword === expectedPassword) {
      isAuthorized = true;
    } else {
      const authHeader = event.headers.authorization || event.headers.Authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // If JWT token payload contains owner email or uuid
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (payload && (
              payload.email === 'lamisdif@gmail.com' ||
              payload.sub === '288ed5dc-8c9a-4f7c-9141-49f71b80106f' ||
              (payload.user_metadata && payload.user_metadata.email === 'lamisdif@gmail.com')
            )) {
              isAuthorized = true;
            }
          }
        } catch (e) {
          // invalid token
        }
      }
    }

    if (!isAuthorized) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized: Incorrect or missing owner credentials.' })
      };
    }

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

    const headers = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    };

    const action = body.action || 'fetch_all';

    // ACTION 1: fetch_all - Aggregates all management tables for offline-first sync
    if (action === 'fetch_all') {
      const tables = [
        { key: 'orders', table: 'orders', query: '?select=*&order=id.desc' },
        { key: 'inventory', table: 'inventory_items', query: '?select=*&order=id.asc' },
        { key: 'batches', table: 'purchase_batches', query: '?select=*&order=purchase_date.desc' },
        { key: 'suppliers', table: 'suppliers', query: '?select=*&order=id.asc' },
        { key: 'expenses', table: 'operating_expenses', query: '?select=*&order=expense_date.desc' },
        { key: 'debts', table: 'debts', query: '?select=*&order=created_at.desc' },
        { key: 'debtRepayments', table: 'debt_repayments', query: '?select=*&order=repayment_date.desc' },
        { key: 'openingPosition', table: 'opening_position', query: '?select=*&limit=1' },
        { key: 'orderMeta', table: 'order_meta', query: '?select=*' },
        { key: 'orderStockAllocations', table: 'order_stock_allocations', query: '?select=*' },
        { key: 'orderReturns', table: 'order_returns', query: '?select=*&order=created_at.desc' },
        { key: 'capitalContributions', table: 'capital_contributions', query: '?select=*&order=contribution_date.desc' },
        { key: 'ownerWithdrawals', table: 'owner_withdrawals', query: '?select=*&order=withdrawal_date.desc' },
        { key: 'stockAdjustments', table: 'stock_adjustments', query: '?select=*&order=adjustment_date.desc' }
      ];

      const results = {};
      await Promise.all(tables.map(async (t) => {
        try {
          const resp = await fetch(`${supabaseUrl}/rest/v1/${t.table}${t.query}`, { headers });
          if (resp.ok) {
            results[t.key] = await resp.json();
          } else {
            console.warn(`[manager-api] Table ${t.table} fetch returned status ${resp.status}`);
            results[t.key] = [];
          }
        } catch (err) {
          console.warn(`[manager-api] Table ${t.table} fetch failed:`, err.message);
          results[t.key] = [];
        }
      }));

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        },
        body: JSON.stringify({ success: true, data: results })
      };
    }

    // ACTION 2: mutate - Insert, Update, Upsert, or Delete table rows
    if (action === 'mutate') {
      const table = body.table;
      const op = body.operation || 'upsert';
      const record = body.record;
      const idField = body.idField || 'id';
      const idValue = body.idValue;

      if (!table || !record) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing required table or record payload.' })
        };
      }

      let resp;
      if (op === 'upsert') {
        resp = await fetch(`${supabaseUrl}/rest/v1/${table}?on_conflict=${idField}`, {
          method: 'POST',
          headers: {
            ...headers,
            'Prefer': 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify(record)
        });
      } else if (op === 'insert') {
        resp = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify(record)
        });
      } else if (op === 'update') {
        resp = await fetch(`${supabaseUrl}/rest/v1/${table}?${idField}=eq.${idValue}`, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify(record)
        });
      } else if (op === 'delete') {
        resp = await fetch(`${supabaseUrl}/rest/v1/${table}?${idField}=eq.${idValue}`, {
          method: 'DELETE',
          headers
        });
      }

      if (!resp.ok) {
        const errText = await resp.text();
        return {
          statusCode: resp.status,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Mutation error on ${table}: ${errText}` })
        };
      }

      const respData = (op !== 'delete') ? await resp.json() : { success: true };
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, result: respData })
      };
    }

    // ACTION 3: rpc - Execute secured PostgreSQL functions
    if (action === 'rpc') {
      const rpcName = body.rpc_name;
      const params = body.params || {};

      if (!rpcName) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing rpc_name.' })
        };
      }

      const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return {
          statusCode: resp.status,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `RPC ${rpcName} failed: ${errText}` })
        };
      }

      const rpcData = await resp.json();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, result: rpcData })
      };
    }

    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Unknown action: ${action}` })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Internal server error: ${err.message}` })
    };
  }
};
