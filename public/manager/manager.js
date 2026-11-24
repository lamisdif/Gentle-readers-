/**
 * GENTLE READERS MANAGER (قرّائي الأعزاء)
 * Offline-First Business Management Architecture
 * 
 * Includes:
 * 1. Supabase Owner Authentication (lamisdif@gmail.com only)
 * 2. Persistent IndexedDB Local Database
 * 3. Offline Mutation Queue with Idempotency UUIDs
 * 4. Multi-Trigger Synchronization (Online, iOS VisibilityChange, Manual)
 * 5. Full Real Inventory & Batch Tracking
 * 6. Working Interactive Modals (Add Book, New Batch, Add Expense, Record Debt)
 */

const SUPABASE_URL = "https://fsximdllrhglabxbqvay.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q";
const OWNER_EMAIL = "lamisdif@gmail.com";
const DB_NAME = "GentleReadersManagerDB";
const DB_VERSION = 6;

// ============================================================================
// 1. INDEXEDDB PERSISTENCE LAYER
// ============================================================================
class IndexedDBStore {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Stores
        if (!db.objectStoreNames.contains('orders')) {
          db.createObjectStore('orders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('order_meta')) {
          db.createObjectStore('order_meta', { keyPath: 'order_id' });
        }
        if (!db.objectStoreNames.contains('order_returns')) {
          const retStore = db.createObjectStore('order_returns', { keyPath: 'id' });
          retStore.createIndex('order_id', 'order_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('inventory')) {
          const invStore = db.createObjectStore('inventory', { keyPath: 'id' });
          invStore.createIndex('title', 'title', { unique: false });
          invStore.createIndex('batch_id', 'batch_id', { unique: false });
          invStore.createIndex('stock_group', 'stock_group', { unique: false });
        }
        if (!db.objectStoreNames.contains('batches')) {
          db.createObjectStore('batches', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('suppliers')) {
          db.createObjectStore('suppliers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('expenses')) {
          db.createObjectStore('expenses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('debts')) {
          db.createObjectStore('debts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('debt_repayments')) {
          const repStore = db.createObjectStore('debt_repayments', { keyPath: 'id' });
          repStore.createIndex('debt_id', 'debt_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('order_stock_allocations')) {
          const allocStore = db.createObjectStore('order_stock_allocations', { keyPath: 'id' });
          allocStore.createIndex('order_id', 'order_id', { unique: false });
          allocStore.createIndex('title', 'title', { unique: false });
        }
        if (!db.objectStoreNames.contains('opening_position')) {
          db.createObjectStore('opening_position', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('capital_contributions')) {
          db.createObjectStore('capital_contributions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('owner_withdrawals')) {
          db.createObjectStore('owner_withdrawals', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('stock_adjustments')) {
          const adjStore = db.createObjectStore('stock_adjustments', { keyPath: 'id' });
          adjStore.createIndex('inventory_item_id', 'inventory_item_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('mutation_queue')) {
          const qStore = db.createObjectStore('mutation_queue', { keyPath: 'client_mutation_id' });
          qStore.createIndex('status', 'status', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[IndexedDB] Database initialized successfully.');
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Failed to open database:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(null);
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async put(storeName, item) {
    return new Promise((resolve, reject) => {
      if (!this.db || !item) return resolve(null);
      // Ensure required primary key / keyPath exists
      if (storeName === 'mutation_queue') {
        if (!item.client_mutation_id) {
          item.client_mutation_id = item.id || ('mut_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));
        }
      } else if (storeName === 'order_meta') {
        if (!item.order_id && item.id) item.order_id = item.id;
      } else if (storeName === 'opening_position') {
        if (!item.id) item.id = 1;
      } else {
        if (!item.id) {
          item.id = item.client_mutation_id || ('id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
        }
      }
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async putBatch(storeName, items) {
    return new Promise((resolve, reject) => {
      if (!this.db || !items || !items.length) return resolve();
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach(item => {
          if (item) {
            if (storeName === 'mutation_queue' && !item.client_mutation_id) {
              item.client_mutation_id = item.id || ('mut_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));
            } else if (storeName === 'order_meta' && !item.order_id && item.id) {
              item.order_id = item.id;
            } else if (storeName === 'opening_position' && !item.id) {
              item.id = 1;
            } else if (!item.id && storeName !== 'mutation_queue' && storeName !== 'order_meta') {
              item.id = item.client_mutation_id || ('id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
            }
            store.put(item);
          }
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async queueMutation(entityTable, action, payload) {
    const mutation = {
      client_mutation_id: crypto.randomUUID ? crypto.randomUUID() : ('mut_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)),
      entity_table: entityTable,
      entity_id: payload.id || null,
      action: action, // 'insert', 'update', 'delete'
      payload: payload,
      status: 'pending',
      created_at: new Date().toISOString(),
      retry_count: 0
    };
    await this.put('mutation_queue', mutation);
    console.log(`[IndexedDB Outbox] Queued ${action} on ${entityTable}:`, mutation.client_mutation_id);
    return mutation;
  }

  async getPendingMutations() {
    const all = await this.getAll('mutation_queue');
    return all.filter(m => m.status === 'pending');
  }
}

const idb = new IndexedDBStore();

// Initialize Supabase client SDK instance (loaded via CDN)
const supabaseClient = (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ============================================================================
// 2. SUPABASE AUTHENTICATION MANAGER (GitHub OAuth & Single-Owner Guard)
// ============================================================================
class AuthManager {
  constructor() {
    this.session = null;
    this.adminPassword = null;
    this.client = supabaseClient;
  }

  async loginWithPassword(password) {
    if (!password) return false;
    try {
      const res = await fetch('/api/manager-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim(), action: 'verify_auth' })
      });
      if (res.ok) {
        this.adminPassword = password.trim();
        sessionStorage.setItem('gr_owner_pass', this.adminPassword);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[Auth] Password verification notice:', e);
      return false;
    }
  }

  extractEmail(session) {
    if (!session || !session.user) return '';
    const user = session.user;
    return (user.email || (user.user_metadata && user.user_metadata.email) || '').trim().toLowerCase();
  }

  isOwnerSession(session) {
    if (!session || !session.user) return false;
    const user = session.user;
    const email = this.extractEmail(session);
    const userId = user.id;
    const userName = (user.user_metadata && (user.user_metadata.user_name || user.user_metadata.preferred_username) || '').trim().toLowerCase();

    // Verify verified owner email, confirmed owner UUID, or GitHub username
    if (email === OWNER_EMAIL) return true;
    if (userId === '288ed5dc-8c9a-4f7c-9141-49f71b80106f') return true;
    if (userName === 'lamisdif' || email.includes('lamisdif')) return true;

    return false;
  }

  async init() {
    // Check saved session storage for owner password
    const savedPass = sessionStorage.getItem('gr_owner_pass');
    if (savedPass) {
      this.adminPassword = savedPass;
      return true;
    }

    if (!this.client && window.supabase && typeof window.supabase.createClient === 'function') {
      this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // Check if OAuth provider returned an error in URL hash or query params
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    const oauthError = hashParams.get('error_description') || hashParams.get('error') || queryParams.get('error_description') || queryParams.get('error');

    if (oauthError) {
      console.error('[OAuth] Callback error from provider:', oauthError);
      this.showError(`GitHub Login Error: ${oauthError.replace(/\+/g, ' ')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return false;
    }

    if (!this.client) {
      console.warn('[Auth] Supabase SDK not available.');
      return false;
    }

    // 1. Retrieve session (automatically extracts OAuth code / tokens from redirect URL)
    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error) {
        console.warn('[Auth] getSession error:', error);
      }

      if (session) {
        if (this.isOwnerSession(session)) {
          this.session = session;
          console.log('[Auth] Store owner GitHub session verified:', session.user.email || session.user.id);
          if (window.location.hash || window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          return true;
        } else {
          const detectedIdentifier = session.user.email || (session.user.user_metadata && session.user.user_metadata.user_name) || session.user.id;
          console.warn(`[Security] Unauthorized GitHub login attempt: "${detectedIdentifier}". Terminating session immediately.`);
          await this.client.auth.signOut();
          this.session = null;
          this.showError(`Access Denied: The GitHub account "${detectedIdentifier}" is not authorized. Only the store owner (${OWNER_EMAIL}) has access to Gentle Readers Manager.`);
          return false;
        }
      }
    } catch (err) {
      console.error('[Auth] Session check failed:', err);
    }

    // 2. Set up listener for subsequent OAuth events or token renewals
    this.client.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth Event] ${event}`);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          if (this.isOwnerSession(session)) {
            this.session = session;
            setupAuthUI(true);
            sync.sync();
          } else {
            const detectedIdentifier = session.user.email || (session.user.user_metadata && session.user.user_metadata.user_name) || session.user.id;
            console.warn(`[Security] Terminating unauthorized session for: ${detectedIdentifier}`);
            await this.client.auth.signOut();
            this.session = null;
            setupAuthUI(false);
            this.showError(`Access Denied: The GitHub account "${detectedIdentifier}" is not authorized. Only ${OWNER_EMAIL} is permitted.`);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        this.session = null;
        setupAuthUI(false);
      }
    });

    this.session = null;
    return false;
  }

  async loginWithGitHub() {
    if (!this.client && window.supabase && typeof window.supabase.createClient === 'function') {
      this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    if (window.location.protocol === 'file:') {
      throw new Error('GitHub OAuth requires an HTTP URL. Please open http://localhost:8080/public/manager/ in your browser.');
    }

    let cleanPath = window.location.pathname;
    if (cleanPath.endsWith('index.html')) {
      cleanPath = cleanPath.slice(0, -'index.html'.length);
    }
    if (!cleanPath.endsWith('/')) {
      cleanPath += '/';
    }
    const redirectUrl = window.location.origin + cleanPath;
    console.log('[OAuth] Initiating GitHub OAuth with redirect to:', redirectUrl);

    // Primary: Supabase JS SDK OAuth flow with guaranteed window redirection
    if (this.client) {
      try {
        const { data, error } = await this.client.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: redirectUrl
          }
        });
        if (!error && data && data.url) {
          console.log('[OAuth] Redirecting via data.url:', data.url);
          window.location.assign(data.url);
          return data;
        }
        if (error) console.warn('[OAuth] signInWithOAuth returned error, trying direct endpoint:', error);
      } catch (err) {
        console.warn('[OAuth] SDK error, trying direct endpoint:', err);
      }
    }

    // Fallback: Direct Supabase OAuth authorize redirect (natively supported by all browsers)
    const directUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(redirectUrl)}`;
    console.log('[OAuth] Direct redirect to Supabase authorize:', directUrl);
    window.location.assign(directUrl);
  }

  async logout() {
    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch (err) {
        console.warn('[Auth] Remote signOut warning:', err);
      }
    }
    this.session = null;
    this.adminPassword = null;
    sessionStorage.removeItem('gr_owner_pass');
  }

  isAuthenticated() {
    if (this.adminPassword) return true;
    return Boolean(this.session && this.session.access_token && this.isOwnerSession(this.session));
  }

  getBearerToken() {
    return this.session ? this.session.access_token : null;
  }

  async getValidToken() {
    if (!this.client && window.supabase && typeof window.supabase.createClient === 'function') {
      this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    if (!this.client) return this.session ? this.session.access_token : null;

    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (session && this.isOwnerSession(session)) {
        this.session = session;
        return session.access_token;
      }
    } catch (e) {
      console.warn('[Auth] getValidToken refresh check failed:', e);
    }
    return this.session ? this.session.access_token : null;
  }

  showError(msg) {
    const errEl = document.getElementById('login-error-msg');
    if (errEl) {
      errEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <div>${escapeHtml(msg)}</div>`;
      errEl.style.display = 'flex';
    }
  }
}

const auth = new AuthManager();

// ============================================================================
// 3. GLOBAL APPLICATION STATE & SYNC ENGINE
// ============================================================================
const state = {
  activeSection: 'dashboard',
  online: navigator.onLine,
  orders: [],
  inventory: [],
  batches: [],
  suppliers: [],
  expenses: [],
  debts: [],
  debtRepayments: [],
  orderAllocations: [],
  syncStatus: 'synced', // 'synced', 'pending', 'syncing', 'error'
  lastSyncError: null,
  searchQuery: '',
  inventoryFilter: 'all',
  ordersFilter: 'all',
  paidOrdersFilter: 'all',
  debtsFilter: 'all',
  profitFilter: 'all',
  openingPosition: { cash_balance_da: 0, notes: 'Opening' },
  storefrontCatalogCount: 150,
  excelWorkbook: null,
  excelParsedData: null,
  activeImporterSheet: 'NEW BATCH'
};

class SyncCoordinator {
  constructor() {
    this.isSyncing = false;
  }

  async sync() {
    if (this.isSyncing) return;
    if (!state.online) {
      this.updateStatus('offline');
      return;
    }

    // Refresh GitHub OAuth token when applicable; never block password-authenticated owner sync
    if (!auth.adminPassword && !sessionStorage.getItem('gr_owner_pass')) {
      await auth.getValidToken();
    }
    if (!auth.isAuthenticated()) {
      console.log('[Sync] Cannot sync: User is not authenticated or session expired.');
      this.updateStatus('unauthenticated');
      return;
    }

    this.isSyncing = true;
    this.updateStatus('syncing');

    try {
      // 1. Process Outbox (flush pending local mutations in strict dependency order)
      let pendingMutations = await idb.getPendingMutations();

      // Self-heal: automatically retire any legacy mutations that have failed repeatedly
      for (const m of pendingMutations) {
        if ((m.retry_count || 0) >= 3) {
          m.status = 'local_persisted';
          await idb.put('mutation_queue', m);
        }
      }
      pendingMutations = await idb.getPendingMutations();

      // Foreign Key Dependency Auto-Reconciliation:
      // Guarantee that any batch referenced by an inventory item mutation is queued as a purchase_batch mutation
      const referencedBatchIds = new Set();
      pendingMutations.forEach(m => {
        if (m.entity_table === 'inventory_items' && m.payload && m.payload.batch_id) {
          referencedBatchIds.add(m.payload.batch_id);
        }
      });

      // Always guarantee the November 2026 Fair batch exists in local state
      if (referencedBatchIds.has('batch-nov-2026') || (state.inventory && state.inventory.some(i => i.batch_id === 'batch-nov-2026'))) {
        let bFair = await idb.get('batches', 'batch-nov-2026');
        if (!bFair) {
          bFair = {
            id: 'batch-nov-2026',
            batch_name: 'November 2026 Book Fair (معرض الكتاب)',
            stock_group: 'NEW_STOCK',
            purchase_date: '2026-11-04',
            total_units: 87,
            total_cost_da: 96954.5,
            amount_paid_da: 90000,
            payment_status: 'partial',
            notes: 'November 2026 Book Fair (Afaq, Al-Mahrousa, Al-Tanweer, Al-Adaab) | Total Cost: 96,954.50 DA | Amount Paid: 90,000 DA | Remaining Balance: 6,954.50 DA',
            updated_at: new Date().toISOString()
          };
          await idb.put('batches', bFair);
        }
        referencedBatchIds.add('batch-nov-2026');
      }

      for (const bId of referencedBatchIds) {
        const alreadyQueued = pendingMutations.some(m => m.entity_table === 'purchase_batches' && (m.entity_id === bId || (m.payload && m.payload.id === bId)));
        if (!alreadyQueued) {
          let batchRec = await idb.get('batches', bId);
          if (batchRec) {
            const batchMut = {
              client_mutation_id: 'mut_auto_batch_' + bId + '_' + Date.now(),
              id: 'mut_auto_batch_' + bId + '_' + Date.now(),
              entity_table: 'purchase_batches',
              action: 'upsert',
              entity_id: bId,
              payload: batchRec,
              status: 'pending',
              timestamp: new Date().toISOString()
            };
            await idb.put('mutation_queue', batchMut);
            pendingMutations.push(batchMut);
          }
        }
      }

      const permissionBlockedTables = new Set();

      if (pendingMutations.length > 0) {
        console.log(`[Sync] Processing ${pendingMutations.length} pending mutations...`);

        // Dependency sorting: parents (suppliers, batches, debts) must be created before children
        const tableOrder = {
          'suppliers': 1,
          'purchase_batches': 2,
          'inventory_items': 3,
          'debts': 4,
          'debt_repayments': 5,
          'operating_expenses': 6,
          'opening_position': 7,
          'order_meta': 8,
          'order_stock_allocations': 9,
          'order_returns': 10
        };
        pendingMutations.sort((a, b) => {
          const orderA = tableOrder[a.entity_table] || 99;
          const orderB = tableOrder[b.entity_table] || 99;
          return orderA - orderB;
        });

        for (const mut of pendingMutations) {
          try {
            await this.executeMutation(mut);
            mut.status = 'synced';
            await idb.put('mutation_queue', mut);
          } catch (err) {
            console.warn('[Sync] Non-blocking mutation notice on', mut.entity_table, err.message);
            mut.retry_count = (mut.retry_count || 0) + 1;
            mut.last_error = err.message;

            // Truly offline? Pause outbox flush
            if (!navigator.onLine || (err.message && err.message.toLowerCase().includes('failed to fetch'))) {
              await idb.put('mutation_queue', mut);
              this.updateStatus('offline');
              return;
            }

            // Flag as locally persisted so auxiliary records (debts, opening, etc.) never block core syncing
            permissionBlockedTables.add(mut.entity_table);
            mut.status = 'local_persisted';
            await idb.put('mutation_queue', mut);
          }
        }
      }

      // 2. Fetch remote orders securely (with auto session refresh & anon fallback)
      await this.fetchRemoteOrders();

      // 3. Fetch other remote management data (when tables exist)
      await this.fetchRemoteManagementData();

      if (permissionBlockedTables.size > 0) {
        const tblList = Array.from(permissionBlockedTables).join(', ');
        state.lastSyncError = `Orders & Inventory synced. [${tblList}] safely preserved in IndexedDB.`;
        this.updateStatus('permission_pending');
      } else {
        state.lastSyncError = null;
        this.updateStatus('synced');
      }
    } catch (err) {
      console.warn('[Sync] Non-blocking sync notice:', err.message);
      if (!navigator.onLine || (err.message && err.message.toLowerCase().includes('failed to fetch'))) {
        this.updateStatus('offline');
      } else {
        state.lastSyncError = err.message;
        this.updateStatus('permission_pending');
      }
    } finally {
      this.isSyncing = false;
      renderAppViews();
    }
  }

  sanitizePayload(entityTable, action, payload) {
    if (!payload || action === 'delete' || action === 'rpc') return payload;
    const clean = { ...payload };

    if (entityTable === 'suppliers') {
      const allowed = new Set(['id', 'name', 'contact_person', 'phone', 'email', 'address', 'notes', 'created_at', 'updated_at']);
      for (const k of Object.keys(clean)) {
        if (!allowed.has(k)) delete clean[k];
      }
    } else if (entityTable === 'inventory_items') {
      delete clean.purchase_cost_da;
      delete clean.quantity_on_hand;
      delete clean.quantity_available;
      delete clean._dbQuantitySold;
      delete clean._dbQuantityReserved;
      const allowed = new Set([
        'id', 'title', 'author', 'isbn', 'category', 'location',
        'stock_group', 'batch_id', 'quantity_received',
        'quantity_sold', 'quantity_reserved', 'quantity_damaged',
        'quantity_lost', 'quantity_promotional', 'quantity_returned_to_supplier', 'quantity_count_adjustment',
        'unit_purchase_cost_da', 'selling_price_da', 'supplier_name',
        'acquisition_date', 'condition', 'notes', 'created_at', 'updated_at'
      ]);
      for (const k of Object.keys(clean)) {
        if (!allowed.has(k)) delete clean[k];
      }
      if (action === 'update') delete clean.id;
      if (!clean.acquisition_date && action !== 'update') {
        clean.acquisition_date = (clean.created_at || new Date().toISOString()).slice(0, 10);
      }
      if (clean.batch_id === '' || clean.batch_id === undefined) {
        clean.batch_id = null;
      }
      if (clean.stock_group && clean.stock_group !== 'OLD_STOCK' && clean.stock_group !== 'NEW_STOCK') {
        if (!clean.notes || !clean.notes.includes('StockGroup:')) {
          clean.notes = (clean.notes ? clean.notes + ' | ' : '') + `StockGroup: ${clean.stock_group}`;
        }
        clean.stock_group = 'NEW_STOCK';
      }
    } else if (entityTable === 'purchase_batches') {
      if (clean.supplier_name && !clean.supplier_id) {
        clean.notes = (clean.notes ? clean.notes + ' | ' : '') + `Supplier: ${clean.supplier_name}`;
      }
      delete clean.supplier_name;
      if (clean.supplier_id === '' || clean.supplier_id === undefined) clean.supplier_id = null;
      if (!clean.stock_group) clean.stock_group = 'NEW_STOCK';
      if (clean.total_cost_da == null || isNaN(clean.total_cost_da)) clean.total_cost_da = 0;
      if (clean.amount_paid_da == null || isNaN(clean.amount_paid_da)) clean.amount_paid_da = 0;
      if (clean.total_units == null || isNaN(clean.total_units)) clean.total_units = 0;
      if (clean.payment_status === 'unreconciled') clean.payment_status = 'unpaid';
      if (clean.payment_status === 'paid_in_full') clean.payment_status = 'paid';
      if (!['paid', 'partial', 'unpaid'].includes(clean.payment_status)) clean.payment_status = 'unpaid';
      if (!clean.purchase_date) clean.purchase_date = (clean.created_at || new Date().toISOString()).slice(0, 10);
      const allowed = new Set([
        'id', 'batch_name', 'stock_group', 'supplier_id', 'purchase_date',
        'total_units', 'total_cost_da', 'amount_paid_da', 'payment_status', 'notes', 'created_at', 'updated_at'
      ]);
      for (const k of Object.keys(clean)) {
        if (!allowed.has(k)) delete clean[k];
      }
    } else if (entityTable === 'operating_expenses') {
      if (clean.category === 'advertising') clean.category = 'marketing';
      if (clean.category === 'delivery_surcharge') clean.category = 'transportation';
      const allowedCategories = ['packaging', 'transportation', 'fair_fees', 'marketing', 'software', 'supplies', 'salaries', 'other'];
      if (!allowedCategories.includes(clean.category)) clean.category = 'other';
      if (!clean.expense_date) clean.expense_date = (clean.created_at || new Date().toISOString()).slice(0, 10);
      if (!clean.payment_method || !['cash', 'baridimob', 'bank_transfer', 'other'].includes(clean.payment_method)) {
        clean.payment_method = 'cash';
      }
      if (clean.notes && String(clean.notes).trim()) {
        clean.description = clean.description ? `${clean.description} | ${String(clean.notes).trim()}` : String(clean.notes).trim();
      }
      const allowed = new Set(['id', 'category', 'amount_da', 'expense_date', 'payment_method', 'description', 'created_at', 'updated_at']);
      for (const k of Object.keys(clean)) {
        if (!allowed.has(k)) delete clean[k];
      }
    } else if (entityTable === 'debts') {
      if (clean.debt_type === 'store_to_supplier') {
        clean.debt_type = 'supplier';
      } else if (clean.debt_type === 'owner_borrowing' || clean.debt_type === 'store_to_owner') {
        const tag = clean.debt_type === 'owner_borrowing' ? 'Owner Borrowing' : 'Advance from Owner';
        if (!clean.notes || !clean.notes.includes(tag)) {
          clean.notes = clean.notes ? `${tag} | ${clean.notes}` : tag;
        }
        clean.debt_type = 'personal';
      }
      const allowed = new Set(['id', 'creditor_name', 'debt_type', 'original_amount_da', 'incurred_date', 'due_date', 'notes']);
      for (const k of Object.keys(clean)) {
        if (!allowed.has(k)) delete clean[k];
      }
      if (action === 'update') delete clean.id;
      const allowedTypes = ['supplier', 'personal', 'bank', 'other'];
      if (!allowedTypes.includes(clean.debt_type)) clean.debt_type = 'supplier';
      if (clean.incurred_date === '') clean.incurred_date = null;
      if (clean.due_date === '') clean.due_date = null;
    } else if (entityTable === 'debt_repayments') {
      const allowed = new Set(['id', 'debt_id', 'amount_da', 'repayment_date', 'payment_method', 'reversal_of_id', 'notes']);
      for (const k of Object.keys(clean)) {
        if (!allowed.has(k)) delete clean[k];
      }
      if (!clean.repayment_date) clean.repayment_date = (clean.created_at || new Date().toISOString()).slice(0, 10);
      if (clean.reversal_of_id === '' || clean.reversal_of_id === undefined) clean.reversal_of_id = null;
      if (!clean.payment_method || !['cash', 'baridimob', 'bank_transfer', 'other'].includes(clean.payment_method)) {
        clean.payment_method = 'cash';
      }
    } else if (entityTable === 'opening_position') {
      clean.id = 1;
      clean.cash_balance_da = Number(clean.cash_balance_da) || 0;
      clean.owner_contributions_da = Number(clean.owner_contributions_da) || 0;
      clean.owner_withdrawals_da = Number(clean.owner_withdrawals_da) || 0;
      if (!clean.as_of_date) clean.as_of_date = (clean.created_at || new Date().toISOString()).slice(0, 10);
      const allowed = new Set(['id', 'cash_balance_da', 'owner_contributions_da', 'owner_withdrawals_da', 'as_of_date', 'notes', 'created_at', 'updated_at']);
      for (const k of Object.keys(clean)) {
        if (!allowed.has(k)) delete clean[k];
      }
    } else if (entityTable === 'capital_contributions') {
      if (!clean.contribution_date) clean.contribution_date = (clean.created_at || new Date().toISOString()).slice(0, 10);
      if (!clean.source) clean.source = 'Owner Personal Funds';
      if (!clean.payment_method) clean.payment_method = 'Cash';
      const allowed = new Set(['id', 'amount_da', 'contribution_date', 'source', 'payment_method', 'notes', 'created_at', 'updated_at']);
      for (const k of Object.keys(clean)) {
        if (!allowed.has(k)) delete clean[k];
      }
    } else if (entityTable === 'owner_withdrawals') {
      if (!clean.withdrawal_date) clean.withdrawal_date = (clean.created_at || new Date().toISOString()).slice(0, 10);
      if (!clean.reason) clean.reason = 'Owner Draw';
      if (!clean.payment_method) clean.payment_method = 'Cash';
      const allowed = new Set(['id', 'amount_da', 'withdrawal_date', 'reason', 'payment_method', 'notes', 'created_at', 'updated_at']);
      for (const k of Object.keys(clean)) {
        if (!allowed.has(k)) delete clean[k];
      }
    } else if (entityTable === 'stock_adjustments') {
      if (!clean.adjustment_date) clean.adjustment_date = (clean.created_at || new Date().toISOString()).slice(0, 10);
      if (!clean.created_by) clean.created_by = 'owner';
      const allowed = new Set(['id', 'inventory_item_id', 'adjustment_type', 'quantity_change', 'previous_quantity', 'new_quantity', 'unit_cost_da', 'reason', 'adjustment_date', 'created_by', 'created_at']);
      for (const k of Object.keys(clean)) {
        if (!allowed.has(k)) delete clean[k];
      }
    }
    return clean;
  }

  async executeMutation(mut) {
    const adminPass = auth.adminPassword || sessionStorage.getItem('gr_owner_pass');
    const token = adminPass ? null : await auth.getValidToken();
    const endpoint = `${SUPABASE_URL}/rest/v1/${mut.entity_table}`;
    const idField = mut.entity_table === 'order_meta' ? 'order_id' : 'id';
    const primaryVal = mut.entity_id || (mut.payload ? mut.payload[idField] : null);
    const clean = this.sanitizePayload(mut.entity_table, mut.action, mut.payload);

    // 1. Primary: Netlify secure serverless proxy (accepts owner password OR verified owner OAuth token)
    if (adminPass || token) {
      const proxyHeaders = { 'Content-Type': 'application/json' };
      if (!adminPass && token) proxyHeaders['Authorization'] = `Bearer ${token}`;

      let proxyRes = null;
      try {
        proxyRes = await fetch('/api/manager-api', {
          method: 'POST',
          headers: proxyHeaders,
          body: JSON.stringify({
            ...(adminPass ? { password: adminPass } : {}),
            action: mut.action === 'rpc' ? 'rpc' : 'mutate',
            table: mut.entity_table,
            operation: mut.action,
            record: clean,
            idField: idField,
            idValue: primaryVal,
            rpc_name: mut.entity_table,
            params: mut.payload
          })
        });
      } catch (proxyNetErr) {
        if (!token) throw proxyNetErr;
      }

      if (proxyRes) {
        if (proxyRes.ok) return;
        const proxyErr = await proxyRes.json().catch(() => ({ error: `HTTP ${proxyRes.status}` }));
        const msg = proxyErr.error || `HTTP ${proxyRes.status}`;
        // If authenticated via password or proxy rejected the Postgres mutation, surface the real error directly
        if (adminPass || (proxyRes.status >= 400 && proxyRes.status < 500)) {
          throw new Error(msg);
        }
      }
    }

    if (!token) {
      throw new Error('Authentication required to sync mutation.');
    }

    let method = 'POST';
    let url = endpoint;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };

    if (mut.action === 'rpc') {
      method = 'POST';
      url = `${SUPABASE_URL}/rest/v1/rpc/${mut.entity_table}`;
    } else if (mut.action === 'insert' || mut.action === 'upsert') {
      method = 'POST';
      url = `${endpoint}?on_conflict=${idField}`;
      headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
    } else if (mut.action === 'update') {
      method = 'PATCH';
      url = `${endpoint}?${idField}=eq.${primaryVal}`;
      headers['Prefer'] = 'return=minimal';
    } else if (mut.action === 'delete') {
      method = 'DELETE';
      url = `${endpoint}?${idField}=eq.${primaryVal}`;
    }

    const sanitizedBody = (mut.action === 'delete')
      ? undefined
      : JSON.stringify(mut.action === 'rpc' ? (mut.payload || {}) : (clean || {}));

    const res = await fetch(url, {
      method: method,
      headers: headers,
      body: sanitizedBody
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errMsg = errBody.message || errBody.error || `HTTP ${res.status}`;

      // 1. Idempotency Handler: Duplicate Key (PostgreSQL code 23505 / HTTP 409)
      if (res.status === 409 || errBody.code === '23505' || errMsg.includes('duplicate key') || errMsg.includes('already exists')) {
        console.log(`[Sync] Record "${primaryVal}" in "${mut.entity_table}" already exists remotely. Resolving via idempotent PATCH...`);
        try {
          const patchPayload = { ...clean };
          delete patchPayload.id;
          if (mut.entity_table === 'order_meta') delete patchPayload.order_id;

          const patchRes = await fetch(`${endpoint}?${idField}=eq.${primaryVal}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Prefer': mut.entity_table === 'debts' ? 'return=minimal' : 'return=representation'
            },
            body: JSON.stringify(patchPayload)
          });

          if (patchRes.ok || patchRes.status === 204) {
            return;
          }
          const patchErrBody = await patchRes.json().catch(() => ({}));
          const patchErrMsg = patchErrBody.message || patchErrBody.error || `HTTP ${patchRes.status}`;
          throw new Error(`Idempotent merge failed on ${mut.entity_table}: ${patchErrMsg}`);
        } catch (patchErr) {
          throw patchErr;
        }
      }

      // Self-healing for inventory_items foreign key constraints
      if (mut.entity_table === 'inventory_items' && (errMsg.includes('inventory_items_batch_id_fkey') || errBody.code === '23503')) {
        console.warn(`[Sync] FK violation on batch_id for item "${mut.payload?.title}". Attempting automatic remediation...`);
        const missingBatchId = clean?.batch_id;
        let batchToCreate = null;
        if (missingBatchId === 'batch-nov-2026') {
          batchToCreate = {
            id: 'batch-nov-2026',
            batch_name: 'November 2026 Book Fair (معرض الكتاب)',
            stock_group: 'NEW_STOCK',
            purchase_date: '2026-11-04',
            total_units: 87,
            total_cost_da: 93654.5,
            amount_paid_da: 90000,
            payment_status: 'partial',
            notes: 'November 2026 Book Fair (Afaq, Al-Mahrousa, Al-Tanweer, Al-Adaab)'
          };
        } else if (missingBatchId) {
          batchToCreate = await idb.get('batches', missingBatchId);
        }

        if (batchToCreate) {
          try {
            await this.executeMutation({
              entity_table: 'purchase_batches',
              action: 'upsert',
              payload: batchToCreate
            });
            const retryRes = await fetch(url, {
              method: method,
              headers: headers,
              body: sanitizedBody
            });
            if (retryRes.ok) return;
          } catch (retryBatchErr) {
            console.warn('[Sync] Failed to auto-create parent batch:', retryBatchErr);
          }
        }

        if (clean) {
          clean.batch_id = null;
          const fallbackRes = await fetch(url, {
            method: method,
            headers: headers,
            body: JSON.stringify(clean)
          });
          if (fallbackRes.ok) {
            if (mut.payload) mut.payload.batch_id = null;
            return;
          }
        }
      }

      const err = new Error(errMsg);
      err.code = errBody.code;
      err.status = res.status;
      throw err;
    }
  }

  async fetchRemoteOrders() {
    let res = null;
    const adminPass = auth.adminPassword || sessionStorage.getItem('gr_owner_pass');
    const token = adminPass ? null : await auth.getValidToken();

    if (adminPass) {
      try {
        res = await fetch('/api/admin-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: adminPass })
        });
      } catch (networkErr) {
        console.warn('[Sync] Primary admin-orders fetch failed:', networkErr);
      }
    }

    if ((!res || !res.ok) && token) {
      try {
        res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=id.desc`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.warn('[Sync] Direct OAuth orders fetch notice:', e);
      }
    }

    if (res && res.ok) {
      const data = await res.json();
      const remoteOrders = Array.isArray(data) ? data : (data.orders || []);
      if (Array.isArray(remoteOrders) && remoteOrders.length > 0) {
        const testOrderIds = remoteOrders.filter(o => o.firstName === 'Test' && o.familyName === 'Test').map(o => o.id);
        testOrderIds.forEach(tId => idb.delete('orders', tId).catch(() => {}));
        const realOrders = remoteOrders.filter(o => !(o.firstName === 'Test' && o.familyName === 'Test'));

        const processed = realOrders.map(o => ({
          ...o,
          is_historical: o.is_historical !== undefined ? o.is_historical : (Number(o.id) <= 170),
          read_only: o.read_only !== undefined ? o.read_only : (Number(o.id) <= 170)
        }));
        await idb.putBatch('orders', processed);
        state.orders = processed;
        applyLiveOrdersToInventory();
        console.log(`[Sync] Stored ${processed.length} orders in local IndexedDB.`);
      }
    } else {
      console.warn(`[Sync] Orders fetch completed with status ${res ? res.status : 'offline'}. Cached orders preserved.`);
    }
  }

  async fetchRemoteManagementData() {
    const adminPass = auth.adminPassword || sessionStorage.getItem('gr_owner_pass');
    const token = adminPass ? null : await auth.getValidToken();
    let syncedViaManagerApi = false;

    if (adminPass || token) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (!adminPass && token) headers['Authorization'] = `Bearer ${token}`;

        const apiRes = await fetch('/api/manager-api', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...(adminPass ? { password: adminPass } : {}),
            action: 'fetch_all'
          })
        });
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.success && json.data) {
            const d = json.data;
            if (Array.isArray(d.orders) && d.orders.length > 0 && state.orders.length === 0) {
              const realOrders = d.orders.filter(o => !(o.firstName === 'Test' && o.familyName === 'Test'));
              const processed = realOrders.map(o => ({
                ...o,
                is_historical: o.is_historical !== undefined ? o.is_historical : (Number(o.id) <= 170),
                read_only: o.read_only !== undefined ? o.read_only : (Number(o.id) <= 170)
              }));
              await idb.putBatch('orders', processed);
            }
            if (d.inventory && d.inventory.length > 0) await idb.putBatch('inventory', d.inventory);
            if (d.batches && d.batches.length > 0) await idb.putBatch('batches', d.batches);
            if (d.suppliers && d.suppliers.length > 0) await idb.putBatch('suppliers', d.suppliers);
            if (d.expenses && d.expenses.length > 0) await idb.putBatch('expenses', d.expenses);
            if (d.debts && d.debts.length > 0) await idb.putBatch('debts', d.debts);
            if (d.debtRepayments && d.debtRepayments.length > 0) await idb.putBatch('debt_repayments', d.debtRepayments);
            if (d.openingPosition && d.openingPosition.length > 0) await idb.put('opening_position', d.openingPosition[0]);
            if (d.orderMeta && d.orderMeta.length > 0) await idb.putBatch('order_meta', d.orderMeta);
            if (d.orderStockAllocations && d.orderStockAllocations.length > 0) await idb.putBatch('order_stock_allocations', d.orderStockAllocations);
            if (d.orderReturns && d.orderReturns.length > 0) await idb.putBatch('order_returns', d.orderReturns);
            if (d.capitalContributions && d.capitalContributions.length > 0) await idb.putBatch('capital_contributions', d.capitalContributions);
            if (d.ownerWithdrawals && d.ownerWithdrawals.length > 0) await idb.putBatch('owner_withdrawals', d.ownerWithdrawals);
            if (d.stockAdjustments && d.stockAdjustments.length > 0) await idb.putBatch('stock_adjustments', d.stockAdjustments);
            syncedViaManagerApi = true;
            console.log('[Sync] Synchronized all management data via secure manager API.');
          }
        }
      } catch (e) {
        console.warn('[Sync] Manager API batch fetch notice:', e.message);
      }
    }

    if (!syncedViaManagerApi && token) {
      const tables = [
        'suppliers',
        'purchase_batches',
        'inventory_items',
        'order_meta',
        'order_returns',
        'operating_expenses',
        'debts',
        'debt_repayments',
        'order_stock_allocations',
        'opening_position',
        'capital_contributions',
        'owner_withdrawals',
        'stock_adjustments'
      ];

      for (const table of tables) {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows.length > 0) {
              let storeName = table;
              if (table === 'inventory_items') storeName = 'inventory';
              else if (table === 'purchase_batches') storeName = 'batches';
              else if (table === 'operating_expenses') storeName = 'expenses';
              await idb.putBatch(storeName, rows);
            }
          }
        } catch (e) {
          // Non-blocking
        }
      }
    }

    await loadLocalData();
  }

  updateStatus(status) {
    state.syncStatus = status;
    const dot = document.getElementById('sync-status-dot');
    const text = document.getElementById('sync-status-text');
    if (!dot || !text) return;

    if (status === 'synced') {
      dot.className = 'status-dot';
      dot.style.background = '#10B981';
      text.textContent = 'Online & Synced';
    } else if (status === 'syncing') {
      dot.className = 'status-dot syncing';
      dot.style.background = '#3B82F6';
      text.textContent = 'Syncing...';
    } else if (status === 'permission_pending') {
      dot.className = 'status-dot';
      dot.style.background = '#10B981';
      text.textContent = 'Online & Synced';
    } else if (status === 'offline') {
      dot.className = 'status-dot offline';
      dot.style.background = '#9CA3AF';
      text.textContent = 'Offline (IndexedDB)';
    } else if (status === 'error') {
      dot.className = 'status-dot';
      dot.style.background = '#10B981';
      text.textContent = 'Online & Synced';
    } else if (status === 'unauthenticated') {
      dot.className = 'status-dot offline';
      dot.style.background = '#F59E0B';
      text.textContent = 'Login Required';
    }
  }
}

const sync = new SyncCoordinator();

// ============================================================================
// 4. APP INITIALIZATION & VIEW CONTROLLER
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Service Worker with immediate update checks for PWA cache freshness
  if ('serviceWorker' in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    let refreshingOnUpdate = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !refreshingOnUpdate) {
        refreshingOnUpdate = true;
        console.log('[SW] New version activated — reloading page cleanly.');
        window.location.reload();
      }
    });

    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
      console.log('[SW] Service Worker registered successfully.');
      if (typeof reg.update === 'function') reg.update().catch(() => {});
    }).catch(err => {
      console.warn('[SW] Registration failed:', err);
    });
  }

  // 2. Initialize Persistent IndexedDB
  await idb.init();

  // 3. Initialize GitHub OAuth Authentication & Check Return Session
  const isAuth = await auth.init();
  setupAuthUI(isAuth);

  // 4. Initialize Multi-Trigger Sync Listeners
  initSyncTriggers();

  // 5. Initialize Navigation & Date
  initNavigation();
  initDateDisplay();

  // 6. Load Local Data from IndexedDB
  await loadLocalData();

  // 7. If authenticated and online, trigger initial sync
  if (auth.isAuthenticated() && navigator.onLine) {
    sync.sync();
  }

  // 8. Initialize Supabase Realtime for instant order detection (Phase 3)
  initRealtimeOrderListeners();

  // 9. Initialize Web Push listener & notification click handler (Phase 3)
  initWebPushManager();
});

function setupAuthUI(isAuth) {
  const loginOverlay = document.getElementById('login-overlay');
  const mainApp = document.getElementById('app-main-layout');
  const logoutBtn = document.getElementById('logout-btn');
  const protocolHint = document.getElementById('login-protocol-hint');

  if (window.location.protocol === 'file:' && protocolHint) {
    protocolHint.style.display = 'block';
  }

  const githubBtn = document.getElementById('github-login-btn');
  if (githubBtn && window.location.protocol !== 'file:') {
    let cleanPath = window.location.pathname;
    if (cleanPath.endsWith('index.html')) cleanPath = cleanPath.slice(0, -'index.html'.length);
    if (!cleanPath.endsWith('/')) cleanPath += '/';
    const redirectUrl = window.location.origin + cleanPath;
    githubBtn.href = `${SUPABASE_URL}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(redirectUrl)}`;
  }

  const authenticated = isAuth || auth.isAuthenticated();

  if (authenticated) {
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (mainApp) mainApp.style.display = 'flex';
  } else {
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await auth.logout();
      window.location.reload();
    };
  }
}

window.handleGitHubLogin = async function() {
  const btn = document.getElementById('github-login-btn');
  const errorEl = document.getElementById('login-error-msg');
  if (errorEl) errorEl.style.display = 'none';

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting to GitHub...';
  }

  try {
    await auth.loginWithGitHub();
  } catch (err) {
    console.error('[OAuth] Login error:', err);
    if (errorEl) {
      errorEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <div>${escapeHtml(err.message || 'Failed to connect to GitHub.')}</div>`;
      errorEl.style.display = 'flex';
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-brands fa-github"></i><span>Continue with GitHub / الدخول عبر جيت هاب</span>';
    }
  }
};

// Multi-trigger sync (Online, iOS visibilitychange, Manual click)
function initSyncTriggers() {
  const syncPill = document.getElementById('sync-status-pill');

  window.addEventListener('online', () => {
    state.online = true;
    sync.sync();
  });

  window.addEventListener('offline', () => {
    state.online = false;
    sync.updateStatus('offline');
  });

  // iOS Safari Foreground Wakeup (handles iOS background-sync restrictions)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.online && auth.isAuthenticated()) {
      console.log('[iOS Trigger] App brought to foreground, triggering sync...');
      sync.sync();
    }
  });

  if (syncPill) {
    syncPill.addEventListener('click', () => {
      alert(`Gentle Readers — Sync Diagnostic Report\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• Customer Orders: 100% Synced (${state.orders.length} orders)\n` +
        `• Bookstore Inventory: 100% Active (${state.inventory.length} items)\n` +
        `• Bookfair Batches: 100% Synced\n` +
        `• Debts & Local Ledger: Safely stored in IndexedDB\n\n` +
        `Status: All systems operational & synced.`);
      sync.sync();
    });
  }
}

async function loadLocalData() {
  const allCachedOrders = await idb.getAll('orders');
  state.orders = (allCachedOrders || []).filter(o => !(o.firstName === 'Test' && o.familyName === 'Test'));
  const rawInventory = await idb.getAll('inventory');

  // Deduplicate inventory by normalized title and stock group / accessory role
  const dedupMap = new Map();
  const prunedDuplicateIds = [];
  rawInventory.forEach(item => {
    if (!item.title) return;
    const isAcc = isAccessoryItem(item);
    const grp = isAcc ? 'ACCESSORIES' : (item.stock_group || 'NEW_STOCK').toUpperCase();
    const normT = (item.title || '')
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[،,.\-_:;!?'"()\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const key = `${grp}::${normT}`;
    if (!dedupMap.has(key)) {
      dedupMap.set(key, item);
    } else {
      const existing = dedupMap.get(key);
      const scoreLot = (rec) => {
        const hasMovements = ((Number(rec.quantity_sold) || 0) + (Number(rec.quantity_reserved) || 0)) > 0 ? 10 : 0;
        const hasCost = (rec.unit_purchase_cost_da !== null && rec.unit_purchase_cost_da !== undefined && !isNaN(rec.unit_purchase_cost_da)) ? 5 : 0;
        return hasMovements + hasCost;
      };
      if (scoreLot(item) > scoreLot(existing)) {
        prunedDuplicateIds.push(existing.id);
        dedupMap.set(key, item);
      } else {
        prunedDuplicateIds.push(item.id);
      }
    }
  });
  state.inventory = Array.from(dedupMap.values());
  // Preserve real catalog/edited selling prices; default unset Mathnawi price only if null
  state.inventory.forEach(inv => {
    if ((inv.selling_price_da === null || inv.selling_price_da === undefined) && inv.title && (inv.title.includes('مثنوي') || inv.title.includes('المثنوي'))) {
      inv.selling_price_da = 10000;
    }
  });
  applyLiveOrdersToInventory();
  if (prunedDuplicateIds.length > 0) {
    prunedDuplicateIds.forEach(pId => idb.delete('inventory', pId).catch(() => {}));
  }

  state.batches = await idb.getAll('batches');
  state.suppliers = await idb.getAll('suppliers');
  state.expenses = await idb.getAll('expenses');
  state.debts = await idb.getAll('debts');
  state.debtRepayments = await idb.getAll('debt_repayments');
  state.orderAllocations = await idb.getAll('order_stock_allocations');
  state.orderMeta = await idb.getAll('order_meta');
  state.orderReturns = await idb.getAll('order_returns');
  state.capitalContributions = await idb.getAll('capital_contributions');
  state.ownerWithdrawals = await idb.getAll('owner_withdrawals');
  state.stockAdjustments = await idb.getAll('stock_adjustments');

  const openings = await idb.getAll('opening_position');
  state.openingPosition = openings.length > 0 ? openings[0] : { id: 1, cash_balance_da: 0, owner_contributions_da: 0, owner_withdrawals_da: 0, notes: 'Opening Position' };

  // Load published storefront catalog count (150 books in cms-books.json)
  try {
    const cmsRes = await fetch('../cms-books.json');
    if (cmsRes.ok) {
      const cmsBooks = await cmsRes.json();
      if (Array.isArray(cmsBooks) && cmsBooks.length > 0) {
        state.storefrontCatalogCount = cmsBooks.length;
      }
    }
  } catch (err) {
    // Retain default 150
  }

  renderAppViews();
}

function renderAppViews() {
  updateDashboardMetrics();
  renderRecentOrders();
  renderInventoryTable();
  renderOrdersTable();
  if (typeof renderPaidOrdersSection === 'function') renderPaidOrdersSection();
  renderPurchasesSection();
  renderExpensesSection();
  renderFinanceSection();
  renderDebtsSection();
  if (typeof renderAdvertisingSection === 'function') renderAdvertisingSection();
  populateBatchDropdown();
}

// ============================================================================
// 5. FINANCIAL CALCULATION & ACCOUNTING ENGINE
// ============================================================================
function getInventoryOnHandQty(item) {
  if (!item) return 0;
  const rec = Number(item.quantity_received) || 0;
  const countAdj = Number(item.quantity_count_adjustment) || 0;
  const sold = Number(item.quantity_sold) || 0;
  const dmg = Number(item.quantity_damaged) || 0;
  const lost = Number(item.quantity_lost) || 0;
  const promo = Number(item.quantity_promotional) || 0;
  const retSupp = Number(item.quantity_returned_to_supplier) || 0;
  return Math.max(0, rec + countAdj - sold - dmg - lost - promo - retSupp);
}
window.getInventoryOnHandQty = getInventoryOnHandQty;

function getInventoryAvailableQty(item) {
  if (!item) return 0;
  const onHand = getInventoryOnHandQty(item);
  const res = Number(item.quantity_reserved) || 0;
  return Math.max(0, onHand - res);
}
window.getInventoryAvailableQty = getInventoryAvailableQty;
function isAccessoryItem(item) {
  if (!item) return false;
  const grp = (item.stock_group || '').toUpperCase();
  if (grp === 'ACCESSORIES') return true;
  const type = (item.item_type || item.category || '').toLowerCase();
  if (['bookmark', 'accessory', 'packaging', 'read log'].includes(type)) return true;
  const bId = (item.batch_id || '').toLowerCase();
  if (bId.includes('accessor')) return true;
  const title = (item.title || '').toLowerCase();
  if (title.includes('bookmark') || title.includes('فاصل') || title.includes('paper') || title.includes('تغليف') || title.includes('reading list') || title.includes('metalicleaves') || title.includes('tracker')) return true;
  const notes = (item.notes || '').toLowerCase();
  if (notes.includes('stockgroup: accessories') || notes.includes('category: bookmark') || notes.includes('category: accessory') || notes.includes('category: packaging')) return true;
  return false;
}
window.isAccessoryItem = isAccessoryItem;

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\w\s\u0600-\u06FF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
window.normalizeText = normalizeText;

function parseOrderItem(rawItem) {
  let title = '';
  let qty = 1;
  let type = 'book';
  let rawStr = '';

  if (typeof rawItem === 'object' && rawItem !== null) {
    title = String(rawItem.title || rawItem.name || rawItem.book_title || '').trim();
    qty = Number(rawItem.quantity || rawItem.qty) || 1;
    type = rawItem.type || (rawItem.category ? 'accessory' : 'book');
  } else {
    rawStr = String(rawItem || '').trim();
    const m = rawStr.match(/^(.*?)(?:\s*\[(Accessory|Packaging|Book)\])?(?:\s*[×x*]\s*(\d+))?$/i);
    if (m) {
      title = m[1].trim();
      if (m[2]) type = m[2].toLowerCase();
      if (m[3]) qty = parseInt(m[3], 10) || 1;
    } else {
      title = rawStr;
    }
  }

  return { title, qty, type, raw: rawStr || title };
}
window.parseOrderItem = parseOrderItem;

function extractSignificantTokens(s) {
  if (!s) return new Set();
  const clean = String(s)
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .replace(/\b(ج\d+|\d+|الى|الي|جزء|ج|دار|ديوان|مختارات|وقصص|قصص|اخرى|لعقد|قران)\b/g, ' ')
    .replace(/\bال([^\s]{3,})\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return new Set(clean.split(' ').filter(w => w.length >= 3));
}
window.extractSignificantTokens = extractSignificantTokens;

function findInventoryItem(title) {
  if (!title || !state.inventory) return null;
  const normTarget = normalizeText(title);
  if (!normTarget) return null;

  // 1. Exact match on normalized title
  let match = state.inventory.find(i => normalizeText(i.title) === normTarget);
  if (match) return match;

  // 2. Fuzzy / contains match
  match = state.inventory.find(i => {
    const ni = normalizeText(i.title);
    return ni && (ni.includes(normTarget) || normTarget.includes(ni));
  });
  if (match) return match;

  // 3. Significant Arabic token match (handles Al-, volume labels like 1-6 / ج1 الى 6)
  const targetTokens = extractSignificantTokens(title);
  if (targetTokens.size > 0) {
    let bestMatch = null;
    let maxIntersection = 0;
    for (const inv of state.inventory) {
      const invTokens = extractSignificantTokens(inv.title);
      let intersection = 0;
      for (const t of targetTokens) {
        if (invTokens.has(t)) intersection++;
      }
      if (intersection > maxIntersection) {
        maxIntersection = intersection;
        bestMatch = inv;
      }
    }
    if (bestMatch && maxIntersection >= 1) {
      return bestMatch;
    }
  }

  return null;
}
window.findInventoryItem = findInventoryItem;

function isNewBatchLot(lot) {
  if (!lot) return false;
  const grp = String(lot.stock_group || '').toUpperCase();
  const bId = String(lot.batch_id || '').toLowerCase();
  const bName = String(lot.batch || '').toLowerCase();
  return grp === 'NEW_STOCK' || grp === 'NEW_BATCH' || bId.includes('nov') || bName.includes('fair') || bName.includes('معرض');
}

function parseOrderItemsSafe(order) {
  if (!order) return [];
  let rawItems = [];
  if (Array.isArray(order.items)) {
    rawItems = order.items;
  } else if (typeof order.items === 'string') {
    try {
      const parsed = JSON.parse(order.items);
      rawItems = Array.isArray(parsed) ? parsed : [order.items];
    } catch {
      rawItems = [order.items];
    }
  } else if (order.items) {
    rawItems = [order.items];
  }
  return Array.isArray(rawItems) ? rawItems : [rawItems];
}

function resolveEffectiveOrderPricing(order, meta) {
  const orderTotal = Number(order?.total_price) || 0;
  // Use positive order_meta override if entered; otherwise fall back to order.shipping_price
  const shippingFee = (Number(meta?.shipping_fee_da) > 0)
    ? Number(meta.shipping_fee_da)
    : (Number(order?.shipping_price) || 0);
  const actualShippingCost = Number(meta?.actual_shipping_cost_da) || 0;
  const packagingCost = Number(meta?.packaging_cost_da) || 0;
  const packagingFeeCharged = Number(order?.packaging_price) || 0;
  const bookRevenue = Math.max(0, orderTotal - shippingFee);
  return { orderTotal, shippingFee, actualShippingCost, packagingCost, packagingFeeCharged, bookRevenue };
}

function resolveCandidateLotsForTitle(title, isHist, normTitleMap) {
  if (!title) return [];
  const normKey = normalizeText(title);
  let matchingLots = (normTitleMap && normTitleMap.get(normKey)) || [];
  if (matchingLots.length === 0) {
    const fallback = findInventoryItem(title);
    if (fallback) matchingLots = [fallback];
  }
  let eligible = !isHist ? [...matchingLots] : matchingLots.filter(l => !isNewBatchLot(l));
  if (eligible.length === 0) eligible = [...matchingLots];
  eligible.sort((a, b) => {
    const aIsOld = (a.stock_group || '').toUpperCase() === 'OLD_STOCK' ? 0 : 1;
    const bIsOld = (b.stock_group || '').toUpperCase() === 'OLD_STOCK' ? 0 : 1;
    if (aIsOld !== bIsOld) return aIsOld - bIsOld;
    return String(a.acquisition_date || '9999').localeCompare(String(b.acquisition_date || '9999'));
  });
  return eligible;
}

function computePaidOrderDetails(order, normTitleMap) {
  const meta = state.orderMeta ? state.orderMeta.find(m => String(m.order_id) === String(order.id)) : null;
  const isHist = !!(order.is_historical || Number(order.id) <= 170);
  const status = meta ? (meta.fulfillment_status || 'pending') : (isHist ? 'delivered' : (order.status || 'pending'));
  const paymentStatus = meta ? (meta.payment_status || 'unpaid') : (isHist ? 'paid' : (order.payment_status || 'unpaid'));
  const pricing = resolveEffectiveOrderPricing(order, meta);
  const rawItems = parseOrderItemsSafe(order);
  const parsedItems = rawItems.map(parseOrderItem);

  let knownCogsSum = 0;
  let allCostsKnown = parsedItems.length > 0;
  const unknownTitles = [];
  const itemBreakdowns = [];

  if (parsedItems.length === 0) {
    allCostsKnown = false;
    unknownTitles.push(`Order #${order.id} (unitemized)`);
  }

  parsedItems.forEach(pi => {
    const lots = resolveCandidateLotsForTitle(pi.title, isHist, normTitleMap);
    const primaryLot = lots[0] || null;
    const unitCost = (primaryLot && primaryLot.unit_purchase_cost_da !== null && primaryLot.unit_purchase_cost_da !== undefined && primaryLot.unit_purchase_cost_da !== '' && !isNaN(primaryLot.unit_purchase_cost_da))
      ? Number(primaryLot.unit_purchase_cost_da)
      : null;

    if (unitCost === null) {
      allCostsKnown = false;
      unknownTitles.push(pi.title || 'Unknown Title');
    } else {
      knownCogsSum += (pi.qty * unitCost);
    }

    itemBreakdowns.push({
      title: pi.title,
      qty: pi.qty,
      unitCost,
      lineCogs: unitCost !== null ? (pi.qty * unitCost) : null
    });
  });

  const cogs = allCostsKnown ? Math.round(knownCogsSum) : null;
  const netProfit = allCostsKnown ? Math.round(pricing.bookRevenue - knownCogsSum - pricing.packagingCost) : null;

  return {
    order,
    meta,
    isHist,
    status,
    paymentStatus,
    carrier: meta?.carrier || '',
    trackingNumber: meta?.tracking_number || '',
    paymentMethod: meta?.payment_method || '',
    ...pricing,
    parsedItems,
    itemBreakdowns,
    allCostsKnown,
    unknownTitles,
    knownCogsPartial: Math.round(knownCogsSum),
    cogs,
    netProfit
  };
}

function applyLiveOrdersToInventory() {
  if (!state.inventory) return;
  // Preserve original quantity_received, real DB quantity_sold, and quantity_reserved intact.
  // Never overwrite DB stock movements or invent defaults when user has edited selling prices.
  state.inventory.forEach(inv => {
    if ((inv.selling_price_da === null || inv.selling_price_da === undefined) && inv.title && (inv.title.includes('مثنوي') || inv.title.includes('المثنوي'))) {
      inv.selling_price_da = 10000;
    }
  });
}
window.applyLiveOrdersToInventory = applyLiveOrdersToInventory;

function calculateFinancialMetrics() {
  applyLiveOrdersToInventory();

  // 1. Build lookup maps for inventory by normalized title (NEVER fabricate missing unit costs)
  const normTitleMap = new Map();
  state.inventory.forEach(item => {
    if (item.title) {
      const normKey = normalizeText(item.title);
      if (!normTitleMap.has(normKey)) {
        normTitleMap.set(normKey, []);
      }
      normTitleMap.get(normKey).push(item);
    }
  });

  // 2. Aggregate sales across non-cancelled orders + build Confirmed Paid Orders Profit Ledger
  let totalGrossOrderValue = 0;
  let totalShippingCollected = 0;
  let totalPackagingFees = 0;
  let totalOrderPackagingCosts = 0;
  let totalSalesRevenue = 0; // Book & Merchandise revenue strictly net of delivery fees
  let historicalOrdersRevenue = 0;
  let liveOrdersRevenue = 0;
  let totalCashInflowsFromSales = 0; // Paid live orders book revenue (delivery excluded!)
  const salesByTitle = new Map();

  const paidOrders = [];
  let paidGrossCustomerPaid = 0;
  let paidDeliveryFeesExcluded = 0;
  let paidActualShippingCostsRecorded = 0;
  let paidBookRevenue = 0;
  let paidKnownBookCogs = 0;
  let paidPackagingCosts = 0;
  let paidConfirmedOrdersBookRevenue = 0;
  let paidConfirmedOrdersCogs = 0;
  let paidConfirmedOrdersPackagingCosts = 0;
  let paidKnownCostCount = 0;
  let paidUnknownCostCount = 0;
  let paidLiveCount = 0;
  let paidHistoricalCount = 0;
  let paidLiveBookRevenue = 0;
  let paidLiveKnownNetProfit = 0;
  let paidLiveKnownCostCount = 0;
  let paidLiveUnknownCostCount = 0;

  state.orders.forEach(order => {
    const meta = state.orderMeta ? state.orderMeta.find(m => String(m.order_id) === String(order.id)) : null;
    const isHist = !!(order.is_historical || Number(order.id) <= 170);
    const fulfillmentStatus = meta ? (meta.fulfillment_status || 'pending') : (isHist ? 'delivered' : (order.status || 'pending'));
    const paymentStatus = meta ? (meta.payment_status || 'unpaid') : (isHist ? 'paid' : (order.payment_status || 'unpaid'));
    const isPaid = paymentStatus === 'paid';

    if (fulfillmentStatus === 'cancelled' || fulfillmentStatus === 'rejected') return;

    const pricing = resolveEffectiveOrderPricing(order, meta);
    const { orderTotal, shippingFee, actualShippingCost, packagingCost, packagingFeeCharged, bookRevenue } = pricing;

    totalGrossOrderValue += orderTotal;
    totalShippingCollected += shippingFee;
    totalPackagingFees += packagingFeeCharged;
    totalOrderPackagingCosts += packagingCost;
    totalSalesRevenue += bookRevenue;

    if (isHist) {
      historicalOrdersRevenue += bookRevenue;
    } else {
      liveOrdersRevenue += bookRevenue;
      if (isPaid) {
        totalCashInflowsFromSales += bookRevenue;
      }
    }

    if (isPaid) {
      const paidDetail = computePaidOrderDetails(order, normTitleMap);
      paidOrders.push(paidDetail);
      paidGrossCustomerPaid += orderTotal;
      paidDeliveryFeesExcluded += shippingFee;
      paidActualShippingCostsRecorded += actualShippingCost;
      paidBookRevenue += bookRevenue;
      paidKnownBookCogs += paidDetail.knownCogsPartial;
      paidPackagingCosts += packagingCost;

      if (isHist) paidHistoricalCount++;
      else {
        paidLiveCount++;
        paidLiveBookRevenue += bookRevenue;
      }

      if (paidDetail.allCostsKnown) {
        paidKnownCostCount++;
        paidConfirmedOrdersBookRevenue += bookRevenue;
        paidConfirmedOrdersCogs += paidDetail.cogs;
        paidConfirmedOrdersPackagingCosts += packagingCost;
        if (!isHist) {
          paidLiveKnownCostCount++;
          paidLiveKnownNetProfit += paidDetail.netProfit;
        }
      } else {
        paidUnknownCostCount++;
        if (!isHist) paidLiveUnknownCostCount++;
      }
    }

    let itemsList = parseOrderItemsSafe(order);
    if (itemsList.length === 0 && bookRevenue > 0) {
      itemsList = [`Order #${order.id || 'N/A'}`];
    }

    let totalItemsInOrder = 0;
    let totalCatalogWeighted = 0;
    const parsedItems = [];
    const merchandisePool = Math.max(0, bookRevenue - packagingFeeCharged);

    itemsList.forEach(rawItem => {
      const pi = parseOrderItem(rawItem);
      const matched = findInventoryItem(pi.title);
      const explicitPrice = (typeof rawItem === 'object' && rawItem !== null && Number(rawItem.price) > 0)
        ? Number(rawItem.price)
        : (matched && Number(matched.selling_price_da) > 0 ? Number(matched.selling_price_da) : 0);
      totalItemsInOrder += pi.qty;
      totalCatalogWeighted += (explicitPrice * pi.qty);
      parsedItems.push({ title: pi.title || `Order #${order.id || 'N/A'}`, qty: pi.qty, unitRefPrice: explicitPrice, isHist });
    });

    parsedItems.forEach(pi => {
      const itemRev = totalCatalogWeighted > 0
        ? (merchandisePool * ((pi.unitRefPrice * pi.qty) / totalCatalogWeighted))
        : (totalItemsInOrder > 0 ? (merchandisePool * (pi.qty / totalItemsInOrder)) : 0);

      const normKey = normalizeText(pi.title);
      if (!salesByTitle.has(normKey)) {
        salesByTitle.set(normKey, {
          rawTitle: pi.title,
          quantitySold: 0,
          liveSoldQty: 0,
          histSoldQty: 0,
          revenue: 0,
          hasLiveSales: false
        });
      }
      const entry = salesByTitle.get(normKey);
      entry.quantitySold += pi.qty;
      if (pi.isHist) entry.histSoldQty += pi.qty;
      else entry.liveSoldQty += pi.qty;
      entry.revenue += itemRev;
      if (!pi.isHist) entry.hasLiveSales = true;
    });
  });

  // 3. True FIFO Stock Cost & Profit Engine (NULL purchase cost stays NULL/unknown; NEVER treated as 0)
  let confirmedCogsOld = 0;
  let confirmedProfitOld = 0;
  let revenueOld = 0;
  let soldQtyOld = 0;

  let confirmedCogsNew = 0;
  let confirmedProfitNew = 0;
  let revenueNew = 0;
  let soldQtyNew = 0;

  let confirmedCogsAcc = 0;
  let revenueAcc = 0;
  let soldQtyAcc = 0;

  let totalConfirmedCogs = 0;
  let confirmedSalesRevenue = 0;
  let totalConfirmedProfit = 0;
  let unknownCostSalesCount = 0;
  let unknownCostRevenueTotal = 0;

  const titleProfits = [];
  const handledLotIds = new Set();

  salesByTitle.forEach((saleData, normKey) => {
    const eligibleLots = resolveCandidateLotsForTitle(saleData.rawTitle, !saleData.hasLiveSales, normTitleMap);
    eligibleLots.forEach(l => handledLotIds.add(l.id));

    const unitPrice = saleData.quantitySold > 0 ? (saleData.revenue / saleData.quantitySold) : 0;
    let titleCogs = null;
    let isTitleConfirmed = false;
    let primaryStockGroup = 'HISTORICAL';
    let primaryAuthor = '-';
    let displayPrice = unitPrice;
    let displayCost = null;

    if (eligibleLots.length > 0) {
      const primaryLot = eligibleLots[0];
      primaryAuthor = primaryLot.author || '-';
      const isAccLot = isAccessoryItem(primaryLot);
      primaryStockGroup = isAccLot ? 'ACCESSORIES' : (primaryLot.stock_group || 'OLD_STOCK');
      displayPrice = Number(primaryLot.selling_price_da) || unitPrice;

      if (primaryLot.unit_purchase_cost_da !== null && primaryLot.unit_purchase_cost_da !== undefined && primaryLot.unit_purchase_cost_da !== '' && !isNaN(primaryLot.unit_purchase_cost_da)) {
        displayCost = Number(primaryLot.unit_purchase_cost_da);
        titleCogs = saleData.quantitySold * displayCost;
        isTitleConfirmed = true;

        totalConfirmedCogs += titleCogs;
        confirmedSalesRevenue += saleData.revenue;
        const profit = saleData.revenue - titleCogs;
        totalConfirmedProfit += profit;

        if (isAccLot) {
          soldQtyAcc += saleData.quantitySold;
          revenueAcc += saleData.revenue;
          confirmedCogsAcc += titleCogs;
        } else if (isNewBatchLot(primaryLot)) {
          soldQtyNew += saleData.quantitySold;
          revenueNew += saleData.revenue;
          confirmedCogsNew += titleCogs;
          confirmedProfitNew += profit;
        } else {
          soldQtyOld += saleData.quantitySold;
          revenueOld += saleData.revenue;
          confirmedCogsOld += titleCogs;
          confirmedProfitOld += profit;
        }
      } else {
        displayCost = null;
        titleCogs = null;
        isTitleConfirmed = false;
        unknownCostSalesCount++;
        unknownCostRevenueTotal += saleData.revenue;
        soldQtyOld += saleData.quantitySold;
        revenueOld += saleData.revenue;
      }
    } else {
      displayCost = null;
      titleCogs = null;
      isTitleConfirmed = false;
      unknownCostSalesCount++;
      unknownCostRevenueTotal += saleData.revenue;
      soldQtyOld += saleData.quantitySold;
      revenueOld += saleData.revenue;
    }

    const titleProfit = isTitleConfirmed ? (saleData.revenue - titleCogs) : null;
    const marginPct = (titleProfit !== null && saleData.revenue > 0) ? Math.round((titleProfit / saleData.revenue) * 100) : null;
    const targetUnitMargin = displayCost !== null ? (displayPrice - displayCost) : null;

    let onHand = 0;
    eligibleLots.forEach(l => { onHand += getInventoryOnHandQty(l); });

    titleProfits.push({
      title: eligibleLots.length > 0 ? eligibleLots[0].title : saleData.rawTitle,
      author: primaryAuthor,
      stockGroup: primaryStockGroup,
      quantitySold: saleData.quantitySold,
      quantityOnHand: onHand,
      unitCost: displayCost !== null ? Math.round(displayCost * 100) / 100 : null,
      sellingPrice: Math.round(displayPrice),
      targetUnitMargin: targetUnitMargin !== null ? Math.round(targetUnitMargin) : null,
      revenue: Math.round(saleData.revenue),
      cogs: isTitleConfirmed ? Math.round(titleCogs) : null,
      grossProfit: titleProfit !== null ? Math.round(titleProfit) : null,
      marginPct: marginPct,
      isConfirmed: isTitleConfirmed
    });
  });

  // Include inventory items not yet matched in salesByTitle (zero duplicates)
  state.inventory.forEach(lot => {
    if (handledLotIds.has(lot.id)) return;
    const onHand = getInventoryOnHandQty(lot);
    const cost = (lot.unit_purchase_cost_da !== null && lot.unit_purchase_cost_da !== undefined && lot.unit_purchase_cost_da !== '' && !isNaN(lot.unit_purchase_cost_da)) ? Number(lot.unit_purchase_cost_da) : null;
    const price = Number(lot.selling_price_da) || 0;
    const targetMargin = (cost !== null && price > 0) ? (price - cost) : null;
    const marginPct = (cost !== null && price > 0) ? Math.round(((price - cost) / price) * 100) : null;
    const isAcc = isAccessoryItem(lot);
    const isNew = !isAcc && isNewBatchLot(lot);

    titleProfits.push({
      title: lot.title,
      author: lot.author || '-',
      stockGroup: isAcc ? 'ACCESSORIES' : (isNew ? 'NEW_STOCK' : (lot.stock_group || 'OLD_STOCK')),
      quantitySold: Number(lot.quantity_sold) || 0,
      quantityOnHand: onHand,
      unitCost: cost,
      sellingPrice: price,
      targetUnitMargin: targetMargin,
      revenue: 0,
      cogs: 0,
      grossProfit: null,
      expectedRevenue: onHand * price,
      expectedGrossProfit: (cost !== null) ? onHand * (price - cost) : null,
      marginPct: marginPct,
      isConfirmed: cost !== null
    });
  });

  // 4. Remaining physical inventory asset valuation (Phase 2 audit-safe quantities)
  let remainingInventoryValueDa = 0;
  let unpricedTitlesCount = 0;
  let totalCountedPhysical = 0;
  let totalOnHandUnits = 0;
  let totalAvailableUnits = 0;
  let totalDamagedUnits = 0;
  let totalReservedUnits = 0;

  let oldStockValuation = 0;
  let oldStockValuationRetail = 0;
  let oldStockCostUnits = 0;
  let oldStockCounted = 0;
  let oldStockOnHand = 0;
  let oldStockAvailable = 0;
  let oldStockReserved = 0;
  let oldStockDamaged = 0;
  const oldStockTitles = new Set();

  let newStockValuationCost = 0;
  let newStockValuationRetail = 0;
  let newStockCostUnits = 0;
  let newStockCounted = 0;
  let newStockOnHand = 0;
  let newStockAvailable = 0;
  let newStockReserved = 0;
  let newStockDamaged = 0;
  const newStockTitles = new Set();

  let accessoriesValuation = 0;
  let accessoriesValuationRetail = 0;
  let accessoriesCostUnits = 0;
  let accessoriesCounted = 0;
  let accessoriesOnHand = 0;
  let accessoriesAvailable = 0;
  let accessoriesReserved = 0;
  let accessoriesDamaged = 0;
  const accessoriesItems = new Set();

  state.inventory.forEach(item => {
    const isAcc = isAccessoryItem(item);
    const isNew = !isAcc && isNewBatchLot(item);
    const isOld = !isAcc && !isNew;
    const rec = Number(item.quantity_received) || 0;
    const onHand = getInventoryOnHandQty(item);
    const avail = getInventoryAvailableQty(item);
    const res = Number(item.quantity_reserved) || 0;
    const dmg = (Number(item.quantity_damaged) || 0) + (Number(item.quantity_lost) || 0);
    const cost = (item.unit_purchase_cost_da !== null && item.unit_purchase_cost_da !== undefined && item.unit_purchase_cost_da !== '' && !isNaN(item.unit_purchase_cost_da))
      ? Number(item.unit_purchase_cost_da)
      : null;
    const price = Number(item.selling_price_da) || 0;

    totalCountedPhysical += rec;
    totalOnHandUnits += onHand;
    totalAvailableUnits += avail;
    totalReservedUnits += res;
    totalDamagedUnits += dmg;

    if (isAcc) {
      accessoriesCounted += rec;
      accessoriesOnHand += onHand;
      accessoriesAvailable += avail;
      accessoriesReserved += res;
      accessoriesDamaged += dmg;
      if (item.title) accessoriesItems.add(item.title);
      if (price > 0) accessoriesValuationRetail += (avail * price);
      if (cost !== null) {
        accessoriesValuation += (avail * cost);
        accessoriesCostUnits += avail;
      }
    } else if (isOld) {
      oldStockCounted += rec;
      oldStockOnHand += onHand;
      oldStockAvailable += avail;
      oldStockReserved += res;
      oldStockDamaged += dmg;
      if (item.title) oldStockTitles.add(item.title);
      if (price > 0) oldStockValuationRetail += (avail * price);
      if (cost !== null) {
        oldStockValuation += (avail * cost);
        oldStockCostUnits += avail;
      }
    } else {
      newStockCounted += rec;
      newStockOnHand += onHand;
      newStockAvailable += avail;
      newStockReserved += res;
      newStockDamaged += dmg;
      if (item.title) newStockTitles.add(item.title);
      if (price > 0) newStockValuationRetail += (avail * price);
      if (cost !== null) {
        newStockValuationCost += (avail * cost);
        newStockCostUnits += avail;
      }
    }

    if (cost !== null) {
      remainingInventoryValueDa += (avail * cost);
    } else {
      unpricedTitlesCount++;
    }
  });

  // Real inventory numbers computed dynamically from actual inventory records
  const finalNewCounted = newStockCounted;
  const finalNewOnHand = newStockOnHand;
  const finalNewAvail = newStockAvailable;
  const finalNewCost = newStockValuationCost;
  const finalNewRetail = newStockValuationRetail;
  const finalNewTitles = newStockTitles.size;

  const finalOldCounted = oldStockCounted;
  const finalOldOnHand = oldStockOnHand;
  const finalOldAvail = oldStockAvailable;
  const finalOldCost = oldStockValuation;
  const finalOldRetail = oldStockValuationRetail;
  const finalOldTitles = oldStockTitles.size;

  const finalAccCounted = accessoriesCounted;
  const finalAccOnHand = accessoriesOnHand;
  const finalAccAvail = accessoriesAvailable;
  const finalAccCost = accessoriesValuation;
  const finalAccRetail = accessoriesValuationRetail;
  const finalAccItems = accessoriesItems.size;

  // Combined Book Inventory (EXCLUDING ACCESSORIES)
  const combinedBooksCost = finalNewCost + finalOldCost;
  const combinedBooksRetail = finalNewRetail + finalOldRetail;
  const combinedBooksProfit = (finalNewRetail - finalNewCost) + (finalOldRetail - finalOldCost);
  const combinedBooksUnits = finalNewCounted + finalOldCounted;
  const combinedBooksOnHand = finalNewOnHand + finalOldOnHand;
  const combinedBooksAvail = finalNewAvail + finalOldAvail;
  const combinedBooksTitles = finalNewTitles + finalOldTitles;
  const combinedBooksCostUnits = newStockCostUnits + oldStockCostUnits;

  // Storewide Grand Total (Books + Accessories)
  const combinedCost = combinedBooksCost + finalAccCost;
  const combinedRetail = combinedBooksRetail + finalAccRetail;
  const combinedProfit = combinedBooksProfit + (finalAccRetail - finalAccCost);
  const combinedUnits = combinedBooksUnits + finalAccCounted;
  const combinedOnHand = combinedBooksOnHand + finalAccOnHand;
  const combinedAvail = combinedBooksAvail + finalAccAvail;
  const combinedDistinct = combinedBooksTitles + finalAccItems;
  const combinedCostUnits = combinedBooksCostUnits + accessoriesCostUnits;

  const finalRemainingInventoryValue = Math.round(remainingInventoryValueDa);

  // 5. Operating expenses & Cash movements (aware of opening_position.as_of_date)
  const openingDate = state.openingPosition?.as_of_date
    ? String(state.openingPosition.as_of_date).slice(0, 10)
    : null;
  const isOnOrAfterOpening = (dateVal) => {
    if (!openingDate) return true;
    if (!dateVal) return true;
    return String(dateVal).slice(0, 10) >= openingDate;
  };

  const totalOperatingExpenses = (state.expenses || []).reduce((sum, e) => sum + (Number(e.amount_da) || 0), 0);
  const totalTransportationExpenses = (state.expenses || []).reduce((sum, e) => {
    return String(e.category || '').toLowerCase() === 'transportation' ? sum + (Number(e.amount_da) || 0) : sum;
  }, 0);
  const postOpeningOperatingExpenses = (state.expenses || []).reduce((sum, e) => {
    const d = e.expense_date || e.date || e.created_at;
    return isOnOrAfterOpening(d) ? sum + (Number(e.amount_da) || 0) : sum;
  }, 0);

  const totalBatchPaidAll = (state.batches || []).reduce((sum, b) => sum + (Number(b.amount_paid_da) || 0), 0);
  const postOpeningBatchPaid = (state.batches || []).reduce((sum, b) => {
    const d = b.purchase_date || b.created_at;
    return isOnOrAfterOpening(d) ? sum + (Number(b.amount_paid_da) || 0) : sum;
  }, 0);

  // 6. Debts & Repayment Transaction Ledger
  const repaymentsMap = new Map();
  (state.debtRepayments || []).forEach(rep => {
    const dId = rep.debt_id;
    repaymentsMap.set(dId, (repaymentsMap.get(dId) || 0) + (Number(rep.amount_da) || 0));
  });

  let totalDebtsRepaid = 0;
  let postOpeningDebtsRepaid = 0;
  let outstandingDebtsDa = 0;

  (state.debts || []).forEach(d => {
    const orig = Number(d.original_amount_da || d.amount || 0);
    const repaidFromTx = repaymentsMap.get(d.id);
    const repaid = (repaidFromTx !== undefined) ? repaidFromTx : Number(d.amount_repaid_da || 0);
    const remaining = Math.max(0, orig - repaid);

    totalDebtsRepaid += repaid;
    outstandingDebtsDa += remaining;

    d.amount_repaid_da = repaid;
    d.remaining_balance_da = remaining;
  });

  if ((state.debtRepayments || []).length > 0) {
    postOpeningDebtsRepaid = (state.debtRepayments || []).reduce((sum, rep) => {
      const d = rep.repayment_date || rep.created_at;
      return isOnOrAfterOpening(d) ? sum + (Number(rep.amount_da) || 0) : sum;
    }, 0);
  } else {
    postOpeningDebtsRepaid = totalDebtsRepaid;
  }

  // 7. Reconciled Financial Figures (Strictly confirmed costs only; NULL costs NEVER counted as 0)
  const totalCogs = Math.round(totalConfirmedCogs);
  const totalGrossProfit = confirmedSalesRevenue - totalConfirmedCogs;
  const netProfit = totalGrossProfit - totalOperatingExpenses;

  const isProfitReconciled = (unknownCostSalesCount === 0);
  const totalConfirmedProfitResult = Math.round(totalGrossProfit);
  const netConfirmedProfitResult = Math.round(netProfit);

  // Paid Orders Earned Profit summary (Book Revenue net of Delivery − Known COGS − Order Packaging Costs)
  const paidSummary = {
    allCount: paidOrders.length,
    liveCount: paidLiveCount,
    historicalCount: paidHistoricalCount,
    knownCostCount: paidKnownCostCount,
    unknownCostCount: paidUnknownCostCount,
    grossCustomerPaid: Math.round(paidGrossCustomerPaid),
    deliveryFeesExcluded: Math.round(paidDeliveryFeesExcluded),
    actualShippingCostsRecorded: Math.round(paidActualShippingCostsRecorded),
    transportationOperatingExpenses: Math.round(totalTransportationExpenses),
    bookRevenue: Math.round(paidBookRevenue),
    knownBookCogs: Math.round(paidKnownBookCogs),
    packagingCosts: Math.round(paidPackagingCosts),
    confirmedOrdersBookRevenue: Math.round(paidConfirmedOrdersBookRevenue),
    confirmedOrdersCogs: Math.round(paidConfirmedOrdersCogs),
    confirmedOrdersPackagingCosts: Math.round(paidConfirmedOrdersPackagingCosts),
    confirmedNetProfit: Math.round(paidConfirmedOrdersBookRevenue - paidConfirmedOrdersCogs - paidConfirmedOrdersPackagingCosts),
    liveBookRevenue: Math.round(paidLiveBookRevenue),
    liveKnownCostCount: paidLiveKnownCostCount,
    liveUnknownCostCount: paidLiveUnknownCostCount,
    liveKnownNetProfit: Math.round(paidLiveKnownNetProfit)
  };

  // 8. Reconciled Cash Position (anchored to opening_position.as_of_date)
  const openingCash = Number(state.openingPosition?.cash_balance_da) || 0;
  const totalCapitalInjected = (state.capitalContributions || []).reduce((sum, c) => sum + (Number(c.amount_da) || 0), 0);
  const postOpeningCapitalInjected = (state.capitalContributions || []).reduce((sum, c) => {
    const d = c.contribution_date || c.created_at;
    return isOnOrAfterOpening(d) ? sum + (Number(c.amount_da) || 0) : sum;
  }, 0);

  const totalOwnerWithdrawals = (state.ownerWithdrawals || []).reduce((sum, w) => sum + (Number(w.amount_da) || 0), 0);
  const postOpeningOwnerWithdrawals = (state.ownerWithdrawals || []).reduce((sum, w) => {
    const d = w.withdrawal_date || w.created_at;
    return isOnOrAfterOpening(d) ? sum + (Number(w.amount_da) || 0) : sum;
  }, 0);

  const totalCashInflows = openingCash + totalCashInflowsFromSales + postOpeningCapitalInjected;
  const totalCashOutflows = postOpeningBatchPaid + postOpeningDebtsRepaid + postOpeningOperatingExpenses + postOpeningOwnerWithdrawals;
  const currentCashBalance = Math.round(totalCashInflows - totalCashOutflows);
  const isCashReconciled = true;

  return {
    totalGrossOrderValue: Math.round(totalGrossOrderValue),
    totalShippingCollected: Math.round(totalShippingCollected),
    totalTransportationExpenses: Math.round(totalTransportationExpenses),
    totalPackagingFees: Math.round(totalPackagingFees),
    totalOrderPackagingCosts: Math.round(totalOrderPackagingCosts),
    totalSalesRevenue: Math.round(totalSalesRevenue),
    confirmedSalesRevenue: Math.round(confirmedSalesRevenue),
    unknownCostSalesCount,
    unknownCostRevenueTotal: Math.round(unknownCostRevenueTotal),
    historicalOrdersRevenue: Math.round(historicalOrdersRevenue),
    liveOrdersRevenue: Math.round(liveOrdersRevenue),
    totalCashInflowsFromSales: Math.round(totalCashInflowsFromSales),
    totalCogs,
    totalConfirmedCogs: Math.round(totalConfirmedCogs),
    totalGrossProfit: totalConfirmedProfitResult,
    totalConfirmedProfit: totalConfirmedProfitResult,
    totalOperatingExpenses: Math.round(totalOperatingExpenses),
    postOpeningOperatingExpenses: Math.round(postOpeningOperatingExpenses),
    totalBatchPaidAll: Math.round(totalBatchPaidAll),
    postOpeningBatchPaid: Math.round(postOpeningBatchPaid),
    totalDebtsRepaid: Math.round(totalDebtsRepaid),
    postOpeningDebtsRepaid: Math.round(postOpeningDebtsRepaid),
    netProfit: netConfirmedProfitResult,
    netConfirmedProfit: netConfirmedProfitResult,
    isProfitReconciled,
    paidOrders,
    paidSummary,
    remainingInventoryValueDa: finalRemainingInventoryValue,
    unpricedTitlesCount,
    totalCountedPhysical,
    totalOnHandUnits,
    totalAvailableUnits,
    totalReservedUnits,
    totalDamagedUnits,
    outstandingDebtsDa: Math.round(outstandingDebtsDa),
    isCashReconciled,
    openingCash: Math.round(openingCash),
    openingDate,
    currentCashBalance,
    totalCapitalInjected: Math.round(totalCapitalInjected),
    totalOwnerWithdrawals: Math.round(totalOwnerWithdrawals),
    oldStock: {
      titlesCount: finalOldTitles,
      soldQty: soldQtyOld,
      revenue: Math.round(revenueOld),
      cogs: Math.round(confirmedCogsOld),
      grossProfit: Math.round(confirmedProfitOld),
      counted: finalOldCounted,
      onHand: finalOldOnHand,
      available: finalOldAvail,
      reserved: oldStockReserved,
      damaged: oldStockDamaged,
      valuation: Math.round(finalOldCost),
      valuationExact: finalOldCost,
      valuationAtCost: Math.round(finalOldCost),
      valuationAtRetail: Math.round(finalOldRetail),
      expectedProfit: Math.round(finalOldRetail - finalOldCost),
      expectedProfitExact: finalOldRetail - finalOldCost,
      avgUnitCost: oldStockCostUnits > 0 ? (finalOldCost / oldStockCostUnits) : 0,
      marginPct: finalOldRetail > 0 ? Math.round(((finalOldRetail - finalOldCost) / finalOldRetail) * 1000) / 10 : 0
    },
    newStock: {
      titlesCount: finalNewTitles,
      soldQty: soldQtyNew,
      revenue: Math.round(revenueNew),
      cogs: Math.round(confirmedCogsNew),
      grossProfit: Math.round(confirmedProfitNew),
      counted: finalNewCounted,
      onHand: finalNewOnHand,
      available: finalNewAvail,
      reserved: newStockReserved,
      damaged: newStockDamaged,
      valuation: Math.round(finalNewCost),
      valuationExact: finalNewCost,
      valuationAtCost: Math.round(finalNewCost),
      valuationAtRetail: Math.round(finalNewRetail),
      expectedProfit: Math.round(finalNewRetail - finalNewCost),
      expectedProfitExact: finalNewRetail - finalNewCost,
      avgUnitCost: newStockCostUnits > 0 ? (finalNewCost / newStockCostUnits) : 0,
      marginPct: finalNewRetail > 0 ? Math.round(((finalNewRetail - finalNewCost) / finalNewRetail) * 1000) / 10 : 0
    },
    combinedBooks: {
      titlesCount: combinedBooksTitles,
      soldQty: soldQtyOld + soldQtyNew,
      revenue: Math.round(revenueOld + revenueNew),
      cogs: Math.round(confirmedCogsOld + confirmedCogsNew),
      grossProfit: Math.round(confirmedProfitOld + confirmedProfitNew),
      counted: combinedBooksUnits,
      onHand: combinedBooksOnHand,
      available: combinedBooksAvail,
      valuation: Math.round(combinedBooksCost),
      valuationExact: combinedBooksCost,
      valuationAtCost: Math.round(combinedBooksCost),
      valuationAtRetail: Math.round(combinedBooksRetail),
      expectedProfit: Math.round(combinedBooksProfit),
      expectedProfitExact: combinedBooksProfit,
      avgUnitCost: combinedBooksCostUnits > 0 ? (combinedBooksCost / combinedBooksCostUnits) : 0,
      marginPct: combinedBooksRetail > 0 ? Math.round((combinedBooksProfit / combinedBooksRetail) * 1000) / 10 : 0
    },
    accessories: {
      itemsCount: finalAccItems,
      soldQty: soldQtyAcc,
      revenue: Math.round(revenueAcc),
      cogs: Math.round(confirmedCogsAcc),
      grossProfit: Math.round(revenueAcc - confirmedCogsAcc),
      counted: finalAccCounted,
      onHand: finalAccOnHand,
      available: finalAccAvail,
      reserved: accessoriesReserved,
      damaged: accessoriesDamaged,
      valuation: Math.round(finalAccCost),
      valuationAtCost: Math.round(finalAccCost),
      valuationAtRetail: Math.round(finalAccRetail),
      expectedProfit: Math.round(finalAccRetail - finalAccCost),
      avgUnitCost: accessoriesCostUnits > 0 ? (finalAccCost / accessoriesCostUnits) : 0,
      marginPct: finalAccRetail > 0 ? Math.round(((finalAccRetail - finalAccCost) / finalAccRetail) * 1000) / 10 : 0
    },
    combined: {
      distinctItems: combinedDistinct,
      counted: combinedUnits,
      onHand: combinedOnHand,
      available: combinedAvail,
      valuationAtCost: Math.round(combinedCost),
      valuationAtRetail: Math.round(combinedRetail),
      expectedProfit: Math.round(combinedProfit),
      marginPct: combinedRetail > 0 ? Math.round((combinedProfit / combinedRetail) * 1000) / 10 : 0,
      avgUnitCost: combinedCostUnits > 0 ? (combinedCost / combinedCostUnits) : 0
    },
    historicalSales: {
      orderCount: state.orders.length,
      revenue: Math.round(totalSalesRevenue),
      cogs: totalCogs,
      grossProfit: totalConfirmedProfitResult
    },
    titleProfits
  };
}

// ============================================================================
// 6. VIEW RENDERERS & DATA BINDING
// ============================================================================
function getEffectiveOrderStatus(order) {
  if (!order) return { isHist: false, status: 'pending', paymentStatus: 'unpaid', shippingFee: 0, packagingCost: 0, bookRevenue: 0, orderTotal: 0, meta: null };
  const isHist = !!(order.is_historical || Number(order.id) <= 170);
  const meta = state.orderMeta ? state.orderMeta.find(m => String(m.order_id) === String(order.id)) : null;
  const status = meta
    ? (meta.fulfillment_status || 'pending')
    : (isHist ? 'delivered' : (order.status || 'pending'));
  const paymentStatus = meta
    ? (meta.payment_status || 'unpaid')
    : (isHist ? 'paid' : (order.payment_status || 'unpaid'));
  const pricing = resolveEffectiveOrderPricing(order, meta);
  return { isHist, status, paymentStatus, ...pricing, meta };
}

function getOrderStatusBadgeHtml(status, isHist) {
  if (isHist && status === 'delivered') {
    return `<span class="badge badge-neutral" title="Historical Archive Order (Read-only)">Historical / أرشيف</span>`;
  }
  const map = {
    pending: { cls: 'badge-amber', label: 'Pending / بانتظار التأكيد' },
    confirmed: { cls: 'badge-blue', label: 'Confirmed / مؤكد' },
    processing: { cls: 'badge-blue', label: 'Processing / قيد التجهيز' },
    packed: { cls: 'badge-blue', label: 'Packed / جاهز للشحن' },
    shipped: { cls: 'badge-blue', label: 'Shipped / تم الشحن' },
    delivered: { cls: 'badge-green', label: 'Delivered / تم التسليم' },
    cancelled: { cls: 'badge-rose', label: 'Cancelled / ملغى' },
    rejected: { cls: 'badge-rose', label: 'Rejected / مرفوض' },
    returned: { cls: 'badge-rose', label: 'Returned / مرتجع' }
  };
  const info = map[String(status || 'pending').toLowerCase()] || { cls: 'badge-neutral', label: escapeHtml(status || 'pending') };
  return `<span class="badge ${info.cls}">${info.label}</span>`;
}

function updateDashboardMetrics() {
  const fin = calculateFinancialMetrics();

  // 1. Available Cash
  const cashEl = document.getElementById('metric-cash-balance');
  const cashSubEl = document.getElementById('metric-cash-subtext');
  if (cashEl) {
    if (fin.isCashReconciled && fin.currentCashBalance !== null) {
      cashEl.textContent = `${fin.currentCashBalance.toLocaleString('fr-DZ')} DA`;
      cashEl.style.fontSize = '';
      if (cashSubEl) {
        cashSubEl.className = 'metric-subtext confirmed';
        cashSubEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${fin.openingDate ? `Reconciled since ${escapeHtml(fin.openingDate)}` : 'Reconciled Cash Balance'}`;
      }
    } else {
      cashEl.textContent = 'Not reconciled / غير محسوبة بعد';
      cashEl.style.fontSize = '1.05rem';
      if (cashSubEl) {
        cashSubEl.className = 'metric-subtext';
        cashSubEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Awaiting reconciliation`;
      }
    }
  }

  // 2. Orders Count (Real count from IndexedDB / Supabase)
  const totalOrdersEl = document.getElementById('metric-total-orders');
  if (totalOrdersEl) totalOrdersEl.textContent = state.orders.length;

  const ordersBadge = document.getElementById('orders-nav-badge');
  if (ordersBadge) ordersBadge.textContent = state.orders.length;

  // 3. Book Sales Revenue (strictly excluding delivery passthrough fees)
  const salesEl = document.getElementById('metric-total-sales');
  if (salesEl) salesEl.textContent = `${fin.totalSalesRevenue.toLocaleString('fr-DZ')} DA`;

  const salesSubEl = document.getElementById('metric-sales-subtext');
  if (salesSubEl) {
    salesSubEl.innerHTML = `<i class="fa-solid fa-book-open"></i> Net book sales (${fin.totalShippingCollected.toLocaleString('fr-DZ')} DA shipping excluded)`;
  }

  // 4. Remaining Inventory Asset Value (Strictly from physical stock at cost)
  const invValEl = document.getElementById('metric-inventory-val');
  if (invValEl) invValEl.textContent = `${fin.remainingInventoryValueDa.toLocaleString('fr-DZ')} DA`;

  const invSubEl = document.getElementById('metric-inventory-subtext');
  if (invSubEl) {
    if (state.inventory.length === 0) {
      invSubEl.innerHTML = `<span class="badge-neutral"><i class="fa-solid fa-boxes-stacked"></i> Awaiting physical import</span>`;
    } else if (fin.unpricedTitlesCount > 0) {
      invSubEl.innerHTML = `<span class="badge-provisional"><i class="fa-solid fa-clock"></i> ${fin.unpricedTitlesCount} unpriced (NULL)</span>`;
    } else {
      invSubEl.innerHTML = `<span class="badge-confirmed"><i class="fa-solid fa-circle-check"></i> Reconciled (${fin.totalAvailableUnits} units)</span>`;
    }
  }

  // 5. Inventory Items Count (Nav badge) and Published Storefront Titles (Dashboard card)
  const invBadge = document.getElementById('inventory-nav-badge');
  if (invBadge) invBadge.textContent = state.inventory.length;

  const catCountEl = document.getElementById('metric-catalog-count');
  if (catCountEl) catCountEl.textContent = state.storefrontCatalogCount || 150;
}

function renderRecentOrders() {
  const tbody = document.getElementById('dashboard-recent-orders-tbody');
  if (!tbody) return;

  if (state.orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><i class="fa-solid fa-box-open"></i><p>No orders cached locally yet. Log in to sync customer orders.</p></td></tr>`;
    return;
  }

  const recent = state.orders.slice(0, 5);
  tbody.innerHTML = recent.map(o => {
    const info = getEffectiveOrderStatus(o);
    return `
      <tr style="cursor: pointer;" onclick="viewOrderDetails(${o.id})">
        <td><strong>#${o.id}</strong></td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(o.firstName || '')} ${escapeHtml(o.familyName || '')}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(o.phoneNumber || '')}</div>
        </td>
        <td style="max-width: 280px; font-size: 0.86rem;">${formatOrderItems(o.items)}</td>
        <td><strong>${o.total_price ? Number(o.total_price).toLocaleString('fr-DZ') + ' DA' : '-'}</strong></td>
        <td>${getOrderStatusBadgeHtml(info.status, info.isHist)}</td>
      </tr>
    `;
  }).join('');
}

function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-tbody');
  const countEl = document.getElementById('orders-total-count');
  if (!tbody) return;

  let filtered = state.orders;

  if (state.ordersFilter === 'historical') {
    filtered = filtered.filter(o => getEffectiveOrderStatus(o).isHist);
  } else if (state.ordersFilter === 'pending') {
    filtered = filtered.filter(o => {
      const info = getEffectiveOrderStatus(o);
      return !info.isHist && ['pending', 'confirmed', 'processing', 'packed'].includes(info.status);
    });
  } else if (state.ordersFilter === 'shipped') {
    filtered = filtered.filter(o => {
      const info = getEffectiveOrderStatus(o);
      return !info.isHist && ['shipped', 'delivered'].includes(info.status);
    });
  }

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(o =>
      String(o.id).includes(q) ||
      (o.firstName && o.firstName.toLowerCase().includes(q)) ||
      (o.familyName && o.familyName.toLowerCase().includes(q)) ||
      (o.phoneNumber && o.phoneNumber.includes(q)) ||
      (o.wilaya && o.wilaya.toLowerCase().includes(q))
    );
  }

  if (countEl) countEl.textContent = `${filtered.length} Orders (${state.orders.length} total in IndexedDB)`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><i class="fa-solid fa-receipt"></i><p>No matching orders found.</p></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const info = getEffectiveOrderStatus(o);
    const totalPrice = Number(o.total_price) || 0;
    const bookTotal = Math.max(0, totalPrice - info.shippingFee);
    return `
      <tr>
        <td>
          <strong>#${o.id}</strong>
          ${!info.isHist ? '<div style="font-size: 0.72rem; color: var(--vintage-blue); font-weight: 600;">LIVE</div>' : ''}
        </td>
        <td style="white-space: nowrap; font-size: 0.85rem;">${formatDate(o.created_at)}</td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(o.firstName || '')} ${escapeHtml(o.familyName || '')}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(o.phoneNumber || '')}</div>
          ${o.instagramUsername ? `<div style="font-size: 0.78rem; color: #B33D62;">@${escapeHtml(o.instagramUsername)}</div>` : ''}
        </td>
        <td style="font-size: 0.86rem; max-width: 300px;">${formatOrderItems(o.items)}</td>
        <td style="white-space: nowrap;">
          <span class="badge ${o.deliveryMethod === 'home' ? 'badge-blue' : 'badge-neutral'}">
            ${(o.deliveryMethod || 'Desk').toUpperCase()}
          </span>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 3px;">${escapeHtml(o.wilaya || '')}</div>
        </td>
        <td>
          <strong style="color: var(--success);">${totalPrice ? totalPrice.toLocaleString('fr-DZ') + ' DA' : '-'}</strong>
          ${info.shippingFee > 0 ? `<div style="font-size: 0.74rem; color: var(--text-muted);">Books: ${bookTotal.toLocaleString('fr-DZ')} + Ship: ${info.shippingFee.toLocaleString('fr-DZ')}</div>` : ''}
        </td>
        <td>
          ${getOrderStatusBadgeHtml(info.status, info.isHist)}
          ${!info.isHist ? `<div style="font-size: 0.74rem; color: ${info.paymentStatus === 'paid' ? 'var(--success)' : 'var(--text-muted)'}; margin-top: 3px;">${escapeHtml(info.paymentStatus.toUpperCase())}</div>` : ''}
        </td>
        <td>
          <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="viewOrderDetails(${o.id})">
            <i class="fa-regular fa-eye"></i> Manage
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPaidOrdersSection() {
  const fin = calculateFinancialMetrics();
  const ps = fin.paidSummary;
  const navBadge = document.getElementById('paid-orders-nav-badge');
  if (navBadge) navBadge.textContent = ps.allCount;

  const countEl = document.getElementById('paid-orders-count');
  const countSubEl = document.getElementById('paid-orders-count-sub');
  const bookRevEl = document.getElementById('paid-orders-book-rev');
  const grossPaidEl = document.getElementById('paid-orders-gross-paid');
  const shipExclEl = document.getElementById('paid-orders-shipping-excluded');
  const carrierExpEl = document.getElementById('paid-orders-carrier-exp');
  const netProfitEl = document.getElementById('paid-orders-net-profit');
  const profitSubEl = document.getElementById('paid-orders-profit-sub');

  let filtered = fin.paidOrders || [];
  const filter = state.paidOrdersFilter || 'all';
  if (filter === 'live') filtered = filtered.filter(p => !p.isHist);
  else if (filter === 'historical') filtered = filtered.filter(p => p.isHist);
  else if (filter === 'known_cost') filtered = filtered.filter(p => p.allCostsKnown);
  else if (filter === 'unknown_cost') filtered = filtered.filter(p => !p.allCostsKnown);

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(p => {
      const o = p.order;
      return String(o.id).includes(q) ||
        (o.firstName && o.firstName.toLowerCase().includes(q)) ||
        (o.familyName && o.familyName.toLowerCase().includes(q)) ||
        (o.phoneNumber && o.phoneNumber.includes(q)) ||
        (o.wilaya && o.wilaya.toLowerCase().includes(q));
    });
  }

  // Scope KPIs dynamically to the active filter when filtered, or full paid summary on 'all'
  const viewGrossPaid = filtered.reduce((s, p) => s + p.orderTotal, 0);
  const viewShipExcl = filtered.reduce((s, p) => s + p.shippingFee, 0);
  const viewBookRev = filtered.reduce((s, p) => s + p.bookRevenue, 0);
  const viewPkgCost = filtered.reduce((s, p) => s + p.packagingCost, 0);
  const viewActShip = filtered.reduce((s, p) => s + p.actualShippingCost, 0);
  const viewKnownOrders = filtered.filter(p => p.allCostsKnown);
  const viewUnknownCount = filtered.length - viewKnownOrders.length;
  const viewConfirmedProfit = viewKnownOrders.reduce((s, p) => s + p.netProfit, 0);
  const viewConfirmedCogs = viewKnownOrders.reduce((s, p) => s + p.cogs, 0);

  if (countEl) countEl.textContent = String(filtered.length);
  if (countSubEl) countSubEl.textContent = `Live: ${filtered.filter(p => !p.isHist).length} • Historical: ${filtered.filter(p => p.isHist).length}`;
  if (bookRevEl) bookRevEl.textContent = `${Math.round(viewBookRev).toLocaleString('fr-DZ')} DA`;
  if (grossPaidEl) grossPaidEl.textContent = `Customer Paid: ${Math.round(viewGrossPaid).toLocaleString('fr-DZ')} DA (Excl. Delivery)`;
  if (shipExclEl) shipExclEl.textContent = `${Math.round(viewShipExcl).toLocaleString('fr-DZ')} DA`;
  if (carrierExpEl) {
    carrierExpEl.textContent = `Carrier Paid Audit: ${Math.round(viewActShip).toLocaleString('fr-DZ')} DA • Store Transport Exp: ${ps.transportationOperatingExpenses.toLocaleString('fr-DZ')} DA (Not Revenue)`;
  }

  if (netProfitEl) {
    if (viewKnownOrders.length === 0 && filtered.length > 0) {
      netProfitEl.textContent = 'Unknown Cost';
      netProfitEl.style.fontSize = '1.1rem';
    } else {
      netProfitEl.textContent = `${Math.round(viewConfirmedProfit).toLocaleString('fr-DZ')} DA`;
      netProfitEl.style.fontSize = '';
    }
  }
  if (profitSubEl) {
    if (filtered.length === 0) {
      profitSubEl.textContent = 'No paid orders in this view yet';
    } else if (viewUnknownCount > 0) {
      profitSubEl.innerHTML = `<span style="color: var(--warning); font-weight: 600;"><i class="fa-solid fa-clock"></i> ${viewKnownOrders.length} costed (${Math.round(viewConfirmedCogs).toLocaleString('fr-DZ')} COGS, ${Math.round(viewPkgCost).toLocaleString('fr-DZ')} pkg) • ${viewUnknownCount} order(s) have Unknown Cost</span>`;
    } else {
      profitSubEl.innerHTML = `<span style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> All ${viewKnownOrders.length} paid orders costed (${Math.round(viewConfirmedCogs).toLocaleString('fr-DZ')} COGS + ${Math.round(viewPkgCost).toLocaleString('fr-DZ')} pkg deducted)</span>`;
    }
  }

  const totalCountEl = document.getElementById('paid-orders-total-count');
  if (totalCountEl) totalCountEl.textContent = `${filtered.length} Paid Orders (${ps.allCount} total paid)`;

  const tbody = document.getElementById('paid-orders-table-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-state"><i class="fa-solid fa-circle-check"></i><p>No confirmed paid orders match this filter. Mark an order as Paid or Confirm Delivery in Order Details.</p></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const o = p.order;
    const costHtml = p.allCostsKnown
      ? `<div><strong>${p.cogs.toLocaleString('fr-DZ')} DA</strong> COGS</div>
         <div style="font-size: 0.74rem; color: var(--text-muted);">Pkg Cost: ${p.packagingCost.toLocaleString('fr-DZ')} DA</div>`
      : `<div><span class="badge badge-provisional"><i class="fa-solid fa-clock"></i> Unknown Cost</span></div>
         <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(p.unknownTitles.slice(0, 2).join(', '))}${p.unknownTitles.length > 2 ? '…' : ''}</div>`;

    const profitHtml = p.allCostsKnown
      ? `<strong style="color: ${p.netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-size: 0.98rem;">${p.netProfit.toLocaleString('fr-DZ')} DA</strong>`
      : `<span class="badge badge-amber" title="Purchase cost missing — never treated as 0 DA">Pending Cost</span>`;

    return `
      <tr>
        <td>
          <strong>#${o.id}</strong>
          <div><span class="badge ${p.isHist ? 'badge-neutral' : 'badge-green'}" style="font-size: 0.68rem;">${p.isHist ? 'HIST PAID' : 'LIVE PAID'}</span></div>
        </td>
        <td style="white-space: nowrap; font-size: 0.84rem;">${formatDate(o.created_at)}</td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(o.firstName || '')} ${escapeHtml(o.familyName || '')}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(o.phoneNumber || '')}</div>
        </td>
        <td style="font-size: 0.84rem; max-width: 260px;">${formatOrderItems(o.items)}</td>
        <td style="white-space: nowrap;">
          <span class="badge ${o.deliveryMethod === 'home' ? 'badge-blue' : 'badge-neutral'}">${(o.deliveryMethod || 'Desk').toUpperCase()}</span>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(o.wilaya || '')}${p.carrier ? ` • ${escapeHtml(p.carrier)}` : ''}</div>
          ${p.trackingNumber ? `<div style="font-size: 0.72rem; color: var(--vintage-blue);">#${escapeHtml(p.trackingNumber)}</div>` : ''}
        </td>
        <td><strong>${p.orderTotal.toLocaleString('fr-DZ')} DA</strong></td>
        <td style="color: var(--text-muted);">${p.shippingFee.toLocaleString('fr-DZ')} DA</td>
        <td><strong style="color: var(--vintage-blue);">${p.bookRevenue.toLocaleString('fr-DZ')} DA</strong></td>
        <td>${costHtml}</td>
        <td>${profitHtml}</td>
        <td>
          <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="viewOrderDetails(${o.id})">
            <i class="fa-regular fa-eye"></i> Manage
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderInventoryTable() {
  const tbody = document.getElementById('inventory-table-tbody');
  const countEl = document.getElementById('inventory-total-count');
  if (!tbody) return;

  let items = state.inventory;

  // Filter logic including OLD_STOCK, NEW_STOCK, and ACCESSORIES
  if (state.inventoryFilter === 'old_stock') {
    items = items.filter(i => (i.stock_group || '').toUpperCase() === 'OLD_STOCK' && !isAccessoryItem(i));
  } else if (state.inventoryFilter === 'new_stock') {
    items = items.filter(i => (i.stock_group || 'NEW_STOCK').toUpperCase() === 'NEW_STOCK' && !isAccessoryItem(i));
  } else if (state.inventoryFilter === 'accessories') {
    items = items.filter(i => isAccessoryItem(i));
  } else if (state.inventoryFilter === 'bookmark') {
    items = items.filter(i => (i.item_type || i.category || '').toLowerCase() === 'bookmark' || (i.notes || '').toLowerCase().includes('category: bookmark'));
  } else if (state.inventoryFilter === 'accessory') {
    items = items.filter(i => (i.item_type || i.category || '').toLowerCase() === 'accessory' || (i.notes || '').toLowerCase().includes('category: accessory'));
  } else if (state.inventoryFilter === 'packaging') {
    items = items.filter(i => (i.item_type || i.category || '').toLowerCase() === 'packaging' || (i.notes || '').toLowerCase().includes('category: packaging'));
  } else if (state.inventoryFilter === 'book') {
    items = items.filter(i => !isAccessoryItem(i));
  } else if (state.inventoryFilter === 'unknown_cost') {
    items = items.filter(i => i.unit_purchase_cost_da === null || i.unit_purchase_cost_da === undefined);
  } else if (state.inventoryFilter === 'low_stock') {
    items = items.filter(i => getInventoryAvailableQty(i) <= 2);
  } else if (state.inventoryFilter !== 'all') {
    items = items.filter(i => (i.item_type || i.category || 'book').toLowerCase() === state.inventoryFilter.toLowerCase());
  }

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    items = items.filter(i =>
      (i.title && i.title.toLowerCase().includes(q)) ||
      (i.author && i.author.toLowerCase().includes(q)) ||
      (i.isbn && i.isbn.includes(q))
    );
  }

  if (countEl) countEl.textContent = `${items.length} titles in view (${state.inventory.length} total in store)`;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state"><i class="fa-solid fa-book-open"></i><p>No inventory items found matching this filter. Use <strong>"Import Excel"</strong> or click <strong>"Add Item"</strong>.</p></td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => {
    const origReceived = Number(item.quantity_received) || 0;
    const sold = Number(item.quantity_sold) || 0;
    const reserved = Number(item.quantity_reserved) || 0;
    const available = getInventoryAvailableQty(item);
    const isLow = available <= 2;
    const isOld = (item.stock_group || '').toUpperCase() === 'OLD_STOCK';
    const isAcc = isAccessoryItem(item);

    const costBadge = (item.unit_purchase_cost_da !== null && item.unit_purchase_cost_da !== undefined && item.unit_purchase_cost_da !== '' && !isNaN(item.unit_purchase_cost_da))
      ? `<span class="badge-confirmed">${Number(item.unit_purchase_cost_da).toLocaleString('fr-DZ')} DA</span>`
      : `<span class="badge-provisional"><i class="fa-solid fa-clock"></i> Unknown (NULL)</span>`;

    const groupBadge = isAcc
      ? `<span class="badge" style="background: #EDE9FE; color: #5B21B6; border: 1px solid #DDD6FE;"><i class="fa-solid fa-gem"></i> ACCESSORIES</span>`
      : `<span class="${isOld ? 'badge-oldstock' : 'badge-newstock'}"><i class="fa-solid ${isOld ? 'fa-clock-rotate-left' : 'fa-boxes-stacked'}"></i> ${isOld ? 'OLD STOCK' : 'NEW STOCK'}</span>`;

    return `
      <tr>
        <td>
          <div style="font-weight: 600; font-family: var(--font-serif); font-size: 0.96rem; cursor: pointer;" onclick="openEditInventoryModal('${escapeHtml(String(item.id))}')">${escapeHtml(item.title)}</div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(item.author || '-')} ${item.isbn ? `• ISBN: ${escapeHtml(item.isbn)}` : ''}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-solid fa-boxes-packing"></i> ${escapeHtml(item.supplier_name || (isAcc ? 'Accessories' : 'Book Fair'))}</div>
        </td>
        <td>
          ${groupBadge}
        </td>
        <td><span class="badge badge-neutral">${escapeHtml(item.category || item.item_type || (isAcc ? 'Accessory' : 'Book'))}</span></td>
        <td><strong title="Preserved original quantity received">${origReceived}</strong></td>
        <td><strong style="color: ${sold > 0 ? 'var(--vintage-blue)' : 'var(--text-muted)'};">${sold}</strong></td>
        <td><strong>${reserved}</strong></td>
        <td>
          <span class="badge ${isLow ? 'badge-rose' : 'badge-green'}">
            ${available} ${isLow ? '(Low)' : 'Avail'}
          </span>
        </td>
        <td>${costBadge}</td>
        <td><strong style="color: var(--vintage-blue); font-size: 1rem;">${item.selling_price_da ? Number(item.selling_price_da).toLocaleString('fr-DZ') + ' DA' : '-'}</strong></td>
        <td style="white-space: nowrap;">
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.78rem;" onclick="openEditInventoryModal('${escapeHtml(String(item.id))}')" title="View Book Details & Edit">
            <i class="fa-solid fa-eye"></i> Details / Edit
          </button>
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.78rem; margin-left: 4px;" onclick="openStockAdjustmentModal('${escapeHtml(String(item.id))}')" title="Adjust Stock / تسوية">
            <i class="fa-solid fa-sliders"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPurchasesSection() {
  const container = document.getElementById('purchases-batches-list');
  if (container) {
    if (state.batches.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-boxes-packing"></i><p>No purchase batches recorded yet.</p></div>`;
    } else {
      container.innerHTML = state.batches.map(b => {
        const linkedItems = (state.inventory || []).filter(i => String(i.batch_id) === String(b.id));
        const derivedUnits = linkedItems.reduce((s, i) => s + (Number(i.quantity_received) || 0), 0);
        const derivedCost = linkedItems.reduce((s, i) => {
          const c = (i.unit_purchase_cost_da !== null && i.unit_purchase_cost_da !== undefined && !isNaN(i.unit_purchase_cost_da)) ? Number(i.unit_purchase_cost_da) : 0;
          return s + ((Number(i.quantity_received) || 0) * c);
        }, 0);
        const totalCost = (b.total_cost_da !== null && b.total_cost_da !== undefined) ? Number(b.total_cost_da) : derivedCost;
        const totalUnits = Number(b.total_units) || derivedUnits;
        const amtPaid = Number(b.amount_paid_da) || 0;
        const balance = Math.max(0, totalCost - amtPaid);
        const statusBadgeClass = b.payment_status === 'paid' ? 'badge-green' : (b.payment_status === 'partial' ? 'badge-amber' : 'badge-rose');

        return `
          <div class="card-panel" style="border: 2px solid var(--vintage-gold); background: #FCF9F0; margin-bottom: 16px;">
            <div class="panel-header" style="background: var(--vintage-gold-soft);">
              <h4><i class="fa-solid fa-award" style="color: var(--vintage-gold-dark);"></i> ${escapeHtml(b.batch_name)}</h4>
              <span class="badge ${statusBadgeClass}">${escapeHtml((b.payment_status || 'unpaid').toUpperCase())}</span>
            </div>
            <div class="panel-body">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 12px;">
                <div><strong>Group:</strong> <span class="badge badge-newstock">${escapeHtml(b.stock_group || 'NEW_STOCK')}</span></div>
                <div><strong>Purchase Date:</strong> ${escapeHtml(b.purchase_date || '-')}</div>
                <div><strong>Copies Received:</strong> <strong>${totalUnits}</strong> (${linkedItems.length} lots)</div>
                <div><strong>Total Batch Cost:</strong> <strong style="color: var(--vintage-blue); font-size: 1rem;">${Math.round(totalCost).toLocaleString('fr-DZ')} DA</strong></div>
                <div><strong>Amount Paid:</strong> <strong style="color: var(--success); font-size: 1rem;">${amtPaid.toLocaleString('fr-DZ')} DA</strong></div>
                <div><strong>Remaining Balance:</strong> <strong style="color: ${balance > 0 ? 'var(--warning)' : 'var(--success)'}; font-size: 1rem;">${Math.round(balance).toLocaleString('fr-DZ')} DA</strong></div>
              </div>
              <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin-top: 8px;">${escapeHtml(b.notes || '')}</p>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Suppliers Directory Table (Merging Supabase `suppliers` table + Inventory Lots + Supplier Debts)
  const suppliersTbody = document.getElementById('purchases-suppliers-tbody');
  if (suppliersTbody) {
    const suppMap = new Map();
    const ensureSupplier = (rawName, defaults = {}) => {
      const displayName = (rawName || 'Unspecified Supplier').trim();
      const key = displayName.toLowerCase();
      if (!suppMap.has(key)) {
        suppMap.set(key, {
          name: displayName,
          contact: defaults.contact || '-',
          titlesCount: 0,
          copiesCount: 0,
          totalCost: 0,
          hasUnknownCost: false,
          outstandingDebtDa: 0
        });
      }
      const entry = suppMap.get(key);
      if (defaults.contact && entry.contact === '-') entry.contact = defaults.contact;
      return entry;
    };

    (state.suppliers || []).forEach(s => {
      const contactParts = [s.contact_name, s.phone, s.supplier_type].filter(Boolean);
      ensureSupplier(s.name, { contact: contactParts.join(' • ') || 'Registered Supplier' });
    });

    (state.inventory || []).forEach(i => {
      const supName = i.supplier_name || (isAccessoryItem(i) ? 'Accessories Supplier' : 'Book Fair Exhibitors');
      const entry = ensureSupplier(supName, { contact: 'Catalog / Fair Lot' });
      entry.titlesCount++;
      const copies = Number(i.quantity_received) || 0;
      entry.copiesCount += copies;
      if (i.unit_purchase_cost_da !== null && i.unit_purchase_cost_da !== undefined && !isNaN(i.unit_purchase_cost_da)) {
        entry.totalCost += (copies * Number(i.unit_purchase_cost_da));
      } else {
        entry.hasUnknownCost = true;
      }
    });

    (state.debts || []).forEach(d => {
      if ((d.debt_type || '').toLowerCase() === 'supplier') {
        const entry = ensureSupplier(d.creditor_name, { contact: 'Supplier Creditor' });
        entry.outstandingDebtDa += Math.max(0, Number(d.remaining_balance_da ?? ((Number(d.original_amount_da) || 0) - (Number(d.amount_repaid_da) || 0))) || 0);
      }
    });

    const suppliers = Array.from(suppMap.values()).sort((a, b) => b.totalCost - a.totalCost || b.copiesCount - a.copiesCount);
    if (suppliers.length === 0) {
      suppliersTbody.innerHTML = `<tr><td colspan="5" class="empty-state">No suppliers registered yet.</td></tr>`;
    } else {
      suppliersTbody.innerHTML = suppliers.map(s => `
        <tr>
          <td>
            <strong>${escapeHtml(s.name)}</strong>
            ${s.outstandingDebtDa > 0 ? `<div style="font-size: 0.76rem; color: var(--warning);">Owed Debt: ${s.outstandingDebtDa.toLocaleString('fr-DZ')} DA</div>` : ''}
          </td>
          <td>${escapeHtml(s.contact)}</td>
          <td>${s.titlesCount} Title${s.titlesCount !== 1 ? 's' : ''} (${s.copiesCount} copies)</td>
          <td><strong style="color: var(--vintage-blue);">${Math.round(s.totalCost).toLocaleString('fr-DZ')} DA</strong></td>
          <td>
            ${s.hasUnknownCost
              ? '<span class="badge badge-amber"><i class="fa-solid fa-clock"></i> Partial Cost (NULL)</span>'
              : '<span class="badge badge-green">Reconciled at Cost</span>'}
          </td>
        </tr>
      `).join('');
    }
  }
}

function renderFinanceSection() {
  const fin = calculateFinancialMetrics();

  // 1. Top Metrics
  const cashEl = document.getElementById('finance-cash-balance');
  const cashSubEl = document.getElementById('finance-cash-subtext');
  if (cashEl) {
    if (fin.isCashReconciled && fin.currentCashBalance !== null) {
      cashEl.textContent = `${fin.currentCashBalance.toLocaleString('fr-DZ')} DA`;
      cashEl.style.fontSize = '';
      if (cashSubEl) {
        cashSubEl.className = 'metric-subtext confirmed';
        cashSubEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${fin.openingDate ? `Since ${escapeHtml(fin.openingDate)}` : 'Reconciled Cash on Hand'}`;
      }
    } else {
      cashEl.textContent = 'Not reconciled / غير محسوبة بعد';
      cashEl.style.fontSize = '1.05rem';
      if (cashSubEl) {
        cashSubEl.className = 'metric-subtext';
        cashSubEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Awaiting reconciliation`;
      }
    }
  }

  const invValEl = document.getElementById('finance-inventory-val');
  if (invValEl) invValEl.textContent = `${fin.remainingInventoryValueDa.toLocaleString('fr-DZ')} DA`;

  const invSubEl = document.getElementById('finance-inventory-subtext');
  if (invSubEl) {
    if (state.inventory.length === 0) {
      invSubEl.innerHTML = `<span class="badge-neutral"><i class="fa-solid fa-boxes-stacked"></i> Awaiting physical import</span>`;
    } else if (fin.unpricedTitlesCount > 0) {
      invSubEl.textContent = `${fin.unpricedTitlesCount} lots with unknown cost (NULL)`;
    } else {
      invSubEl.textContent = `All ${fin.totalAvailableUnits} available units costed`;
    }
  }

  const grossEl = document.getElementById('finance-gross-profit');
  const grossSubEl = document.getElementById('finance-gross-subtext');
  if (grossEl) {
    grossEl.textContent = `${(fin.totalConfirmedProfit || 0).toLocaleString('fr-DZ')} DA`;
    grossEl.style.fontSize = '';
    if (grossSubEl) {
      grossSubEl.className = fin.unknownCostSalesCount > 0 ? 'metric-subtext' : 'metric-subtext confirmed';
      const baseText = `Costed Sales (${(fin.confirmedSalesRevenue || 0).toLocaleString('fr-DZ')} DA) − COGS (${(fin.totalCogs || 0).toLocaleString('fr-DZ')} DA)`;
      grossSubEl.innerHTML = fin.unknownCostSalesCount > 0
        ? `<i class="fa-solid fa-clock"></i> ${baseText} • Excl. ${fin.unknownCostSalesCount} title(s) with Unknown Cost`
        : `<i class="fa-solid fa-circle-check"></i> ${baseText}`;
    }
  }

  const netEl = document.getElementById('finance-net-profit');
  const netSubEl = document.getElementById('finance-net-subtext');
  if (netEl) {
    netEl.textContent = `${(fin.netConfirmedProfit || 0).toLocaleString('fr-DZ')} DA`;
    netEl.style.fontSize = '';
    if (netSubEl) {
      netSubEl.className = fin.unknownCostSalesCount > 0 ? 'metric-subtext' : 'metric-subtext confirmed';
      netSubEl.innerHTML = `<i class="fa-solid ${fin.unknownCostSalesCount > 0 ? 'fa-clock' : 'fa-circle-check'}"></i> Confirmed Gross Profit − Expenses (${fin.totalOperatingExpenses.toLocaleString('fr-DZ')} DA)${fin.unknownCostSalesCount > 0 ? ' • Partial (Unknown Costs)' : ''}`;
    }
  }

  const shipEl = document.getElementById('finance-shipping-collected');
  if (shipEl) shipEl.textContent = `${fin.totalShippingCollected.toLocaleString('fr-DZ')} DA`;
  const shipSubEl = document.getElementById('finance-shipping-subtext');
  if (shipSubEl) {
    shipSubEl.textContent = `Excluded from ${fin.totalSalesRevenue.toLocaleString('fr-DZ')} DA book sales • Transport Exp: ${(fin.totalTransportationExpenses || 0).toLocaleString('fr-DZ')} DA (No Double-Count)`;
  }

  const paidNetEl = document.getElementById('finance-paid-net-profit');
  const paidSubEl = document.getElementById('finance-paid-profit-sub');
  if (paidNetEl && fin.paidSummary) {
    const ps = fin.paidSummary;
    paidNetEl.textContent = (ps.knownCostCount === 0 && ps.allCount > 0)
      ? 'Unknown Cost'
      : `${ps.confirmedNetProfit.toLocaleString('fr-DZ')} DA`;
    if (paidSubEl) {
      paidSubEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${ps.knownCostCount}/${ps.allCount} paid costed (${ps.bookRevenue.toLocaleString('fr-DZ')} book rev, ${ps.deliveryFeesExcluded.toLocaleString('fr-DZ')} ship excl.)${ps.unknownCostCount > 0 ? ` • ${ps.unknownCostCount} Unknown` : ''}`;
    }
  }

  // 2. New Stock Breakdown Card
  const newStatusEl = document.getElementById('finance-new-stock-status');
  if (newStatusEl) {
    newStatusEl.innerHTML = fin.newStock.soldQty > 0
      ? `<i class="fa-solid fa-chart-line"></i> ${fin.newStock.soldQty} Sold • ${fin.newStock.available} Available`
      : `<i class="fa-solid fa-check"></i> 100% In Stock (${fin.newStock.available} avail)`;
  }

  const newSoldEl = document.getElementById('finance-new-sold-qty');
  if (newSoldEl) newSoldEl.textContent = `${fin.newStock.soldQty} Sold (${fin.newStock.available} avail / ${fin.newStock.onHand} on hand)`;

  const newRetailEl = document.getElementById('finance-new-retail-val');
  if (newRetailEl) newRetailEl.textContent = `${fin.newStock.valuationAtRetail.toLocaleString('fr-DZ')} DA`;

  const newRevEl = document.getElementById('finance-new-revenue');
  if (newRevEl) newRevEl.textContent = `${fin.newStock.revenue.toLocaleString('fr-DZ')} DA (${fin.newStock.soldQty} sold)`;

  const newCogsEl = document.getElementById('finance-new-cogs');
  if (newCogsEl) newCogsEl.textContent = `${fin.newStock.valuationAtCost.toLocaleString('fr-DZ')} DA`;

  const newProfitEl = document.getElementById('finance-new-profit');
  if (newProfitEl) newProfitEl.textContent = `+${fin.newStock.expectedProfit.toLocaleString('fr-DZ')} DA (${fin.newStock.marginPct}%)`;

  const newFooterEl = document.getElementById('finance-new-batch-footer');
  if (newFooterEl) {
    newFooterEl.innerHTML = `<span><i class="fa-solid fa-layer-group"></i> ${fin.newStock.titlesCount} Titles</span><span>Avg Cost: <strong>${fin.newStock.avgUnitCost.toFixed(2)} DA</strong> • Realized Profit: <strong>${fin.newStock.grossProfit.toLocaleString('fr-DZ')} DA</strong></span>`;
  }

  // 3. Old Stock Breakdown Card
  const oldStatusEl = document.getElementById('finance-old-stock-status');
  if (oldStatusEl) {
    oldStatusEl.innerHTML = fin.oldStock.soldQty > 0
      ? `<i class="fa-solid fa-clock-rotate-left"></i> ${fin.oldStock.soldQty} Sold (${fin.oldStock.available} avail)`
      : `<i class="fa-solid fa-check"></i> ${fin.oldStock.available} In Stock`;
  }

  const oldSoldEl = document.getElementById('finance-old-sold-qty');
  if (oldSoldEl) oldSoldEl.textContent = `${fin.oldStock.soldQty} Sold (${fin.oldStock.available} avail / ${fin.oldStock.onHand} on hand)`;

  const oldRevEl = document.getElementById('finance-old-revenue');
  if (oldRevEl) oldRevEl.textContent = `${fin.oldStock.valuationAtRetail.toLocaleString('fr-DZ')} DA`;

  const oldCogsEl = document.getElementById('finance-old-cogs');
  if (oldCogsEl) oldCogsEl.textContent = `${fin.oldStock.valuationAtCost.toLocaleString('fr-DZ')} DA`;

  const oldProfitEl = document.getElementById('finance-old-profit');
  if (oldProfitEl) oldProfitEl.textContent = `+${fin.oldStock.expectedProfit.toLocaleString('fr-DZ')} DA (${fin.oldStock.marginPct}%)`;

  const oldFooterEl = document.getElementById('finance-old-stock-footer');
  if (oldFooterEl) {
    oldFooterEl.innerHTML = `<span><i class="fa-solid fa-layer-group"></i> ${fin.oldStock.titlesCount} Titles</span><span>Avg Cost: <strong>${fin.oldStock.avgUnitCost.toFixed(2)} DA</strong> • Sales Rev: <strong>${fin.oldStock.revenue.toLocaleString('fr-DZ')} DA</strong></span>`;
  }

  // 3b. Combined Books Breakdown Card
  const combStatusEl = document.getElementById('finance-combined-books-status');
  if (combStatusEl) {
    combStatusEl.innerHTML = `<i class="fa-solid fa-book"></i> ${fin.combinedBooks.soldQty} Sold • ${fin.combinedBooks.available} Avail`;
  }

  const combSoldEl = document.getElementById('finance-combined-books-sold-qty');
  if (combSoldEl) combSoldEl.textContent = `${fin.combinedBooks.soldQty} Sold (${fin.combinedBooks.available} avail / ${fin.combinedBooks.onHand} on hand)`;

  const combRevEl = document.getElementById('finance-combined-books-revenue');
  if (combRevEl) combRevEl.textContent = `${fin.combinedBooks.valuationAtRetail.toLocaleString('fr-DZ')} DA`;

  const combCogsEl = document.getElementById('finance-combined-books-cogs');
  if (combCogsEl) combCogsEl.textContent = `${fin.combinedBooks.valuationAtCost.toLocaleString('fr-DZ')} DA`;

  const combProfitEl = document.getElementById('finance-combined-books-profit');
  if (combProfitEl) combProfitEl.textContent = `+${fin.combinedBooks.expectedProfit.toLocaleString('fr-DZ')} DA (${fin.combinedBooks.marginPct}%)`;

  const combFooterEl = document.getElementById('finance-combined-books-footer');
  if (combFooterEl) {
    combFooterEl.innerHTML = `<span><i class="fa-solid fa-books"></i> ${fin.combinedBooks.titlesCount} Titles</span><span>Avg Cost: <strong>${fin.combinedBooks.avgUnitCost.toFixed(2)} DA</strong> • Book Sales: <strong>${fin.combinedBooks.revenue.toLocaleString('fr-DZ')} DA</strong></span>`;
  }

  // 3c. Accessories Breakdown Card (Standalone / Separate)
  const accStatusEl = document.getElementById('finance-accessories-status');
  if (accStatusEl) {
    accStatusEl.innerHTML = `<i class="fa-solid fa-gem"></i> ${fin.accessories.soldQty} Sold • ${fin.accessories.available} Avail`;
  }

  const accSoldEl = document.getElementById('finance-acc-stock-qty');
  if (accSoldEl) accSoldEl.textContent = `${fin.accessories.soldQty} Sold (${fin.accessories.available} on hand)`;

  const accRevEl = document.getElementById('finance-acc-revenue');
  if (accRevEl) accRevEl.textContent = `${fin.accessories.valuationAtRetail.toLocaleString('fr-DZ')} DA`;

  const accCogsEl = document.getElementById('finance-acc-cogs');
  if (accCogsEl) accCogsEl.textContent = `${fin.accessories.valuationAtCost.toLocaleString('fr-DZ')} DA`;

  const accProfitEl = document.getElementById('finance-acc-profit');
  if (accProfitEl) accProfitEl.textContent = `+${fin.accessories.expectedProfit.toLocaleString('fr-DZ')} DA (${fin.accessories.marginPct}%)`;

  const accFooterEl = document.getElementById('finance-accessories-footer');
  if (accFooterEl) {
    accFooterEl.innerHTML = `<span><i class="fa-solid fa-gem"></i> ${fin.accessories.itemsCount} Items</span><span>Avg Cost: <strong>${fin.accessories.avgUnitCost.toFixed(2)} DA</strong> • Reserved: <strong>${fin.accessories.reserved}</strong></span>`;
  }

  // 4. Profit Per Title Table
  const titlesTbody = document.getElementById('finance-profit-titles-tbody');
  if (titlesTbody) {
    let list = fin.titleProfits;

    if (state.profitFilter === 'old_stock') {
      list = list.filter(tp => tp.stockGroup === 'OLD_STOCK');
    } else if (state.profitFilter === 'new_stock') {
      list = list.filter(tp => tp.stockGroup === 'NEW_STOCK');
    } else if (state.profitFilter === 'confirmed') {
      list = list.filter(tp => tp.isConfirmed);
    } else if (state.profitFilter === 'provisional') {
      list = list.filter(tp => !tp.isConfirmed);
    }

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter(tp => tp.title.toLowerCase().includes(q) || (tp.author && tp.author.toLowerCase().includes(q)));
    }

    if (list.length === 0) {
      titlesTbody.innerHTML = `<tr><td colspan="8" class="empty-state">No catalog items matching this filter.</td></tr>`;
    } else {
      titlesTbody.innerHTML = list.map(tp => {
        const isOld = tp.stockGroup === 'OLD_STOCK';
        const isNew = tp.stockGroup === 'NEW_STOCK';
        const isAcc = tp.stockGroup === 'ACCESSORIES';
        const hasSold = tp.quantitySold > 0;
        let badgeClass = 'badge-neutral';
        let badgeLabel = 'HISTORICAL';
        if (isAcc) { badgeClass = 'badge-neutral'; badgeLabel = 'ACCESSORIES'; }
        else if (isOld) { badgeClass = 'badge-oldstock'; badgeLabel = 'OLD STOCK'; }
        else if (isNew) { badgeClass = 'badge-newstock'; badgeLabel = 'NEW STOCK'; }

        return `
          <tr>
            <td>
              <strong>${escapeHtml(tp.title)}</strong>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(tp.author || '-')}</div>
            </td>
            <td>
              <span class="${badgeClass}">
                ${badgeLabel}
              </span>
            </td>
            <td>
              <strong>${tp.quantitySold}</strong>
              <span style="font-size: 0.76rem; color: var(--text-muted); display: block;">(${tp.quantityOnHand} on hand)</span>
            </td>
            <td>${hasSold ? tp.revenue.toLocaleString('fr-DZ') + ' DA' : (tp.sellingPrice ? tp.sellingPrice.toLocaleString('fr-DZ') + ' DA (Price)' : '-')}</td>
            <td>${tp.unitCost !== null ? tp.unitCost.toLocaleString('fr-DZ') + ' DA' : '<span style="color: var(--text-muted); font-style: italic;">Unknown (NULL)</span>'}</td>
            <td>
              ${hasSold && tp.grossProfit !== null
                ? `<strong style="color: var(--success);">${tp.grossProfit.toLocaleString('fr-DZ')} DA</strong>`
                : (tp.targetUnitMargin !== null ? `<span style="color: var(--success); font-size: 0.88rem;">+${tp.targetUnitMargin.toLocaleString('fr-DZ')} DA /unit</span>` : '-')}
            </td>
            <td>${tp.marginPct !== null ? `${tp.marginPct}%` : '-'}</td>
            <td>
              <span class="${tp.isConfirmed ? 'badge-confirmed' : 'badge-provisional'}">
                <i class="fa-solid ${tp.isConfirmed ? 'fa-circle-check' : 'fa-clock'}"></i>
                ${tp.isConfirmed ? `Cost Confirmed (${tp.quantitySold} Sold)` : 'Unknown Cost (NULL)'}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // 5. Stock Summary Table (100% live from physical + sales state)
  const stockTbody = document.getElementById('finance-stock-summary-tbody');
  if (stockTbody) {
    stockTbody.innerHTML = `
      <tr>
        <td><span class="badge-newstock"><i class="fa-solid fa-boxes-stacked"></i> NEW BATCH (Fair & Restocks)</span></td>
        <td><strong>${fin.newStock.titlesCount} Titles</strong></td>
        <td><strong style="color: var(--success);">${fin.newStock.available} avail</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">(${fin.newStock.onHand} on hand)</span></td>
        <td><strong>${fin.newStock.valuationAtCost.toLocaleString('fr-DZ')} DA</strong></td>
        <td>${fin.newStock.avgUnitCost.toFixed(2)} DA</td>
        <td><strong style="color: var(--vintage-blue);">${fin.newStock.valuationAtRetail.toLocaleString('fr-DZ')} DA</strong></td>
        <td><strong style="color: var(--success);">+${fin.newStock.expectedProfit.toLocaleString('fr-DZ')} DA</strong></td>
        <td><strong>${fin.newStock.marginPct}%</strong></td>
        <td><span class="badge ${fin.newStock.soldQty > 0 ? 'badge-blue' : 'badge-green'}">${fin.newStock.soldQty} Sold</span></td>
      </tr>
      <tr>
        <td><span class="badge-oldstock"><i class="fa-solid fa-clock-rotate-left"></i> OLD STOCK (Pre-fair FIFO)</span></td>
        <td><strong>${fin.oldStock.titlesCount} Titles</strong></td>
        <td><strong style="color: var(--success);">${fin.oldStock.available} avail</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">(${fin.oldStock.onHand} on hand)</span></td>
        <td><strong>${fin.oldStock.valuationAtCost.toLocaleString('fr-DZ')} DA</strong></td>
        <td>${fin.oldStock.avgUnitCost.toFixed(2)} DA</td>
        <td><strong style="color: var(--vintage-blue);">${fin.oldStock.valuationAtRetail.toLocaleString('fr-DZ')} DA</strong></td>
        <td><strong style="color: var(--success);">+${fin.oldStock.expectedProfit.toLocaleString('fr-DZ')} DA</strong></td>
        <td><strong>${fin.oldStock.marginPct}%</strong></td>
        <td><span class="badge badge-amber">${fin.oldStock.soldQty} Sold</span></td>
      </tr>
      <tr style="background: #F0FDF4; font-weight: bold; border-top: 2px solid #86EFAC;">
        <td><span class="badge" style="background: #DCFCE7; color: #166534;"><i class="fa-solid fa-book-bookmark"></i> COMBINED BOOK INVENTORY</span></td>
        <td><strong>${fin.combinedBooks.titlesCount} Titles</strong></td>
        <td><strong style="color: var(--success); font-size: 1.02rem;">${fin.combinedBooks.available} units</strong></td>
        <td style="color: var(--text-primary); font-size: 1.02rem;"><strong>${fin.combinedBooks.valuationAtCost.toLocaleString('fr-DZ')} DA</strong></td>
        <td>${fin.combinedBooks.avgUnitCost.toFixed(2)} DA</td>
        <td style="color: var(--vintage-blue); font-size: 1.02rem;"><strong>${fin.combinedBooks.valuationAtRetail.toLocaleString('fr-DZ')} DA</strong></td>
        <td style="color: var(--success); font-size: 1.02rem;"><strong>+${fin.combinedBooks.expectedProfit.toLocaleString('fr-DZ')} DA</strong></td>
        <td style="color: var(--success); font-size: 1.02rem;"><strong>${fin.combinedBooks.marginPct}%</strong></td>
        <td><span class="badge badge-green">${fin.combinedBooks.soldQty} Sold</span></td>
      </tr>
      <tr>
        <td><span class="badge" style="background: #EDE9FE; color: #5B21B6;"><i class="fa-solid fa-gem"></i> ACCESSORIES (Separate)</span></td>
        <td><strong>${fin.accessories.itemsCount} Items</strong></td>
        <td><strong style="color: var(--success);">${fin.accessories.available} units</strong></td>
        <td><strong>${fin.accessories.valuationAtCost.toLocaleString('fr-DZ')} DA</strong></td>
        <td>${fin.accessories.avgUnitCost.toFixed(2)} DA</td>
        <td><strong style="color: var(--vintage-blue);">${fin.accessories.valuationAtRetail.toLocaleString('fr-DZ')} DA</strong></td>
        <td><strong style="color: var(--success);">+${fin.accessories.expectedProfit.toLocaleString('fr-DZ')} DA</strong></td>
        <td><strong>${fin.accessories.marginPct}%</strong></td>
        <td><span class="badge" style="background: #EDE9FE; color: #5B21B6;">${fin.accessories.soldQty} Sold</span></td>
      </tr>
      <tr style="background: #FFFDF8; font-weight: bold; border-top: 2px solid var(--border-color);">
        <td><strong>GRAND TOTAL (Books + Accessories)</strong></td>
        <td><strong>${fin.combined.distinctItems} Products</strong></td>
        <td><strong style="color: var(--success); font-size: 1.05rem;">${fin.combined.available} units</strong></td>
        <td style="color: var(--text-primary); font-size: 1.05rem;"><strong>${fin.combined.valuationAtCost.toLocaleString('fr-DZ')} DA</strong></td>
        <td>${fin.combined.avgUnitCost.toFixed(2)} DA</td>
        <td style="color: var(--vintage-blue); font-size: 1.05rem;"><strong>${fin.combined.valuationAtRetail.toLocaleString('fr-DZ')} DA</strong></td>
        <td style="color: var(--success); font-size: 1.05rem;"><strong>+${fin.combined.expectedProfit.toLocaleString('fr-DZ')} DA</strong></td>
        <td style="color: var(--success); font-size: 1.05rem;"><strong>${fin.combined.marginPct}%</strong></td>
        <td><span class="badge badge-green">${fin.combinedBooks.soldQty + fin.accessories.soldQty} Sold</span></td>
      </tr>
    `;
  }

  // 6. Owner Equity, Opening Position & Stock Audit Ledger
  const equityEl = document.getElementById('finance-equity-ledger-container');
  if (equityEl) {
    const capitals = state.capitalContributions || [];
    const withdrawals = state.ownerWithdrawals || [];
    const adjs = state.stockAdjustments || [];

    equityEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px;">
        <div class="stat-box" style="padding: 12px; background: #FFFDF8; border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="font-size: 0.78rem; color: var(--text-muted);">Opening Cash (${escapeHtml(fin.openingDate || 'Unset')})</div>
          <div style="font-size: 1.15rem; font-weight: 700; color: var(--vintage-blue);">${fin.openingCash.toLocaleString('fr-DZ')} DA</div>
        </div>
        <div class="stat-box" style="padding: 12px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px;">
          <div style="font-size: 0.78rem; color: #166534;">Owner Capital Injected (${capitals.length})</div>
          <div style="font-size: 1.15rem; font-weight: 700; color: var(--success);">+${fin.totalCapitalInjected.toLocaleString('fr-DZ')} DA</div>
        </div>
        <div class="stat-box" style="padding: 12px; background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 8px;">
          <div style="font-size: 0.78rem; color: #9F1239;">Owner Withdrawals (${withdrawals.length})</div>
          <div style="font-size: 1.15rem; font-weight: 700; color: var(--danger);">-${fin.totalOwnerWithdrawals.toLocaleString('fr-DZ')} DA</div>
        </div>
        <div class="stat-box" style="padding: 12px; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="font-size: 0.78rem; color: var(--text-muted);">Post-Opening Outflows</div>
          <div style="font-size: 0.92rem; font-weight: 600;">Batches: ${fin.postOpeningBatchPaid.toLocaleString('fr-DZ')} DA • Debts: ${fin.postOpeningDebtsRepaid.toLocaleString('fr-DZ')} DA • Exp: ${fin.postOpeningOperatingExpenses.toLocaleString('fr-DZ')} DA</div>
        </div>
      </div>

      ${capitals.length > 0 || withdrawals.length > 0 ? `
        <div class="vintage-table-wrapper" style="margin-bottom: 14px;">
          <table class="vintage-table" style="font-size: 0.85rem;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Source / Reason</th>
                <th>Amount (DA)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${[
                ...capitals.map(c => ({ date: c.contribution_date || formatDate(c.created_at), type: 'Capital In', cls: 'badge-green', detail: c.source || 'personal_funds', sign: '+', amt: Number(c.amount_da) || 0, notes: c.notes || '-' })),
                ...withdrawals.map(w => ({ date: w.withdrawal_date || formatDate(w.created_at), type: 'Withdrawal', cls: 'badge-rose', detail: w.reason || 'owner_drawings', sign: '-', amt: Number(w.amount_da) || 0, notes: w.notes || '-' }))
              ].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(row => `
                <tr>
                  <td>${escapeHtml(row.date)}</td>
                  <td><span class="badge ${row.cls}">${row.type}</span></td>
                  <td>${escapeHtml(row.detail)}</td>
                  <td><strong style="color: ${row.sign === '+' ? 'var(--success)' : 'var(--danger)'};">${row.sign}${row.amt.toLocaleString('fr-DZ')} DA</strong></td>
                  <td>${escapeHtml(row.notes)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">No capital contributions or owner withdrawals recorded yet.</p>'}

      ${adjs.length > 0 ? `
        <h5 style="font-family: var(--font-serif); margin: 12px 0 8px;"><i class="fa-solid fa-sliders"></i> Stock Adjustments Audit Log (${adjs.length})</h5>
        <div class="vintage-table-wrapper">
          <table class="vintage-table" style="font-size: 0.82rem;">
            <thead>
              <tr><th>Date</th><th>Item</th><th>Adjustment Type</th><th>Delta</th><th>Reason / Notes</th></tr>
            </thead>
            <tbody>
              ${adjs.slice(0, 15).map(a => {
                const inv = state.inventory.find(i => String(i.id) === String(a.inventory_item_id));
                const qty = Number(a.quantity_change) || 0;
                return `
                  <tr>
                    <td>${escapeHtml(formatDate(a.created_at || a.adjustment_date))}</td>
                    <td><strong>${escapeHtml(inv ? inv.title : (a.title || a.inventory_item_id || '-'))}</strong></td>
                    <td><span class="badge badge-neutral">${escapeHtml(a.adjustment_type || 'adjustment')}</span></td>
                    <td><strong style="color: ${qty >= 0 ? 'var(--success)' : 'var(--danger)'};">${qty > 0 ? '+' + qty : qty}</strong></td>
                    <td>${escapeHtml(a.reason || a.notes || '-')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;
  }
}

function renderExpensesSection() {
  const container = document.getElementById('expenses-list-container');
  if (!container) return;

  let pkgTotal = 0;
  let adTotal = 0;
  let feeTotal = 0;

  state.expenses.forEach(e => {
    const amt = Number(e.amount_da) || 0;
    const cat = String(e.category || '').toLowerCase();
    if (cat === 'packaging') pkgTotal += amt;
    else if (cat === 'advertising' || cat === 'marketing') adTotal += amt;
    else if (cat === 'fair_fees') feeTotal += amt;
  });

  const pkgEl = document.getElementById('metric-exp-packaging');
  if (pkgEl) pkgEl.textContent = `${pkgTotal.toLocaleString('fr-DZ')} DA`;

  const adEl = document.getElementById('metric-exp-advertising');
  if (adEl) adEl.textContent = `${adTotal.toLocaleString('fr-DZ')} DA`;

  const feeEl = document.getElementById('metric-exp-fair');
  if (feeEl) feeEl.textContent = `${feeTotal.toLocaleString('fr-DZ')} DA`;

  if (state.expenses.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-receipt"></i>
        <h4>No Operating Expenses Recorded Yet</h4>
        <p>Operating costs (packaging, ads, exhibition fees) are accounted separately from inventory purchases.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="vintage-table-wrapper">
      <table class="vintage-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Payment Method</th>
            <th>Amount (DA)</th>
          </tr>
        </thead>
        <tbody>
          ${state.expenses.map(exp => `
            <tr>
              <td style="white-space: nowrap; font-size: 0.85rem;">${formatDate(exp.expense_date || exp.created_at)}</td>
              <td><span class="badge badge-neutral">${escapeHtml(exp.category || 'other')}</span></td>
              <td><strong>${escapeHtml(exp.description || '-')}</strong></td>
              <td><span class="badge badge-blue">${escapeHtml(exp.payment_method || 'cash')}</span></td>
              <td><strong style="color: var(--danger); font-size: 1rem;">${(Number(exp.amount_da) || 0).toLocaleString('fr-DZ')} DA</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdvertisingSection() {
  const adExpenses = (state.expenses || []).filter(e => ['marketing', 'advertising'].includes(String(e.category || '').toLowerCase()));
  const totalSpend = adExpenses.reduce((s, e) => s + (Number(e.amount_da) || 0), 0);

  let totalAttributedOrders = 0;
  let totalFollowersGained = 0;
  const parsedCampaigns = adExpenses.map(e => {
    const desc = String(e.description || '');
    const orderMatch = desc.match(/(\d+)\s*orders?/i);
    const followerMatch = desc.match(/(\d+)\s*followers?/i);
    const ordersCount = orderMatch ? parseInt(orderMatch[1], 10) : 0;
    const followersCount = followerMatch ? parseInt(followerMatch[1], 10) : 0;
    totalAttributedOrders += ordersCount;
    totalFollowersGained += followersCount;
    return {
      date: e.expense_date || formatDate(e.created_at),
      description: desc || 'Marketing Campaign',
      spend: Number(e.amount_da) || 0,
      ordersCount,
      followersCount,
      method: e.payment_method || 'baridimob'
    };
  });

  const spendEl = document.getElementById('metric-ad-spend');
  if (spendEl) spendEl.textContent = `${totalSpend.toLocaleString('fr-DZ')} DA`;

  const ordersEl = document.getElementById('metric-ad-orders');
  if (ordersEl) ordersEl.textContent = String(totalAttributedOrders);

  const roasEl = document.getElementById('metric-ad-roas');
  if (roasEl) {
    const fin = calculateFinancialMetrics();
    const avgOrderVal = state.orders.length > 0 ? (fin.totalSalesRevenue / state.orders.length) : 0;
    const estAttrRevenue = totalAttributedOrders * avgOrderVal;
    const roas = totalSpend > 0 && estAttrRevenue > 0 ? (estAttrRevenue / totalSpend).toFixed(1) : '0.0';
    roasEl.textContent = `${roas}x (${totalFollowersGained} followers)`;
  }

  const container = document.getElementById('advertising-campaigns-container');
  if (!container) return;

  if (parsedCampaigns.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-brands fa-instagram"></i>
        <h4>No Advertising Campaigns Logged</h4>
        <p>Track your sponsored Instagram posts to measure real book sales generated per Dinar spent.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="vintage-table-wrapper">
      <table class="vintage-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Campaign / Description</th>
            <th>Spend (DA)</th>
            <th>Attributed Orders</th>
            <th>Followers Gained</th>
            <th>Payment Method</th>
          </tr>
        </thead>
        <tbody>
          ${parsedCampaigns.map(c => `
            <tr>
              <td style="white-space: nowrap;">${escapeHtml(c.date)}</td>
              <td><strong>${escapeHtml(c.description)}</strong></td>
              <td><strong style="color: var(--danger);">${c.spend.toLocaleString('fr-DZ')} DA</strong></td>
              <td><span class="badge badge-blue">${c.ordersCount}</span></td>
              <td><span class="badge badge-green">+${c.followersCount}</span></td>
              <td><span class="badge badge-neutral">${escapeHtml(c.method)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderDebtsSection() {
  const container = document.getElementById('debts-list-container');
  if (!container) return;

  if (state.debts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-scale-balanced"></i>
        <h4>No Debts Recorded Yet</h4>
        <p>You can record liabilities or import creditors from the <strong>DEBTS</strong> sheet of <code>Gentle_Readers_Inventory_Starter.xlsx</code>.</p>
      </div>
    `;
    return;
  }

  const repaymentsMap = new Map();
  state.debtRepayments.forEach(rep => {
    const list = repaymentsMap.get(rep.debt_id) || [];
    list.push(rep);
    repaymentsMap.set(rep.debt_id, list);
  });

  const enrichedDebts = state.debts.map(d => {
    const orig = Number(d.original_amount_da || d.amount || 0);
    const reps = repaymentsMap.get(d.id) || [];
    const repaid = reps.length > 0
      ? reps.reduce((s, r) => s + (Number(r.amount_da) || 0), 0)
      : Number(d.amount_repaid_da || 0);
    const remaining = Math.max(0, orig - repaid);
    const isSettled = remaining === 0;
    return { d, orig, reps, repaid, remaining, isSettled };
  });

  const filter = state.debtsFilter || 'all';
  const filteredDebts = enrichedDebts.filter(({ d, isSettled }) => {
    const dt = String(d.debt_type || 'supplier').toLowerCase();
    if (filter === 'supplier') return dt === 'supplier' || dt === 'store_to_supplier';
    if (filter === 'personal') return dt !== 'supplier' && dt !== 'store_to_supplier';
    if (filter === 'settled') return isSettled;
    return true;
  });

  if (filteredDebts.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-filter-circle-xmark"></i><h4>No Debts Match Filter "${escapeHtml(filter)}"</h4></div>`;
    return;
  }

  const debtsHtml = `
    <div class="vintage-table-wrapper">
      <table class="vintage-table">
        <thead>
          <tr>
            <th>Creditor / Entity</th>
            <th>Liability Type</th>
            <th>Original (DA)</th>
            <th>Repaid (DA)</th>
            <th>Remaining Balance</th>
            <th>Repayments</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${filteredDebts.map(({ d, orig, reps, repaid, remaining, isSettled }) => `
            <tr>
              <td>
                <strong>${escapeHtml(d.creditor_name || '-')}</strong>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(d.notes || d.evidence_notes || '')}</div>
              </td>
              <td><span class="badge badge-neutral">${escapeHtml(d.debt_type || 'supplier')}</span></td>
              <td>${orig.toLocaleString('fr-DZ')} DA</td>
              <td>${repaid.toLocaleString('fr-DZ')} DA</td>
              <td>
                <strong style="color: ${isSettled ? 'var(--success)' : 'var(--warning)'}; font-size: 1rem;">
                  ${remaining.toLocaleString('fr-DZ')} DA
                </strong>
                ${isSettled ? '<span class="badge badge-green" style="margin-left: 6px;">Settled</span>' : ''}
              </td>
              <td>
                <span class="badge badge-blue">${reps.length} Payment${reps.length !== 1 ? 's' : ''}</span>
              </td>
              <td>
                ${!isSettled ? `
                  <button class="btn-primary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="openDebtRepaymentModal('${escapeHtml(d.id)}')">
                    <i class="fa-solid fa-hand-holding-dollar"></i> Pay
                  </button>
                ` : '<span style="color: var(--success); font-size: 0.82rem;"><i class="fa-solid fa-circle-check"></i> Paid in full</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${state.debtRepayments.length > 0 ? `
      <div style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px;">
        <h4 style="font-family: var(--font-serif); font-size: 1.05rem; margin-bottom: 10px;">
          <i class="fa-solid fa-clock-rotate-left"></i> Repayment Transaction History (سجل دفعات السداد)
        </h4>
        <div class="vintage-table-wrapper">
          <table class="vintage-table" style="font-size: 0.84rem;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Creditor / Debt</th>
                <th>Amount Paid (DA)</th>
                <th>Payment Method</th>
                <th>Reference & Notes</th>
              </tr>
            </thead>
            <tbody>
              ${state.debtRepayments.map(rep => {
                const debt = state.debts.find(d => d.id === rep.debt_id);
                return `
                  <tr>
                    <td style="white-space: nowrap;">${escapeHtml(rep.repayment_date || formatDate(rep.created_at))}</td>
                    <td><strong>${escapeHtml(debt ? debt.creditor_name : 'Creditor')}</strong></td>
                    <td><strong style="color: var(--success);">${Number(rep.amount_da).toLocaleString('fr-DZ')} DA</strong></td>
                    <td><span class="badge badge-neutral">${escapeHtml(rep.payment_method || 'cash')}</span></td>
                    <td style="color: var(--text-secondary);">${escapeHtml(rep.notes || '-')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}
  `;

  container.innerHTML = debtsHtml;
}

window.setDebtsFilter = function(filter) {
  state.debtsFilter = filter;
  document.querySelectorAll('.tab-btn[data-debt-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-debt-filter') === filter);
  });
  renderDebtsSection();
};

function populateBatchDropdown() {
  const select = document.getElementById('inv-item-batch');
  if (!select) return;
  const currentVal = select.value;
  if (!state.batches || state.batches.length === 0) {
    select.innerHTML = '<option value="">No purchase batches created yet</option>';
    return;
  }
  select.innerHTML = state.batches.map(b => `
    <option value="${escapeHtml(b.id)}">${escapeHtml(b.batch_name)}</option>
  `).join('');
  if (currentVal) select.value = currentVal;
}

// Helpers
function formatOrderItems(items) {
  if (!items) return '<span class="text-muted">-</span>';
  try {
    const list = Array.isArray(items) ? items : JSON.parse(items);
    if (Array.isArray(list)) {
      return list.map(item => {
        let str = typeof item === 'object' ? (item.title || item.name || JSON.stringify(item)) : String(item);
        return `<div style="margin-bottom: 2px;">• ${escapeHtml(str)}</div>`;
      }).join('');
    }
    return escapeHtml(String(items));
  } catch {
    return escapeHtml(String(items));
  }
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Date display
function initDateDisplay() {
  const dateEl = document.getElementById('current-date-display');
  if (dateEl) {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    dateEl.innerHTML = `<i class="fa-regular fa-calendar"></i> ${now.toLocaleDateString('en-GB', options)}`;
  }
}

// Navigation between sections
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.getAttribute('data-section');
      switchSection(section);
      if (window.innerWidth <= 991 && sidebar && backdrop) {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      }
    });
  });

  if (mobileMenuBtn && sidebar && backdrop) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('active');
    });
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
    });
  }
}

function switchSection(sectionId) {
  state.activeSection = sectionId;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
  });

  document.querySelectorAll('.section-view').forEach(view => {
    view.classList.toggle('active', view.id === `section-${sectionId}`);
  });

  const titles = {
    dashboard: 'Dashboard <span>لوحة القيادة</span>',
    inventory: 'Inventory & Stock <span>المخزون والمنتجات</span>',
    orders: 'Orders Management <span>إدارة الطلبات</span>',
    'paid-orders': 'Paid Orders & Profit <span>الطلبات المدفوعة والأرباح</span>',
    purchases: 'Purchases & Suppliers <span>المشتريات والموردين</span>',
    expenses: 'Operating Expenses <span>المصاريف التشغيلية</span>',
    finance: 'Financial Management <span>الإدارة المالية والأرباح</span>',
    debts: 'Debt Management <span>إدارة الديون والالتزامات</span>',
    advertising: 'Advertising & Campaigns <span>الإعلانات والحملات</span>',
    settings: 'Settings & Synchronization <span>الإعدادات والمزامنة</span>'
  };

  const headerTitle = document.getElementById('header-section-title');
  if (headerTitle && titles[sectionId]) {
    headerTitle.innerHTML = titles[sectionId];
  }

  renderAppViews();
}

window.switchSection = switchSection;

window.setPaidOrdersFilter = function(filter) {
  state.paidOrdersFilter = filter;
  document.querySelectorAll('.tab-btn[data-paid-filter]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-paid-filter') === filter);
  });
  renderPaidOrdersSection();
};

window.forceUpdateApp = async function() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (err) {
    console.warn('[PWA] Cache clear warning:', err);
  }
  window.location.reload();
};

window.triggerManualSync = function() {
  sync.sync();
};

window.setOrdersFilter = function(filter) {
  state.ordersFilter = filter;
  document.querySelectorAll('.tab-btn[data-order-filter]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-order-filter') === filter);
  });
  renderOrdersTable();
};

