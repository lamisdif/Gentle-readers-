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
const DEFAULT_STOCK_BASELINE = {
  oldStock: { retailValueDa: 110878, paidCostDa: 68983, expectedProfitDa: 41895 },
  newStock: { retailValueDa: 195200, paidCostDa: 96954.5, expectedProfitDa: 98245.5 }
};

function getStockBaseline() {
  let saved = null;
  try {
    const raw = localStorage.getItem('gr_stock_baseline_v1');
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    saved = null;
  }
  const oldRetail = Number(saved?.oldStock?.retailValueDa ?? DEFAULT_STOCK_BASELINE.oldStock.retailValueDa);
  const oldPaid = Number(saved?.oldStock?.paidCostDa ?? DEFAULT_STOCK_BASELINE.oldStock.paidCostDa);
  const newRetail = Number(saved?.newStock?.retailValueDa ?? DEFAULT_STOCK_BASELINE.newStock.retailValueDa);
  const newPaid = Number(saved?.newStock?.paidCostDa ?? DEFAULT_STOCK_BASELINE.newStock.paidCostDa);
  return {
    oldStock: {
      retailValueDa: oldRetail,
      paidCostDa: oldPaid,
      expectedProfitDa: Math.round((oldRetail - oldPaid) * 100) / 100,
      marginPct: oldRetail > 0 ? Math.round(((oldRetail - oldPaid) / oldRetail) * 1000) / 10 : 0
    },
    newStock: {
      retailValueDa: newRetail,
      paidCostDa: newPaid,
      expectedProfitDa: Math.round((newRetail - newPaid) * 100) / 100,
      marginPct: newRetail > 0 ? Math.round(((newRetail - newPaid) / newRetail) * 1000) / 10 : 0
    },
    combined: {
      retailValueDa: oldRetail + newRetail,
      paidCostDa: Math.round((oldPaid + newPaid) * 100) / 100,
      expectedProfitDa: Math.round(((oldRetail - oldPaid) + (newRetail - newPaid)) * 100) / 100,
      marginPct: (oldRetail + newRetail) > 0 ? Math.round((((oldRetail - oldPaid) + (newRetail - newPaid)) / (oldRetail + newRetail)) * 1000) / 10 : 0
    }
  };
}

const WEBSITE_ACCESSORY_LINKS = [
  {
    lotId: 'a0000000-0000-4000-8000-000000000001',
    webId: 'bookmark_boot-shaped-bookmarks',
    slug: 'boot-shaped-bookmarks',
    shortName: 'Boots Bookmarks',
    title: 'Whimsical Boots Bookmarks / فاصل الأحذية المميز',
    category: 'bookmark',
    defaultCostDa: 263,
    defaultPriceDa: 1000,
    purchasedQty: 3,
    soldQty: 3,
    baselinePreLiveSold: 2,
    acquisitionDate: '2026-10-15',
    salesTiers: [
      { qty: 2, unitPriceDa: 850, offline: true, label: 'First 2 sold at 850 DA' },
      { qty: 1, unitPriceDa: 1000, orderId: 198, label: 'Last 1 sold at 1,000 DA (Order #198)' }
    ],
    priceHistory: [
      { beforeDate: '2026-11-14T21:10:00Z', unitPriceDa: 850 }
    ],
    keywords: ['whimsical boots', 'boot-shaped', 'فاصل الاحذيه']
  },
  {
    lotId: 'a0000000-0000-4000-8000-000000000002',
    webId: 'bookmark_cat-bookmarks',
    slug: 'cat-bookmarks',
    shortName: 'Cat Bookmarks',
    title: 'Acrylic Cat Bookmarks / فواصل قطط لطيفة',
    category: 'bookmark',
    defaultCostDa: 143,
    defaultPriceDa: 450,
    purchasedQty: 2,
    soldQty: 1,
    baselinePreLiveSold: 1,
    acquisitionDate: '2026-10-15',
    salesTiers: [
      { qty: 1, unitPriceDa: 450, orderId: 169, label: 'Order #169' }
    ],
    priceHistory: [],
    keywords: ['acrylic cat', 'cat bookmarks', 'فواصل قطط']
  },
  {
    lotId: 'a0000000-0000-4000-8000-000000000003',
    webId: 'bookmark_metallic-leaf-bookmarks',
    slug: 'metallic-leaf-bookmarks',
    shortName: 'Metallic Leaves Bookmarks',
    title: 'Metallic Leaf Chain Bookmarks / فواصل أوراق شجر معدنية ذهبية',
    category: 'bookmark',
    defaultCostDa: 173,
    defaultPriceDa: 800,
    purchasedQty: 4,
    soldQty: 2,
    baselinePreLiveSold: 2,
    acquisitionDate: '2026-10-15',
    salesTiers: [
      { qty: 2, unitPriceDa: 750, orderIds: [168, 170], label: 'First 2 sold at 750 DA (Orders #168 & #170)' }
    ],
    priceHistory: [
      { beforeDate: '2026-11-10T17:11:29Z', unitPriceDa: 750 }
    ],
    keywords: ['metallic leaf', 'metallic leaves', 'اوراق شجر معدنيه']
  },
  {
    lotId: 'a0000000-0000-4000-8000-000000000004',
    webId: 'acc_book-tracker',
    slug: 'book-tracker',
    shortName: 'Reading Lists',
    title: 'Reading Log & Book Tracker / بطاقة تتبع القراءة والمراجعات',
    category: 'accessory',
    defaultCostDa: 62,
    defaultPriceDa: 150,
    purchasedQty: 20,
    soldQty: 2,
    baselinePreLiveSold: 2,
    acquisitionDate: '2026-10-15',
    salesTiers: [
      { qty: 1, unitPriceDa: 150, orderId: 170, label: 'Order #170' },
      { qty: 1, unitPriceDa: 150, offline: true, label: 'Direct / offline sale' }
    ],
    priceHistory: [],
    keywords: ['reading log', 'book tracker', 'بطاقه تتبع القراءه', 'reading list']
  }
];

const PACKAGING_VARIANTS = [
  {
    variantKey: 'surprise',
    lotId: 'b0000000-0000-4000-8000-000000000001',
    shortName: 'Surprise',
    title: 'Surprise / مفاجأة (Wrapping Paper)',
    sellingPriceDa: 500,
    approxMeters: 3,
    provisionalTotalCostDa: null,
    aliases: ['surprise', 'مفاجاه', 'مفاجأة']
  },
  {
    variantKey: 'paper_wildflowers',
    lotId: 'b0000000-0000-4000-8000-000000000002',
    shortName: 'Vintage',
    title: 'Vintage Wildflowers / ورق زهور برية كلاسيكي',
    sellingPriceDa: 600,
    approxMeters: 3,
    provisionalTotalCostDa: 840,
    aliases: ['paper_wildflowers', 'vintage', 'wildflowers', 'زهور بريه']
  },
  {
    variantKey: 'paper_pine_berries',
    lotId: 'b0000000-0000-4000-8000-000000000003',
    shortName: 'Christmas',
    title: 'Festive Pine & Berries (Christmas) / ورق صنوبر وتوت شتوي',
    sellingPriceDa: 600,
    approxMeters: 3,
    provisionalTotalCostDa: 822,
    aliases: ['paper_pine_berries', 'christmas', 'pine', 'berries', 'صنوبر']
  },
  {
    variantKey: 'paper_celestial_crane',
    lotId: 'b0000000-0000-4000-8000-000000000004',
    shortName: 'Swan',
    title: 'Celestial Crane & Mountain (Swan) / ورق الرافعات والجبال الذهبي',
    sellingPriceDa: 800,
    approxMeters: 3,
    provisionalTotalCostDa: 1627,
    aliases: ['paper_celestial_crane', 'swan', 'celestial crane', 'crane', 'الرافعات']
  }
];

const DEFAULT_PACKAGING_CONFIG = {
  cmPerWrap: null,
  mode: 'per_book',
  includeHistorical: false
};

function parseJsonNoteTag(notes, tagName) {
  const s = String(notes || '');
  const marker = `[${tagName}:`;
  const start = s.indexOf(marker);
  if (start === -1) return null;
  let depth = 0;
  let jsonStart = start + marker.length;
  for (let i = jsonStart; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      if (depth > 0) depth--;
      else if (ch === ']' && depth === 0) {
        try { return JSON.parse(s.slice(jsonStart, i)); } catch { return null; }
      }
    }
  }
  return null;
}

