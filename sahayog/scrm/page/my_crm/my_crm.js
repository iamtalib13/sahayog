// ========================================
// WHATSAPP-INSPIRED CRM - COMPLETE & BUG-FREE
// ========================================

frappe.pages["my-crm"].on_page_load = function (wrapper) {
  frappe.ui.make_app_page({
    parent: wrapper,
    title: "My CRM",
    single_column: true,
  });
  new MyCRM(wrapper);
  src="/assets/sahayog/js/petite-vue.iife.js"

};

class MyCRM {
  constructor(wrapper) {
    this.page = wrapper.page;
    this.wrapper = $(wrapper).find(".page-content");
    this.currentUser = frappe.session.user;

    this.cache = {
      lead: {
        data: [],
        totalCount: 0,
        timestamp: null,
        ttl: 5 * 60 * 1000,
        searches: new Map(),
      },
      appointment: {
        data: [],
        totalCount: 0,
        timestamp: null,
        ttl: 5 * 60 * 1000,
        searches: new Map(),
      },
      userLeadNames: { data: [], timestamp: null, ttl: 10 * 60 * 1000 },
    };

    const savedSection = sessionStorage.getItem("mycrm_active_tab") || "lead";

    this.state = {
      section: savedSection,
      filter: "All",
      search: "",
      data: [],
      filteredData: [],
      userLeadNames: [],
      offset: 0,
      limit: 50,
      hasMore: true,
      totalCount: 0,
      isMobile: window.innerWidth <= 768,
    };

    console.log("%c🚀 CRM Initialized", "color: #25d366; font-weight: bold;");

  // Petite-Vue bridge
  this.vue = null;
  this.vueMounted = false;


  // Petite-Vue shared reactive state
if (!window.mycrmVue) {
  window.mycrmVue = {
    section: "lead",
    search: "",
    leadCount: 0,
    appointmentCount: 0,
    cacheHit: false,
  };
}

    this.init();
  }

  async init() {
    this.detectMobile();
    this.setupPage();
    this.render();
    // 🟢 Petite-Vue init (after DOM render)
    this.initPetiteVue();
    // ✅ Restore last active tab after render
    this.switchSection(this.state.section);

    await this.loadUserLeads();
    await this.fetchData();
    this.setupRealtime();
    this.startCacheMonitoring();
    this.setupPWA();
    this.updateTabBadges();
  }

// Petite-Vue Initialization
initPetiteVue() {
  if (this.vueMounted || !window.PetiteVue) return;

  const crm = this; // preserve MyCRM reference

  this.vue = PetiteVue.createApp({
    // 🔗 Existing state (reactive UI binding)
    state: crm.state,

    // 🔍 Read-only helpers (UI ke liye)
    isLead() {
      return this.state.section === "lead";
    },

    isAppointment() {
      return this.state.section === "appointment";
    },

    hasData() {
      return this.state.filteredData.length > 0;
    },

    // 🔘 UI actions (bridge to existing logic)
    switchSection(section) {
      crm.switchSection(section);
    },

    applyFilter(filter) {
      crm.state.filter = filter;
      crm.applyFilter();
    },

    searchChanged(val) {
      crm.state.search = val;
      crm.applySearch?.();
    }
  });

  // 🧠 Mount on page-content (existing DOM)
  this.vue.mount(this.wrapper[0]);

  this.vueMounted = true;

  console.log(
    "%c🧩 Petite-Vue Mounted",
    "color:#42b883;font-weight:bold;"
  );
}

// Mobile Detection (Optimized + Debounced)
detectMobile() {
  let resizeTimer = null;

  const handleResize = () => {
    const wasMobile = this.state.isMobile;
    const isMobileNow = window.innerWidth <= 768;

    if (wasMobile !== isMobileNow) {
      this.state.isMobile = isMobileNow;

      // UI refresh only when breakpoint changes
      this.render();
      this.applyFilter?.();
    }
  };

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 150);
  });
}

// Cache Validation (Readable + Safe)
isCacheValid(key) {
  const cache = this.cache?.[key];
  if (!cache || !cache.timestamp) return false;

  const age = Date.now() - cache.timestamp;
  const isValid = age < cache.ttl;

  if (isValid) {
    console.debug(`✅ CACHE HIT → ${key}`, {
      age: `${Math.floor(age / 1000)}s`,
      records: cache.data?.length || 0,
    });
  }

  return isValid;
}

getCachedData(key) {
  return this.isCacheValid(key) ? this.cache[key].data : null;
}

// Cache Setter (Non-breaking)
setCacheData(key, data = [], totalCount = null) {
  if (!this.cache[key]) {
    this.cache[key] = {
      data: [],
      totalCount: 0,
      timestamp: null,
      ttl: 5 * 60 * 1000,
      searches: new Map(),
    };
  }

  const cache = this.cache[key];
  cache.data = data;
  cache.timestamp = Date.now();

  if (typeof totalCount === "number") {
    cache.totalCount = totalCount;
  }

  console.debug(`💾 CACHE UPDATED → ${key}`, {
    records: data.length,
  });
}

// Search Cache (Optimized)
getCachedSearch(section, term) {
  const cache = this.cache?.[section];
  if (!cache?.searches || !term) return null;

  const cached = cache.searches.get(term);
  if (!cached) return null;

  if (Date.now() - cached.timestamp < cache.ttl) {
    console.debug(`🔍 SEARCH CACHE HIT → "${term}"`);
    return cached.data;
  }

  // Auto cleanup expired search
  cache.searches.delete(term);
  return null;
}

setCachedSearch(section, term, data) {
  const cache = this.cache?.[section];
  if (!cache?.searches || !term) return;

  cache.searches.set(term, {
    data,
    timestamp: Date.now(),
  });

  // Keep cache size limited
  if (cache.searches.size > 20) {
    const oldestKey = cache.searches.keys().next().value;
    cache.searches.delete(oldestKey);
  }
}

// Cache Invalidator (Safer)
invalidateCache(section = null) {
  if (section && this.cache[section]) {
    this.cache[section].timestamp = null;
    this.cache[section].searches?.clear();
    return;
  }

  Object.values(this.cache).forEach((cache) => {
    cache.timestamp = null;
    cache.searches?.clear();
  });
}

// Cache Monitoring (Dev Friendly)
startCacheMonitoring() {
  setInterval(() => {
    console.groupCollapsed("📊 CRM Cache Stats");

    Object.entries(this.cache).forEach(([key, cache]) => {
      if (!cache.timestamp) return;

      const age = Math.floor((Date.now() - cache.timestamp) / 1000);
      console.log(`${key}`, {
        records: cache.data?.length || 0,
        age: `${age}s`,
      });
    });

    console.groupEnd();
  }, 30000);
}