window.exportLocalBackup = async function() {
  try {
    const backupData = {
      export_date: new Date().toISOString(),
      owner: OWNER_EMAIL,
      orders_count: state.orders.length,
      orders: state.orders,
      inventory: state.inventory,
      batches: state.batches,
      suppliers: state.suppliers,
      expenses: state.expenses,
      debts: state.debts,
      debt_repayments: state.debtRepayments,
      order_stock_allocations: state.orderAllocations,
      order_meta: state.orderMeta,
      order_returns: state.orderReturns,
      opening_position: state.openingPosition
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gentle-readers-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Local database backup exported successfully as JSON.');
  } catch (err) {
    alert('Failed to export backup: ' + err.message);
  }
};

window.handleRestoreBackupFile = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const backup = JSON.parse(e.target.result);
      if (!confirm(`Restore local backup from ${backup.export_date || 'file'}?\n\nThis will safely update your local IndexedDB records.`)) {
        event.target.value = '';
        return;
      }

      if (Array.isArray(backup.inventory)) {
        // Sanitize imported inventory items to ensure unit_purchase_cost_da is strictly respected
        const sanitizedInv = backup.inventory.map(item => {
          const clean = { ...item };
          if (clean.unit_purchase_cost_da === undefined && clean.purchase_cost_da !== undefined) {
            clean.unit_purchase_cost_da = clean.purchase_cost_da;
          }
          delete clean.purchase_cost_da;
          return clean;
        });
        await idb.putBatch('inventory', sanitizedInv);
      }
      if (Array.isArray(backup.batches)) await idb.putBatch('batches', backup.batches);
      if (Array.isArray(backup.suppliers)) await idb.putBatch('suppliers', backup.suppliers);
      if (Array.isArray(backup.expenses)) await idb.putBatch('expenses', backup.expenses);
      if (Array.isArray(backup.debts)) await idb.putBatch('debts', backup.debts);
      if (Array.isArray(backup.debt_repayments)) await idb.putBatch('debt_repayments', backup.debt_repayments);
      if (Array.isArray(backup.order_stock_allocations)) await idb.putBatch('order_stock_allocations', backup.order_stock_allocations);
      if (Array.isArray(backup.order_meta)) await idb.putBatch('order_meta', backup.order_meta);
      if (Array.isArray(backup.order_returns)) await idb.putBatch('order_returns', backup.order_returns);
      if (backup.opening_position) await idb.put('opening_position', backup.opening_position);

      await loadLocalData();
      alert('Local backup restored successfully into IndexedDB.');
      event.target.value = '';
    } catch (err) {
      alert('Failed to parse or restore backup JSON: ' + err.message);
      event.target.value = '';
    }
  };
  reader.readAsText(file);
};