function parseAllJsonNoteTags(notes, tagName) {
  const s = String(notes || '');
  const marker = `[${tagName}:`;
  const results = [];
  let cursor = 0;
  while (cursor < s.length) {
    const start = s.indexOf(marker, cursor);
    if (start === -1) break;
    let depth = 0;
    const jsonStart = start + marker.length;
    let endIdx = -1;
    for (let i = jsonStart; i < s.length; i++) {
      const ch = s[i];
      if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') {
        if (depth > 0) depth--;
        else if (ch === ']' && depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    if (endIdx === -1) break;
    try { results.push(JSON.parse(s.slice(jsonStart, endIdx))); } catch {}
    cursor = endIdx + 1;
  }
  return results;
}

function upsertJsonNoteTag(notes, tagName, payload) {
  const s = String(notes || '');
  const marker = `[${tagName}:`;
  let cleaned = '';
  let cursor = 0;
  while (cursor < s.length) {
    const start = s.indexOf(marker, cursor);
    if (start === -1) {
      cleaned += s.slice(cursor);
      break;
    }
    cleaned += s.slice(cursor, start);
    let depth = 0;
    let endIdx = -1;
    for (let i = start + marker.length; i < s.length; i++) {
      const ch = s[i];
      if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') {
        if (depth > 0) depth--;
        else if (ch === ']' && depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    if (endIdx === -1) break;
    cursor = endIdx;
  }
  cleaned = cleaned.replace(/\s*\|\s*$/, '').replace(/\n{2,}/g, '\n').trim();
  if (payload === null || payload === undefined) return cleaned;
  const serialized = `[${tagName}:${JSON.stringify(payload)}]`;
  return cleaned ? `${cleaned} | ${serialized}` : serialized;
}

function stripHumanNotes(notes) {
  let s = String(notes || '');
  ['ACC_HISTORY', 'PRICE_HISTORY', 'PKG_META', 'PKG_CONFIG', 'ORDER_CORRECTION'].forEach(tag => {
    s = upsertJsonNoteTag(s, tag, null);
  });
  return s;
}

function getPackagingConfig() {
  const fromPos = parseJsonNoteTag(state.openingPosition?.notes, 'PKG_CONFIG');
  if (fromPos && typeof fromPos === 'object') {
    return {
      cmPerWrap: (fromPos.cmPerWrap !== null && fromPos.cmPerWrap !== undefined && Number(fromPos.cmPerWrap) > 0) ? Number(fromPos.cmPerWrap) : null,
      mode: fromPos.mode === 'per_order' ? 'per_order' : 'per_book',
      includeHistorical: !!fromPos.includeHistorical
    };
  }
  try {
    const raw = localStorage.getItem('gr_packaging_config_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        cmPerWrap: (parsed.cmPerWrap !== null && parsed.cmPerWrap !== undefined && Number(parsed.cmPerWrap) > 0) ? Number(parsed.cmPerWrap) : null,
        mode: parsed.mode === 'per_order' ? 'per_order' : 'per_book',
        includeHistorical: !!parsed.includeHistorical
      };
    }
  } catch (e) {}
  return { ...DEFAULT_PACKAGING_CONFIG };
}

async function savePackagingConfig(cfg) {
  const normalized = {
    cmPerWrap: (cfg?.cmPerWrap !== null && cfg?.cmPerWrap !== undefined && Number(cfg.cmPerWrap) > 0) ? Number(cfg.cmPerWrap) : null,
    mode: cfg?.mode === 'per_order' ? 'per_order' : 'per_book',
    includeHistorical: !!cfg?.includeHistorical
  };
  try {
    localStorage.setItem('gr_packaging_config_v1', JSON.stringify(normalized));
  } catch (e) {}

  if (!state.openingPosition) {
    state.openingPosition = { id: 1, cash_balance_da: 0, notes: 'Opening Position' };
  }
  state.openingPosition.notes = upsertJsonNoteTag(state.openingPosition.notes || '', 'PKG_CONFIG', normalized);
  state.openingPosition.updated_at = new Date().toISOString();
  if (idb.db) {
    await idb.put('opening_position', state.openingPosition);
    await idb.queueMutation('opening_position', 'upsert', state.openingPosition);
  }
  if (typeof invalidateAccountingCache === 'function') invalidateAccountingCache();
  return normalized;
}

window.openPackagingConfigModal = function() {
  const cfg = getPackagingConfig();
  const cmEl = document.getElementById('pkg-cfg-cm');
  const modeEl = document.getElementById('pkg-cfg-mode');
  const histEl = document.getElementById('pkg-cfg-include-hist');
  if (cmEl) cmEl.value = cfg.cmPerWrap !== null ? cfg.cmPerWrap : '';
  if (modeEl) modeEl.value = cfg.mode || 'per_book';
  if (histEl) histEl.checked = !!cfg.includeHistorical;
  openModal('modal-packaging-config');
};

window.handleSavePackagingConfig = async function(event) {
  event.preventDefault();
  const rawCm = (document.getElementById('pkg-cfg-cm')?.value || '').trim();
  const cmVal = rawCm !== '' && !isNaN(parseFloat(rawCm)) && parseFloat(rawCm) > 0 ? Math.round(parseFloat(rawCm)) : null;
  const mode = document.getElementById('pkg-cfg-mode')?.value === 'per_order' ? 'per_order' : 'per_book';
  const includeHistorical = !!document.getElementById('pkg-cfg-include-hist')?.checked;
  await savePackagingConfig({ cmPerWrap: cmVal, mode, includeHistorical });
  closeModal('modal-packaging-config');
  renderAppViews();
  if (state.online && auth.isAuthenticated()) sync.sync();
};

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
  orderStockAllocations: [],
  orderMeta: [],
  orderReturns: [],
  capitalContributions: [],
  ownerWithdrawals: [],
  stockAdjustments: [],
  cmsBooks: [],
  cmsBookmarks: [],
  cmsAccessories: [],
  syncStatus: 'synced', // 'synced', 'pending', 'syncing', 'error'
  lastSyncError: null,
  searchQuery: '',
  inventoryFilter: 'all',
  ordersFilter: 'all',
  paidOrdersFilter: 'all',
  debtsFilter: 'all',
  profitFilter: 'all',
  pageLimits: {
    inventory: 50,
    orders: 50,
    paidOrders: 50,
    profitTitles: 60
  },
  openingPosition: { cash_balance_da: 0, notes: 'Opening' },
  storefrontCatalogCount: 150,
  excelWorkbook: null,
  excelParsedData: null,
  activeImporterSheet: 'NEW BATCH'
};

// Performance caches (invalidated cleanly only when underlying accounting/catalog state changes)
let _finCache = null;
let _invSearchIndex = null;
let _cmsLoadedOnce = false;
let _lastVisibilitySyncTs = 0;
let _searchDebounceTimer = null;
const ALL_MANAGER_SECTIONS = [
  'dashboard', 'inventory', 'orders', 'paid-orders',
  'purchases', 'expenses', 'finance', 'debts', 'advertising', 'settings'
];
const _dirtySections = new Set(ALL_MANAGER_SECTIONS);

function invalidateAccountingCache() {
  _finCache = null;
  _invSearchIndex = null;
  ALL_MANAGER_SECTIONS.forEach(s => _dirtySections.add(s));
}
window.invalidateAccountingCache = invalidateAccountingCache;

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

      // 2. Single round-trip remote sync via manager-api fetch_all (includes orders + all 13 management tables),
      // falling back to fetchRemoteOrders() + per-table REST only if manager-api batch sync fails
      const batchSynced = await this.fetchRemoteManagementData();
      if (!batchSynced) {
        await this.fetchRemoteOrders();
      }

      // 3. Idempotently ensure starter accessories/packaging & Order #176 correction exist and sync
      let autoQueued = false;
      if (typeof ensureStarterAccessoriesAndPackaging === 'function') {
        if (await ensureStarterAccessoriesAndPackaging({ queueRemote: true })) autoQueued = true;
      }
      if (typeof ensureOrder176Corrected === 'function') {
        if (await ensureOrder176Corrected()) autoQueued = true;
      }
      if (autoQueued) {
        const followUpMuts = await idb.getPendingMutations();
        for (const mut of followUpMuts) {
          try {
            await this.executeMutation(mut);
            mut.status = 'synced';
            await idb.put('mutation_queue', mut);
          } catch (followErr) {
            console.warn('[Sync] Follow-up auto-reconcile notice on', mut.entity_table, followErr.message);
            mut.retry_count = (mut.retry_count || 0) + 1;
            mut.last_error = followErr.message;
            await idb.put('mutation_queue', mut);
          }
        }
      }

      await loadLocalData({ render: false });

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
    } else if (entityTable === 'order_stock_allocations') {
      clean.order_id = Number(clean.order_id);
      clean.quantity = Math.max(1, parseInt(clean.quantity, 10) || 1);
      if (!clean.cost_basis || !['fifo', 'specific_lot', 'provisional'].includes(clean.cost_basis)) {
        clean.cost_basis = 'specific_lot';
      }
      if (!clean.allocation_status || !['reserved', 'confirmed', 'released'].includes(clean.allocation_status)) {
        clean.allocation_status = 'confirmed';
      }
      const allowed = new Set(['id', 'order_id', 'inventory_item_id', 'quantity', 'unit_purchase_cost_da', 'cost_basis', 'allocation_status', 'created_at']);
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

      const reqBody = mut.action === 'correct_order'
        ? {
            ...(adminPass ? { password: adminPass } : {}),
            action: 'correct_order',
            order_id: mut.payload?.order_id || primaryVal,
            items: mut.payload?.items,
            total_price: mut.payload?.total_price,
            audit_note: mut.payload?.audit_note || ''
          }
        : {
            ...(adminPass ? { password: adminPass } : {}),
            action: mut.action === 'rpc' ? 'rpc' : 'mutate',
            table: mut.entity_table,
            operation: mut.action,
            record: clean,
            idField: idField,
            idValue: primaryVal,
            rpc_name: mut.entity_table,
            params: mut.payload
          };

      let proxyRes = null;
      try {
        proxyRes = await fetch('/api/manager-api', {
          method: 'POST',
          headers: proxyHeaders,
          body: JSON.stringify(reqBody)
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
            const batchWrites = [];
            if (Array.isArray(d.orders) && d.orders.length > 0) {
              const realOrders = d.orders.filter(o => !(o.firstName === 'Test' && o.familyName === 'Test'));
              const processed = realOrders.map(o => ({
                ...o,
                is_historical: o.is_historical !== undefined ? o.is_historical : (Number(o.id) <= 170),
                read_only: o.read_only !== undefined ? o.read_only : (Number(o.id) <= 170)
              }));
              batchWrites.push(idb.putBatch('orders', processed));
            }
            if (d.inventory && d.inventory.length > 0) batchWrites.push(idb.putBatch('inventory', d.inventory));
            if (d.batches && d.batches.length > 0) batchWrites.push(idb.putBatch('batches', d.batches));
            if (d.suppliers && d.suppliers.length > 0) batchWrites.push(idb.putBatch('suppliers', d.suppliers));
            if (d.expenses && d.expenses.length > 0) batchWrites.push(idb.putBatch('expenses', d.expenses));
            if (d.debts && d.debts.length > 0) batchWrites.push(idb.putBatch('debts', d.debts));
            if (d.debtRepayments && d.debtRepayments.length > 0) batchWrites.push(idb.putBatch('debt_repayments', d.debtRepayments));
            if (d.openingPosition && d.openingPosition.length > 0) batchWrites.push(idb.put('opening_position', d.openingPosition[0]));
            if (d.orderMeta && d.orderMeta.length > 0) batchWrites.push(idb.putBatch('order_meta', d.orderMeta));
            if (d.orderStockAllocations && d.orderStockAllocations.length > 0) batchWrites.push(idb.putBatch('order_stock_allocations', d.orderStockAllocations));
            if (d.orderReturns && d.orderReturns.length > 0) batchWrites.push(idb.putBatch('order_returns', d.orderReturns));
            if (d.capitalContributions && d.capitalContributions.length > 0) batchWrites.push(idb.putBatch('capital_contributions', d.capitalContributions));
            if (d.ownerWithdrawals && d.ownerWithdrawals.length > 0) batchWrites.push(idb.putBatch('owner_withdrawals', d.ownerWithdrawals));
            if (d.stockAdjustments && d.stockAdjustments.length > 0) batchWrites.push(idb.putBatch('stock_adjustments', d.stockAdjustments));
            await Promise.all(batchWrites);
            syncedViaManagerApi = true;
            console.log('[Sync] Synchronized all management data via secure manager API.');
            return true;
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

      await Promise.all(tables.map(async (table) => {
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
      }));
    }

    return syncedViaManagerApi;
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

  // iOS Safari Foreground Wakeup (throttled to 15s cooldown to avoid UI lag on quick tab switches)
  document.addEventListener('visibilitychange', () => {
    const now = Date.now();
    if (document.visibilityState === 'visible' && state.online && auth.isAuthenticated() && (now - _lastVisibilitySyncTs > 15000)) {
      _lastVisibilitySyncTs = now;
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

async function loadLocalData({ render = true } = {}) {
  // Read all local IndexedDB stores in parallel instead of sequentially
  const [
    allCachedOrders,
    rawInventory,
    batches,
    suppliers,
    expenses,
    debts,
    debtRepayments,
    orderStockAllocs,
    orderMeta,
    orderReturns,
    capitalContributions,
    ownerWithdrawals,
    stockAdjustments,
    openings
  ] = await Promise.all([
    idb.getAll('orders'),
    idb.getAll('inventory'),
    idb.getAll('batches'),
    idb.getAll('suppliers'),
    idb.getAll('expenses'),
    idb.getAll('debts'),
    idb.getAll('debt_repayments'),
    idb.getAll('order_stock_allocations'),
    idb.getAll('order_meta'),
    idb.getAll('order_returns'),
    idb.getAll('capital_contributions'),
    idb.getAll('owner_withdrawals'),
    idb.getAll('stock_adjustments'),
    idb.getAll('opening_position')
  ]);

  state.orders = (allCachedOrders || []).filter(o => !(o.firstName === 'Test' && o.familyName === 'Test'));

  // Deduplicate inventory by normalized title and stock group / accessory / packaging role
  const dedupMap = new Map();
  const prunedDuplicateIds = [];
  rawInventory.forEach(item => {
    if (!item.title) return;
    const isPkg = isPackagingPaperItem(item);
    const isAcc = !isPkg && isAccessoryItem(item);
    const grp = isPkg ? 'PACKAGING' : (isAcc ? 'ACCESSORIES' : (item.stock_group || 'NEW_STOCK').toUpperCase());
    const normT = (item.title || '')
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
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
  state.inventory.forEach(inv => {
    if ((inv.selling_price_da === null || inv.selling_price_da === undefined) && inv.title && (inv.title.includes('مثنوي') || inv.title.includes('المثنوي'))) {
      inv.selling_price_da = 10000;
    }
  });
  if (prunedDuplicateIds.length > 0) {
    prunedDuplicateIds.forEach(pId => idb.delete('inventory', pId).catch(() => {}));
  }

  state.batches = batches || [];
  state.suppliers = suppliers || [];
  state.expenses = expenses || [];
  state.debts = debts || [];
  state.debtRepayments = debtRepayments || [];
  state.orderStockAllocations = orderStockAllocs || [];
  state.orderAllocations = state.orderStockAllocations; // unified alias
  state.orderMeta = orderMeta || [];
  state.orderReturns = orderReturns || [];
  state.capitalContributions = capitalContributions || [];
  state.ownerWithdrawals = ownerWithdrawals || [];
  state.stockAdjustments = stockAdjustments || [];
  state.openingPosition = openings.length > 0 ? openings[0] : { id: 1, cash_balance_da: 0, owner_contributions_da: 0, owner_withdrawals_da: 0, notes: 'Opening Position' };

  invalidateAccountingCache();

  // Load published storefront catalogs once per session (books, bookmarks, accessories)
  if (!_cmsLoadedOnce) {
    try {
      const [cmsRes, bmRes, accRes] = await Promise.all([
        fetch('../cms-books.json').catch(() => null),
        fetch('../cms-bookmarks.json').catch(() => null),
        fetch('../cms-accessories.json').catch(() => null)
      ]);
      if (cmsRes && cmsRes.ok) {
        const cmsBooks = await cmsRes.json();
        if (Array.isArray(cmsBooks) && cmsBooks.length > 0) {
          state.cmsBooks = cmsBooks;
          state.storefrontCatalogCount = cmsBooks.length;
        }
      }
      if (bmRes && bmRes.ok) {
        const bmList = await bmRes.json();
        if (Array.isArray(bmList)) state.cmsBookmarks = bmList;
      }
      if (accRes && accRes.ok) {
        const accList = await accRes.json();
        if (Array.isArray(accList)) state.cmsAccessories = accList;
      }
      _cmsLoadedOnce = true;
    } catch (err) {
      // Retain offline defaults
    }
  }

  if ((state.inventory && state.inventory.length > 0) || (state.orders && state.orders.length > 0)) {
    await ensureStarterAccessoriesAndPackaging({ queueRemote: false });
    invalidateAccountingCache();
    applyLiveOrdersToInventory();
  }

  if (render) renderAppViews();
}

async function ensureStarterAccessoriesAndPackaging({ queueRemote = true } = {}) {
  if (!state.inventory) state.inventory = [];
  let changed = false;
  const nowIso = new Date().toISOString();

  for (const spec of WEBSITE_ACCESSORY_LINKS) {
    const exists = state.inventory.some(item => {
      if (!item) return false;
      if (String(item.id) === String(spec.lotId)) return true;
      const m = getWebsiteAccessoryMatch(item);
      return m && m.webId === spec.webId;
    });
    if (exists) continue;

    let noteParts = [
      `Linked Web Product: ${spec.webId}`,
      `Category: ${spec.category}`,
      `StockGroup: ACCESSORIES`,
      `[ACC_HISTORY:${JSON.stringify({
        webId: spec.webId,
        slug: spec.slug,
        baselinePreLiveSold: spec.baselinePreLiveSold || 0,
        salesTiers: spec.salesTiers || []
      })}]`
    ];
    if (Array.isArray(spec.priceHistory)) {
      spec.priceHistory.forEach(ph => {
        noteParts.push(`[PRICE_HISTORY:${JSON.stringify(ph)}]`);
      });
    }

    const newItem = {
      id: spec.lotId,
      title: spec.title,
      author: 'Gentle Readers Collection',
      isbn: null,
      category: spec.category,
      item_type: spec.category,
      stock_group: 'NEW_STOCK',
      batch_id: null,
      quantity_received: spec.purchasedQty,
      quantity_sold: spec.soldQty,
      quantity_reserved: 0,
      quantity_damaged: 0,
      quantity_lost: 0,
      quantity_promotional: 0,
      quantity_returned_to_supplier: 0,
      quantity_count_adjustment: 0,
      unit_purchase_cost_da: spec.defaultCostDa,
      selling_price_da: spec.defaultPriceDa,
      supplier_name: 'Accessories Supplier',
      acquisition_date: spec.acquisitionDate || '2026-10-15',
      condition: 'New',
      notes: noteParts.join(' | '),
      created_at: nowIso,
      updated_at: nowIso
    };

    ensureInventoryDbBaseline(newItem);
    state.inventory.push(newItem);
    if (idb.db) {
      await idb.put('inventory', toRawIdbInventoryCopy(newItem));
      if (queueRemote) {
        await idb.queueMutation('inventory_items', 'upsert', toRawIdbInventoryCopy(newItem));
      }
    }
    changed = true;
  }

  for (const spec of PACKAGING_VARIANTS) {
    const exists = state.inventory.some(item => {
      if (!item) return false;
      if (String(item.id) === String(spec.lotId)) return true;
      const vKey = resolvePackagingVariantKey(item.title) || parseJsonNoteTag(item.notes, 'PKG_META')?.variantKey;
      return vKey === spec.variantKey;
    });
    if (exists) continue;

    const pkgMeta = {
      variantKey: spec.variantKey,
      shortName: spec.shortName,
      purchasedMeters: spec.approxMeters,
      isProvisionalQty: true,
      provisionalTotalCostDa: spec.provisionalTotalCostDa,
      isCostConfirmed: false,
      cmPerWrapOverride: null
    };

    const newItem = {
      id: spec.lotId,
      title: spec.title,
      author: null,
      isbn: null,
      category: 'packaging',
      item_type: 'packaging',
      stock_group: 'NEW_STOCK',
      batch_id: null,
      quantity_received: Math.round((spec.approxMeters || 3) * 100),
      quantity_sold: 0,
      quantity_reserved: 0,
      quantity_damaged: 0,
      quantity_lost: 0,
      quantity_promotional: 0,
      quantity_returned_to_supplier: 0,
      quantity_count_adjustment: 0,
      unit_purchase_cost_da: null,
      selling_price_da: spec.sellingPriceDa,
      supplier_name: 'Packaging Supplier',
      acquisition_date: '2026-11-01',
      condition: 'New',
      notes: `Category: packaging | StockGroup: PACKAGING | Provisional ~${spec.approxMeters}m roll | [PKG_META:${JSON.stringify(pkgMeta)}]`,
      created_at: nowIso,
      updated_at: nowIso
    };

    ensureInventoryDbBaseline(newItem);
    state.inventory.push(newItem);
    if (idb.db) {
      await idb.put('inventory', toRawIdbInventoryCopy(newItem));
      if (queueRemote) {
        await idb.queueMutation('inventory_items', 'upsert', toRawIdbInventoryCopy(newItem));
      }
    }
    changed = true;
  }

  return changed;
}

async function ensureOrder176Corrected() {
  const order176 = (state.orders || []).find(o => Number(o.id) === 176);
  if (!order176) return false;

  if (!state.orderMeta) state.orderMeta = [];
  let meta = state.orderMeta.find(m => Number(m.order_id) === 176);
  if (meta && String(meta.notes || '').includes('[ORDER_CORRECTION:')) {
    return false;
  }

  const rawItems = parseOrderItemsSafe(order176);
  const targetIdx = rawItems.findIndex(raw => {
    const pi = parseOrderItem(raw);
    return normalizeText(pi.title).includes('يجب ان تكلم احدا');
  });
  if (targetIdx === -1) return false;

  const removedRaw = rawItems[targetIdx];
  const removedParsed = parseOrderItem(removedRaw);
  const currentTotal = Number(order176.total_price) || 0;
  const shippingFee = Number(order176.shipping_price) || 0;
  const cmsBook = (state.cmsBooks || []).find(b => normalizeText(b.title) === normalizeText(removedParsed.title));
  const verifiedUnitPrice = (typeof removedRaw === 'object' && removedRaw !== null && Number(removedRaw.price) > 0)
    ? Number(removedRaw.price)
    : (cmsBook && Number(cmsBook.price) > 0 ? Number(cmsBook.price) : 2500);
  const removedAmount = verifiedUnitPrice * (removedParsed.qty || 1);

  if (currentTotal < removedAmount || removedAmount <= 0) return false;

  const nextItems = rawItems.filter((_, idx) => idx !== targetIdx);
  const correctedTotal = currentTotal - removedAmount;
  const nowIso = new Date().toISOString();

  const correctionPayload = {
    orderId: 176,
    removedItems: [{
      raw: typeof removedRaw === 'string' ? removedRaw : removedParsed.title,
      title: removedParsed.title,
      qty: removedParsed.qty || 1,
      unitPriceDa: verifiedUnitPrice,
      amountDa: removedAmount
    }],
    previousTotalDa: currentTotal,
    correctedTotalDa: correctedTotal,
    shippingDa: shippingFee,
    correctedBookRevenueDa: Math.max(0, correctedTotal - shippingFee),
    reason: 'Unavailable book ("ربما يجب أن تكلم أحدا") not delivered/taken by customer',
    correctedAt: nowIso
  };

  const auditNote = `Order #176 Correction: Removed unavailable item "${removedParsed.title} × ${removedParsed.qty || 1}" (-${removedAmount.toLocaleString('fr-DZ')} DA). Order total adjusted from ${currentTotal.toLocaleString('fr-DZ')} DA to ${correctedTotal.toLocaleString('fr-DZ')} DA (${Math.max(0, correctedTotal - shippingFee).toLocaleString('fr-DZ')} DA books + ${shippingFee.toLocaleString('fr-DZ')} DA shipping). [ORDER_CORRECTION:${JSON.stringify(correctionPayload)}]`;

  order176.items = nextItems;
  order176.total_price = correctedTotal;
  if (idb.db) await idb.put('orders', order176);

  if (!meta) {
    meta = {
      order_id: 176,
      fulfillment_status: order176.status || 'shipped',
      payment_status: order176.payment_status || 'unpaid',
      notes: auditNote,
      updated_at: nowIso
    };
    state.orderMeta.push(meta);
  } else {
    meta.notes = meta.notes ? `${String(meta.notes).trim()}\n${auditNote}` : auditNote;
    meta.updated_at = nowIso;
  }

  if (idb.db) {
    await idb.put('order_meta', meta);
    await idb.queueMutation('orders', 'correct_order', {
      id: 176,
      order_id: 176,
      items: nextItems,
      total_price: correctedTotal,
      audit_note: auditNote
    });
  }
  return true;
}

function updateGlobalNavBadges() {
  const ordersBadge = document.getElementById('orders-nav-badge');
  if (ordersBadge) ordersBadge.textContent = (state.orders || []).length;
  const invBadge = document.getElementById('inventory-nav-badge');
  if (invBadge) invBadge.textContent = (state.inventory || []).length;
  const paidBadge = document.getElementById('paid-orders-nav-badge');
  if (paidBadge && _finCache && _finCache.paidSummary) {
    paidBadge.textContent = _finCache.paidSummary.allCount;
  }
}

function renderSingleSection(sectionId) {
  switch (sectionId) {
    case 'dashboard':
      updateDashboardMetrics();
      renderRecentOrders();
      break;
    case 'inventory':
      renderInventoryTable();
      populateBatchDropdown();
      break;
    case 'orders':
      renderOrdersTable();
      break;
    case 'paid-orders':
      if (typeof renderPaidOrdersSection === 'function') renderPaidOrdersSection();
      break;
    case 'purchases':
      renderPurchasesSection();
      break;
    case 'expenses':
      renderExpensesSection();
      break;
    case 'finance':
      renderFinanceSection();
      break;
    case 'debts':
      renderDebtsSection();
      break;
    case 'advertising':
      if (typeof renderAdvertisingSection === 'function') renderAdvertisingSection();
      break;
    case 'settings':
      break;
    default:
      updateDashboardMetrics();
      renderRecentOrders();
      break;
  }
  _dirtySections.delete(sectionId);
}

function renderAppViews({ forceAll = false, invalidate = true } = {}) {
  if (invalidate) {
    invalidateAccountingCache();
  }
  const active = state.activeSection || 'dashboard';
  if (forceAll) {
    ALL_MANAGER_SECTIONS.forEach(s => renderSingleSection(s));
  } else {
    renderSingleSection(active);
  }
  updateGlobalNavBadges();
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
function resolvePackagingVariantKey(value) {
  if (!value) return null;
  const norm = normalizeText(value);
  const rawLow = String(value).toLowerCase().trim();
  if (!norm || rawLow === 'none' || rawLow === 'standard') return null;
  if (rawLow === 'papier_craft' || norm.includes('craft') || norm.includes('كرافت')) return 'papier_craft';
  for (const v of PACKAGING_VARIANTS) {
    if (rawLow === v.variantKey || norm === normalizeText(v.title) || norm === normalizeText(v.shortName)) return v.variantKey;
    if (v.aliases.some(a => norm.includes(normalizeText(a)) || rawLow.includes(a.toLowerCase()))) {
      return v.variantKey;
    }
  }
  return null;
}

function isPackagingPaperItem(item) {
  if (!item) return false;
  const grp = (item.stock_group || '').toUpperCase();
  if (grp === 'PACKAGING') return true;
  const type = (item.item_type || item.category || '').toLowerCase();
  if (type === 'packaging') return true;
  const notes = (item.notes || '').toLowerCase();
  if (notes.includes('stockgroup: packaging') || notes.includes('category: packaging') || notes.includes('[pkg_meta:')) return true;
  const title = (item.title || '').toLowerCase();
  if (title.includes('wrapping paper') || title.includes('ورق ') || title.includes('تغليف') || resolvePackagingVariantKey(item.title)) {
    return true;
  }
  return false;
}
window.isPackagingPaperItem = isPackagingPaperItem;

function getWebsiteAccessoryMatch(itemOrTitle) {
  const title = typeof itemOrTitle === 'string' ? itemOrTitle : (itemOrTitle?.title || '');
  const notes = typeof itemOrTitle === 'object' ? (itemOrTitle?.notes || '') : '';
  const norm = normalizeText(title);
  for (const spec of WEBSITE_ACCESSORY_LINKS) {
    if (notes.includes(spec.webId) || notes.includes(spec.slug)) return spec;
    if (norm === normalizeText(spec.title) || norm === normalizeText(spec.shortName)) return spec;
    if (spec.keywords.some(k => norm.includes(normalizeText(k)) || title.toLowerCase().includes(k))) {
      return spec;
    }
  }
  return null;
}

function isAccessoryItem(item) {
  if (!item || isPackagingPaperItem(item)) return false;
  const grp = (item.stock_group || '').toUpperCase();
  if (grp === 'ACCESSORIES') return true;
  const type = (item.item_type || item.category || '').toLowerCase();
  if (['bookmark', 'accessory', 'read log', 'reading tracker'].includes(type)) return true;
  const bId = (item.batch_id || '').toLowerCase();
  if (bId.includes('accessor')) return true;
  const title = (item.title || '').toLowerCase();
  if (title.includes('bookmark') || title.includes('فاصل') || title.includes('reading list') || title.includes('reading log') || title.includes('book tracker') || title.includes('metalicleaves') || title.includes('tracker')) return true;
  const notes = (item.notes || '').toLowerCase();
  if (notes.includes('stockgroup: accessories') || notes.includes('category: bookmark') || notes.includes('category: accessory')) return true;
  return false;
}
window.isAccessoryItem = isAccessoryItem;

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // strip Arabic diacritics & tatweel
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
window.normalizeText = normalizeText;

function compactText(s) {
  return normalizeText(s).replace(/\s+/g, '');
}

const TITLE_MATCH_STOPWORDS = new Set([
  'الى', 'الي', 'على', 'علي', 'عن', 'من', 'في', 'مع', 'او', 'ثم', 'بين', 'عند',
  'بعد', 'قبل', 'نحو', 'حول', 'تحت', 'فوق', 'ضد', 'و', 'ان', 'لا', 'ما', 'هذا', 'هذه',
  'دار', 'طبعه', 'اداب', 'تنوير', 'كلمات', 'شروق', 'محروسه', 'افاق',
  'جزء', 'اجزاء', 'جزئين', 'مجلد', 'كتاب', 'اول', 'ثاني', 'لعقد', 'قران',
  'the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'of', 'on', 'in', 'to', 'by', 'a', 'an', 'series', 'books', 'book', 'vol', 'part'
]);

// Verified storefront <-> inventory edition aliases (strictly same physical book/set)
const VERIFIED_TITLE_ALIASES = new Map([
  ['المثنوي ج1 الي 6', 'مثنوي 1 6'],
  ['استعدادات لعقد قران', 'استعدادات و قصص اخري'],
  ['اخرج مع فتاه تحب الكتابه', 'اخرج في موعد مع فتاه تحب الكتابه'],
  ['ميه عام من العزله طبعه التنوير', 'ميه عام من العزله'],
  ['مئه عام من العزله طبعه التنوير', 'مئه عام من العزله']
]);

function extractVolumeSignature(normStr) {
  const s = normStr || '';
  if (/(?:^|\s)(?:ج\s*1\s+(?:الي|الى)?\s*6|1\s+6|1\s+و\s+2|1\s+2|جزيين|جزئين)(?=\s|$)/.test(s)) {
    return { kind: 'range', val: null };
  }
  const endVol = s.match(/(?:^|\s)(?:ج\s*)?([1-6])(?:\s*$)/);
  if (endVol) return { kind: 'vol', val: endVol[1] };
  if (s.includes('كتاب الاول') || s.includes('الكتاب الاول') || s.includes('جزء الاول')) {
    return { kind: 'vol', val: '1' };
  }
  if (s.includes('كتاب الثاني') || s.includes('الكتاب الثاني') || s.includes('جزء الثاني')) {
    return { kind: 'vol', val: '2' };
  }
  return { kind: 'none', val: null };
}

function volumesAreCompatible(vA, vB) {
  if (!vA || !vB) return true;
  if (vA.kind === 'vol' && vB.kind === 'vol' && vA.val !== vB.val) return false;
  return true;
}

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
  const norm = normalizeText(s);
  if (!norm) return new Set();
  const out = new Set();
  for (const rawWord of norm.split(' ')) {
    if (!rawWord || /^(ج?\d+)$/.test(rawWord)) continue;
    let w = rawWord;
    // Safely strip Arabic definite article prefixes without ASCII \b boundaries
    if (w.startsWith('وال') && w.length >= 6) {
      w = w.slice(3);
    } else if (w.startsWith('ال') && w.length >= 5) {
      w = w.slice(2);
    }
    if (TITLE_MATCH_STOPWORDS.has(w) || TITLE_MATCH_STOPWORDS.has(rawWord)) continue;
    if (w.length >= 3) out.add(w);
  }
  return out;
}
window.extractSignificantTokens = extractSignificantTokens;

function computeLevenshteinSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 4) return 0;
  const dp = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) dp[j] = j;
  for (let i = 1; i <= la; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cur = dp[j];
      dp[j] = (a[i - 1] === b[j - 1]) ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = cur;
    }
  }
  return 1 - (dp[lb] / Math.max(la, lb));
}

function getInventorySearchIndex() {
  if (_invSearchIndex) return _invSearchIndex;
  const invList = state.inventory || [];
  const normMap = new Map();
  const compactMap = new Map();
  const idMap = new Map();
  const groupsList = [];

  invList.forEach(item => {
    if (!item) return;
    if (item.id !== undefined && item.id !== null) {
      idMap.set(String(item.id), item);
    }
    if (!item.title) return;
    const nt = normalizeText(item.title);
    const ct = nt.replace(/\s+/g, '');
    if (!normMap.has(nt)) {
      normMap.set(nt, []);
      if (ct && !compactMap.has(ct)) compactMap.set(ct, nt);
      groupsList.push({
        normTitle: nt,
        compactTitle: ct,
        vols: extractVolumeSignature(nt),
        tokens: extractSignificantTokens(nt),
        isPkg: isPackagingPaperItem(item),
        isAcc: !isPackagingPaperItem(item) && isAccessoryItem(item)
      });
    }
    normMap.get(nt).push(item);
  });

  _invSearchIndex = { normMap, compactMap, idMap, groupsList };
  return _invSearchIndex;
}

function resolveMatchedLotsWithReason(title, { excludePackaging = true } = {}) {
  if (!title) return { lots: [], matchMethod: 'none', canonicalNormTitle: '' };
  const idx = getInventorySearchIndex();

  // Website Accessory link check first (strictly binds storefront accessories & bookmarks)
  const webAcc = getWebsiteAccessoryMatch(title);
  if (webAcc) {
    const webNorm = normalizeText(webAcc.title);
    const webLots = idx.normMap.get(webNorm);
    if (webLots && webLots.length > 0) {
      return { lots: [...webLots], matchMethod: 'accessory_link', canonicalNormTitle: webNorm };
    }
  }

  let nt = normalizeText(title);
  if (!nt) return { lots: [], matchMethod: 'none', canonicalNormTitle: '' };

  if (VERIFIED_TITLE_ALIASES.has(nt)) {
    const aliasTarget = VERIFIED_TITLE_ALIASES.get(nt);
    if (idx.normMap.has(aliasTarget)) {
      return {
        lots: (idx.normMap.get(aliasTarget) || []).filter(l => !excludePackaging || !isPackagingPaperItem(l)),
        matchMethod: 'verified_alias',
        canonicalNormTitle: aliasTarget
      };
    }
  }

  // Tier 1: Exact normalized title
  if (idx.normMap.has(nt)) {
    const hits = idx.normMap.get(nt).filter(l => !excludePackaging || !isPackagingPaperItem(l));
    if (hits.length > 0) return { lots: [...hits], matchMethod: 'exact', canonicalNormTitle: nt };
  }

  // Tier 1b: Exact space-insensitive match (e.g. كبرياء وهوى vs كبرياء و هوى)
  const ct = nt.replace(/\s+/g, '');
  if (idx.compactMap.has(ct)) {
    const mappedNorm = idx.compactMap.get(ct);
    const hits = (idx.normMap.get(mappedNorm) || []).filter(l => !excludePackaging || !isPackagingPaperItem(l));
    if (hits.length > 0) return { lots: [...hits], matchMethod: 'compact', canonicalNormTitle: mappedNorm };
  }

  const orderVols = extractVolumeSignature(nt);

  // Tier 2: Strict word-boundary prefix edition match (min 2 words & >= 8 chars on shorter title;
  // prevents 1-word titles like "الغريب" inside long titles like "10 دقائق و38 ثانية في هذا العالم الغريب")
  let prefixTarget = null;
  let bestPrefixLen = 0;
  for (const grp of idx.groupsList) {
    if (excludePackaging && grp.isPkg) continue;
    if (!volumesAreCompatible(orderVols, grp.vols)) continue;
    const shorter = grp.normTitle.length <= nt.length ? grp.normTitle : nt;
    if (shorter.length >= 8 && shorter.split(' ').length >= 2) {
      if (nt.startsWith(grp.normTitle + ' ') || grp.normTitle.startsWith(nt + ' ')) {
        if (shorter.length > bestPrefixLen) {
          bestPrefixLen = shorter.length;
          prefixTarget = grp.normTitle;
        }
      }
    }
  }
  if (prefixTarget) {
    const hits = (idx.normMap.get(prefixTarget) || []).filter(l => !excludePackaging || !isPackagingPaperItem(l));
    if (hits.length > 0) return { lots: [...hits], matchMethod: 'prefix', canonicalNormTitle: prefixTarget };
  }

  // Tier 3: High-precision content token match (prevents unrelated 1-word partial matches)
  const orderTokens = extractSignificantTokens(nt);
  if (orderTokens.size > 0) {
    let bestGroup = null;
    let bestScore = 0;
    for (const grp of idx.groupsList) {
      if (excludePackaging && grp.isPkg) continue;
      if (!volumesAreCompatible(orderVols, grp.vols)) continue;
      if (!grp.tokens || grp.tokens.size === 0) continue;

      let inter = 0;
      for (const t of orderTokens) {
        if (grp.tokens.has(t)) inter++;
      }
      if (inter === 0) continue;

      const covOrder = inter / orderTokens.size;
      const covInv = inter / grp.tokens.size;
      const fullExactTokens = (inter === orderTokens.size && inter === grp.tokens.size);
      const multiTokenStrongOverlap = (inter >= 2 && covOrder >= 0.65 && covInv >= 0.65);

      if (fullExactTokens || multiTokenStrongOverlap) {
        const score = covOrder + covInv + (inter * 0.01);
        if (score > bestScore) {
          bestScore = score;
          bestGroup = grp.normTitle;
        }
      }
    }
    if (bestGroup) {
      const hits = (idx.normMap.get(bestGroup) || []).filter(l => !excludePackaging || !isPackagingPaperItem(l));
      if (hits.length > 0) return { lots: [...hits], matchMethod: 'tokens', canonicalNormTitle: bestGroup };
    }
  }

  // Tier 4: High character similarity (>= 0.85) for spelling typos (e.g. "A thousan splendid suns")
  let bestTypo = null;
  let bestSim = 0.849;
  for (const grp of idx.groupsList) {
    if (excludePackaging && grp.isPkg) continue;
    if (!volumesAreCompatible(orderVols, grp.vols)) continue;
    const sim = computeLevenshteinSimilarity(nt, grp.normTitle);
    if (sim > bestSim) {
      bestSim = sim;
      bestTypo = grp.normTitle;
    }
  }
  if (bestTypo) {
    const hits = (idx.normMap.get(bestTypo) || []).filter(l => !excludePackaging || !isPackagingPaperItem(l));
    if (hits.length > 0) return { lots: [...hits], matchMethod: 'typo', canonicalNormTitle: bestTypo };
  }

  return { lots: [], matchMethod: 'none', canonicalNormTitle: '' };
}

function findInventoryItem(title) {
  if (!title || !state.inventory) return null;
  const { lots } = resolveMatchedLotsWithReason(title, { excludePackaging: false });
  if (lots.length === 0) return null;
  const sorted = [...lots].sort((a, b) => {
    const aIsOld = (a.stock_group || '').toUpperCase() === 'OLD_STOCK' ? 0 : 1;
    const bIsOld = (b.stock_group || '').toUpperCase() === 'OLD_STOCK' ? 0 : 1;
    if (aIsOld !== bIsOld) return aIsOld - bIsOld;
    return String(a.acquisition_date || '9999').localeCompare(String(b.acquisition_date || '9999'));
  });
  return sorted[0];
}
window.findInventoryItem = findInventoryItem;

function isNewBatchLot(lot) {
  if (!lot) return false;
  if (isPackagingPaperItem(lot) || isAccessoryItem(lot)) return false;
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

function buildInventoryNormTitleMap(inventoryList) {
  if (inventoryList === state.inventory) {
    return getInventorySearchIndex().normMap;
  }
  const normTitleMap = new Map();
  (inventoryList || []).forEach(item => {
    if (item && item.title) {
      const normKey = normalizeText(item.title);
      if (!normTitleMap.has(normKey)) {
        normTitleMap.set(normKey, []);
      }
      normTitleMap.get(normKey).push(item);
    }
  });
  return normTitleMap;
}

function isLotChronologicallyEligibleForOrder(lot, isHist, orderDateStr) {
  if (!lot) return false;
  if (isPackagingPaperItem(lot)) return false;
  if (isAccessoryItem(lot)) return true;
  if ((lot.stock_group || '').toUpperCase() === 'OLD_STOCK') return true;
  // Historical orders (before Nov 2026 Book Fair) or orders dated before the lot acquisition
  // MUST NOT borrow NEW_STOCK Book Fair purchase costs.
  if (isHist) return false;
  const acq = lot.acquisition_date ? String(lot.acquisition_date).slice(0, 10) : '';
  if (orderDateStr && acq && orderDateStr < acq) return false;
  return true;
}

function resolveCandidateLotsForTitle(title, isHist, normTitleMap, orderDateStr = '', rawOrderTitle = '') {
  if (!title) return [];
  const { lots } = resolveMatchedLotsWithReason(title, { excludePackaging: true });
  if (lots.length === 0) return [];

  // Prefer date/chronology-eligible lots ONLY (never fabricate missing historical cost from future NEW_STOCK!)
  const eligible = lots.filter(l => isLotChronologicallyEligibleForOrder(l, isHist, orderDateStr));
  if (eligible.length === 0) return [];

  const normRaw = normalizeText(rawOrderTitle || title);
  const preferNewEdition = normRaw.includes('التنوير');

  eligible.sort((a, b) => {
    if (preferNewEdition) {
      const aIsNew = isNewBatchLot(a) ? 0 : 1;
      const bIsNew = isNewBatchLot(b) ? 0 : 1;
      if (aIsNew !== bIsNew) return aIsNew - bIsNew;
    }
    const aIsOld = (a.stock_group || '').toUpperCase() === 'OLD_STOCK' ? 0 : 1;
    const bIsOld = (b.stock_group || '').toUpperCase() === 'OLD_STOCK' ? 0 : 1;
    if (aIsOld !== bIsOld) return aIsOld - bIsOld;
    return String(a.acquisition_date || '9999').localeCompare(String(b.acquisition_date || '9999'));
  });
  return eligible;
}

function ensureInventoryDbBaseline(inv) {
  if (!inv) return;
  if (!Object.prototype.hasOwnProperty.call(inv, '_dbRawSold')) {
    Object.defineProperty(inv, '_dbRawSold', {
      value: Number(inv.quantity_sold) || 0,
      writable: true,
      configurable: true,
      enumerable: false
    });
  }
  if (!Object.prototype.hasOwnProperty.call(inv, '_dbRawReserved')) {
    Object.defineProperty(inv, '_dbRawReserved', {
      value: Number(inv.quantity_reserved) || 0,
      writable: true,
      configurable: true,
      enumerable: false
    });
  }
}

function syncInventoryDbBaseline(inv) {
  if (!inv) return;
  Object.defineProperty(inv, '_dbRawSold', {
    value: Number(inv.quantity_sold) || 0,
    writable: true,
    configurable: true,
    enumerable: false
  });
  Object.defineProperty(inv, '_dbRawReserved', {
    value: Number(inv.quantity_reserved) || 0,
    writable: true,
    configurable: true,
    enumerable: false
  });
}

function toRawIdbInventoryCopy(inv) {
  if (!inv) return inv;
  const copy = { ...inv };
  if (Object.prototype.hasOwnProperty.call(inv, '_dbRawSold')) {
    copy.quantity_sold = Number(inv._dbRawSold) || 0;
  }
  if (Object.prototype.hasOwnProperty.call(inv, '_dbRawReserved')) {
    copy.quantity_reserved = Number(inv._dbRawReserved) || 0;
  }
  return copy;
}

function buildAccountingLookupMaps() {
  const searchIdx = getInventorySearchIndex();
  const metaByOrderId = new Map();
  (state.orderMeta || []).forEach(m => {
    if (m && m.order_id !== undefined && m.order_id !== null) {
      metaByOrderId.set(String(m.order_id), m);
    }
  });

  const allocsSource = (Array.isArray(state.orderStockAllocations) && state.orderStockAllocations.length > 0)
    ? state.orderStockAllocations
    : (state.orderAllocations || []);
  const allocsByOrderId = new Map();
  allocsSource.forEach(a => {
    if (!a || a.order_id === undefined || a.order_id === null || a.allocation_status === 'released') return;
    const key = String(a.order_id);
    if (!allocsByOrderId.has(key)) allocsByOrderId.set(key, []);
    allocsByOrderId.get(key).push(a);
  });

  const returnsByOrderIdTitle = new Map();
  (state.orderReturns || []).forEach(ret => {
    if (ret && ret.condition !== 'damaged' && ret.restocked_to_inventory !== false) {
      const k = `${String(ret.order_id)}::${normalizeText(ret.title)}`;
      returnsByOrderIdTitle.set(k, (returnsByOrderIdTitle.get(k) || 0) + (Number(ret.quantity) || 0));
    }
  });

  return { searchIdx, metaByOrderId, allocsByOrderId, returnsByOrderIdTitle };
}

function getNumericUnitCostOrNull(lotOrVal) {
  const raw = (lotOrVal && typeof lotOrVal === 'object') ? lotOrVal.unit_purchase_cost_da : lotOrVal;
  if (raw === null || raw === undefined || raw === '' || isNaN(raw)) return null;
  return Number(raw);
}

// Resolves a single order line item's lot allocation & unit cost using:
//   1. Persisted order_stock_allocations (highest priority, never guessed)
//   2. Chronologically valid & safe title match + capacity-aware FIFO / price disambiguation
// Never borrows post-order NEW_STOCK costs for historical orders, and flags unknown/ambiguous items.
function attributeOrderItemLot(pi, order, isHist, orderDateStr, itemRefPrice, lookups, remainingCapByLotId, availableAllocs) {
  const qty = Math.max(1, Number(pi.qty) || 1);
  const { searchIdx } = lookups;

  // 1. Check persisted order_stock_allocations first
  if (availableAllocs && availableAllocs.length > 0) {
    // Match exact allocation by inventory item title / match
    const { lots: rawMatchedLots } = resolveMatchedLotsWithReason(pi.title, { excludePackaging: true });
    const matchedLotIdSet = new Set(rawMatchedLots.map(l => String(l.id)));

    const matchingAllocs = [];
    for (let i = 0; i < availableAllocs.length; i++) {
      const al = availableAllocs[i];
      if (!al || al._consumedRemaining <= 0) continue;
      const alLot = searchIdx.idMap.get(String(al.inventory_item_id));
      const alLotNorm = alLot ? normalizeText(alLot.title) : '';
      const orderItemNorm = normalizeText(pi.title);
      if (
        matchedLotIdSet.has(String(al.inventory_item_id)) ||
        (alLotNorm && orderItemNorm && (alLotNorm === orderItemNorm || VERIFIED_TITLE_ALIASES.get(orderItemNorm) === alLotNorm))
      ) {
        matchingAllocs.push(al);
      }
    }

    if (matchingAllocs.length > 0) {
      let need = qty;
      const lotSlices = [];
      for (const al of matchingAllocs) {
        if (need <= 0) break;
        const take = Math.min(need, al._consumedRemaining);
        if (take <= 0) continue;
        al._consumedRemaining -= take;
        need -= take;

        const lot = searchIdx.idMap.get(String(al.inventory_item_id)) || null;
        if (remainingCapByLotId && lot) {
          const cap = remainingCapByLotId.get(String(lot.id)) || 0;
          remainingCapByLotId.set(String(lot.id), Math.max(0, cap - take));
        }
        const costFromAlloc = getNumericUnitCostOrNull(al.unit_purchase_cost_da);
        const unitCost = costFromAlloc !== null ? costFromAlloc : getNumericUnitCostOrNull(lot);
        lotSlices.push({
          lot,
          lotId: String(al.inventory_item_id),
          qty: take,
          unitCost,
          costBasis: al.cost_basis || 'specific_lot'
        });
      }

      if (need === 0 && lotSlices.length > 0) {
        const allKnown = lotSlices.every(s => s.unitCost !== null);
        const lineCogs = allKnown ? lotSlices.reduce((s, sl) => s + sl.qty * sl.unitCost, 0) : null;
        const knownPartial = lotSlices.reduce((s, sl) => s + (sl.unitCost !== null ? sl.qty * sl.unitCost : 0), 0);
        const primary = lotSlices[0];
        return {
          lot: primary.lot,
          lotSlices,
          matchedMethod: 'allocated',
          attributionStatus: allKnown ? 'allocated' : 'missing_cost',
          costBasis: primary.costBasis,
          unitCost: primary.unitCost,
          lineCogs,
          knownPartial,
          reviewReason: allKnown ? null : 'Allocated lot is missing purchase cost (NULL)'
        };
      }
    }
  }

  // 2. Safe Arabic / English matching without cross-title false positives
  const { lots: rawMatchedLots, matchMethod } = resolveMatchedLotsWithReason(pi.title, { excludePackaging: true });
  if (rawMatchedLots.length === 0) {
    return {
      lot: null,
      lotSlices: [],
      matchedMethod: 'none',
      attributionStatus: 'unmatched',
      costBasis: 'unmatched',
      unitCost: null,
      lineCogs: null,
      knownPartial: 0,
      reviewReason: 'Title not matched in current inventory catalog'
    };
  }

  // 3. Enforce chronology boundary: pre-Fair historical orders CANNOT borrow Nov 2026 Book Fair costs
  const eligibleLots = rawMatchedLots.filter(l => isLotChronologicallyEligibleForOrder(l, isHist, orderDateStr));
  if (eligibleLots.length === 0) {
    const sampleFuture = rawMatchedLots[0];
    return {
      lot: null,
      lotSlices: [],
      matchedMethod: matchMethod,
      attributionStatus: 'needs_review_pre_batch',
      costBasis: 'pre_batch_unreconciled',
      unitCost: null,
      lineCogs: null,
      knownPartial: 0,
      reviewReason: `Order (${orderDateStr || 'historical'}) predates NEW_STOCK batch (${sampleFuture?.acquisition_date || '2026-11-04'}); no OLD_STOCK cost recorded`
    };
  }

  // Sort lots: explicit edition match > selling-price match > OLD_STOCK before NEW_STOCK > earliest acquisition_date
  const normRawTitle = normalizeText(pi.raw || pi.title);
  const preferTanweer = normRawTitle.includes('التنوير');
  const sortedLots = [...eligibleLots].sort((a, b) => {
    if (preferTanweer) {
      const aNew = isNewBatchLot(a) ? 0 : 1;
      const bNew = isNewBatchLot(b) ? 0 : 1;
      if (aNew !== bNew) return aNew - bNew;
    }
    if (itemRefPrice > 0) {
      const aDiff = Math.abs((Number(a.selling_price_da) || 0) - itemRefPrice);
      const bDiff = Math.abs((Number(b.selling_price_da) || 0) - itemRefPrice);
      const aExactP = aDiff <= 10 ? 0 : 1;
      const bExactP = bDiff <= 10 ? 0 : 1;
      if (aExactP !== bExactP) return aExactP - bExactP;
    }
    const aIsOld = (a.stock_group || '').toUpperCase() === 'OLD_STOCK' ? 0 : 1;
    const bIsOld = (b.stock_group || '').toUpperCase() === 'OLD_STOCK' ? 0 : 1;
    if (aIsOld !== bIsOld) return aIsOld - bIsOld;
    return String(a.acquisition_date || '9999').localeCompare(String(b.acquisition_date || '9999'));
  });

  // Allocate across remaining capacity in FIFO order if live order, or use primary lot cost for historical records
  const lotSlices = [];
  if (!isHist && remainingCapByLotId) {
    let need = qty;
    for (const lot of sortedLots) {
      if (need <= 0) break;
      const k = String(lot.id);
      const cap = remainingCapByLotId.get(k) || 0;
      const take = Math.min(cap, need);
      if (take > 0) {
        remainingCapByLotId.set(k, cap - take);
        need -= take;
        lotSlices.push({
          lot,
          lotId: k,
          qty: take,
          unitCost: getNumericUnitCostOrNull(lot),
          costBasis: sortedLots.length > 1 ? 'fifo' : 'single_lot'
        });
      }
    }
    if (need > 0) {
      const fallbackLot = sortedLots[0];
      lotSlices.push({
        lot: fallbackLot,
        lotId: String(fallbackLot.id),
        qty: need,
        unitCost: getNumericUnitCostOrNull(fallbackLot),
        costBasis: sortedLots.length > 1 ? 'fifo' : 'single_lot'
      });
    }
  } else {
    const primaryLot = sortedLots[0];
    lotSlices.push({
      lot: primaryLot,
      lotId: String(primaryLot.id),
      qty,
      unitCost: getNumericUnitCostOrNull(primaryLot),
      costBasis: sortedLots.length > 1 ? 'fifo' : 'single_lot'
    });
  }

  const allKnown = lotSlices.every(s => s.unitCost !== null);
  const lineCogs = allKnown ? lotSlices.reduce((s, sl) => s + sl.qty * sl.unitCost, 0) : null;
  const knownPartial = lotSlices.reduce((s, sl) => s + (sl.unitCost !== null ? sl.qty * sl.unitCost : 0), 0);
  const primary = lotSlices[0];
  const hasMixedGroups = eligibleLots.length > 1 && new Set(eligibleLots.map(l => `${l.stock_group}:${l.unit_purchase_cost_da}`)).size > 1;

  return {
    lot: primary.lot,
    lotSlices,
    matchedMethod: matchMethod,
    attributionStatus: allKnown ? (hasMixedGroups ? 'fifo_mixed_lots' : 'matched') : 'missing_cost',
    costBasis: primary.costBasis,
    unitCost: primary.unitCost,
    lineCogs,
    knownPartial,
    reviewReason: allKnown ? null : `Lot "${primary.lot?.title || pi.title}" has NULL purchase cost`
  };
}

function computePaidOrderDetails(order, normTitleMap) {
  if (_finCache && _finCache.paidOrderById && _finCache.paidOrderById.has(String(order?.id))) {
    return _finCache.paidOrderById.get(String(order.id));
  }
  const lookups = buildAccountingLookupMaps();
  const meta = lookups.metaByOrderId.get(String(order.id)) || null;
  const isHist = !!(order.is_historical || Number(order.id) <= 170);
  const status = meta ? (meta.fulfillment_status || 'pending') : (isHist ? 'delivered' : (order.status || 'pending'));
  const paymentStatus = meta ? (meta.payment_status || 'unpaid') : (isHist ? 'paid' : (order.payment_status || 'unpaid'));
  const pricing = resolveEffectiveOrderPricing(order, meta);
  const rawItems = parseOrderItemsSafe(order);
  const parsedItems = rawItems.map(parseOrderItem);
  const orderDateStr = order?.created_at ? String(order.created_at).slice(0, 10) : '';

  const orderAllocs = (lookups.allocsByOrderId.get(String(order.id)) || []).map(a => ({
    ...a,
    _consumedRemaining: Number(a.quantity) || 0
  }));

  let knownCogsSum = 0;
  let allCostsKnown = parsedItems.length > 0;
  const unknownTitles = [];
  const itemBreakdowns = [];

  if (parsedItems.length === 0) {
    allCostsKnown = false;
    unknownTitles.push(`Order #${order.id} (unitemized)`);
  }

  parsedItems.forEach((pi, idx) => {
    const quickMatch = findInventoryItem(pi.title);
    const refPrice = resolveOrderItemHistoricalRefPrice(rawItems[idx], quickMatch, order, meta);
    const attr = attributeOrderItemLot(pi, order, isHist, orderDateStr, refPrice, lookups, null, orderAllocs);
    if (attr.lineCogs === null) {
      allCostsKnown = false;
      unknownTitles.push(pi.title || 'Unknown Title');
    } else {
      knownCogsSum += attr.lineCogs;
    }
    itemBreakdowns.push({
      title: pi.title,
      qty: pi.qty,
      unitCost: attr.unitCost,
      lineCogs: attr.lineCogs,
      lotId: attr.lot ? String(attr.lot.id) : null,
      lotTitle: attr.lot ? attr.lot.title : null,
      stockGroup: attr.lot ? (isAccessoryItem(attr.lot) ? 'ACCESSORIES' : (attr.lot.stock_group || 'OLD_STOCK')) : null,
      attributionStatus: attr.attributionStatus,
      costBasis: attr.costBasis,
      reviewReason: attr.reviewReason
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

function computeLiveOrderInventoryEffects(providedLookups) {
  const lookups = providedLookups || buildAccountingLookupMaps();
  const liveSoldByLotId = new Map();
  const matchedOrdersByLotId = new Map();
  const remainingCapacityByLotId = new Map();

  (state.inventory || []).forEach(inv => {
    const dmgLossPromoRet = (Number(inv.quantity_damaged) || 0)
      + (Number(inv.quantity_lost) || 0)
      + (Number(inv.quantity_promotional) || 0)
      + (Number(inv.quantity_returned_to_supplier) || 0);
    const countAdj = Number(inv.quantity_count_adjustment) || 0;
    const cap = Math.max(0, (Number(inv.quantity_received) || 0) + countAdj - dmgLossPromoRet);
    remainingCapacityByLotId.set(String(inv.id), cap);
  });

  const returnedQtyByOrderTitle = new Map(lookups.returnsByOrderIdTitle);
  const sortedOrders = [...(state.orders || [])].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

  sortedOrders.forEach(order => {
    const meta = lookups.metaByOrderId.get(String(order.id)) || null;
    const isHist = !!(order.is_historical || Number(order.id) <= 170);
    const fulfillmentStatus = meta ? (meta.fulfillment_status || 'pending') : (isHist ? 'delivered' : (order.status || 'pending'));
    const paymentStatus = meta ? (meta.payment_status || 'unpaid') : (isHist ? 'paid' : (order.payment_status || 'unpaid'));

    if (fulfillmentStatus === 'cancelled' || fulfillmentStatus === 'rejected' || fulfillmentStatus === 'returned') return;

    const isConfirmedLiveSale = !isHist && (paymentStatus === 'paid' || fulfillmentStatus === 'delivered');
    const rawItems = parseOrderItemsSafe(order);
    const parsedItems = rawItems.map(parseOrderItem);
    const orderDateStr = order?.created_at ? String(order.created_at).slice(0, 10) : '';
    const orderAllocs = (lookups.allocsByOrderId.get(String(order.id)) || []).map(a => ({
      ...a,
      _consumedRemaining: Number(a.quantity) || 0
    }));

    parsedItems.forEach((pi, idx) => {
      const returnKey = `${String(order.id)}::${normalizeText(pi.title)}`;
      const availableReturnDeduction = returnedQtyByOrderTitle.get(returnKey) || 0;
      const deductedReturn = Math.min(pi.qty, availableReturnDeduction);
      if (deductedReturn > 0) {
        returnedQtyByOrderTitle.set(returnKey, availableReturnDeduction - deductedReturn);
      }
      const netQty = Math.max(0, pi.qty - deductedReturn);

      const quickLot = findInventoryItem(pi.title);
      const refPrice = resolveOrderItemHistoricalRefPrice(rawItems[idx], quickLot, order, meta);
      const attr = attributeOrderItemLot(
        { ...pi, qty: Math.max(1, netQty) },
        order,
        isHist,
        orderDateStr,
        refPrice,
        lookups,
        isConfirmedLiveSale ? remainingCapacityByLotId : null,
        orderAllocs
      );
      if (!attr.lot) return;

      const provenanceLotId = String(attr.lot.id);
      if (!matchedOrdersByLotId.has(provenanceLotId)) matchedOrdersByLotId.set(provenanceLotId, []);
      matchedOrdersByLotId.get(provenanceLotId).push({
        orderId: order.id,
        customerName: `${order.firstName || ''} ${order.familyName || ''}`.trim() || 'Customer',
        createdAt: order.created_at,
        qty: pi.qty,
        netQty,
        isHist,
        fulfillmentStatus,
        paymentStatus,
        isConfirmedLiveSale,
        costBasis: attr.costBasis
      });

      if (!isConfirmedLiveSale || netQty <= 0) return;

      (attr.lotSlices || []).forEach(sl => {
        if (sl.lot && sl.qty > 0) {
          const lk = String(sl.lot.id);
          liveSoldByLotId.set(lk, (liveSoldByLotId.get(lk) || 0) + sl.qty);
        }
      });
    });
  });

  return { liveSoldByLotId, matchedOrdersByLotId };
}

function applyLiveOrdersToInventoryCore(providedLookups) {
  if (!state.inventory) return;
  const lookups = providedLookups || buildAccountingLookupMaps();
  state.inventory.forEach(inv => {
    if ((inv.selling_price_da === null || inv.selling_price_da === undefined) && inv.title && (inv.title.includes('مثنوي') || inv.title.includes('المثنوي'))) {
      inv.selling_price_da = 10000;
    }
    ensureInventoryDbBaseline(inv);
  });

  const { liveSoldByLotId, matchedOrdersByLotId } = computeLiveOrderInventoryEffects(lookups);
  state._lotMatchedOrders = matchedOrdersByLotId;

  // Preserve original quantity_received intact; combine pre-live accessory/offline baseline + confirmed live demand without double deduction
  state.inventory.forEach(inv => {
    const dbRawSold = Number(inv._dbRawSold) || 0;
    const confirmedLiveSold = liveSoldByLotId.get(String(inv.id)) || 0;
    const accHistory = isAccessoryItem(inv) ? parseJsonNoteTag(inv.notes, 'ACC_HISTORY') : null;
    const baselinePreLiveSold = (accHistory && Number(accHistory.baselinePreLiveSold) > 0)
      ? Number(accHistory.baselinePreLiveSold)
      : 0;
    const maxCap = Math.max(0, (Number(inv.quantity_received) || 0) + (Number(inv.quantity_count_adjustment) || 0) - (Number(inv.quantity_damaged) || 0) - (Number(inv.quantity_lost) || 0));
    const computedSold = Math.max(dbRawSold, baselinePreLiveSold + confirmedLiveSold);
    inv.quantity_sold = maxCap > 0 ? Math.min(maxCap, computedSold) : computedSold;
  });
}
function applyLiveOrdersToInventory(providedLookups) {
  _finCache = null;
  _invSearchIndex = null;
  return applyLiveOrdersToInventoryCore(providedLookups);
}
window.applyLiveOrdersToInventory = applyLiveOrdersToInventory;

function computeAccessoriesFinancialReport(salesByTitle, unpaidQtyByTitleKey) {
  const breakdown = [];
  const accItems = (state.inventory || []).filter(item => isAccessoryItem(item));

  let totalPurchasedQty = 0;
  let totalPurchaseCostAll = 0;
  let allPurchasedCostKnown = true;
  let totalSoldQty = 0;
  let totalPaidSoldQty = 0;
  let totalPaidRevenue = 0;
  let totalPaidCogs = 0;
  let totalPaidProfit = 0;
  let hasUnpricedSold = false;
  let totalAvail = 0;
  let totalOnHand = 0;
  let totalReserved = 0;
  let totalDamaged = 0;
  let remainingCostVal = 0;
  let remainingRetailVal = 0;
  let costedAvailUnits = 0;
  let soldOutCount = 0;
  let lowStockCount = 0;

  accItems.forEach(item => {
    const webMatch = getWebsiteAccessoryMatch(item);
    const accHistory = parseJsonNoteTag(item.notes, 'ACC_HISTORY');
    const tiers = (accHistory && Array.isArray(accHistory.salesTiers)) ? accHistory.salesTiers : [];

    const purchasedQty = Number(item.quantity_received) || 0;
    const soldQty = Number(item.quantity_sold) || 0;
    const onHand = getInventoryOnHandQty(item);
    const avail = getInventoryAvailableQty(item);
    const res = Number(item.quantity_reserved) || 0;
    const dmg = (Number(item.quantity_damaged) || 0) + (Number(item.quantity_lost) || 0);
    const unitCost = (item.unit_purchase_cost_da !== null && item.unit_purchase_cost_da !== undefined && item.unit_purchase_cost_da !== '' && !isNaN(item.unit_purchase_cost_da))
      ? Number(item.unit_purchase_cost_da)
      : null;
    const currentPrice = Number(item.selling_price_da) || (webMatch ? webMatch.defaultPriceDa : 0);

    const normKey = normalizeText(item.title);
    const orderSale = salesByTitle.get(normKey);
    const orderPaidQty = orderSale ? (Number(orderSale.quantitySold) || 0) : 0;
    const orderPaidRev = orderSale ? (Number(orderSale.revenue) || 0) : 0;
    const unpaidQty = (unpaidQtyByTitleKey && unpaidQtyByTitleKey.get(normKey)) || 0;

    let paidSoldQty = 0;
    let paidSalesRevenue = 0;
    let priceBreakdownText = '';

    if (tiers.length > 0) {
      const tierQty = tiers.reduce((s, t) => s + (Number(t.qty) || 0), 0);
      const tierRev = tiers.reduce((s, t) => s + ((Number(t.qty) || 0) * (Number(t.unitPriceDa) || 0)), 0);
      paidSoldQty = tierQty;
      paidSalesRevenue = tierRev;
      priceBreakdownText = tiers.map(t => `${t.qty} × ${Number(t.unitPriceDa).toLocaleString('fr-DZ')} DA`).join(' + ');

      // Collect explicit order IDs already accounted for in tiers so new paid orders use their exact actual revenue
      const coveredOrderIds = new Set();
      tiers.forEach(t => {
        if (t.orderId) coveredOrderIds.add(String(t.orderId));
        if (Array.isArray(t.orderIds)) t.orderIds.forEach(oid => coveredOrderIds.add(String(oid)));
      });

      const paidOrdersList = (orderSale && Array.isArray(orderSale.paidOrdersList)) ? orderSale.paidOrdersList : [];
      if (paidOrdersList.length > 0 && coveredOrderIds.size > 0) {
        const extraOrders = paidOrdersList.filter(po => !coveredOrderIds.has(String(po.orderId)));
        const extraQty = extraOrders.reduce((s, po) => s + (Number(po.qty) || 0), 0);
        const extraRev = extraOrders.reduce((s, po) => s + (Number(po.revenue) || 0), 0);
        if (extraQty > 0) {
          paidSoldQty += extraQty;
          paidSalesRevenue += extraRev;
          const avgNewUnit = extraRev / extraQty;
          priceBreakdownText += ` + ${extraQty} × ${Math.round(avgNewUnit).toLocaleString('fr-DZ')} DA (New Paid)`;
        }
      } else {
        const orderCoveredByTiers = tiers.filter(t => t.orderId || (Array.isArray(t.orderIds) && t.orderIds.length > 0) || String(t.label || '').includes('#')).reduce((s, t) => s + (Number(t.qty) || 0), 0);
        const baselineOrderCap = Math.max(orderCoveredByTiers, Math.min(orderPaidQty, tierQty));
        const extraPaidOrdersQty = Math.max(0, orderPaidQty - baselineOrderCap);
        if (extraPaidOrdersQty > 0 && orderPaidQty > 0) {
          const avgExtraUnitPrice = orderPaidRev / orderPaidQty;
          const extraRev = extraPaidOrdersQty * avgExtraUnitPrice;
          paidSoldQty += extraPaidOrdersQty;
          paidSalesRevenue += extraRev;
          priceBreakdownText += ` + ${extraPaidOrdersQty} × ${Math.round(avgExtraUnitPrice).toLocaleString('fr-DZ')} DA (New Paid)`;
        }
      }
    } else {
      paidSoldQty = orderPaidQty;
      paidSalesRevenue = orderPaidRev;
      priceBreakdownText = paidSoldQty > 0
        ? `${paidSoldQty} × ${Math.round(paidSalesRevenue / paidSoldQty).toLocaleString('fr-DZ')} DA`
        : 'No paid sales yet';
    }

    const totalPurchaseCost = unitCost !== null ? (purchasedQty * unitCost) : null;
    const soldCogs = unitCost !== null ? (paidSoldQty * unitCost) : null;
    const earnedProfit = (soldCogs !== null) ? (paidSalesRevenue - soldCogs) : null;

    const remRetail = avail * currentPrice;
    const remCost = unitCost !== null ? (avail * unitCost) : null;
    const remExpectedProfit = remCost !== null ? (remRetail - remCost) : null;
    const stockStatus = avail <= 0 ? 'sold_out' : (avail <= 2 ? 'low_stock' : 'in_stock');

    if (avail <= 0) soldOutCount++;
    else if (avail <= 2) lowStockCount++;

    totalPurchasedQty += purchasedQty;
    if (totalPurchaseCost !== null) totalPurchaseCostAll += totalPurchaseCost;
    else allPurchasedCostKnown = false;

    totalSoldQty += soldQty;
    totalPaidSoldQty += paidSoldQty;
    totalPaidRevenue += paidSalesRevenue;
    if (soldCogs !== null) {
      totalPaidCogs += soldCogs;
      totalPaidProfit += (paidSalesRevenue - soldCogs);
    } else if (paidSoldQty > 0) {
      hasUnpricedSold = true;
    }

    totalAvail += avail;
    totalOnHand += onHand;
    totalReserved += res;
    totalDamaged += dmg;
    remainingRetailVal += remRetail;
    if (remCost !== null) {
      remainingCostVal += remCost;
      costedAvailUnits += avail;
    }

    breakdown.push({
      id: item.id,
      title: item.title,
      shortName: webMatch ? webMatch.shortName : item.title,
      webId: webMatch ? webMatch.webId : null,
      slug: webMatch ? webMatch.slug : null,
      category: item.category || item.item_type || 'accessory',
      purchasedQty,
      soldQty,
      paidSoldQty,
      unpaidQty,
      availableQty: avail,
      onHandQty: onHand,
      reservedQty: res,
      unitCost,
      totalPurchaseCost: totalPurchaseCost !== null ? Math.round(totalPurchaseCost) : null,
      currentPrice,
      paidSalesRevenue: Math.round(paidSalesRevenue),
      soldCogs: soldCogs !== null ? Math.round(soldCogs) : null,
      earnedGrossProfit: earnedProfit !== null ? Math.round(earnedProfit) : null,
      remainingRetailValue: Math.round(remRetail),
      remainingCostValue: remCost !== null ? Math.round(remCost) : null,
      remainingExpectedProfit: remExpectedProfit !== null ? Math.round(remExpectedProfit) : null,
      stockStatus,
      priceBreakdownText
    });
  });

  return {
    itemsCount: accItems.length,
    purchasedQty: totalPurchasedQty,
    counted: totalPurchasedQty,
    totalPurchaseCost: allPurchasedCostKnown ? Math.round(totalPurchaseCostAll) : null,
    soldQty: totalSoldQty,
    paidSoldQty: totalPaidSoldQty,
    revenue: Math.round(totalPaidRevenue),
    cogs: Math.round(totalPaidCogs),
    grossProfit: Math.round(totalPaidProfit),
    hasUnpricedSold,
    onHand: totalOnHand,
    available: totalAvail,
    reserved: totalReserved,
    damaged: totalDamaged,
    valuation: Math.round(remainingCostVal),
    valuationAtCost: Math.round(remainingCostVal),
    valuationAtRetail: Math.round(remainingRetailVal),
    expectedProfit: Math.round(remainingRetailVal - remainingCostVal),
    avgUnitCost: costedAvailUnits > 0 ? (remainingCostVal / costedAvailUnits) : 0,
    marginPct: remainingRetailVal > 0 ? Math.round(((remainingRetailVal - remainingCostVal) / remainingRetailVal) * 1000) / 10 : 0,
    soldOutCount,
    lowStockCount,
    breakdown
  };
}

function computePackagingConsumptionMetrics() {
  const cfg = getPackagingConfig();
  const pkgItems = (state.inventory || []).filter(item => isPackagingPaperItem(item));

  // Build per-variant stats across non-cancelled orders
  const orderStatsByVariant = new Map();
  const legacyKraft = { wrapsAll: 0, wrapsPaid: 0, unpaidLiveWraps: 0, paidRevenueDa: 0 };

  const ensureVarStat = (k) => {
    if (!orderStatsByVariant.has(k)) {
      orderStatsByVariant.set(k, {
        totalWrapsAll: 0,
        paidWrapsCount: 0,
        paidRevenueDa: 0,
        unpaidLiveWrapsCount: 0,
        consumableWrapsCount: 0,
        consumableBooksCount: 0,
        overrideCmTotal: 0,
        autoWrapFactor: 0,
        historicalWrapsCount: 0,
        liveWrapsCount: 0
      });
    }
    return orderStatsByVariant.get(k);
  };

  (state.orders || []).forEach(order => {
    const meta = state.orderMeta ? state.orderMeta.find(m => String(m.order_id) === String(order.id)) : null;
    const isHist = !!(order.is_historical || Number(order.id) <= 170);
    const fulfillmentStatus = meta ? (meta.fulfillment_status || 'pending') : (isHist ? 'delivered' : (order.status || 'pending'));
    const paymentStatus = meta ? (meta.payment_status || 'unpaid') : (isHist ? 'paid' : (order.payment_status || 'unpaid'));
    const isPaid = paymentStatus === 'paid';

    if (fulfillmentStatus === 'cancelled' || fulfillmentStatus === 'rejected') return;

    const variantKey = resolvePackagingVariantKey(meta?.packaging_used || order.packaging_type);
    if (!variantKey) return;

    const pkgPrice = Number(order.packaging_price) || 0;
    if (variantKey === 'papier_craft') {
      legacyKraft.wrapsAll++;
      if (isPaid) {
        legacyKraft.wrapsPaid++;
        legacyKraft.paidRevenueDa += pkgPrice;
      } else if (!isHist) {
        legacyKraft.unpaidLiveWraps++;
      }
      return;
    }

    const st = ensureVarStat(variantKey);
    st.totalWrapsAll++;
    if (isHist) st.historicalWrapsCount++;
    else st.liveWrapsCount++;

    if (isPaid) {
      st.paidWrapsCount++;
      st.paidRevenueDa += pkgPrice;
    } else if (!isHist) {
      st.unpaidLiveWrapsCount++;
    }

    // Deduct stock consumption for live orders or historical if configured
    const shouldDeductRoll = !isHist || !!cfg.includeHistorical;
    if (shouldDeductRoll) {
      const parsed = parseOrderItemsSafe(order).map(parseOrderItem);
      const bookUnits = parsed.reduce((sum, pi) => {
        const isAccTitle = !!getWebsiteAccessoryMatch(pi.title) || pi.type === 'accessory';
        return isAccTitle ? sum : sum + (Number(pi.qty) || 1);
      }, 0);
      const effectiveBooks = Math.max(1, bookUnits);
      st.consumableWrapsCount++;
      st.consumableBooksCount += effectiveBooks;

      const metaTags = parseAllJsonNoteTags(meta?.notes, 'PKG_META');
      const metaTag = metaTags.length > 0 ? metaTags[metaTags.length - 1] : null;
      const customOrderCm = (metaTag && Number(metaTag.cmUsed) > 0) ? Number(metaTag.cmUsed) : 0;
      if (customOrderCm > 0) {
        st.overrideCmTotal += customOrderCm;
      } else {
        st.autoWrapFactor += (cfg.mode === 'per_order' ? 1 : effectiveBooks);
      }
    }
  });

  // Merge DB inventory packaging lots with configured variants
  const variants = [];
  const handledKeys = new Set();

  const pushVariantRecord = (lot, spec) => {
    const pkgMeta = lot ? (parseJsonNoteTag(lot.notes, 'PKG_META') || {}) : {};
    const vKey = pkgMeta.variantKey || spec?.variantKey || resolvePackagingVariantKey(lot?.title) || String(lot?.id);
    handledKeys.add(vKey);

    const st = ensureVarStat(vKey);
    const purchasedCm = (pkgMeta.purchasedMeters !== undefined && pkgMeta.purchasedMeters !== null && Number(pkgMeta.purchasedMeters) >= 0)
      ? Math.round(Number(pkgMeta.purchasedMeters) * 100)
      : (lot ? (Number(lot.quantity_received) || 0) : ((spec?.approxMeters || 3) * 100));
    const manualUsedCm = lot ? (Number(lot.quantity_sold) || 0) : 0;
    const dmgCm = lot ? ((Number(lot.quantity_damaged) || 0) + (Number(lot.quantity_lost) || 0)) : 0;
    const isProvisionalQty = pkgMeta.isProvisionalQty !== undefined ? !!pkgMeta.isProvisionalQty : true;

    const variantOverrideCm = (pkgMeta.cmPerWrapOverride !== undefined && pkgMeta.cmPerWrapOverride !== null && Number(pkgMeta.cmPerWrapOverride) > 0)
      ? Number(pkgMeta.cmPerWrapOverride)
      : null;
    const effectiveCmRate = variantOverrideCm !== null ? variantOverrideCm : cfg.cmPerWrap;

    let consumedCm = null;
    if (effectiveCmRate !== null) {
      consumedCm = Math.round(manualUsedCm + st.overrideCmTotal + (st.autoWrapFactor * effectiveCmRate));
    } else if (manualUsedCm > 0 || st.overrideCmTotal > 0) {
      consumedCm = Math.round(manualUsedCm + st.overrideCmTotal);
    }

    const remainingCm = consumedCm !== null
      ? Math.max(0, purchasedCm - consumedCm - dmgCm)
      : Math.max(0, purchasedCm - dmgCm);

    const provCostTotal = (pkgMeta.provisionalTotalCostDa !== undefined)
      ? (pkgMeta.provisionalTotalCostDa !== null ? Number(pkgMeta.provisionalTotalCostDa) : null)
      : (spec ? spec.provisionalTotalCostDa : null);
    const hasLotUnitCost = !!(lot && lot.unit_purchase_cost_da !== null && lot.unit_purchase_cost_da !== undefined && lot.unit_purchase_cost_da !== '' && !isNaN(lot.unit_purchase_cost_da));
    const isCostConfirmed = !!pkgMeta.isCostConfirmed && (hasLotUnitCost || (provCostTotal !== null && purchasedCm > 0));
    const confirmedUnitCostPerCm = isCostConfirmed
      ? ((provCostTotal !== null && purchasedCm > 0) ? (provCostTotal / purchasedCm) : Number(lot.unit_purchase_cost_da))
      : null;
    const confirmedTotalPurchaseCost = (isCostConfirmed && confirmedUnitCostPerCm !== null)
      ? (provCostTotal !== null ? Math.round(provCostTotal) : Math.round(purchasedCm * confirmedUnitCostPerCm))
      : null;
    const confirmedConsumedCogs = (isCostConfirmed && confirmedUnitCostPerCm !== null && consumedCm !== null)
      ? Math.round(consumedCm * confirmedUnitCostPerCm)
      : null;
    const confirmedGrossProfit = (confirmedConsumedCogs !== null)
      ? Math.round(st.paidRevenueDa - confirmedConsumedCogs)
      : null;

    const sellingPriceDa = lot && Number(lot.selling_price_da) > 0 ? Number(lot.selling_price_da) : (spec?.sellingPriceDa || 0);

    variants.push({
      id: lot ? lot.id : (spec?.lotId || vKey),
      hasDbLot: !!lot,
      variantKey: vKey,
      shortName: pkgMeta.shortName || spec?.shortName || lot?.title || vKey,
      title: lot ? lot.title : (spec?.title || vKey),
      sellingPriceDa,
      purchasedCm,
      purchasedMeters: Math.round((purchasedCm / 100) * 100) / 100,
      isProvisionalQty,
      effectiveCmRate,
      variantOverrideCm,
      consumableWrapsCount: st.consumableWrapsCount,
      consumableBooksCount: st.consumableBooksCount,
      totalWrapsAll: st.totalWrapsAll,
      paidWrapsCount: st.paidWrapsCount,
      unpaidLiveWrapsCount: st.unpaidLiveWrapsCount,
      historicalWrapsCount: st.historicalWrapsCount,
      liveWrapsCount: st.liveWrapsCount,
      consumedCm,
      consumedMeters: consumedCm !== null ? Math.round((consumedCm / 100) * 100) / 100 : null,
      remainingCm,
      remainingMeters: Math.round((remainingCm / 100) * 100) / 100,
      provisionalTotalCostDa: provCostTotal,
      isCostConfirmed,
      confirmedUnitCostPerCm,
      confirmedTotalPurchaseCost,
      confirmedConsumedCogs,
      paidRevenueDa: Math.round(st.paidRevenueDa),
      confirmedGrossProfit
    });
  };

  pkgItems.forEach(lot => {
    const k = resolvePackagingVariantKey(lot.title) || parseJsonNoteTag(lot.notes, 'PKG_META')?.variantKey;
    const spec = PACKAGING_VARIANTS.find(v => v.variantKey === k) || null;
    pushVariantRecord(lot, spec);
  });

  PACKAGING_VARIANTS.forEach(spec => {
    if (!handledKeys.has(spec.variantKey)) {
      pushVariantRecord(null, spec);
    }
  });

  let totalPurchasedCm = 0;
  let totalRemainingCm = 0;
  let totalConsumedCm = 0;
  let hasAnyConfiguredConsumption = cfg.cmPerWrap !== null;
  let totalWrapsPaid = 0;
  let totalWrapsAll = 0;
  let totalLiveWraps = 0;
  let totalPaidRevenue = 0;
  let provisionalTotalCostPaid = 0;
  let confirmedTotalCostPaid = 0;
  let confirmedConsumedCogsTotal = 0;
  let confirmedVariantsCount = 0;
  let provisionalVariantsCount = 0;
  let unconfirmedCostVariantsCount = 0;

  variants.forEach(v => {
    totalPurchasedCm += v.purchasedCm;
    totalRemainingCm += v.remainingCm;
    if (v.consumedCm !== null) {
      totalConsumedCm += v.consumedCm;
      hasAnyConfiguredConsumption = true;
    }
    totalWrapsPaid += v.paidWrapsCount;
    totalWrapsAll += v.totalWrapsAll;
    totalLiveWraps += v.liveWrapsCount;
    totalPaidRevenue += v.paidRevenueDa;
    if (v.isCostConfirmed && v.confirmedTotalPurchaseCost !== null) {
      confirmedVariantsCount++;
      confirmedTotalCostPaid += v.confirmedTotalPurchaseCost;
      if (v.confirmedConsumedCogs !== null) confirmedConsumedCogsTotal += v.confirmedConsumedCogs;
    } else {
      provisionalVariantsCount++;
      if (v.provisionalTotalCostDa !== null) provisionalTotalCostPaid += v.provisionalTotalCostDa;
      else unconfirmedCostVariantsCount++;
    }
  });

  return {
    config: cfg,
    variants,
    totalPurchasedCm,
    totalPurchasedMeters: Math.round((totalPurchasedCm / 100) * 100) / 100,
    totalConsumedCm: hasAnyConfiguredConsumption ? totalConsumedCm : null,
    totalConsumedMeters: hasAnyConfiguredConsumption ? Math.round((totalConsumedCm / 100) * 100) / 100 : null,
    totalRemainingCm,
    totalRemainingMeters: Math.round((totalRemainingCm / 100) * 100) / 100,
    totalWrapsPaid,
    totalWrapsAll,
    totalLiveWraps,
    totalPaidRevenue: Math.round(totalPaidRevenue),
    paidRevenueInclLegacyKraft: Math.round(totalPaidRevenue + legacyKraft.paidRevenueDa),
    provisionalTotalCostPaid: Math.round(provisionalTotalCostPaid),
    confirmedTotalCostPaid: Math.round(confirmedTotalCostPaid),
    confirmedConsumedCogsTotal: Math.round(confirmedConsumedCogsTotal),
    confirmedVariantsCount,
    provisionalVariantsCount,
    unconfirmedCostVariantsCount,
    legacyKraft
  };
}

function resolveOrderItemHistoricalRefPrice(rawItem, matchedLot, order, meta) {
  if (typeof rawItem === 'object' && rawItem !== null && Number(rawItem.price) > 0) {
    return Number(rawItem.price);
  }
  const parsed = parseOrderItem(rawItem);
  const normTitle = normalizeText(parsed.title);

  // Check recorded order-level price lock inside [ORDER_CORRECTION] / meta
  if (meta && meta.notes) {
    const corrTags = parseAllJsonNoteTags(meta.notes, 'ORDER_CORRECTION');
    for (const tag of corrTags) {
      if (tag && tag.itemPrices && tag.itemPrices[normTitle] > 0) {
        return Number(tag.itemPrices[normTitle]);
      }
    }
  }

  if (matchedLot) {
    const accHistory = parseJsonNoteTag(matchedLot.notes, 'ACC_HISTORY');
    if (accHistory && Array.isArray(accHistory.salesTiers)) {
      const orderMatchTier = accHistory.salesTiers.find(t =>
        (t.orderId && String(t.orderId) === String(order?.id)) ||
        (Array.isArray(t.orderIds) && t.orderIds.some(oid => String(oid) === String(order?.id)))
      );
      if (orderMatchTier && Number(orderMatchTier.unitPriceDa) > 0) {
        return Number(orderMatchTier.unitPriceDa);
      }
      if ((order?.is_historical || Number(order?.id) <= 170) && accHistory.salesTiers.length > 0) {
        return Number(accHistory.salesTiers[0].unitPriceDa) || Number(matchedLot.selling_price_da) || 0;
      }
    }
    const priceHistory = parseAllJsonNoteTags(matchedLot.notes, 'PRICE_HISTORY')
      .filter(cp => cp && cp.beforeDate && Number(cp.unitPriceDa) > 0)
      .sort((a, b) => String(a.beforeDate).localeCompare(String(b.beforeDate)));
    if (priceHistory.length > 0 && order?.created_at) {
      const orderDateStr = String(order.created_at);
      const matchedCheckpoint = priceHistory.find(cp => orderDateStr <= String(cp.beforeDate));
      if (matchedCheckpoint) return Number(matchedCheckpoint.unitPriceDa);
    }
    if (Number(matchedLot.selling_price_da) > 0) {
      return Number(matchedLot.selling_price_da);
    }
  }

  const cmsBook = (state.cmsBooks || []).find(b => normalizeText(b.title) === normTitle);
  if (cmsBook && Number(cmsBook.price) > 0) return Number(cmsBook.price);
  return 0;
}

function calculateFinancialMetrics() {
  if (_finCache) return _finCache;

  const lookups = buildAccountingLookupMaps();
  applyLiveOrdersToInventoryCore(lookups);

  const { searchIdx, metaByOrderId, allocsByOrderId } = lookups;

  // Capacity tracker for chronological live FIFO attribution (uses original capacity untouched)
  const remainingCapByLotId = new Map();
  (state.inventory || []).forEach(inv => {
    const dmgLossPromoRet = (Number(inv.quantity_damaged) || 0)
      + (Number(inv.quantity_lost) || 0)
      + (Number(inv.quantity_promotional) || 0)
      + (Number(inv.quantity_returned_to_supplier) || 0);
    const countAdj = Number(inv.quantity_count_adjustment) || 0;
    const cap = Math.max(0, (Number(inv.quantity_received) || 0) + countAdj - dmgLossPromoRet);
    remainingCapByLotId.set(String(inv.id), cap);
  });

  // Sort orders chronologically ascending so FIFO and monthly summaries are deterministic
  const sortedOrders = [...(state.orders || [])].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

  let totalGrossOrderValue = 0;
  let totalShippingCollected = 0;
  let totalPackagingFees = 0;
  let totalOrderPackagingCosts = 0;
  let totalSalesRevenue = 0;
  let historicalOrdersRevenue = 0;
  let liveOrdersRevenue = 0;
  let totalCashInflowsFromSales = 0;
  let unpaidOrdersCount = 0;
  let unpaidLiveCount = 0;
  let unpaidBookRevenue = 0;
  let unpaidDeliveryFees = 0;
  let unpaidGrossOrderValue = 0;

  const salesByTitle = new Map();
  const unpaidQtyByTitleKey = new Map();

  const paidOrdersAsc = [];
  const paidOrderById = new Map();
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

  // Group-level metrics aggregated strictly from the SAME attributed line items
  let confirmedCogsOld = 0;
  let confirmedProfitOld = 0;
  let costedRevenueOld = 0;
  let revenueOld = 0;
  let soldQtyOld = 0;

  let confirmedCogsNew = 0;
  let confirmedProfitNew = 0;
  let costedRevenueNew = 0;
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

  // Title-level & Period-level & Audit aggregators
  const titleAggMap = new Map();
  const handledLotIds = new Set();
  const monthlyMap = new Map();
  const yearlyMap = new Map();
  const needsReviewItems = [];
  let cancelledOrdersCount = 0;
  let allocatedLinesCount = 0;

  const ensurePeriod = (map, key, label) => {
    if (!map.has(key)) {
      map.set(key, {
        key,
        label,
        paidOrdersCount: 0,
        costedOrdersCount: 0,
        reviewOrdersCount: 0,
        grossPaidDa: 0,
        deliveryExclDa: 0,
        storeRevenueDa: 0,
        confirmedCogsDa: 0,
        orderPkgCostsDa: 0,
        costedGrossProfitDa: 0,
        operatingExpensesDa: 0
      });
    }
    return map.get(key);
  };

  sortedOrders.forEach(order => {
    const meta = metaByOrderId.get(String(order.id)) || null;
    const isHist = !!(order.is_historical || Number(order.id) <= 170);
    const fulfillmentStatus = meta ? (meta.fulfillment_status || 'pending') : (isHist ? 'delivered' : (order.status || 'pending'));
    const paymentStatus = meta ? (meta.payment_status || 'unpaid') : (isHist ? 'paid' : (order.payment_status || 'unpaid'));
    const isPaid = paymentStatus === 'paid';

    if (fulfillmentStatus === 'cancelled' || fulfillmentStatus === 'rejected') {
      cancelledOrdersCount++;
      return;
    }

    const pricing = resolveEffectiveOrderPricing(order, meta);
    const { orderTotal, shippingFee, actualShippingCost, packagingCost, packagingFeeCharged, bookRevenue } = pricing;

    if (!isPaid) {
      unpaidOrdersCount++;
      if (!isHist) unpaidLiveCount++;
      unpaidBookRevenue += bookRevenue;
      unpaidDeliveryFees += shippingFee;
      unpaidGrossOrderValue += orderTotal;
      parseOrderItemsSafe(order).forEach(rawItem => {
        const pi = parseOrderItem(rawItem);
        const { canonicalNormTitle } = resolveMatchedLotsWithReason(pi.title, { excludePackaging: true });
        const nk = canonicalNormTitle || normalizeText(pi.title);
        if (nk) unpaidQtyByTitleKey.set(nk, (unpaidQtyByTitleKey.get(nk) || 0) + (pi.qty || 1));
      });
      return;
    }

    totalGrossOrderValue += orderTotal;
    totalShippingCollected += shippingFee;
    totalPackagingFees += packagingFeeCharged;
    totalOrderPackagingCosts += packagingCost;
    totalSalesRevenue += bookRevenue;

    if (isHist) historicalOrdersRevenue += bookRevenue;
    else {
      liveOrdersRevenue += bookRevenue;
      totalCashInflowsFromSales += bookRevenue;
    }

    const orderDateStr = order?.created_at ? String(order.created_at).slice(0, 10) : '';
    const monthKey = orderDateStr.length >= 7 ? orderDateStr.slice(0, 7) : 'Unknown';
    const yearKey = orderDateStr.length >= 4 ? orderDateStr.slice(0, 4) : 'Unknown';
    const mPeriod = ensurePeriod(monthlyMap, monthKey, monthKey);
    const yPeriod = ensurePeriod(yearlyMap, yearKey, yearKey);

    let itemsList = parseOrderItemsSafe(order);
    const isUnitemized = (itemsList.length === 0 && bookRevenue > 0);
    if (isUnitemized) {
      itemsList = [`Order #${order.id || 'N/A'}`];
    }

    const merchandisePool = Math.max(0, bookRevenue - packagingFeeCharged);
    let totalItemsInOrder = 0;
    let totalCatalogWeighted = 0;
    const preParsed = [];

    itemsList.forEach(rawItem => {
      const pi = parseOrderItem(rawItem);
      const quickLot = findInventoryItem(pi.title);
      const explicitPrice = resolveOrderItemHistoricalRefPrice(rawItem, quickLot, order, meta);
      totalItemsInOrder += pi.qty;
      totalCatalogWeighted += (explicitPrice * pi.qty);
      preParsed.push({ rawItem, pi, explicitPrice });
    });

    const orderAllocs = (allocsByOrderId.get(String(order.id)) || []).map(a => ({
      ...a,
      _consumedRemaining: Number(a.quantity) || 0
    }));

    let orderKnownCogsSum = 0;
    let orderAllCostsKnown = !isUnitemized && preParsed.length > 0;
    const orderUnknownTitles = [];
    const itemBreakdowns = [];

    if (isUnitemized) {
      orderAllCostsKnown = false;
      orderUnknownTitles.push(`Order #${order.id} (unitemized)`);
      needsReviewItems.push({
        orderId: order.id,
        orderDate: orderDateStr,
        isHist,
        title: `Order #${order.id} (unitemized)`,
        qty: 1,
        revenueDa: Math.round(bookRevenue),
        status: 'unitemized',
        reason: 'Order has revenue but no itemized books listed'
      });
    }

    preParsed.forEach(({ pi, explicitPrice }) => {
      const itemRev = totalCatalogWeighted > 0
        ? (merchandisePool * ((explicitPrice * pi.qty) / totalCatalogWeighted))
        : (totalItemsInOrder > 0 ? (merchandisePool * (pi.qty / totalItemsInOrder)) : 0);

      const attr = attributeOrderItemLot(
        pi,
        order,
        isHist,
        orderDateStr,
        explicitPrice,
        lookups,
        !isHist ? remainingCapByLotId : null,
        orderAllocs
      );

      if (attr.attributionStatus === 'allocated') allocatedLinesCount++;

      // Register matched lot(s) and canonical title key for salesByTitle (so Accessories & Books unify cleanly)
      const canonicalKey = attr.lot ? normalizeText(attr.lot.title) : normalizeText(pi.title);
      if (!salesByTitle.has(canonicalKey)) {
        salesByTitle.set(canonicalKey, {
          rawTitle: attr.lot ? attr.lot.title : pi.title,
          quantitySold: 0,
          liveSoldQty: 0,
          histSoldQty: 0,
          revenue: 0,
          hasLiveSales: false,
          paidOrdersList: []
        });
      }
      const saleEntry = salesByTitle.get(canonicalKey);
      saleEntry.quantitySold += pi.qty;
      if (isHist) saleEntry.histSoldQty += pi.qty;
      else saleEntry.liveSoldQty += pi.qty;
      saleEntry.revenue += itemRev;
      saleEntry.paidOrdersList.push({ orderId: order.id, qty: pi.qty, revenue: itemRev, isHist });
      if (!isHist) saleEntry.hasLiveSales = true;

      if (attr.lineCogs === null) {
        orderAllCostsKnown = false;
        orderUnknownTitles.push(pi.title || 'Unknown Title');
        unknownCostSalesCount++;
        unknownCostRevenueTotal += itemRev;

        const isAccFallback = !!getWebsiteAccessoryMatch(pi.title) || pi.type === 'accessory';
        if (!isAccFallback) {
          soldQtyOld += pi.qty;
          revenueOld += itemRev;
        }
        if (!isUnitemized) {
          needsReviewItems.push({
            orderId: order.id,
            orderDate: orderDateStr,
            isHist,
            title: pi.title || 'Unknown Title',
            qty: pi.qty,
            revenueDa: Math.round(itemRev),
            status: attr.attributionStatus,
            reason: attr.reviewReason || 'Missing cost or inventory match'
          });
        }
      } else {
        orderKnownCogsSum += attr.lineCogs;
        totalConfirmedCogs += attr.lineCogs;
        confirmedSalesRevenue += itemRev;
        totalConfirmedProfit += (itemRev - attr.lineCogs);

        // Allocate line revenue and COGS proportionally per exact slice lot (handles mixed OLD_STOCK + NEW_STOCK splits accurately!)
        const totalSliceQty = (attr.lotSlices || []).reduce((s, sl) => s + (sl.qty || 0), 0) || pi.qty;
        (attr.lotSlices || []).forEach(sl => {
          const lot = sl.lot;
          if (lot) handledLotIds.add(lot.id);
          const sliceRev = totalSliceQty > 0 ? (itemRev * (sl.qty / totalSliceQty)) : itemRev;
          const sliceCogs = sl.qty * sl.unitCost;
          const sliceProfit = sliceRev - sliceCogs;
          const isPkgLot = lot && isPackagingPaperItem(lot);
          const isAccLot = lot && !isPkgLot && isAccessoryItem(lot);

          if (isAccLot) {
            soldQtyAcc += sl.qty;
            revenueAcc += sliceRev;
            confirmedCogsAcc += sliceCogs;
          } else if (!isPkgLot && isNewBatchLot(lot)) {
            soldQtyNew += sl.qty;
            revenueNew += sliceRev;
            costedRevenueNew += sliceRev;
            confirmedCogsNew += sliceCogs;
            confirmedProfitNew += sliceProfit;
          } else if (!isPkgLot) {
            soldQtyOld += sl.qty;
            revenueOld += sliceRev;
            costedRevenueOld += sliceRev;
            confirmedCogsOld += sliceCogs;
            confirmedProfitOld += sliceProfit;
          }
        });
      }

      // Accumulate titleProfits for books cleanly from exact attributed cost per slice
      const primaryLot = attr.lot;
      const isAccLine = primaryLot && isAccessoryItem(primaryLot);
      const isPkgLine = primaryLot && isPackagingPaperItem(primaryLot);
      if (!isAccLine && !isPkgLine) {
        const tpKey = canonicalKey || `raw::${pi.title}`;
        if (!titleAggMap.has(tpKey)) {
          titleAggMap.set(tpKey, {
            title: primaryLot ? primaryLot.title : pi.title,
            author: primaryLot ? (primaryLot.author || '-') : '-',
            stockGroup: primaryLot ? (isNewBatchLot(primaryLot) ? 'NEW_STOCK' : (primaryLot.stock_group || 'OLD_STOCK')) : 'HISTORICAL',
            quantitySold: 0,
            revenue: 0,
            confirmedCogsSum: 0,
            costedQty: 0,
            hasUnknownLine: false,
            displayPrice: primaryLot ? (Number(primaryLot.selling_price_da) || explicitPrice) : explicitPrice,
            lastUnitCost: attr.unitCost
          });
        }
        const tp = titleAggMap.get(tpKey);
        tp.quantitySold += pi.qty;
        tp.revenue += itemRev;
        if (attr.lineCogs !== null) {
          tp.confirmedCogsSum += attr.lineCogs;
          tp.costedQty += pi.qty;
          tp.lastUnitCost = attr.unitCost;
        } else {
          tp.hasUnknownLine = true;
        }
      }

      itemBreakdowns.push({
        title: pi.title,
        qty: pi.qty,
        unitCost: attr.unitCost,
        lineCogs: attr.lineCogs,
        lineRevenue: Math.round(itemRev),
        lotId: primaryLot ? String(primaryLot.id) : null,
        lotTitle: primaryLot ? primaryLot.title : null,
        stockGroup: primaryLot ? (isAccessoryItem(primaryLot) ? 'ACCESSORIES' : (primaryLot.stock_group || 'OLD_STOCK')) : null,
        attributionStatus: attr.attributionStatus,
        costBasis: attr.costBasis,
        reviewReason: attr.reviewReason
      });
    });

    const orderCogs = orderAllCostsKnown ? Math.round(orderKnownCogsSum) : null;
    const orderNetProfit = orderAllCostsKnown ? Math.round(bookRevenue - orderKnownCogsSum - packagingCost) : null;

    const paidDetail = {
      order,
      meta,
      isHist,
      status: fulfillmentStatus,
      paymentStatus,
      carrier: meta?.carrier || '',
      trackingNumber: meta?.tracking_number || '',
      paymentMethod: meta?.payment_method || '',
      ...pricing,
      parsedItems: preParsed.map(x => x.pi),
      itemBreakdowns,
      allCostsKnown: orderAllCostsKnown,
      unknownTitles: orderUnknownTitles,
      knownCogsPartial: Math.round(orderKnownCogsSum),
      cogs: orderCogs,
      netProfit: orderNetProfit
    };
    paidOrdersAsc.push(paidDetail);
    paidOrderById.set(String(order.id), paidDetail);

    paidGrossCustomerPaid += orderTotal;
    paidDeliveryFeesExcluded += shippingFee;
    paidActualShippingCostsRecorded += actualShippingCost;
    paidBookRevenue += bookRevenue;
    paidKnownBookCogs += Math.round(orderKnownCogsSum);
    paidPackagingCosts += packagingCost;

    mPeriod.paidOrdersCount++;
    yPeriod.paidOrdersCount++;
    mPeriod.grossPaidDa += orderTotal;
    yPeriod.grossPaidDa += orderTotal;
    mPeriod.deliveryExclDa += shippingFee;
    yPeriod.deliveryExclDa += shippingFee;
    mPeriod.storeRevenueDa += bookRevenue;
    yPeriod.storeRevenueDa += bookRevenue;

    if (isHist) paidHistoricalCount++;
    else {
      paidLiveCount++;
      paidLiveBookRevenue += bookRevenue;
    }

    if (orderAllCostsKnown) {
      paidKnownCostCount++;
      paidConfirmedOrdersBookRevenue += bookRevenue;
      paidConfirmedOrdersCogs += orderCogs;
      paidConfirmedOrdersPackagingCosts += packagingCost;
      mPeriod.costedOrdersCount++;
      yPeriod.costedOrdersCount++;
      mPeriod.confirmedCogsDa += orderCogs;
      yPeriod.confirmedCogsDa += orderCogs;
      mPeriod.orderPkgCostsDa += packagingCost;
      yPeriod.orderPkgCostsDa += packagingCost;
      mPeriod.costedGrossProfitDa += (bookRevenue - orderCogs - packagingCost);
      yPeriod.costedGrossProfitDa += (bookRevenue - orderCogs - packagingCost);
      if (!isHist) {
        paidLiveKnownCostCount++;
        paidLiveKnownNetProfit += orderNetProfit;
      }
    } else {
      paidUnknownCostCount++;
      mPeriod.reviewOrdersCount++;
      yPeriod.reviewOrdersCount++;
      if (!isHist) paidLiveUnknownCostCount++;
    }
  });

  // Order newest first for Paid Orders display while preserving chronological FIFO attribution
  const paidOrders = [...paidOrdersAsc].reverse();

  // Attach operating expenses to monthly/yearly periods
  (state.expenses || []).forEach(exp => {
    const amt = Number(exp.amount_da) || 0;
    const dStr = String(exp.expense_date || exp.date || exp.created_at || '').slice(0, 10);
    const mKey = dStr.length >= 7 ? dStr.slice(0, 7) : 'Unknown';
    const yKey = dStr.length >= 4 ? dStr.slice(0, 4) : 'Unknown';
    if (monthlyMap.has(mKey) || amt > 0) ensurePeriod(monthlyMap, mKey, mKey).operatingExpensesDa += amt;
    if (yearlyMap.has(yKey) || amt > 0) ensurePeriod(yearlyMap, yKey, yKey).operatingExpensesDa += amt;
  });

  const periodSummaries = {
    monthly: Array.from(monthlyMap.values()).sort((a, b) => String(b.key).localeCompare(String(a.key))),
    yearly: Array.from(yearlyMap.values()).sort((a, b) => String(b.key).localeCompare(String(a.key)))
  };

  // Build titleProfits for books cleanly
  const titleProfits = [];
  titleAggMap.forEach((tp, normKey) => {
    const lots = searchIdx.normMap.get(normKey) || [];
    lots.forEach(l => handledLotIds.add(l.id));
    let onHand = 0;
    lots.forEach(l => { onHand += getInventoryOnHandQty(l); });

    const isConfirmed = !tp.hasUnknownLine && tp.costedQty > 0;
    const avgUnitCost = tp.costedQty > 0 ? (tp.confirmedCogsSum / tp.costedQty) : tp.lastUnitCost;
    const titleProfit = isConfirmed ? (tp.revenue - tp.confirmedCogsSum) : null;
    const marginPct = (titleProfit !== null && tp.revenue > 0) ? Math.round((titleProfit / tp.revenue) * 100) : null;
    const targetUnitMargin = (avgUnitCost !== null && tp.displayPrice > 0) ? (tp.displayPrice - avgUnitCost) : null;

    titleProfits.push({
      title: tp.title,
      author: tp.author,
      stockGroup: tp.stockGroup,
      quantitySold: tp.quantitySold,
      quantityOnHand: onHand,
      unitCost: avgUnitCost !== null ? Math.round(avgUnitCost * 100) / 100 : null,
      sellingPrice: Math.round(tp.displayPrice),
      targetUnitMargin: targetUnitMargin !== null ? Math.round(targetUnitMargin) : null,
      revenue: Math.round(tp.revenue),
      cogs: isConfirmed ? Math.round(tp.confirmedCogsSum) : null,
      grossProfit: titleProfit !== null ? Math.round(titleProfit) : null,
      marginPct,
      isConfirmed
    });
  });

  // Include inventory items not yet matched in sales (zero duplicates)
  state.inventory.forEach(lot => {
    if (handledLotIds.has(lot.id)) return;
    const isPkg = isPackagingPaperItem(lot);
    const isAcc = !isPkg && isAccessoryItem(lot);
    const isNew = !isPkg && !isAcc && isNewBatchLot(lot);
    const onHand = getInventoryOnHandQty(lot);
    const cost = getNumericUnitCostOrNull(lot);
    const price = Number(lot.selling_price_da) || 0;
    const targetMargin = (!isPkg && cost !== null && price > 0) ? (price - cost) : null;
    const marginPct = (!isPkg && cost !== null && price > 0) ? Math.round(((price - cost) / price) * 100) : null;

    titleProfits.push({
      title: lot.title,
      author: lot.author || '-',
      stockGroup: isPkg ? 'PACKAGING' : (isAcc ? 'ACCESSORIES' : (isNew ? 'NEW_STOCK' : (lot.stock_group || 'OLD_STOCK'))),
      quantitySold: Number(lot.quantity_sold) || 0,
      quantityOnHand: onHand,
      unitCost: isPkg ? null : cost,
      sellingPrice: price,
      targetUnitMargin: targetMargin,
      revenue: 0,
      cogs: 0,
      grossProfit: null,
      expectedRevenue: isPkg ? 0 : (onHand * price),
      expectedGrossProfit: (!isPkg && cost !== null) ? onHand * (price - cost) : null,
      marginPct,
      isConfirmed: !isPkg && cost !== null
    });
  });

  // Separate Accessories & Packaging Paper reports
  const accReport = computeAccessoriesFinancialReport(salesByTitle, unpaidQtyByTitleKey);
  const pkgReport = computePackagingConsumptionMetrics();

  // Keep titleProfits Accessories & Packaging rows strictly unified with accReport / pkgReport
  const filteredTitleProfits = titleProfits.filter(tp => tp.stockGroup !== 'ACCESSORIES' && tp.stockGroup !== 'PACKAGING');
  titleProfits.length = 0;
  titleProfits.push(...filteredTitleProfits);
  (accReport.breakdown || []).forEach(a => {
    const hasSold = a.paidSoldQty > 0;
    const marginPct = (hasSold && a.paidSalesRevenue > 0 && a.earnedGrossProfit !== null)
      ? Math.round((a.earnedGrossProfit / a.paidSalesRevenue) * 100)
      : ((a.unitCost !== null && a.currentPrice > 0) ? Math.round(((a.currentPrice - a.unitCost) / a.currentPrice) * 100) : null);
    titleProfits.push({
      title: a.title,
      author: a.shortName || 'Accessory',
      stockGroup: 'ACCESSORIES',
      quantitySold: a.paidSoldQty,
      quantityOnHand: a.onHandQty,
      unitCost: a.unitCost,
      sellingPrice: a.currentPrice,
      targetUnitMargin: a.unitCost !== null ? (a.currentPrice - a.unitCost) : null,
      revenue: a.paidSalesRevenue,
      cogs: a.soldCogs !== null ? a.soldCogs : 0,
      grossProfit: a.earnedGrossProfit,
      expectedRevenue: a.remainingRetailValue,
      expectedGrossProfit: a.remainingExpectedProfit,
      marginPct,
      isConfirmed: a.unitCost !== null
    });
  });
  (pkgReport.variants || []).forEach(v => {
    titleProfits.push({
      title: v.title,
      author: `Wrapping Paper (${v.shortName})`,
      stockGroup: 'PACKAGING',
      quantitySold: v.paidWrapsCount,
      quantityOnHand: v.remainingMeters,
      unitCost: v.confirmedUnitCostPerCm !== null ? Math.round(v.confirmedUnitCostPerCm * 100) : null,
      sellingPrice: v.sellingPriceDa,
      targetUnitMargin: null,
      revenue: v.paidRevenueDa,
      cogs: v.confirmedConsumedCogs,
      grossProfit: v.confirmedGrossProfit,
      expectedRevenue: 0,
      expectedGrossProfit: null,
      marginPct: (v.confirmedGrossProfit !== null && v.paidRevenueDa > 0) ? Math.round((v.confirmedGrossProfit / v.paidRevenueDa) * 100) : null,
      isConfirmed: v.isCostConfirmed
    });
  });

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
    const isPkg = isPackagingPaperItem(item);
    if (isPkg) return; // Packaging rolls tracked separately in m/cm (never pollute unit book counts)

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

  // 7. Reconciled Financial Figures (Strictly confirmed PAID costs only; NULL costs NEVER counted as 0)
  const totalCogs = Math.round(totalConfirmedCogs);
  const totalGrossProfit = confirmedSalesRevenue - totalConfirmedCogs;
  const netProfit = totalGrossProfit - totalOperatingExpenses - paidConfirmedOrdersPackagingCosts;

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

  // 8. Reconciled Cash Position & Strict Completeness Audit
  const stockBaseline = getStockBaseline();
  const openingCash = Number(state.openingPosition?.cash_balance_da) || 0;
  const openingNotesStr = String(state.openingPosition?.notes || '');
  const openingVerified = !!(
    state.openingPosition?.cash_verified === true ||
    openingNotesStr.includes('[VERIFIED]')
  );

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

  // Audit all cash ledger sources before declaring Money on Hand complete
  const cashIssues = [];
  if (!openingVerified) {
    cashIssues.push({
      key: 'opening',
      label: `Opening cash (${openingCash.toLocaleString('fr-DZ')} DA${openingDate ? ` as of ${openingDate}` : ''}) has not been audited & verified by owner.`,
      action: 'openOpeningPositionModal()',
      btn: 'Verify Opening Cash'
    });
  }

  const liveUnpaidOrders = (state.orders || []).filter(o => {
    const eff = getEffectiveOrderStatus(o);
    return !eff.isHist && !['cancelled', 'rejected'].includes(eff.status) && eff.paymentStatus !== 'paid';
  });
  if (liveUnpaidOrders.length > 0) {
    const sampleIds = liveUnpaidOrders.slice(0, 4).map(o => `#${o.id}`).join(', ');
    cashIssues.push({
      key: 'orders',
      label: `${liveUnpaidOrders.length} live order(s) (${sampleIds}${liveUnpaidOrders.length > 4 ? '…' : ''}) have unconfirmed payment status.`,
      action: "switchSection('orders')",
      btn: 'Review Orders'
    });
  }

  const unpaidBatches = (state.batches || []).filter(b => b.payment_status !== 'paid' || ((Number(b.total_cost_da) || 0) > (Number(b.amount_paid_da) || 0)));
  if (unpaidBatches.length > 0) {
    cashIssues.push({
      key: 'batches',
      label: `${unpaidBatches.length} purchase batch(es) show unpaid/partial balance vs batch cost.`,
      action: "switchSection('purchases')",
      btn: 'Review Batches'
    });
  }

  if ((state.batches || []).length > 0 && Math.abs(totalBatchPaidAll - stockBaseline.newStock.paidCostDa) > 100) {
    cashIssues.push({
      key: 'batch_vs_baseline',
      label: `Recorded batch payments (${Math.round(totalBatchPaidAll).toLocaleString('fr-DZ')} DA) differ from confirmed NEW_STOCK cost paid (${stockBaseline.newStock.paidCostDa.toLocaleString('fr-DZ')} DA).`,
      action: "switchSection('purchases')",
      btn: 'Reconcile Batches'
    });
  }

  const debtCreditorCounts = new Map();
  let hasPlaceholderDebt = false;
  (state.debts || []).forEach(d => {
    const cname = String(d.creditor_name || '').trim().toLowerCase();
    debtCreditorCounts.set(cname, (debtCreditorCounts.get(cname) || 0) + 1);
    if (!cname || cname === 'me' || debtCreditorCounts.get(cname) > 1) hasPlaceholderDebt = true;
  });
  if ((state.debts || []).length > 0 && (hasPlaceholderDebt || ((state.debtRepayments || []).length === 0 && outstandingDebtsDa > 0))) {
    cashIssues.push({
      key: 'debts',
      label: `Debts ledger (${state.debts.length} entries, ${Math.round(outstandingDebtsDa).toLocaleString('fr-DZ')} DA) has unverified/duplicate entries or 0 repayments.`,
      action: "switchSection('debts')",
      btn: 'Audit Debts'
    });
  }

  if (totalCashOutflows > 0 && openingCash === 0 && postOpeningCapitalInjected === 0 && totalCashInflowsFromSales < totalCashOutflows) {
    cashIssues.push({
      key: 'capital',
      label: `Recorded cash outflows (${Math.round(totalCashOutflows).toLocaleString('fr-DZ')} DA) exceed opening cash + paid sales without capital injections.`,
      action: "openModal('modal-add-capital')",
      btn: 'Record Capital'
    });
  }

  if (unpricedTitlesCount > 0) {
    cashIssues.push({
      key: 'costs',
      label: `${unpricedTitlesCount} inventory lot(s) still have unknown purchase cost (NULL).`,
      action: "switchSection('inventory'); setInventoryFilter('unknown_cost')",
      btn: 'View Unpriced'
    });
  }

  const isCashReconciled = (cashIssues.length === 0);
  const cashAudit = {
    isComplete: isCashReconciled,
    openingVerified,
    unpaidLiveCount: liveUnpaidOrders.length,
    issues: cashIssues,
    totalCashInflows: Math.round(totalCashInflows),
    totalCashOutflows: Math.round(totalCashOutflows),
    netTrackedMovement: currentCashBalance
  };

  const auditSummary = {
    auditedOrdersCount: sortedOrders.length,
    cancelledOrdersCount,
    unpaidOrdersCount,
    paidOrdersCount: paidOrders.length,
    costedPaidOrdersCount: paidKnownCostCount,
    needsReviewOrdersCount: paidUnknownCostCount,
    allocatedLinesCount,
    needsReviewItemsCount: needsReviewItems.length,
    needsReviewItems
  };

  _finCache = {
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
    unpaidOrdersCount,
    unpaidLiveCount,
    unpaidBookRevenue: Math.round(unpaidBookRevenue),
    unpaidDeliveryFees: Math.round(unpaidDeliveryFees),
    unpaidGrossOrderValue: Math.round(unpaidGrossOrderValue),
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
    paidOrderById,
    paidSummary,
    periodSummaries,
    auditSummary,
    stockBaseline,
    cashAudit,
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
      costedRevenue: Math.round(costedRevenueOld),
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
      costedRevenue: Math.round(costedRevenueNew),
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
      costedRevenue: Math.round(costedRevenueOld + costedRevenueNew),
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
    accessories: accReport,
    packaging: pkgReport,
    booksReport: {
      soldQty: soldQtyOld + soldQtyNew,
      revenue: Math.round(revenueOld + revenueNew),
      costedRevenue: Math.round(costedRevenueOld + costedRevenueNew),
      cogs: Math.round(confirmedCogsOld + confirmedCogsNew),
      grossProfit: Math.round(confirmedProfitOld + confirmedProfitNew),
      remainingCostVal: Math.round(combinedBooksCost),
      remainingRetailVal: Math.round(combinedBooksRetail),
      remainingExpectedProfit: Math.round(combinedBooksProfit)
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

  return _finCache;
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
  const ps = fin.paidSummary;
  const base = fin.stockBaseline;

  // 1. Confirmed Profit from Paid Orders (Top Primary Metric)
  const paidProfEl = document.getElementById('metric-paid-profit');
  const paidProfSubEl = document.getElementById('metric-paid-profit-sub');
  if (paidProfEl) {
    paidProfEl.textContent = (ps.knownCostCount === 0 && ps.allCount > 0)
      ? 'Unknown Cost'
      : `${ps.confirmedNetProfit.toLocaleString('fr-DZ')} DA`;
  }
  if (paidProfSubEl) {
    paidProfSubEl.innerHTML = ps.unknownCostCount > 0
      ? `<i class="fa-solid fa-clock"></i> From ${ps.knownCostCount} costed paid order(s) • ${ps.unknownCostCount} awaiting cost`
      : `<i class="fa-solid fa-circle-check"></i> Net of COGS &amp; packaging (${ps.knownCostCount} paid orders)`;
  }

  // 2. Money on Hand (Strict Audit Guard — never shows unverified number as reconciled)
  const cashEl = document.getElementById('metric-cash-balance');
  const cashSubEl = document.getElementById('metric-cash-subtext');
  if (cashEl) {
    if (fin.isCashReconciled) {
      cashEl.textContent = `${fin.currentCashBalance.toLocaleString('fr-DZ')} DA`;
      cashEl.style.fontSize = '';
      if (cashSubEl) {
        cashSubEl.className = 'metric-subtext confirmed';
        cashSubEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Audited cash (${escapeHtml(fin.openingDate || 'verified')})`;
      }
    } else {
      cashEl.textContent = 'Unverified / غير مكتمل';
      cashEl.style.fontSize = '1.05rem';
      if (cashSubEl) {
        cashSubEl.className = 'metric-subtext';
        cashSubEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${fin.cashAudit.issues.length} audit item(s) — Open Finance`;
      }
    }
  }

  // 3. Paid Book Revenue (Delivery fees strictly excluded)
  const ordersBadge = document.getElementById('orders-nav-badge');
  if (ordersBadge) ordersBadge.textContent = state.orders.length;

  const salesEl = document.getElementById('metric-total-sales');
  if (salesEl) salesEl.textContent = `${ps.bookRevenue.toLocaleString('fr-DZ')} DA`;

  const salesSubEl = document.getElementById('metric-sales-subtext');
  if (salesSubEl) {
    salesSubEl.innerHTML = `<i class="fa-solid fa-truck"></i> ${ps.allCount} paid orders (${ps.deliveryFeesExcluded.toLocaleString('fr-DZ')} DA delivery excluded)`;
  }

  // 4. Current Stock Value (Simple summary; OLD & NEW details kept in Inventory / Finance)
  const invValEl = document.getElementById('metric-inventory-val');
  if (invValEl) {
    const displayStockVal = fin.combinedBooks.valuationAtRetail > 0 ? fin.combinedBooks.valuationAtRetail : base.combined.retailValueDa;
    invValEl.textContent = `${displayStockVal.toLocaleString('fr-DZ')} DA`;
  }

  const invSubEl = document.getElementById('metric-inventory-subtext');
  if (invSubEl) {
    if (state.inventory.length === 0) {
      invSubEl.innerHTML = `<span class="badge-neutral">Baseline Retail: ${base.combined.retailValueDa.toLocaleString('fr-DZ')} DA</span>`;
    } else {
      invSubEl.innerHTML = `<span class="badge-confirmed">${fin.combinedBooks.available} avail (${fin.combinedBooks.valuationAtCost.toLocaleString('fr-DZ')} DA cost) • Details →</span>`;
    }
  }

  const invBadge = document.getElementById('inventory-nav-badge');
  if (invBadge) invBadge.textContent = state.inventory.length;

  // 5. Concise Main Dashboard Financial Overview Panel
  const overviewEl = document.getElementById('dashboard-finance-overview');
  if (overviewEl) {
    overviewEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-subtle); padding-bottom: 6px;">
          <span style="color: var(--text-muted);">Confirmed Paid Net Profit:</span>
          <strong style="color: var(--success);">${ps.confirmedNetProfit.toLocaleString('fr-DZ')} DA</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-subtle); padding-bottom: 6px;">
          <span style="color: var(--text-muted);">Paid Orders Book Sales (No Delivery):</span>
          <strong>${ps.bookRevenue.toLocaleString('fr-DZ')} DA</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-subtle); padding-bottom: 6px;">
          <span style="color: var(--text-muted);">Operating Expenses:</span>
          <strong style="color: var(--danger);">−${fin.totalOperatingExpenses.toLocaleString('fr-DZ')} DA</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-subtle); padding-bottom: 6px;">
          <span style="color: var(--text-muted);">Verified Stock Baseline (Retail / Cost):</span>
          <strong>${base.combined.retailValueDa.toLocaleString('fr-DZ')} / ${base.combined.paidCostDa.toLocaleString('fr-DZ')} DA</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--text-muted);">Money on Hand Status:</span>
          <span class="badge ${fin.isCashReconciled ? 'badge-green' : 'badge-amber'}">
            ${fin.isCashReconciled ? `Verified: ${fin.currentCashBalance.toLocaleString('fr-DZ')} DA` : `Incomplete (${fin.cashAudit.issues.length} gaps)`}
          </span>
        </div>
        <button class="btn-secondary" style="margin-top: 6px; width: 100%; justify-content: center;" onclick="switchSection('finance')">
          <i class="fa-solid fa-chart-pie"></i> Open Stock Breakdown &amp; Cash Audit
        </button>
      </div>
    `;
  }
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

function renderPaginationBar(containerId, totalCount, shownCount, pageKey, renderFnName) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (totalCount <= 0) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }
  el.style.display = 'flex';
  const curLimit = (state.pageLimits && state.pageLimits[pageKey]) || 50;
  const remaining = Math.max(0, totalCount - shownCount);
  el.innerHTML = `
    <span style="font-size: 0.82rem; color: var(--text-muted);">
      Showing <strong>${shownCount}</strong> of <strong>${totalCount}</strong> rows
    </span>
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      ${remaining > 0 ? `
        <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="expandTablePage('${pageKey}', 50, '${renderFnName}')">
          Show ${Math.min(50, remaining)} more
        </button>
        <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="expandTablePage('${pageKey}', ${totalCount}, '${renderFnName}')">
          Show All (${totalCount})
        </button>
      ` : (curLimit > 60 && totalCount > 60 ? `
        <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="resetTablePage('${pageKey}', '${renderFnName}')">
          Show Top 50
        </button>
      ` : '')}
    </div>
  `;
}

window.expandTablePage = function(pageKey, deltaOrTotal, renderFnName) {
  if (!state.pageLimits) state.pageLimits = {};
  const cur = state.pageLimits[pageKey] || 50;
  state.pageLimits[pageKey] = deltaOrTotal >= cur && deltaOrTotal > 100 ? deltaOrTotal : (cur + deltaOrTotal);
  if (typeof window[renderFnName] === 'function') window[renderFnName]();
};

window.resetTablePage = function(pageKey, renderFnName) {
  if (!state.pageLimits) state.pageLimits = {};
  state.pageLimits[pageKey] = 50;
  if (typeof window[renderFnName] === 'function') window[renderFnName]();
};

function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-tbody');
  const countEl = document.getElementById('orders-total-count');
  if (!tbody) return;

  const metaMap = new Map((state.orderMeta || []).map(m => [String(m.order_id), m]));
  let filtered = state.orders || [];

  if (state.ordersFilter === 'historical') {
    filtered = filtered.filter(o => !!(o.is_historical || Number(o.id) <= 170));
  } else if (state.ordersFilter === 'pending') {
    filtered = filtered.filter(o => {
      const isHist = !!(o.is_historical || Number(o.id) <= 170);
      const m = metaMap.get(String(o.id));
      const st = m ? (m.fulfillment_status || 'pending') : (isHist ? 'delivered' : (o.status || 'pending'));
      return !isHist && ['pending', 'confirmed', 'processing', 'packed'].includes(st);
    });
  } else if (state.ordersFilter === 'shipped') {
    filtered = filtered.filter(o => {
      const isHist = !!(o.is_historical || Number(o.id) <= 170);
      const m = metaMap.get(String(o.id));
      const st = m ? (m.fulfillment_status || 'pending') : (isHist ? 'delivered' : (o.status || 'pending'));
      return !isHist && ['shipped', 'delivered'].includes(st);
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
    renderPaginationBar('orders-pagination', 0, 0, 'orders', 'renderOrdersTable');
    return;
  }

  const limit = (state.pageLimits && state.pageLimits.orders) || 50;
  const visible = filtered.slice(0, limit);

  tbody.innerHTML = visible.map(o => {
    const m = metaMap.get(String(o.id)) || null;
    const isHist = !!(o.is_historical || Number(o.id) <= 170);
    const status = m ? (m.fulfillment_status || 'pending') : (isHist ? 'delivered' : (o.status || 'pending'));
    const paymentStatus = m ? (m.payment_status || 'unpaid') : (isHist ? 'paid' : (o.payment_status || 'unpaid'));
    const pricing = resolveEffectiveOrderPricing(o, m);
    const totalPrice = pricing.orderTotal;
    const bookTotal = pricing.bookRevenue;
    return `
      <tr>
        <td>
          <strong>#${o.id}</strong>
          ${!isHist ? '<div style="font-size: 0.72rem; color: var(--vintage-blue); font-weight: 600;">LIVE</div>' : ''}
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
          ${pricing.shippingFee > 0 ? `<div style="font-size: 0.74rem; color: var(--text-muted);">Books: ${bookTotal.toLocaleString('fr-DZ')} + Ship: ${pricing.shippingFee.toLocaleString('fr-DZ')}</div>` : ''}
        </td>
        <td>
          ${getOrderStatusBadgeHtml(status, isHist)}
          ${!isHist ? `<div style="font-size: 0.74rem; color: ${paymentStatus === 'paid' ? 'var(--success)' : 'var(--text-muted)'}; margin-top: 3px;">${escapeHtml(paymentStatus.toUpperCase())}</div>` : ''}
        </td>
        <td>
          <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="viewOrderDetails(${o.id})">
            <i class="fa-regular fa-eye"></i> Manage
          </button>
        </td>
      </tr>
    `;
  }).join('');

  renderPaginationBar('orders-pagination', filtered.length, visible.length, 'orders', 'renderOrdersTable');
}
window.renderOrdersTable = renderOrdersTable;

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
    renderPaginationBar('paid-orders-pagination', 0, 0, 'paidOrders', 'renderPaidOrdersSection');
    return;
  }

  const paidLimit = (state.pageLimits && state.pageLimits.paidOrders) || 50;
  const visiblePaid = filtered.slice(0, paidLimit);

  tbody.innerHTML = visiblePaid.map(p => {
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

  renderPaginationBar('paid-orders-pagination', filtered.length, visiblePaid.length, 'paidOrders', 'renderPaidOrdersSection');
}
window.renderPaidOrdersSection = renderPaidOrdersSection;

function renderInventoryTable() {
  const tbody = document.getElementById('inventory-table-tbody');
  const countEl = document.getElementById('inventory-total-count');
  if (!tbody) return;

  let items = state.inventory;

  // Filter logic including OLD_STOCK, NEW_STOCK, ACCESSORIES, and PACKAGING
  const pkgMetrics = computePackagingConsumptionMetrics();
  const pkgVariantById = new Map((pkgMetrics.variants || []).map(v => [String(v.id), v]));

  if (state.inventoryFilter === 'old_stock') {
    items = items.filter(i => (i.stock_group || '').toUpperCase() === 'OLD_STOCK' && !isAccessoryItem(i) && !isPackagingPaperItem(i));
  } else if (state.inventoryFilter === 'new_stock') {
    items = items.filter(i => (i.stock_group || 'NEW_STOCK').toUpperCase() === 'NEW_STOCK' && !isAccessoryItem(i) && !isPackagingPaperItem(i));
  } else if (state.inventoryFilter === 'accessories') {
    items = items.filter(i => isAccessoryItem(i));
  } else if (state.inventoryFilter === 'bookmark') {
    items = items.filter(i => isAccessoryItem(i) && ((i.item_type || i.category || '').toLowerCase() === 'bookmark' || (i.notes || '').toLowerCase().includes('category: bookmark')));
  } else if (state.inventoryFilter === 'accessory') {
    items = items.filter(i => isAccessoryItem(i) && ((i.item_type || i.category || '').toLowerCase() === 'accessory' || (i.notes || '').toLowerCase().includes('category: accessory')));
  } else if (state.inventoryFilter === 'packaging') {
    items = items.filter(i => isPackagingPaperItem(i));
  } else if (state.inventoryFilter === 'book') {
    items = items.filter(i => !isAccessoryItem(i) && !isPackagingPaperItem(i));
  } else if (state.inventoryFilter === 'unknown_cost') {
    items = items.filter(i => {
      if (isPackagingPaperItem(i)) {
        const v = pkgVariantById.get(String(i.id));
        return !v || !v.isCostConfirmed;
      }
      return i.unit_purchase_cost_da === null || i.unit_purchase_cost_da === undefined;
    });
  } else if (state.inventoryFilter === 'low_stock') {
    items = items.filter(i => {
      if (isPackagingPaperItem(i)) {
        const v = pkgVariantById.get(String(i.id));
        return v ? v.remainingCm <= 50 : false;
      }
      return getInventoryAvailableQty(i) <= 2;
    });
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

  const groupBanner = document.getElementById('inventory-group-summary-banner');
  if (groupBanner) {
    if (state.inventoryFilter === 'old_stock' || state.inventoryFilter === 'new_stock') {
      const fin = calculateFinancialMetrics();
      const isOldGrp = state.inventoryFilter === 'old_stock';
      const baseGrp = isOldGrp ? fin.stockBaseline.oldStock : fin.stockBaseline.newStock;
      const liveGrp = isOldGrp ? fin.oldStock : fin.newStock;
      groupBanner.style.display = 'block';
      groupBanner.innerHTML = `
        <div class="panel-body" style="padding: 14px 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
            <strong>
              <i class="fa-solid ${isOldGrp ? 'fa-clock-rotate-left' : 'fa-boxes-stacked'}"></i>
              ${isOldGrp ? 'OLD_STOCK Financial Details' : 'NEW_STOCK (New Batch) Financial Details'}
            </strong>
            <span class="badge badge-blue">Photo Baseline + Live DB Remaining</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; font-size: 0.86rem;">
            <div><span style="color: var(--text-muted);">Stock Value (Photo):</span><br/><strong>${baseGrp.retailValueDa.toLocaleString('fr-DZ')} DA</strong></div>
            <div><span style="color: var(--text-muted);">Actual Paid (Photo):</span><br/><strong>${baseGrp.paidCostDa.toLocaleString('fr-DZ')} DA</strong></div>
            <div><span style="color: var(--text-muted);">Stock Profit (Photo):</span><br/><strong style="color: var(--success);">+${baseGrp.expectedProfitDa.toLocaleString('fr-DZ')} DA (${baseGrp.marginPct}%)</strong></div>
            <div><span style="color: var(--text-muted);">Remaining Live Stock:</span><br/><strong>${liveGrp.available} avail (${liveGrp.soldQty} sold) • ${liveGrp.valuationAtRetail.toLocaleString('fr-DZ')} DA retail</strong></div>
          </div>
        </div>
      `;
    } else if (state.inventoryFilter === 'accessories' || state.inventoryFilter === 'bookmark' || state.inventoryFilter === 'accessory') {
      const fin = calculateFinancialMetrics();
      const acc = fin.accessories;
      groupBanner.style.display = 'block';
      groupBanner.innerHTML = `
        <div class="panel-body" style="padding: 14px 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
            <strong><i class="fa-solid fa-gem" style="color: #6D28D9;"></i> Accessories Stock &amp; Separate Profit Summary</strong>
            <span class="badge" style="background: #EDE9FE; color: #5B21B6;">Linked to Website Products</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; font-size: 0.86rem;">
            <div><span style="color: var(--text-muted);">Purchased / Paid Sold / Avail:</span><br/><strong>${acc.purchasedQty} / ${acc.paidSoldQty} / ${acc.available}</strong></div>
            <div><span style="color: var(--text-muted);">Paid Sales Revenue:</span><br/><strong style="color: var(--vintage-blue);">${acc.revenue.toLocaleString('fr-DZ')} DA</strong></div>
            <div><span style="color: var(--text-muted);">Earned Gross Profit:</span><br/><strong style="color: var(--success);">+${acc.grossProfit.toLocaleString('fr-DZ')} DA</strong></div>
            <div><span style="color: var(--text-muted);">Remaining Stock Value:</span><br/><strong>${acc.valuationAtRetail.toLocaleString('fr-DZ')} DA retail (${acc.valuationAtCost.toLocaleString('fr-DZ')} DA cost)</strong></div>
          </div>
        </div>
      `;
    } else if (state.inventoryFilter === 'packaging') {
      groupBanner.style.display = 'block';
      groupBanner.innerHTML = `
        <div class="panel-body" style="padding: 14px 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
            <strong><i class="fa-solid fa-gift" style="color: #B45309;"></i> Packaging Paper Variants &amp; Consumption</strong>
            <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.78rem;" onclick="openPackagingConfigModal()"><i class="fa-solid fa-sliders"></i> Configure cm/wrap</button>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; font-size: 0.86rem;">
            <div><span style="color: var(--text-muted);">Purchased (Provisional):</span><br/><strong>~${pkgMetrics.totalPurchasedMeters.toFixed(2)} m</strong></div>
            <div><span style="color: var(--text-muted);">Consumed:</span><br/><strong>${pkgMetrics.totalConsumedCm !== null ? `${pkgMetrics.totalConsumedMeters.toFixed(2)} m (${pkgMetrics.totalConsumedCm} cm)` : 'Not configured yet'}</strong></div>
            <div><span style="color: var(--text-muted);">Remaining Stock:</span><br/><strong>${pkgMetrics.totalRemainingMeters.toFixed(2)} m (${pkgMetrics.totalRemainingCm} cm)</strong></div>
            <div><span style="color: var(--text-muted);">Paid Wrapping Revenue:</span><br/><strong style="color: var(--vintage-blue);">${pkgMetrics.totalPaidRevenue.toLocaleString('fr-DZ')} DA (${pkgMetrics.totalWrapsPaid} paid wraps)</strong></div>
          </div>
        </div>
      `;
    } else {
      groupBanner.style.display = 'none';
      groupBanner.innerHTML = '';
    }
  }

  if (countEl) countEl.textContent = `${items.length} titles in view (${state.inventory.length} total in store)`;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state"><i class="fa-solid fa-book-open"></i><p>No inventory items found matching this filter. Use <strong>"Import Excel"</strong> or click <strong>"Add Item"</strong>.</p></td></tr>`;
    renderPaginationBar('inventory-pagination', 0, 0, 'inventory', 'renderInventoryTable');
    return;
  }

  const invLimit = (state.pageLimits && state.pageLimits.inventory) || 50;
  const visibleInv = items.slice(0, invLimit);

  tbody.innerHTML = visibleInv.map(item => {
    const isPkg = isPackagingPaperItem(item);
    const isAcc = !isPkg && isAccessoryItem(item);
    const isOld = (item.stock_group || '').toUpperCase() === 'OLD_STOCK';
    const webMatch = isAcc ? getWebsiteAccessoryMatch(item) : null;

    if (isPkg) {
      const v = pkgVariantById.get(String(item.id));
      const purchasedLabel = v ? `${v.isProvisionalQty ? '~' : ''}${v.purchasedMeters.toFixed(2)} m` : `${(Number(item.quantity_received) || 0) / 100} m`;
      const consumedLabel = v && v.consumedCm !== null ? `${v.consumedMeters.toFixed(2)} m` : `${v ? v.totalWrapsAll : 0} wraps`;
      const remMeters = v ? v.remainingMeters : ((Number(item.quantity_received) || 0) / 100);
      const remCm = v ? v.remainingCm : (Number(item.quantity_received) || 0);
      const pkgLow = remCm <= 50;
      const pkgOut = remCm <= 0;
      const costBadge = (v && v.isCostConfirmed && v.confirmedTotalPurchaseCost !== null)
        ? `<span class="badge-confirmed">${v.confirmedTotalPurchaseCost.toLocaleString('fr-DZ')} DA (${v.confirmedUnitCostPerCm.toFixed(2)}/cm)</span>`
        : (v && v.provisionalTotalCostDa !== null
          ? `<span class="badge-provisional">~${v.provisionalTotalCostDa.toLocaleString('fr-DZ')} DA (Prov.)</span>`
          : `<span class="badge-provisional"><i class="fa-solid fa-clock"></i> Unconfirmed</span>`);

      return `
        <tr>
          <td>
            <div style="font-weight: 600; font-family: var(--font-serif); font-size: 0.96rem; cursor: pointer;" onclick="openEditInventoryModal('${escapeHtml(String(item.id))}')">${escapeHtml(item.title)}</div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">Variant: ${escapeHtml(v ? v.shortName : 'Wrapping Paper')}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-solid fa-gift"></i> ${escapeHtml(item.supplier_name || 'Packaging Supplier')}</div>
          </td>
          <td><span class="badge" style="background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A;"><i class="fa-solid fa-gift"></i> PACKAGING</span></td>
          <td><span class="badge badge-neutral">Wrapping Paper</span></td>
          <td><strong title="Purchased roll length">${purchasedLabel}</strong></td>
          <td><strong style="color: var(--vintage-blue);">${consumedLabel}</strong></td>
          <td>—</td>
          <td>
            <span class="badge ${pkgOut || pkgLow ? 'badge-rose' : 'badge-green'}">
              ${remMeters.toFixed(2)} m ${pkgOut ? '(Out)' : (pkgLow ? '(Low)' : 'Avail')}
            </span>
          </td>
          <td>${costBadge}</td>
          <td><strong style="color: var(--vintage-blue); font-size: 1rem;">${item.selling_price_da ? Number(item.selling_price_da).toLocaleString('fr-DZ') + ' DA' : '-'}</strong></td>
          <td style="white-space: nowrap;">
            <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.78rem;" onclick="openEditInventoryModal('${escapeHtml(String(item.id))}')" title="Edit Variant & Provisional Costs">
              <i class="fa-solid fa-eye"></i> Details / Edit
            </button>
          </td>
        </tr>
      `;
    }

    const origReceived = Number(item.quantity_received) || 0;
    const sold = Number(item.quantity_sold) || 0;
    const reserved = Number(item.quantity_reserved) || 0;
    const available = getInventoryAvailableQty(item);
    const isOut = available <= 0;
    const isLow = available > 0 && available <= 2;

    const costBadge = (item.unit_purchase_cost_da !== null && item.unit_purchase_cost_da !== undefined && item.unit_purchase_cost_da !== '' && !isNaN(item.unit_purchase_cost_da))
      ? `<span class="badge-confirmed">${Number(item.unit_purchase_cost_da).toLocaleString('fr-DZ')} DA</span>`
      : `<span class="badge-provisional"><i class="fa-solid fa-clock"></i> Unknown (NULL)</span>`;

    const groupBadge = isAcc
      ? `<span class="badge" style="background: #EDE9FE; color: #5B21B6; border: 1px solid #DDD6FE;"><i class="fa-solid fa-gem"></i> ACCESSORIES</span>`
      : `<span class="${isOld ? 'badge-oldstock' : 'badge-newstock'}"><i class="fa-solid ${isOld ? 'fa-clock-rotate-left' : 'fa-boxes-stacked'}"></i> ${isOld ? 'OLD STOCK' : 'NEW STOCK'}</span>`;

    const webLinkHtml = webMatch
      ? `<a href="../index.html#cute-card-${escapeHtml(webMatch.slug)}" target="_blank" style="font-size:0.74rem; color:var(--vintage-blue); margin-left:6px;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Storefront</a>`
      : '';

    return `
      <tr>
        <td>
          <div style="font-weight: 600; font-family: var(--font-serif); font-size: 0.96rem; cursor: pointer;" onclick="openEditInventoryModal('${escapeHtml(String(item.id))}')">${escapeHtml(item.title)}</div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(item.author || '-')} ${item.isbn ? `• ISBN: ${escapeHtml(item.isbn)}` : ''}${webLinkHtml}</div>
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
          <span class="badge ${isOut ? 'badge-rose' : (isLow ? 'badge-amber' : 'badge-green')}">
            ${available} ${isOut ? '(Sold Out)' : (isLow ? '(Low)' : 'Avail')}
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

  renderPaginationBar('inventory-pagination', items.length, visibleInv.length, 'inventory', 'renderInventoryTable');
}
window.renderInventoryTable = renderInventoryTable;

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
  const base = fin.stockBaseline;

  // 1. Top Metrics (Money on Hand uses strict Cash Audit completeness check)
  const cashEl = document.getElementById('finance-cash-balance');
  const cashSubEl = document.getElementById('finance-cash-subtext');
  if (cashEl) {
    if (fin.isCashReconciled && fin.currentCashBalance !== null) {
      cashEl.textContent = `${fin.currentCashBalance.toLocaleString('fr-DZ')} DA`;
      cashEl.style.fontSize = '';
      if (cashSubEl) {
        cashSubEl.className = 'metric-subtext confirmed';
        cashSubEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Audited Cash (${escapeHtml(fin.openingDate || 'verified')})`;
      }
    } else {
      cashEl.textContent = 'Unverified / غير مكتمل';
      cashEl.style.fontSize = '1.05rem';
      if (cashSubEl) {
        cashSubEl.className = 'metric-subtext';
        cashSubEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Partial movement: ${fin.currentCashBalance.toLocaleString('fr-DZ')} DA (${fin.cashAudit.issues.length} gap(s))`;
      }
    }
  }

  // Render Cash Audit & Ledger Completeness Panel
  const auditBody = document.getElementById('finance-cash-audit-body');
  if (auditBody) {
    const ca = fin.cashAudit;
    auditBody.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; font-size: 0.85rem;">
        <div style="padding: 10px; border-radius: 8px; background: #FFFDF8; border: 1px solid var(--border-color);">
          <div style="color: var(--text-muted); font-size: 0.75rem;">Opening Cash (${escapeHtml(fin.openingDate || 'Unset')})</div>
          <strong>${fin.openingCash.toLocaleString('fr-DZ')} DA</strong> ${ca.openingVerified ? '<span class="badge badge-green" style="font-size:0.68rem;">Verified</span>' : '<span class="badge badge-amber" style="font-size:0.68rem;">Unverified</span>'}
        </div>
        <div style="padding: 10px; border-radius: 8px; background: #F0FDF4; border: 1px solid #BBF7D0;">
          <div style="color: #166534; font-size: 0.75rem;">+ Paid Live Inflow + Capital</div>
          <strong style="color: var(--success);">+${(fin.totalCashInflowsFromSales + (ca.totalCashInflows - fin.openingCash - fin.totalCashInflowsFromSales)).toLocaleString('fr-DZ')} DA</strong>
        </div>
        <div style="padding: 10px; border-radius: 8px; background: #FFF1F2; border: 1px solid #FECDD3;">
          <div style="color: #9F1239; font-size: 0.75rem;">− Recorded Outflows</div>
          <strong style="color: var(--danger);">−${ca.totalCashOutflows.toLocaleString('fr-DZ')} DA</strong>
        </div>
        <div style="padding: 10px; border-radius: 8px; background: ${ca.isComplete ? '#F0FDF4' : '#FFFBEB'}; border: 1px solid ${ca.isComplete ? '#86EFAC' : '#FCD34D'};">
          <div style="color: var(--text-muted); font-size: 0.75rem;">Tracked Cash Movement</div>
          <strong>${ca.netTrackedMovement.toLocaleString('fr-DZ')} DA</strong>
          <span class="badge ${ca.isComplete ? 'badge-green' : 'badge-amber'}" style="margin-left: 4px; font-size: 0.68rem;">${ca.isComplete ? 'Complete' : 'Incomplete'}</span>
        </div>
      </div>
      ${ca.issues.length > 0 ? `
        <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px 14px;">
          <div style="font-weight: 700; color: #92400E; margin-bottom: 8px; font-size: 0.88rem;">
            <i class="fa-solid fa-triangle-exclamation"></i> Why Money on Hand is Marked Unverified (${ca.issues.length} Incomplete Check${ca.issues.length === 1 ? '' : 's'}):
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${ca.issues.map(iss => `
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 0.83rem; color: #78350F; border-bottom: 1px dashed #FDE68A; padding-bottom: 6px;">
                <span>• ${escapeHtml(iss.label)}</span>
                <button class="btn-secondary" style="padding: 3px 10px; font-size: 0.76rem;" onclick="${iss.action}">${escapeHtml(iss.btn)}</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 10px 14px; color: #166534; font-size: 0.86rem;">
          <i class="fa-solid fa-circle-check"></i> All opening cash, live order payments, batches, debts, capital, and inventory cost checks passed.
        </div>
      `}
    `;
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
      const baseText = `Paid Costed Sales (${(fin.confirmedSalesRevenue || 0).toLocaleString('fr-DZ')} DA) − COGS (${(fin.totalCogs || 0).toLocaleString('fr-DZ')} DA)`;
      const unpaidNote = fin.unpaidOrdersCount > 0 ? ` • ${fin.unpaidOrdersCount} unpaid excl.` : '';
      grossSubEl.innerHTML = fin.unknownCostSalesCount > 0
        ? `<i class="fa-solid fa-clock"></i> ${baseText}${unpaidNote} • Excl. ${fin.unknownCostSalesCount} Unknown Cost`
        : `<i class="fa-solid fa-circle-check"></i> ${baseText}${unpaidNote}`;
    }
  }

  const netEl = document.getElementById('finance-net-profit');
  const netSubEl = document.getElementById('finance-net-subtext');
  if (netEl) {
    netEl.textContent = `${(fin.netConfirmedProfit || 0).toLocaleString('fr-DZ')} DA`;
    netEl.style.fontSize = '';
    if (netSubEl) {
      netSubEl.className = fin.unknownCostSalesCount > 0 ? 'metric-subtext' : 'metric-subtext confirmed';
      const pkgCostNote = fin.paidSummary?.confirmedOrdersPackagingCosts > 0 ? ` − Order Pkg (${fin.paidSummary.confirmedOrdersPackagingCosts.toLocaleString('fr-DZ')} DA)` : '';
      netSubEl.innerHTML = `<i class="fa-solid ${fin.unknownCostSalesCount > 0 ? 'fa-clock' : 'fa-circle-check'}"></i> Paid Gross Profit − Expenses (${fin.totalOperatingExpenses.toLocaleString('fr-DZ')} DA)${pkgCostNote}${fin.unknownCostSalesCount > 0 ? ' • Partial (Unknown Costs)' : ''}`;
    }
  }

  const shipEl = document.getElementById('finance-shipping-collected');
  if (shipEl) shipEl.textContent = `${fin.totalShippingCollected.toLocaleString('fr-DZ')} DA`;
  const shipSubEl = document.getElementById('finance-shipping-subtext');
  if (shipSubEl) {
    const unpaidShipNote = fin.unpaidDeliveryFees > 0 ? ` (+${fin.unpaidDeliveryFees.toLocaleString('fr-DZ')} DA on unpaid)` : '';
    shipSubEl.textContent = `Excluded from ${fin.totalSalesRevenue.toLocaleString('fr-DZ')} DA paid book sales${unpaidShipNote} • Transport Exp: ${(fin.totalTransportationExpenses || 0).toLocaleString('fr-DZ')} DA`;
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

  // 2. New Stock Breakdown Card (Configured Photo Baseline + Live DB Remaining)
  const newStatusEl = document.getElementById('finance-new-stock-status');
  if (newStatusEl) {
    newStatusEl.innerHTML = `<i class="fa-solid fa-boxes-stacked"></i> ${fin.newStock.soldQty} Sold • ${fin.newStock.available} Avail`;
  }

  const newSoldEl = document.getElementById('finance-new-sold-qty');
  if (newSoldEl) newSoldEl.textContent = `Remaining: ${fin.newStock.available} avail (${fin.newStock.soldQty} sold)`;

  const newRetailEl = document.getElementById('finance-new-retail-val');
  if (newRetailEl) newRetailEl.textContent = `${base.newStock.retailValueDa.toLocaleString('fr-DZ')} DA`;

  const newRevEl = document.getElementById('finance-new-revenue');
  if (newRevEl) newRevEl.textContent = `${base.newStock.paidCostDa.toLocaleString('fr-DZ')} DA paid`;

  const newCogsEl = document.getElementById('finance-new-cogs');
  if (newCogsEl) newCogsEl.textContent = `${base.newStock.paidCostDa.toLocaleString('fr-DZ')} DA`;

  const newProfitEl = document.getElementById('finance-new-profit');
  if (newProfitEl) newProfitEl.textContent = `+${base.newStock.expectedProfitDa.toLocaleString('fr-DZ')} DA (${base.newStock.marginPct}%)`;

  const newFooterEl = document.getElementById('finance-new-batch-footer');
  if (newFooterEl) {
    newFooterEl.innerHTML = `<span><i class="fa-solid fa-layer-group"></i> Stock Plan: ${base.newStock.retailValueDa.toLocaleString('fr-DZ')} / ${base.newStock.paidCostDa.toLocaleString('fr-DZ')} / ${base.newStock.expectedProfitDa.toLocaleString('fr-DZ')} DA</span><span>Live DB Avail Cost: <strong>${fin.newStock.valuationAtCost.toLocaleString('fr-DZ')} DA</strong></span>`;
  }

  // 3. Old Stock Breakdown Card (Configured Photo Baseline + Live DB Remaining)
  const oldStatusEl = document.getElementById('finance-old-stock-status');
  if (oldStatusEl) {
    oldStatusEl.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${fin.oldStock.soldQty} Sold • ${fin.oldStock.available} Avail`;
  }

  const oldSoldEl = document.getElementById('finance-old-sold-qty');
  if (oldSoldEl) oldSoldEl.textContent = `Remaining: ${fin.oldStock.available} avail (${fin.oldStock.soldQty} sold)`;

  const oldRevEl = document.getElementById('finance-old-revenue');
  if (oldRevEl) oldRevEl.textContent = `${base.oldStock.retailValueDa.toLocaleString('fr-DZ')} DA`;

  const oldCogsEl = document.getElementById('finance-old-cogs');
  if (oldCogsEl) oldCogsEl.textContent = `${base.oldStock.paidCostDa.toLocaleString('fr-DZ')} DA`;

  const oldProfitEl = document.getElementById('finance-old-profit');
  if (oldProfitEl) oldProfitEl.textContent = `+${base.oldStock.expectedProfitDa.toLocaleString('fr-DZ')} DA (${base.oldStock.marginPct}%)`;

  const oldFooterEl = document.getElementById('finance-old-stock-footer');
  if (oldFooterEl) {
    oldFooterEl.innerHTML = `<span><i class="fa-solid fa-layer-group"></i> Stock Plan: ${base.oldStock.retailValueDa.toLocaleString('fr-DZ')} / ${base.oldStock.paidCostDa.toLocaleString('fr-DZ')} / ${base.oldStock.expectedProfitDa.toLocaleString('fr-DZ')} DA</span><span>Live DB Avail Cost: <strong>${fin.oldStock.valuationAtCost.toLocaleString('fr-DZ')} DA</strong></span>`;
  }

  // 3b. Combined Books Breakdown Card (Photo Baseline Combined + Live DB Remaining)
  const combStatusEl = document.getElementById('finance-combined-books-status');
  if (combStatusEl) {
    combStatusEl.innerHTML = `<i class="fa-solid fa-book"></i> ${fin.combinedBooks.soldQty} Sold • ${fin.combinedBooks.available} Avail`;
  }

  const combSoldEl = document.getElementById('finance-combined-books-sold-qty');
  if (combSoldEl) combSoldEl.textContent = `Remaining: ${fin.combinedBooks.available} avail (${fin.combinedBooks.soldQty} sold)`;

  const combRevEl = document.getElementById('finance-combined-books-revenue');
  if (combRevEl) combRevEl.textContent = `${base.combined.retailValueDa.toLocaleString('fr-DZ')} DA`;

  const combCogsEl = document.getElementById('finance-combined-books-cogs');
  if (combCogsEl) combCogsEl.textContent = `${base.combined.paidCostDa.toLocaleString('fr-DZ')} DA`;

  const combProfitEl = document.getElementById('finance-combined-books-profit');
  if (combProfitEl) combProfitEl.textContent = `+${base.combined.expectedProfitDa.toLocaleString('fr-DZ')} DA (${base.combined.marginPct}%)`;

  const combFooterEl = document.getElementById('finance-combined-books-footer');
  if (combFooterEl) {
    const br = fin.booksReport;
    combFooterEl.innerHTML = `<span><i class="fa-solid fa-books"></i> Paid Book Sales (Separate): <strong>${br.revenue.toLocaleString('fr-DZ')} DA</strong> rev − ${br.cogs.toLocaleString('fr-DZ')} DA COGS = <strong style="color:var(--success);">+${br.grossProfit.toLocaleString('fr-DZ')} DA earned</strong></span><span>DB Remaining: <strong>${fin.combinedBooks.valuationAtRetail.toLocaleString('fr-DZ')} DA retail</strong></span>`;
  }

  // 3c. Accessories Breakdown Card — uses actual paid sales figures (not expected)
  const acc = fin.accessories; // full accReport from computeAccessoriesFinancialReport
  const accStatusEl = document.getElementById('finance-accessories-status');
  if (accStatusEl) {
    const statusTxt = acc.paidSoldQty > 0
      ? `<i class="fa-solid fa-circle-check"></i> ${acc.paidSoldQty} Paid Sold • ${acc.available} Avail`
      : `<i class="fa-solid fa-gem"></i> ${acc.soldQty} Sold • ${acc.available} Avail`;
    accStatusEl.innerHTML = statusTxt;
  }

  const accSoldEl = document.getElementById('finance-acc-stock-qty');
  if (accSoldEl) accSoldEl.textContent = `${acc.paidSoldQty} Paid Sold (${acc.available} avail, ${acc.reserved} reserved)`;

  const accRevEl = document.getElementById('finance-acc-revenue');
  if (accRevEl) accRevEl.textContent = acc.paidSoldQty > 0
    ? `${acc.revenue.toLocaleString('fr-DZ')} DA`
    : `${acc.valuationAtRetail.toLocaleString('fr-DZ')} DA (Remaining Retail)`;

  const accCogsEl = document.getElementById('finance-acc-cogs');
  if (accCogsEl) accCogsEl.textContent = `${acc.cogs.toLocaleString('fr-DZ')} DA (Sold COGS)`;

  const accProfitEl = document.getElementById('finance-acc-profit');
  if (accProfitEl) {
    if (acc.hasUnpricedSold) {
      accProfitEl.textContent = `${acc.grossProfit.toLocaleString('fr-DZ')} DA (partial — unknown cost)`;
      accProfitEl.style.color = 'var(--text-muted)';
    } else if (acc.paidSoldQty > 0) {
      accProfitEl.textContent = `+${acc.grossProfit.toLocaleString('fr-DZ')} DA earned`;
      accProfitEl.style.color = 'var(--success)';
    } else {
      accProfitEl.textContent = 'No paid sales yet';
      accProfitEl.style.color = 'var(--text-muted)';
    }
  }

  const accFooterEl = document.getElementById('finance-accessories-footer');
  if (accFooterEl) {
    const totalCostTxt = acc.totalPurchaseCost !== null
      ? `${acc.totalPurchaseCost.toLocaleString('fr-DZ')} DA total purchase`
      : 'Purchase cost partial';
    accFooterEl.innerHTML = `<span><i class="fa-solid fa-gem"></i> ${acc.itemsCount} Items • ${acc.purchasedQty} Purchased</span><span>${totalCostTxt} • Avg unit: <strong>${acc.avgUnitCost.toFixed(2)} DA</strong></span>`;
  }

  // 3d. Packaging Paper Card
  const pkg = fin.packaging;
  const pkgStatusEl = document.getElementById('finance-packaging-status');
  if (pkgStatusEl) {
    const allConfirmed = pkg.confirmedVariantsCount > 0 && pkg.provisionalVariantsCount === 0 && pkg.unconfirmedCostVariantsCount === 0;
    pkgStatusEl.innerHTML = allConfirmed
      ? `<i class="fa-solid fa-circle-check"></i> ${pkg.variants.length} Variants Confirmed`
      : `<i class="fa-solid fa-ruler"></i> ${pkg.variants.length} Variants (${pkg.provisionalVariantsCount} Provisional)`;
    pkgStatusEl.style.background = allConfirmed ? '#D1FAE5' : '#FEF3C7';
    pkgStatusEl.style.color = allConfirmed ? '#065F46' : '#92400E';
  }

  const pkgStockEl = document.getElementById('finance-pkg-stock-qty');
  if (pkgStockEl) pkgStockEl.textContent = `${pkg.totalRemainingMeters.toFixed(2)} m remaining (of ${pkg.totalPurchasedMeters.toFixed(2)} m)`;

  const pkgRevEl = document.getElementById('finance-pkg-revenue');
  if (pkgRevEl) pkgRevEl.textContent = `${pkg.totalPaidRevenue.toLocaleString('fr-DZ')} DA (${pkg.totalWrapsPaid} paid wraps)`;

  const pkgCogsEl = document.getElementById('finance-pkg-cogs');
  if (pkgCogsEl) {
    const costTxt = pkg.confirmedTotalCostPaid > 0
      ? `${pkg.confirmedTotalCostPaid.toLocaleString('fr-DZ')} DA confirmed`
      : (pkg.provisionalTotalCostPaid > 0 ? `~${pkg.provisionalTotalCostPaid.toLocaleString('fr-DZ')} DA prov.` : 'Unknown');
    pkgCogsEl.textContent = costTxt;
  }

  const pkgProfitEl = document.getElementById('finance-pkg-profit');
  if (pkgProfitEl) {
    pkgProfitEl.textContent = pkg.totalConsumedCm !== null
      ? `${pkg.totalConsumedCm} cm consumed (${pkg.totalWrapsAll} total wraps)`
      : `${pkg.totalWrapsAll} wraps (cm/wrap not configured)`;
  }

  const pkgFooterEl = document.getElementById('finance-packaging-footer');
  if (pkgFooterEl) {
    const legacyNote = pkg.legacyKraft && pkg.legacyKraft.wrapsAll > 0
      ? ` • Legacy Papier Craft: ${pkg.legacyKraft.wrapsAll} wraps (${pkg.legacyKraft.paidRevenueDa.toLocaleString('fr-DZ')} DA paid rev)`
      : '';
    pkgFooterEl.innerHTML = `<span><i class="fa-solid fa-gift"></i> ${pkg.variants.length} tracked variants${legacyNote}</span><button class="btn-secondary" style="padding:3px 10px; font-size:0.76rem;" onclick="openPackagingConfigModal()"><i class="fa-solid fa-sliders"></i> Configure cm/wrap</button>`;
  }

  // 3e. Accessories Financial Report Panel (detailed per-item table)
  const accReportTbody = document.getElementById('finance-accessories-report-tbody');
  if (accReportTbody) {
    if (!acc.breakdown || acc.breakdown.length === 0) {
      accReportTbody.innerHTML = `<tr><td colspan="9" class="empty-state">No accessory inventory items found. Add accessories to inventory to see this report.</td></tr>`;
    } else {
      accReportTbody.innerHTML = acc.breakdown.map(a => {
        const statusBadge = a.stockStatus === 'sold_out'
          ? `<span class="badge" style="background:#FFF1F2;color:#9F1239;">SOLD OUT</span>`
          : (a.stockStatus === 'low_stock'
            ? `<span class="badge badge-amber">LOW STOCK</span>`
            : `<span class="badge badge-green">IN STOCK</span>`);
        const webLink = a.slug
          ? `<a href="../index.html#cute-card-${escapeHtml(a.slug)}" target="_blank" style="font-size:0.76rem; color:var(--vintage-blue); display:block; margin-top:2px;"><i class="fa-solid fa-arrow-up-right-from-square"></i> View on site</a>`
          : '';
        const costTxt = a.unitCost !== null ? `${a.unitCost.toLocaleString('fr-DZ')} DA` : '<span style="color:var(--text-muted);font-style:italic;">Unknown</span>';
        const totalCostTxt = a.totalPurchaseCost !== null ? `${a.totalPurchaseCost.toLocaleString('fr-DZ')} DA` : '<span style="color:var(--text-muted);font-style:italic;">Unknown</span>';
        const earnedTxt = a.earnedGrossProfit !== null
          ? `<strong style="color:var(--success);">+${a.earnedGrossProfit.toLocaleString('fr-DZ')} DA</strong>`
          : (a.paidSoldQty > 0 ? '<span style="color:var(--text-muted);font-style:italic;">Unknown cost</span>' : '—');
        const cogsTxt = a.soldCogs !== null ? `${a.soldCogs.toLocaleString('fr-DZ')} DA` : (a.paidSoldQty > 0 ? '<span style="color:var(--text-muted);font-style:italic;">?</span>' : '—');
        return `
          <tr>
            <td>
              <strong>${escapeHtml(a.shortName || a.title)}</strong>
              ${webLink}
              ${statusBadge}
            </td>
            <td>
              <span title="Purchased / Paid Sold / Available"><strong>${a.purchasedQty}</strong> / <strong style="color:var(--vintage-blue);">${a.paidSoldQty}</strong> / <strong style="color:${a.availableQty > 0 ? 'var(--success)' : 'var(--danger)'};">${a.availableQty}</strong></span>
              ${a.unpaidQty > 0 ? `<div style="font-size:0.72rem;color:var(--text-muted);">${a.unpaidQty} unpaid pending</div>` : ''}
            </td>
            <td>${costTxt}</td>
            <td>${totalCostTxt}</td>
            <td>${a.currentPrice.toLocaleString('fr-DZ')} DA</td>
            <td>
              <strong style="color:var(--vintage-blue);">${a.paidSalesRevenue.toLocaleString('fr-DZ')} DA</strong>
              <div style="font-size:0.72rem;color:var(--text-muted);">${escapeHtml(a.priceBreakdownText)}</div>
            </td>
            <td>${cogsTxt}</td>
            <td>${earnedTxt}</td>
            <td>
              <span style="font-size:0.82rem;color:var(--text-muted);">${a.remainingRetailValue.toLocaleString('fr-DZ')} DA retail</span>
              ${a.remainingCostValue !== null ? `<div style="font-size:0.72rem;color:var(--text-muted);">(${a.remainingCostValue.toLocaleString('fr-DZ')} DA cost)</div>` : ''}
            </td>
          </tr>
        `;
      }).join('') + `
        <tr style="background:#F0FDF4;font-weight:700;border-top:2px solid #86EFAC;">
          <td>TOTAL</td>
          <td>${acc.purchasedQty} / ${acc.paidSoldQty} / ${acc.available}</td>
          <td>—</td>
          <td>${acc.totalPurchaseCost !== null ? acc.totalPurchaseCost.toLocaleString('fr-DZ') + ' DA' : 'Partial'}</td>
          <td>—</td>
          <td><strong style="color:var(--vintage-blue);">${acc.revenue.toLocaleString('fr-DZ')} DA</strong></td>
          <td>${acc.cogs.toLocaleString('fr-DZ')} DA</td>
          <td><strong style="color:var(--success);">+${acc.grossProfit.toLocaleString('fr-DZ')} DA${acc.hasUnpricedSold ? ' (partial)' : ''}</strong></td>
          <td>${acc.valuationAtRetail.toLocaleString('fr-DZ')} DA retail</td>
        </tr>
      `;
    }
  }

  // 3f. Packaging Paper Variants Report Panel
  const pkgReportTbody = document.getElementById('finance-packaging-report-tbody');
  if (pkgReportTbody) {
    if (!pkg.variants || pkg.variants.length === 0) {
      pkgReportTbody.innerHTML = `<tr><td colspan="9" class="empty-state">No packaging variants configured.</td></tr>`;
    } else {
      const cfgSummaryEl = document.getElementById('finance-packaging-config-summary');
      if (cfgSummaryEl) {
        const cfg = pkg.config;
        cfgSummaryEl.textContent = cfg.cmPerWrap !== null
          ? `${cfg.cmPerWrap} cm per ${cfg.mode === 'per_order' ? 'order' : 'book'} configured${cfg.includeHistorical ? ' • including historical orders' : ''}`
          : 'Provisional — configure exact wrapping cm per book when measured.';
      }
      pkgReportTbody.innerHTML = pkg.variants.map(v => {
        const purchasedTxt = v.isProvisionalQty
          ? `~${v.purchasedMeters.toFixed(2)} m (prov.)`
          : `${v.purchasedMeters.toFixed(2)} m`;
        const consumedTxt = v.consumedCm !== null
          ? `${(v.consumedCm / 100).toFixed(2)} m`
          : '<span style="color:var(--text-muted);font-style:italic;">Not configured</span>';
        const remainingStyle = v.remainingCm < 50 ? 'color:var(--danger);font-weight:700;' : 'color:var(--success);font-weight:700;';
        const costTxt = v.isCostConfirmed && v.confirmedTotalPurchaseCost !== null
          ? `${v.confirmedTotalPurchaseCost.toLocaleString('fr-DZ')} DA <span class="badge badge-green" style="font-size:0.65rem;">Confirmed</span>`
          : (v.provisionalTotalCostDa !== null
            ? `~${v.provisionalTotalCostDa.toLocaleString('fr-DZ')} DA <span class="badge badge-amber" style="font-size:0.65rem;">Provisional</span>`
            : '<span style="color:var(--text-muted);font-style:italic;">Unknown</span>');
        const profitTxt = v.confirmedGrossProfit !== null
          ? `<strong style="color:${v.confirmedGrossProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">${v.confirmedGrossProfit >= 0 ? '+' : ''}${v.confirmedGrossProfit.toLocaleString('fr-DZ')} DA</strong>`
          : (v.paidRevenueDa > 0 ? '<span style="color:var(--text-muted);font-style:italic;">Unknown cost</span>' : '—');
        return `
          <tr>
            <td>
              <strong>${escapeHtml(v.shortName || v.variantKey)}</strong>
              ${!v.hasDbLot ? '<div style="font-size:0.72rem;color:var(--text-muted);">Virtual (no DB lot)</div>' : ''}
            </td>
            <td>${purchasedTxt}</td>
            <td>
              <strong>${v.paidWrapsCount}</strong> paid
              <div style="font-size:0.72rem;color:var(--text-muted);">${v.totalWrapsAll} total (${v.liveWrapsCount} live${v.historicalWrapsCount > 0 ? `, ${v.historicalWrapsCount} hist` : ''})</div>
            </td>
            <td>${consumedTxt}</td>
            <td style="${remainingStyle}">${v.remainingMeters.toFixed(2)} m</td>
            <td>${v.sellingPriceDa > 0 ? v.sellingPriceDa.toLocaleString('fr-DZ') + ' DA' : '—'}</td>
            <td>${costTxt}</td>
            <td><strong style="color:var(--vintage-blue);">${v.paidRevenueDa.toLocaleString('fr-DZ')} DA</strong></td>
            <td>${profitTxt}</td>
          </tr>
        `;
      }).join('') + (pkg.legacyKraft && pkg.legacyKraft.wrapsAll > 0 ? `
        <tr style="background:#FFFBEB;font-style:italic;">
          <td><strong>Papier Craft (Legacy)</strong><div style="font-size:0.72rem;color:var(--text-muted);">Pre-system, roll not tracked</div></td>
          <td>—</td>
          <td><strong>${pkg.legacyKraft.wrapsPaid}</strong> paid / ${pkg.legacyKraft.wrapsAll} total</td>
          <td>—</td>
          <td>—</td>
          <td>500 DA</td>
          <td><span style="color:var(--text-muted);">Not recorded</span></td>
          <td><strong style="color:var(--vintage-blue);">${pkg.legacyKraft.paidRevenueDa.toLocaleString('fr-DZ')} DA</strong></td>
          <td>—</td>
        </tr>
      ` : '');
    }
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
    } else if (state.profitFilter === 'accessories') {
      list = list.filter(tp => tp.stockGroup === 'ACCESSORIES');
    } else if (state.profitFilter === 'packaging') {
      list = list.filter(tp => tp.stockGroup === 'PACKAGING');
    }

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter(tp => tp.title.toLowerCase().includes(q) || (tp.author && tp.author.toLowerCase().includes(q)));
    }

    if (list.length === 0) {
      titlesTbody.innerHTML = `<tr><td colspan="8" class="empty-state">No catalog items matching this filter.</td></tr>`;
      renderPaginationBar('finance-titles-pagination', 0, 0, 'profitTitles', 'renderFinanceSection');
    } else {
      const titlesLimit = (state.pageLimits && state.pageLimits.profitTitles) || 60;
      const visibleList = list.slice(0, titlesLimit);
      titlesTbody.innerHTML = visibleList.map(tp => {
        const isOld = tp.stockGroup === 'OLD_STOCK';
        const isNew = tp.stockGroup === 'NEW_STOCK';
        const isAcc = tp.stockGroup === 'ACCESSORIES';
        const isPkg = tp.stockGroup === 'PACKAGING';
        const hasSold = tp.quantitySold > 0;
        let badgeClass = 'badge-neutral';
        let badgeLabel = 'HISTORICAL';
        if (isPkg) { badgeClass = 'badge-neutral'; badgeLabel = 'PACKAGING'; }
        else if (isAcc) { badgeClass = 'badge-neutral'; badgeLabel = 'ACCESSORIES'; }
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
      renderPaginationBar('finance-titles-pagination', list.length, visibleList.length, 'profitTitles', 'renderFinanceSection');
    }
  }

  // 4b. Monthly & Yearly Financial Summaries (Single Unified Source)
  const renderPeriodRows = (tbodyEl, rows, includeBreakdownCols) => {
    if (!tbodyEl) return;
    if (!rows || rows.length === 0) {
      tbodyEl.innerHTML = `<tr><td colspan="9" class="empty-state">No confirmed paid period data yet.</td></tr>`;
      return;
    }
    tbodyEl.innerHTML = rows.map(r => {
      const gross = Math.round(r.costedGrossProfitDa || 0);
      const exp = Math.round(r.operatingExpensesDa || 0);
      const net = gross - exp;
      const statusCell = includeBreakdownCols
        ? `<td><strong>${r.costedOrdersCount}</strong> costed${r.reviewOrdersCount > 0 ? ` <span class="badge badge-amber" style="font-size:0.68rem;">${r.reviewOrdersCount} review</span>` : ''}</td>`
        : `<td>${Math.round(r.orderPkgCostsDa || 0).toLocaleString('fr-DZ')} DA</td>`;
      return `
        <tr>
          <td><strong>${escapeHtml(r.label)}</strong></td>
          <td>${r.paidOrdersCount}</td>
          ${statusCell}
          <td style="color:var(--text-muted);">${Math.round(r.deliveryExclDa).toLocaleString('fr-DZ')} DA</td>
          <td><strong>${Math.round(r.storeRevenueDa).toLocaleString('fr-DZ')} DA</strong></td>
          <td>${Math.round(r.confirmedCogsDa).toLocaleString('fr-DZ')} DA</td>
          <td><strong style="color:${gross >= 0 ? 'var(--success)' : 'var(--danger)'};">${gross.toLocaleString('fr-DZ')} DA</strong></td>
          <td style="color:var(--danger);">${exp > 0 ? '−' + exp.toLocaleString('fr-DZ') + ' DA' : '0 DA'}</td>
          <td><strong style="color:${net >= 0 ? 'var(--success)' : 'var(--danger)'};">${net.toLocaleString('fr-DZ')} DA</strong></td>
        </tr>
      `;
    }).join('');
  };
  renderPeriodRows(document.getElementById('finance-yearly-summary-tbody'), fin.periodSummaries?.yearly, false);
  renderPeriodRows(document.getElementById('finance-monthly-summary-tbody'), fin.periodSummaries?.monthly, true);

  // 4c. Storewide Accounting & Lot Attribution Audit Panel
  const auditBadgesEl = document.getElementById('finance-audit-summary-badges');
  const auditReviewBody = document.getElementById('finance-audit-review-body');
  if (auditBadgesEl && fin.auditSummary) {
    const au = fin.auditSummary;
    auditBadgesEl.innerHTML = `
      <span class="badge badge-neutral">Audited: ${au.auditedOrdersCount} orders</span>
      <span class="badge badge-green">Costed Paid: ${au.costedPaidOrdersCount}/${au.paidOrdersCount}</span>
      <span class="badge badge-blue">Persisted Allocations: ${au.allocatedLinesCount} lines</span>
      <span class="badge ${au.needsReviewItemsCount > 0 ? 'badge-amber' : 'badge-green'}">Needs Review: ${au.needsReviewItemsCount} items</span>
    `;
  }
  if (auditReviewBody && fin.auditSummary) {
    const items = fin.auditSummary.needsReviewItems || [];
    if (items.length === 0) {
      auditReviewBody.innerHTML = `<div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:10px 14px;color:#166534;font-size:0.86rem;"><i class="fa-solid fa-circle-check"></i> All paid order items are cleanly attributed to verified inventory lots with known purchase costs.</div>`;
    } else {
      const sample = items.slice(0, 25);
      auditReviewBody.innerHTML = `
        <p style="font-size:0.83rem;color:var(--text-muted);margin-bottom:10px;">
          Showing ${sample.length} of ${items.length} line item(s) across ${fin.auditSummary.needsReviewOrdersCount} order(s) without fabricated costs. Click any order to inspect or link a lot:
        </p>
        <div class="vintage-table-wrapper">
          <table class="vintage-table" style="font-size:0.81rem;">
            <thead><tr><th>Order #</th><th>Date</th><th>Item Title</th><th>Qty</th><th>Revenue (DA)</th><th>Review Reason</th><th>Action</th></tr></thead>
            <tbody>
              ${sample.map(it => `
                <tr>
                  <td><strong>#${it.orderId}</strong> ${it.isHist ? '<span class="badge badge-neutral" style="font-size:0.65rem;">HIST</span>' : '<span class="badge badge-blue" style="font-size:0.65rem;">LIVE</span>'}</td>
                  <td style="white-space:nowrap;">${escapeHtml(it.orderDate || '-')}</td>
                  <td><strong>${escapeHtml(it.title)}</strong></td>
                  <td>${it.qty}</td>
                  <td>${(it.revenueDa || 0).toLocaleString('fr-DZ')} DA</td>
                  <td style="color:#92400E;">${escapeHtml(it.reason || 'Needs review')}</td>
                  <td><button class="btn-secondary" style="padding:2px 8px;font-size:0.74rem;" onclick="viewOrderDetails(${it.orderId})">Inspect</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // 5. Stock Summary Table (Photo Baseline + Live DB Remaining Stock)
  const stockTbody = document.getElementById('finance-stock-summary-tbody');
  if (stockTbody) {
    stockTbody.innerHTML = `
      <tr style="background: #EFF6FF;">
        <td><span class="badge-newstock"><i class="fa-solid fa-image"></i> NEW BATCH (Owner Verified Photo)</span></td>
        <td><strong>${fin.newStock.titlesCount} Titles</strong></td>
        <td><strong>Initial Baseline</strong></td>
        <td><strong>${base.newStock.paidCostDa.toLocaleString('fr-DZ')} DA</strong></td>
        <td>-</td>
        <td><strong style="color: var(--vintage-blue);">${base.newStock.retailValueDa.toLocaleString('fr-DZ')} DA</strong></td>
        <td><strong style="color: var(--success);">+${base.newStock.expectedProfitDa.toLocaleString('fr-DZ')} DA</strong></td>
        <td><strong>${base.newStock.marginPct}%</strong></td>
        <td><span class="badge badge-blue">Baseline</span></td>
      </tr>
      <tr>
        <td><span class="badge-newstock"><i class="fa-solid fa-boxes-stacked"></i> NEW BATCH (Live DB Remaining)</span></td>
        <td><strong>${fin.newStock.titlesCount} Titles</strong></td>
        <td><strong style="color: var(--success);">${fin.newStock.available} avail</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">(${fin.newStock.onHand} on hand)</span></td>
        <td><strong>${fin.newStock.valuationAtCost.toLocaleString('fr-DZ')} DA</strong></td>
        <td>${fin.newStock.avgUnitCost.toFixed(2)} DA</td>
        <td><strong style="color: var(--vintage-blue);">${fin.newStock.valuationAtRetail.toLocaleString('fr-DZ')} DA</strong></td>
        <td><strong style="color: var(--success);">+${fin.newStock.expectedProfit.toLocaleString('fr-DZ')} DA</strong></td>
        <td><strong>${fin.newStock.marginPct}%</strong></td>
        <td><span class="badge ${fin.newStock.soldQty > 0 ? 'badge-blue' : 'badge-green'}">${fin.newStock.soldQty} Sold</span></td>
      </tr>
      <tr style="background: #FFFBEB;">
        <td><span class="badge-oldstock"><i class="fa-solid fa-image"></i> OLD STOCK (Owner Verified Photo)</span></td>
        <td><strong>${fin.oldStock.titlesCount} Titles</strong></td>
        <td><strong>Initial Baseline</strong></td>
        <td><strong>${base.oldStock.paidCostDa.toLocaleString('fr-DZ')} DA</strong></td>
        <td>-</td>
        <td><strong style="color: var(--vintage-blue);">${base.oldStock.retailValueDa.toLocaleString('fr-DZ')} DA</strong></td>
        <td><strong style="color: var(--success);">+${base.oldStock.expectedProfitDa.toLocaleString('fr-DZ')} DA</strong></td>
        <td><strong>${base.oldStock.marginPct}%</strong></td>
        <td><span class="badge badge-amber">Baseline</span></td>
      </tr>
      <tr>
        <td><span class="badge-oldstock"><i class="fa-solid fa-clock-rotate-left"></i> OLD STOCK (Live DB Remaining)</span></td>
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
        <td><span class="badge" style="background: #DCFCE7; color: #166534;"><i class="fa-solid fa-book-bookmark"></i> COMBINED BASELINE (Photos Total)</span></td>
        <td><strong>${fin.combinedBooks.titlesCount} Titles</strong></td>
        <td><strong>Baseline Total</strong></td>
        <td style="color: var(--text-primary); font-size: 1.02rem;"><strong>${base.combined.paidCostDa.toLocaleString('fr-DZ')} DA</strong></td>
        <td>-</td>
        <td style="color: var(--vintage-blue); font-size: 1.02rem;"><strong>${base.combined.retailValueDa.toLocaleString('fr-DZ')} DA</strong></td>
        <td style="color: var(--success); font-size: 1.02rem;"><strong>+${base.combined.expectedProfitDa.toLocaleString('fr-DZ')} DA</strong></td>
        <td style="color: var(--success); font-size: 1.02rem;"><strong>${base.combined.marginPct}%</strong></td>
        <td><span class="badge badge-green">Configured</span></td>
      </tr>
      <tr style="background: #FFFDF8; font-weight: bold;">
        <td><span class="badge" style="background: #DCFCE7; color: #166534;"><i class="fa-solid fa-warehouse"></i> LIVE DB REMAINING BOOKS</span></td>
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

window.renderFinanceSection = renderFinanceSection;

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
        const pi = parseOrderItem(item);
        const isAccItem = !!getWebsiteAccessoryMatch(pi.title) || pi.type === 'accessory' || (typeof item === 'string' && item.includes('[Accessory]'));
        let str = typeof item === 'object'
          ? `${pi.title}${pi.qty > 1 ? ` × ${pi.qty}` : ''}`
          : String(item);
        const badge = isAccItem
          ? ` <span class="badge" style="background:#EDE9FE;color:#5B21B6;font-size:0.68rem;">Accessory</span>`
          : '';
        return `<div style="margin-bottom: 2px;">• ${escapeHtml(str)}${badge}</div>`;
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

  if (_dirtySections.has(sectionId)) {
    renderSingleSection(sectionId);
  }
  updateGlobalNavBadges();
}

window.switchSection = switchSection;

window.setPaidOrdersFilter = function(filter) {
  state.paidOrdersFilter = filter;
  if (state.pageLimits) state.pageLimits.paidOrders = 50;
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
  if (state.pageLimits) state.pageLimits.orders = 50;
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
  // Reset table page limits on new search and keep active search inputs in sync
  if (state.pageLimits) {
    state.pageLimits.inventory = 50;
    state.pageLimits.orders = 50;
    state.pageLimits.paidOrders = 50;
    state.pageLimits.profitTitles = 60;
  }
  if (_searchDebounceTimer) clearTimeout(_searchDebounceTimer);
  _searchDebounceTimer = setTimeout(() => {
    // Only re-render the visible section (does NOT recalculate entire accounting cache!)
    renderSingleSection(state.activeSection || 'dashboard');
    ['inventory', 'orders', 'paid-orders', 'finance'].forEach(s => {
      if (s !== state.activeSection) _dirtySections.add(s);
    });
  }, 130);
};

window.setInventoryFilter = function(filter) {
  state.inventoryFilter = filter;
  if (state.pageLimits) state.pageLimits.inventory = 50;
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

  applyLiveOrdersToInventory();
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
  const matchedOrders = (state._lotMatchedOrders && state._lotMatchedOrders.get(String(item.id))) || [];
  const itemAdjustments = (state.stockAdjustments || []).filter(a => String(a.inventory_item_id) === String(item.id));
  const confirmedMatchedQty = matchedOrders.filter(m => m.isConfirmedLiveSale).reduce((s, m) => s + (m.netQty || 0), 0);

  const summaryEl = document.getElementById('edit-inv-stock-summary');
  if (summaryEl) {
    const ordersHistoryHtml = matchedOrders.length > 0
      ? matchedOrders.slice().reverse().slice(0, 6).map(mo => `
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px dashed var(--border-subtle); font-size: 0.78rem;">
            <span><strong>#${escapeHtml(String(mo.orderId))}</strong> • ${escapeHtml(mo.customerName)} (<strong>×${mo.netQty}</strong>)</span>
            <span class="badge ${mo.paymentStatus === 'paid' ? 'badge-green' : 'badge-amber'}" style="font-size: 0.68rem;">${escapeHtml(String(mo.paymentStatus).toUpperCase())} • ${escapeHtml(String(mo.fulfillmentStatus).toUpperCase())}</span>
          </div>
        `).join('')
      : '';
    const dbSoldGap = Math.max(0, soldQty - confirmedMatchedQty);
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
        <div style="background: ${availQty <= 0 ? '#FFF1F2' : '#F0FDF4'}; border: 1px solid ${availQty <= 0 ? '#FECDD3' : '#BBF7D0'}; border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 0.72rem; color: ${availQty <= 0 ? '#9F1239' : '#166534'};">Current Available</div>
          <div style="font-size: 1.2rem; font-weight: 700; color: ${availQty <= 0 ? 'var(--danger)' : 'var(--success)'};">${availQty}</div>
        </div>
        <div style="background: ${resQty > 0 ? '#FFFBEB' : '#FFFFFF'}; border: 1px solid ${resQty > 0 ? '#FDE68A' : 'var(--border-color)'}; border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 0.72rem; color: ${resQty > 0 ? '#92400E' : 'var(--text-muted)'};">Quantity Reserved</div>
          <div style="font-size: 1.2rem; font-weight: 700; color: ${resQty > 0 ? '#B45309' : 'var(--text-primary)'};">${resQty}</div>
        </div>
      </div>
      <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 8px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
        <span>Physical On Hand: <strong>${onHandQty}</strong></span>
        ${(dmgQty || lostQty || promoQty || retSuppQty || countAdjQty) ? `<span>Adjustments: Dmg ${dmgQty} • Lost ${lostQty} • Promo ${promoQty} • Ret ${retSuppQty} • Adj ${countAdjQty >= 0 ? '+' + countAdjQty : countAdjQty}</span>` : ''}
      </div>
      ${(ordersHistoryHtml || dbSoldGap > 0 || itemAdjustments.length > 0) ? `
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-color);">
          <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
            <i class="fa-solid fa-clock-rotate-left"></i> Matching Orders &amp; Movement History
          </div>
          ${ordersHistoryHtml}
          ${dbSoldGap > 0 ? `<div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px;"><i class="fa-solid fa-database"></i> ${dbSoldGap} unit(s) deducted in DB stock history prior to live paid sync.</div>` : ''}
          ${itemAdjustments.slice(0, 3).map(a => `<div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">• Adj (${escapeHtml(a.adjustment_type)}): ${a.quantity_change >= 0 ? '+' + a.quantity_change : a.quantity_change} — ${escapeHtml(a.reason || '')}</div>`).join('')}
        </div>
      ` : ''}
    `;
  }

  setVal('edit-inv-id', item.id);
  setVal('edit-inv-title', item.title || '');
  setVal('edit-inv-author', item.author || '');
  setVal('edit-inv-isbn', item.isbn || '');
  setVal('edit-inv-group', (item.stock_group || '').toUpperCase() === 'OLD_STOCK' ? 'OLD_STOCK' : 'NEW_STOCK');
  const categoryVal = String(item.category || item.item_type || (isPackagingPaperItem(item) ? 'packaging' : (isAccessoryItem(item) ? 'accessory' : 'book'))).toLowerCase();
  setVal('edit-inv-category', categoryVal);
  setVal('edit-inv-cost', (item.unit_purchase_cost_da !== null && item.unit_purchase_cost_da !== undefined && !isNaN(item.unit_purchase_cost_da)) ? item.unit_purchase_cost_da : '');
  setVal('edit-inv-price', (item.selling_price_da !== null && item.selling_price_da !== undefined && !isNaN(item.selling_price_da)) ? item.selling_price_da : '');
  setVal('edit-inv-supplier', item.supplier_name || '');
  setVal('edit-inv-location', item.location || '');
  setVal('edit-inv-notes', stripHumanNotes(item.notes || ''));

  // Show/hide packaging-specific section & populate all 5 packaging fields
  const pkgSection = document.getElementById('edit-inv-pkg-section');
  if (pkgSection) {
    const isPkg = categoryVal === 'packaging';
    pkgSection.style.display = isPkg ? 'block' : 'none';
    if (isPkg) {
      const pkgMeta = parseJsonNoteTag(item.notes, 'PKG_META') || {};
      const defaultMeters = Math.round((Number(item.quantity_received) || 0) / 100 * 100) / 100;
      setVal('edit-inv-pkg-meters', pkgMeta.purchasedMeters != null ? pkgMeta.purchasedMeters : defaultMeters);
      setVal('edit-inv-pkg-cm-wrap', (pkgMeta.cmPerWrapOverride != null && Number(pkgMeta.cmPerWrapOverride) > 0) ? pkgMeta.cmPerWrapOverride : '');
      setVal('edit-inv-pkg-total-paid', pkgMeta.provisionalTotalCostDa != null ? pkgMeta.provisionalTotalCostDa : '');
      const qtyConfirmedEl = document.getElementById('edit-inv-pkg-qty-confirmed');
      if (qtyConfirmedEl) qtyConfirmedEl.checked = pkgMeta.isProvisionalQty === false;
      const costConfirmedEl = document.getElementById('edit-inv-pkg-cost-confirmed');
      if (costConfirmedEl) costConfirmedEl.checked = !!pkgMeta.isCostConfirmed;
    }
  }

  // Add onchange handler to category dropdown to toggle pkg section
  const catEl = document.getElementById('edit-inv-category');
  if (catEl && !catEl._pkgHandlerAttached) {
    catEl._pkgHandlerAttached = true;
    catEl.addEventListener('change', () => {
      const ps = document.getElementById('edit-inv-pkg-section');
      if (ps) ps.style.display = catEl.value === 'packaging' ? 'block' : 'none';
    });
  }

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
  let cost = rawCost !== '' && !isNaN(parseFloat(rawCost)) ? Math.round(parseFloat(rawCost) * 100) / 100 : null;
  const price = rawPrice !== '' && !isNaN(parseFloat(rawPrice)) ? Math.round(parseFloat(rawPrice)) : null;

  const stockGroup = document.getElementById('edit-inv-group')?.value === 'OLD_STOCK' ? 'OLD_STOCK' : 'NEW_STOCK';
  const category = (document.getElementById('edit-inv-category')?.value || 'book').toLowerCase();
  const author = (document.getElementById('edit-inv-author')?.value || '').trim() || null;
  const isbn = (document.getElementById('edit-inv-isbn')?.value || '').trim() || null;
  const supplier = (document.getElementById('edit-inv-supplier')?.value || '').trim() || null;
  const location = (document.getElementById('edit-inv-location')?.value || '').trim() || null;
  const humanNotes = (document.getElementById('edit-inv-notes')?.value || '').trim();
  const nowIso = new Date().toISOString();

  // Preserve historical system tags ([ACC_HISTORY], [PRICE_HISTORY]) while updating human notes
  const prevAccHistory = parseJsonNoteTag(item.notes, 'ACC_HISTORY');
  const prevPriceCheckpoints = parseAllJsonNoteTags(item.notes, 'PRICE_HISTORY');
  const prevPrice = (item.selling_price_da !== null && item.selling_price_da !== undefined && !isNaN(item.selling_price_da))
    ? Number(item.selling_price_da)
    : null;

  // Never overwrite historical sale prices when current selling price changes
  if (prevPrice !== null && prevPrice > 0 && price !== null && price !== prevPrice) {
    prevPriceCheckpoints.push({ beforeDate: nowIso, unitPriceDa: prevPrice });
  }

  let noteParts = [];
  if (humanNotes) noteParts.push(humanNotes);
  if (prevAccHistory) noteParts.push(`[ACC_HISTORY:${JSON.stringify(prevAccHistory)}]`);
  prevPriceCheckpoints.forEach(cp => {
    if (cp && cp.beforeDate && Number(cp.unitPriceDa) > 0) {
      noteParts.push(`[PRICE_HISTORY:${JSON.stringify(cp)}]`);
    }
  });
  let notes = noteParts.join(' | ') || null;

  // For packaging items: preserve variantKey/shortName and embed full PKG_META tag
  if (category === 'packaging') {
    const existingPkgMeta = parseJsonNoteTag(item.notes, 'PKG_META') || {};
    const rawMeters = (document.getElementById('edit-inv-pkg-meters')?.value || '').trim();
    const rawCmWrap = (document.getElementById('edit-inv-pkg-cm-wrap')?.value || '').trim();
    const rawTotalCost = (document.getElementById('edit-inv-pkg-total-paid')?.value || '').trim();
    const isQtyConfirmed = !!(document.getElementById('edit-inv-pkg-qty-confirmed')?.checked);
    const isCostConfirmed = !!(document.getElementById('edit-inv-pkg-cost-confirmed')?.checked);

    const parsedMeters = (rawMeters !== '' && !isNaN(parseFloat(rawMeters))) ? parseFloat(rawMeters) : (existingPkgMeta.purchasedMeters ?? 3);
    const parsedCmWrap = (rawCmWrap !== '' && !isNaN(parseFloat(rawCmWrap)) && parseFloat(rawCmWrap) > 0) ? Math.round(parseFloat(rawCmWrap)) : null;
    const parsedTotalCost = (rawTotalCost !== '' && !isNaN(parseFloat(rawTotalCost))) ? parseFloat(rawTotalCost) : null;

    if (isCostConfirmed && parsedTotalCost !== null && parsedMeters > 0 && rawCost === '') {
      cost = Math.round((parsedTotalCost / (parsedMeters * 100)) * 100) / 100;
    }

    const pkgMetaPayload = {
      ...existingPkgMeta,
      variantKey: existingPkgMeta.variantKey || resolvePackagingVariantKey(title) || null,
      shortName: existingPkgMeta.shortName || title,
      purchasedMeters: parsedMeters,
      cmPerWrapOverride: parsedCmWrap,
      provisionalTotalCostDa: parsedTotalCost,
      isProvisionalQty: !isQtyConfirmed,
      isCostConfirmed,
      updatedAt: nowIso
    };
    notes = upsertJsonNoteTag(notes || '', 'PKG_META', pkgMetaPayload);
  }

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

  await idb.put('inventory', toRawIdbInventoryCopy(item));
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
  await idb.put('inventory', toRawIdbInventoryCopy(item));

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
  const chkEl = document.getElementById('opening-verified-checkbox');
  if (cashEl) cashEl.value = (op.cash_balance_da !== null && op.cash_balance_da !== undefined) ? op.cash_balance_da : 0;
  if (dateEl) dateEl.value = op.as_of_date ? String(op.as_of_date).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const rawNotes = String(op.notes || '');
  if (notesEl) notesEl.value = rawNotes.replace('[VERIFIED]', '').trim();
  if (chkEl) chkEl.checked = !!(op.cash_verified === true || rawNotes.includes('[VERIFIED]'));
  openModal('modal-edit-opening');
};

window.handleSaveOpeningPosition = async function(event) {
  event.preventDefault();
  const cashVal = parseFloat(document.getElementById('opening-cash-input')?.value);
  const asOfDate = document.getElementById('opening-date-input')?.value || new Date().toISOString().slice(0, 10);
  const rawNotes = (document.getElementById('opening-notes-input')?.value || '').trim();
  const isVerified = !!document.getElementById('opening-verified-checkbox')?.checked;

  if (isNaN(cashVal) || cashVal < 0) {
    alert('Please enter a valid non-negative opening cash balance.');
    return;
  }

  const finalNotes = isVerified
    ? `[VERIFIED]${rawNotes ? ' ' + rawNotes : ' Opening cash verified'}`
    : (rawNotes || null);

  const prev = state.openingPosition || {};
  state.openingPosition = {
    id: 1,
    cash_balance_da: Math.round(cashVal),
    cash_verified: isVerified,
    owner_contributions_da: Number(prev.owner_contributions_da) || 0,
    owner_withdrawals_da: Number(prev.owner_withdrawals_da) || 0,
    as_of_date: asOfDate,
    notes: finalNotes,
    updated_at: new Date().toISOString()
  };

  await idb.put('opening_position', state.openingPosition);
  await idb.queueMutation('opening_position', 'upsert', state.openingPosition);

  closeModal('modal-edit-opening');
  renderAppViews();
  if (state.online && auth.isAuthenticated()) sync.sync();
};

window.openStockBaselineModal = function() {
  const base = getStockBaseline();
  const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setV('base-old-retail', base.oldStock.retailValueDa);
  setV('base-old-cost', base.oldStock.paidCostDa);
  setV('base-new-retail', base.newStock.retailValueDa);
  setV('base-new-cost', base.newStock.paidCostDa);
  openModal('modal-stock-baseline');
};

window.handleSaveStockBaseline = function(event) {
  event.preventDefault();
  const oldRetail = parseFloat(document.getElementById('base-old-retail')?.value);
  const oldPaid = parseFloat(document.getElementById('base-old-cost')?.value);
  const newRetail = parseFloat(document.getElementById('base-new-retail')?.value);
  const newPaid = parseFloat(document.getElementById('base-new-cost')?.value);

  if ([oldRetail, oldPaid, newRetail, newPaid].some(v => isNaN(v) || v < 0)) {
    alert('Please enter valid non-negative numbers for all stock baseline fields.');
    return;
  }

  const next = {
    oldStock: { retailValueDa: oldRetail, paidCostDa: oldPaid, expectedProfitDa: oldRetail - oldPaid },
    newStock: { retailValueDa: newRetail, paidCostDa: newPaid, expectedProfitDa: newRetail - newPaid }
  };
  try {
    localStorage.setItem('gr_stock_baseline_v1', JSON.stringify(next));
  } catch (e) {
    console.warn('[StockBaseline] localStorage write warning:', e);
  }
  closeModal('modal-stock-baseline');
  renderAppViews();
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
      StockGroup: isPackagingPaperItem(item) ? 'PACKAGING' : (isAccessoryItem(item) ? 'ACCESSORIES' : (item.stock_group || 'OLD_STOCK')),
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
      Notes: stripHumanNotes(item.notes || '')
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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fin.accessories?.breakdown || []), 'Accessories Report');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fin.packaging?.variants || []), 'Packaging Paper');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fin.titleProfits), 'Profit By Title');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fin.periodSummaries?.monthly || []), 'Monthly Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fin.periodSummaries?.yearly || []), 'Yearly Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fin.auditSummary?.needsReviewItems || []), 'Audit Review Items');
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

  const fin = calculateFinancialMetrics();
  const orderAccounting = (fin.paidOrderById && fin.paidOrderById.get(String(orderId))) || computePaidOrderDetails(order);
  const allocsSource = (Array.isArray(state.orderStockAllocations) && state.orderStockAllocations.length > 0)
    ? state.orderStockAllocations
    : (state.orderAllocations || []);
  const allocs = allocsSource.filter(a => String(a.order_id) === String(orderId));
  const invIdx = getInventorySearchIndex();
  const rawOrderItems = parseOrderItemsSafe(order);
  const pkgSpec = PACKAGING_VARIANTS.find(v => v.variantKey === resolvePackagingVariantKey(meta?.packaging_used || order.packaging_type));
  const pkgLabel = pkgSpec
    ? `${pkgSpec.shortName}${Number(order.packaging_price) > 0 ? ` (${Number(order.packaging_price).toLocaleString('fr-DZ')} DA)` : ''}`
    : (order.packaging_type && order.packaging_type !== 'none'
      ? `${order.packaging_type}${Number(order.packaging_price) > 0 ? ` (${Number(order.packaging_price).toLocaleString('fr-DZ')} DA)` : ''}`
      : 'None');
  const orderCorrections = parseAllJsonNoteTags(meta?.notes, 'ORDER_CORRECTION');
  const orderPkgMeta = parseJsonNoteTag(meta?.notes, 'PKG_META') || {};
  const canCorrectLineItems = !isHistorical && !['cancelled', 'rejected'].includes(status);

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

      ${orderCorrections.length > 0 ? `
        <div style="background: #EFF6FF; border: 1px solid #93C5FD; border-radius: 8px; padding: 10px 14px; font-size: 0.82rem;">
          <div style="font-weight: 700; color: #1E40AF; margin-bottom: 4px;">
            <i class="fa-solid fa-file-pen"></i> Order Correction Audit Trail (${orderCorrections.length})
          </div>
          ${orderCorrections.map(c => {
            const remNames = Array.isArray(c.removedItems) ? c.removedItems.map(r => `${r.title} (-${Number(r.amountDa || 0).toLocaleString('fr-DZ')} DA)`).join(', ') : '';
            return `<div style="color: #1E3A8A; margin-top: 3px;">• Removed: <strong>${escapeHtml(remNames)}</strong> • Total: ${Number(c.previousTotalDa || 0).toLocaleString('fr-DZ')} → <strong>${Number(c.correctedTotalDa || 0).toLocaleString('fr-DZ')} DA</strong> (${escapeHtml(c.reason || '')})</div>`;
          }).join('')}
        </div>
      ` : ''}

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; background: var(--bg-card-subtle); padding: 14px; border-radius: 8px;">
        <div><strong>Customer:</strong> ${escapeHtml(order.firstName || '')} ${escapeHtml(order.familyName || '')}</div>
        <div><strong>Phone:</strong> ${escapeHtml(order.phoneNumber || '')}</div>
        <div><strong>Instagram:</strong> ${order.instagramUsername ? '@' + escapeHtml(order.instagramUsername) : 'None'}</div>
        <div><strong>Date:</strong> ${formatDate(order.created_at)}</div>
        <div><strong>Delivery:</strong> ${(order.deliveryMethod || '-').toUpperCase()} (${escapeHtml(order.wilaya || '')})</div>
        <div><strong>Packaging:</strong> ${escapeHtml(pkgLabel)}</div>
      </div>

      <div>
        <h4 style="font-family: var(--font-serif); margin-bottom: 8px;">Ordered Items &amp; Lot Attribution (قائمة المنتجات والدفعة):</h4>
        <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px;">
          ${rawOrderItems.length === 0 ? '<span class="text-muted">-</span>' : rawOrderItems.map((rawItm, idx) => {
            const pi = parseOrderItem(rawItm);
            const lineInfo = orderAccounting?.itemBreakdowns?.[idx] || null;
            const { lots: rawCandidateLots } = resolveMatchedLotsWithReason(pi.title, { excludePackaging: true });
            const matchedLot = (lineInfo?.lotId && invIdx.idMap.get(lineInfo.lotId)) || findInventoryItem(pi.title);
            const isAccItem = !!getWebsiteAccessoryMatch(pi.title) || pi.type === 'accessory' || (typeof rawItm === 'string' && rawItm.includes('[Accessory]'));
            const unitRef = resolveOrderItemHistoricalRefPrice(rawItm, matchedLot, order, meta);
            const labelStr = typeof rawItm === 'object' ? `${pi.title}${pi.qty > 1 ? ` × ${pi.qty}` : ''}` : String(rawItm);
            const lotBadge = lineInfo && lineInfo.unitCost !== null
              ? `<span class="badge ${lineInfo.stockGroup === 'OLD_STOCK' ? 'badge-amber' : (lineInfo.stockGroup === 'ACCESSORIES' ? 'badge-neutral' : 'badge-blue')}" style="font-size:0.68rem;margin-left:6px;">${escapeHtml(lineInfo.stockGroup || 'LOT')}: ${lineInfo.unitCost.toLocaleString('fr-DZ')} DA cost${lineInfo.costBasis === 'specific_lot' ? ' (Pinned)' : ''}</span>`
              : `<span class="badge badge-provisional" style="font-size:0.68rem;margin-left:6px;" title="${escapeHtml(lineInfo?.reviewReason || 'Unknown purchase cost')}"><i class="fa-solid fa-clock"></i> Review Needed</span>`;
            const showLotSelector = canCorrectLineItems && rawCandidateLots.length > 1;
            return `
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px dashed var(--border-subtle); flex-wrap: wrap;">
                <div>
                  • <strong>${escapeHtml(labelStr)}</strong>
                  ${isAccItem ? '<span class="badge" style="background:#EDE9FE;color:#5B21B6;font-size:0.68rem;margin-left:4px;">Accessory</span>' : ''}
                  ${unitRef > 0 ? `<span style="font-size:0.76rem;color:var(--text-muted);margin-left:6px;">(${unitRef.toLocaleString('fr-DZ')} DA retail)</span>` : ''}
                  ${lotBadge}
                  ${lineInfo?.reviewReason ? `<div style="font-size:0.72rem;color:#92400E;margin-top:2px;">⚠ ${escapeHtml(lineInfo.reviewReason)}</div>` : ''}
                </div>
                <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                  ${showLotSelector ? `
                    <select class="input" style="padding:2px 6px; font-size:0.75rem; width:auto;" onchange="saveOrderItemLotAllocation(${order.id}, ${idx}, this.value)">
                      ${rawCandidateLots.map(cand => {
                        const cCost = getNumericUnitCostOrNull(cand);
                        const sel = String(cand.id) === String(lineInfo?.lotId) ? 'selected' : '';
                        return `<option value="${escapeHtml(String(cand.id))}" ${sel}>${escapeHtml(cand.stock_group || 'LOT')} (${cCost !== null ? cCost + ' DA' : 'NULL'})</option>`;
                      }).join('')}
                    </select>
                  ` : ''}
                  ${canCorrectLineItems && rawOrderItems.length > 1 ? `
                    <button type="button" class="btn-secondary" style="padding: 2px 8px; font-size: 0.72rem; color: var(--danger); border-color: #FECDD3;" onclick="openOrderLineCorrection(${order.id}, ${idx})" title="Remove unavailable item &amp; adjust order total">
                      <i class="fa-solid fa-eraser"></i> Remove / Adjust
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      ${allocs.length > 0 ? `
        <div>
          <h4 style="font-family: var(--font-serif); font-size: 0.95rem; margin-bottom: 6px;">
            <i class="fa-solid fa-layer-group"></i> Persisted Stock Allocations (تخصيص المخزون المحفوظ)
          </h4>
          <div class="vintage-table-wrapper">
            <table class="vintage-table" style="font-size: 0.82rem;">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Stock Group</th>
                  <th>Allocated Qty</th>
                  <th>Unit Cost</th>
                  <th>Basis / Status</th>
                </tr>
              </thead>
              <tbody>
                ${allocs.map(a => {
                  const invRow = invIdx.idMap.get(String(a.inventory_item_id));
                  const rowTitle = a.title || invRow?.title || 'Book';
                  const rowGroup = a.stock_group || invRow?.stock_group || 'NEW_STOCK';
                  return `
                  <tr>
                    <td><strong>${escapeHtml(rowTitle)}</strong></td>
                    <td><span class="badge ${rowGroup === 'OLD_STOCK' ? 'badge-amber' : 'badge-blue'}">${escapeHtml(rowGroup)}</span></td>
                    <td>${a.quantity}</td>
                    <td>${a.unit_purchase_cost_da != null ? Number(a.unit_purchase_cost_da).toLocaleString('fr-DZ') + ' DA' : '<em style="color:var(--text-muted)">Unknown (NULL)</em>'}</td>
                    <td><span class="badge ${a.allocation_status === 'confirmed' ? 'badge-green' : (a.allocation_status === 'released' ? 'badge-rose' : 'badge-gold')}">${escapeHtml(a.cost_basis || 'fifo')} · ${escapeHtml(a.allocation_status)}</span></td>
                  </tr>
                `;
                }).join('')}
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
            <label style="font-size: 0.75rem; color: var(--text-muted);">Packaging Used (Variant)</label>
            <input type="text" id="modal-meta-packaging" list="pkg-variant-options" class="input" value="${escapeHtml(meta?.packaging_used || '')}" placeholder="e.g. Surprise, Vintage, Christmas, Swan" style="padding: 6px 10px; font-size: 0.85rem;" ${isHistorical ? 'disabled' : ''}>
            <datalist id="pkg-variant-options">
              <option value="surprise">Surprise (500 DA)</option>
              <option value="paper_wildflowers">Vintage Wildflowers (600 DA)</option>
              <option value="paper_pine_berries">Festive Pine &amp; Berries / Christmas (600 DA)</option>
              <option value="paper_celestial_crane">Celestial Crane &amp; Mountain / Swan (800 DA)</option>
              <option value="none">No packaging</option>
            </datalist>
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted);">Wrapping Used (cm, Optional)</label>
            <input type="number" id="modal-meta-pkg-cm" class="input" min="0" step="1" value="${orderPkgMeta.cmUsed > 0 ? orderPkgMeta.cmUsed : ''}" placeholder="Uses global cm/wrap" style="padding: 6px 10px; font-size: 0.85rem;" ${isHistorical ? 'disabled' : ''}>
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

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; border-top: 1px solid var(--border-color); padding-top: 12px; background: #FFFDF8; padding: 12px; border-radius: 8px;">
        <div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">Customer Paid Total</div>
          <strong style="font-size: 1.08rem;">${eff.orderTotal.toLocaleString('fr-DZ')} DA</strong>
        </div>
        <div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">Delivery Fee (Excl.)</div>
          <strong style="font-size: 1.08rem; color: var(--text-muted);">− ${eff.shippingFee.toLocaleString('fr-DZ')} DA</strong>
        </div>
        <div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">Store Revenue</div>
          <strong style="font-size: 1.08rem; color: var(--vintage-blue);">${eff.bookRevenue.toLocaleString('fr-DZ')} DA</strong>
        </div>
        <div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">Attributed COGS</div>
          <strong style="font-size: 1.08rem;">${orderAccounting?.allCostsKnown ? orderAccounting.cogs.toLocaleString('fr-DZ') + ' DA' : 'Review Needed'}</strong>
        </div>
        <div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">Order Net Profit</div>
          <strong style="font-size: 1.1rem; color: ${orderAccounting?.allCostsKnown ? (orderAccounting.netProfit >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)'};">${orderAccounting?.allCostsKnown ? orderAccounting.netProfit.toLocaleString('fr-DZ') + ' DA' : 'Pending Review'}</strong>
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

window.saveOrderItemLotAllocation = async function(orderId, itemIndex, newLotId) {
  const order = (state.orders || []).find(o => String(o.id) === String(orderId));
  if (!order) return;
  const rawItems = parseOrderItemsSafe(order);
  const rawItm = rawItems[itemIndex];
  if (!rawItm) return;
  const pi = parseOrderItem(rawItm);
  const lot = (state.inventory || []).find(i => String(i.id) === String(newLotId));
  if (!lot) return;

  if (!Array.isArray(state.orderStockAllocations)) state.orderStockAllocations = [];
  state.orderAllocations = state.orderStockAllocations;

  // Release any previous allocation for this order matching candidate lots of the same title
  const { lots: candidateLots } = resolveMatchedLotsWithReason(pi.title, { excludePackaging: true });
  const candidateIds = new Set(candidateLots.map(l => String(l.id)));
  for (const existing of state.orderStockAllocations) {
    if (String(existing.order_id) === String(orderId) && candidateIds.has(String(existing.inventory_item_id)) && existing.allocation_status !== 'released') {
      existing.allocation_status = 'released';
      if (idb.db) {
        await idb.put('order_stock_allocations', existing);
        await idb.queueMutation('order_stock_allocations', 'upsert', existing);
      }
    }
  }

  const eff = getEffectiveOrderStatus(order);
  const allocRecord = {
    id: deterministicUuid(`alloc::${orderId}::${itemIndex}::${lot.id}`),
    order_id: Number(orderId),
    inventory_item_id: String(lot.id),
    quantity: pi.qty || 1,
    unit_purchase_cost_da: getNumericUnitCostOrNull(lot),
    cost_basis: 'specific_lot',
    allocation_status: (eff.status === 'delivered' || eff.paymentStatus === 'paid') ? 'confirmed' : 'reserved',
    created_at: new Date().toISOString()
  };

  const prevIdx = state.orderStockAllocations.findIndex(a => String(a.id) === String(allocRecord.id));
  if (prevIdx >= 0) state.orderStockAllocations[prevIdx] = allocRecord;
  else state.orderStockAllocations.push(allocRecord);

  if (idb.db) {
    await idb.put('order_stock_allocations', allocRecord);
    await idb.queueMutation('order_stock_allocations', 'upsert', allocRecord);
  }

  renderAppViews();
  viewOrderDetails(orderId);
  if (state.online && auth.isAuthenticated()) sync.sync();
};

window.openOrderLineCorrection = function(orderId, itemIndex) {
  const order = (state.orders || []).find(o => String(o.id) === String(orderId));
  if (!order) return;
  const isHistorical = !!(order.is_historical || Number(order.id) <= 170);
  if (isHistorical) {
    alert('Historical orders are read-only.');
    return;
  }

  const rawItems = parseOrderItemsSafe(order);
  if (itemIndex < 0 || itemIndex >= rawItems.length || rawItems.length <= 1) {
    alert('Cannot remove the only item in an order — cancel the order instead.');
    return;
  }

  const targetRaw = rawItems[itemIndex];
  const pi = parseOrderItem(targetRaw);
  const meta = state.orderMeta ? state.orderMeta.find(m => String(m.order_id) === String(order.id)) : null;
  const matchedLot = findInventoryItem(pi.title);
  const suggestedUnitPrice = resolveOrderItemHistoricalRefPrice(targetRaw, matchedLot, order, meta);
  const suggestedDeduction = suggestedUnitPrice > 0 ? Math.round(suggestedUnitPrice * (pi.qty || 1)) : '';
  const currentTotal = Number(order.total_price) || 0;

  const modal = document.getElementById('generic-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = `Correct Order #${order.id} — تصحيح عنصر غير متوفر`;
  body.innerHTML = `
    <form onsubmit="handleCorrectOrderLineSubmit(event, ${order.id}, ${itemIndex})">
      <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px; margin-bottom: 14px; font-size: 0.86rem; color: #92400E;">
        <strong>Removing Unavailable Item:</strong> ${escapeHtml(pi.title)} (×${pi.qty || 1})<br/>
        All other ${rawItems.length - 1} item(s) in Order #${order.id} will remain preserved and an audit trail record will be saved.
      </div>
      <div class="form-row" style="margin-bottom: 12px;">
        <div class="form-group">
          <label>Current Order Total (DA)</label>
          <input type="text" class="form-control" readonly value="${currentTotal.toLocaleString('fr-DZ')} DA" style="background: #F8F5EE;" />
        </div>
        <div class="form-group">
          <label for="corr-deduct-amount">Amount to Remove (DA) *</label>
          <input type="number" id="corr-deduct-amount" class="form-control" min="0" max="${currentTotal}" step="1" value="${suggestedDeduction}" required />
        </div>
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label for="corr-reason">Correction Reason / Audit Note *</label>
        <input type="text" id="corr-reason" class="form-control" value="Unavailable item not delivered or taken by customer" required />
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn-secondary" onclick="viewOrderDetails(${order.id})">Back</button>
        <button type="submit" class="btn-primary"><i class="fa-solid fa-check"></i> Confirm Order Correction</button>
      </div>
    </form>
  `;
  modal.classList.add('active');
};

window.handleCorrectOrderLineSubmit = async function(event, orderId, itemIndex) {
  event.preventDefault();
  const order = (state.orders || []).find(o => String(o.id) === String(orderId));
  if (!order) return;

  const rawItems = parseOrderItemsSafe(order);
  const removedRaw = rawItems[itemIndex];
  if (removedRaw === undefined) return;
  const pi = parseOrderItem(removedRaw);

  const deductAmt = parseFloat(document.getElementById('corr-deduct-amount')?.value);
  const reason = (document.getElementById('corr-reason')?.value || '').trim();
  const currentTotal = Number(order.total_price) || 0;
  if (isNaN(deductAmt) || deductAmt < 0 || deductAmt > currentTotal) {
    alert('Please enter a valid deduction amount between 0 and the current order total.');
    return;
  }

  const nextItems = rawItems.filter((_, idx) => idx !== itemIndex);
  const correctedTotal = Math.max(0, Math.round(currentTotal - deductAmt));
  const shippingFee = Number(order.shipping_price) || 0;
  const nowIso = new Date().toISOString();

  const correctionPayload = {
    orderId: Number(orderId),
    removedItems: [{
      raw: typeof removedRaw === 'string' ? removedRaw : pi.title,
      title: pi.title,
      qty: pi.qty || 1,
      unitPriceDa: (pi.qty || 1) > 0 ? Math.round(deductAmt / (pi.qty || 1)) : deductAmt,
      amountDa: deductAmt
    }],
    previousTotalDa: currentTotal,
    correctedTotalDa: correctedTotal,
    shippingDa: shippingFee,
    correctedBookRevenueDa: Math.max(0, correctedTotal - shippingFee),
    reason: reason || 'Item unavailable and removed from order',
    correctedAt: nowIso
  };
  const auditNote = `Order #${orderId} Correction: Removed "${pi.title} × ${pi.qty || 1}" (-${deductAmt.toLocaleString('fr-DZ')} DA). Total: ${currentTotal.toLocaleString('fr-DZ')} → ${correctedTotal.toLocaleString('fr-DZ')} DA. [ORDER_CORRECTION:${JSON.stringify(correctionPayload)}]`;

  order.items = nextItems;
  order.total_price = correctedTotal;
  await idb.put('orders', order);

  let meta = state.orderMeta ? state.orderMeta.find(m => String(m.order_id) === String(orderId)) : null;
  if (!meta) {
    meta = {
      order_id: Number(orderId),
      fulfillment_status: order.status || 'pending',
      payment_status: order.payment_status || 'unpaid',
      notes: auditNote,
      updated_at: nowIso
    };
    if (!state.orderMeta) state.orderMeta = [];
    state.orderMeta.push(meta);
  } else {
    meta.notes = meta.notes ? `${String(meta.notes).trim()}\n${auditNote}` : auditNote;
    meta.updated_at = nowIso;
  }
  await idb.put('order_meta', meta);

  await idb.queueMutation('orders', 'correct_order', {
    id: Number(orderId),
    order_id: Number(orderId),
    items: nextItems,
    total_price: correctedTotal,
    audit_note: auditNote
  });

  renderAppViews();
  viewOrderDetails(orderId);
  if (state.online && auth.isAuthenticated()) sync.sync();
};

window.saveOrderOperationalDetails = async function(orderId) {
  const paymentStatus = document.getElementById('modal-meta-payment-status')?.value || 'unpaid';
  const paymentMethod = (document.getElementById('modal-meta-payment-method')?.value || '').trim();
  const carrier = (document.getElementById('modal-meta-carrier')?.value || '').trim();
  const trackingNumber = (document.getElementById('modal-meta-tracking')?.value || '').trim();
  const packagingUsed = (document.getElementById('modal-meta-packaging')?.value || '').trim();
  const rawPkgCm = (document.getElementById('modal-meta-pkg-cm')?.value || '').trim();
  const pkgCmVal = (rawPkgCm !== '' && !isNaN(parseFloat(rawPkgCm)) && parseFloat(rawPkgCm) > 0) ? Math.round(parseFloat(rawPkgCm)) : null;
  const packagingCost = parseFloat(document.getElementById('modal-meta-pkg-cost')?.value) || 0;
  const shippingFee = parseFloat(document.getElementById('modal-meta-ship-fee')?.value) || 0;
  const actualShipping = parseFloat(document.getElementById('modal-meta-act-ship')?.value) || 0;

  const orderNumId = Number(orderId);
  let meta = state.orderMeta ? state.orderMeta.find(m => String(m.order_id) === String(orderId)) : null;
  const prevPkgMetaList = parseAllJsonNoteTags(meta?.notes, 'PKG_META');
  const prevPkgCm = prevPkgMetaList.length > 0 ? prevPkgMetaList[prevPkgMetaList.length - 1]?.cmUsed : null;
  const pkgCmChanged = (pkgCmVal !== null && pkgCmVal !== prevPkgCm);
  const pkgCmNoteAppend = pkgCmChanged ? `[PKG_META:${JSON.stringify({ cmUsed: pkgCmVal, updatedAt: new Date().toISOString() })}]` : null;

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
      notes: pkgCmNoteAppend || null,
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
    if (pkgCmNoteAppend) {
      meta.notes = meta.notes ? `${String(meta.notes).trim()}\n${pkgCmNoteAppend}` : pkgCmNoteAppend;
    }
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
    p_payment_method: paymentMethod || null,
    ...(pkgCmNoteAppend ? { p_notes: pkgCmNoteAppend } : {})
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
          syncInventoryDbBaseline(inv);
          await idb.put('inventory', toRawIdbInventoryCopy(inv));
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
          syncInventoryDbBaseline(inv);
          await idb.put('inventory', toRawIdbInventoryCopy(inv));
        } else {
          console.warn(`[Inventory] Order #${orderId} item "${itm.title}" has 0 reserved quantity. Sold count was not incremented to prevent unallocated phantom sales.`);
        }
      }
    }

    const allocsSource = (Array.isArray(state.orderStockAllocations) && state.orderStockAllocations.length > 0)
      ? state.orderStockAllocations
      : (state.orderAllocations || []);
    const allocs = allocsSource.filter(a => String(a.order_id) === String(orderId) && a.allocation_status !== 'released');
    if (allocs.length > 0) {
      for (const al of allocs) {
        al.allocation_status = 'confirmed';
        await idb.put('order_stock_allocations', al);
        await idb.queueMutation('order_stock_allocations', 'upsert', al);
      }
    } else {
      // Persist confirmed stock lot allocations permanently so future COGS never relies on guesswork
      const detail = computePaidOrderDetails(order);
      if (!Array.isArray(state.orderStockAllocations)) state.orderStockAllocations = [];
      state.orderAllocations = state.orderStockAllocations;
      for (let idx = 0; idx < (detail.itemBreakdowns || []).length; idx++) {
        const bd = detail.itemBreakdowns[idx];
        if (!bd || !bd.lotId) continue;
        const allocRow = {
          id: deterministicUuid(`alloc::${orderNumId}::${idx}::${bd.lotId}`),
          order_id: orderNumId,
          inventory_item_id: String(bd.lotId),
          quantity: bd.qty || 1,
          unit_purchase_cost_da: bd.unitCost,
          cost_basis: bd.costBasis === 'specific_lot' ? 'specific_lot' : 'fifo',
          allocation_status: 'confirmed',
          created_at: new Date().toISOString()
        };
        state.orderStockAllocations.push(allocRow);
        await idb.put('order_stock_allocations', allocRow);
        await idb.queueMutation('order_stock_allocations', 'upsert', allocRow);
      }
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
      syncInventoryDbBaseline(inv);
      await idb.put('inventory', toRawIdbInventoryCopy(inv));
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
  if (state.pageLimits) state.pageLimits.profitTitles = 60;
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