// Page Setup (Petite-Vue Friendly)
setupPage() {
  this.page.set_title_sub("");
  this.page.clear_primary_action();
  this.page.clear_secondary_action();
  this.page.clear_actions();

  // Indicator reactive friendly
  this.page.set_indicator(
    this.state?.section === "appointment" ? "Appointment" : "Lead",
    "green"
  );
}

  render() {
    const isMobile = this.state.isMobile;

    this.wrapper.html(`
      <style>
        /* CSS Prefix: mycrm- to avoid conflicts */
        .mycrm-root {
          --mycrm-green: #25d366;
          --mycrm-green-dark: #128c7e;
          --mycrm-green-light: #dcf8c6;
          --mycrm-gray: #f0f2f5;
          --mycrm-gray-dark: #667781;
          --mycrm-white: #ffffff;
          --mycrm-teal: #00a884;
        }

        .page-content {
          overflow: hidden !important;
          height: calc(100vh - ${isMobile ? "100px" : "120px"});
          background: var(--mycrm-gray);
        }

        .mycrm-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--mycrm-white);
          position: relative;
        }

        .mycrm-tabs {
          background: var(--mycrm-white);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: ${isMobile ? "10px 16px" : "14px 20px"};
          border-bottom: 1px solid #e5e7eb;
          gap: ${isMobile ? "8px" : "16px"};
        }

        .mycrm-tab {
          padding: ${isMobile ? "6px 14px" : "8px 18px"};
          text-align: center;
          color: #6b7280;
          font-size: ${isMobile ? "13px" : "14px"};
          font-weight: 500;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
          border: none;
          background: none;
          border-radius: 6px;
        }

        .mycrm-tab:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .mycrm-tab.active {
          color: var(--mycrm-green-dark);
          background: var(--mycrm-green-light);
        }

        .mycrm-tab-badge {
          display: inline-block;
          background: #e5e7eb;
          color: #6b7280;
          padding: 2px 7px;
          border-radius: 10px;
          font-size: ${isMobile ? "10px" : "11px"};
          margin-left: 5px;
          font-weight: 600;
        }

        .mycrm-tab.active .mycrm-tab-badge {
          background: var(--mycrm-green-dark);
          color: white;
        }

        .mycrm-fab {
          position: fixed;
          bottom: ${isMobile ? "20px" : "30px"};
          right: ${isMobile ? "20px" : "30px"};
          padding: ${isMobile ? "12px 20px" : "14px 24px"};
          border-radius: ${isMobile ? "28px" : "32px"};
          background: linear-gradient(135deg, var(--mycrm-green) 0%, var(--mycrm-teal) 100%);
          color: white;
          border: none;
          box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4), 0 8px 24px rgba(0,0,0,0.15);
          cursor: pointer;
          font-size: ${isMobile ? "14px" : "15px"};
          font-weight: 600;
          transition: all 0.3s;
          z-index: 1000;
          animation: mycrm-fabPulse 2s infinite;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mycrm-fab:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(37, 211, 102, 0.5), 0 12px 32px rgba(0,0,0,0.2);
        }

        .mycrm-fab:active {
          transform: translateY(-1px) scale(0.98);
        }

        @keyframes mycrm-fabPulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4), 0 8px 24px rgba(0,0,0,0.15);
          }
          50% {
            box-shadow: 0 4px 16px rgba(37, 211, 102, 0.6), 0 8px 32px rgba(0,0,0,0.2);
          }
        }

        .page-head .standard-actions {
          display: none !important;
        }

        .mycrm-search-bar {
          background: var(--mycrm-white);
          padding: ${isMobile ? "8px 12px" : "10px 16px"};
          border-bottom: 1px solid #e9edef;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mycrm-search-input {
          flex: 1;
          background: var(--mycrm-gray);
          border: none;
          border-radius: 8px;
          padding: ${isMobile ? "8px 12px" : "10px 14px"};
          font-size: 14px;
          outline: none;
        }

        .mycrm-search-input:focus {
          background: #e9edef;
        }

        .mycrm-filters {
          display: flex;
          gap: 8px;
          padding: ${isMobile ? "8px 12px" : "10px 16px"};
          background: var(--mycrm-white);
          border-bottom: 1px solid #e9edef;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .mycrm-filters::-webkit-scrollbar {
          display: none;
        }

        .mycrm-filter-chip {
          flex-shrink: 0;
          padding: ${isMobile ? "5px 12px" : "6px 16px"};
          border-radius: 16px;
          background: var(--mycrm-gray);
          border: none;
          font-size: ${isMobile ? "12px" : "13px"};
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .mycrm-filter-chip:hover {
          background: #e9edef;
        }

        .mycrm-filter-chip.active {
          background: var(--mycrm-green);
          color: white;
        }

        .mycrm-filter-chip .badge {
          margin-left: 6px;
          background: rgba(0,0,0,0.1);
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 11px;
        }

        .mycrm-filter-chip.active .badge {
          background: rgba(255,255,255,0.25);
          color: white;
        }

        .mycrm-list-container {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--mycrm-gray);
          padding-bottom: ${isMobile ? "80px" : "100px"};
        }

        .mycrm-list-item {
          background: var(--mycrm-white);
          padding: ${isMobile ? "10px 12px" : "12px 16px"};
          border-bottom: 1px solid #e9edef;
          cursor: pointer;
          transition: background 0.15s;
          display: flex;
          align-items: center;
          gap: ${isMobile ? "10px" : "12px"};
        }

        .mycrm-list-item:hover {
          background: #f5f6f6;
        }

        .mycrm-list-item:active {
          background: #e9edef;
        }

        .mycrm-avatar {
          flex-shrink: 0;
          width: ${isMobile ? "46px" : "50px"};
          height: ${isMobile ? "46px" : "50px"};
          border-radius: 50%;
          background: var(--mycrm-green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: ${isMobile ? "18px" : "20px"};
          color: var(--mycrm-green-dark);
        }

        .mycrm-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mycrm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .mycrm-name {
          font-size: ${isMobile ? "15px" : "17px"};
          font-weight: 500;
          color: #111b21;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mycrm-time {
          flex-shrink: 0;
          font-size: ${isMobile ? "11px" : "12px"};
          color: var(--mycrm-gray-dark);
        }

        .mycrm-message {
          font-size: ${isMobile ? "13px" : "14px"};
          color: var(--mycrm-gray-dark);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mycrm-status-badge {
          flex-shrink: 0;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: ${isMobile ? "10px" : "11px"};
          font-weight: 500;
        }

        .mycrm-status-badge.lead { background: #e3f2fd; color: #1976d2; }
        .mycrm-status-badge.follow-up { background: #fff3e0; color: #f57c00; }
        .mycrm-status-badge.converted { background: #e8f5e9; color: #388e3c; }
        .mycrm-status-badge.not-interested { background: #ffebee; color: #d32f2f; }
        .mycrm-status-badge.open { background: #fff3e0; color: #f57c00; }
        .mycrm-status-badge.closed { background: #e8f5e9; color: #388e3c; }

        .mycrm-count {
          position: sticky;
          top: 0;
          background: var(--mycrm-gray);
          padding: ${isMobile ? "5px 12px" : "6px 16px"};
          font-size: ${isMobile ? "11px" : "12px"};
          color: var(--mycrm-gray-dark);
          border-bottom: 1px solid #e9edef;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mycrm-loading {
          text-align: center;
          padding: ${isMobile ? "30px" : "40px"};
        }

        .mycrm-loading-spinner {
          width: ${isMobile ? "35px" : "40px"};
          height: ${isMobile ? "35px" : "40px"};
          border: 3px solid var(--mycrm-gray);
          border-top-color: var(--mycrm-green);
          border-radius: 50%;
          animation: mycrm-spin 1s linear infinite;
        }

        @keyframes mycrm-spin {
          to { transform: rotate(360deg); }
        }

        .mycrm-empty {
          text-align: center;
          padding: ${isMobile ? "40px 20px" : "60px 20px"};
        }

        .mycrm-empty-icon {
          font-size: ${isMobile ? "48px" : "64px"};
          color: #d1d8db;
          margin-bottom: ${isMobile ? "12px" : "16px"};
        }

        .mycrm-load-more {
          text-align: center;
          padding: 16px;
          background: var(--mycrm-white);
        }

        .mycrm-load-more-btn {
          background: var(--mycrm-green);
          color: white;
          border: none;
          padding: ${isMobile ? "8px 20px" : "10px 24px"};
          border-radius: 24px;
          font-size: ${isMobile ? "13px" : "14px"};
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .mycrm-load-more-btn:active {
          transform: scale(0.98);
        }

        .mycrm-reports {
          padding: ${isMobile ? "16px 12px" : "20px 16px"};
          background: var(--mycrm-white);
        }

        .mycrm-report-card {
          background: var(--mycrm-white);
          padding: ${isMobile ? "16px" : "20px"};
          border-radius: 12px;
          margin-bottom: 16px;
          border: 2px solid var(--mycrm-gray);
          cursor: pointer;
          transition: all 0.2s;
        }

        .mycrm-report-card:hover {
          border-color: var(--mycrm-green);
          box-shadow: 0 2px 8px rgba(37, 211, 102, 0.2);
        }

        .mycrm-report-card:active {
          transform: scale(0.98);
        }

        .mycrm-report-icon {
          font-size: ${isMobile ? "32px" : "40px"};
          margin-bottom: 12px;
        }

        .mycrm-report-title {
          font-size: ${isMobile ? "16px" : "18px"};
          font-weight: 600;
          color: #111b21;
          margin-bottom: 6px;
        }

        .mycrm-report-desc {
          font-size: ${isMobile ? "13px" : "14px"};
          color: var(--mycrm-gray-dark);
        }

        .mycrm-cache-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .cache-hit { background: var(--mycrm-green); }
        .cache-miss { background: #f59e0b; }

        .mycrm-scrollable {
          overflow-x: auto;
          white-space: nowrap;
          scrollbar-width: thin;
        }

        .mycrm-scrollable::-webkit-scrollbar {
          height: 4px;
        }

        .mycrm-scrollable::-webkit-scrollbar-thumb {
          background: #d1d8db;
          border-radius: 2px;
        }
      </style>

      <div class="mycrm-root mycrm-container" v-scope="mycrmVue">
        
        <div class="mycrm-tabs">
          <button class="mycrm-tab ${
            this.state.section === "lead" ? "active" : ""
          }" data-section="lead">
            Leads
            <span class="mycrm-tab-badge" id="mycrm-lead-count">0</span>
          </button>
          <button class="mycrm-tab ${
            this.state.section === "appointment" ? "active" : ""
          }" data-section="appointment">
            Appointments
            <span class="mycrm-tab-badge" id="mycrm-appointment-count">0</span>
          </button>
          <button class="mycrm-tab ${
            this.state.section === "reports" ? "active" : ""
          }" data-section="reports">
            Reports
          </button>
        </div>

        <div class="mycrm-search-bar" id="mycrm-search-bar">
          <i class="fa fa-search" style="color: var(--mycrm-gray-dark);"></i>
          <input 
            type="text" 
            class="mycrm-search-input" 
            id="mycrm-search"
            placeholder="Search name, mobile, email..."
          >
          <button id="mycrm-clear-search" style="display: none; background: none; border: none; cursor: pointer; color: var(--mycrm-gray-dark); padding: 4px 8px;">
            <i class="fa fa-times"></i>
          </button>
        </div>

        <div class="mycrm-filters" id="mycrm-filters"></div>

        <div class="mycrm-count" id="mycrm-count">
          <span id="mycrm-cache-indicator"></span>
          <span id="mycrm-count-text"></span>
        </div>

        <div id="mycrm-content-container" style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
          
          <div class="mycrm-list-container" id="mycrm-list-container">
            <div id="mycrm-list-body"></div>

            <div id="mycrm-loading" class="mycrm-loading" style="display: none;">
              <div class="mycrm-loading-spinner"></div>
              <p style="margin-top: 12px; color: var(--mycrm-gray-dark); font-size: ${
                isMobile ? "13px" : "14px"
              };">Loading...</p>
            </div>

            <div id="mycrm-empty" class="mycrm-empty" style="display: none;">
              <div class="mycrm-empty-icon">💬</div>
              <h4 style="color: var(--mycrm-gray-dark); margin-bottom: 8px; font-size: ${
                isMobile ? "15px" : "16px"
              };">No ${this.state.section}s found</h4>
              <p style="color: var(--mycrm-gray-dark); font-size: ${
                isMobile ? "13px" : "14px"
              };">
                ${
                  this.state.search
                    ? "Try different search terms"
                    : "Tap the + button to create"
                }
              </p>
            </div>

            <div id="mycrm-load-more" class="mycrm-load-more" style="display: none;">
              <button class="mycrm-load-more-btn" id="mycrm-load-more-btn">
                <i class="fa fa-arrow-down"></i> Load More
              </button>
            </div>
          </div>

          <div class="mycrm-list-container" id="mycrm-reports-container" style="display: none;">
            <div class="mycrm-reports" id="mycrm-reports-body"></div>
          </div>

        </div>

        <button class="mycrm-fab" id="mycrm-fab">
          <i class="fa fa-plus"></i>
          <span id="mycrm-fab-text">New Lead</span>
        </button>

      </div>
    `);

    this.attachEventListeners();
    // Petite-Vue reactive bridge (SAFE)
if (!window.mycrmVue) {
  window.mycrmVue = {
    section: this.state.section,
    search: this.state.search,
    isMobile: this.state.isMobile,
    leadCount: 0,
    appointmentCount: 0,
  };
}

// Sync state → vue (no override)
Object.assign(window.mycrmVue, {
  section: this.state.section,
  search: this.state.search,
  isMobile: this.state.isMobile,
});
// Mount Petite-Vue once
if (!this._vueMounted) {
  PetiteVue.createApp({ mycrmVue: window.mycrmVue }).mount();
  this._vueMounted = true;
}


    frappe.crm_app = this;
  }

  attachEventListeners() {
  $(".mycrm-tab").on("click", (e) => {
    const section = $(e.currentTarget).data("section");
    this.switchSection(section);

    // Vue sync
    window.mycrmVue.section = section;
  });

  $("#mycrm-search").on("input", (e) => {
    const val = $(e.target).val();
    $("#mycrm-clear-search").toggle(val.length > 0);

    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.state.search = val;
      window.mycrmVue.search = val; // 👈 sync
      this.state.offset = 0;

      if (this.state.section !== "reports") {
        this.fetchData();
      }
    }, 300);
  });

  $("#mycrm-clear-search").on("click", () => {
    $("#mycrm-search").val("");
    $("#mycrm-clear-search").hide();

    this.state.search = "";
    window.mycrmVue.search = ""; // 👈 sync
    this.state.offset = 0;

    if (this.state.section !== "reports") {
      this.fetchData();
    }
  });

  $("#mycrm-list-container").on("scroll", () => this.handleScroll());
  $("#mycrm-load-more-btn").on("click", () => this.loadMore());

  $("#mycrm-fab").on("click", () => {
    if (this.state.section === "lead") {
      this.createLead();
    } else if (this.state.section === "appointment") {
      this.createAppointment();
    } else {
      this.switchSection("lead");
      window.mycrmVue.section = "lead";
      setTimeout(() => this.createLead(), 100);
    }
  });
}

  async loadUserLeads() {
    console.group("%c👥 User Leads", "color: #128c7e; font-weight: bold;");

    const cached = this.getCachedData("userLeadNames");
    if (cached?.length > 0) {
      this.state.userLeadNames = cached;
      console.groupEnd();
      return;
    }

    const startTime = performance.now();

    const response = await frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Lead",
        fields: ["name"],
        filters: [["lead_owner", "=", this.currentUser]],
        limit_page_length: 0,
      },
    });

    const fetchTime = Math.round(performance.now() - startTime);

    this.state.userLeadNames = (response.message || []).map((d) => d.name);
    this.setCacheData("userLeadNames", this.state.userLeadNames);

    console.log(`⚡ ${fetchTime}ms`);
    console.groupEnd();
    this.state.userLeadNames = (response.message || []).map(d => d.name);