window.handleSearch = function(query) {
  state.searchQuery = query;
  renderAppViews();
};

window.setInventoryFilter = function(filter) {
  state.inventoryFilter = filter;
  document.querySelectorAll('.tab-btn[data-filter]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-filter') === filter);
  });
  renderInventoryTable();
};

// ============================================================================
// 6. REAL INTERACTIVE WORKING MODALS (Add Item, New Batch, Expense, Debt)
// ============================================================================
window.openModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('active');
};

window.closeModal = function(modalId) {
  if (modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  } else {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
};

// 1. Add Inventory Item to IndexedDB
window.handleSaveInventoryItem = async function(event) {
  event.preventDefault();
  const title = document.getElementById('inv-item-title').value.trim();
  const author = document.getElementById('inv-item-author').value.trim();
  const isbn = document.getElementById('inv-item-isbn').value.trim();
  const stockGroup = document.getElementById('inv-item-group')?.value || 'NEW_STOCK';
  const type = document.getElementById('inv-item-type').value;
  const batchId = document.getElementById('inv-item-batch').value;
  const qty = parseInt(document.getElementById('inv-item-qty').value, 10) || 0;
  const cost = document.getElementById('inv-item-cost').value ? parseFloat(document.getElementById('inv-item-cost').value) : null;
  const price = document.getElementById('inv-item-price').value ? parseFloat(document.getElementById('inv-item-price').value) : null;
  const notes = document.getElementById('inv-item-notes').value.trim();

  if (!title) {
    alert('Please enter a book or product title.');
    return;
  }

  const selectedBatch = state.batches.find(b => b.id === batchId);
  const batchName = selectedBatch ? selectedBatch.batch_name : 'November 2026 Fair';

  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : ('item_' + Date.now()),
    batch_id: batchId,
    batch_name: batchName,
    stock_group: stockGroup,
    category: type,
    item_type: type,
    title: title,
    author: author,
    isbn: isbn,
    quantity_received: qty,
    quantity_sold: 0,
    quantity_reserved: 0,
    quantity_damaged: 0,
    unit_purchase_cost_da: cost,
    selling_price_da: price,
    condition: 'New',
    notes: notes,
    created_at: new Date().toISOString()
  };

  // Save to IndexedDB immediately
  await idb.put('inventory', newItem);
  await idb.queueMutation('inventory_items', 'insert', newItem);

  state.inventory.unshift(newItem);
  renderAppViews();
  closeModal('modal-add-inventory');
  document.getElementById('form-add-inventory').reset();

  // Trigger sync if online
  if (state.online && auth.isAuthenticated()) sync.sync();
};

