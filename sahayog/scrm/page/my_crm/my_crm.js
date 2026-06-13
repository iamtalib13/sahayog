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
  src = "/assets/sahayog/js/petite-vue.iife.js";
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
      limit: 5, // Records count per fetch
      hasMore: true,
      totalCount: 0, // Total for the current section
      leadCount: 0, // Total lead count for badge
      appointmentCount: 0, // Total appointment count for badge
      leadCursor: null, // Cursor for lead pagination
      appointmentCursor: null, // Cursor for appointment pagination
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

    // Initial data fetch and badge updates are now handled by switchSection calling fetchData
    // and fetchData getting all consolidated info from the backend.
    // The following calls are no longer needed here.
    // await this.loadUserLeads(); // Removed
    // this.updateTabBadges();     // Removed

    this.setupRealtime();
    this.startCacheMonitoring();
    this.setupPWA();

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
      },
    });

    // 🧠 Mount on page-content (existing DOM)
    this.vue.mount(this.wrapper[0]);

    this.vueMounted = true;

    console.log("%c🧩 Petite-Vue Mounted", "color:#42b883;font-weight:bold;");
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
      "green",
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
          </button>
          <button class="mycrm-tab ${
            this.state.section === "appointment" ? "active" : ""
          }" data-section="appointment">
            Appointments
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

    // $("#mycrm-list-container").on("scroll", () => this.handleScroll());
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

  async fetchData(append = false) {
    console.group(
      `%c📥 ${this.state.section}`,
      "color: #25d366; font-weight: bold;"
    );

    let cursorForFetch = null;
    if (append) {
        cursorForFetch = (this.state.section === "lead") ? this.state.leadCursor : this.state.appointmentCursor;
    }

    if (!append || (append && !cursorForFetch)) { // If not appending, or appending but no cursor (meaning no more pages)
      // Reset data for a fresh fetch if not appending
      if (!append) {
        this.state.data = [];
      }
      // Reset cursors for new fetches for the current section
      if (this.state.section === "lead") {
        this.state.leadCursor = null;
      } else if (this.state.section === "appointment") {
        this.state.appointmentCursor = null;
      }
      this.showLoading();
    }

    try {
      const response = await frappe.call({
        method: "sahayog.scrm.page.my_crm.my_crm.get_crm_data",
        args: {
          section: this.state.section,
          limit: this.state.limit,
          cursor: cursorForFetch, // Pass current cursor (null for first fetch)
          search_term: this.state.search,
        },
      });

      const { data, next_cursor, total_count, lead_count, appointment_count } = response.message;

      if (append) {
        this.state.data = [...this.state.data, ...data];
      } else {
        this.state.data = data;
      }

      this.state.totalCount = total_count; // Total for the current section
      this.state.hasMore = !!next_cursor; // hasMore is true if next_cursor exists

      // Update cursor for the next fetch for the current section
      if (this.state.section === "lead") {
          this.state.leadCursor = next_cursor;
      } else {
          this.state.appointmentCursor = next_cursor;
      }
      
      // Update global Vue state for counts (from consolidated response)
      if (window.mycrmVue) {
          window.mycrmVue.leadCount = lead_count || 0;
          window.mycrmVue.appointmentCount = appointment_count || 0;
      }

      // Caching logic
      // If we are passing total_count from BE, then the cache should also store that.
      if (!this.state.search?.trim() && !append) {
        this.setCacheData(this.state.section, this.state.data, this.state.totalCount);
      }

      this.applyFilter();
      this.updateCacheIndicator(false, null);

    } catch (error) {
      console.error(`❌ Error fetching ${this.state.section}:`, error);
      frappe.msgprint({
        title: "Error",
        indicator: "red",
        message: "Could not fetch CRM data.",
      });
    } finally {
      this.hideLoading();
      console.groupEnd();
    }
  }

  updateCacheIndicator(fromCache, fetchTime = null) {
    const indicator = $("#mycrm-cache-indicator");

    if (fromCache) {
      indicator.html('<span class="mycrm-cache-dot cache-hit"></span>');
    } else if (fetchTime) {
      indicator.html(`<span class="mycrm-cache-dot cache-miss"></span>`);
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
// Define filters based on section
  getFilters() {
    if (this.state.section === "lead") {
      // Validation: Sirf un leads ko count karein jo Assigned hain AND status 'Lead' hai
        const validatedAssignedCount = this.state.data.filter(item => 
            this.assignedLeadNames.includes(item.name) && item.status === "Lead"
        ).length;
      return [
        { name: "Assigned To Me", count: validatedAssignedCount },
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
// apply current filter to data
  applyFilter() {

  // ✅ ASSIGNED TO ME — FIRST
  if (this.state.filter === "Assigned To Me") {
    this.state.filteredData = this.state.data.filter(item =>
      this.assignedLeadNames.includes(item.name) && item.status === "Lead" // Added status check
    );

    this.state.activeFilter = this.state.filter;
    this.renderList();
    this.renderFilters();
    this.updateCount();
    return;
  }

  let data = [...this.state.data];

  if (this.state.filter !== "All") {
    if (this.state.section === "appointment") {
      const now = frappe.datetime.now_datetime();
      const today = frappe.datetime.get_today();

      data = data.filter(item => {
        switch (this.state.filter) {
          case "Today":
            const d = frappe.datetime.str_to_obj(item.scheduled_time);
            return frappe.datetime.obj_to_str(d) === today;
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
      data = data.filter(item => item.status === this.state.filter);
    }
  }

  this.state.filteredData = data;
  this.renderList();
  this.renderFilters();
  this.updateCount();
  }
// Fetch assigned leads and map assigned by details
async fetchAssignedLeads() {
  const { message = [] } = await frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "ToDo",
      fields: [
        "reference_name",
        "assigned_by",
        "assigned_by_full_name"
      ],
      filters: {
        reference_type: "Lead",
        allocated_to: frappe.session.user
      },
      limit_page_length: 1000
    }
  });

  this.assignedByMap = {};
  this.assignedLeadNames = [];

  const uniqueLeads = [...new Set(
    message.map(r => r.reference_name).filter(Boolean)
  )];

  for (const lead of uniqueLeads) {
    const row = message.find(r => r.reference_name === lead);
    if (!row) continue;

    const emp = row.assigned_by
      ? await this.getEmployeeByUser(row.assigned_by)
      : null;

    this.assignedByMap[lead] = {
      full_name:emp?.name ||  row.assigned_by_full_name || row.assigned_by ||
        "Unknown",
      employee_code: emp?.code || "",
      branch: emp?.branch || ""
    };

    this.assignedLeadNames.push(lead);
  }

  // Yahan original assignedCount ki jagah validation ke baad wala count set hoga
    this.assignedCount = this.state.data.filter(item => 
        this.assignedLeadNames.includes(item.name) && item.status === "Lead"
    ).length;

  console.log("✅ Assigned Leads:", this.assignedLeadNames);
}
// Get employee details by user ID for assigned leads
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
    return this.state.data.filter((d) => d.status === status).length;
  }

  countToday() {
    const today = frappe.datetime.get_today();
    return this.state.data.filter((d) => {
      if (!d.scheduled_time) return false;
      return (
        frappe.datetime.obj_to_str(
          frappe.datetime.str_to_obj(d.scheduled_time),
        ) === today
      );
    }).length;
  }

  countDue() {
    const now = frappe.datetime.now_datetime();
    return this.state.data.filter(
      (d) =>
        d.scheduled_time && d.scheduled_time < now && d.status !== "Closed",
    ).length;
  }

  countUpcoming() {
    const now = frappe.datetime.now_datetime();
    return this.state.data.filter(
      (d) =>
        d.scheduled_time && d.scheduled_time > now && d.status !== "Closed",
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
    data.forEach((item) => {
      const card = this.renderWhatsAppCard(item);
      container.append(card);
    });

    // Central Event Delegation
    container
      .off("click", ".mycrm-list-item")
      .on("click", ".mycrm-list-item", (e) => {
        e.preventDefault();
        const name = $(e.currentTarget).attr("data-name");
        if (this.state.section === "lead") {
          this.editLead(name);
        } else {
          this.editAppointment(name);
        }
      });
  }

  // async editLead(name) {
  //   const me = this;

  //   frappe.model.with_doc("Lead", name, async function () {
  //     const doc = frappe.get_doc("Lead", name);
  //     if (!doc) return;

  //     let productsData = JSON.parse(
  //       JSON.stringify(doc.custom_product_table || []),
  //     );
  //     let appointmentsData = [];

  //     // Fetch Appointments
  //     const appt_res = await frappe.db.get_list("Appointment", {
  //       filters: { party: name },
  //       fields: ["name", "scheduled_time", "status"],
  //       order_by: "scheduled_time desc",
  //     });
  //     appointmentsData = appt_res || [];

  //     const d = new frappe.ui.Dialog({
  //       title: `Update Lead: ${name}`,
  //       fields: [
  //         {
  //           fieldname: "tab_navigation",
  //           fieldtype: "HTML",
  //           options: `
  //                       <div class="custom-tabs-wrapper" style="display: flex; border-bottom: 2px solid #f1f1f1; margin-bottom: 15px;">
  //                           <div class="tab-link active" id="tab-lead-btn" style="padding: 10px 25px; cursor: pointer; color: #006264; border-bottom: 3px solid #006264; font-weight: bold;">Lead & Products</div>
  //                           <div class="tab-link" id="tab-appt-btn" style="padding: 10px 25px; cursor: pointer; color: #6b7280;">Appointments</div>
  //                       </div>
  //                   `,
  //         },
  //         { fieldname: "lead_and_product_wrapper", fieldtype: "HTML" },
  //         { fieldname: "appointment_tab_wrapper", fieldtype: "HTML" },
  //         {
  //           fieldname: "first_name",
  //           fieldtype: "Data",
  //           hidden: 1,
  //           default: doc.first_name,
  //         },
  //         {
  //           fieldname: "mobile_no",
  //           fieldtype: "Data",
  //           hidden: 1,
  //           default: doc.mobile_no,
  //         },
  //         {
  //           fieldname: "status",
  //           fieldtype: "Select",
  //           hidden: 1,
  //           options: ["Lead", "Follow Up", "Converted", "Not Interested"],
  //           default: doc.status,
  //         },
  //         {
  //           fieldname: "source",
  //           fieldtype: "Link",
  //           options: "Lead Source",
  //           hidden: 1,
  //           default: doc.source,
  //         },
  //       ],
  //       primary_action_label: __("Update Lead"),
  //       primary_action: async (values) => {
  //         const final_values = {
  //           first_name: d.$wrapper.find("#f_name_edit").val(),
  //           mobile_no: d.$wrapper.find("#m_no_edit").val(),
  //           status: d.$wrapper.find("#status_edit").val(),
  //           source: d.$wrapper.find("#source_edit").val(),
  //         };

  //         frappe.call({
  //           method: "frappe.client.set_value",
  //           args: {
  //             doctype: "Lead",
  //             name: name,
  //             fieldname: {
  //               ...final_values,
  //               custom_product_table: productsData,
  //             },
  //           },
  //           callback: (r) => {
  //             if (!r.exc) {
  //               frappe.show_alert({
  //                 message: __("Lead Updated"),
  //                 indicator: "green",
  //               });
  //               d.hide();
  //               me.fetchData();
  //             }
  //           },
  //         });
  //       },
  //     });

  //     const renderLeadTab = () => {
  //       const wrapper = d.get_field("lead_and_product_wrapper").$wrapper;
  //       wrapper.html(`
  //               <div id="lead-content-section">
  //                   <div class="row">
  //                       <div class="col-sm-6">
  //                           <div class="form-group">
  //                               <label class="control-label">Full Name</label>
  //                               <input type="text" id="f_name_edit" class="form-control" value="${doc.first_name || ""}">
  //                           </div>
  //                           <div class="form-group">
  //                               <label class="control-label">Status</label>
  //                               <select id="status_edit" class="form-control">
  //                                   ${["Lead", "Follow Up", "Converted", "Not Interested"].map((s) => `<option value="${s}" ${doc.status === s ? "selected" : ""}>${s}</option>`).join("")}
  //                               </select>
  //                           </div>
  //                       </div>
  //                       <div class="col-sm-6">
  //                           <div class="form-group">
  //                               <label class="control-label">Phone Number</label>
  //                               <input type="text" id="m_no_edit" class="form-control" value="${doc.mobile_no || ""}">
  //                           </div>
  //                           <div class="form-group">
  //                               <label class="control-label">Source</label>
  //                               <input type="text" id="source_edit" class="form-control" value="${doc.source || ""}">
  //                           </div>
  //                       </div>
  //                   </div>
  //                   <div style="margin-top:20px;">
  //                       <h6 style="font-weight:600; margin-bottom:10px;">Products</h6>
  //                       <div id="original-product-table-grid"></div>
  //                   </div>
  //               </div>
  //           `);

  //       const refreshProductTable = () => {
  //         const grid = d.$wrapper.find("#original-product-table-grid");
  //         grid.html(`
  //                   <div style="border:1px solid #d1d8dd; border-radius:8px; overflow:hidden;">
  //                       <table class="table table-bordered" style="margin:0; font-size:13px;">
  //                           <thead style="background:#f7fafc;">
  //                               <tr>
  //                                   <th style="width:40px; text-align:center;">#</th>
  //                                   <th>Product ID</th>
  //                                   <th>Product Name</th>
  //                                   <th style="width:120px; text-align:right;">Amount (₹)</th>
  //                                   <th style="width:80px; text-align:center;">Action</th>
  //                               </tr>
  //                           </thead>
  //                           <tbody id="p-body-edit"></tbody>
  //                       </table>
  //                       <div style="padding:10px; background:#f8fafc; border-top:1px solid #d1d8dd;">
  //                           <button class="btn btn-xs btn-default" id="add-p-edit" style="background:#006264; color:white;">+ Add Product Row</button>
  //                       </div>
  //                   </div>
  //               `);

  //         const tbody = d.$wrapper.find("#p-body-edit");
  //         productsData.forEach((row, idx) => {
  //           const tr = $(`<tr data-idx="${idx}">
  //                       <td style="text-align:center; vertical-align:middle;">${idx + 1}</td>
  //                       <td style="padding:8px;"><div class="link-wrap-${idx}"></div></td>
  //                       <td style="padding:8px; vertical-align:middle;"><input type="text" class="form-control input-sm p-name" value="${row.product_name || ""}" readonly style="background:#f8fafc; border:none;"></td>
  //                       <td style="padding:8px; vertical-align:middle;"><input type="number" class="form-control input-sm p-amt" value="${row.product_amount || 0}" style="text-align:right;"></td>
  //                       <td class="text-center" style="vertical-align:middle;"><button class="btn btn-xs btn-danger del-p">Remove</button></td>
  //                   </tr>`).appendTo(tbody);

  //           frappe.ui.form
  //             .make_control({
  //               df: {
  //                 fieldtype: "Link",
  //                 options: "Product",
  //                 fieldname: `p_${idx}`,
  //                 onchange: function () {
  //                   productsData[idx].product = this.get_value();
  //                   frappe.db.get_value(
  //                     "Product",
  //                     this.get_value(),
  //                     "product_name",
  //                     (r) => {
  //                       productsData[idx].product_name = r.product_name;
  //                       tr.find(".p-name").val(r.product_name);
  //                     },
  //                   );
  //                 },
  //               },
  //               parent: tr.find(`.link-wrap-${idx}`),
  //               render_input: true,
  //             })
  //             .set_value(row.product);

  //           tr.find(".p-amt").on("input", function () {
  //             productsData[idx].product_amount = parseFloat($(this).val()) || 0;
  //           });
  //         });
  //       };
  //       d.$wrapper.on("click", "#add-p-edit", () => {
  //         productsData.push({
  //           product: "",
  //           product_name: "",
  //           product_amount: 0,
  //         });
  //         refreshProductTable();
  //       });
  //       d.$wrapper.on("click", ".del-p", function () {
  //         productsData.splice($(this).closest("tr").data("idx"), 1);
  //         refreshProductTable();
  //       });
  //       refreshProductTable();
  //     };

  //     const renderApptTab = () => {
  //       const wrapper = d.get_field("appointment_tab_wrapper").$wrapper;
  //       wrapper.html(`
  //               <div id="appointment-content-section" style="display:none;">
  //                   <div style="padding: 15px; border: 1px solid #d1d8dd; border-radius: 8px; background: #fcfcfc;">
  //                       <h6 style="font-weight:600; margin-bottom:12px;">Schedule New Appointment</h6>
  //                       <div style="display:flex; gap:10px; margin-bottom:20px;">
  //                           <input type="datetime-local" id="new_appt_t_edit" class="form-control" style="max-width:250px;">
  //                           <button class="btn btn-primary btn-sm" id="btn-create-appt-final" style="background:#006264;">Schedule</button>
  //                       </div>
  //                       <h6 style="font-weight:600; margin-bottom:12px;">Appointment History</h6>
  //                       <table class="table table-bordered" style="font-size:13px;">
  //                           <thead style="background:#f7fafc;">
  //                               <tr><th>Time</th><th>Status</th><th style="text-align:center;">Action</th></tr>
  //                           </thead>
  //                           <tbody id="appt-h-body-edit"></tbody>
  //                       </table>
  //                   </div>
  //               </div>
  //           `);

  //       const loadHistory = () => {
  //         const tbody = d.$wrapper.find("#appt-h-body-edit").empty();
  //         if (!appointmentsData.length)
  //           tbody.append(
  //             '<tr><td colspan="3" class="text-center">No history found</td></tr>',
  //           );
  //         appointmentsData.forEach((app) => {
  //           $(`<tr>
  //                       <td style="vertical-align:middle;">${frappe.datetime.global_date_format(app.scheduled_time)} ${frappe.datetime.get_time(app.scheduled_time)}</td>
  //                       <td style="vertical-align:middle;"><span class="label label-${app.status === "Open" ? "orange" : "green"}">${app.status}</span></td>
  //                       <td style="text-align:center;"><button class="btn btn-xs btn-default" onclick="frappe.set_route('Form', 'Appointment', '${app.name}')">View</button></td>
  //                   </tr>`).appendTo(tbody);
  //         });
  //       };

  //       // --- FIXED APPOINTMENT CREATION WITH LEAD DETAILS ---
  //       // --- FIXED APPOINTMENT CREATION ---
  //       d.$wrapper.on("click", "#btn-create-appt-final", async () => {
  //         const time = d.$wrapper.find("#new_appt_t_edit").val();
  //         if (!time) return frappe.msgprint("Please select date & time");

  //         await frappe.call({
  //           method: "frappe.client.insert",
  //           args: {
  //             doc: {
  //               doctype: "Appointment",
  //               party: name,
  //               appointment_with: "Lead",
  //               scheduled_time: time,
  //               status: "Open",
  //               // Error ke mutabiq sahi field IDs yahan hain:
  //               customer_name: doc.first_name,
  //               customer_email: doc.email_id,
  //               // Agar mobile bhi error de, toh check karein uska ID kya hai (e.g., mobile_no)
  //               mobile_no: doc.mobile_no,
  //             },
  //           },
  //           callback: (r) => {
  //             if (!r.exc) {
  //               frappe.show_alert("Appointment Created Successfully");
  //               appointmentsData.unshift(r.message);
  //               loadHistory(); // Table refresh karne ke liye
  //             }
  //           },
  //         });
  //       });
  //       loadHistory();
  //     };

  //     const setupTabs = () => {
  //       d.$wrapper.find("#tab-lead-btn").on("click", function () {
  //         d.$wrapper.find(".tab-link").css({
  //           color: "#6b7280",
  //           "border-bottom": "none",
  //           "font-weight": "normal",
  //         });
  //         $(this).css({
  //           color: "#006264",
  //           "border-bottom": "3px solid #006264",
  //           "font-weight": "bold",
  //         });
  //         d.$wrapper.find("#lead-content-section").show();
  //         d.$wrapper.find("#appointment-content-section").hide();
  //       });

  //       d.$wrapper.find("#tab-appt-btn").on("click", function () {
  //         d.$wrapper.find(".tab-link").css({
  //           color: "#6b7280",
  //           "border-bottom": "none",
  //           "font-weight": "normal",
  //         });
  //         $(this).css({
  //           color: "#006264",
  //           "border-bottom": "3px solid #006264",
  //           "font-weight": "bold",
  //         });
  //         d.$wrapper.find("#lead-content-section").hide();
  //         d.$wrapper.find("#appointment-content-section").show();
  //       });
  //     };

  //     d.show();
  //     d.$wrapper
  //       .find(".modal-dialog")
  //       .css({ "max-width": "850px", width: "95%" });

  //     renderLeadTab();
  //     renderApptTab();
  //     setupTabs();
  //   });
  // }

 async editLead(name) {
    const me = this;

    // 1. Sirf wahi Lead Sources fetch honge jinka 'active' field 1 (Checked) hai
    const lead_sources = await frappe.db.get_list("Lead Source", { 
        fields: ["name"],
        filters: { "custom_active": 1 } 
    });
    const source_options = lead_sources.map(s => s.name);

    frappe.model.with_doc("Lead", name, async function () {
      const doc = frappe.get_doc("Lead", name);
      if (!doc) return;

      let productsData = JSON.parse(
        JSON.stringify(doc.custom_product_table || []),
      );
      let appointmentsData = [];

      // Fetch Appointments History
      const appt_res = await frappe.db.get_list("Appointment", {
        filters: { party: name },
        fields: ["name", "scheduled_time", "status"],
        order_by: "scheduled_time desc",
      });
      appointmentsData = appt_res || [];

      const d = new frappe.ui.Dialog({
        title: `Update Lead: ${name}`,
        fields: [
          {
            fieldname: "tab_navigation",
            fieldtype: "HTML",
            options: `
                        <div id="dialog-error-banner" style="display: none; padding: 10px; margin-bottom: 15px; border-radius: 6px; background: #fff5f5; border: 1px solid #feb2b2; color: #c53030; font-size: 13px;"></div>
                        <div class="custom-tabs-wrapper" style="display: flex; border-bottom: 2px solid #f1f1f1; margin-bottom: 15px;">
                            <div class="tab-link active" id="tab-lead-btn" style="padding: 10px 25px; cursor: pointer; color: #006264; border-bottom: 3px solid #006264; font-weight: bold;">Lead & Products</div>
                            <div class="tab-link" id="tab-appt-btn" style="padding: 10px 25px; cursor: pointer; color: #6b7280;">Appointments</div>
                        </div>
                    `,
          },
          { fieldname: "lead_and_product_wrapper", fieldtype: "HTML" },
          { fieldname: "appointment_tab_wrapper", fieldtype: "HTML" },
          { fieldname: "first_name", fieldtype: "Data", hidden: 1, default: doc.first_name },
          { fieldname: "mobile_no", fieldtype: "Data", hidden: 1, default: doc.mobile_no },
          { fieldname: "status", fieldtype: "Select", hidden: 1, options: ["Lead", "Follow Up", "Converted", "Not Interested"], default: doc.status },
          { fieldname: "source", fieldtype: "Link", options: "Lead Source", hidden: 1, default: doc.source },
        ],
        primary_action_label: __("Update Lead"),
        primary_action: async (values) => {
    const showError = (msg) => {
        const banner = d.$wrapper.find("#dialog-error-banner");
        banner.html(`<strong>⚠️ Error:</strong> ${msg}`).show();
        d.$wrapper.find(".modal-body").scrollTop(0);
        setTimeout(() => banner.fadeOut(), 5000);
    };

    const input_status = d.$wrapper.find("#status_edit").val();
    const input_mobile = d.$wrapper.find("#m_no_edit").val();

    // 📱 Mobile Validation
    if (input_mobile && !/^[6-9]\d{9}$/.test(input_mobile)) {
        return showError(__("Please enter a valid 10-digit mobile number starting with 6-9."));
    }

    const final_values = {
        first_name: d.$wrapper.find("#f_name_edit").val(),
        mobile_no: input_mobile,
        status: input_status,
        source: d.$wrapper.find("#source_edit").val(), 
    };

    // ✅ AUTO TAB SWITCH LOGIC
    if (input_status === "Follow Up") {
        const has_new_appt = d.$wrapper.find("#new_appt_t_edit").val();
        
        if (!appointmentsData.length && !has_new_appt) {
            showError(__('Please schedule an appointment to set status as <b>Follow Up</b>.'));
            d.$wrapper.find("#tab-appt-btn").trigger("click");
            const $apptInput = d.$wrapper.find("#new_appt_t_edit");
            $apptInput.css("border", "2px solid #ff5858");
            setTimeout(() => $apptInput.css("border", "1px solid #d1d8dd"), 3000);
            return; 
        }
    }

    // Call save logic
    frappe.call({
        method: "frappe.client.set_value",
        args: {
            doctype: "Lead",
            name: name,
            fieldname: {
                ...final_values,
                custom_product_table: productsData,
            },
        },
        callback: (r) => {
            if (!r.exc) {
                frappe.show_alert({ message: __("Lead Updated"), indicator: "green" });
                d.hide();
                me.fetchData();
            }
        },
    });
},
      });

      const renderLeadTab = () => {
        const wrapper = d.get_field("lead_and_product_wrapper").$wrapper;
        wrapper.html(`
                <div id="lead-content-section">
                    <div class="row">
                        <div class="col-sm-6">
                            <div class="form-group">
                                <label class="control-label">Full Name</label>
                                <input type="text" id="f_name_edit" class="form-control" value="${doc.first_name || ""}">
                            </div>
                            <div class="form-group">
                                <label class="control-label">Status</label>
                                <select id="status_edit" class="form-control">
                                    ${["Lead", "Follow Up", "Converted", "Not Interested"].map((s) => `<option value="${s}" ${doc.status === s ? "selected" : ""}>${s}</option>`).join("")}
                                </select>
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="form-group">
                                <label class="control-label">Phone Number</label>
                                <input type="text" id="m_no_edit" class="form-control" value="${doc.mobile_no || ""}">
                            </div>
                            <div class="form-group">
                                <label class="control-label">Source</label>
                                <select id="source_edit" class="form-control">
                                    <option value=""> </option>
                                    ${source_options.map((s) => `<option value="${s}" ${doc.source === s ? "selected" : ""}>${s}</option>`).join("")}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:20px;">
                        <h6 style="font-weight:600; margin-bottom:10px;">Products</h6>
                        <div id="original-product-table-grid"></div>
                    </div>
                </div>
            `);

        const refreshProductTable = () => {
          const grid = d.$wrapper.find("#original-product-table-grid");
          grid.html(`
                    <div style="border:1px solid #d1d8dd; border-radius:8px; overflow:hidden;">
                        <table class="table table-bordered" style="margin:0; font-size:13px;">
                            <thead style="background:#f7fafc;">
                                <tr>
                                    <th style="width:40px; text-align:center;">#</th>
                                    <th>Product ID</th>
                                    <th>Product Name</th>
                                    <th style="width:120px; text-align:right;">Amount (₹)</th>
                                    <th style="width:80px; text-align:center;">Action</th>
                                </tr>
                            </thead>
                            <tbody id="p-body-edit"></tbody>
                        </table>
                        <div style="padding:10px; background:#f8fafc; border-top:1px solid #d1d8dd;">
                            <button class="btn btn-xs btn-default" id="add-p-edit" style="background:#006264; color:white;">+ Add Product Row</button>
                        </div>
                    </div>
                `);

          const tbody = d.$wrapper.find("#p-body-edit");
          productsData.forEach((row, idx) => {
            const tr = $(`<tr data-idx="${idx}">
                        <td style="text-align:center; vertical-align:middle;">${idx + 1}</td>
                        <td style="padding:8px;"><div class="link-wrap-${idx}"></div></td>
                        <td style="padding:8px; vertical-align:middle;"><input type="text" class="form-control input-sm p-name" value="${row.product_name || ""}" readonly style="background:#f8fafc; border:none;"></td>
                        <td style="padding:8px; vertical-align:middle;"><input type="number" class="form-control input-sm p-amt" value="${row.product_amount || 0}" style="text-align:right;"></td>
                        <td class="text-center" style="vertical-align:middle;"><button class="btn btn-xs btn-danger del-p">Remove</button></td>
                    </tr>`).appendTo(tbody);

            frappe.ui.form
              .make_control({
                df: {
                  fieldtype: "Link",
                  options: "Product",
                  fieldname: `p_${idx}`,
                  onchange: function () {
                    productsData[idx].product = this.get_value();
                    frappe.db.get_value(
                      "Product",
                      this.get_value(),
                      "product_name",
                      (r) => {
                        productsData[idx].product_name = r.product_name;
                        tr.find(".p-name").val(r.product_name);
                      },
                    );
                  },
                },
                parent: tr.find(`.link-wrap-${idx}`),
                render_input: true,
              })
              .set_value(row.product);

            tr.find(".p-amt").on("input", function () {
              productsData[idx].product_amount = parseFloat($(this).val()) || 0;
            });
          });
        };
        d.$wrapper.on("click", "#add-p-edit", () => {
          productsData.push({ product: "", product_name: "", product_amount: 0 });
          refreshProductTable();
        });
        d.$wrapper.on("click", ".del-p", function () {
          productsData.splice($(this).closest("tr").data("idx"), 1);
          refreshProductTable();
        });
        refreshProductTable();
      };

      const renderApptTab = () => {
        const wrapper = d.get_field("appointment_tab_wrapper").$wrapper;
        wrapper.html(`
                <div id="appointment-content-section" style="display:none;">
                    <div style="padding: 15px; border: 1px solid #d1d8dd; border-radius: 8px; background: #fcfcfc;">
                        <h6 style="font-weight:600; margin-bottom:12px;">Schedule New Appointment</h6>
                        <div style="display:flex; flex-direction: column; gap:10px; margin-bottom:20px;">
                            <div style="display:flex; flex-wrap: wrap; gap:10px;">
                                <input type="datetime-local" id="new_appt_t_edit" class="form-control" style="flex: 1; min-width:200px;">
                                <button class="btn btn-primary btn-sm" id="btn-create-appt-final" style="background:#006264; height: 34px;">Schedule</button>
                            </div>
                            <textarea id="new_appt_rem_edit" class="form-control" rows="2" placeholder="Appointment remarks..." style="resize:none; font-size: 13px;"></textarea>
                        </div>
                        <h6 style="font-weight:600; margin-bottom:12px;">Appointment History</h6>
                        <div style="overflow-x: auto;">
                            <table class="table table-bordered" style="font-size:13px; min-width: 300px;">
                                <thead style="background:#f7fafc;">
                                    <tr><th>Time</th><th>Status</th><th style="text-align:center;">Action</th></tr>
                                </thead>
                                <tbody id="appt-h-body-edit"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `);

        const loadHistory = () => {
          const tbody = d.$wrapper.find("#appt-h-body-edit").empty();
          if (!appointmentsData.length)
            tbody.append('<tr><td colspan="3" class="text-center">No history found</td></tr>');
          
          appointmentsData.forEach((app) => {
            $(`<tr>
                        <td style="vertical-align:middle;">${frappe.datetime.global_date_format(app.scheduled_time)} ${frappe.datetime.get_time(app.scheduled_time)}</td>
                        <td style="vertical-align:middle;"><span class="label label-${app.status === "Open" ? "orange" : "green"}">${app.status}</span></td>
                        <td style="text-align:center;"><button class="btn btn-xs btn-default" onclick="frappe.crm_app.editAppointment('${app.name}')">View</button></td>
                    </tr>`).appendTo(tbody);
          });
        };

        d.$wrapper.off("click", "#btn-create-appt-final").on("click", "#btn-create-appt-final", async (e) => {
          const $btn = $(e.currentTarget);
          if ($btn.prop('disabled')) return;
          
          const time = d.$wrapper.find("#new_appt_t_edit").val();
          if (!time) return frappe.msgprint("Please select date & time");

          $btn.prop('disabled', true);

          try {
            // 🛡️ Duplicate Appointment Check
            const dupRes = await frappe.call({
              method: "sahayog.scrm.page.my_crm.my_crm.check_duplicate_appointment",
              args: { party: name, scheduled_time: time }
            });

            if (dupRes.message && dupRes.message.duplicate) {
              frappe.msgprint({
                title: __("Duplicate Appointment"),
                indicator: "red",
                message: __("An appointment already exists for this Lead at the selected time.")
              });
              $btn.prop('disabled', false);
              return;
            }

            await frappe.call({
              method: "frappe.client.insert",
              args: {
                doc: {
                  doctype: "Appointment",
                  party: name,
                  appointment_with: "Lead",
                  scheduled_time: time,
                  status: "Open",
                  customer_name: d.$wrapper.find("#f_name_edit").val() || doc.first_name,
                  customer_email: doc.email_id || `${name}@lead.local`,
                  customer_phone_number: d.$wrapper.find("#m_no_edit").val() || doc.mobile_no,
                  customer_details: d.$wrapper.find("#new_appt_rem_edit").val(),
                },
              },
              callback: (r) => {
                if (!r.exc) {
                  frappe.show_alert("Appointment Created Successfully");
                  appointmentsData.unshift(r.message);
                  loadHistory();
                  d.$wrapper.find("#new_appt_t_edit").val("");
                  d.$wrapper.find("#new_appt_rem_edit").val("");
                }
              },
            });
          } catch (error) {
            console.error(error);
          } finally {
            $btn.prop('disabled', false);
          }
        });
        loadHistory();
      };

      const setupTabs = () => {
        d.$wrapper.find("#tab-lead-btn").on("click", function () {
          d.$wrapper.find(".tab-link").css({ color: "#6b7280", "border-bottom": "none", "font-weight": "normal" });
          $(this).css({ color: "#006264", "border-bottom": "3px solid #006264", "font-weight": "bold" });
          d.$wrapper.find("#lead-content-section").show();
          d.$wrapper.find("#appointment-content-section").hide();
        });

        d.$wrapper.find("#tab-appt-btn").on("click", function () {
          d.$wrapper.find(".tab-link").css({ color: "#6b7280", "border-bottom": "none", "font-weight": "normal" });
          $(this).css({ color: "#006264", "border-bottom": "3px solid #006264", "font-weight": "bold" });
          d.$wrapper.find("#lead-content-section").hide();
          d.$wrapper.find("#appointment-content-section").show();
        });
      };

      d.show();
      d.$wrapper.find(".modal-dialog").css({ "max-width": "850px", width: "95%" });

      renderLeadTab();
      renderApptTab();
      setupTabs();
    });
}

async editAppointment(name) {
    const me = this;
    frappe.model.with_doc("Appointment", name, async function () {
        const doc = frappe.get_doc("Appointment", name);
        if (!doc) return;

        const d = new frappe.ui.Dialog({
            title: `Update Appointment: ${name}`,
            fields: [
                {
                    fieldname: "tab_navigation",
                    fieldtype: "HTML",
                    options: `
                        <div class="custom-tabs-wrapper" style="display: flex; border-bottom: 2px solid #f1f1f1; margin-bottom: 15px;">
                            <div class="tab-link active" id="tab-appt-details-btn" style="padding: 10px 25px; cursor: pointer; color: #006264; border-bottom: 3px solid #006264; font-weight: bold;">Appointment Details</div>
                        </div>
                    `,
                },
                { fieldname: "details_wrapper", fieldtype: "HTML" },
            ],
            primary_action_label: __("Update Appointment"),
            primary_action: async (values) => {
                const btn = d.get_primary_btn();
                btn.prop('disabled', true);

                const final_values = {
                    scheduled_time: d.$wrapper.find("#appt_time_edit").val(),
                    status: d.$wrapper.find("#appt_status_edit").val(),
                    customer_details: d.$wrapper.find("#appt_remarks_edit").val(),
                };

                try {
                    await frappe.call({
                        method: "frappe.client.set_value",
                        args: {
                            doctype: "Appointment",
                            name: name,
                            fieldname: final_values,
                        },
                        freeze: true,
                        freeze_message: "Updating..."
                    });
                    frappe.show_alert({ message: __("Appointment Updated"), indicator: "green" });
                    d.hide();
                    me.fetchData();
                } catch (e) {
                    console.error(e);
                    btn.prop('disabled', false);
                }
            },
        });

        const renderDetailsTab = () => {
            const wrapper = d.get_field("details_wrapper").$wrapper;
            const scheduled_time = doc.scheduled_time ? doc.scheduled_time.replace(" ", "T").substring(0, 16) : "";
            
            wrapper.html(`
                <div id="appt-details-section">
                    <div style="padding: 15px; border: 1px solid #d1d8dd; border-radius: 8px; background: #fcfcfc; margin-bottom: 15px;">
                        <div class="row">
                            <div class="col-sm-6">
                                <div class="form-group">
                                    <label class="control-label">Customer Name</label>
                                    <input type="text" class="form-control" value="${doc.customer_name || ""}" readonly style="background:#f8fafc;">
                                </div>
                                <div class="form-group">
                                    <label class="control-label">Lead (ID)</label>
                                    <input type="text" class="form-control" value="${doc.party || ""}" readonly style="background:#f8fafc;">
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <div class="form-group">
                                    <label class="control-label">Mobile Number</label>
                                    <input type="text" class="form-control" value="${doc.customer_phone_number || ""}" readonly style="background:#f8fafc;">
                                </div>
                                <div class="form-group">
                                    <label class="control-label">Email Address</label>
                                    <input type="text" class="form-control" value="${doc.customer_email || ""}" readonly style="background:#f8fafc;">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="padding: 15px; border: 1px solid #d1d8dd; border-radius: 8px; background: #fff;">
                        <h6 style="font-weight:600; margin-bottom:15px; color: #006264;">Schedule & Status</h6>
                        <div class="row">
                            <div class="col-sm-6">
                                <div class="form-group">
                                    <label class="control-label">Scheduled Date & Time</label>
                                    <input type="datetime-local" id="appt_time_edit" class="form-control" value="${scheduled_time}">
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <div class="form-group">
                                    <label class="control-label">Status</label>
                                    <select id="appt_status_edit" class="form-control">
                                        ${["Open", "Closed"].map((s) => `<option value="${s}" ${doc.status === s ? "selected" : ""}>${s}</option>`).join("")}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="form-group" style="margin-top:10px;">
                            <label class="control-label">Remarks / Notes</label>
                            <textarea id="appt_remarks_edit" class="form-control" rows="3" style="resize:none;">${doc.customer_details || ""}</textarea>
                        </div>
                    </div>
                </div>
            `);
        };

        d.show();
        d.$wrapper.find(".modal-dialog").css({ "max-width": "800px", width: "95%" });
        renderDetailsTab();
    });
}
  // 🔹 extracted helper (Petite-Vue friendly & reusable)
  showEmptyState(show) {
    $("#mycrm-empty").toggle(show);
    $("#mycrm-list-body").toggle(!show);
    $("#mycrm-load-more").toggle(!show && this.state.hasMore);
  }
// UI implementation of a WhatsApp-style card
renderWhatsAppCard(item) {
    const modified = frappe.datetime.comment_when(item.modified);
    let name, message, statusClass, statusText, avatar, amountDisplay = "";

    if (this.state.section === "lead") {
      name = item.lead_name || `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Unnamed";
      avatar = name.charAt(0).toUpperCase();

      const totalAmount = item.totalAmount || 0;
      amountDisplay = totalAmount > 0 
        ? `<span style="color: #10b981; font-weight: 700; white-space: nowrap; flex-shrink: 0; padding-left: 4px;">  ₹${this.formatIndianCurrency(totalAmount)}</span>` 
        : "";

      const details = [];
      if (item.mobile_no) details.push(`📱 ${item.mobile_no}`);
      if (item.source) details.push(`📌 ${item.source}`);

      if (this.assignedByMap?.[item.name]) {
        const a = this.assignedByMap[item.name];
        details.push(`
          <div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:6px; font-size:12px;">
            <span style="background:#f1f5f9; padding:4px 8px; border-radius:6px; color:#111;">
              Assigned By: <b>${a.full_name}</b>
            </span>
          </div>
        `);
      }

      message = details.join(" • ") || "No details";
      statusClass = (item.status || "lead").toLowerCase().replace(" ", "-");
      statusText = item.status || "Lead";
    } else {
      name = item.customer_name || "Unnamed";
      avatar = name.charAt(0).toUpperCase();
      const scheduledTime = frappe.datetime.str_to_user(item.scheduled_time);
      message = `📅 ${scheduledTime} ${item.customer_phone_number ? `• 📱 ${item.customer_phone_number}` : ""}`;
      statusClass = (item.status || "open").toLowerCase();
      statusText = item.status || "Open";
    }

    const card = $(`
        <div class="mycrm-list-item" data-name="${item.name}" style="cursor: pointer; padding: 12px; border-bottom: 1px solid #eee; display: flex; align-items: flex-start; gap: 12px; overflow: hidden;">
            <div class="mycrm-avatar" style="min-width: 42px; height: 42px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #4b5563; flex-shrink: 0;">${avatar}</div>
            <div class="mycrm-content" style="flex: 1; min-width: 0; overflow: hidden;">
                <div class="mycrm-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; width: 100%;">
                    
                    <div style="display: flex; align-items: center; min-width: 0; flex: 1;">
                        <div class="name-only-scroll-container" style="display: flex; overflow: hidden; white-space: nowrap; position: relative; min-width: 0;">
                            <style>
                                @media (max-width: 768px) {
                                    .should-scroll-name {
                                        display: inline-block;
                                        padding-right: 30px;
                                        animation: marquee-only-name 8s linear infinite;
                                    }
                                    @keyframes marquee-only-name {
                                        0% { transform: translateX(0); }
                                        100% { transform: translateX(-50%); }
                                    }
                                }
                            </style>
                            <div class="name-wrapper" style="font-weight: 600; color: #111827; font-size: 14px; display: inline-block;">
                                <span class="main-name-span">${name}</span>
                            </div>
                        </div>
                        ${amountDisplay}
                    </div>

                    <div class="mycrm-time" style="font-size: 11px; color: #6b7280; white-space: nowrap; flex-shrink: 0; margin-left: 10px;">${modified}</div>
                </div>
                
                <div class="mycrm-message" style="font-size: 13px; color: #4b5563; display: flex; justify-content: space-between; align-items: flex-end;">
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${message}</span>
                    <span class="mycrm-status-badge ${statusClass}" style="margin-left: 8px; font-size: 10px; padding: 2px 8px; border-radius: 10px; white-space: nowrap;">${statusText}</span>
                </div>
            </div>
        </div>
    `);

    setTimeout(() => {
        const container = card.find('.name-only-scroll-container');
        const wrapper = card.find('.name-wrapper');
        if (window.innerWidth <= 768 && wrapper.width() > container.width()) {
            wrapper.append(`<span style="margin-left: 30px;">${name}</span>`);
            wrapper.addClass('should-scroll-name');
        }
    }, 150);

    card.on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.state.section === "lead") {
            this.editLead(item.name);
        } else {
            this.editAppointment(item.name);
        }
    });

    return card;
  }
  // Helper to format currency in Indian style
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

  // handleScroll() {
  //   const container = $("#mycrm-list-container");
  //   const scrollTop = container.scrollTop();
  //   const scrollHeight = container[0].scrollHeight;
  //   const clientHeight = container[0].clientHeight;

  //   if (scrollTop + clientHeight > scrollHeight - 100) {
  //     if (this.state.hasMore && !this.isLoading) {
  //       this.loadMore();
  //     }
  //   }
  // }

  async loadMore() {
    if (!this.state.hasMore || this.isLoading) return;

    this.isLoading = true;
    $("#mycrm-load-more-btn").html(
      '<i class="fa fa-spinner fa-spin"></i> Loading...',
    );

    await this.fetchData(true);

    this.isLoading = false;
    $("#mycrm-load-more-btn").html(
      '<i class="fa fa-arrow-down"></i> Load More',
    );
  }

  async refresh() {
    this.invalidateCache(this.state.section);
    // Reset cursors for the current section to fetch from start
    if (this.state.section === "lead") {
        this.state.leadCursor = null;
    } else if (this.state.section === "appointment") {
        this.state.appointmentCursor = null;
    }
    // No need to reset this.state.offset as it's no longer used for pagination logic

    // await this.loadUserLeads(); // Removed
    await this.fetchData(); // This will fetch data from the beginning due to null cursor
    $("#mycrm-list-container").scrollTop(0);
    frappe.show_alert({ message: "Refreshed", indicator: "green" }, 2);
  }
// section switcher
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
  await this.fetchAssignedLeads();
  this.applyFilter();   // 🔥 force re-render
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
// render reports section
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

  // createLead() {
  //   let productsData = [];
  //   let existingContact = null;

  //   const dialog = new frappe.ui.Dialog({
  //     title: "Create New Lead",
  //     fields: [
  //       {
  //         fieldname: "customer_info_html",
  //         fieldtype: "HTML",
  //         options: `
  //         <div id="customer-info-banner" style="display: none; padding: 12px; margin-bottom: 16px; border-radius: 6px; border-left: 4px solid #236867;">
  //           <div style="font-weight: 600; color: #236867; margin-bottom: 4px;">Existing Customer Found</div>
  //           <div id="customer-info-text" style="color: #6b7280; font-size: 14px;"></div>
  //         </div>
  //       `,
  //       },
  //       {
  //         fieldname: "mobile_no",
  //         fieldtype: "Data",
  //         label: "Phone Number",
  //         reqd: 1,
  //         onchange: async function () {
  //           const phone = this.value;

  //           if (!phone) {
  //             $("#customer-info-banner").hide();
  //             return;
  //           }

  //           // Only check when exactly 10 digits are entered
  //           if (phone.length !== 10) {
  //             $("#customer-info-banner").hide();
  //             return;
  //           }

  //           const phoneRegex = /^[6-9]\d{9}$/;
  //           if (!phoneRegex.test(phone)) {
  //             frappe.show_alert(
  //               {
  //                 message: "Please enter valid mobile number starting with 6-9",
  //                 indicator: "orange",
  //               },
  //               3
  //             );
  //             $("#customer-info-banner").hide();
  //             return;
  //           }

  //           try {
  //             const contactRes = await frappe.call({
  //               method: "frappe.client.get_list",
  //               args: {
  //                 doctype: "Contact",
  //                 filters: { mobile_no: phone },
  //                 fields: ["name", "full_name", "mobile_no"],
  //                 limit: 1,
  //               },
  //             });

  //             if (contactRes.message && contactRes.message.length > 0) {
  //               existingContact = contactRes.message[0];

  //               $("#customer-info-text").html(`
  //               <strong>${existingContact.full_name}</strong> • ${existingContact.mobile_no}
  //             `);
  //               $("#customer-info-banner")
  //                 .css({
  //                   background: "#ecfdf5",
  //                   "border-left-color": "#10b981",
  //                 })
  //                 .show();

  //               dialog.set_value("first_name", existingContact.full_name);
  //               dialog.set_df_property("first_name", "read_only", 1);

  //               frappe.show_alert(
  //                 {
  //                   message: `Welcome back ${existingContact.full_name}!`,
  //                   indicator: "blue",
  //                 },
  //                 3
  //               );
  //             } else {
  //               existingContact = null;
  //               $("#customer-info-banner").hide();
  //               dialog.set_value("first_name", "");
  //               dialog.set_df_property("first_name", "read_only", 0);
  //             }
  //           } catch (error) {
  //             console.error("Error checking contact:", error);
  //             $("#customer-info-banner").hide();
  //           }
  //         },
  //       },
  //       {
  //         fieldname: "first_name",
  //         fieldtype: "Data",
  //         label: "Full Name",
  //         reqd: 1,
  //       },
  //       {
  //         fieldname: "column_break_1",
  //         fieldtype: "Column Break",
  //       },
  //       {
  //         fieldname: "source",
  //         fieldtype: "Link",
  //         label: "Source",
  //         options: "Lead Source",
  //         reqd: 1,
  //       },
  //       {
  //         fieldname: "status",
  //         fieldtype: "Select",
  //         label: "Status",
  //         options: "Lead\nFollow Up\nConverted\nNot Interested",
  //         default: "Lead",
  //         reqd: 1,
  //         onchange: () => {
  //           const status = dialog.get_value("status");
  //           dialog.set_df_property(
  //             "appointment_datetime",
  //             "hidden",
  //             status !== "Follow Up"
  //           );
  //           dialog.set_df_property(
  //             "appointment_datetime",
  //             "reqd",
  //             status === "Follow Up"
  //           );
  //         },
  //       },
  //       {
  //         fieldname: "section_break_2",
  //         fieldtype: "Section Break",
  //       },
  //       {
  //         fieldname: "appointment_datetime",
  //         fieldtype: "Datetime",
  //         label: "Appointment Date & Time",
  //         hidden: 1,
  //         reqd: 0,
  //       },
  //       {
  //         fieldname: "section_break_products",
  //         fieldtype: "Section Break",
  //         label: "Products",
  //       },
  //       {
  //         fieldname: "product_html",
  //         fieldtype: "HTML",
  //       },
  //     ],
  //     primary_action_label: "Create Lead",
  //     primary_action: async (values) => {
  //       const phoneRegex = /^[6-9]\d{9}$/;
  //       if (!phoneRegex.test(values.mobile_no)) {
  //         frappe.msgprint({
  //           title: "Invalid Phone",
  //           indicator: "red",
  //           message: "Please enter valid 10 digit mobile number",
  //         });
  //         return;
  //       }

  //       if (productsData.length === 0) {
  //         frappe.msgprint({
  //           title: "Missing Products",
  //           indicator: "red",
  //           message: "Please add at least one product",
  //         });
  //         return;
  //       }

  //       let hasInvalidData = false;
  //       productsData.forEach((item) => {
  //         if (
  //           !item.product ||
  //           !item.product_amount ||
  //           item.product_amount <= 0
  //         ) {
  //           hasInvalidData = true;
  //         }
  //       });

  //       if (hasInvalidData) {
  //         frappe.msgprint({
  //           title: "Invalid Product Data",
  //           indicator: "red",
  //           message:
  //             "Please select product and enter valid amount for all rows",
  //         });
  //         return;
  //       }

  //       try {
  //         const leadDoc = {
  //           doctype: "Lead",
  //           lead_owner: this.currentUser,
  //           status: values.status,
  //           source: values.source,
  //           first_name: values.first_name,
  //           mobile_no: values.mobile_no,
  //           custom_product_table: productsData,
  //         };

  //         const response = await frappe.call({
  //           method: "frappe.client.insert",
  //           args: { doc: leadDoc },
  //           freeze: true,
  //           freeze_message: "Creating Lead...",
  //         });

  //         const leadName = response.message.name;

  //         if (values.status === "Follow Up" && values.appointment_datetime) {
  //           await frappe.call({
  //             method: "frappe.client.insert",
  //             args: {
  //               doc: {
  //                 doctype: "Appointment",
  //                 party: leadName,
  //                 scheduled_time: values.appointment_datetime,
  //                 customer_name: values.first_name,
  //                 customer_phone_number: values.mobile_no,
  //                 status: "Open",
  //               },
  //             },
  //           });
  //         }

  //         frappe.show_alert(
  //           {
  //             message: existingContact
  //               ? `Lead created for ${existingContact.full_name}!`
  //               : `Lead created successfully!`,
  //             indicator: "green",
  //           },
  //           4
  //         );

  //         dialog.hide();
  //         this.invalidateCache("lead");
  //         this.invalidateCache("appointment");
  //         this.refresh();
  //       } catch (error) {
  //         console.error("Error creating lead:", error);
  //         frappe.msgprint({
  //           title: "Error",
  //           indicator: "red",
  //           message: error.message || "Failed to create lead",
  //         });
  //       }
  //     },
  //   });

  //   const renderProductTable = () => {
  //     const html = `
  //     <style>
  //       .lead-product-table {
  //         width: 100%;
  //         margin-top: 10px;
  //       }

  //       .lead-product-table table {
  //         width: 100%;
  //         border-collapse: collapse;
  //         border: 1px solid #d1d5db;
  //       }

  //       .lead-product-table th {
  //         background: #f9fafb;
  //         padding: 10px;
  //         text-align: left;
  //         font-weight: 600;
  //         border: 1px solid #d1d5db;
  //         font-size: 13px;
  //       }

  //       .lead-product-table td {
  //         padding: 8px;
  //         border: 1px solid #d1d5db;
  //       }

  //       .lead-product-input {
  //         width: 100%;
  //         padding: 6px 8px;
  //         border: 1px solid #d1d5db;
  //         border-radius: 4px;
  //         font-size: 13px;
  //       }

  //       .lead-product-input:focus {
  //         outline: none;
  //         border-color: #236867;
  //       }

  //       .lead-product-add-btn {
  //         margin-top: 10px;
  //         background: #236867;
  //         color: white;
  //         border: none;
  //         padding: 8px 16px;
  //         border-radius: 4px;
  //         cursor: pointer;
  //         font-size: 13px;
  //         font-weight: 500;
  //       }

  //       .lead-product-add-btn:hover {
  //         background: #1a4f4e;
  //       }

  //       .lead-product-del-btn {
  //         background: #dc2626;
  //         color: white;
  //         border: none;
  //         padding: 4px 10px;
  //         border-radius: 4px;
  //         cursor: pointer;
  //         font-size: 12px;
  //       }

  //       .lead-product-del-btn:hover {
  //         background: #b91c1c;
  //       }

  //       .lead-empty-products {
  //         text-align: center;
  //         padding: 30px;
  //         color: #9ca3af;
  //         font-size: 13px;
  //       }
  //     </style>

  //     <div class="lead-product-table">
  //       <table>
  //         <thead>
  //           <tr>
  //             <th style="width: 55%;">Product</th>
  //             <th style="width: 30%;">Amount (₹)</th>
  //             <th style="width: 15%; text-align: center;">Action</th>
  //           </tr>
  //         </thead>
  //         <tbody id="lead-product-rows">
  //           ${
  //             productsData.length === 0
  //               ? '<tr><td colspan="3" class="lead-empty-products">No products added</td></tr>'
  //               : ""
  //           }
  //         </tbody>
  //       </table>
  //       <button class="lead-product-add-btn" id="lead-add-product-btn">
  //         Add Product
  //       </button>
  //     </div>
  //   `;

  //     dialog.fields_dict.product_html.$wrapper.html(html);

  //     const addProduct = () => {
  //       const row = {
  //         product: "",
  //         product_name: "",
  //         product_amount: 0,
  //       };
  //       productsData.push(row);
  //       renderRows();
  //     };

  //     const removeProduct = (index) => {
  //       productsData.splice(index, 1);
  //       renderRows();
  //     };

  //     const renderRows = () => {
  //       const tbody = dialog.$wrapper.find("#lead-product-rows");
  //       tbody.empty();

  //       if (productsData.length === 0) {
  //         tbody.html(
  //           '<tr><td colspan="3" class="lead-empty-products">No products added</td></tr>'
  //         );
  //         return;
  //       }

  //       productsData.forEach((row, index) => {
  //         const tr = $(`
  //         <tr>
  //           <td>
  //             <div class="product-link-wrapper-${index}"></div>
  //           </td>
  //           <td>
  //             <input type="number"
  //               class="lead-product-input product-amount"
  //               data-index="${index}"
  //               value="${row.product_amount || ""}"
  //               placeholder="0"
  //               step="0.01"
  //               min="0">
  //           </td>
  //           <td style="text-align: center;">
  //             <button class="lead-product-del-btn" data-index="${index}">
  //               Remove
  //             </button>
  //           </td>
  //         </tr>
  //       `);

  //         tbody.append(tr);

  //         const productField = frappe.ui.form.make_control({
  //           df: {
  //             fieldtype: "Link",
  //             options: "Product",
  //             fieldname: `product_${index}`,
  //             placeholder: "Select product",
  //             get_query: () => {
  //               return {
  //                 filters: {
  //                   enabled: 1,
  //                 },
  //               };
  //             },
  //             onchange: function () {
  //               const productName = this.get_value();
  //               if (productName) {
  //                 productsData[index].product = productName;

  //                 frappe.call({
  //                   method: "frappe.client.get_value",
  //                   args: {
  //                     doctype: "Product",
  //                     filters: { name: productName },
  //                     fieldname: "product_name",
  //                   },
  //                   callback: (r) => {
  //                     if (r.message && r.message.product_name) {
  //                       productsData[index].product_name =
  //                         r.message.product_name;
  //                     }
  //                   },
  //                 });
  //               }
  //             },
  //           },
  //           parent: tr.find(`.product-link-wrapper-${index}`),
  //           render_input: true,
  //         });

  //         if (row.product) {
  //           productField.set_value(row.product);
  //         }

  //         tr.find(".product-amount").on("change", function () {
  //           productsData[index].product_amount = parseFloat($(this).val()) || 0;
  //         });

  //         tr.find(".lead-product-del-btn").on("click", function () {
  //           const idx = parseInt($(this).data("index"));
  //           removeProduct(idx);
  //         });
  //       });
  //     };

  //     dialog.$wrapper.find("#lead-add-product-btn").on("click", addProduct);
  //     renderRows();
  //   };

  //   dialog.show();
  //   renderProductTable();

  //   dialog.$wrapper.find(".modal-dialog").css({
  //     "max-width": "800px",
  //     width: "90%",
  //   });
  // }
  // create  lead function with create appointment, Status, and validation fix but phone number validations not included
  // createLead() {
  //     let productsData = [];
  //     let existingContact = null;

  //     const dialog = new frappe.ui.Dialog({
  //         title: "Create New Lead",
  //         fields: [
  //             {
  //                 fieldname: "customer_info_html",
  //                 fieldtype: "HTML",
  //                 options: `<div id="customer-info-banner" style="display: none; padding: 12px; margin-bottom: 16px; border-radius: 6px; border-left: 4px solid #236867;"><div id="customer-info-text"></div></div>`,
  //             },
  //             {
  //                 fieldname: "mobile_no",
  //                 fieldtype: "Data",
  //                 label: "Phone Number",
  //                 reqd: 1,
  //                 onchange: async function () {
  //                     const phone = this.value;
  //                     if (!phone || phone.length !== 10) {
  //                         $("#customer-info-banner").hide();
  //                         return;
  //                     }
  //                     try {
  //                         const contactRes = await frappe.call({
  //                             method: "frappe.client.get_list",
  //                             args: {
  //                                 doctype: "Contact",
  //                                 filters: { mobile_no: phone },
  //                                 fields: ["name", "full_name", "mobile_no"],
  //                                 limit: 1,
  //                             },
  //                         });
  //                         if (contactRes.message && contactRes.message.length > 0) {
  //                             existingContact = contactRes.message[0];
  //                             $("#customer-info-text").html(`<strong>${existingContact.full_name}</strong> • ${existingContact.mobile_no}`);
  //                             $("#customer-info-banner").css({ background: "#ecfdf5", "border-left-color": "#10b981" }).show();
  //                             dialog.set_value("first_name", existingContact.full_name);
  //                             dialog.set_df_property("first_name", "read_only", 1);
  //                         } else {
  //                             existingContact = null;
  //                             $("#customer-info-banner").hide();
  //                             dialog.set_df_property("first_name", "read_only", 0);
  //                         }
  //                     } catch (error) { console.error(error); }
  //                 },
  //             },
  //             { fieldname: "first_name", fieldtype: "Data", label: "Full Name", reqd: 1 },
  //             { fieldname: "column_break_1", fieldtype: "Column Break" },
  //             { fieldname: "source", fieldtype: "Link", label: "Source", options: "Lead Source", reqd: 1 },
  //             {
  //                 fieldname: "status",
  //                 fieldtype: "Select",
  //                 label: "Status",
  //                 options: "Lead\nFollow Up\nConverted\nNot Interested",
  //                 default: "Lead",
  //                 reqd: 1,
  //                 onchange: function() {
  //                     const status = this.get_value();
  //                     // ✅ FORCE SHOW/HIDE LOGIC
  //                     const $appt_field = dialog.get_field("scheduled_time").$wrapper;
  //                     if (status === "Follow Up") {
  //                         $appt_field.show();
  //                         dialog.set_df_property("scheduled_time", "reqd", 1);
  //                     } else {
  //                         $appt_field.hide();
  //                         dialog.set_df_property("scheduled_time", "reqd", 0);
  //                     }
  //                 },
  //             },
  //             { fieldname: "section_break_appt", fieldtype: "Section Break" },
  //             {
  //                 fieldname: "scheduled_time",
  //                 fieldtype: "Datetime",
  //                 label: "Appointment Date & Time",
  //                 reqd: 0,
  //             },
  //             { fieldname: "section_break_products", fieldtype: "Section Break", label: "Products" },
  //             { fieldname: "product_html", fieldtype: "HTML" },
  //         ],
  //         primary_action_label: "Create Lead",
  //         primary_action: async (values) => {
  //             if (productsData.length === 0) {
  //                 frappe.msgprint({ title: "Missing Products", indicator: "red", message: "Please add products" });
  //                 return;
  //             }
  //             try {
  //                 // ✅ SOLUTION: Status validation bypass karne ke liye
  //                 // Agar user ne "Follow Up" select kiya hai, toh hum Lead Doc mein "Lead" bhejenge
  //                 let actualUserSelection = values.status;
  //                 let statusForLeadDoc = (actualUserSelection === "Follow Up") ? "Lead" : actualUserSelection;

  //                 const leadDoc = {
  //                     doctype: "Lead",
  //                     lead_owner: this.currentUser,
  //                     status: statusForLeadDoc, // Yahan "Lead" jayega agar selection "Follow Up" hai
  //                     source: values.source,
  //                     first_name: values.first_name,
  //                     mobile_no: values.mobile_no,
  //                     custom_product_table: productsData,
  //                 };

  //                 const response = await frappe.call({
  //                     method: "frappe.client.insert",
  //                     args: { doc: leadDoc },
  //                     freeze: true,
  //                 });

  //                 const leadName = response.message.name;

  //                 // ✅ Appointment creation logic Selection ke base par chalega
  //                 if (actualUserSelection === "Follow Up" && values.scheduled_time) {
  //                     await frappe.call({
  //                         method: "frappe.client.insert",
  //                         args: {
  //                             doc: {
  //                                 doctype: "Appointment",
  //                                 appointment_with: "Lead", // Linking required
  //                                 party: leadName,
  //                                 scheduled_time: values.scheduled_time,
  //                                 customer_name: values.first_name,
  //                                 contact_number: values.mobile_no,
  //                                 customer_email: `${leadName}@lead.local`, // Guaranteed email
  //                                 status: "Open",
  //                             },
  //                         },
  //                     });
  //                 }

  //                 frappe.show_alert({ message: "Lead & Appointment Created Successfully!", indicator: "green" });
  //                 dialog.hide();
  //                 this.invalidateCache("lead");
  //                 this.invalidateCache("appointment");
  //                 this.refresh();
  //             } catch (error) {
  //                 console.error(error);
  //                 frappe.msgprint({ title: "Error", indicator: "red", message: error.message });
  //             }
  //         },
  //     });

  //     // --- ORIGINAL PRODUCT TABLE LOGIC (RESTORED) ---
  //     const renderProductTable = () => {
  //         const html = `
  //         <style>
  //             .lead-product-table table { width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; }
  //             .lead-product-table th { background: #f9fafb; padding: 10px; border: 1px solid #d1d5db; font-size: 13px; text-align: left; }
  //             .lead-product-table td { padding: 8px; border: 1px solid #d1d5db; }
  //             .lead-product-input { width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; }
  //             .lead-product-add-btn { margin-top: 10px; background: #236867; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
  //             .lead-product-del-btn { background: #dc2626; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; }
  //         </style>
  //         <div class="lead-product-table">
  //             <table>
  //                 <thead><tr><th>Product</th><th style="width:30%">Amount (₹)</th><th style="text-align:center; width:15%">Action</th></tr></thead>
  //                 <tbody id="lead-product-rows"></tbody>
  //             </table>
  //             <button class="lead-product-add-btn" id="lead-add-product-btn">+ Add Product</button>
  //         </div>`;

  //         dialog.fields_dict.product_html.$wrapper.html(html);

  //         const renderRows = () => {
  //             const tbody = dialog.$wrapper.find("#lead-product-rows").empty();
  //             if (productsData.length === 0) {
  //                 tbody.html('<tr><td colspan="3" style="text-align:center; padding:20px; color:#9ca3af;">No products added</td></tr>');
  //                 return;
  //             }
  //             productsData.forEach((row, index) => {
  //                 const tr = $(`<tr>
  //                     <td><div class="product-link-wrapper-${index}"></div></td>
  //                     <td><input type="number" class="lead-product-input product-amount" data-index="${index}" value="${row.product_amount || ""}"></td>
  //                     <td style="text-align:center"><button class="lead-product-del-btn" data-index="${index}">🗑</button></td>
  //                 </tr>`).appendTo(tbody);

  //                 const productField = frappe.ui.form.make_control({
  //                     df: {
  //                         fieldtype: "Link", options: "Product", fieldname: `product_${index}`,
  //                         onchange: function () {
  //                             const val = this.get_value();
  //                             productsData[index].product = val;
  //                             if (val) {
  //                                 frappe.db.get_value("Product", val, "product_name", (r) => {
  //                                     if (r.product_name) productsData[index].product_name = r.product_name;
  //                                 });
  //                             }
  //                         },
  //                     },
  //                     parent: tr.find(`.product-link-wrapper-${index}`),
  //                     render_input: true,
  //                 });
  //                 if (row.product) productField.set_value(row.product);

  //                 tr.find(".product-amount").on("change", function () {
  //                     productsData[index].product_amount = parseFloat($(this).val()) || 0;
  //                 });
  //                 tr.find(".lead-product-del-btn").on("click", function () {
  //                     productsData.splice(index, 1);
  //                     renderRows();
  //                 });
  //             });
  //         };
  //         dialog.$wrapper.find("#lead-add-product-btn").on("click", () => {
  //             productsData.push({ product: "", product_name: "", product_amount: 0 });
  //             renderRows();
  //         });
  //         renderRows();
  //     };

  //     dialog.show();
  //     // ✅ Initial State: Hide Appointment Field on Dialog Open
  //     const appt = dialog.get_field("scheduled_time").$wrapper.hide();
  //     appt.find('input').attr('placeholder', 'DD/MM/YYYY, HH:MM:SS');
  //     renderProductTable();
  //     dialog.$wrapper.find(".modal-dialog").css({ "max-width": "800px", width: "95%" });
  // }

  // createLead() {
  //   let productsData = [];
  //   let existingContact = null;

  //   // Helper function to validate Indian Phone Number
  //   const validateIndianPhone = (phone) => {
  //     const phoneRegex = /^[6-9]\d{9}$/;
  //     return phoneRegex.test(phone);
  //   };

  //   const dialog = new frappe.ui.Dialog({
  //     title: "Create New Lead",
  //     fields: [
  //       {
  //         fieldname: "customer_info_html",
  //         fieldtype: "HTML",
  //         options: `<div id="customer-info-banner" style="display: none; padding: 12px; margin-bottom: 16px; border-radius: 6px; border-left: 4px solid #236867;"><div id="customer-info-text"></div></div>`,
  //       },
  //       {
  //         fieldname: "mobile_no",
  //         fieldtype: "Data",
  //         label: "Phone Number",
  //         reqd: 1,
  //         onchange: async function () {
  //           const phone = this.value;

  //           if (!phone) {
  //             $("#customer-info-banner").hide();
  //             return;
  //           }

  //           // Real-time validation check
  //           if (phone.length === 10) {
  //             if (!validateIndianPhone(phone)) {
  //               frappe.show_alert(
  //                 {
  //                   message: __(
  //                     "Invalid mobile number (should start with 6-9)",
  //                   ),
  //                   indicator: "orange",
  //                 },
  //                 3,
  //               );
  //               $("#customer-info-banner").hide();
  //               return;
  //             }
  //           } else if (phone.length > 10) {
  //             frappe.show_alert(
  //               {
  //                 message: __("Mobile number cannot exceed 10 digits"),
  //                 indicator: "red",
  //               },
  //               3,
  //             );
  //             return;
  //           } else {
  //             $("#customer-info-banner").hide();
  //             return;
  //           }

  //           try {
  //             const contactRes = await frappe.call({
  //               method: "frappe.client.get_list",
  //               args: {
  //                 doctype: "Contact",
  //                 filters: { mobile_no: phone },
  //                 fields: ["name", "full_name", "mobile_no"],
  //                 limit: 1,
  //               },
  //             });
  //             if (contactRes.message && contactRes.message.length > 0) {
  //               existingContact = contactRes.message[0];
  //               $("#customer-info-text").html(
  //                 `<strong>${existingContact.full_name}</strong> • ${existingContact.mobile_no}`,
  //               );
  //               $("#customer-info-banner")
  //                 .css({
  //                   background: "#ecfdf5",
  //                   "border-left-color": "#10b981",
  //                 })
  //                 .show();
  //               dialog.set_value("first_name", existingContact.full_name);
  //               dialog.set_df_property("first_name", "read_only", 1);
  //             } else {
  //               existingContact = null;
  //               $("#customer-info-banner").hide();
  //               dialog.set_df_property("first_name", "read_only", 0);
  //             }
  //           } catch (error) {
  //             console.error(error);
  //           }
  //         },
  //       },
  //       {
  //         fieldname: "first_name",
  //         fieldtype: "Data",
  //         label: "Full Name",
  //         reqd: 1,
  //       },
  //       { fieldname: "column_break_1", fieldtype: "Column Break" },
  //       {
  //         fieldname: "source",
  //         fieldtype: "Link",
  //         label: "Source",
  //         options: "Lead Source",
  //         reqd: 1,
  //       },
  //       {
  //         fieldname: "status",
  //         fieldtype: "Select",
  //         label: "Status",
  //         options: "Lead\nFollow Up\nConverted\nNot Interested",
  //         default: "Lead",
  //         reqd: 1,
  //         onchange: function () {
  //           const status = this.get_value();
  //           const $appt_field = dialog.get_field("scheduled_time").$wrapper;
  //           if (status === "Follow Up") {
  //             $appt_field.show();
  //             dialog.set_df_property("scheduled_time", "reqd", 1);
  //           } else {
  //             $appt_field.hide();
  //             dialog.set_df_property("scheduled_time", "reqd", 0);
  //           }
  //         },
  //       },
  //       { fieldname: "section_break_appt", fieldtype: "Section Break" },
  //       {
  //         fieldname: "scheduled_time",
  //         fieldtype: "Datetime",
  //         label: "Appointment Date & Time",
  //         reqd: 0,
  //       },
  //       {
  //         fieldname: "section_break_products",
  //         fieldtype: "Section Break",
  //         label: "Products",
  //       },
  //       { fieldname: "product_html", fieldtype: "HTML" },
  //     ],
  //     primary_action_label: "Create Lead",
  //     primary_action: async (values) => {
  //       // ✅ VALIDATION BEFORE SAVING
  //       if (!validateIndianPhone(values.mobile_no)) {
  //         frappe.msgprint({
  //           title: __("Invalid Phone Number"),
  //           indicator: "red",
  //           message: __("Please enter a valid 10-digit mobile number."),
  //         });
  //         return;
  //       }

  //       if (productsData.length === 0) {
  //         frappe.msgprint({
  //           title: "Missing Products",
  //           indicator: "red",
  //           message: "Please add products",
  //         });
  //         return;
  //       }

  //       try {
  //         let actualUserSelection = values.status;
  //         let statusForLeadDoc =
  //           actualUserSelection === "Follow Up" ? "Lead" : actualUserSelection;

  //         const leadDoc = {
  //           doctype: "Lead",
  //           lead_owner: this.currentUser,
  //           status: statusForLeadDoc,
  //           source: values.source,
  //           first_name: values.first_name,
  //           mobile_no: values.mobile_no,
  //           custom_product_table: productsData,
  //         };

  //         const response = await frappe.call({
  //           method: "frappe.client.insert",
  //           args: { doc: leadDoc },
  //           freeze: true,
  //         });

  //         const leadName = response.message.name;

  //         if (actualUserSelection === "Follow Up" && values.scheduled_time) {
  //           await frappe.call({
  //             method: "frappe.client.insert",
  //             args: {
  //               doc: {
  //                 doctype: "Appointment",
  //                 appointment_with: "Lead",
  //                 party: leadName,
  //                 scheduled_time: values.scheduled_time,
  //                 customer_name: values.first_name,
  //                 contact_number: values.mobile_no,
  //                 customer_email: `${leadName}@lead.local`,
  //                 status: "Open",
  //               },
  //             },
  //           });
  //         }

  //         frappe.show_alert({
  //           message: "Lead Created Successfully!",
  //           indicator: "green",
  //         });
  //         dialog.hide();
  //         this.invalidateCache("lead");
  //         this.invalidateCache("appointment");
  //         this.refresh();
  //       } catch (error) {
  //         console.error(error);
  //         frappe.msgprint({
  //           title: "Error",
  //           indicator: "red",
  //           message: error.message,
  //         });
  //       }
  //     },
  //   });

  //   const renderProductTable = () => {
  //     const html = `
  //       <style>
  //           .lead-product-table table { width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; }
  //           .lead-product-table th { background: #f9fafb; padding: 10px; border: 1px solid #d1d5db; font-size: 13px; text-align: left; }
  //           .lead-product-table td { padding: 8px; border: 1px solid #d1d5db; }
  //           .lead-product-input { width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; }
  //           .lead-product-add-btn { margin-top: 10px; background: #236867; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
  //           .lead-product-del-btn { background: #dc2626; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; }
  //       </style>
  //       <div class="lead-product-table">
  //           <table>
  //               <thead><tr><th>Product</th><th style="width:30%">Amount (₹)</th><th style="text-align:center; width:15%">Action</th></tr></thead>
  //               <tbody id="lead-product-rows"></tbody>
  //           </table>
  //           <button class="lead-product-add-btn" id="lead-add-product-btn">+ Add Product</button>
  //       </div>`;

  //     dialog.fields_dict.product_html.$wrapper.html(html);

  //     const renderRows = () => {
  //       const tbody = dialog.$wrapper.find("#lead-product-rows").empty();
  //       if (productsData.length === 0) {
  //         tbody.html(
  //           '<tr><td colspan="3" style="text-align:center; padding:20px; color:#9ca3af;">No products added</td></tr>',
  //         );
  //         return;
  //       }
  //       productsData.forEach((row, index) => {
  //         const tr = $(`<tr>
  //                   <td><div class="product-link-wrapper-${index}"></div></td>
  //                   <td><input type="number" class="lead-product-input product-amount" data-index="${index}" value="${row.product_amount || ""}"></td>
  //                   <td style="text-align:center"><button class="lead-product-del-btn" data-index="${index}">🗑</button></td>
  //               </tr>`).appendTo(tbody);

  //         const productField = frappe.ui.form.make_control({
  //           df: {
  //             fieldtype: "Link",
  //             options: "Product",
  //             fieldname: `product_${index}`,
  //             onchange: function () {
  //               const val = this.get_value();
  //               productsData[index].product = val;
  //               if (val) {
  //                 frappe.db.get_value("Product", val, "product_name", (r) => {
  //                   if (r.product_name)
  //                     productsData[index].product_name = r.product_name;
  //                 });
  //               }
  //             },
  //           },
  //           parent: tr.find(`.product-link-wrapper-${index}`),
  //           render_input: true,
  //         });
  //         if (row.product) productField.set_value(row.product);

  //         tr.find(".product-amount").on("change", function () {
  //           productsData[index].product_amount = parseFloat($(this).val()) || 0;
  //         });
  //         tr.find(".lead-product-del-btn").on("click", function () {
  //           productsData.splice(index, 1);
  //           renderRows();
  //         });
  //       });
  //     };
  //     dialog.$wrapper.find("#lead-add-product-btn").on("click", () => {
  //       productsData.push({ product: "", product_name: "", product_amount: 0 });
  //       renderRows();
  //     });
  //     renderRows();
  //   };

  //   dialog.show();
  //   const appt = dialog.get_field("scheduled_time").$wrapper.hide();
  //   appt.find("input").attr("placeholder", "DD/MM/YYYY, HH:MM:SS");
  //   renderProductTable();
  //   dialog.$wrapper
  //     .find(".modal-dialog")
  //     .css({ "max-width": "800px", width: "95%" });
  // }

createLead() {
    let productsData = [];
    let existingContact = null;

    const validateIndianPhone = (phone) => {
      const phoneRegex = /^[6-9]\d{9}$/;
      return phoneRegex.test(phone);
    };

    const dialog = new frappe.ui.Dialog({
      title: "Create New Lead",
      fields: [
        {
          fieldname: "customer_info_html",
          fieldtype: "HTML",
          options: `
            <div id="customer-info-banner" style="display: none; padding: 12px; margin-bottom: 16px; border-radius: 6px; border-left: 4px solid #236867;"><div id="customer-info-text"></div></div>
            <div id="duplicate-warning-banner" style="display: none; padding: 10px; margin-bottom: 16px; border-radius: 6px; background: #fff5f5; border: 1px solid #feb2b2; color: #c53030; font-size: 13px;">
                <strong>⚠️ Warning:</strong> Duplicate lead (Same Product & Amount) detected within the last 7 days.
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
            $("#customer-info-banner").hide();
            dialog.set_df_property("first_name", "read_only", 0);
            if (!phone || phone.length < 10) {
                dialog.set_value("first_name", "");
                existingContact = null;
                if (!phone) return;
            }
            if (phone.length === 10) {
              if (!validateIndianPhone(phone)) {
                frappe.show_alert({ message: __("Invalid mobile number (6-9)"), indicator: "orange" }, 3);
                dialog.set_value("first_name", "");
                return;
              }
            } else if (phone.length > 10) {
              frappe.show_alert({ message: __("Mobile number cannot exceed 10 digits"), indicator: "red" }, 3);
              return;
            } else { return; }
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
                $("#customer-info-text").html(`<strong>${existingContact.full_name}</strong> • ${existingContact.mobile_no}`);
                $("#customer-info-banner").css({ background: "#ecfdf5", "border-left-color": "#10b981" }).show();
                dialog.set_value("first_name", existingContact.full_name);
                dialog.set_df_property("first_name", "read_only", 1);
              } else {
                existingContact = null;
                dialog.set_value("first_name", "");
                dialog.set_df_property("first_name", "read_only", 0);
              }
              // Number change hone par warning check refresh karein
              checkDuplicateWarning();
            } catch (error) { console.error(error); }
          },
        },
        { fieldname: "first_name", fieldtype: "Data", label: "Full Name", reqd: 1 },
        { fieldname: "column_break_1", fieldtype: "Column Break" },
        { 
            fieldname: "source", 
            fieldtype: "Link", 
            label: "Source", 
            options: "Lead Source", 
            reqd: 1,
            onchange: () => checkDuplicateWarning() 
        },
        {
          fieldname: "status",
          fieldtype: "Select",
          label: "Status",
          options: "Lead\nFollow Up\nConverted\nNot Interested",
          default: "Lead",
          reqd: 1,
          onchange: function () {
            const status = this.get_value();
            const $appt_field = dialog.get_field("scheduled_time").$wrapper;
            if (status === "Follow Up") {
              $appt_field.show();
              dialog.set_df_property("scheduled_time", "reqd", 1);
            } else {
              $appt_field.hide();
              dialog.set_df_property("scheduled_time", "reqd", 0);
            }
          },
        },
        { fieldname: "section_break_appt", fieldtype: "Section Break" },
        { fieldname: "scheduled_time", fieldtype: "Datetime", label: "Appointment Date & Time", reqd: 0 },
        { fieldname: "section_break_products", fieldtype: "Section Break", label: "Products" },
        { fieldname: "product_html", fieldtype: "HTML" },
      ],
      primary_action_label: "Create Lead",
      primary_action: async (values) => {
        const btn = dialog.get_primary_btn();
        btn.prop('disabled', true);

        if (!validateIndianPhone(values.mobile_no)) {
          frappe.msgprint({ title: __("Invalid Phone Number"), indicator: "red", message: __("Please enter a valid 10-digit mobile number.") });
          btn.prop('disabled', false);
          return;
        }
        if (productsData.length === 0) {
          frappe.msgprint({ title: "Missing Products", indicator: "red", message: "Please add products" });
          btn.prop('disabled', false);
          return;
        }

        // Final Validation on Save
        const isStillDuplicate = await checkDuplicateWarning(true);
        if (isStillDuplicate) {
          btn.prop('disabled', false);
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
            freeze_message: "Creating Lead..."
          });
          if (!response.exc) {
              frappe.show_alert({ message: "Lead Created Successfully!", indicator: "green" });
              dialog.hide();
              this.invalidateCache("lead");
              this.invalidateCache("appointment");
              this.refresh(); 
          }
        } catch (error) {
          console.error(error);
          frappe.msgprint({ title: "Error", indicator: "red", message: error.message });
          btn.prop('disabled', false);
        }
      },
    });

    // --- 🛡️ Global Warning Logic ---
    const checkDuplicateWarning = async (isSave = false) => {
        const mobile = dialog.get_value("mobile_no");
        const warningBanner = $("#duplicate-warning-banner");

        if (!mobile || productsData.length === 0) {
            warningBanner.hide();
            return false;
        }

        const res = await frappe.call({
            method: "sahayog.scrm.page.my_crm.my_crm.check_duplicate",
            args: { mobile_no: mobile, products: productsData }
        });

        if (res.message && res.message.duplicate) {
            warningBanner.show();
            if (isSave) {
                frappe.msgprint({ 
                    title: __("Duplicate Detected"), 
                    indicator: "red", 
                    message: __(`A lead for Product (${res.message.product}) already exists for this number within the last 7 days.`) 
                });
            }
            return true;
        } else {
            warningBanner.hide();
            return false;
        }
    };

    const renderProductTable = () => {
      const html = `<div class="lead-product-table">
            <style>
                .lead-product-table table { width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; }
                .lead-product-table th { background: #f9fafb; padding: 10px; border: 1px solid #d1d5db; font-size: 13px; text-align: left; }
                .lead-product-table td { padding: 8px; border: 1px solid #d1d5db; }
                .lead-product-input { width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; }
                .lead-product-add-btn { margin-top: 10px; background: #236867; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
                .lead-product-del-btn { background: #dc2626; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; }
            </style>
            <table>
                <thead><tr><th>Product</th><th style="width:30%">Amount (₹)</th><th style="text-align:center; width:15%">Action</th></tr></thead>
                <tbody id="lead-product-rows"></tbody>
            </table>
            <button class="lead-product-add-btn" id="lead-add-product-btn">+ Add Product</button>
        </div>`;
      dialog.fields_dict.product_html.$wrapper.html(html);
      const renderRows = () => {
        const tbody = dialog.$wrapper.find("#lead-product-rows").empty();
        if (productsData.length === 0) {
          tbody.html('<tr><td colspan="3" style="text-align:center; padding:20px; color:#9ca3af;">No products added</td></tr>');
          return;
        }
        productsData.forEach((row, index) => {
          const tr = $(`<tr>
                    <td><div class="product-link-wrapper-${index}"></div></td>
                    <td><input type="number" class="lead-product-input product-amount" data-index="${index}" value="${row.product_amount || ""}"></td>
                    <td style="text-align:center"><button class="lead-product-del-btn" data-index="${index}">🗑</button></td>
                </tr>`).appendTo(tbody);
          const productField = frappe.ui.form.make_control({
            df: {
              fieldtype: "Link",
              options: "Product",
              fieldname: `product_${index}`,
              onchange: function () {
                const val = this.get_value();
                productsData[index].product = val;
                checkDuplicateWarning(); // Real-time check
              },
            },
            parent: tr.find(`.product-link-wrapper-${index}`),
            render_input: true,
          });
          if (row.product) productField.set_value(row.product);
          tr.find(".product-amount").on("change", function () {
            productsData[index].product_amount = parseFloat($(this).val()) || 0;
            checkDuplicateWarning(); // Real-time check
          });
          tr.find(".lead-product-del-btn").on("click", function () {
            productsData.splice(index, 1);
            renderRows();
            checkDuplicateWarning();
          });
        });
      };
      dialog.$wrapper.find("#lead-add-product-btn").on("click", () => {
        productsData.push({ product: "", product_name: "", product_amount: 0 });
        renderRows();
      });
      renderRows();
    };

    const sourceField = dialog.get_field("source");
    sourceField.df.only_select = 1; 
    sourceField.get_query = function() { return { filters: { "custom_active": 1 } }; };

    dialog.show();
    
    // 🛡️ Phone Number Input Validation (Numeric only & Max 10 digits)
    const $mobileInput = dialog.get_field("mobile_no").$input;
    $mobileInput.on("input", function() {
        let val = $(this).val();
        // Remove non-numeric characters
        val = val.replace(/\D/g, "");
        // Limit to 10 digits
        if (val.length > 10) {
            val = val.slice(0, 10);
        }
        $(this).val(val);
        dialog.set_value("mobile_no", val);
    });

    const appt = dialog.get_field("scheduled_time").$wrapper.hide();
    appt.find("input").attr("placeholder", "DD/MM/YYYY, HH:MM:SS");
    renderProductTable();
    dialog.$wrapper.find(".modal-dialog").css({ "max-width": "800px", width: "95%" });
  }
  // createAppointment() {
  //   const dialog = new frappe.ui.Dialog({
  //     title: "Create New Appointment",
  //     fields: [
  //       {
  //         fieldname: "party",
  //         fieldtype: "Link",
  //         label: "Lead",
  //         options: "Lead",
  //         reqd: 1,
  //         get_query: () => {
  //           return { filters: { lead_owner: this.currentUser } };
  //         },
  //         onchange: async () => {
  //           const lead = dialog.get_value("party");
  //           if (!lead) return;

  //           const r = await frappe.db.get_value("Lead", lead, [
  //             "lead_name",
  //             "mobile_no",
  //             "phone",
  //             "email_id",
  //           ]);

  //           if (r.message) {
  //             dialog.set_value("customer_name", r.message.lead_name || "");
  //             dialog.set_value(
  //               "customer_phone_number",
  //               r.message.mobile_no || r.message.phone || "",
  //             );
  //             dialog.set_value("customer_email", r.message.email_id || "");
  //           }
  //         },
  //       },
  //       {
  //         fieldname: "scheduled_time",
  //         fieldtype: "Datetime",
  //         label: "Scheduled Time",
  //         reqd: 1,
  //       },
  //       {
  //         fieldname: "customer_name",
  //         fieldtype: "Data",
  //         label: "Customer Name",
  //         reqd: 1,
  //         read_only: 1,
  //       },
  //       {
  //         fieldname: "customer_phone_number",
  //         fieldtype: "Data",
  //         label: "Phone",
  //         read_only: 1,
  //       },

  //       {
  //         fieldname: "status",
  //         fieldtype: "Select",
  //         label: "Status",
  //         options: "Open\nClosed",
  //         default: "Open",
  //       },
  //     ],
  //     primary_action_label: "Create",
  //     primary_action: async (values) => {
  //       try {
  //         // ✅ Always-safe system email
  //         const system_email = `${values.party}@lead.local`;
  //         if (!values.party) {
  //           frappe.throw("Lead is required");
  //         }

  //         await frappe.call({
  //           method: "frappe.client.insert",
  //           args: {
  //             doc: {
  //               doctype: "Appointment",

  //               // Required linking
  //               appointment_with: "Lead",
  //               party: values.party,

  //               // Mandatory fields
  //               scheduled_time: values.scheduled_time,
  //               status: values.status,

  //               // Display fields
  //               customer_name: values.customer_name,
  //               contact_number: values.customer_phone_number,

  //               // 🔴 REQUIRED & GUARANTEED
  //               customer_email: system_email,
  //             },
  //           },
  //           freeze: true,
  //         });

  //         frappe.show_alert(
  //           { message: "✅ Appointment created", indicator: "green" },
  //           3,
  //         );

  //         dialog.hide();
  //         this.invalidateCache("appointment");
  //         this.refresh();
  //       } catch (error) {
  //         frappe.msgprint({
  //           title: "Error",
  //           indicator: "red",
  //           message: error.message,
  //         });
  //       }
  //     },
  //   });

  //   dialog.show();
  // }

  createAppointment() {
    const me = this;
    const d = new frappe.ui.Dialog({
      title: "Create New Appointment",
      fields: [
        {
          fieldname: "tab_navigation",
          fieldtype: "HTML",
          options: `
              <div class="custom-tabs-wrapper" style="display: flex; border-bottom: 2px solid #f1f1f1; margin-bottom: 15px;">
                  <div class="tab-link active" id="tab-create-appt-btn" style="padding: 10px 25px; cursor: pointer; color: #006264; border-bottom: 3px solid #006264; font-weight: bold;">Appointment Details</div>
              </div>
          `,
        },
        { fieldname: "create_wrapper", fieldtype: "HTML" },
      ],
      primary_action_label: "Create Appointment",
      primary_action: async (values) => {
        const btn = d.get_primary_btn();
        const party = d.$wrapper.find("#create_appt_lead").val();
        const time = d.$wrapper.find("#create_appt_time").val();

        if (!party) return frappe.msgprint("Please select a Lead");
        if (!time) return frappe.msgprint("Please select Date & Time");

        btn.prop('disabled', true);
        try {
          // 🛡️ Duplicate Appointment Check
          const dupRes = await frappe.call({
            method: "sahayog.scrm.page.my_crm.my_crm.check_duplicate_appointment",
            args: { party: party, scheduled_time: time }
          });

          if (dupRes.message && dupRes.message.duplicate) {
            frappe.msgprint({
              title: __("Duplicate Appointment"),
              indicator: "red",
              message: __("An appointment already exists for this Lead at the selected time.")
            });
            btn.prop('disabled', false);
            return;
          }

          await frappe.call({
            method: "frappe.client.insert",
            args: {
              doc: {
                doctype: "Appointment",
                appointment_with: "Lead",
                party: party,
                scheduled_time: time,
                status: d.$wrapper.find("#create_appt_status").val(),
                customer_name: d.$wrapper.find("#create_appt_name").val(),
                customer_phone_number: d.$wrapper.find("#create_appt_phone").val(),
                customer_email: d.$wrapper.find("#create_appt_email").val(),
                customer_details: d.$wrapper.find("#create_appt_remarks").val(),
              },
            },
            freeze: true,
            freeze_message: "Booking Appointment..."
          });

          frappe.show_alert({ message: "✅ Appointment created", indicator: "green" }, 3);
          d.hide();
          this.invalidateCache("appointment");
          this.refresh();
        } catch (error) {
          frappe.msgprint({ title: "Error", indicator: "red", message: error.message });
          btn.prop('disabled', false);
        }
      },
    });

    const renderCreateTab = () => {
      const wrapper = d.get_field("create_wrapper").$wrapper;
      wrapper.html(`
          <div id="appt-create-section">
              <div style="padding: 15px; border: 1px solid #d1d8dd; border-radius: 8px; background: #fcfcfc; margin-bottom: 15px;">
                  <h6 style="font-weight:600; margin-bottom:15px; color: #006264;">Lead Information</h6>
                  <div class="row">
                      <div class="col-sm-6">
                          <div class="form-group">
                              <label class="control-label">Select Lead</label>
                              <div id="lead_link_edit_container"></div>
                          </div>
                      </div>
                      <div class="col-sm-6">
                          <div class="form-group">
                              <label class="control-label">Full Name</label>
                              <input type="text" id="create_appt_name" class="form-control" readonly style="background:#f8fafc;">
                          </div>
                      </div>
                  </div>
                  <div class="row" style="margin-top:10px;">
                      <div class="col-sm-6">
                          <div class="form-group">
                              <label class="control-label">Mobile Number</label>
                              <input type="text" id="create_appt_phone" class="form-control" readonly style="background:#f8fafc;">
                          </div>
                      </div>
                      <div class="col-sm-6">
                          <div class="form-group">
                              <label class="control-label">Email Address</label>
                              <input type="text" id="create_appt_email" class="form-control" readonly style="background:#f8fafc;">
                          </div>
                      </div>
                  </div>
              </div>

              <div style="padding: 15px; border: 1px solid #d1d8dd; border-radius: 8px; background: #fff;">
                  <h6 style="font-weight:600; margin-bottom:15px; color: #006264;">Schedule & Status</h6>
                  <div class="row">
                      <div class="col-sm-6">
                          <div class="form-group">
                              <label class="control-label">Scheduled Date & Time</label>
                              <input type="datetime-local" id="create_appt_time" class="form-control">
                          </div>
                      </div>
                      <div class="col-sm-6">
                          <div class="form-group">
                              <label class="control-label">Status</label>
                              <select id="create_appt_status" class="form-control">
                                  <option value="Open">Open</option>
                                  <option value="Closed">Closed</option>
                              </select>
                          </div>
                      </div>
                  </div>
                  <div class="form-group" style="margin-top:10px;">
                      <label class="control-label">Remarks / Notes</label>
                      <textarea id="create_appt_remarks" class="form-control" rows="3" style="resize:none;" placeholder="Enter any specific requirements..."></textarea>
                  </div>
              </div>
          </div>
      `);

      // Manual input field value storage
      wrapper.append('<input type="hidden" id="create_appt_lead">');

      frappe.ui.form.make_control({
        df: {
          fieldtype: "Link",
          options: "Lead",
          fieldname: "party",
          get_query: () => ({ filters: { lead_owner: me.currentUser } }),
          onchange: async function() {
            const lead = this.get_value();
            d.$wrapper.find("#create_appt_lead").val(lead);
            if (!lead) {
              d.$wrapper.find("#create_appt_name, #create_appt_phone, #create_appt_email").val("");
              return;
            }

            const r = await frappe.db.get_value("Lead", lead, ["first_name", "last_name", "mobile_no", "email_id"]);
            if (r.message) {
              const full_name = (r.message.first_name || "") + " " + (r.message.last_name || "");
              d.$wrapper.find("#create_appt_name").val(full_name.trim());
              d.$wrapper.find("#create_appt_phone").val(r.message.mobile_no || "");
              d.$wrapper.find("#create_appt_email").val(r.message.email_id || `${lead}@lead.local`);
            }
          }
        },
        parent: d.$wrapper.find("#lead_link_edit_container"),
        render_input: true,
      });
    };

    d.show();
    d.$wrapper.find(".modal-dialog").css({ "max-width": "800px", width: "95%" });
    renderCreateTab();
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
            2,
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
        '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">',
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