this.setCacheData("userLeadNames", this.state.userLeadNames);

// Vue sync (optional UI use)
window.mycrmVue.leadCount = this.state.userLeadNames.length;

  }

  async fetchData(append = false) {
    console.group(
      `%c📥 ${this.state.section}`,
      "color: #25d366; font-weight: bold;"
    );

    if (!append) {
      this.state.offset = 0;

      if (!this.state.search?.trim()) {
        const cached = this.getCachedData(this.state.section);
        if (cached?.length > 0) {
          this.state.data = cached;
          this.state.totalCount =
            this.cache[this.state.section].totalCount || cached.length;
          this.applyFilter();
          this.updateCacheIndicator(true);
          console.groupEnd();
          return;
        }
      } else {
        const cachedSearch = this.getCachedSearch(
          this.state.section,
          this.state.search
        );
        if (cachedSearch) {
          this.state.data = cachedSearch;
          this.state.totalCount = cachedSearch.length;
          this.applyFilter();
          this.updateCacheIndicator(true);
// 👇 ADD
window.mycrmVue.cacheHit = false;

// 👇 ADD COUNTS
if (this.state.section === "lead") {
  window.mycrmVue.leadCount = this.state.totalCount;
} else if (this.state.section === "appointment") {
  window.mycrmVue.appointmentCount = this.state.totalCount;
}
          console.groupEnd();
          return;
        }
      }

      this.showLoading();
    }

    const startTime = performance.now();

    try {
      await this.fetchTotalCount();

      if (this.state.section === "lead") {
        await this.fetchLeads(append);
      } else {
        await this.fetchAppointments(append);
      }

      const fetchTime = Math.round(performance.now() - startTime);
      console.log(`⚡ ${fetchTime}ms`);

      this.applyFilter();
      this.updateCacheIndicator(false, fetchTime);
    } catch (error) {
      console.error("❌ Error:", error);
      frappe.msgprint({
        title: "Error",
        indicator: "red",
        message: error.message,
      });
    } finally {
      this.hideLoading();
      console.groupEnd();
    }
  }

  async fetchTotalCount() {
  const filters = this.buildServerFilters();
  const or_filters = this.buildOrFilters();

  const doctype = this.state.section === "lead" ? "Lead" : "Appointment";

  const response = await frappe.call({
    method: "frappe.client.get_count",
    args: {
      doctype,
      filters,
      or_filters,
    },
  });

  this.state.totalCount = response.message || 0;

  // ✅ Petite-Vue sync (NO logic change)
  if (window.mycrmVue) {
    if (this.state.section === "lead") {
      window.mycrmVue.leadCount = this.state.totalCount;
    } else if (this.state.section === "appointment") {
      window.mycrmVue.appointmentCount = this.state.totalCount;
    }
  }
}

  buildServerFilters() {
    const filters = [];

    if (this.state.section === "lead") {
      filters.push(["lead_owner", "=", this.currentUser]);
    } else {
      if (this.state.userLeadNames.length > 0) {
        filters.push(["party", "in", this.state.userLeadNames]);
      }
    }

    return filters; // ❗ NO SEARCH HERE
  }
  buildOrFilters() {
    const s = this.state.search?.trim();
    if (!s) return [];

    if (this.state.section === "lead") {
      return [
        ["lead_name", "like", `%${s}%`],
        ["mobile_no", "like", `%${s}%`],
        ["first_name", "like", `%${s}%`],
        ["email_id", "like", `%${s}%`],
      ];
    }

    return [
      ["customer_name", "like", `%${s}%`],
      ["customer_phone_number", "like", `%${s}%`],
    ];
  }

  async fetchLeads(append = false) {
    const filters = this.buildServerFilters();
    const or_filters = this.buildOrFilters(); // ✅ ADD SEARCH FILTERS
    const response = await frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Lead",
        fields: [
          "name",
          "lead_name",
          "first_name",
          "last_name",
          "mobile_no",
          "email_id",
          "status",
          "source",
          "modified",
        ],
        filters: filters,
        or_filters, // ✅ ADD SEARCH FILTERS
        order_by: "modified desc",
        limit_start: this.state.offset,
        limit_page_length: this.state.limit,
      },
    });

    const newData = response.message || [];

    // Calculate total amount for each lead
    const leadsWithAmount = await Promise.all(
      newData.map(async (lead) => {
        const amountRes = await frappe.call({
          method: "frappe.client.get",
          args: {
            doctype: "Lead",
            name: lead.name,
            fields: ["custom_product_table"],
          },
        });

        let totalAmount = 0;
        if (amountRes.message && amountRes.message.custom_product_table) {
          amountRes.message.custom_product_table.forEach((item) => {
            totalAmount += parseFloat(item.product_amount || 0);
          });
        }

        return { ...lead, totalAmount };
      })
    );

    if (append) {
      this.state.data = [...this.state.data, ...leadsWithAmount];
    } else {
      this.state.data = leadsWithAmount;

      if (!this.state.search?.trim()) {
        this.setCacheData("lead", this.state.data, this.state.totalCount);
      } else {
        this.setCachedSearch("lead", this.state.search, this.state.data);
      }
    }

    this.state.hasMore = newData.length === this.state.limit;
    this.state.offset += newData.length;
  }

  async fetchAppointments(append = false) {
    if (this.state.userLeadNames.length === 0) {
      this.state.data = [];
      this.state.hasMore = false;
      return;
    }

    const filters = this.buildServerFilters();

    const response = await frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Appointment",
        fields: [
          "name",
          "customer_name",
          "customer_phone_number",
          "scheduled_time",
          "status",
          "party",
          "modified",
        ],
        filters: filters,
        order_by: "scheduled_time desc",
        limit_start: this.state.offset,
        limit_page_length: this.state.limit,
      },
    });

    const newData = response.message || [];

    if (append) {
      this.state.data = [...this.state.data, ...newData];
    } else {
      this.state.data = newData;

      if (!this.state.search?.trim()) {
        this.setCacheData(
          "appointment",
          this.state.data,
          this.state.totalCount
        );
      } else {
        this.setCachedSearch("appointment", this.state.search, this.state.data);
      }
    }

    this.state.hasMore = newData.length === this.state.limit;
    this.state.offset += newData.length;
  }

  updateCacheIndicator(fromCache, fetchTime = null) {
    const indicator = $("#mycrm-cache-indicator");

    if (fromCache) {
      indicator.html('<span class="mycrm-cache-dot cache-hit"></span>');
    } else if (fetchTime) {
      indicator.html(`<span class="mycrm-cache-dot cache-miss"></span>`);
    }
  }

  applyFilter() {
    let data = [...this.state.data];

    if (this.state.filter !== "All") {
      if (this.state.section === "appointment") {
        const now = frappe.datetime.now_datetime();
        const today = frappe.datetime.get_today();

        data = data.filter((item) => {
          switch (this.state.filter) {
            case "Today":
              const schedDate = frappe.datetime.str_to_obj(item.scheduled_time);
              return frappe.datetime.obj_to_str(schedDate) === today;
            case "Due":
              return item.scheduled_time < now && item.status !== "Closed";
            case "Upcoming":
              return item.scheduled_time > now && item.status !== "Closed";
            case "Open":
              return item.status === "Open";
            case "Closed":
              return item.status === "Closed";
            default:
              return true;
          }
        });
      } else {
        data = data.filter((item) => item.status === this.state.filter);
      }
    }

    this.state.filteredData = data;
    this.renderList();
    this.renderFilters();
    this.updateCount();

if (this.state.filter === "Assigned To Me") {
  if (!this.assignedLeadNames || !this.assignedLeadNames.length) {
    this.state.filteredData = [];
    this.state.activeFilter = this.state.filter;
    this.renderList();
    return;
  }

  this.state.filteredData = this.state.data.filter(lead =>
    this.assignedLeadNames.includes(lead.name)
  );

  this.state.activeFilter = this.state.filter;
  this.renderList();
  return;
}

  }

  renderFilters() {
    const container = $("#mycrm-filters");
    container.empty();

    const filters = this.getFilters();

    filters.forEach((f) => {
      const active = f.name === this.state.filter ? "active" : "";
      const chip = $(`
        <button class="mycrm-filter-chip ${active}">
          ${f.name} <span class="badge">${f.count}</span>
        </button>
      `);

      chip.on("click", () => {
        this.state.filter = f.name;
        this.applyFilter();
      });

      container.append(chip);
    });
  }

  getFilters() {
    if (this.state.section === "lead") {
      return [
        { name: "Assigned To Me", count: this.assignedCount || 0 },
        { name: "All", count: this.state.data.length },
        { name: "Lead", count: this.countStatus("Lead") },
        { name: "Follow Up", count: this.countStatus("Follow Up") },
        { name: "Converted", count: this.countStatus("Converted") },
        { name: "Not Interested", count: this.countStatus("Not Interested") },
      ];
    } else {
      return [
        { name: "All", count: this.state.data.length },
        { name: "Today", count: this.countToday() },
        { name: "Due", count: this.countDue() },
        { name: "Upcoming", count: this.countUpcoming() },
        { name: "Open", count: this.countStatus("Open") },
        { name: "Closed", count: this.countStatus("Closed") },
      ];
    }
  }