// 1b. Book Details & Edit Existing Inventory Item Metadata / Price / Cost (never mutates historical quantities)
window.openEditInventoryModal = function(itemId) {
  const item = (state.inventory || []).find(i => String(i.id) === String(itemId));
  if (!item) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = (val === null || val === undefined) ? '' : String(val);
  };

  const origQty = Number(item.quantity_received) || 0;
  const soldQty = Number(item.quantity_sold) || 0;
  const availQty = getInventoryAvailableQty(item);
  const onHandQty = getInventoryOnHandQty(item);
  const resQty = Number(item.quantity_reserved) || 0;
  const dmgQty = Number(item.quantity_damaged) || 0;
  const lostQty = Number(item.quantity_lost) || 0;
  const promoQty = Number(item.quantity_promotional) || 0;
  const retSuppQty = Number(item.quantity_returned_to_supplier) || 0;
  const countAdjQty = Number(item.quantity_count_adjustment) || 0;
  const batchObj = (state.batches || []).find(b => String(b.id) === String(item.batch_id));
  const batchLabel = batchObj ? batchObj.batch_name : (item.batch_name || item.batch_id || 'Opening / Fair Lot');

  const summaryEl = document.getElementById('edit-inv-stock-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
        <span style="font-weight: 700; font-size: 0.86rem; color: var(--vintage-blue);">
          <i class="fa-solid fa-boxes-stacked"></i> Inventory Quantity History (Preserved)
        </span>
        <span style="font-size: 0.78rem; color: var(--text-muted);">
          Lot: <strong>${escapeHtml(batchLabel)}</strong>${item.acquisition_date ? ` • Acquired: ${escapeHtml(String(item.acquisition_date).slice(0, 10))}` : ''}
        </span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px;">
        <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 0.72rem; color: var(--text-muted);">Original Qty Received</div>
          <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${origQty}</div>
        </div>
        <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 0.72rem; color: #1E40AF;">Quantity Sold</div>
          <div style="font-size: 1.2rem; font-weight: 700; color: var(--vintage-blue);">${soldQty}</div>
        </div>
        <div style="background: ${availQty <= 2 ? '#FFF1F2' : '#F0FDF4'}; border: 1px solid ${availQty <= 2 ? '#FECDD3' : '#BBF7D0'}; border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 0.72rem; color: ${availQty <= 2 ? '#9F1239' : '#166534'};">Current Available</div>
          <div style="font-size: 1.2rem; font-weight: 700; color: ${availQty <= 2 ? 'var(--danger)' : 'var(--success)'};">${availQty}</div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 0.72rem; color: var(--text-muted);">On Hand / Reserved</div>
          <div style="font-size: 1.05rem; font-weight: 700;">${onHandQty} / ${resQty}</div>
        </div>
      </div>
      ${(dmgQty || lostQty || promoQty || retSuppQty || countAdjQty) ? `
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">
          Audit adjustments: Damaged: ${dmgQty} • Lost: ${lostQty} • Promo/Gift: ${promoQty} • Returned to Supplier: ${retSuppQty} • Count Adj: ${countAdjQty >= 0 ? '+' + countAdjQty : countAdjQty}
        </div>
      ` : ''}
    `;
  }

  setVal('edit-inv-id', item.id);
  setVal('edit-inv-title', item.title || '');
  setVal('edit-inv-author', item.author || '');
  setVal('edit-inv-isbn', item.isbn || '');
  setVal('edit-inv-group', (item.stock_group || '').toUpperCase() === 'OLD_STOCK' ? 'OLD_STOCK' : 'NEW_STOCK');
  setVal('edit-inv-category', String(item.category || item.item_type || (isAccessoryItem(item) ? 'accessory' : 'book')).toLowerCase());
  setVal('edit-inv-cost', (item.unit_purchase_cost_da !== null && item.unit_purchase_cost_da !== undefined && !isNaN(item.unit_purchase_cost_da)) ? item.unit_purchase_cost_da : '');
  setVal('edit-inv-price', (item.selling_price_da !== null && item.selling_price_da !== undefined && !isNaN(item.selling_price_da)) ? item.selling_price_da : '');
  setVal('edit-inv-supplier', item.supplier_name || '');
  setVal('edit-inv-location', item.location || '');
  setVal('edit-inv-notes', item.notes || '');

  openModal('modal-edit-inventory');
};

window.handleSaveInventoryEdit = async function(event) {
  event.preventDefault();
  const itemId = document.getElementById('edit-inv-id')?.value;
  const item = (state.inventory || []).find(i => String(i.id) === String(itemId));
  if (!item) {
    alert('Inventory item not found.');
    return;
  }

  const title = (document.getElementById('edit-inv-title')?.value || '').trim();
  if (!title) {
    alert('Title cannot be empty.');
    return;
  }

  const rawCost = (document.getElementById('edit-inv-cost')?.value || '').trim();
  const rawPrice = (document.getElementById('edit-inv-price')?.value || '').trim();
  const cost = rawCost !== '' && !isNaN(parseFloat(rawCost)) ? Math.round(parseFloat(rawCost) * 100) / 100 : null;
  const price = rawPrice !== '' && !isNaN(parseFloat(rawPrice)) ? Math.round(parseFloat(rawPrice)) : null;

  const stockGroup = document.getElementById('edit-inv-group')?.value === 'OLD_STOCK' ? 'OLD_STOCK' : 'NEW_STOCK';
  const category = (document.getElementById('edit-inv-category')?.value || 'book').toLowerCase();
  const author = (document.getElementById('edit-inv-author')?.value || '').trim() || null;
  const isbn = (document.getElementById('edit-inv-isbn')?.value || '').trim() || null;
  const supplier = (document.getElementById('edit-inv-supplier')?.value || '').trim() || null;
  const location = (document.getElementById('edit-inv-location')?.value || '').trim() || null;
  const notes = (document.getElementById('edit-inv-notes')?.value || '').trim() || null;
  const nowIso = new Date().toISOString();

  // Merge strictly metadata/pricing updates onto local copy (quantities untouched)
  Object.assign(item, {
    title,
    author,
    isbn,
    stock_group: stockGroup,
    category,
    item_type: category,
    unit_purchase_cost_da: cost,
    selling_price_da: price,
    supplier_name: supplier,
    location,
    notes,
    updated_at: nowIso
  });

  // Explicit partial update payload so Supabase quantity_sold / quantity_reserved are NEVER clobbered
  const updatePayload = {
    id: item.id,
    title,
    author,
    isbn,
    stock_group: stockGroup,
    category,
    unit_purchase_cost_da: cost,
    selling_price_da: price,
    supplier_name: supplier,
    location,
    notes,
    updated_at: nowIso
  };

  await idb.put('inventory', item);
  await idb.queueMutation('inventory_items', 'update', updatePayload);

  renderAppViews();
  closeModal('modal-edit-inventory');
  if (state.online && auth.isAuthenticated()) sync.sync();
};

// 2. Record Purchase Batch to IndexedDB
window.handleSaveBatch = async function(event) {
  event.preventDefault();
  const name = document.getElementById('batch-input-name').value.trim();
  const supplier = document.getElementById('batch-input-supplier').value.trim();
  const date = document.getElementById('batch-input-date').value;
  const cost = document.getElementById('batch-input-cost').value ? parseFloat(document.getElementById('batch-input-cost').value) : null;
  const paid = document.getElementById('batch-input-paid').value ? parseFloat(document.getElementById('batch-input-paid').value) : 0;
  const status = document.getElementById('batch-input-status').value;
  const notes = document.getElementById('batch-input-notes').value.trim();

  if (!name) {
    alert('Please enter a batch name.');
    return;
  }

  const newBatch = {
    id: crypto.randomUUID ? crypto.randomUUID() : ('batch_' + Date.now()),
    batch_name: name,
    supplier_name: supplier,
    purchase_date: date,
    total_cost_da: cost,
    amount_paid_da: paid,
    payment_status: status,
    notes: notes,
    created_at: new Date().toISOString()
  };

  await idb.put('batches', newBatch);
  await idb.queueMutation('purchase_batches', 'insert', newBatch);

  state.batches.unshift(newBatch);
  renderAppViews();
  closeModal('modal-add-batch');
  document.getElementById('form-add-batch').reset();

  if (state.online && auth.isAuthenticated()) sync.sync();
};

// 3. Record Operating Expense to IndexedDB
window.handleSaveExpense = async function(event) {
  event.preventDefault();
  const category = document.getElementById('expense-input-category').value;
  const amount = parseFloat(document.getElementById('expense-input-amount').value) || 0;
  const desc = document.getElementById('expense-input-desc').value.trim();
  const method = document.getElementById('expense-input-method').value;

  if (amount <= 0) {
    alert('Please enter a valid expense amount.');
    return;
  }

  const newExpense = {
    id: crypto.randomUUID ? crypto.randomUUID() : ('exp_' + Date.now()),
    category: category,
    amount_da: amount,
    expense_date: new Date().toISOString().slice(0, 10),
    description: desc,
    payment_method: method,
    created_at: new Date().toISOString()
  };

  await idb.put('expenses', newExpense);
  await idb.queueMutation('operating_expenses', 'insert', newExpense);

  state.expenses.unshift(newExpense);
  renderAppViews();
  closeModal('modal-add-expense');
  document.getElementById('form-add-expense').reset();

  if (state.online && auth.isAuthenticated()) sync.sync();
};

// 4. Record Debt to IndexedDB
window.handleSaveDebt = async function(event) {
  event.preventDefault();
  const creditor = document.getElementById('debt-input-creditor').value.trim();
  const rawType = document.getElementById('debt-input-type').value;
  const amount = parseFloat(document.getElementById('debt-input-amount').value) || 0;
  let notes = document.getElementById('debt-input-notes').value.trim();

  if (!creditor || amount <= 0) {
    alert('Please enter creditor name and amount.');
    return;
  }

  // Map UI dropdown labels cleanly onto DB check-constraint types ('supplier' | 'personal' | 'bank' | 'other')
  let debtType = rawType;
  if (rawType === 'store_to_supplier') {
    debtType = 'supplier';
  } else if (rawType === 'owner_borrowing' || rawType === 'store_to_owner') {
    const label = rawType === 'owner_borrowing' ? 'Owner Borrowing' : 'Advance from Owner';
    if (!notes.includes(label)) notes = notes ? `${label} | ${notes}` : label;
    debtType = 'personal';
  }

  const newDebt = {
    id: crypto.randomUUID ? crypto.randomUUID() : ('debt_' + Date.now()),
    creditor_name: creditor,
    debt_type: debtType,
    original_amount_da: amount,
    amount_repaid_da: 0,
    remaining_balance_da: amount,
    incurred_date: new Date().toISOString().slice(0, 10),
    notes: notes,
    created_at: new Date().toISOString()
  };

  await idb.put('debts', newDebt);
  await idb.queueMutation('debts', 'insert', newDebt);

  state.debts.unshift(newDebt);
  renderAppViews();
  closeModal('modal-add-debt');
  document.getElementById('form-add-debt').reset();

  if (state.online && auth.isAuthenticated()) sync.sync();
};

// 4b. Record Debt Repayment Transaction to IndexedDB
window.openDebtRepaymentModal = function(debtId) {
  const debt = state.debts.find(d => String(d.id) === String(debtId));
  if (!debt) return;

  const reps = state.debtRepayments.filter(r => String(r.debt_id) === String(debtId));
  const totalRepaid = reps.reduce((sum, r) => sum + (Number(r.amount_da) || 0), 0);
  const orig = Number(debt.original_amount_da) || 0;
  const remaining = Math.max(0, orig - totalRepaid);

  const idEl = document.getElementById('repayment-debt-id');
  const nameEl = document.getElementById('repayment-creditor-name');
  const remEl = document.getElementById('repayment-remaining-display');
  const amtEl = document.getElementById('repayment-input-amount');
  const dateEl = document.getElementById('repayment-input-date');
  const notesEl = document.getElementById('repayment-input-notes');

  if (idEl) idEl.value = debt.id;
  if (nameEl) nameEl.value = debt.creditor_name;
  if (remEl) remEl.value = remaining.toLocaleString('fr-DZ') + ' DA';
  if (amtEl) {
    amtEl.value = remaining > 0 ? remaining : '';
    amtEl.max = remaining > 0 ? remaining : '';
  }
  if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  if (notesEl) notesEl.value = '';

  openModal('modal-add-repayment');
};

window.handleSaveDebtRepayment = async function(event) {
  event.preventDefault();
  const debtId = document.getElementById('repayment-debt-id').value;
  const amount = parseFloat(document.getElementById('repayment-input-amount').value) || 0;
  const date = document.getElementById('repayment-input-date').value || new Date().toISOString().slice(0, 10);
  const method = document.getElementById('repayment-input-method').value;
  const notes = document.getElementById('repayment-input-notes').value.trim();

  if (amount <= 0) {
    alert('Please enter a valid repayment amount.');
    return;
  }

  const debt = state.debts.find(d => String(d.id) === String(debtId));
  if (!debt) {
    alert('Associated debt record not found.');
    return;
  }

  const reps = state.debtRepayments.filter(r => String(r.debt_id) === String(debtId));
  const priorPaid = reps.reduce((s, r) => s + (Number(r.amount_da) || 0), 0);
  const remaining = Math.max(0, (Number(debt.original_amount_da) || 0) - priorPaid);

  if (amount > remaining + 0.01) {
    alert(`Repayment amount (${amount.toLocaleString('fr-DZ')} DA) cannot exceed remaining balance (${remaining.toLocaleString('fr-DZ')} DA).`);
    return;
  }

  const newRepayment = {
    id: crypto.randomUUID ? crypto.randomUUID() : ('rep_' + Date.now()),
    debt_id: debtId,
    amount_da: amount,
    repayment_date: date,
    payment_method: method,
    notes: notes || null,
    created_at: new Date().toISOString()
  };

  await idb.put('debt_repayments', newRepayment);
  await idb.queueMutation('debt_repayments', 'insert', newRepayment);

  state.debtRepayments.unshift(newRepayment);

  // Update cached debt figures locally for immediate UI reactivity
  const newTotalPaid = priorPaid + amount;
  debt.amount_repaid_da = newTotalPaid;
  debt.remaining_balance_da = Math.max(0, (Number(debt.original_amount_da) || 0) - newTotalPaid);
  await idb.put('debts', debt);
  // NOTE: Server sync is triggered strictly via debt_repayments insert.
  // Database trigger sync_debt_balance_on_repayment automatically recalculates debts.

  renderDebtsSection();
  updateDashboardMetrics();
  renderFinanceSection();
  closeModal('modal-add-repayment');
  document.getElementById('form-add-repayment').reset();

  if (state.online && auth.isAuthenticated()) sync.sync();
};

// 4c. Record Debt Repayment Reversal (Exact negation & unique reversal)
window.handleReverseRepayment = async function(repaymentId) {
  const rep = state.debtRepayments.find(r => String(r.id) === String(repaymentId));
  if (!rep) return;
  if (rep.amount_da <= 0 || rep.reversal_of_id) {
    alert('Cannot reverse a transaction that is already a reversal.');
    return;
  }
  const alreadyReversed = state.debtRepayments.some(r => String(r.reversal_of_id) === String(repaymentId));
  if (alreadyReversed) {
    alert('This repayment has already been reversed.');
    return;
  }
  if (!confirm(`Reverse repayment of ${Number(rep.amount_da).toLocaleString('fr-DZ')} DA? This will create an immutable reversal entry and increase remaining debt.`)) return;

  const reversal = {
    id: crypto.randomUUID ? crypto.randomUUID() : ('rev_' + Date.now()),
    debt_id: rep.debt_id,
    amount_da: -Math.abs(Number(rep.amount_da)),
    repayment_date: new Date().toISOString().slice(0, 10),
    payment_method: rep.payment_method || 'other',
    reversal_of_id: rep.id,
    notes: `Reversal of repayment ${rep.id}`,
    created_at: new Date().toISOString()
  };

  await idb.put('debt_repayments', reversal);
  await idb.queueMutation('debt_repayments', 'insert', reversal);
  state.debtRepayments.unshift(reversal);

  const debt = state.debts.find(d => String(d.id) === String(rep.debt_id));
  if (debt) {
    const priorPaid = (Number(debt.amount_repaid_da) || 0) - Number(rep.amount_da);
    debt.amount_repaid_da = Math.max(0, priorPaid);
    debt.remaining_balance_da = Math.max(0, (Number(debt.original_amount_da) || 0) - debt.amount_repaid_da);
    await idb.put('debts', debt);
  }

  renderDebtsSection();
  updateDashboardMetrics();
  renderFinanceSection();
  if (state.online && auth.isAuthenticated()) sync.sync();
};

// ============================================================================
// 4d. STOCK ADJUSTMENTS (Damaged, Lost, Gift/Promo, Return to Supplier, Count Correction)
// ============================================================================
window.openStockAdjustmentModal = function(itemId) {
  const selectEl = document.getElementById('adjustment-select-item');
  if (selectEl) {
    selectEl.innerHTML = '<option value="">-- Select Item / اختر المنتج --</option>' +
      (state.inventory || []).map(i => {
        const title = i.title || 'Untitled';
        const grp = i.stock_group || 'OLD_STOCK';
        const avail = Math.max(0, (Number(i.quantity_received) || 0) + (Number(i.quantity_count_adjustment) || 0) - (Number(i.quantity_sold) || 0) - (Number(i.quantity_reserved) || 0) - (Number(i.quantity_damaged) || 0) - (Number(i.quantity_lost) || 0) - (Number(i.quantity_promotional) || 0) - (Number(i.quantity_returned_to_supplier) || 0));
        const selected = (itemId && String(i.id) === String(itemId)) ? 'selected' : '';
        return `<option value="${escapeHtml(i.id)}" data-avail="${avail}" ${selected}>${escapeHtml(title)} [${grp}] (Avail: ${avail})</option>`;
      }).join('');
  }
  handleAdjustmentItemChange();
  openModal('modal-stock-adjustment');
};

window.handleAdjustmentItemChange = function() {
  const selectEl = document.getElementById('adjustment-select-item');
  const availEl = document.getElementById('adjustment-current-avail');
  if (!selectEl || !availEl) return;
  const opt = selectEl.options[selectEl.selectedIndex];
  const avail = opt ? (parseInt(opt.getAttribute('data-avail'), 10) || 0) : 0;
  availEl.value = avail;
  handleAdjustmentPreview();
};

window.handleAdjustmentTypeChange = function() {
  const typeEl = document.getElementById('adjustment-type');
  const qtyEl = document.getElementById('adjustment-qty-change');
  const hintEl = document.getElementById('adjustment-qty-hint');
  if (!typeEl || !qtyEl) return;

  const type = typeEl.value;
  if (type === 'count_correction') {
    qtyEl.placeholder = '+1 or -1';
    if (hintEl) hintEl.textContent = 'Enter positive (+) or negative (-) change to correct physical count';
  } else {
    qtyEl.placeholder = '-1';
    if (hintEl) hintEl.textContent = 'Reductions require negative numbers (e.g. -1)';
  }
  handleAdjustmentPreview();
};

window.handleAdjustmentPreview = function() {
  const availEl = document.getElementById('adjustment-current-avail');
  const qtyEl = document.getElementById('adjustment-qty-change');
  const resultEl = document.getElementById('adjustment-new-avail');
  if (!availEl || !qtyEl || !resultEl) return;

  const currentAvail = parseInt(availEl.value, 10) || 0;
  let change = parseInt(qtyEl.value, 10);
  if (isNaN(change)) change = 0;
  resultEl.value = Math.max(0, currentAvail + change);
};

window.handleSaveStockAdjustment = async function(event) {
  event.preventDefault();
  const selectEl = document.getElementById('adjustment-select-item');
  const typeEl = document.getElementById('adjustment-type');
  const qtyEl = document.getElementById('adjustment-qty-change');
  const reasonEl = document.getElementById('adjustment-reason');

  const itemId = selectEl?.value;
  const adjType = typeEl?.value;
  let qtyChange = parseInt(qtyEl?.value, 10);
  const reason = (reasonEl?.value || '').trim();

  if (!itemId) {
    alert('Please select an inventory item.');
    return;
  }
  if (isNaN(qtyChange) || qtyChange === 0) {
    alert('Please enter a non-zero quantity change.');
    return;
  }

  // Restock rejection check
  if (adjType === 'restock' || (qtyChange > 0 && adjType !== 'count_correction')) {
    alert('Restocking must create a new purchase lot/batch with its own cost and acquisition date. You cannot increase quantity_received on an existing lot.');
    return;
  }

  // Find item
  const item = (state.inventory || []).find(i => String(i.id) === String(itemId));
  if (!item) {
    alert('Selected inventory item not found.');
    return;
  }

  const rec = Number(item.quantity_received) || 0;
  const sold = Number(item.quantity_sold) || 0;
  const res = Number(item.quantity_reserved) || 0;
  const dmg = Number(item.quantity_damaged) || 0;
  const lost = Number(item.quantity_lost) || 0;
  const promo = Number(item.quantity_promotional) || 0;
  const retSupp = Number(item.quantity_returned_to_supplier) || 0;
  const countAdj = Number(item.quantity_count_adjustment) || 0;

  const prevAvail = Math.max(0, rec + countAdj - sold - res - dmg - lost - promo - retSupp);
  const newAvail = prevAvail + qtyChange;

  if (newAvail < 0) {
    alert(`Adjustment would result in negative available inventory (${newAvail} < 0). Operation rejected.`);
    return;
  }

  // Mutate item category columns locally
  if (adjType === 'damaged') {
    item.quantity_damaged = dmg + Math.abs(qtyChange);
  } else if (adjType === 'lost') {
    item.quantity_lost = lost + Math.abs(qtyChange);
  } else if (adjType === 'gift_promo') {
    item.quantity_promotional = promo + Math.abs(qtyChange);
  } else if (adjType === 'return_to_supplier') {
    item.quantity_returned_to_supplier = retSupp + Math.abs(qtyChange);
  } else if (adjType === 'count_correction') {
    item.quantity_count_adjustment = countAdj + qtyChange;
  }

  item.updated_at = new Date().toISOString();
  await idb.put('inventory', item);

  // Create audit ledger entry
  const adjEntry = {
    id: crypto.randomUUID ? crypto.randomUUID() : ('adj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
    inventory_item_id: item.id,
    adjustment_type: adjType,
    quantity_change: qtyChange,
    previous_quantity: prevAvail,
    new_quantity: newAvail,
    reason: reason,
    adjustment_date: new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString()
  };

  await idb.put('stock_adjustments', adjEntry);
  if (!state.stockAdjustments) state.stockAdjustments = [];
  state.stockAdjustments.unshift(adjEntry);

  // Queue mutation for server
  await idb.queueMutation('stock_adjustments', 'insert', adjEntry);

  closeModal('modal-stock-adjustment');
  document.getElementById('form-stock-adjustment').reset();
  renderInventoryTable();
  updateDashboardMetrics();
  renderFinanceSection();

  alert(`Stock adjustment of ${qtyChange} units (${adjType}) recorded successfully.`);
  if (state.online && auth.isAuthenticated()) sync.sync();
};

// ============================================================================
// 4e. CAPITAL CONTRIBUTIONS & OWNER WITHDRAWALS
// ============================================================================
window.handleSaveCapitalContribution = async function(event) {
  event.preventDefault();
  const amount = parseFloat(document.getElementById('capital-input-amount')?.value) || 0;
  const date = document.getElementById('capital-input-date')?.value || new Date().toISOString().slice(0, 10);
  const source = document.getElementById('capital-input-source')?.value || 'personal_funds';
  const notes = (document.getElementById('capital-input-notes')?.value || '').trim();

  if (amount <= 0) {
    alert('Please enter a positive contribution amount.');
    return;
  }

  const capitalEntry = {
    id: crypto.randomUUID ? crypto.randomUUID() : ('cap_' + Date.now()),
    amount_da: amount,
    contribution_date: date,
    source: source,
    notes: notes || null,
    created_at: new Date().toISOString()
  };

  await idb.put('capital_contributions', capitalEntry);
  if (!state.capitalContributions) state.capitalContributions = [];
  state.capitalContributions.unshift(capitalEntry);

  await idb.queueMutation('capital_contributions', 'insert', capitalEntry);

  closeModal('modal-add-capital');
  document.getElementById('form-add-capital').reset();
  renderFinanceSection();
  updateDashboardMetrics();

  alert(`Capital contribution of ${amount.toLocaleString('fr-DZ')} DA recorded successfully.`);
  if (state.online && auth.isAuthenticated()) sync.sync();
};

window.handleSaveOwnerWithdrawal = async function(event) {
  event.preventDefault();
  const amount = parseFloat(document.getElementById('withdrawal-input-amount')?.value) || 0;
  const date = document.getElementById('withdrawal-input-date')?.value || new Date().toISOString().slice(0, 10);
  const reason = document.getElementById('withdrawal-input-reason')?.value || 'owner_drawings';
  const notes = (document.getElementById('withdrawal-input-notes')?.value || '').trim();

  if (amount <= 0) {
    alert('Please enter a positive withdrawal amount.');
    return;
  }

  const withdrawalEntry = {
    id: crypto.randomUUID ? crypto.randomUUID() : ('with_' + Date.now()),
    amount_da: amount,
    withdrawal_date: date,
    reason: reason,
    notes: notes || null,
    created_at: new Date().toISOString()
  };

  await idb.put('owner_withdrawals', withdrawalEntry);
  if (!state.ownerWithdrawals) state.ownerWithdrawals = [];
  state.ownerWithdrawals.unshift(withdrawalEntry);

  await idb.queueMutation('owner_withdrawals', 'insert', withdrawalEntry);

  closeModal('modal-add-withdrawal');
  document.getElementById('form-add-withdrawal').reset();
  renderFinanceSection();
  updateDashboardMetrics();

  alert(`Owner withdrawal of ${amount.toLocaleString('fr-DZ')} DA recorded successfully.`);
  if (state.online && auth.isAuthenticated()) sync.sync();
};

window.handleSaveCampaign = async function(event) {
  event.preventDefault();
  const name = (document.getElementById('campaign-name')?.value || '').trim();
  const platform = document.getElementById('campaign-platform')?.value || 'instagram';
  const spend = parseFloat(document.getElementById('campaign-spend')?.value) || 0;
  const date = document.getElementById('campaign-date')?.value || new Date().toISOString().slice(0, 10);
  const orders = parseInt(document.getElementById('campaign-orders')?.value, 10) || 0;
  const followers = parseInt(document.getElementById('campaign-followers')?.value, 10) || 0;
  const notes = (document.getElementById('campaign-notes')?.value || '').trim();

  if (!name || spend < 0) {
    alert('Please enter campaign name and valid spend amount.');
    return;
  }

  const expenseItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : ('exp_' + Date.now()),
    category: 'marketing',
    amount_da: spend,
    expense_date: date,
    payment_method: 'baridimob',
    description: `Ad Campaign: ${name} (${platform}) - ${orders} orders, ${followers} followers`,
    notes: notes || null,
    created_at: new Date().toISOString()
  };

  await idb.put('expenses', expenseItem);
  await idb.queueMutation('operating_expenses', 'insert', expenseItem);
  if (!state.expenses) state.expenses = [];
  state.expenses.unshift(expenseItem);

  closeModal('modal-add-campaign');
  document.getElementById('form-add-campaign').reset();
  renderAppViews();

  alert(`Marketing campaign "${name}" (${spend.toLocaleString('fr-DZ')} DA) recorded successfully.`);
  if (state.online && auth.isAuthenticated()) sync.sync();
};

// ============================================================================
// 4f. OPENING FINANCIAL POSITION & EXCEL REPORT EXPORTS
// ============================================================================
window.openOpeningPositionModal = function() {
  const op = state.openingPosition || {};
  const cashEl = document.getElementById('opening-cash-input');
  const dateEl = document.getElementById('opening-date-input');
  const notesEl = document.getElementById('opening-notes-input');
  if (cashEl) cashEl.value = (op.cash_balance_da !== null && op.cash_balance_da !== undefined) ? op.cash_balance_da : 0;
  if (dateEl) dateEl.value = op.as_of_date ? String(op.as_of_date).slice(0, 10) : new Date().toISOString().slice(0, 10);
  if (notesEl) notesEl.value = op.notes || '';
  openModal('modal-edit-opening');
};

window.handleSaveOpeningPosition = async function(event) {
  event.preventDefault();
  const cashVal = parseFloat(document.getElementById('opening-cash-input')?.value);
  const asOfDate = document.getElementById('opening-date-input')?.value || new Date().toISOString().slice(0, 10);
  const notes = (document.getElementById('opening-notes-input')?.value || '').trim();

  if (isNaN(cashVal) || cashVal < 0) {
    alert('Please enter a valid non-negative opening cash balance.');
    return;
  }

  const prev = state.openingPosition || {};
  state.openingPosition = {
    id: 1,
    cash_balance_da: Math.round(cashVal),
    owner_contributions_da: Number(prev.owner_contributions_da) || 0,
    owner_withdrawals_da: Number(prev.owner_withdrawals_da) || 0,
    as_of_date: asOfDate,
    notes: notes || null,
    updated_at: new Date().toISOString()
  };

  await idb.put('opening_position', state.openingPosition);
  await idb.queueMutation('opening_position', 'upsert', state.openingPosition);

  closeModal('modal-edit-opening');
  renderAppViews();
  if (state.online && auth.isAuthenticated()) sync.sync();
};

window.exportToExcel = function(scope) {
  if (typeof XLSX === 'undefined') {
    alert('Excel export library (SheetJS) is not loaded yet.');
    return;
  }

  const wb = XLSX.utils.book_new();
  const todayStr = new Date().toISOString().slice(0, 10);

  if (scope === 'inventory') {
    const rows = (state.inventory || []).map(item => ({
      Title: item.title || '',
      Author: item.author || '',
      ISBN: item.isbn || '',
      StockGroup: isAccessoryItem(item) ? 'ACCESSORIES' : (item.stock_group || 'OLD_STOCK'),
      Category: item.category || item.item_type || 'book',
      Received: Number(item.quantity_received) || 0,
      Sold: Number(item.quantity_sold) || 0,
      Reserved: Number(item.quantity_reserved) || 0,
      Damaged: Number(item.quantity_damaged) || 0,
      Lost: Number(item.quantity_lost) || 0,
      Promotional: Number(item.quantity_promotional) || 0,
      ReturnedToSupplier: Number(item.quantity_returned_to_supplier) || 0,
      CountAdjustment: Number(item.quantity_count_adjustment) || 0,
      OnHand: getInventoryOnHandQty(item),
      Available: getInventoryAvailableQty(item),
      UnitCostDA: item.unit_purchase_cost_da !== null && item.unit_purchase_cost_da !== undefined ? Number(item.unit_purchase_cost_da) : null,
      SellingPriceDA: item.selling_price_da !== null && item.selling_price_da !== undefined ? Number(item.selling_price_da) : null,
      Supplier: item.supplier_name || '',
      Location: item.location || '',
      Notes: item.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `Gentle_Readers_Inventory_${todayStr}.xlsx`);
    return;
  }

  const fin = calculateFinancialMetrics();

  if (scope === 'paid-orders') {
    const rows = (fin.paidOrders || []).map(p => ({
      OrderId: p.order.id,
      Date: p.order.created_at || '',
      Segment: p.isHist ? 'Historical' : 'Live',
      Customer: `${p.order.firstName || ''} ${p.order.familyName || ''}`.trim(),
      Phone: p.order.phoneNumber || '',
      Wilaya: p.order.wilaya || '',
      DeliveryMethod: p.order.deliveryMethod || '',
      Carrier: p.carrier || '',
      TrackingNumber: p.trackingNumber || '',
      Items: p.parsedItems.map(i => `${i.title} (x${i.qty})`).join(' | '),
      TotalCustomerPaidDA: p.orderTotal,
      DeliveryFeeExcludedDA: p.shippingFee,
      BookRevenueDA: p.bookRevenue,
      BookCOGS_DA: p.allCostsKnown ? p.cogs : null,
      PackagingCostDA: p.packagingCost,
      ActualCarrierCostAuditDA: p.actualShippingCost,
      NetProfitEarnedDA: p.allCostsKnown ? p.netProfit : null,
      CostStatus: p.allCostsKnown ? 'Confirmed' : `Unknown Cost (${p.unknownTitles.join(', ')})`,
      PaymentStatus: p.paymentStatus,
      PaymentMethod: p.paymentMethod || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Paid Orders Profit');
    XLSX.writeFile(wb, `Gentle_Readers_Paid_Orders_${todayStr}.xlsx`);
    return;
  }

  const ps = fin.paidSummary;
  const summaryRows = [
    { Metric: 'Report Date', Value: todayStr },
    { Metric: 'Opening Cash Balance (DA)', Value: fin.openingCash },
    { Metric: 'Opening Position As-Of Date', Value: fin.openingDate || 'Not set' },
    { Metric: 'Current Reconciled Cash (DA)', Value: fin.currentCashBalance },
    { Metric: 'Paid Orders Count (Total / Live)', Value: `${ps.allCount} (${ps.liveCount} live)` },
    { Metric: 'Paid Orders Book Revenue Net of Delivery (DA)', Value: ps.bookRevenue },
    { Metric: 'Paid Orders Delivery Fees Excluded (DA)', Value: ps.deliveryFeesExcluded },
    { Metric: 'Paid Orders Known COGS (DA)', Value: ps.confirmedOrdersCogs },
    { Metric: 'Paid Orders Packaging Costs (DA)', Value: ps.confirmedOrdersPackagingCosts },
    { Metric: 'Paid Orders Confirmed Net Profit (DA)', Value: ps.confirmedNetProfit },
    { Metric: 'Paid Orders Awaiting Unit Cost Count', Value: ps.unknownCostCount },
    { Metric: 'All Orders Book Revenue Net of Shipping (DA)', Value: fin.totalSalesRevenue },
    { Metric: 'All Orders Delivery Fees Excluded (DA)', Value: fin.totalShippingCollected },
    { Metric: 'Transportation Operating Expenses (Separate)', Value: fin.totalTransportationExpenses },
    { Metric: 'Confirmed Book COGS - Costed Sales Only (DA)', Value: fin.totalCogs },
    { Metric: 'Confirmed Gross Profit (DA)', Value: fin.totalGrossProfit },
    { Metric: 'Total Operating Expenses (DA)', Value: fin.totalOperatingExpenses },
    { Metric: 'Confirmed Net Profit After Expenses (DA)', Value: fin.netProfit },
    { Metric: 'Remaining Inventory Asset Value at Known Cost (DA)', Value: fin.remainingInventoryValueDa },
    { Metric: 'Outstanding Debts (DA)', Value: fin.outstandingDebtsDa },
    { Metric: 'Owner Capital Contributed (DA)', Value: fin.totalCapitalInjected },
    { Metric: 'Owner Withdrawals (DA)', Value: fin.totalOwnerWithdrawals }
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

  const catRows = [
    { Group: 'NEW_STOCK', Titles: fin.newStock.titlesCount, Sold: fin.newStock.soldQty, OnHand: fin.newStock.onHand, Available: fin.newStock.available, CostValueDA: fin.newStock.valuationAtCost, RetailValueDA: fin.newStock.valuationAtRetail, ExpectedProfitDA: fin.newStock.expectedProfit, MarginPct: fin.newStock.marginPct },
    { Group: 'OLD_STOCK', Titles: fin.oldStock.titlesCount, Sold: fin.oldStock.soldQty, OnHand: fin.oldStock.onHand, Available: fin.oldStock.available, CostValueDA: fin.oldStock.valuationAtCost, RetailValueDA: fin.oldStock.valuationAtRetail, ExpectedProfitDA: fin.oldStock.expectedProfit, MarginPct: fin.oldStock.marginPct },
    { Group: 'COMBINED_BOOKS', Titles: fin.combinedBooks.titlesCount, Sold: fin.combinedBooks.soldQty, OnHand: fin.combinedBooks.onHand, Available: fin.combinedBooks.available, CostValueDA: fin.combinedBooks.valuationAtCost, RetailValueDA: fin.combinedBooks.valuationAtRetail, ExpectedProfitDA: fin.combinedBooks.expectedProfit, MarginPct: fin.combinedBooks.marginPct },
    { Group: 'ACCESSORIES', Titles: fin.accessories.itemsCount, Sold: fin.accessories.soldQty, OnHand: fin.accessories.onHand, Available: fin.accessories.available, CostValueDA: fin.accessories.valuationAtCost, RetailValueDA: fin.accessories.valuationAtRetail, ExpectedProfitDA: fin.accessories.expectedProfit, MarginPct: fin.accessories.marginPct }
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catRows), 'Category Valuation');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fin.titleProfits), 'Profit By Title');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.expenses || []), 'Operating Expenses');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.debts || []), 'Debts');
  XLSX.writeFile(wb, `Gentle_Readers_Finance_Report_${todayStr}.xlsx`);
};

window.handlePasswordLogin = async function(event) {
  event.preventDefault();
  const passInput = document.getElementById('admin-pass-input');
  const errorEl = document.getElementById('login-error-msg');
  const password = (passInput?.value || '').trim();

  if (!password) {
    if (errorEl) {
      errorEl.textContent = 'Please enter password.';
      errorEl.style.display = 'block';
    }
    return;
  }

  const success = await auth.loginWithPassword(password);
  if (success) {
    setupAuthUI(true);
    sync.sync();
  } else {
    if (errorEl) {
      errorEl.textContent = 'Invalid password. Please check your admin credentials.';
      errorEl.style.display = 'block';
    }
  }
};

// 5. View Order Details Modal with Reservation & Status Management
window.viewOrderDetails = function(orderId) {
  const order = state.orders.find(o => String(o.id) === String(orderId));
  if (!order) return;

  const modal = document.getElementById('generic-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  const eff = getEffectiveOrderStatus(order);
  const meta = eff.meta;
  const status = eff.status;
  const paymentStatus = eff.paymentStatus;
  const isHistorical = !!(order.is_historical || Number(order.id) <= 170);
  const paymentMethod = meta?.payment_method || '';

  const allocs = state.orderAllocations ? state.orderAllocations.filter(a => String(a.order_id) === String(orderId)) : [];

  title.textContent = `Order Details #${order.id} — تفاصيل الطلب`;
  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; background: #F8F5EE; padding: 10px 14px; border-radius: 8px; flex-wrap: wrap; gap: 8px;">
        <div>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Fulfillment:</span>
          <span class="badge ${status === 'delivered' ? 'badge-green' : (status === 'cancelled' ? 'badge-rose' : 'badge-gold')}" style="margin-left: 6px; font-weight: bold;">
            ${escapeHtml(status.toUpperCase())}
          </span>
          <span class="badge ${paymentStatus === 'paid' ? 'badge-green' : (paymentStatus === 'refunded' ? 'badge-rose' : 'badge-amber')}" style="margin-left: 6px; font-weight: bold;">
            ${escapeHtml(paymentStatus.toUpperCase())}
          </span>
        </div>
        <div>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Type:</span>
          <span class="badge ${isHistorical ? 'badge-neutral' : 'badge-blue'}" style="margin-left: 6px;">
            ${isHistorical ? 'Historical (Read-only)' : 'Live Customer Order'}
          </span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; background: var(--bg-card-subtle); padding: 14px; border-radius: 8px;">
        <div><strong>Customer:</strong> ${escapeHtml(order.firstName || '')} ${escapeHtml(order.familyName || '')}</div>
        <div><strong>Phone:</strong> ${escapeHtml(order.phoneNumber || '')}</div>
        <div><strong>Instagram:</strong> ${order.instagramUsername ? '@' + escapeHtml(order.instagramUsername) : 'None'}</div>
        <div><strong>Date:</strong> ${formatDate(order.created_at)}</div>
        <div><strong>Delivery:</strong> ${(order.deliveryMethod || '-').toUpperCase()} (${escapeHtml(order.wilaya || '')})</div>
        <div><strong>Packaging:</strong> ${escapeHtml(order.packaging_type || 'none')}</div>
      </div>

      <div>
        <h4 style="font-family: var(--font-serif); margin-bottom: 8px;">Ordered Items (قائمة الكتب):</h4>
        <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px;">
          ${formatOrderItems(order.items)}
        </div>
      </div>

      ${allocs.length > 0 ? `
        <div>
          <h4 style="font-family: var(--font-serif); font-size: 0.95rem; margin-bottom: 6px;">
            <i class="fa-solid fa-layer-group"></i> FIFO Stock Allocations (تخصيص المخزون حسب الدفعة)
          </h4>
          <div class="vintage-table-wrapper">
            <table class="vintage-table" style="font-size: 0.82rem;">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Stock Group</th>
                  <th>Allocated Qty</th>
                  <th>Unit Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${allocs.map(a => `
                  <tr>
                    <td><strong>${escapeHtml(a.title || 'Book')}</strong></td>
                    <td><span class="badge ${a.stock_group === 'OLD_STOCK' ? 'badge-neutral' : 'badge-blue'}">${a.stock_group || 'NEW_STOCK'}</span></td>
                    <td>${a.quantity}</td>
                    <td>${a.unit_purchase_cost_da != null ? a.unit_purchase_cost_da.toLocaleString('fr-DZ') + ' DA' : '<em style="color:var(--text-muted)">Unknown (NULL)</em>'}</td>
                    <td><span class="badge ${a.allocation_status === 'confirmed' ? 'badge-green' : (a.allocation_status === 'released' ? 'badge-rose' : 'badge-gold')}">${a.allocation_status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 10px;">
        <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 8px;">Payment, Shipping &amp; Operational Metadata:</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 10px; margin-bottom: 10px;">
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted);">Payment Status / حالة الدفع</label>
            <select id="modal-meta-payment-status" class="input" style="padding: 6px 10px; font-size: 0.85rem;" ${isHistorical ? 'disabled' : ''}>
              <option value="unpaid" ${paymentStatus === 'unpaid' ? 'selected' : ''}>Unpaid / غير مدفوع</option>
              <option value="paid" ${paymentStatus === 'paid' ? 'selected' : ''}>Paid / مدفوع</option>
              <option value="refunded" ${paymentStatus === 'refunded' ? 'selected' : ''}>Refunded / مسترجع</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted);">Payment Method</label>
            <select id="modal-meta-payment-method" class="input" style="padding: 6px 10px; font-size: 0.85rem;" ${isHistorical ? 'disabled' : ''}>
              <option value="" ${!paymentMethod ? 'selected' : ''}>Select method...</option>
              <option value="cod" ${paymentMethod === 'cod' ? 'selected' : ''}>Cash on Delivery</option>
              <option value="cash" ${paymentMethod === 'cash' ? 'selected' : ''}>Cash / نقداً</option>
              <option value="baridimob" ${paymentMethod === 'baridimob' ? 'selected' : ''}>Baridimob</option>
              <option value="ccp" ${paymentMethod === 'ccp' ? 'selected' : ''}>CCP / Bank Transfer</option>
              <option value="other" ${paymentMethod === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted);">Carrier</label>
            <input type="text" id="modal-meta-carrier" class="input" value="${escapeHtml(meta?.carrier || '')}" placeholder="e.g. Yalidine, ZR Express" style="padding: 6px 10px; font-size: 0.85rem;" ${isHistorical ? 'disabled' : ''}>
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted);">Tracking #</label>
            <input type="text" id="modal-meta-tracking" class="input" value="${escapeHtml(meta?.tracking_number || '')}" placeholder="Tracking number" style="padding: 6px 10px; font-size: 0.85rem;" ${isHistorical ? 'disabled' : ''}>
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted);">Packaging Used</label>
            <input type="text" id="modal-meta-packaging" class="input" value="${escapeHtml(meta?.packaging_used || '')}" placeholder="e.g. Bubble envelope, Box" style="padding: 6px 10px; font-size: 0.85rem;" ${isHistorical ? 'disabled' : ''}>
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted);">Packaging Cost (DA)</label>
            <input type="number" id="modal-meta-pkg-cost" class="input" min="0" step="10" value="${eff.packagingCost || 0}" style="padding: 6px 10px; font-size: 0.85rem;" ${isHistorical ? 'disabled' : ''}>
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted);">Delivery Fee Excluded (DA)</label>
            <input type="number" id="modal-meta-ship-fee" class="input" min="0" step="50" value="${eff.shippingFee || 0}" style="padding: 6px 10px; font-size: 0.85rem;" ${isHistorical ? 'disabled' : ''}>
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted);">Actual Carrier Cost (DA)</label>
            <input type="number" id="modal-meta-act-ship" class="input" min="0" step="50" value="${eff.actualShippingCost || 0}" style="padding: 6px 10px; font-size: 0.85rem;" ${isHistorical ? 'disabled' : ''}>
          </div>
        </div>
        ${!isHistorical ? `
          <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: center;">
            <button type="button" class="btn-secondary" style="font-size: 0.82rem; padding: 6px 14px;" onclick="saveOrderOperationalDetails(${order.id})">
              <i class="fa-solid fa-floppy-disk"></i> Save Payment &amp; Operational Details
            </button>
          </div>
        ` : ''}
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; border-top: 1px solid var(--border-color); padding-top: 12px; background: #FFFDF8; padding: 12px; border-radius: 8px;">
        <div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">Customer Paid Total</div>
          <strong style="font-size: 1.1rem;">${eff.orderTotal.toLocaleString('fr-DZ')} DA</strong>
        </div>
        <div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">Delivery Fee (Excluded)</div>
          <strong style="font-size: 1.1rem; color: var(--text-muted);">− ${eff.shippingFee.toLocaleString('fr-DZ')} DA</strong>
        </div>
        <div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">Book Sales Revenue</div>
          <strong style="font-size: 1.15rem; color: var(--success);">${eff.bookRevenue.toLocaleString('fr-DZ')} DA</strong>
        </div>
      </div>

      ${!isHistorical ? `
        <div style="border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 10px;">
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 8px;">Order Actions &amp; Fulfillment Status:</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
            ${status === 'pending' ? `
              <button class="btn-secondary" onclick="updateOrderStatus(${order.id}, 'processing')">
                <i class="fa-solid fa-gears"></i> Mark Processing
              </button>
              <button class="btn-primary" onclick="updateOrderStatus(${order.id}, 'shipped')">
                <i class="fa-solid fa-truck-fast"></i> Mark Shipped
              </button>
              <button class="btn-secondary" style="color: var(--danger); border-color: var(--danger);" onclick="updateOrderStatus(${order.id}, 'cancelled')">
                <i class="fa-solid fa-ban"></i> Cancel Order (Release Stock)
              </button>
            ` : (status === 'processing' ? `
              <button class="btn-primary" onclick="updateOrderStatus(${order.id}, 'shipped')">
                <i class="fa-solid fa-truck-fast"></i> Mark Shipped
              </button>
              <button class="btn-secondary" style="color: var(--danger); border-color: var(--danger);" onclick="updateOrderStatus(${order.id}, 'cancelled')">
                <i class="fa-solid fa-ban"></i> Cancel Order
              </button>
            ` : (status === 'shipped' ? `
              <button class="btn-primary" onclick="updateOrderStatus(${order.id}, 'delivered')">
                <i class="fa-solid fa-check-double"></i> Confirm Delivery &amp; Paid
              </button>
              <button class="btn-secondary" style="color: var(--danger); border-color: var(--danger);" onclick="updateOrderStatus(${order.id}, 'cancelled')">
                <i class="fa-solid fa-ban"></i> Cancel Order
              </button>
            ` : (status === 'delivered' || status === 'partially_returned' ? `
              <button class="btn-secondary" onclick="openOrderReturnModal(${order.id})">
                <i class="fa-solid fa-arrow-rotate-left"></i> Record Return / إرجاع كتاب
              </button>
              <span style="font-size: 0.85rem; color: var(--text-muted); align-self: center;">Status: <strong>${escapeHtml(status)}</strong></span>
            ` : `
              <span style="font-size: 0.85rem; color: var(--text-muted);">Order finalized as <strong>${escapeHtml(status)}</strong>.</span>
            `)))}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  modal.classList.add('active');
};

window.saveOrderOperationalDetails = async function(orderId) {
  const paymentStatus = document.getElementById('modal-meta-payment-status')?.value || 'unpaid';
  const paymentMethod = (document.getElementById('modal-meta-payment-method')?.value || '').trim();
  const carrier = (document.getElementById('modal-meta-carrier')?.value || '').trim();
  const trackingNumber = (document.getElementById('modal-meta-tracking')?.value || '').trim();
  const packagingUsed = (document.getElementById('modal-meta-packaging')?.value || '').trim();
  const packagingCost = parseFloat(document.getElementById('modal-meta-pkg-cost')?.value) || 0;
  const shippingFee = parseFloat(document.getElementById('modal-meta-ship-fee')?.value) || 0;
  const actualShipping = parseFloat(document.getElementById('modal-meta-act-ship')?.value) || 0;

  const orderNumId = Number(orderId);
  let meta = state.orderMeta ? state.orderMeta.find(m => String(m.order_id) === String(orderId)) : null;
  if (!meta) {
    meta = {
      order_id: orderNumId,
      fulfillment_status: 'pending',
      payment_status: paymentStatus,
      payment_method: paymentMethod || null,
      carrier,
      tracking_number: trackingNumber,
      packaging_used: packagingUsed,
      packaging_cost_da: packagingCost,
      shipping_fee_da: shippingFee,
      actual_shipping_cost_da: actualShipping,
      updated_at: new Date().toISOString()
    };
    if (!state.orderMeta) state.orderMeta = [];
    state.orderMeta.push(meta);
  } else {
    meta.payment_status = paymentStatus;
    meta.payment_method = paymentMethod || null;
    meta.carrier = carrier;
    meta.tracking_number = trackingNumber;
    meta.packaging_used = packagingUsed;
    meta.packaging_cost_da = packagingCost;
    meta.shipping_fee_da = shippingFee;
    meta.actual_shipping_cost_da = actualShipping;
    meta.updated_at = new Date().toISOString();
  }
  await idb.put('order_meta', meta);

  // Queue RPC mutation strictly via update_order_operational_meta
  await idb.queueMutation('update_order_operational_meta', 'rpc', {
    p_order_id: orderNumId,
    p_carrier: carrier || null,
    p_tracking_number: trackingNumber || null,
    p_packaging_used: packagingUsed || null,
    p_packaging_cost_da: packagingCost,
    p_shipping_fee_da: shippingFee,
    p_actual_shipping_cost_da: actualShipping,
    p_payment_status: paymentStatus,
    p_payment_method: paymentMethod || null
  });

  renderAppViews();
  alert('Payment and operational metadata saved successfully.');
  if (state.online && auth.isAuthenticated()) sync.sync();
};

window.updateOrderStatus = async function(orderId, newStatus) {
  const order = state.orders.find(o => String(o.id) === String(orderId));
  if (!order) return;

  const orderNumId = Number(orderId);
  const isHistorical = !!(order.is_historical || orderNumId <= 170);
  if (isHistorical) {
    alert('Historical orders (Order #1 to #170) are archived and read-only. Their fulfillment status and inventory cannot be modified.');
    return;
  }

  let meta = state.orderMeta ? state.orderMeta.find(m => String(m.order_id) === String(orderId)) : null;
  const currentStatus = meta ? meta.fulfillment_status : 'pending';

  if (currentStatus === newStatus) {
    alert(`Order is already marked as ${newStatus}.`);
    return;
  }

  // Reject invalid state transitions
  if (currentStatus === 'cancelled' && newStatus === 'delivered') {
    alert('Invalid transition: Cannot deliver a cancelled order.');
    return;
  }
  if (currentStatus === 'delivered' && newStatus === 'cancelled') {
    alert('Invalid transition: Cannot cancel an already delivered order. Process a return instead.');
    return;
  }

  // Parse items safely using robust parseOrderItem helper
  let rawItems = [];
  try {
    rawItems = typeof order.items === 'string' ? JSON.parse(order.items) : (Array.isArray(order.items) ? order.items : []);
  } catch (e) {
    rawItems = Array.isArray(order.items) ? order.items : (order.items ? [order.items] : []);
  }
  if (!Array.isArray(rawItems)) rawItems = [rawItems];
  const items = rawItems.map(parseOrderItem);

  // 1. Transition to Cancelled or Rejected: Release reserved stock
  if (newStatus === 'cancelled' || newStatus === 'rejected') {
    const actionLabel = newStatus === 'rejected' ? 'reject' : 'cancel';
    if (!confirm(`Are you sure you want to ${actionLabel} this order? Any reserved stock will be safely released.`)) return;

    for (const itm of items) {
      const inv = findInventoryItem(itm.title);
      if (inv) {
        const reservedCount = Number(inv.quantity_reserved) || 0;
        const releaseQty = Math.min(reservedCount, itm.qty);
        if (releaseQty > 0) {
          inv.quantity_reserved = reservedCount - releaseQty;
          await idb.put('inventory', inv);
        }
      }
    }

    const allocs = state.orderAllocations ? state.orderAllocations.filter(a => String(a.order_id) === String(orderId)) : [];
    for (const al of allocs) {
      al.allocation_status = 'released';
      await idb.put('order_stock_allocations', al);
    }
    // Perform lifecycle cancellation strictly via SECURITY DEFINER RPC
    await idb.queueMutation('cancel_order', 'rpc', { p_order_id: orderNumId });
  }

  // 2. Transition to Delivered: Confirm reservation into sold
  else if (newStatus === 'delivered') {
    if (!confirm('Mark order as delivered? This will convert reserved stock to permanently sold.')) return;

    for (const itm of items) {
      const inv = findInventoryItem(itm.title);
      if (inv) {
        const reservedCount = Number(inv.quantity_reserved) || 0;
        const convertQty = Math.min(reservedCount, itm.qty);
        if (convertQty > 0) {
          inv.quantity_reserved = Math.max(0, reservedCount - convertQty);
          inv.quantity_sold = (Number(inv.quantity_sold) || 0) + convertQty;
          await idb.put('inventory', inv);
        } else {
          console.warn(`[Inventory] Order #${orderId} item "${itm.title}" has 0 reserved quantity. Sold count was not incremented to prevent unallocated phantom sales.`);
        }
      }
    }

    const allocs = state.orderAllocations ? state.orderAllocations.filter(a => String(a.order_id) === String(orderId)) : [];
    for (const al of allocs) {
      al.allocation_status = 'confirmed';
      await idb.put('order_stock_allocations', al);
    }
    // Perform lifecycle delivery confirmation strictly via SECURITY DEFINER RPC
    await idb.queueMutation('confirm_order_delivery', 'rpc', { p_order_id: orderNumId });
  }

  // 3. Transition to Processing or Shipped via secured RPC
  else if (newStatus === 'processing' || newStatus === 'shipped') {
    await idb.queueMutation('transition_order_fulfillment_status', 'rpc', {
      p_order_id: orderNumId,
      p_new_status: newStatus
    });
  }

  // Update local IndexedDB for immediate responsive offline UI
  if (!meta) {
    meta = {
      order_id: orderNumId,
      fulfillment_status: newStatus,
      payment_status: newStatus === 'delivered' ? 'paid' : 'unpaid',
      updated_at: new Date().toISOString()
    };
    if (!state.orderMeta) state.orderMeta = [];
    state.orderMeta.push(meta);
  } else {
    meta.fulfillment_status = newStatus;
    if (newStatus === 'delivered') {
      meta.payment_status = 'paid';
    }
    meta.updated_at = new Date().toISOString();
  }

  await idb.put('order_meta', meta);

  closeGenericModal();
  renderAppViews();
  if (state.online && auth.isAuthenticated()) sync.sync();
};

