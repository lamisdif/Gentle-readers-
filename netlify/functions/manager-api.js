// Netlify Serverless Function: Secure Manager API
// Server-Side Service Role Proxy for Gentle Readers Manager PWA
// Restricted strictly to store owner via server-validated password OR Supabase Auth verified Owner JWT

const OWNER_EMAIL = 'lamisdif@gmail.com';
const OWNER_UUID = '288ed5dc-8c9a-4f7c-9141-49f71b80106f';

const ALLOWED_TABLES = new Set([
  'inventory_items',
  'purchase_batches',
  'suppliers',
  'operating_expenses',
  'debts',
  'debt_repayments',
  'opening_position',
  'order_meta',
  'order_stock_allocations',
  'order_returns',
  'capital_contributions',
  'owner_withdrawals',
  'stock_adjustments'
]);

const ALLOWED_RPCS = new Set([
  'update_order_operational_meta',
  'transition_order_fulfillment_status',
  'reserve_order_stock',
  'confirm_order_delivery',
  'cancel_order',
  'record_order_return',
  'normalize_book_title'
]);

function jsonResponse(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  };
}

function sanitizeRecordServerSide(table, op, rawRecord) {
  if (!rawRecord || typeof rawRecord !== 'object') return rawRecord;
  const clean = { ...rawRecord };
  if (table === 'inventory_items') {
    delete clean.purchase_cost_da;
    delete clean.quantity_on_hand;
    delete clean.quantity_available;
    if (op === 'update') delete clean.id;
  } else if (table === 'debts') {
    delete clean.amount_repaid_da;
    delete clean.remaining_balance_da;
    if (op === 'update') delete clean.id;
  } else if (op === 'update') {
    delete clean.id;
    if (table === 'order_meta') delete clean.order_id;
  }
  return clean;
}

exports.handler = async function (event) {
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
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      body = {};
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://fsximdllrhglabxbqvay.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return jsonResponse(500, {
        error: 'Configuration Error: SUPABASE_SERVICE_ROLE_KEY is not configured in Netlify environment variables.'
      });
    }

    const expectedPassword = process.env.ADMIN_PASSWORD || 'gentleadmin';
    const providedPassword = (body && typeof body.password === 'string') ? body.password.trim() : '';

    // Verify Owner Auth: either server-side password OR cryptographically verified Supabase Owner JWT
    let isAuthorized = false;
    if (providedPassword && providedPassword === expectedPassword) {
      isAuthorized = true;
    } else {
      const authHeader = event.headers.authorization || event.headers.Authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        if (token) {
          try {
            const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
              headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${token}`
              }
            });
            if (userResp.ok) {
              const user = await userResp.json();
              const email = String(user?.email || user?.user_metadata?.email || '').trim().toLowerCase();
              const userName = String(user?.user_metadata?.user_name || user?.user_metadata?.preferred_username || '').trim().toLowerCase();
              if (user?.id === OWNER_UUID || email === OWNER_EMAIL || userName === 'lamisdif') {
                isAuthorized = true;
              }
            }
          } catch (e) {
            isAuthorized = false;
          }
        }
      }
    }

    if (!isAuthorized) {
      return jsonResponse(401, { error: 'Unauthorized: Incorrect or missing owner credentials.' });
    }

    const headers = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    };

    const action = body.action || 'fetch_all';

    if (action === 'verify_auth') {
      return jsonResponse(200, { success: true, authorized: true });
    }

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
          results[t.key] = resp.ok ? await resp.json() : [];
        } catch (err) {
          console.warn(`[manager-api] Table ${t.table} fetch failed:`, err.message);
          results[t.key] = [];
        }
      }));

      return jsonResponse(200, { success: true, data: results });
    }

    if (action === 'mutate') {
      const table = body.table;
      const op = body.operation || 'upsert';
      const idField = body.idField || 'id';
      const idValue = body.idValue;

      if (!table || !ALLOWED_TABLES.has(table)) {
        return jsonResponse(400, { error: `Table "${table}" is not permitted for direct mutation.` });
      }
      if (op !== 'delete' && !body.record) {
        return jsonResponse(400, { error: 'Missing required record payload.' });
      }

      const cleanRecord = sanitizeRecordServerSide(table, op, body.record);
      let resp;

      if (op === 'upsert') {
        resp = await fetch(`${supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(idField)}`, {
          method: 'POST',
          headers: {
            ...headers,
            'Prefer': 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify(cleanRecord)
        });
      } else if (op === 'insert') {
        resp = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify(cleanRecord)
        });
      } else if (op === 'update') {
        resp = await fetch(`${supabaseUrl}/rest/v1/${table}?${encodeURIComponent(idField)}=eq.${encodeURIComponent(idValue)}`, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify(cleanRecord)
        });
      } else if (op === 'delete') {
        resp = await fetch(`${supabaseUrl}/rest/v1/${table}?${encodeURIComponent(idField)}=eq.${encodeURIComponent(idValue)}`, {
          method: 'DELETE',
          headers
        });
      } else {
        return jsonResponse(400, { error: `Unsupported operation: ${op}` });
      }

      if (!resp.ok) {
        const errText = await resp.text();
        return jsonResponse(resp.status, { error: `Mutation error on ${table}: ${errText}` });
      }

      const respData = (op !== 'delete') ? await resp.json() : { success: true };
      return jsonResponse(200, { success: true, result: respData });
    }

    if (action === 'rpc') {
      const rpcName = body.rpc_name;
      const params = body.params || {};

      if (!rpcName || !ALLOWED_RPCS.has(rpcName)) {
        return jsonResponse(400, { error: `RPC "${rpcName}" is not permitted.` });
      }

      const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return jsonResponse(resp.status, { error: `RPC ${rpcName} failed: ${errText}` });
      }

      const rpcData = await resp.json();
      return jsonResponse(200, { success: true, result: rpcData });
    }

    return jsonResponse(400, { error: `Unknown action: ${action}` });
  } catch (err) {
    return jsonResponse(500, { error: `Internal server error: ${err.message}` });
  }
};