async fetchAssignedLeads() {
  const { message = [] } = await frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "ToDo",
      fields: ["reference_name", "assigned_by"],
      filters: {
        reference_type: "Lead",
        allocated_to: frappe.session.user
      },
      limit_page_length: 1000
    }
  });

  // 🔁 reset reactive state
  this.assignedByMap = {};
  this.assignedLeadNames = [];
  this.assignedCount = 0;

  const uniqueLeads = [...new Set(
    message.map(r => r.reference_name).filter(Boolean)
  )];

  const employees = await Promise.all(
    uniqueLeads.map(async (lead) => {
      const row = message.find(r => r.reference_name === lead);
      const emp = row?.assigned_by
        ? await this.getEmployeeByUser(row.assigned_by)
        : null;

      return emp
        ? {
            lead,
            emp
          }
        : null;
    })
  );

  employees.filter(Boolean).forEach(({ lead, emp }) => {
    this.assignedByMap[lead] = {
      full_name: emp.name,
      employee_code: emp.code,
      branch: emp.branch
    };
    this.assignedLeadNames.push(lead);
  });

  this.assignedCount = this.assignedLeadNames.length;

  console.log("✅ Assigned Leads:", this.assignedLeadNames);
}

async getEmployeeByUser(userId) {
  if (!userId) return null;

  try {
    const res = await frappe.db.get_value(
      "Employee",
      { user_id: userId },
      ["employee_name", "employee", "branch"]
    );

    if (res && res.message) {
      return {
        name: res.message.employee_name,
        code: res.message.employee,
        branch: res.message.branch || ""
      };
    }
  } catch (e) {
    console.warn("Employee fetch failed for", userId);
  }

  return null;
}

countStatus(status) {
  return this.state.data.filter(d => d.status === status).length;
}

countToday() {
  const today = frappe.datetime.get_today();
  return this.state.data.filter(d => {
    if (!d.scheduled_time) return false;
    return frappe.datetime.obj_to_str(
      frappe.datetime.str_to_obj(d.scheduled_time)
    ) === today;
  }).length;
}

countDue() {
  const now = frappe.datetime.now_datetime();
  return this.state.data.filter(d =>
    d.scheduled_time &&
    d.scheduled_time < now &&
    d.status !== "Closed"
  ).length;
}

countUpcoming() {
  const now = frappe.datetime.now_datetime();
  return this.state.data.filter(d =>
    d.scheduled_time &&
    d.scheduled_time > now &&
    d.status !== "Closed"
  ).length;
}

updateCount() {
  const showing = this.state.filteredData.length;
  const total = this.state.totalCount;

  this.countText = this.state.search
    ? `${showing} results`
    : `${showing} of ${total} ${this.state.section}s`;

  // 🔁 keep existing DOM behavior intact
  $("#mycrm-count-text").text(this.countText);
}

// 1.0 original renderList
  // renderList() {
  //   const container = $("#mycrm-list-body");
  //   const data = this.state.filteredData;

  //   if (data.length === 0) {
  //     $("#mycrm-empty").show();
  //     $("#mycrm-load-more").hide();
  //     container.hide();
  //     return;
  //   }

  //   $("#mycrm-empty").hide();
  //   container.show();
  //   container.empty();

  //   const fragment = document.createDocumentFragment();

  //   data.forEach((item) => {
  //     const card = this.renderWhatsAppCard(item);
  //     fragment.appendChild(card[0]);
  //   });

  //   container[0].appendChild(fragment);

  //   if (
  //     this.state.hasMore &&
  //     this.state.filteredData.length === this.state.data.length
  //   ) {
  //     $("#mycrm-load-more").show();
  //   } else {
  //     $("#mycrm-load-more").hide();
  //   }
  // }
// 2.0 improved renderList with extracted helper
//   renderList() {
//   const container = $("#mycrm-list-body");
//   const data = this.state.filteredData;

//   // Empty state
//   if (!data || data.length === 0) {
//     this.showEmptyState(true);
//     return;
//   }

//   this.showEmptyState(false);
//   container.empty();

//   const fragment = document.createDocumentFragment();

//   for (const item of data) {
//     const card = this.renderWhatsAppCard(item);
//     fragment.appendChild(card[0]); // existing jQuery card
//   }

//   container[0].appendChild(fragment);

//   const canLoadMore =
//     this.state.hasMore &&
//     this.state.filteredData.length === this.state.data.length;

//   $("#mycrm-load-more").toggle(canLoadMore);
// }


renderList() {
    const container = $("#mycrm-list-body");
    const data = this.state.filteredData;

    if (!container.length) return;
    container.empty();

    if (!data || data.length === 0) {
        this.showEmptyState(true);
        return;
    }

    this.showEmptyState(false);
    data.forEach(item => {
        const card = this.renderWhatsAppCard(item);
        container.append(card);
    });

    // Central Event Delegation
    container.off("click", ".mycrm-list-item").on("click", ".mycrm-list-item", (e) => {
        e.preventDefault();
        const name = $(e.currentTarget).attr("data-name");
        if (this.state.section === "lead") {
            this.editLead(name); 
        } else {
            frappe.set_route("Form", "Appointment", name);
        }
    });
}

// 6. full working final version with all improvements, no console errors, simple and clean.
// async editLead(name) {
//     const me = this;

//     frappe.model.with_doc("Lead", name, function() {
//         const doc = frappe.get_doc("Lead", name);
//         if (!doc) return;
        
//         let productsData = JSON.parse(JSON.stringify(doc.custom_product_table || []));

//         const d = new frappe.ui.Dialog({
//             title: `<div class="custom-header-wrapper" style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 10px;">
//                         <span style="font-weight: 600; font-size: 16px; color: #1a202c;">Update Lead: ${name}</span>
//                         <div class="header-btns-container" style="display: flex; gap: 8px;"></div>
//                     </div>`,
//             fields: [
//                 { label: 'Full Name', fieldname: 'first_name', fieldtype: 'Data', read_only: 1 },
//                 { label: 'Status', fieldname: 'status', fieldtype: 'Select', 
//                   options: ["Lead", "Follow Up", "Converted", "Not Interested"], read_only: 1 },
//                 { fieldtype: 'Column Break' },
//                 { label: 'Phone Number', fieldname: 'mobile_no', fieldtype: 'Data', read_only: 1 },
//                 { label: 'Source', fieldname: 'source', fieldtype: 'Link', options: 'Lead Source', read_only: 1 },
//                 { fieldtype: 'Section Break', label: 'Products' },
//                 { fieldname: 'product_container', fieldtype: 'HTML' }
//             ],
//             primary_action_label: __('Update Lead'),
//             primary_action: async (values) => {
//                 frappe.call({
//                     method: "frappe.client.set_value",
//                     args: { 
//                         doctype: "Lead", name: name, 
//                         fieldname: { ...values, custom_product_table: productsData } 
//                     },
//                     callback: (r) => {
//                         if(!r.exc) {
//                             frappe.show_alert({ message: __('Lead Updated'), indicator: 'green' });
//                             d.hide();
//                             me.fetchData(); 
//                         }
//                     }
//                 });
//             }
//         });