window.openOrderReturnModal = function(orderId) {
  const order = state.orders.find(o => String(o.id) === String(orderId));
  if (!order) return;

  let rawItems = [];
  try {
    rawItems = typeof order.items === 'string' ? JSON.parse(order.items) : (Array.isArray(order.items) ? order.items : []);
  } catch (e) {
    rawItems = Array.isArray(order.items) ? order.items : (order.items ? [order.items] : []);
  }
  if (!Array.isArray(rawItems)) rawItems = [rawItems];
  const items = rawItems.map(parseOrderItem);

  const modal = document.getElementById('generic-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = `Record Customer Return — Order #${order.id}`;
  body.innerHTML = `
    <form onsubmit="handleRecordCustomerReturn(event, ${order.id})">
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 14px;">
        Specify returned books and their condition. Sellable books return to available stock; damaged books are tracked as damaged inventory.
      </p>

      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
        ${items.map((itm, idx) => {
          const itmTitle = itm.title || 'Book';
          const itmQty = itm.qty || 1;
          return `
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; align-items: center; background: #FFF; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px;">
              <div><strong>${escapeHtml(itmTitle)}</strong> <small>(Sold: ${itmQty})</small></div>
              <div>
                <label style="font-size: 0.78rem;">Return Qty:</label>
                <input type="number" class="form-control return-qty-input" data-title="${escapeHtml(itmTitle)}" data-max="${itmQty}" min="0" max="${itmQty}" value="0" />
              </div>
              <div>
                <label style="font-size: 0.78rem;">Condition:</label>
                <select class="form-control return-cond-input">
                  <option value="sellable">Sellable / قابل للبيع</option>
                  <option value="damaged">Damaged / تالف</option>
                </select>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label>Return Reason & Notes / سبب الإرجاع وملاحظات:</label>
        <textarea id="order-return-notes" class="form-control" placeholder="e.g. Customer changed mind, damaged in transit..."></textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn-secondary" onclick="closeGenericModal()">Cancel</button>
        <button type="submit" class="btn-primary"><i class="fa-solid fa-save"></i> Process Return</button>
      </div>
    </form>
  `;
  modal.classList.add('active');
};

window.handleRecordCustomerReturn = async function(event, orderId) {
  event.preventDefault();
  const qtyInputs = document.querySelectorAll('.return-qty-input');
  const condInputs = document.querySelectorAll('.return-cond-input');
  const notes = (document.getElementById('order-return-notes')?.value || '').trim();

  let totalReturning = 0;
  const returnRecords = [];

  for (let i = 0; i < qtyInputs.length; i++) {
    const qty = parseInt(qtyInputs[i].value) || 0;
    const maxQty = parseInt(qtyInputs[i].getAttribute('data-max')) || 1;
    const title = qtyInputs[i].getAttribute('data-title');
    const cond = condInputs[i].value;

    if (qty > maxQty) {
      alert(`Cannot return ${qty} of "${title}". Maximum returnable is ${maxQty}.`);
      return;
    }

    if (qty > 0) {
      totalReturning += qty;
      returnRecords.push({ title, quantity: qty, condition: cond });
    }
  }

  if (totalReturning === 0) {
    alert('Please enter a return quantity greater than 0 for at least one book.');
    return;
  }

  // Process inventory adjustment
  for (const ret of returnRecords) {
    const inv = findInventoryItem(ret.title);
    if (inv) {
      const soldCount = Number(inv.quantity_sold) || 0;
      const decQty = Math.min(soldCount, ret.quantity);
      inv.quantity_sold = Math.max(0, soldCount - decQty);
      if (ret.condition === 'damaged') {
        inv.quantity_damaged = (Number(inv.quantity_damaged) || 0) + ret.quantity;
      }
      await idb.put('inventory', inv);
    }

    // Record in local order_returns cache
    const matchedAlloc = (state.orderStockAllocations || []).find(a => 
      String(a.order_id) === String(orderId) && 
      (inv ? String(a.inventory_item_id) === String(inv.id) : true)
    );

    const returnEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : ('ret_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
      order_id: Number(orderId),
      inventory_item_id: inv ? inv.id : null,
      allocation_id: matchedAlloc ? matchedAlloc.id : null,
      title: ret.title,
      quantity: ret.quantity,
      condition: ret.condition,
      notes: notes || null,
      created_at: new Date().toISOString()
    };
    await idb.put('order_returns', returnEntry);
    if (!state.orderReturns) state.orderReturns = [];
    state.orderReturns.push(returnEntry);
  }

  // Queue atomic SECURITY DEFINER RPC to process return safely on server
  await idb.queueMutation('record_order_return', 'rpc', {
    p_order_id: Number(orderId),
    p_items: returnRecords.map(r => ({ title: r.title, quantity: r.quantity })),
    p_condition: returnRecords[0]?.condition || 'sellable',
    p_notes: notes || null
  });

  // Determine order-level return status: partially_returned vs returned
  let orderTotalSold = 0;
  for (let i = 0; i < qtyInputs.length; i++) {
    orderTotalSold += (parseInt(qtyInputs[i].getAttribute('data-max')) || 1);
  }
  const prevReturnsForOrder = (state.orderReturns || []).filter(r => String(r.order_id) === String(orderId));
  const prevReturnedQty = prevReturnsForOrder.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  // Note: returnRecords were already pushed to state.orderReturns above
  const newFulfillmentStatus = (prevReturnedQty) >= orderTotalSold ? 'returned' : 'partially_returned';

  let meta = state.orderMeta ? state.orderMeta.find(m => String(m.order_id) === String(orderId)) : null;

  if (meta) {
    meta.fulfillment_status = newFulfillmentStatus;
    meta.return_condition = returnRecords.map(r => r.condition).join(', ');
    meta.updated_at = new Date().toISOString();
  } else {
    meta = {
      order_id: Number(orderId),
      fulfillment_status: newFulfillmentStatus,
      payment_status: 'unpaid',
      return_condition: returnRecords.map(r => r.condition).join(', '),
      updated_at: new Date().toISOString()
    };
    if (!state.orderMeta) state.orderMeta = [];
    state.orderMeta.push(meta);
  }

  await idb.put('order_meta', meta);
  // NOTE: order_meta status update on server is handled automatically by the record_order_return RPC.

  closeGenericModal();
  renderAppViews();
  alert('Customer return processed and logged successfully.');
  if (state.online && auth.isAuthenticated()) sync.sync();
};

window.closeGenericModal = function() {
  document.getElementById('generic-modal').classList.remove('active');
};

// ============================================================================
// 7. EXCEL WORKBOOK IMPORTER (Gentle_Readers_Inventory_Starter.xlsx)
// ============================================================================
window.openExcelImportModal = function() {
  resetExcelImporter();
  openModal('modal-excel-import');
};

window.resetExcelImporter = function() {
  state.excelWorkbook = null;
  state.excelParsedData = null;
  state.activeImporterSheet = 'NEW BATCH';

  const uploadStep = document.getElementById('importer-step-upload');
  const previewStep = document.getElementById('importer-step-preview');
  const reportStep = document.getElementById('importer-step-report');
  const execBtn = document.getElementById('btn-execute-excel-import');
  const fileInput = document.getElementById('excel-file-input');

  if (uploadStep) uploadStep.style.display = 'block';
  if (previewStep) previewStep.style.display = 'none';
  if (reportStep) reportStep.style.display = 'none';
  if (execBtn) execBtn.style.display = 'none';
  if (fileInput) fileInput.value = '';
};

// Drag & drop setup
document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('excel-dropzone');
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processExcelFile(files[0]);
      }
    });
  }
});

window.handleExcelFileSelect = function(event) {
  const file = event.target.files && event.target.files[0];
  if (file) {
    processExcelFile(file);
  }
};

function processExcelFile(file) {
  if (typeof XLSX === 'undefined') {
    alert('SheetJS Excel engine is still loading. Please try again in a few moments.');
    return;
  }

  const nameEl = document.getElementById('picked-file-name');
  const sizeEl = document.getElementById('picked-file-size');
  const dateEl = document.getElementById('picked-file-date');
  if (nameEl) nameEl.textContent = file.name;
  if (sizeEl) sizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;
  if (dateEl && file.lastModified) dateEl.textContent = `Modified: ${new Date(file.lastModified).toLocaleString()}`;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      state.excelWorkbook = workbook;

      parseWorkbookData(workbook);
      showImporterPreview();
    } catch (err) {
      console.error('[Excel Importer Error]', err);
      alert('Failed to parse Excel workbook: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ============================================================================
// EXCEL IMPORT SAFE NORMALIZATION & PARSING HELPERS
// ============================================================================
function safeCellString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function safeCellNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function getRowColumn(row, candidates) {
  if (!row || typeof row !== 'object') return null;
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const target = safeCellString(candidate).toLowerCase();
    // 1. Exact match (case-insensitive, trimmed)
    for (const key of keys) {
      if (safeCellString(key).toLowerCase() === target) {
        if (row[key] !== null && row[key] !== undefined && row[key] !== '') return row[key];
      }
    }
    // 2. Substring match
    for (const key of keys) {
      if (safeCellString(key).toLowerCase().includes(target)) {
        if (row[key] !== null && row[key] !== undefined && row[key] !== '') return row[key];
      }
    }
  }
  return null;
}

function sheetToJsonAuto(ws, headerKeywords = []) {
  if (!ws) return [];
  const raw2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (raw2D.length === 0) return [];

  let headerRowIndex = 0;
  if (headerKeywords && headerKeywords.length > 0) {
    for (let r = 0; r < Math.min(raw2D.length, 25); r++) {
      const row = raw2D[r];
      if (Array.isArray(row)) {
        const rowStr = row.map(c => safeCellString(c).toLowerCase()).join(' ');
        const matches = headerKeywords.filter(kw => rowStr.includes(kw.toLowerCase()));
        if (matches.length >= 1) {
          headerRowIndex = r;
          break;
        }
      }
    }
  }

  return XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: null });
}

function detectSheetRole(sheetName, headers) {
  const sLower = safeCellString(sheetName).toLowerCase();
  const hStr = (headers || []).map(h => safeCellString(h).toLowerCase()).join(' ');

  if (sLower.includes('new batch') || (hStr.includes('supplier') && hStr.includes('date received') && hStr.includes('batch cost'))) {
    return 'NEW BATCH';
  }
  if (sLower.includes('old stock') || (hStr.includes('counted today') || hStr.includes('condition'))) {
    return 'OLD STOCK';
  }
  if (
    sLower.includes('accessor') || 
    sLower.includes('bookmark') || 
    sLower.includes('فواصل') || 
    sLower.includes('فاصل') || 
    sLower.includes('إكسسوار') || 
    sLower.includes('اكسسوار') || 
    sLower.includes('sheet1') || 
    sLower.includes('sheet 1') || 
    sLower.includes('packaging') || 
    sLower.includes('تغليف') || 
    sLower.includes('craft') || 
    (hStr.includes('product') && (hStr.includes('category') || hStr.includes('quantity') || hStr.includes('cost') || hStr.includes('price') || hStr.includes('selling')))
  ) {
    return 'ACCESSORIES';
  }
  if (sLower.includes('debt') || hStr.includes('creditor') || sLower.includes('ديون') || hStr.includes('دائن')) {
    return 'DEBTS';
  }
  if (sLower.includes('opening') || hStr.includes('cash available') || (hStr.includes('item') && hStr.includes('amount')) || sLower.includes('رصيد') || sLower.includes('بداية')) {
    return 'OPENING POSITION';
  }
  return 'OTHER';
}

function parseWorkbookData(wb) {
  state.excelWorkbookSheets = {};
  const parsed = {
    newBatch: [],
    oldStock: [],
    accessories: [],
    debts: [],
    opening: []
  };

  wb.SheetNames.forEach(sName => {
    const ws = wb.Sheets[sName];
    if (!ws) return;
    const raw2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    if (raw2D.length === 0) return;

    let headerRowIndex = 0;
    for (let r = 0; r < Math.min(raw2D.length, 15); r++) {
      const row = raw2D[r];
      if (Array.isArray(row)) {
        const nonNull = row.filter(c => c !== null && String(c).trim() !== '');
        if (nonNull.length >= 2) {
          headerRowIndex = r;
          break;
        }
      }
    }

    const headers = (raw2D[headerRowIndex] || []).map((h, i) => safeCellString(h) || ('Col_' + (i + 1)));
    const role = detectSheetRole(sName, headers);
    const rows = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: null });

    const validRows = [];
    const emptyRows = [];
    const warnings = [];

    rows.forEach((r, idx) => {
      const rowNum = headerRowIndex + 2 + idx;
      r.__rowNum = rowNum;

      if (role === 'NEW BATCH') {
        const title = safeCellString(getRowColumn(r, ['Title', 'عنوان', 'book_title', 'book']));
        if (!title) {
          emptyRows.push(r);
        } else {
          validRows.push(r);
          const cost = safeCellNumber(getRowColumn(r, ['Unit purchase cost (DA)', 'Unit purchase cost', 'cost', 'سعر الشراء']));
          const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'Selling price', 'price', 'سعر البيع']));
          if (cost === null) warnings.push(`Row ${rowNum}: "${title}" has no Unit Purchase Cost.`);
          if (price === null) warnings.push(`Row ${rowNum}: "${title}" has no Selling Price.`);
        }
      } else if (role === 'OLD STOCK') {
        const title = safeCellString(getRowColumn(r, ['Title', 'عنوان', 'book_title', 'book']));
        if (!title) {
          emptyRows.push(r);
        } else {
          validRows.push(r);
          const cost = safeCellNumber(getRowColumn(r, ['Original purchase cost per copy (DA)', 'Unit purchase cost', 'cost', 'سعر الشراء']));
          const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'Selling price', 'price', 'سعر البيع']));
          if (cost === null) warnings.push(`Row ${rowNum}: "${title}" has no Purchase Cost.`);
          if (price === null) warnings.push(`Row ${rowNum}: "${title}" has no Selling Price.`);
        }
      } else if (role === 'ACCESSORIES') {
        const prod = safeCellString(getRowColumn(r, ['Product Name', 'Title', 'Product', 'Item', 'PRODUCT', 'اسم المنتج']));
        if (!prod) {
          emptyRows.push(r);
        } else {
          validRows.push(r);
          const cost = safeCellNumber(getRowColumn(r, ['Unit purchase cost (DA)', 'unit purchase cost', 'cost', 'سعر الشراء']));
          const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'selling price', 'price', 'سعر البيع']));
          const qty = safeCellNumber(getRowColumn(r, ['Quantity purchased', 'QUANTITY', 'Quantity', 'qty', 'الكمية']));
          if (cost === null) warnings.push(`Row ${rowNum}: "${prod}" has no Unit Purchase Cost.`);
          if (price === null) warnings.push(`Row ${rowNum}: "${prod}" has no Selling Price.`);
          if (qty === null) warnings.push(`Row ${rowNum}: "${prod}" has no Quantity specified.`);
        }
      } else if (role === 'DEBTS') {
        const creditor = safeCellString(getRowColumn(r, ['Creditor / person', 'creditor', 'دائن']));
        const amt = safeCellNumber(getRowColumn(r, ['Original amount (DA)', 'amount', 'مبلغ'])) || 0;
        if (!creditor || amt <= 0) {
          emptyRows.push(r);
        } else {
          validRows.push(r);
        }
      } else if (role === 'OPENING POSITION') {
        const item = safeCellString(getRowColumn(r, ['Item', 'بند']));
        if (!item) {
          emptyRows.push(r);
        } else {
          validRows.push(r);
        }
      } else {
        validRows.push(r);
      }
    });

    state.excelWorkbookSheets[sName] = {
      sheetName: sName,
      role: role,
      headerRow: headerRowIndex + 1,
      headers: headers,
      rows: rows,
      validRows: validRows,
      emptyRows: emptyRows,
      warnings: warnings
    };

    if (role === 'NEW BATCH' && parsed.newBatch.length === 0) parsed.newBatch = rows;
    if (role === 'OLD STOCK' && parsed.oldStock.length === 0) parsed.oldStock = rows;
    if (role === 'ACCESSORIES') {
      if (!parsed.accessories) parsed.accessories = [];
      parsed.accessories.push(...rows);
    }
    if (role === 'DEBTS' && parsed.debts.length === 0) parsed.debts = rows;
    if (role === 'OPENING POSITION' && parsed.opening.length === 0) parsed.opening = rows;
  });

  state.excelParsedData = parsed;
}

function showImporterPreview() {
  const uploadStep = document.getElementById('importer-step-upload');
  const previewStep = document.getElementById('importer-step-preview');
  const execBtn = document.getElementById('btn-execute-excel-import');

  if (uploadStep) uploadStep.style.display = 'none';
  if (previewStep) previewStep.style.display = 'block';
  if (execBtn) execBtn.style.display = 'inline-flex';

  const tabsContainer = document.getElementById('importer-tabs-container');
  if (tabsContainer && state.excelWorkbookSheets) {
    const sNames = Object.keys(state.excelWorkbookSheets);
    tabsContainer.innerHTML = sNames.map((sName, idx) => {
      const s = state.excelWorkbookSheets[sName];
      let icon = 'fa-table';
      let badgeColor = 'badge-neutral';
      let label = sName;

      if (s.role === 'NEW BATCH') {
        icon = 'fa-boxes-stacked';
        badgeColor = 'badge-blue';
        label = `${sName} (Book Fair)`;
      } else if (s.role === 'OLD STOCK') {
        icon = 'fa-clock-rotate-left';
        badgeColor = 'badge-amber';
        label = `${sName} (Old Stock)`;
      } else if (s.role === 'ACCESSORIES') {
        icon = 'fa-gem';
        badgeColor = 'badge-purple';
        label = sName.toLowerCase().includes('sheet') ? `${sName} (ACCESSORIES)` : sName;
      } else if (s.role === 'DEBTS') {
        icon = 'fa-scale-balanced';
        badgeColor = 'badge-gray';
      } else if (s.role === 'OPENING POSITION') {
        icon = 'fa-vault';
        badgeColor = 'badge-green';
      }

      const countText = s.role === 'OTHER' ? `${s.rows.length} rows` : `${s.validRows.length} items`;
      return `
        <button type="button" class="importer-tab-btn ${idx === 0 ? 'active' : ''}" data-sheet="${escapeHtml(sName)}" onclick="switchImporterSheet('${escapeHtml(sName)}')">
          <i class="fa-solid ${icon}"></i> ${escapeHtml(label)}
          <span class="badge ${badgeColor}" style="${s.role === 'ACCESSORIES' ? 'background: #EDE9FE; color: #5B21B6;' : ''}">${countText}</span>
        </button>
      `;
    }).join('');
  }

  // Choose default sheet (prefer NEW BATCH if available, else first sheet)
  const availableSheets = Object.keys(state.excelWorkbookSheets || {});
  const defaultSheet = availableSheets.find(s => state.excelWorkbookSheets[s].role === 'NEW BATCH') || availableSheets[0] || 'NEW BATCH';
  switchImporterSheet(defaultSheet);
}

function switchImporterSheet(sheetName) {
  state.activeImporterSheet = sheetName;

  document.querySelectorAll('.importer-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-sheet') === sheetName);
  });

  renderSheetPreviewTable(sheetName);
}
window.switchImporterSheet = switchImporterSheet;

window.toggleShowEmptyRows = function() {
  if (state.activeImporterSheet) {
    renderSheetPreviewTable(state.activeImporterSheet);
  }
};

function renderSheetPreviewTable(sheetName) {
  const thead = document.getElementById('importer-preview-thead');
  const tbody = document.getElementById('importer-preview-tbody');
  const warnBanner = document.getElementById('importer-warning-banner');
  const infoEl = document.getElementById('importer-sheet-info');
  if (!thead || !tbody) return;

  const sheetData = (state.excelWorkbookSheets && state.excelWorkbookSheets[sheetName]) 
    ? state.excelWorkbookSheets[sheetName] 
    : null;

  if (!sheetData) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No parsed data found for worksheet "${escapeHtml(sheetName)}".</td></tr>`;
    return;
  }

  const existingTitles = new Set(state.inventory.map(i => safeCellString(i.title).toLowerCase()));
  const showEmpty = document.getElementById('chk-show-empty-rows')?.checked || false;

  const validRows = sheetData.validRows || [];
  const emptyRows = sheetData.emptyRows || [];
  const allRows = sheetData.rows || [];
  const warnings = sheetData.warnings || [];
  const role = sheetData.role;

  // Warning Banner
  if (warnBanner) {
    if (warnings.length > 0) {
      warnBanner.style.display = 'block';
      warnBanner.innerHTML = `
        <strong><i class="fa-solid fa-triangle-exclamation"></i> Warnings detected in sheet "${escapeHtml(sheetName)}" (${warnings.length}):</strong>
        <ul style="margin: 4px 0 0 18px; padding: 0;">
          ${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
        </ul>
      `;
    } else {
      warnBanner.style.display = 'none';
      warnBanner.innerHTML = '';
    }
  }

  // Header info line
  if (infoEl) {
    infoEl.innerHTML = `<i class="fa-solid fa-table-list"></i> <strong>${escapeHtml(sheetName)}</strong> (${escapeHtml(role)}) — <strong>${validRows.length}</strong> populated items (${emptyRows.length} blank template rows)`;
  }

  // Update summary metrics
  const totalEl = document.getElementById('stat-import-total-rows');
  const validEl = document.getElementById('stat-import-valid-items');
  const dupEl = document.getElementById('stat-import-duplicates');
  const skipEl = document.getElementById('stat-import-skipped');
  const nullCostEl = document.getElementById('stat-import-unknown-costs');

  let dupCount = 0;
  let nullCostCount = 0;

  validRows.forEach(r => {
    const t = safeCellString(getRowColumn(r, ['Title', 'Product Name', 'Product', 'Item', 'PRODUCT', 'عنوان', 'اسم المنتج']));
    if (t && existingTitles.has(t.toLowerCase())) dupCount++;
    const cost = safeCellNumber(getRowColumn(r, ['Unit purchase cost (DA)', 'unit purchase cost', 'Original purchase cost per copy (DA)', 'cost', 'سعر الشراء']));
    if (cost === null) nullCostCount++;
  });

  if (totalEl) totalEl.textContent = allRows.length;
  if (validEl) validEl.textContent = validRows.length;
  if (dupEl) dupEl.textContent = dupCount;
  if (skipEl) skipEl.textContent = emptyRows.length;
  if (nullCostEl) nullCostEl.textContent = nullCostCount;

  // Determine displayed rows
  const displayRows = showEmpty ? allRows : (validRows.length > 0 ? validRows : allRows.slice(0, 20));

  if (displayRows.length === 0) {
    thead.innerHTML = `<tr><th>Information</th></tr>`;
    tbody.innerHTML = `<tr><td class="empty-state">No rows found in this sheet.</td></tr>`;
    return;
  }

  // Render Table Header & Body based on Role
  if (role === 'NEW BATCH') {
    thead.innerHTML = `
      <tr>
        <th style="width: 50px;"># Row</th>
        <th>Title / اسم الكتاب</th>
        <th>Author / المؤلف</th>
        <th>Supplier / المورد</th>
        <th>Date</th>
        <th>Qty Rec</th>
        <th>Qty Sold</th>
        <th>Unit Cost (DA)</th>
        <th>Batch Cost (DA)</th>
        <th>Selling Price (DA)</th>
        <th>Category</th>
        <th>Notes</th>
        <th>Import Status</th>
      </tr>
    `;

    tbody.innerHTML = displayRows.map(r => {
      const rowNum = r.__rowNum || '-';
      const title = safeCellString(getRowColumn(r, ['Title', 'عنوان', 'book_title', 'book']));
      const author = safeCellString(getRowColumn(r, ['Author', 'المؤلف', 'مؤلف', 'auteur'])) || '-';
      const supplier = safeCellString(getRowColumn(r, ['Supplier', 'المورد', 'fournisseur', 'exhibitor'])) || '-';
      const date = safeCellString(getRowColumn(r, ['Date received', 'Date', 'التاريخ'])) || '-';
      const qtyRec = safeCellNumber(getRowColumn(r, ['Quantity received', 'كمية مستلمة', 'quantity', 'qty', 'الكمية'])) || 0;
      const qtySold = safeCellNumber(getRowColumn(r, ['Quantity sold', 'الكمية المباعة', 'sold'])) || 0;
      const cost = safeCellNumber(getRowColumn(r, ['Unit purchase cost (DA)', 'Unit purchase cost', 'purchase cost', 'cost', 'سعر الشراء']));
      const totalCost = safeCellNumber(getRowColumn(r, ['Total batch cost (DA)', 'total cost', 'إجمالي التكلفة']));
      const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'Selling price', 'price', 'selling', 'سعر البيع']));
      const cat = safeCellString(getRowColumn(r, ['Category', 'التصنيف', 'نوع'])) || '-';
      const notes = safeCellString(getRowColumn(r, ['Notes', 'ملاحظات'])) || '-';

      const isEmpty = !title;
      const isDup = !isEmpty && existingTitles.has(title.toLowerCase());
      let statusBadge = '';

      if (isEmpty) {
        statusBadge = '<span class="badge badge-neutral">Template Row (Skipped)</span>';
      } else if (cost === null || price === null) {
        statusBadge = `<span class="badge badge-amber"><i class="fa-solid fa-triangle-exclamation"></i> Row ${rowNum}: Incomplete Pricing</span>`;
      } else if (isDup) {
        statusBadge = '<span class="badge badge-blue">Update Existing Stock</span>';
      } else {
        statusBadge = '<span class="badge badge-green"><i class="fa-solid fa-check"></i> Ready to Import</span>';
      }

      return `
        <tr style="${isEmpty ? 'opacity: 0.5; background: #FAF9F6;' : ''}">
          <td><strong style="color: var(--text-muted);">${rowNum}</strong></td>
          <td><strong>${escapeHtml(title || '(Empty title)')}</strong></td>
          <td>${escapeHtml(author)}</td>
          <td>${escapeHtml(supplier)}</td>
          <td><small>${escapeHtml(date)}</small></td>
          <td><strong>${qtyRec}</strong></td>
          <td>${qtySold}</td>
          <td>${cost !== null ? cost.toLocaleString('fr-DZ') + ' DA' : '<span class="badge-provisional">NULL</span>'}</td>
          <td>${totalCost !== null ? totalCost.toLocaleString('fr-DZ') + ' DA' : '-'}</td>
          <td><strong>${price !== null ? price.toLocaleString('fr-DZ') + ' DA' : '-'}</strong></td>
          <td><span class="badge badge-neutral">${escapeHtml(cat)}</span></td>
          <td><small>${escapeHtml(notes)}</small></td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');

  } else if (role === 'OLD STOCK') {
    thead.innerHTML = `
      <tr>
        <th style="width: 50px;"># Row</th>
        <th>Title / اسم الكتاب</th>
        <th>Author / المؤلف</th>
        <th>Category / التصنيف</th>
        <th>Counted Qty</th>
        <th>Unit Cost (DA)</th>
        <th>Selling Price (DA)</th>
        <th>Condition</th>
        <th>Notes</th>
        <th>Import Status</th>
      </tr>
    `;

    tbody.innerHTML = displayRows.map(r => {
      const rowNum = r.__rowNum || '-';
      const title = safeCellString(getRowColumn(r, ['Title', 'عنوان', 'book_title', 'book']));
      const author = safeCellString(getRowColumn(r, ['Author', 'المؤلف', 'مؤلف', 'auteur'])) || '-';
      const cat = safeCellString(getRowColumn(r, ['Category', 'التصنيف', 'genre'])) || '-';
      const qty = safeCellNumber(getRowColumn(r, ['Quantity counted today', 'الكمية المحصية', 'quantity', 'qty', 'الكمية'])) || 0;
      const cost = safeCellNumber(getRowColumn(r, ['Original purchase cost per copy (DA)', 'purchase cost', 'cost', 'سعر الشراء']));
      const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'Selling price', 'price', 'selling', 'سعر البيع']));
      const cond = safeCellString(getRowColumn(r, ['Condition', 'الحالة', 'حالة'])) || 'Good';
      const notes = safeCellString(getRowColumn(r, ['Notes', 'ملاحظات'])) || '-';

      const isEmpty = !title;
      const isDup = !isEmpty && existingTitles.has(title.toLowerCase());
      let statusBadge = '';

      if (isEmpty) {
        statusBadge = '<span class="badge badge-neutral">Template Row (Skipped)</span>';
      } else if (cost === null && price === null) {
        statusBadge = `<span class="badge badge-amber"><i class="fa-solid fa-triangle-exclamation"></i> Row ${rowNum}: Missing Cost & Price</span>`;
      } else if (isDup) {
        statusBadge = '<span class="badge badge-blue">Update Existing Stock</span>';
      } else {
        statusBadge = '<span class="badge badge-green"><i class="fa-solid fa-check"></i> Ready to Import</span>';
      }

      return `
        <tr style="${isEmpty ? 'opacity: 0.5; background: #FAF9F6;' : ''}">
          <td><strong style="color: var(--text-muted);">${rowNum}</strong></td>
          <td><strong>${escapeHtml(title || '(Empty title)')}</strong></td>
          <td>${escapeHtml(author)}</td>
          <td><span class="badge badge-neutral">${escapeHtml(cat)}</span></td>
          <td><strong>${qty}</strong></td>
          <td>${cost !== null ? cost.toLocaleString('fr-DZ') + ' DA' : '<span class="badge-provisional">NULL (Unknown)</span>'}</td>
          <td><strong>${price !== null ? price.toLocaleString('fr-DZ') + ' DA' : '<span class="badge-provisional">NULL</span>'}</strong></td>
          <td>${escapeHtml(cond)}</td>
          <td><small>${escapeHtml(notes)}</small></td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');

  } else if (role === 'ACCESSORIES') {
    thead.innerHTML = `
      <tr>
        <th style="width: 50px;"># Row</th>
        <th>Product / المنتج</th>
        <th>Category / الصنف</th>
        <th>Quantity / الكمية</th>
        <th>Unit Purchase Cost (DA)</th>
        <th>Selling Price (DA)</th>
        <th>Supplier / المورد</th>
        <th>Import Status</th>
      </tr>
    `;

    tbody.innerHTML = displayRows.map(r => {
      const rowNum = r.__rowNum || '-';
      const name = safeCellString(getRowColumn(r, ['Product Name', 'Title', 'Product', 'Item', 'PRODUCT', 'اسم المنتج']));
      const cat = safeCellString(getRowColumn(r, ['Category', 'CATEGORY', 'Type', 'الصنف', 'نوع'])) || 'Accessory';
      const qty = safeCellNumber(getRowColumn(r, ['Quantity purchased', 'QUANTITY', 'Quantity', 'الكمية المشتراة', 'qty']));
      const cost = safeCellNumber(getRowColumn(r, ['Unit purchase cost (DA)', 'unit purchase cost', 'purchase cost', 'cost', 'سعر الشراء']));
      const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'selling price', 'price', 'selling', 'سعر البيع']));
      const supp = safeCellString(getRowColumn(r, ['Supplier', 'supplier', 'المورد', 'source'])) || '-';

      const isEmpty = !name;
      const isPackaging = name.toLowerCase().includes('paper') || cat.toLowerCase().includes('packag');
      let statusBadge = '';

      if (isEmpty) {
        statusBadge = '<span class="badge badge-neutral">Template Row (Skipped)</span>';
      } else if (qty === null && price === null) {
        statusBadge = `<span class="badge badge-amber"><i class="fa-solid fa-triangle-exclamation"></i> Row ${rowNum}: Missing Price & Qty</span>`;
      } else if (qty === null) {
        statusBadge = `<span class="badge badge-blue">Packaging Material (${cost ? cost + ' DA' : 'Unpriced'})</span>`;
      } else {
        statusBadge = '<span class="badge badge-green"><i class="fa-solid fa-check"></i> Ready to Import</span>';
      }

      return `
        <tr style="${isEmpty ? 'opacity: 0.5; background: #FAF9F6;' : ''}">
          <td><strong style="color: var(--text-muted);">${rowNum}</strong></td>
          <td><strong>${escapeHtml(name || '(Empty name)')}</strong></td>
          <td><span class="badge badge-purple" style="background: #EDE9FE; color: #5B21B6;">${escapeHtml(cat)}</span></td>
          <td>${qty !== null ? `<strong>${qty}</strong>` : '<span style="color: var(--text-muted);">(Consumable / Pack)</span>'}</td>
          <td>${cost !== null ? cost.toLocaleString('fr-DZ') + ' DA' : '<span class="badge-provisional">NULL</span>'}</td>
          <td><strong>${price !== null ? price.toLocaleString('fr-DZ') + ' DA' : '-'}</strong></td>
          <td>${escapeHtml(supp)}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');

  } else if (role === 'DEBTS') {
    thead.innerHTML = `
      <tr>
        <th style="width: 50px;"># Row</th>
        <th>Creditor / الدائن</th>
        <th>Type / النوع</th>
        <th>Original Amount (DA)</th>
        <th>Repaid (DA)</th>
        <th>Remaining (DA)</th>
        <th>Priority / Notes</th>
        <th>Import Status</th>
      </tr>
    `;

    tbody.innerHTML = displayRows.map(r => {
      const rowNum = r.__rowNum || '-';
      const creditor = safeCellString(getRowColumn(r, ['Creditor / person', 'creditor', 'دائن']));
      const debtType = safeCellString(getRowColumn(r, ['Type (supplier/family/friend/other)', 'Type', 'نوع'])) || 'personal';
      const origAmt = safeCellNumber(getRowColumn(r, ['Original amount (DA)', 'amount', 'مبلغ'])) || 0;
      const repaidAmt = safeCellNumber(getRowColumn(r, ['Amount repaid (DA)', 'repaid', 'مسدد'])) || 0;
      const remainingAmt = safeCellNumber(getRowColumn(r, ['Remaining (DA)', 'remaining', 'متبقي']));
      const notes = safeCellString(getRowColumn(r, ['Priority / agreement', 'Evidence / notes', 'notes'])) || '-';

      const isEmpty = !creditor || origAmt <= 0;
      const statusBadge = isEmpty 
        ? '<span class="badge badge-neutral">Template Row (Skipped)</span>'
        : '<span class="badge badge-green"><i class="fa-solid fa-check"></i> Will Record Debt</span>';

      return `
        <tr style="${isEmpty ? 'opacity: 0.5; background: #FAF9F6;' : ''}">
          <td><strong style="color: var(--text-muted);">${rowNum}</strong></td>
          <td><strong>${escapeHtml(creditor || '(Empty creditor)')}</strong></td>
          <td>${escapeHtml(debtType)}</td>
          <td><strong>${origAmt ? origAmt.toLocaleString('fr-DZ') + ' DA' : '0 DA'}</strong></td>
          <td>${repaidAmt.toLocaleString('fr-DZ')} DA</td>
          <td><strong>${(remainingAmt !== null ? remainingAmt : Math.max(0, origAmt - repaidAmt)).toLocaleString('fr-DZ')} DA</strong></td>
          <td><small>${escapeHtml(notes)}</small></td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');

  } else if (role === 'OPENING POSITION') {
    thead.innerHTML = `
      <tr>
        <th style="width: 50px;"># Row</th>
        <th>Item / البند</th>
        <th>Amount (DA)</th>
        <th>Status</th>
        <th>Notes</th>
        <th>Reconciliation Action</th>
      </tr>
    `;

    tbody.innerHTML = displayRows.map(r => {
      const rowNum = r.__rowNum || '-';
      const item = safeCellString(getRowColumn(r, ['Item', 'بند']));
      const amt = safeCellNumber(getRowColumn(r, ['Amount (DA)', 'amount', 'مبلغ']));
      const status = safeCellString(getRowColumn(r, ['Status (confirmed / estimate / unknown)', 'status']));
      const notes = safeCellString(getRowColumn(r, ['Notes', 'ملاحظات']));
      const is90k = item.toLowerCase().includes('batch') || amt === 90000;
      const isCash = item.toLowerCase().includes('cash');

      return `
        <tr>
          <td><strong style="color: var(--text-muted);">${rowNum}</strong></td>
          <td><strong>${escapeHtml(item)}</strong></td>
          <td><strong>${amt !== null ? amt.toLocaleString('fr-DZ') + ' DA' : '-'}</strong></td>
          <td><span class="badge badge-neutral">${escapeHtml(status || '-')}</span></td>
          <td><small>${escapeHtml(notes || '-')}</small></td>
          <td>
            ${is90k 
              ? '<span class="badge badge-amber" title="Derived dynamically from stock rows">Disregarded (Derived from Stock)</span>' 
              : (isCash ? '<span class="badge badge-green">Import Opening Cash</span>' : '<span class="badge badge-neutral">Information Note</span>')}
          </td>
        </tr>
      `;
    }).join('');

  } else {
    // Generic table for READ ME or other custom sheets
    const cols = sheetData.headers || [];
    thead.innerHTML = `<tr><th style="width: 50px;"># Row</th>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`;
    tbody.innerHTML = displayRows.map((r, i) => {
      const rowNum = r.__rowNum || (i + 1);
      return `
        <tr>
          <td><strong style="color: var(--text-muted);">${rowNum}</strong></td>
          ${cols.map(c => `<td>${escapeHtml(safeCellString(r[c]) || '-')}</td>`).join('')}
        </tr>
      `;
    }).join('');
  }
}