//         // --- Forced Editable Logic ---
//         const toggleInputs = (isEditable) => {
//             d.fields.forEach(f => {
//                 if (f.df && f.fieldname && f.fieldname !== 'product_container') {
//                     d.set_df_property(f.fieldname, 'read_only', isEditable ? 0 : 1);
//                     let field = d.get_field(f.fieldname);
//                     if(field) {
//                         field.refresh();
//                         $(field.input).prop('disabled', !isEditable).css('background-color', isEditable ? '#fff' : '#f8fafc');
//                     }
//                 }
//             });
//         };

//         // --- Render Logic ---
//         const renderTableRows = (isEdit) => {
//             const tbody = d.$wrapper.find("#product-rows-body").empty();
//             productsData.forEach((row, index) => {
//                 const tr = $(`<tr data-index="${index}">
//                     <td style="text-align:center; vertical-align:middle;">${index + 1}</td>
//                     <td style="padding:8px;"><div class="p-id-link-${index}"></div></td>
//                     <td style="padding:8px;"><input type="text" class="form-control input-sm p-name-disp" value="${row.product_name || ''}" readonly style="background:#f8fafc; border:none;"></td>
//                     <td style="padding:8px;"><input type="number" class="form-control input-sm p-amt-input" value="${row.product_amount || 0}" ${!isEdit ? 'readonly' : ''} style="text-align: right; border: ${isEdit ? '1px solid #d1d8dd' : 'none'};"></td>
//                     ${isEdit ? `<td class="text-center" style="padding:8px;"><button class="btn btn-xs btn-danger del-row-btn">Remove</button></td>` : ''}
//                 </tr>`).appendTo(tbody);

//                 if (isEdit) {
//                     frappe.ui.form.make_control({
//                         df: { fieldtype: "Link", options: "Product", onchange: function() {
//                             const val = this.get_value();
//                             productsData[index].product = val;
//                             if(val) {
//                                 frappe.db.get_value('Product', val, 'product_name', r => {
//                                     productsData[index].product_name = r.product_name;
//                                     tr.find('.p-name-disp').val(r.product_name);
//                                 });
//                             }
//                         }},
//                         parent: tr.find(`.p-id-link-${index}`), render_input: true
//                     }).set_value(row.product);

//                     tr.find(".p-amt-input").on("input", function() {
//                         productsData[index].product_amount = parseFloat($(this).val()) || 0;
//                     });
//                 } else {
//                     tr.find(`.p-id-link-${index}`).text(row.product || '-').css('padding-top', '5px');
//                 }
//             });
//         };

//         const renderTableContainer = (isEdit) => {
//             toggleInputs(isEdit);
//             const container = d.fields_dict.product_container.$wrapper;
//             container.html(`
//                 <div style="border: 1px solid #d1d8dd; border-radius: 8px; overflow: hidden; background: #fff;">
//                     <div style="overflow-x: auto;">
//                         <table class="table table-bordered" style="margin:0; font-size: 13px; min-width: 600px;">
//                             <thead style="background: #f7fafc;">
//                                 <tr>
//                                     <th style="width: 40px; text-align:center;">#</th>
//                                     <th style="width: 200px;">Product ID</th>
//                                     <th>Product Name</th>
//                                     <th style="width: 120px; text-align:right;">Amount (₹)</th>
//                                     ${isEdit ? '<th style="width: 80px; text-align:center;">Action</th>' : ''}
//                                 </tr>
//                             </thead>
//                             <tbody id="product-rows-body"></tbody>
//                         </table>
//                     </div>
//                     ${isEdit ? `<div style="padding: 10px; background: #f7fafc; border-top: 1px solid #d1d8dd;">
//                         <button class="btn btn-xs" id="add-row-btn" style="background:#006264; color:white; border:none; padding: 6px 15px;">+ Add Product</button>
//                     </div>` : ''}
//                 </div>`);

//             renderTableRows(isEdit);

//             d.$wrapper.find("#add-row-btn").on("click", () => {
//                 productsData.push({ product: "", product_name: "", product_amount: 0 });
//                 renderTableRows(isEdit);
//             });

//             d.$wrapper.on("click", ".del-row-btn", function() {
//                 const idx = $(this).closest('tr').data('index');
//                 productsData.splice(idx, 1);
//                 renderTableRows(isEdit);
//             });
//         };

//         // --- Header Buttons Logic ---
//         const header_btns = d.$wrapper.find('.header-btns-container');
        
//         // Update Button (Hidden by default)
//         const update_btn = d.get_primary_btn().detach().appendTo(header_btns).hide();
//         update_btn.css({'background': '#006264', 'border': 'none', 'color': '#fff'});

//         // Edit Button
//         const edit_btn = $(`<button class="btn btn-default btn-sm btn-edit-action" style="border: 1px solid #006264; color: #006264; font-weight: 500;">Edit Form</button>`)
//             .appendTo(header_btns);

//         edit_btn.on('click', () => {
//             renderTableContainer(true);
//             edit_btn.hide();
//             update_btn.show(); // Show only after edit click
//         });

//         // Responsive Styles
//         if (!$('#header-responsive-style').length) {
//             $(`<style id="header-responsive-style">
//                 @media (max-width: 767px) {
//                     .custom-header-wrapper { flex-direction: column !important; align-items: flex-start !important; }
//                     .header-btns-container { width: 100%; justify-content: flex-start; margin-top: 5px; }
//                     .modal-dialog { margin: 10px auto !important; width: 95% !important; }
//                 }
//             </style>`).appendTo("head");
//         }

//         d.$wrapper.find('.modal-dialog').css({'width': 'auto', 'max-width': '900px', 'margin': '30px auto'});
        
//         d.set_values({
//             'first_name': doc.first_name || "",
//             'mobile_no': doc.mobile_no || "",
//             'status': doc.status || "Lead",
//             'source': doc.source || ""
//         });

//         renderTableContainer(false);
//         d.show();
//     });
// }

async editLead(name) {
    const me = this;

    // 1. Load document data safely
    frappe.model.with_doc("Lead", name, function() {
        const doc = frappe.get_doc("Lead", name);
        if (!doc) return;

        // Clone product table data to a local state
        let productsData = JSON.parse(JSON.stringify(doc.custom_product_table || []));

        // 2. Initialize Dialog
        const d = new frappe.ui.Dialog({
            title: `<div class="custom-header-wrapper" style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 10px;">
                        <span class="lead-id-title" style="font-weight: 600; font-size: 16px; color: #1a202c;">Update Lead: ${name}</span>
                        <div class="header-btns-container" style="display: flex; gap: 8px; align-items: center; margin-right: 35px;"></div>
                    </div>`,
            fields: [
                { label: 'Full Name', fieldname: 'first_name', fieldtype: 'Data', read_only: 0 },
                { label: 'Status', fieldname: 'status', fieldtype: 'Select', options: ["Lead", "Follow Up", "Converted", "Not Interested"], read_only: 0 },
                { fieldtype: 'Column Break' },
                { label: 'Phone Number', fieldname: 'mobile_no', fieldtype: 'Data', read_only: 0 },
                { label: 'Source', fieldname: 'source', fieldtype: 'Link', options: 'Lead Source', read_only: 0 },
                { fieldtype: 'Section Break', label: 'Products' },
                { fieldname: 'product_container', fieldtype: 'HTML' }
            ],
            primary_action_label: __('Update Lead'),
            primary_action: async (values) => saveLead(values)
        });

        // 3. Helper: Toggle Field Editability (Standard Fields)
        const toggleInputs = (isEditable) => {
            d.fields.forEach(f => {
                if (f.df && f.fieldname && f.fieldname !== 'product_container') {
                    d.set_df_property(f.fieldname, 'read_only', isEditable ? 0 : 1);
                    let field = d.get_field(f.fieldname);
                    if (field) {
                        field.refresh();
                        $(field.input).prop('disabled', !isEditable).css('background-color', isEditable ? '#fff' : '#f8fafc');
                    }
                }
            });
        };

        // 4. Helper: Render Individual Table Rows
        const renderTableRows = (isEdit) => {
            const tbody = d.$wrapper.find("#product-rows-body").empty();
            
            productsData.forEach((row, index) => {
                const tr = $(`<tr data-index="${index}">
                    <td style="text-align:center; vertical-align:middle; color:#718096;">${index + 1}</td>
                    <td style="padding:8px;"><div class="p-id-link-${index}"></div></td>
                    <td style="padding:8px;"><input type="text" id="p_name_${index}" name="p_name_${index}" class="form-control input-sm p-name-disp" value="${row.product_name || ''}" readonly style="background:#f8fafc; border:none; font-size:12px;"></td>
                    <td style="padding:8px;"><input type="number" id="p_amt_${index}" name="p_amt_${index}" class="form-control input-sm p-amt-input" value="${row.product_amount || 0}" ${!isEdit ? 'readonly' : ''} style="text-align: right; border: ${isEdit ? '1px solid #d1d8dd' : 'none'}; font-weight:600;"></td>
                    ${isEdit ? `<td class="text-center" style="padding:8px; vertical-align:middle;"><button class="btn btn-xs btn-danger del-row-btn">Remove</button></td>` : ''}
                </tr>`).appendTo(tbody);

                if (isEdit) {
                    // Create Link Control for Product ID
                    frappe.ui.form.make_control({
                        df: { 
                            fieldtype: "Link", options: "Product", fieldname: `p_link_${index}`,
                            onchange: function() {
                                const val = this.get_value();
                                productsData[index].product = val;
                                if(val) {
                                    frappe.db.get_value('Product', val, 'product_name', r => {
                                        productsData[index].product_name = r.product_name;
                                        tr.find('.p-name-disp').val(r.product_name);
                                    });
                                }
                            }
                        },
                        parent: tr.find(`.p-id-link-${index}`), render_input: true
                    }).set_value(row.product);

                    // Sync amount input to local state
                    tr.find(".p-amt-input").on("input", function() {
                        productsData[index].product_amount = parseFloat($(this).val()) || 0;
                    });
                } else {
                    tr.find(`.p-id-link-${index}`).text(row.product || '-').css({'padding-top': '8px', 'font-size': '12px'});
                }
            });
        };

        // 5. Helper: Render Main Product Table Structure
        const renderTableContainer = (isEdit) => {
            toggleInputs(isEdit);
            const container = d.fields_dict.product_container.$wrapper;
            container.html(`
                <div style="border: 1px solid #d1d8dd; border-radius: 8px; overflow: hidden; background: #fff;">
                    <div style="overflow-x: auto;">
                        <table class="table table-bordered" style="margin:0; font-size: 13px; min-width: 600px;">
                            <thead style="background: #f7fafc;">
                                <tr>
                                    <th style="width: 45px; text-align:center;">#</th>
                                    <th style="width: 200px;">Product ID</th>
                                    <th>Product Name</th>
                                    <th style="width: 120px; text-align:right;">Amount (₹)</th>
                                    ${isEdit ? '<th style="width: 90px; text-align:center;">Action</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="product-rows-body"></tbody>
                        </table>
                    </div>
                    ${isEdit ? `<div style="padding: 10px; background: #f7fafc; border-top: 1px solid #d1d8dd;">
                        <button class="btn btn-xs" id="add-row-btn" style="background:#006264; color:white; border:none; padding: 6px 15px;">+ Add Product</button>
                    </div>` : ''}
                </div>`);
            renderTableRows(isEdit);
        };

        // 6. Logic: Handle Save Action
        const saveLead = (values) => {
            frappe.call({
                method: "frappe.client.set_value",
                args: { 
                    doctype: "Lead", name: name, 
                    fieldname: { ...values, custom_product_table: productsData } 
                },
                callback: (r) => {
                    if(!r.exc) {
                        frappe.show_alert({ message: __('Lead Updated'), indicator: 'green' });
                        d.hide();
                        me.fetchData(); 
                    }
                }
            });
        };

        // 7. UI Setup: Header Buttons & Responsive Styling
        const header_btns = d.$wrapper.find('.header-btns-container');
        const update_btn = d.get_primary_btn().detach().appendTo(header_btns).hide();
        update_btn.css({'background': '#006264', 'border': 'none', 'color': '#fff', 'padding': '5px 15px'});

        const edit_btn = $(`<button class="btn btn-default btn-sm" style="border: 1px solid #006264; color: #006264; font-weight: 500;">Edit Form</button>`)
            .appendTo(header_btns);

        // Switch from View to Edit mode
        edit_btn.on('click', () => {
            renderTableContainer(true);
            edit_btn.hide();
            update_btn.show();
        });

        // Event Delegation for Table Buttons
        d.$wrapper.on("click", "#add-row-btn", () => {
            productsData.push({ product: "", product_name: "", product_amount: 0 });
            renderTableRows(true);
        });

        d.$wrapper.on("click", ".del-row-btn", function() {
            const idx = $(this).closest('tr').data('index');
            productsData.splice(idx, 1);
            renderTableRows(true);
        });

        // Inject Responsive CSS for Header Alignment
        if (!$('#header-position-style').length) {
            $(`<style id="header-position-style">
                @media (min-width: 768px) {
                    .custom-header-wrapper { display: flex; justify-content: space-between; align-items: center; }
                    .header-btns-container { order: 2; margin-right: 15px; }
                    .lead-id-title { order: 1; }
                }
                @media (max-width: 767px) {
                    .custom-header-wrapper { flex-direction: column !important; align-items: flex-start !important; }
                    .header-btns-container { width: 100%; margin-top: 8px; margin-right: 0 !important; }
                    .modal-dialog { margin: 10px auto !important; width: 95% !important; }
                }
            </style>`).appendTo("head");
        }

        // 8. Final Dialog Initialization
        d.$wrapper.find('.modal-dialog').css({'max-width': '900px', 'margin': '30px auto'});
        d.set_values({
            'first_name': doc.first_name || "",
            'mobile_no': doc.mobile_no || "",
            'status': doc.status || "Lead",
            'source': doc.source || ""
        });

        renderTableContainer(false); // Start in View Mode
        d.show();
    });
}