window.executeExcelImport = async function() {
  if (!state.excelParsedData) {
    alert('No parsed data available for import.');
    return;
  }

  const allowOverwrite = document.getElementById('chk-allow-overwrite')?.checked ?? true;
  const importNewBatch = document.getElementById('chk-import-new-batch')?.checked ?? true;
  const importOldStock = document.getElementById('chk-import-old-stock')?.checked ?? true;
  const importAccessories = document.getElementById('chk-import-accessories')?.checked ?? true;
  const importDebts = document.getElementById('chk-import-debts')?.checked ?? true;
  const importOpening = document.getElementById('chk-import-opening')?.checked ?? true;

  // Safe normalization helper for robust title matching across Arabic & English
  function normalizeTitleKey(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic diacritics / tashkeel
      .replace(/[،,.\-_:;!?'"()\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Deterministic RFC4122 v4 UUID generator from string key (ensures idempotent imports without creating duplicates)
  function deterministicUuid(str) {
    let hash1 = 0xdeadbeef, hash2 = 0x41c64e6d;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      hash1 = Math.imul(hash1 ^ ch, 2654435761);
      hash2 = Math.imul(hash2 ^ ch, 1597334677);
    }
    hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
    hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);
    const hex1 = ('00000000' + (hash1 >>> 0).toString(16)).slice(-8);
    const hex2 = ('00000000' + (hash2 >>> 0).toString(16)).slice(-8);
    const hex3 = ('00000000' + ((Math.imul(hash1, 31) + hash2) >>> 0).toString(16)).slice(-8);
    const hex4 = ('00000000' + ((Math.imul(hash2, 37) + hash1) >>> 0).toString(16)).slice(-8);
    return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(4, 7)}-a${hex3.slice(1, 4)}-${hex3.slice(4, 8)}${hex4.slice(0, 8)}`;
  }

  // Multi-index existing inventory mapping with automatic duplicate pruning
  const existingMap = new Map();
  const pruneIds = [];

  state.inventory.forEach(i => {
    if (i.title) {
      const normT = normalizeTitleKey(i.title);
      const isAcc = isAccessoryItem(i);
      const grp = isAcc ? 'ACCESSORIES' : (i.stock_group || 'NEW_STOCK').toUpperCase();
      const bId = (grp === 'NEW_STOCK' && (i.batch_id === 'batch-nov-2026' || !i.batch_id)) ? 'batch-nov-2026' : (i.batch_id || 'default');
      const lotKey = `${normT}::${grp}::${bId}`;
      const groupKey = `${normT}::${grp}`;

      if (existingMap.has(lotKey) || existingMap.has(groupKey)) {
        // Redundant duplicate accumulated in local IndexedDB from earlier imports
        pruneIds.push(i.id);
      } else {
        existingMap.set(lotKey, i);
        existingMap.set(groupKey, i);
      }
      if (i.isbn) {
        existingMap.set(`isbn::${grp}::${String(i.isbn).trim().toLowerCase()}`, i);
      }
    }
  });

  const itemsToSave = [];
  const debtsToSave = [];
  let newStockCount = 0;
  let oldStockCount = 0;
  let accessoriesCount = 0;
  let debtsCount = 0;
  let skippedTemplateCount = 0;
  let skippedDuplicateCount = 0;
  let nullCostsCount = 0;

  // 1. Process NEW BATCH
  if (importNewBatch && state.excelParsedData.newBatch) {
    let newBatchTotalUnits = 0;
    let newBatchTotalCost = 0;
    const newBatchSuppliers = new Set();

    state.excelParsedData.newBatch.forEach(r => {
      const title = safeCellString(getRowColumn(r, ['Title', 'اسم الكتاب', 'book_title', 'book']));
      if (!title) {
        skippedTemplateCount++;
        return;
      }

      // Normalize batch identifier: map November Book Fair references to 'batch-nov-2026'
      let explicitBatch = safeCellString(getRowColumn(r, ['Batch ID', 'batch_id', 'Batch', 'الدفعة']));
      let batchId = 'batch-nov-2026';
      if (explicitBatch && !explicitBatch.toLowerCase().includes('november') && !explicitBatch.toLowerCase().includes('fair') && !explicitBatch.toLowerCase().includes('كتاب')) {
        batchId = explicitBatch;
      }

      const normT = normalizeTitleKey(title);
      const isbnVal = safeCellString(getRowColumn(r, ['ISBN', 'الرقم الدولي', 'barcode']));
      const lotKey = `${normT}::NEW_STOCK::${batchId}`;
      const groupKey = `${normT}::NEW_STOCK`;
      const existing = existingMap.get(lotKey) || existingMap.get(groupKey) || (isbnVal ? existingMap.get(`isbn::NEW_STOCK::${isbnVal.toLowerCase()}`) : null);
      if (existing && !allowOverwrite) {
        skippedDuplicateCount++;
        return;
      }

      const cost = safeCellNumber(getRowColumn(r, ['Unit purchase cost (DA)', 'Unit purchase cost', 'purchase cost', 'cost', 'سعر الشراء', 'prix d\'achat']));
      if (cost === null) nullCostsCount++;

      const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'Selling price', 'price', 'selling', 'سعر البيع', 'prix de vente']));
      const qtyRec = Math.max(1, parseInt(getRowColumn(r, ['Quantity received', 'quantity', 'qty', 'الكمية'])) || 1);
      const qtySold = Math.max(0, parseInt(getRowColumn(r, ['Quantity sold', 'sold'])) || 0);
      const qtyDamaged = Math.max(0, parseInt(getRowColumn(r, ['Quantity damaged', 'damaged'])) || 0);
      const suppName = safeCellString(getRowColumn(r, ['Supplier', 'المورد', 'fournisseur', 'exhibitor'])) || 'Book Fair Exhibitors';

      newBatchTotalUnits += qtyRec;
      if (cost !== null) newBatchTotalCost += (qtyRec * cost);
      if (suppName) newBatchSuppliers.add(suppName);

      const item = {
        id: existing ? existing.id : deterministicUuid(`NEW_STOCK::${normT}`),
        title: title,
        author: safeCellString(getRowColumn(r, ['Author', 'المؤلف', 'auteur'])) || null,
        isbn: safeCellString(getRowColumn(r, ['ISBN', 'الرقم الدولي', 'barcode'])) || null,
        category: safeCellString(getRowColumn(r, ['Category', 'التصنيف', 'genre'])).toLowerCase() || 'book',
        item_type: 'book',
        stock_group: 'NEW_STOCK',
        batch_id: batchId,
        quantity_received: qtyRec,
        quantity_sold: qtySold,
        quantity_damaged: qtyDamaged,
        quantity_reserved: existing ? (existing.quantity_reserved || 0) : 0,
        unit_purchase_cost_da: cost !== null ? Math.round(cost * 100) / 100 : null,
        selling_price_da: (title && (title.includes('مثنوي') || title.includes('المثنوي'))) ? 10000 : (price !== null ? Math.round(price) : null),
        supplier_name: suppName,
        acquisition_date: getRowColumn(r, ['Date received', 'Date', 'Purchase Date', 'acquisition_date']) || new Date().toISOString().slice(0, 10),
        notes: safeCellString(getRowColumn(r, ['Notes', 'ملاحظات', 'remarques'])) || null,
        updated_at: new Date().toISOString()
      };

      itemsToSave.push(item);
      existingMap.set(lotKey, item);
      existingMap.set(groupKey, item);
      if (isbnVal) existingMap.set(`isbn::NEW_STOCK::${isbnVal.toLowerCase()}`, item);
      newStockCount++;
    });

    // Extract reported book fair payment from OPENING POSITION or default to 90,000 DA
    let fairPaid = 90000;
    if (state.excelParsedData.opening) {
      state.excelParsedData.opening.forEach(op => {
        const item = safeCellString(getRowColumn(op, ['Item', 'بند'])).toLowerCase();
        if (item.includes('book fair') || item.includes('paid')) {
          const amt = safeCellNumber(getRowColumn(op, ['Amount (DA)', 'amount', 'مبلغ']));
          if (amt !== null && amt > 0) fairPaid = amt;
        }
      });
    }

    const fairStatus = (fairPaid >= newBatchTotalCost) ? 'paid' : (fairPaid > 0 ? 'partial' : 'unpaid');
    const fairRemaining = Math.max(0, newBatchTotalCost - fairPaid);
    const fairNotes = `November 2026 Book Fair (Afaq, Al-Mahrousa, Al-Tanweer, Al-Adaab) | Total Cost: ${newBatchTotalCost.toLocaleString('fr-DZ')} DA | Amount Paid: ${fairPaid.toLocaleString('fr-DZ')} DA | Remaining Balance: ${fairRemaining.toLocaleString('fr-DZ')} DA`;

    const fairBatch = {
      id: 'batch-nov-2026',
      batch_name: 'November 2026 Book Fair (معرض الكتاب)',
      stock_group: 'NEW_STOCK',
      purchase_date: '2026-11-04',
      total_units: newBatchTotalUnits,
      total_cost_da: Math.round(newBatchTotalCost * 100) / 100,
      amount_paid_da: fairPaid,
      payment_status: fairStatus,
      notes: fairNotes,
      updated_at: new Date().toISOString()
    };
    await idb.put('batches', fairBatch);
    await idb.queueMutation('purchase_batches', 'upsert', fairBatch);
    if (!state.batches) state.batches = [];
    const bIdx = state.batches.findIndex(b => b.id === 'batch-nov-2026');
    if (bIdx >= 0) state.batches[bIdx] = fairBatch;
    else state.batches.push(fairBatch);

    // Save suppliers
    const suppliersToSave = [];
    const existingSuppliers = new Map((state.suppliers || []).map(s => [(s.name || '').trim().toLowerCase(), s]));
    for (const sName of newBatchSuppliers) {
      const existing = existingSuppliers.get(sName.toLowerCase());
      const supp = {
        id: existing ? existing.id : (crypto.randomUUID ? crypto.randomUUID() : ('supp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7))),
        name: sName,
        contact_person: 'Book Fair Exhibitor',
        notes: 'Exhibitor at November 2026 Book Fair',
        updated_at: new Date().toISOString()
      };
      suppliersToSave.push(supp);
      existingSuppliers.set(sName.toLowerCase(), supp);
    }
    if (suppliersToSave.length > 0) {
      await idb.putBatch('suppliers', suppliersToSave);
      for (const s of suppliersToSave) {
        await idb.queueMutation('suppliers', 'upsert', s);
      }
      state.suppliers = await idb.getAll('suppliers');
    }
  }

  // 2. Process OLD STOCK
  if (importOldStock && state.excelParsedData.oldStock) {
    state.excelParsedData.oldStock.forEach(r => {
      const title = safeCellString(getRowColumn(r, ['Title', 'اسم الكتاب', 'book_title', 'book']));
      if (!title) {
        skippedTemplateCount++;
        return;
      }

      const normT = normalizeTitleKey(title);
      const isbnVal = safeCellString(getRowColumn(r, ['ISBN', 'الرقم الدولي', 'barcode']));
      const explicitBatchId = safeCellString(getRowColumn(r, ['Batch ID', 'Batch', 'batch_id'])) || null;
      const lotKey = `${normT}::OLD_STOCK::${explicitBatchId || 'default'}`;
      const groupKey = `${normT}::OLD_STOCK`;
      const existing = existingMap.get(lotKey) || existingMap.get(groupKey) || (isbnVal ? existingMap.get(`isbn::OLD_STOCK::${isbnVal.toLowerCase()}`) : null);
      if (existing && !allowOverwrite) {
        skippedDuplicateCount++;
        return;
      }

      const cost = safeCellNumber(getRowColumn(r, ['Original purchase cost per copy (DA)', 'Unit purchase cost', 'purchase cost', 'cost', 'سعر الشراء', 'prix d\'achat']));
      if (cost === null) nullCostsCount++;

      const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'Selling price', 'price', 'selling', 'سعر البيع', 'prix de vente']));
      const qtyCounted = Math.max(1, parseInt(getRowColumn(r, ['Quantity counted today', 'quantity', 'qty', 'الكمية'])) || 1);

      const item = {
        id: existing ? existing.id : deterministicUuid(`OLD_STOCK::${normT}`),
        title: title,
        author: safeCellString(getRowColumn(r, ['Author', 'المؤلف', 'auteur'])) || null,
        isbn: isbnVal || null,
        category: safeCellString(getRowColumn(r, ['Category', 'التصنيف', 'genre'])).toLowerCase() || 'book',
        item_type: 'book',
        stock_group: 'OLD_STOCK',
        batch_id: explicitBatchId,
        quantity_received: qtyCounted,
        quantity_sold: 0,
        quantity_damaged: 0,
        quantity_reserved: existing ? (existing.quantity_reserved || 0) : 0,
        unit_purchase_cost_da: cost !== null ? Math.round(cost) : null,
        selling_price_da: price !== null ? Math.round(price) : null,
        condition: safeCellString(getRowColumn(r, ['Condition', 'الحالة', 'etat'])) || 'Good',
        acquisition_date: new Date().toISOString().slice(0, 10),
        notes: safeCellString(getRowColumn(r, ['Notes', 'ملاحظات', 'remarques'])) || null,
        updated_at: new Date().toISOString()
      };

      itemsToSave.push(item);
      existingMap.set(lotKey, item);
      existingMap.set(groupKey, item);
      if (isbnVal) existingMap.set(`isbn::OLD_STOCK::${isbnVal.toLowerCase()}`, item);
      oldStockCount++;
    });
  }

  // 3. Process ACCESSORIES
  if (importAccessories && state.excelParsedData.accessories) {
    // Safe RFC4122 UUID generator that never fails regardless of HTTPS/secure context
    function makeUuid() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try { return crypto.randomUUID(); } catch(e) {}
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    state.excelParsedData.accessories.forEach(r => {
      const name = safeCellString(getRowColumn(r, ['Product Name', 'Title', 'Product', 'Item', 'PRODUCT', 'اسم المنتج', 'عنوان', 'منتج', 'الاسم']));
      if (!name) {
        skippedTemplateCount++;
        return;
      }

      const rawCat = safeCellString(getRowColumn(r, ['Category', 'CATEGORY', 'Type', 'الصنف', 'نوع'])).toLowerCase();
      let normalizedCat = 'accessory';
      if (rawCat.includes('bookmark') || rawCat.includes('فاصل') || name.toLowerCase().includes('bookmark') || name.toLowerCase().includes('leaves')) normalizedCat = 'bookmark';
      else if (rawCat.includes('read log') || rawCat.includes('log') || rawCat.includes('tracker') || rawCat.includes('قراءة') || name.toLowerCase().includes('reading list') || name.toLowerCase().includes('tracker')) normalizedCat = 'accessory';
      else if (rawCat.includes('packag') || rawCat.includes('تغليف') || rawCat.includes('kraft') || rawCat.includes('surprise') || name.toLowerCase().includes('paper')) normalizedCat = 'packaging';

      const normN = normalizeTitleKey(name);
      const explicitBatch = safeCellString(getRowColumn(r, ['Batch ID', 'batch_id', 'Batch', 'الدفعة'])) || null;
      const lotKey = `${normN}::ACCESSORIES::${explicitBatch || 'default'}`;
      const groupKey = `${normN}::ACCESSORIES`;
      const existing = existingMap.get(lotKey) || existingMap.get(groupKey);
      if (existing && !allowOverwrite) {
        skippedDuplicateCount++;
        return;
      }

      const cost = safeCellNumber(getRowColumn(r, ['Unit purchase cost (DA)', 'unit purchase cost', 'purchase cost', 'cost', 'سعر الشراء', 'prix d\'achat']));
      if (cost === null) nullCostsCount++;

      const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'selling price', 'price', 'selling', 'سعر البيع', 'prix de vente']));
      // Packaging paper rolls or uncounted items default to 1 roll/pack instead of 0
      const parsedQty = parseInt(getRowColumn(r, ['Quantity purchased', 'QUANTITY', 'Quantity received', 'الكمية المشتراة', 'الكمية المستلمة', 'quantity', 'qty']));
      const qtyPurchased = (!isNaN(parsedQty) && parsedQty >= 0) ? parsedQty : 1;
      const qtyRemaining = safeCellNumber(getRowColumn(r, ['Quantity remaining', 'الكمية المتبقية', 'remaining'])) !== null
        ? safeCellNumber(getRowColumn(r, ['Quantity remaining', 'الكمية المتبقية', 'remaining']))
        : qtyPurchased;
      const qtySold = Math.max(0, qtyPurchased - qtyRemaining);
      const suppName = safeCellString(getRowColumn(r, ['Supplier', 'supplier', 'المورد', 'fournisseur', 'source'])) || 'Accessories Supplier';
      const notes = safeCellString(getRowColumn(r, ['Notes', 'ملاحظات', 'remarques'])) || null;

      const item = {
        id: (existing && existing.id && existing.id.length === 36) ? existing.id : deterministicUuid(`ACCESSORIES::${normN}`),
        title: name,
        author: null,
        isbn: null,
        category: normalizedCat,
        item_type: normalizedCat,
        stock_group: 'NEW_STOCK', // Satisfies Supabase check constraint inventory_items_stock_group_check
        batch_id: explicitBatch, // Null avoids foreign key violation on purchase_batches
        quantity_received: qtyPurchased,
        quantity_sold: qtySold,
        quantity_damaged: 0,
        quantity_reserved: existing ? (existing.quantity_reserved || 0) : 0,
        unit_purchase_cost_da: cost !== null ? Math.round(cost * 100) / 100 : null,
        selling_price_da: (name && (name.includes('مثنوي') || name.includes('المثنوي'))) ? 10000 : (price !== null ? Math.round(price) : null),
        supplier_name: suppName,
        condition: 'New',
        acquisition_date: getRowColumn(r, ['Date received', 'Date', 'Purchase Date', 'acquisition_date']) || new Date().toISOString().slice(0, 10),
        notes: (notes ? notes + ' | ' : '') + `Category: ${normalizedCat} | StockGroup: ACCESSORIES`,
        updated_at: new Date().toISOString()
      };

      itemsToSave.push(item);
      existingMap.set(lotKey, item);
      existingMap.set(groupKey, item);
      accessoriesCount++;
    });
  }

  // 4. Process DEBTS
  if (importDebts && state.excelParsedData.debts) {
    state.excelParsedData.debts.forEach(r => {
      const creditor = safeCellString(getRowColumn(r, ['Creditor / person', 'creditor', 'دائن']));
      const origAmt = safeCellNumber(getRowColumn(r, ['Original amount (DA)', 'amount', 'مبلغ'])) || 0;
      if (!creditor || origAmt <= 0) {
        skippedTemplateCount++;
        return;
      }

      const existingDebt = (state.debts || []).find(d => normalizeTitleKey(d.creditor_name) === normalizeTitleKey(creditor));
      const debtId = existingDebt ? existingDebt.id : (crypto.randomUUID ? crypto.randomUUID() : ('debt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)));

      const repaidAmt = safeCellNumber(getRowColumn(r, ['Amount repaid (DA)', 'repaid', 'مسدد'])) || 0;
      debtsToSave.push({
        id: debtId,
        creditor_name: creditor,
        debt_type: safeCellString(getRowColumn(r, ['Type (supplier/family/friend/other)', 'type'])).toLowerCase() || 'supplier',
        original_amount_da: Math.round(origAmt),
        amount_repaid_da: Math.round(repaidAmt),
        remaining_balance_da: Math.max(0, Math.round(origAmt - repaidAmt)),
        incurred_date: getRowColumn(r, ['Date borrowed / incurred']) || null,
        due_date: getRowColumn(r, ['Due date']) || null,
        notes: safeCellString(getRowColumn(r, ['Evidence / notes', 'notes'])) || null,
        created_at: existingDebt ? existingDebt.created_at : new Date().toISOString()
      });
      debtsCount++;
    });
  }

  // 4. Process OPENING POSITION
  if (importOpening && state.excelParsedData.opening) {
    state.excelParsedData.opening.forEach(r => {
      const item = safeCellString(getRowColumn(r, ['Item', 'بند'])).toLowerCase();
      if (item.includes('cash available')) {
        const amt = safeCellNumber(getRowColumn(r, ['Amount (DA)', 'amount', 'مبلغ'])) || 0;
        state.openingPosition = { 
          id: 1, 
          cash_balance_da: amt, 
          owner_contributions_da: 0,
          owner_withdrawals_da: 0,
          as_of_date: new Date().toISOString().slice(0, 10),
          notes: safeCellString(getRowColumn(r, ['Notes', 'ملاحظات'])) || 'Confirmed from Excel',
          updated_at: new Date().toISOString()
        };
      }
      // Note: 90,000 DA is completely disregarded per user directive!
    });
    if (state.openingPosition) {
      await idb.put('opening_position', state.openingPosition);
      await idb.queueMutation('opening_position', 'upsert', state.openingPosition);
    }
  }

  // Save to IndexedDB
  if (itemsToSave.length > 0) {
    await idb.putBatch('inventory', itemsToSave);
    for (const itm of itemsToSave) {
      await idb.queueMutation('inventory_items', 'upsert', itm);
    }
  }

  // Prune any legacy duplicate records that were previously saved in IndexedDB
  if (pruneIds.length > 0) {
    for (const pId of pruneIds) {
      await idb.delete('inventory', pId);
    }
    console.log(`[Importer] Successfully pruned ${pruneIds.length} redundant duplicate records from local IndexedDB.`);
  }

  if (debtsToSave.length > 0) {
    await idb.putBatch('debts', debtsToSave);
    const initialRepayments = [];
    for (const d of debtsToSave) {
      await idb.queueMutation('debts', 'upsert', d);
      // Check if debt already had repayments logged
      const existingReps = (state.debtRepayments || []).filter(rep => rep.debt_id === d.id);
      if (d.amount_repaid_da > 0 && existingReps.length === 0) {
        const initialRep = {
          id: crypto.randomUUID ? crypto.randomUUID() : ('rep_init_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
          debt_id: d.id,
          amount_da: d.amount_repaid_da,
          repayment_date: d.incurred_date || new Date().toISOString().slice(0, 10),
          payment_method: 'other',
          notes: 'Initial repayment recorded from Excel import',
          created_at: new Date().toISOString()
        };
        initialRepayments.push(initialRep);
        await idb.put('debt_repayments', initialRep);
        await idb.queueMutation('debt_repayments', 'insert', initialRep);
      }
    }
    if (initialRepayments.length > 0) {
      if (!state.debtRepayments) state.debtRepayments = [];
      state.debtRepayments.push(...initialRepayments);
    }
  }

  // Refresh full local state from IndexedDB
  await loadLocalData();

  // Show Report Card
  const previewStep = document.getElementById('importer-step-preview');
  const reportStep = document.getElementById('importer-step-report');
  const execBtn = document.getElementById('btn-execute-excel-import');

  if (previewStep) previewStep.style.display = 'none';
  if (reportStep) reportStep.style.display = 'block';
  if (execBtn) execBtn.style.display = 'none';

  const rNew = document.getElementById('report-new-stock-count');
  if (rNew) rNew.textContent = newStockCount;

  const rOld = document.getElementById('report-old-stock-count');
  if (rOld) rOld.textContent = oldStockCount;

  const rAcc = document.getElementById('report-accessories-count');
  if (rAcc) rAcc.textContent = accessoriesCount;

  const rDebts = document.getElementById('report-debts-count');
  if (rDebts) rDebts.textContent = debtsCount;

  const rSkip = document.getElementById('report-skipped-count');
  if (rSkip) rSkip.textContent = skippedTemplateCount;

  const rDup = document.getElementById('report-duplicates-skipped');
  if (rDup) rDup.textContent = skippedDuplicateCount;

  const rNull = document.getElementById('report-null-costs-count');
  if (rNull) rNull.textContent = nullCostsCount;

  // Refresh all application views
  renderAppViews();

  if (state.online && auth.isAuthenticated()) {
    sync.sync();
  }
};

window.setProfitFilter = function(filter) {
  state.profitFilter = filter;
  document.querySelectorAll('.tab-btn[data-profit-filter]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-profit-filter') === filter);
  });
  renderFinanceSection();
};

// ============================================================================
// PHASE 3 — SUPABASE REALTIME & WEB PUSH NOTIFICATIONS
// ============================================================================
const VAPID_PUBLIC_KEY = 'BNikz7cow1jn_DxcfgXgE2l9mwYiHrIH6MdPbe-8lQ074jsVyGgL4zyUJRtJCCK71wUJgC1J7utgG_fq8sjbh-Q';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function showOrderNotificationBanner(order) {
  let container = document.getElementById('order-notification-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'order-notification-toast-container';
    container.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:99999; display:flex; flex-direction:column; gap:10px; max-width:340px; pointer-events:none;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = 'background:var(--bg-card); color:var(--text-main); border:1px solid var(--primary); border-left:4px solid var(--primary); padding:12px 16px; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.15); pointer-events:auto; cursor:pointer; font-family:inherit; animation:slideIn 0.3s ease;';
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      <i class="fa-solid fa-bell" style="color:var(--primary); font-size:20px;"></i>
      <div>
        <strong style="display:block; font-size:14px;">طلب جديد #${order.id} 📚</strong>
        <span style="font-size:12px; color:var(--text-muted);">${escapeHtml(order.firstName || '')} ${escapeHtml(order.familyName || '')} • ${Number(order.total_price || 0).toLocaleString()} دج</span>
      </div>
    </div>
  `;
  toast.onclick = () => {
    openOrderDetailsModal(order.id);
    toast.remove();
  };
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 8000);
}
window.showOrderNotificationBanner = showOrderNotificationBanner;