// 🔹 extracted helper (Petite-Vue friendly & reusable)
showEmptyState(show) {
  $("#mycrm-empty").toggle(show);
  $("#mycrm-list-body").toggle(!show);
  $("#mycrm-load-more").toggle(!show && this.state.hasMore);
}

//   renderWhatsAppCard(item) {
//     const modified = frappe.datetime.comment_when(item.modified);

//     let name, message, statusClass, statusText, avatar;

//     if (this.state.section === "lead") {
//       name =
//         item.lead_name ||
//         `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
//         "Unnamed";
//       avatar = (item.first_name || name).charAt(0).toUpperCase();

//       // Indian currency format
//       const totalAmount = item.totalAmount || 0;
//       const amountDisplay =
//         totalAmount > 0
//           ? ` - <span style="color: #10b981; font-weight: 700;">₹${this.formatIndianCurrency(
//               totalAmount
//             )}</span>`
//           : "";

//       const details = [];
//       if (item.mobile_no) details.push(`📱 ${item.mobile_no}`);
//       if (item.email_id) details.push(`✉️ ${item.email_id}`);
//       if (item.source) details.push(`📌 ${item.source}`);

//       // ✅ Assigned By (NO status / filter dependency)



// if (this.assignedByMap?.[item.name]) {
//   const a = this.assignedByMap[item.name];

//   details.push(`
//     <div style="
//       margin-top:6px;
//       display:flex;
//       flex-wrap:wrap;
//       gap:6px;
//       font-size:12px;
//     ">

//       <!-- Assigned By -->
//       <span style="
//         background:#f1f5f9;
//         padding:4px 8px;
//         border-radius:6px;
//         color:#111;
//       ">Assigned By:
//         👤 <b>${a.full_name}</b>
//         <span style="color:#0f0a21;"><b>(${a.employee_code})</b></span>
//       </span>

//       <!-- Branch -->
//       ${
//         a.branch
//           ? `
//           <span style="
//             background:#dcf8c6;
//             padding:4px 8px;
//             border-radius:6px;
//             color:#065f46;
//             font-weight:600;
//           ">
//             🏢 ${a.branch}
//           </span>
//           `
//           : ""
//       }

//     </div>
//   `);
// }




//       message = details.join(" • ") || "No details";
//       statusClass = (item.status || "lead").toLowerCase().replace(" ", "-");
//       statusText = item.status || "Lead";

//       const card = $(`
//       <div class="mycrm-list-item" data-name="${item.name}">
//         <div class="mycrm-avatar">${avatar}</div>
//         <div class="mycrm-content">
//           <div class="mycrm-header">
//             <div class="mycrm-name">${name}${amountDisplay}</div>
//             <div class="mycrm-time">${modified}</div>
//           </div>
//           <div class="mycrm-message mycrm-scrollable">
//             <span style="flex: 1; min-width: 0;">${message}</span>
//             <span class="mycrm-status-badge ${statusClass}">${statusText}</span>
//           </div>
//         </div>
//       </div>
//     `);

//       card.on("click", () => {
//         frappe.set_route("Form", "Lead", item.name);
//       });

//       return card;
//     } else {
//       // Appointment section
//       name = item.customer_name || "Unnamed";
//       avatar = name.charAt(0).toUpperCase();

//       const scheduledTime = frappe.datetime.str_to_user(item.scheduled_time);
//       const isPast = item.scheduled_time < frappe.datetime.now_datetime();

//       message = `📅 ${scheduledTime}`;
//       if (isPast) message += " 🔴 OVERDUE";
//       if (item.customer_phone_number)
//         message += ` • 📱 ${item.customer_phone_number}`;

//       statusClass = (item.status || "open").toLowerCase();
//       statusText = item.status || "Open";

//       const card = $(`
//       <div class="mycrm-list-item" data-name="${item.name}">
//         <div class="mycrm-avatar">${avatar}</div>
//         <div class="mycrm-content">
//           <div class="mycrm-header">
//             <div class="mycrm-name">${name}</div>
//             <div class="mycrm-time">${modified}</div>
//           </div>
//           <div class="mycrm-message mycrm-scrollable">
//             <span style="flex: 1; min-width: 0;">${message}</span>
//             <span class="mycrm-status-badge ${statusClass}">${statusText}</span>
//           </div>
//         </div>
//       </div>
//     `);

//       card.on("click", () => {
//         frappe.set_route("Form", "Appointment", item.name);
//       });

//       return card;
//     }
//   }

renderWhatsAppCard(item) {
    const modified = frappe.datetime.comment_when(item.modified);
    let name, message, statusClass, statusText, avatar;

    if (this.state.section === "lead") {
        name = item.lead_name || `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Unnamed";
        avatar = name.charAt(0).toUpperCase();

        const details = [];
        if (item.mobile_no) details.push(`📱 ${item.mobile_no}`);
        if (item.source) details.push(`📌 ${item.source}`);

        // Assigned By Logic (Original)
        if (this.assignedByMap?.[item.name]) {
            const a = this.assignedByMap[item.name];
            details.push(`
                <div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:6px; font-size:12px;">
                    <span style="background:#f1f5f9; padding:4px 8px; border-radius:6px; color:#111;">
                        Assigned By: 👤 <b>${a.full_name}</b> (<b>${a.employee_code}</b>)
                    </span>
                    ${a.branch ? `<span style="background:#dcf8c6; padding:4px 8px; border-radius:6px; color:#065f46; font-weight:600;">🏢 ${a.branch}</span>` : ""}
                </div>
            `);
        }
        message = details.join(" • ") || "No details";
        statusClass = (item.status || "lead").toLowerCase().replace(" ", "-");
        statusText = item.status || "Lead";
    } else {
        // Appointment UI Fix
        name = item.customer_name || "Unnamed";
        avatar = name.charAt(0).toUpperCase();
        const scheduledTime = frappe.datetime.str_to_user(item.scheduled_time);
        message = `📅 ${scheduledTime} ${item.mobile_no ? `• 📱 ${item.mobile_no}` : ""}`;
        statusClass = (item.status || "open").toLowerCase();
        statusText = item.status || "Open";
    }

    return $(`
        <div class="mycrm-list-item" data-name="${item.name}" style="cursor: pointer; padding: 12px; border-bottom: 1px solid #eee; display: flex; align-items: flex-start; gap: 12px;">
            <div class="mycrm-avatar" style="min-width: 42px; height: 42px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #4b5563;">${avatar}</div>
            <div class="mycrm-content" style="flex: 1; min-width: 0;">
                <div class="mycrm-header" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <div class="mycrm-name" style="font-weight: 600; color: #111827;">${name}</div>
                    <div class="mycrm-time" style="font-size: 11px; color: #6b7280;">${modified}</div>
                </div>
                <div class="mycrm-message" style="font-size: 13px; color: #4b5563; display: flex; justify-content: space-between; align-items: flex-end;">
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${message}</span>
                    <span class="mycrm-status-badge ${statusClass}" style="margin-left: 8px; font-size: 10px; padding: 2px 8px; border-radius: 10px;">${statusText}</span>
                </div>
            </div>
        </div>
    `);
}

  formatIndianCurrency(amount) {
    if (!amount || amount === 0) return "0";

    const x = amount.toString();
    const lastThree = x.substring(x.length - 3);
    const otherNumbers = x.substring(0, x.length - 3);

    if (otherNumbers !== "") {
      return (
        otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
      );
    }
    return lastThree;
  }

  handleScroll() {
    const container = $("#mycrm-list-container");
    const scrollTop = container.scrollTop();
    const scrollHeight = container[0].scrollHeight;
    const clientHeight = container[0].clientHeight;

    if (scrollTop + clientHeight > scrollHeight - 100) {
      if (this.state.hasMore && !this.isLoading) {
        this.loadMore();
      }
    }
  }

  async loadMore() {
    if (!this.state.hasMore || this.isLoading) return;

    this.isLoading = true;
    $("#mycrm-load-more-btn").html(
      '<i class="fa fa-spinner fa-spin"></i> Loading...'
    );

    await this.fetchData(true);

    this.isLoading = false;
    $("#mycrm-load-more-btn").html(
      '<i class="fa fa-arrow-down"></i> Load More'
    );
  }

  async refresh() {
    this.invalidateCache(this.state.section);
    this.state.offset = 0;
    await this.loadUserLeads();
    await this.fetchData();
    $("#mycrm-list-container").scrollTop(0);
    frappe.show_alert({ message: "Refreshed", indicator: "green" }, 2);
  }

  async switchSection(section) {
    sessionStorage.setItem("mycrm_active_tab", section);

    console.log(`%c Switch: ${section}`, "color: #25d366; font-weight: bold;");

    this.state.section = section;
    this.state.filter = "All";
    this.state.search = "";
    this.state.offset = 0;
    $("#mycrm-search").val("");
    $("#mycrm-clear-search").hide();

    $(".mycrm-tab").removeClass("active");
    $(`.mycrm-tab[data-section="${section}"]`).addClass("active");

    if (section === "lead") {
      $("#mycrm-fab-text").text("New Lead");
      $("#mycrm-fab").show();
    } else if (section === "appointment") {
      $("#mycrm-fab-text").text("New Appointment");
      $("#mycrm-fab").show();
    } else {
      $("#mycrm-fab").hide();
    }
if (section === "lead") {
  await this.fetchAssignedLeads(); // ✅ preload assigned data
}

    if (section === "reports") {
      $("#mycrm-search-bar").hide();
      $("#mycrm-filters").hide();
      $("#mycrm-count").hide();
      $("#mycrm-list-container").hide();
      $("#mycrm-reports-container").show();
      // ✅ FIX: Set indicator for Reports section
      this.page.set_indicator("REPORTS", "blue");
      this.renderReports();
    } else {
      $("#mycrm-search-bar").show();
      $("#mycrm-filters").show();
      $("#mycrm-count").show();
      $("#mycrm-list-container").show();
      $("#mycrm-reports-container").hide();
      this.page.set_indicator(section.toUpperCase(), "blue");
      $("#mycrm-list-container").scrollTop(0);
      this.fetchData();
    }
  }

  renderReports() {
    const reportsBody = $("#mycrm-reports-body");
    reportsBody.html(`
      <div class="mycrm-report-card" onclick="frappe.set_route('daily-sales-report')">
        <div class="mycrm-report-icon">📊</div>
        <div class="mycrm-report-title">DSR Report</div>
        <div class="mycrm-report-desc">Daily Sales Report - View your daily activities</div>
      </div>

      <div class="mycrm-report-card" onclick="frappe.set_route('query-report','My Leads Report')">
        <div class="mycrm-report-icon">👥</div>
        <div class="mycrm-report-title">My Leads</div>
        <div class="mycrm-report-desc">View all your assigned leads</div>
      </div>
    `);
  }

  viewMyLeads() {
    this.switchSection("lead");
  }

  updateTabBadges() {
    // Leads
    frappe.call({
      method: "frappe.client.get_count",
      args: {
        doctype: "Lead",
        filters: [["lead_owner", "=", this.currentUser]],
      },
      callback: (r) => {
        $("#mycrm-lead-count").text(r.message || 0);
      },
    });

    // Appointments
    if (this.state.userLeadNames.length > 0) {
      frappe.call({
        method: "frappe.client.get_count",
        args: {
          doctype: "Appointment",
          filters: [["party", "in", this.state.userLeadNames]],
        },
        callback: (r) => {
          $("#mycrm-appointment-count").text(r.message || 0);
        },
      });
    }
  }

  createLead() {
    let productsData = [];
    let existingContact = null;

    const dialog = new frappe.ui.Dialog({
      title: "Create New Lead",
      fields: [
        {
          fieldname: "customer_info_html",
          fieldtype: "HTML",
          options: `
          <div id="customer-info-banner" style="display: none; padding: 12px; margin-bottom: 16px; border-radius: 6px; border-left: 4px solid #236867;">
            <div style="font-weight: 600; color: #236867; margin-bottom: 4px;">Existing Customer Found</div>
            <div id="customer-info-text" style="color: #6b7280; font-size: 14px;"></div>
          </div>
        `,
        },
        {
          fieldname: "mobile_no",
          fieldtype: "Data",
          label: "Phone Number",
          reqd: 1,
          onchange: async function () {
            const phone = this.value;

            if (!phone) {
              $("#customer-info-banner").hide();
              return;
            }

            // Only check when exactly 10 digits are entered
            if (phone.length !== 10) {
              $("#customer-info-banner").hide();
              return;
            }

            const phoneRegex = /^[6-9]\d{9}$/;
            if (!phoneRegex.test(phone)) {
              frappe.show_alert(
                {
                  message: "Please enter valid mobile number starting with 6-9",
                  indicator: "orange",
                },
                3
              );
              $("#customer-info-banner").hide();
              return;
            }

            try {
              const contactRes = await frappe.call({
                method: "frappe.client.get_list",
                args: {
                  doctype: "Contact",
                  filters: { mobile_no: phone },
                  fields: ["name", "full_name", "mobile_no"],
                  limit: 1,
                },
              });

              if (contactRes.message && contactRes.message.length > 0) {
                existingContact = contactRes.message[0];

                $("#customer-info-text").html(`
                <strong>${existingContact.full_name}</strong> • ${existingContact.mobile_no}
              `);
                $("#customer-info-banner")
                  .css({
                    background: "#ecfdf5",
                    "border-left-color": "#10b981",
                  })
                  .show();

                dialog.set_value("first_name", existingContact.full_name);
                dialog.set_df_property("first_name", "read_only", 1);

                frappe.show_alert(
                  {
                    message: `Welcome back ${existingContact.full_name}!`,
                    indicator: "blue",
                  },
                  3
                );
              } else {
                existingContact = null;
                $("#customer-info-banner").hide();
                dialog.set_value("first_name", "");
                dialog.set_df_property("first_name", "read_only", 0);
              }
            } catch (error) {
              console.error("Error checking contact:", error);
              $("#customer-info-banner").hide();
            }
          },
        },
        {
          fieldname: "first_name",
          fieldtype: "Data",
          label: "Full Name",
          reqd: 1,
        },
        {
          fieldname: "column_break_1",
          fieldtype: "Column Break",
        },
        {
          fieldname: "source",
          fieldtype: "Link",
          label: "Source",
          options: "Lead Source",
          reqd: 1,
        },
        {
          fieldname: "status",
          fieldtype: "Select",
          label: "Status",
          options: "Lead\nFollow Up\nConverted\nNot Interested",
          default: "Lead",
          reqd: 1,
          onchange: () => {
            const status = dialog.get_value("status");
            dialog.set_df_property(
              "appointment_datetime",
              "hidden",
              status !== "Follow Up"
            );
            dialog.set_df_property(
              "appointment_datetime",
              "reqd",
              status === "Follow Up"
            );
          },
        },
        {
          fieldname: "section_break_2",
          fieldtype: "Section Break",
        },
        {
          fieldname: "appointment_datetime",
          fieldtype: "Datetime",
          label: "Appointment Date & Time",
          hidden: 1,
          reqd: 0,
        },
        {
          fieldname: "section_break_products",
          fieldtype: "Section Break",
          label: "Products",
        },
        {
          fieldname: "product_html",
          fieldtype: "HTML",
        },
      ],
      primary_action_label: "Create Lead",
      primary_action: async (values) => {
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(values.mobile_no)) {
          frappe.msgprint({
            title: "Invalid Phone",
            indicator: "red",
            message: "Please enter valid 10 digit mobile number",
          });
          return;
        }

        if (productsData.length === 0) {
          frappe.msgprint({
            title: "Missing Products",
            indicator: "red",
            message: "Please add at least one product",
          });
          return;
        }

        let hasInvalidData = false;
        productsData.forEach((item) => {
          if (
            !item.product ||
            !item.product_amount ||
            item.product_amount <= 0
          ) {
            hasInvalidData = true;
          }
        });

        if (hasInvalidData) {
          frappe.msgprint({
            title: "Invalid Product Data",
            indicator: "red",
            message:
              "Please select product and enter valid amount for all rows",
          });
          return;
        }

        try {
          const leadDoc = {
            doctype: "Lead",
            lead_owner: this.currentUser,
            status: values.status,
            source: values.source,
            first_name: values.first_name,
            mobile_no: values.mobile_no,
            custom_product_table: productsData,
          };

          const response = await frappe.call({
            method: "frappe.client.insert",
            args: { doc: leadDoc },
            freeze: true,
            freeze_message: "Creating Lead...",
          });

          const leadName = response.message.name;

          if (values.status === "Follow Up" && values.appointment_datetime) {
            await frappe.call({
              method: "frappe.client.insert",
              args: {
                doc: {
                  doctype: "Appointment",
                  party: leadName,
                  scheduled_time: values.appointment_datetime,
                  customer_name: values.first_name,
                  customer_phone_number: values.mobile_no,
                  status: "Open",
                },
              },
            });
          }

          frappe.show_alert(
            {
              message: existingContact
                ? `Lead created for ${existingContact.full_name}!`
                : `Lead created successfully!`,
              indicator: "green",
            },
            4
          );

          dialog.hide();
          this.invalidateCache("lead");
          this.invalidateCache("appointment");
          this.refresh();
        } catch (error) {
          console.error("Error creating lead:", error);
          frappe.msgprint({
            title: "Error",
            indicator: "red",
            message: error.message || "Failed to create lead",
          });
        }
      },
    });

    const renderProductTable = () => {
      const html = `
      <style>
        .lead-product-table {
          width: 100%;
          margin-top: 10px;
        }

        .lead-product-table table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #d1d5db;
        }

        .lead-product-table th {
          background: #f9fafb;
          padding: 10px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #d1d5db;
          font-size: 13px;
        }

        .lead-product-table td {
          padding: 8px;
          border: 1px solid #d1d5db;
        }

        .lead-product-input {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 13px;
        }

        .lead-product-input:focus {
          outline: none;
          border-color: #236867;
        }

        .lead-product-add-btn {
          margin-top: 10px;
          background: #236867;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }

        .lead-product-add-btn:hover {
          background: #1a4f4e;
        }

        .lead-product-del-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .lead-product-del-btn:hover {
          background: #b91c1c;
        }

        .lead-empty-products {
          text-align: center;
          padding: 30px;
          color: #9ca3af;
          font-size: 13px;
        }
      </style>

      <div class="lead-product-table">
        <table>
          <thead>
            <tr>
              <th style="width: 55%;">Product</th>
              <th style="width: 30%;">Amount (₹)</th>
              <th style="width: 15%; text-align: center;">Action</th>
            </tr>
          </thead>
          <tbody id="lead-product-rows">
            ${
              productsData.length === 0
                ? '<tr><td colspan="3" class="lead-empty-products">No products added</td></tr>'
                : ""
            }
          </tbody>
        </table>
        <button class="lead-product-add-btn" id="lead-add-product-btn">
          Add Product
        </button>
      </div>
    `;

      dialog.fields_dict.product_html.$wrapper.html(html);

      const addProduct = () => {
        const row = {
          product: "",
          product_name: "",
          product_amount: 0,
        };
        productsData.push(row);
        renderRows();
      };

      const removeProduct = (index) => {
        productsData.splice(index, 1);
        renderRows();
      };

      const renderRows = () => {
        const tbody = dialog.$wrapper.find("#lead-product-rows");
        tbody.empty();

        if (productsData.length === 0) {
          tbody.html(
            '<tr><td colspan="3" class="lead-empty-products">No products added</td></tr>'
          );
          return;
        }

        productsData.forEach((row, index) => {
          const tr = $(`
          <tr>
            <td>
              <div class="product-link-wrapper-${index}"></div>
            </td>
            <td>
              <input type="number" 
                class="lead-product-input product-amount" 
                data-index="${index}" 
                value="${row.product_amount || ""}"
                placeholder="0"
                step="0.01"
                min="0">
            </td>
            <td style="text-align: center;">
              <button class="lead-product-del-btn" data-index="${index}">
                Remove
              </button>
            </td>
          </tr>
        `);

          tbody.append(tr);

          const productField = frappe.ui.form.make_control({
            df: {
              fieldtype: "Link",
              options: "Product",
              fieldname: `product_${index}`,
              placeholder: "Select product",
              get_query: () => {
                return {
                  filters: {
                    enabled: 1,
                  },
                };
              },
              onchange: function () {
                const productName = this.get_value();
                if (productName) {
                  productsData[index].product = productName;

                  frappe.call({
                    method: "frappe.client.get_value",
                    args: {
                      doctype: "Product",
                      filters: { name: productName },
                      fieldname: "product_name",
                    },
                    callback: (r) => {
                      if (r.message && r.message.product_name) {
                        productsData[index].product_name =
                          r.message.product_name;
                      }
                    },
                  });
                }
              },
            },
            parent: tr.find(`.product-link-wrapper-${index}`),
            render_input: true,
          });

          if (row.product) {
            productField.set_value(row.product);
          }

          tr.find(".product-amount").on("change", function () {
            productsData[index].product_amount = parseFloat($(this).val()) || 0;
          });

          tr.find(".lead-product-del-btn").on("click", function () {
            const idx = parseInt($(this).data("index"));
            removeProduct(idx);
          });
        });
      };

      dialog.$wrapper.find("#lead-add-product-btn").on("click", addProduct);
      renderRows();
    };

    dialog.show();
    renderProductTable();

    dialog.$wrapper.find(".modal-dialog").css({
      "max-width": "800px",
      width: "90%",
    });
  }

  createAppointment() {
    const dialog = new frappe.ui.Dialog({
      title: "Create New Appointment",
      fields: [
        {
          fieldname: "party",
          fieldtype: "Link",
          label: "Lead",
          options: "Lead",
          reqd: 1,
          get_query: () => {
            return { filters: { lead_owner: this.currentUser } };
          },
          onchange: async () => {
            const lead = dialog.get_value("party");
            if (!lead) return;

            const r = await frappe.db.get_value("Lead", lead, [
              "lead_name",
              "mobile_no",
              "phone",
              "email_id",
            ]);

            if (r.message) {
              dialog.set_value("customer_name", r.message.lead_name || "");
              dialog.set_value(
                "customer_phone_number",
                r.message.mobile_no || r.message.phone || ""
              );
              dialog.set_value("customer_email", r.message.email_id || "");
            }
          },
        },
        {
          fieldname: "scheduled_time",
          fieldtype: "Datetime",
          label: "Scheduled Time",
          reqd: 1,
        },
        {
          fieldname: "customer_name",
          fieldtype: "Data",
          label: "Customer Name",
          reqd: 1,
          read_only: 1,
        },
        {
          fieldname: "customer_phone_number",
          fieldtype: "Data",
          label: "Phone",
          read_only: 1,
        },

        {
          fieldname: "status",
          fieldtype: "Select",
          label: "Status",
          options: "Open\nClosed",
          default: "Open",
        },
      ],
      primary_action_label: "Create",
      primary_action: async (values) => {
        try {
          // ✅ Always-safe system email
          const system_email = `${values.party}@lead.local`;
          if (!values.party) {
            frappe.throw("Lead is required");
          }

          await frappe.call({
            method: "frappe.client.insert",
            args: {
              doc: {
                doctype: "Appointment",

                // Required linking
                appointment_with: "Lead",
                party: values.party,

                // Mandatory fields
                scheduled_time: values.scheduled_time,
                status: values.status,

                // Display fields
                customer_name: values.customer_name,
                contact_number: values.customer_phone_number,

                // 🔴 REQUIRED & GUARANTEED
                customer_email: system_email,
              },
            },
            freeze: true,
          });

          frappe.show_alert(
            { message: "✅ Appointment created", indicator: "green" },
            3
          );

          dialog.hide();
          this.invalidateCache("appointment");
          this.refresh();
        } catch (error) {
          frappe.msgprint({
            title: "Error",
            indicator: "red",
            message: error.message,
          });
        }
      },
    });

    dialog.show();
  }

  exportData() {
    const doctype = this.state.section === "lead" ? "Lead" : "Appointment";

    frappe.call({
      method: "frappe.desk.reportview.export_query",
      args: {
        doctype: doctype,
        file_format_type: "Excel",
        filters: this.buildServerFilters(),
      },
      callback: (r) => {
        if (r.message) {
          frappe.show_alert(
            { message: "📥 Export ready!", indicator: "green" },
            2
          );
          window.open(frappe.urllib.get_full_url(r.message));
        }
      },
    });
  }

  setupRealtime() {
    frappe.realtime.on("doc_update", (data) => {
      if (data.doctype === "Lead" || data.doctype === "Appointment") {
        this.invalidateCache(data.doctype.toLowerCase());
        this.refresh();
      }
    });
  }

  setupPWA() {
    if (!$('meta[name="viewport"]').length) {
      $("head").append(
        '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">'
      );
    }

    if (!$('meta[name="theme-color"]').length) {
      $("head").append('<meta name="theme-color" content="#25d366">');
    }

    console.log("%c📱 PWA Ready", "color: #25d366; font-weight: bold;");
  }

  showLoading() {
    $("#mycrm-loading").show();
    $("#mycrm-list-body, #mycrm-empty, #mycrm-load-more").hide();
  }

  hideLoading() {
    $("#mycrm-loading").hide();
  }
}