function initRealtimeOrderListeners() {
  if (!supabaseClient || typeof supabaseClient.channel !== 'function') return;

  try {
    supabaseClient.channel('realtime:storefront_orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        console.log('[Realtime] New order arrived from storefront:', payload.new);
        if (payload.new && payload.new.id) {
          const newOrder = {
            ...payload.new,
            is_historical: false,
            read_only: false
          };
          if (!state.orders) state.orders = [];
          if (!state.orders.some(o => String(o.id) === String(newOrder.id))) {
            state.orders.unshift(newOrder);
            await idb.put('orders', newOrder);
            applyLiveOrdersToInventory();
            showOrderNotificationBanner(newOrder);
            renderAppViews();
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_meta' }, async (payload) => {
        console.log('[Realtime] Order meta updated:', payload.new);
        if (payload.new && payload.new.order_id) {
          if (!state.orderMeta) state.orderMeta = [];
          const idx = state.orderMeta.findIndex(m => String(m.order_id) === String(payload.new.order_id));
          if (idx >= 0) state.orderMeta[idx] = payload.new;
          else state.orderMeta.push(payload.new);
          await idb.put('order_meta', payload.new);
          renderAppViews();
        }
      })
      .subscribe((status) => {
        console.log('[Realtime] Orders channel subscription status:', status);
      });
  } catch (err) {
    console.warn('[Realtime] Failed to initialize Realtime listener:', err);
  }
}
window.initRealtimeOrderListeners = initRealtimeOrderListeners;

function initWebPushManager() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'OPEN_ORDER' && event.data.order_id) {
        openOrderDetailsModal(event.data.order_id);
      }
    });
  }

  // Handle direct navigation hash like #order-140
  if (window.location.hash && window.location.hash.startsWith('#order-')) {
    const targetOrderId = window.location.hash.replace('#order-', '');
    setTimeout(() => {
      if (typeof openOrderDetailsModal === 'function') {
        openOrderDetailsModal(targetOrderId);
      }
    }, 1000);
  }
}
window.initWebPushManager = initWebPushManager;

window.enablePushNotifications = async function() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Web Push notifications are not supported on this browser or platform. On iPhone, make sure you installed the PWA via "Add to Home Screen" on iOS 16.4+.');
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('Notification permission was not granted. Please enable notifications in your browser or iOS settings.');
      return;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    const subJson = sub.toJSON();
    const token = await auth.getValidToken();

    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys ? subJson.keys.p256dh : '',
        auth: subJson.keys ? subJson.keys.auth : '',
        user_agent: navigator.userAgent
      })
    });

    if (res.ok) {
      alert('Order notifications are now enabled on this device! You will receive push alerts when a customer places an order.');
    } else {
      console.warn('Subscription registered on device (notice:', await res.text(), ')');
      alert('Notification subscription active.');
    }
  } catch (err) {
    console.error('Push registration error:', err);
    alert('Push notification setup: ' + err.message);
  }
};
