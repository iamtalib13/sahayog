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

let _freezeStartTime = null;
const FREEZE_MIN_DURATION = 1500;

function freezeScreen(msg) {
  _freezeStartTime = Date.now();
  frappe.dom.freeze(msg);
}

function unfreezeScreen() {
  if (_freezeStartTime === null) { frappe.dom.unfreeze(); return; }
  const elapsed = Date.now() - _freezeStartTime;
  const remaining = Math.max(0, FREEZE_MIN_DURATION - elapsed);
  setTimeout(() => { frappe.dom.unfreeze(); _freezeStartTime = null; }, remaining);
}

function getLocalCRMData(section) {
  try {
    const raw = localStorage.getItem(`crm_local_${section}_${frappe.session.user}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setLocalCRMData(section, data, lastModified, totalCount) {
  try {
    localStorage.setItem(`crm_local_${section}_${frappe.session.user}`, JSON.stringify({
      data, lastModified, totalCount,
      timestamp: Date.now()
    }));
  } catch { }
}

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

    this.assignedLeadNames = [];
    this.assignedByMap = {};
    this.assignedCount = 0;

    const savedSection = sessionStorage.getItem("mycrm_active_tab") || "lead";

    this.state = {
      section: savedSection,
      filter: "All",
      search: "",
      data: [],
      filteredData: [],
      limit: 3, // Records count per fetch
      hasMore: true,
      totalCount: 0, // Total for the current section
      leadCount: 0, // Total lead count for badge
      appointmentCount: 0, // Total appointment count for badge
      leadCursor: null, // Cursor for lead pagination
      appointmentCursor: null, // Cursor for appointment pagination
      isMobile: window.innerWidth <= 768,
    };

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
    this.initPetiteVue();

    // Pehle localStorage se instant data dikhao
    this.showLocalData();

    this.switchSection(this.state.section);
    this.setupRealtime();
    this.setupPWA();
  }

  showLocalData() {
    const localData = getLocalCRMData(this.state.section);
    if (localData && localData.data && localData.data.length > 0) {
      // Sirf pehle page (limit) load karo — baaki localStorage mein hai, Load More se aayega
      this.state.data = localData.data.slice(0, this.state.limit);
      this.state.totalCount = localData.totalCount || localData.data.length;
      this.state.filteredData = [...this.state.data];
      this.state.hasMore = this.state.data.length < this.state.totalCount;
      // Cursor = total records in localStorage (taaki Load More sahi offset se API call kare)
      if (this.state.section === "lead") {
        this.state.leadCursor = localData.data.length;
      } else {
        this.state.appointmentCursor = localData.data.length;
      }
      this.applyFilter();
      return true;
    }
    return false;
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
  }

  // Search Cache (Optimized)
  getCachedSearch(section, term) {
    const cache = this.cache?.[section];
    if (!cache?.searches || !term) return null;

    const cached = cache.searches.get(term);
    if (!cached) return null;

    if (Date.now() - cached.timestamp < cache.ttl) {
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
      localStorage.removeItem(`crm_local_${section}_${frappe.session.user}`);
      return;
    }

    Object.values(this.cache).forEach((cache) => {
      cache.timestamp = null;
      cache.searches?.clear();
    });
    // Clear all localStorage CRM data + assigned leads cache
    ["lead", "appointment"].forEach(s => {
      localStorage.removeItem(`crm_local_${s}_${frappe.session.user}`);
    });
    localStorage.removeItem(`crm_assigned_leads_${frappe.session.user}`);
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
          padding: ${isMobile ? "5px 16px" : "8px 20px"};
          border-bottom: 1px solid #e5e7eb;
          gap: ${isMobile ? "8px" : "16px"};
          position: relative;
        }

        .mycrm-tab {
          padding: ${isMobile ? "4px 12px" : "6px 16px"};
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
          <button class="mycrm-home-btn" id="mycrm-home-link" style="position: absolute; right: 15px; background: none; border: none; cursor: pointer; color: var(--mycrm-green-dark); padding: 8px; font-size: 18px; display: flex; align-items: center;">
            <i class="fa fa-home"></i>
          </button>
          
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
    $("#mycrm-home-link").on("click", () => {
      frappe.set_route("sahayog-home");
    });

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

  async fetchData(append = false, fetchLimit = null) {
    let cursorForFetch = null;
    if (append) {
        cursorForFetch = (this.state.section === "lead") ? this.state.leadCursor : this.state.appointmentCursor;
    }

    if (!append || (append && !cursorForFetch)) {
      if (!append) {
        this.state.data = [];
      }
      if (this.state.section === "lead") {
        this.state.leadCursor = null;
      } else if (this.state.section === "appointment") {
        this.state.appointmentCursor = null;
      }
      this.showLoading();
    }

    // fetchLimit: pehle load pe zyada records fetch karo localStorage ke liye
    const limit = fetchLimit || this.state.limit;

    try {
      const response = await frappe.call({
        method: "sahayog.scrm.page.my_crm.my_crm.get_crm_data",
        args: {
          section: this.state.section,
          limit: limit,
          cursor: cursorForFetch,
          search_term: this.state.search,
        },
      });

      const { data, next_cursor, total_count, lead_count, appointment_count } = response.message;

      if (append) {
        this.state.data = [...this.state.data, ...data];
      } else {
        this.state.data = data;
      }

      this.state.totalCount = total_count;
      this.state.hasMore = !!next_cursor;

      if (this.state.section === "lead") {
          this.state.leadCursor = next_cursor;
      } else {
          this.state.appointmentCursor = next_cursor;
      }
      
      if (window.mycrmVue) {
          window.mycrmVue.leadCount = lead_count || 0;
          window.mycrmVue.appointmentCount = appointment_count || 0;
      }

      // localStorage save — purana + naya merge
      if (!this.state.search?.trim()) {
        const localData = getLocalCRMData(this.state.section);
        let finalData = this.state.data;
        if (localData && localData.data && append) {
          // Load More: purane localStorage mein naye append ho
          const existingMap = new Map(localData.data.map(item => [item.name, item]));
          this.state.data.forEach(item => existingMap.set(item.name, item));
          finalData = [...existingMap.values()];
        }
        const lastMod = this.state.data[0]?.modified || localData?.lastModified;
        setLocalCRMData(this.state.section, finalData, lastMod, total_count);
      }

      // In-memory cache
      if (!this.state.search?.trim() && !append) {
        this.setCacheData(this.state.section, this.state.data, this.state.totalCount);
      }

      this.applyFilter();
      this.updateCacheIndicator(false, null);

    } catch (error) {
      frappe.msgprint({
        title: "Error",
        indicator: "red",
        message: "Could not fetch CRM data.",
      });
    } finally {
      this.hideLoading();
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
            (this.assignedLeadNames || []).includes(item.name) && item.status === "Lead"
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
      (this.assignedLeadNames || []).includes(item.name) && item.status === "Lead"
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
// Fetch assigned leads and map assigned by details (batched — single query)
async fetchAssignedLeads() {
  const CACHE_KEY = `crm_assigned_leads_${frappe.session.user}`;
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Check localStorage cache first
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (cached && cached.timestamp && (Date.now() - cached.timestamp < CACHE_TTL)) {
      this.assignedByMap = cached.assignedByMap || {};
      this.assignedLeadNames = cached.assignedLeadNames || [];
      this.assignedCount = this.state.data.filter(item =>
        this.assignedLeadNames.includes(item.name) && item.status === "Lead"
      ).length;
      return;
    }
  } catch (e) {}

  // Cache miss ya stale — API se fetch karo
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

  // Batch: collect all unique user IDs
  const uniqueUserIds = [...new Set(
    message.map(r => r.assigned_by).filter(Boolean)
  )];

  // Single query for all employees
  let employeeMap = {};
  if (uniqueUserIds.length > 0) {
    try {
      const employees = await frappe.get_all("Employee", {
        filters: { user_id: ["in", uniqueUserIds] },
        fields: ["user_id", "employee_name", "employee", "branch"]
      });
      employees.forEach(emp => {
        employeeMap[emp.user_id] = {
          name: emp.employee_name,
          code: emp.employee,
          branch: emp.branch || ""
        };
      });
    } catch (e) {}
  }

  // Map data from single query result
  for (const lead of uniqueLeads) {
    const row = message.find(r => r.reference_name === lead);
    if (!row) continue;

    const emp = row.assigned_by ? employeeMap[row.assigned_by] : null;

    this.assignedByMap[lead] = {
      full_name: emp?.name || row.assigned_by_full_name || row.assigned_by || "Unknown",
      employee_code: emp?.code || "",
      branch: emp?.branch || ""
    };

    this.assignedLeadNames.push(lead);
  }

  // Cache save karo
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      assignedByMap: this.assignedByMap,
      assignedLeadNames: this.assignedLeadNames
    }));
  } catch (e) {}

  this.assignedCount = this.state.data.filter(item =>
    this.assignedLeadNames.includes(item.name) && item.status === "Lead"
  ).length;
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
    const input_appt_time = d.$wrapper.find("#new_appt_t_edit").val();
    const btn = d.get_primary_btn();

    // Mobile validation — freeze se pehle
    if (input_mobile && !/^[6-9]\d{9}$/.test(input_mobile)) {
        return showError(__("Please enter a valid 10-digit mobile number starting with 6-9."));
    }

    const final_values = {
        first_name: d.$wrapper.find("#f_name_edit").val(),
        mobile_no: input_mobile,
        status: input_status,
        source: d.$wrapper.find("#source_edit").val(), 
    };

    // Product validation — freeze se pehle
    const invalidProducts = productsData.filter(p => !p.product_amount || p.product_amount <= 0);
    if (invalidProducts.length > 0) {
        return showError(__("Please enter a valid amount (greater than 0) for all products."));
    }

    // Follow Up check — freeze se pehle
    if (input_status === "Follow Up") {
        if (!appointmentsData.length && !input_appt_time) {
            showError(__('Please schedule an appointment to set status as <b>Follow Up</b>.'));
            d.$wrapper.find("#tab-appt-btn").trigger("click");
            const $apptInput = d.$wrapper.find("#new_appt_t_edit");
            $apptInput.css("border", "2px solid #ff5858");
            setTimeout(() => $apptInput.css("border", "1px solid #d1d8dd"), 3000);
            return; 
        }
    }

    // Backend validate hook (validate_duplicate_lead) duplicate check karega

    // Save
    btn.prop('disabled', true);
    freezeScreen("Updating Lead...");

    try {
        // Optional: Create Appointment if time is provided
        if (input_appt_time) {
            const apptRes = await frappe.call({
                method: "frappe.client.insert",
                args: {
                    doc: {
                        doctype: "Appointment",
                        party: name,
                        appointment_with: "Lead",
                        scheduled_time: input_appt_time,
                        status: "Open",
                        customer_name: final_values.first_name,
                        customer_phone_number: final_values.mobile_no,
                        customer_email: doc.email_id || `${name}@lead.local`,
                        customer_details: d.$wrapper.find("#new_appt_rem_edit").val(),
                    }
                }
            });
            if (apptRes.exc) {
                frappe.msgprint({ title: "Error", indicator: "red", message: apptRes._error_message || "Something went wrong" });
                return;
            }
        }

        // Call save logic for Lead
        const leadRes = await frappe.call({
            method: "frappe.client.set_value",
            args: {
                doctype: "Lead",
                name: name,
                fieldname: {
                    ...final_values,
                    custom_product_table: productsData,
                },
            },
        });
        if (leadRes.exc) {
            frappe.msgprint({ title: "Error", indicator: "red", message: leadRes._error_message || "Something went wrong" });
            return;
        }
        frappe.show_alert({ message: __("Lead Updated Successfully"), indicator: "green" });
        d.hide();
        await me.fetchData();
    } catch (e) {
        frappe.msgprint({ title: "Error", indicator: "red", message: e.message || "Something went wrong" });
    } finally {
        unfreezeScreen();
        btn.prop('disabled', false);
    }
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
                        <td style="padding:8px; vertical-align:middle;"><input type="number" min="0" class="form-control input-sm p-amt" value="${row.product_amount || 0}" style="text-align:right;"></td>
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
              let val = parseFloat($(this).val()) || 0;
              if (val < 0) val = 0;
              $(this).val(val);
              productsData[idx].product_amount = val;
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
                freezeScreen("Updating Appointment...");
                const final_values = {
                    scheduled_time: d.$wrapper.find("#appt_time_edit").val(),
                    status: d.$wrapper.find("#appt_status_edit").val(),
                    customer_details: d.$wrapper.find("#appt_remarks_edit").val(),
                };

                try {
                    const apptRes = await frappe.call({
                        method: "frappe.client.set_value",
                        args: {
                            doctype: "Appointment",
                            name: name,
                            fieldname: final_values,
                        },
                    });
                    if (apptRes.exc) {
                        frappe.msgprint({ title: "Error", indicator: "red", message: apptRes._error_message || "Something went wrong" });
                        return;
                    }
                    frappe.show_alert({ message: __("Appointment Updated"), indicator: "green" });
                    d.hide();
                    await me.fetchData();
                } catch (e) {
                    frappe.msgprint({ title: "Error", indicator: "red", message: e.message || "Something went wrong" });
                } finally {
                    unfreezeScreen();
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


  async loadMore() {
    if (!this.state.hasMore || this.isLoading) return;

    const localData = getLocalCRMData(this.state.section);

    // localStorage mein aur data hai toh wahan se load karo
    if (localData && localData.data && localData.data.length > this.state.data.length) {
      const nextBatch = localData.data.slice(
        this.state.data.length,
        this.state.data.length + this.state.limit
      );
      this.state.data = [...this.state.data, ...nextBatch];
      this.state.hasMore = this.state.data.length < this.state.totalCount;
      this.applyFilter();
      return;
    }

    // localStorage exhaust ho gaya, API se fetch karo
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
    try {
      this.invalidateCache(this.state.section);
      localStorage.removeItem(`crm_local_${this.state.section}_${frappe.session.user}`);

      if (this.state.section === "lead") {
          this.state.leadCursor = null;
      } else if (this.state.section === "appointment") {
          this.state.appointmentCursor = null;
      }

      await this.fetchData(false, 100);
      this.showLocalData();
      $("#mycrm-list-container").scrollTop(0);
    } catch (e) {
      console.error("CRM Refresh Error:", e);
      this.hideLoading();
    }
  }
// section switcher
  async switchSection(section) {
    sessionStorage.setItem("mycrm_active_tab", section);

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

      // Pehle localStorage se instant data dikhao
      const loaded = this.showLocalData();
      // Sirf tab fetch karo jab localStorage mein data na ho — pehle load pe 50 records fetch karo
      if (!loaded) {
        await this.fetchData(false, 100);
        // Fetch ke baad sirf first page load karo — baaki localStorage mein hai
        this.showLocalData();
      }
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

  // create lead function with create appointment, Status, and validation fix but phone number validations not included

createLead() {
    let productsData = [];
    let existingContact = null;
    let lastCheckedMobile = null;

    const validateIndianPhone = (phone) => {
      const phoneRegex = /^[6-9]\d{9}$/;
      return phoneRegex.test(phone);
    };

    const validateFormState = () => {
      const mobile = dialog.get_value("mobile_no");
      const name = dialog.get_value("first_name");
      const source = dialog.get_value("source");
      const status = dialog.get_value("status");

      const isPhoneValid = validateIndianPhone(mobile);
      const isNameValid = name && name.trim().length > 0;
      const isSourceValid = !!source;
      const isStatusValid = !!status;

      const hasProducts = productsData.length > 0;
      const areProductsValid = hasProducts && productsData.every(p => p.product && p.product.toString().trim() && p.product_amount && p.product_amount > 0);

      const isValid = isPhoneValid && isNameValid && isSourceValid && isStatusValid && areProductsValid;
      const btn = dialog.get_primary_btn();
      if (btn) {
        if (isValid) {
          btn.show();
          dialog.$wrapper.find("#lead-mandatory-warning").hide();
        } else {
          btn.hide();
          dialog.$wrapper.find("#lead-mandatory-warning").show();
        }
      }
    };

    const dialog = new frappe.ui.Dialog({
      title: "Create New Lead",
      fields: [
        {
          fieldname: "mandatory_info_html",
          fieldtype: "HTML",
          options: `
            <div id="lead-mandatory-warning" style="margin-top: 5px; margin-bottom: 15px; color: #dc2626; font-size: 13px; font-weight: 500; text-align: center; display: block; animation: blinker 1.5s linear infinite;">
              ⚠️ Please fill all mandatory details (Name, Phone, Source, Status, and at least one Product with Amount > 0) to enable the Create Lead button.
            </div>
            <style>
              @keyframes blinker {
                50% { opacity: 0.35; }
              }
            </style>
          `,
        },
        {
          fieldname: "customer_info_html",
          fieldtype: "HTML",
          options: `
            <div id="customer-info-banner" style="display: none; padding: 12px; margin-bottom: 16px; border-radius: 6px; border-left: 4px solid #236867;"><div id="customer-info-text"></div></div>
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
                lastCheckedMobile = null;
                validateFormState();
                if (!phone) return;
            }
            if (phone.length === 10) {
              if (!validateIndianPhone(phone)) {
                frappe.show_alert({ message: __("Invalid mobile number (6-9)"), indicator: "orange" }, 3);
                dialog.set_value("first_name", "");
                validateFormState();
                return;
              }
            } else if (phone.length > 10) {
              frappe.show_alert({ message: __("Mobile number cannot exceed 10 digits"), indicator: "red" }, 3);
              validateFormState();
              return;
            } else {
              validateFormState();
              return;
            }

            // Same number hai jo pehle check ho chuka hai — skip
            if (phone === lastCheckedMobile) {
              validateFormState();
              return;
            }
            lastCheckedMobile = phone;

            // Check localStorage cache first
            const cacheKey = `crm_contact_${phone}`;
            try {
              const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
              if (cached && (Date.now() - cached.ts < 15 * 60 * 1000)) {
                if (cached.found) {
                  existingContact = cached.data;
                  $("#customer-info-text").html(`<strong>${existingContact.full_name}</strong> • ${existingContact.mobile_no}`);
                  $("#customer-info-banner").css({ background: "#ecfdf5", "border-left-color": "#10b981" }).show();
                  dialog.set_value("first_name", existingContact.full_name);
                  dialog.set_df_property("first_name", "read_only", 1);
                } else {
                  existingContact = null;
                  dialog.set_value("first_name", "");
                  dialog.set_df_property("first_name", "read_only", 0);
                }
                validateFormState();
                return;
              }
            } catch (e) { }

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
                localStorage.setItem(cacheKey, JSON.stringify({ found: true, data: existingContact, ts: Date.now() }));
                $("#customer-info-text").html(`<strong>${existingContact.full_name}</strong> • ${existingContact.mobile_no}`);
                $("#customer-info-banner").css({ background: "#ecfdf5", "border-left-color": "#10b981" }).show();
                dialog.set_value("first_name", existingContact.full_name);
                dialog.set_df_property("first_name", "read_only", 1);
              } else {
                existingContact = null;
                localStorage.setItem(cacheKey, JSON.stringify({ found: false, ts: Date.now() }));
                dialog.set_value("first_name", "");
                dialog.set_df_property("first_name", "read_only", 0);
              }
            } catch (error) { }
            validateFormState();
          },
        },
        {
          fieldname: "first_name",
          fieldtype: "Data",
          label: "Full Name",
          reqd: 1,
          onchange: function () {
            validateFormState();
          }
        },
        { fieldname: "column_break_1", fieldtype: "Column Break" },
        { 
            fieldname: "source", 
            fieldtype: "Link", 
            label: "Source", 
            options: "Lead Source", 
            reqd: 1,
            onchange: function () {
              validateFormState();
            }
        },
        {
          fieldname: "status",
          fieldtype: "Select",
          label: "Status",
          options: "Lead",
          default: "Lead",
          reqd: 1,
          onchange: function () {
            validateFormState();
          }
        },
        { fieldname: "section_break_products", fieldtype: "Section Break", label: "Products" },
        { fieldname: "product_html", fieldtype: "HTML" },
      ],
      primary_action_label: "Create Lead",
      primary_action: async (values) => {
        const btn = dialog.get_primary_btn();

        // Direct DOM re-sync before validation (prevents mobile keyboard / network lag data loss)
        dialog.$wrapper.find("#lead-product-rows tr").each(function(index) {
          if (productsData[index]) {
            const amountVal = parseFloat($(this).find(".product-amount").val()) || 0;
            productsData[index].product_amount = amountVal;
          }
        });

        // Basic validation — freeze se pehle
        if (!validateIndianPhone(values.mobile_no)) {
          frappe.msgprint({ title: __("Invalid Phone Number"), indicator: "red", message: __("Please enter a valid 10-digit mobile number.") });
          return;
        }
        if (productsData.length === 0) {
          frappe.msgprint({ title: "Missing Products", indicator: "red", message: "Please select at least one product before saving." });
          return;
        }
        const missingProductCode = productsData.filter(p => !p.product || !p.product.toString().trim());
        if (missingProductCode.length > 0) {
          frappe.msgprint({ title: "Missing Product Code", indicator: "red", message: "Please select a valid Product Code for all rows." });
          return;
        }
        const invalidProducts = productsData.filter(p => !p.product_amount || p.product_amount <= 0);
        if (invalidProducts.length > 0) {
          frappe.msgprint({ title: "Invalid Amount", indicator: "red", message: "Please enter a valid amount (greater than 0) for all products." });
          return;
        }

        // Backend validate hook (validate_duplicate_lead) duplicate check karega

        // Save
        btn.prop('disabled', true);
        freezeScreen("Creating Lead...");

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
          });
          if (response.exc) {
              frappe.msgprint({ title: "Error", indicator: "red", message: response._error_message || "Something went wrong" });
              return;
          }
          frappe.show_alert({ message: "Lead Created Successfully!", indicator: "green" });
          dialog.hide();
          this.invalidateCache("lead");
          this.invalidateCache("appointment");
          await this.refresh();
        } catch (error) {
          frappe.msgprint({ title: "Error", indicator: "red", message: error.message || "Something went wrong" });
        } finally {
          unfreezeScreen();
          btn.prop('disabled', false);
        }
      },
    });

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
                    <td><input type="number" min="0" class="lead-product-input product-amount" data-index="${index}" value="${row.product_amount || ""}"></td>
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
                validateFormState();
              },
            },
            parent: tr.find(`.product-link-wrapper-${index}`),
            render_input: true,
          });
          if (row.product) productField.set_value(row.product);
          tr.find(".product-amount").on("input", function () {
            let val = parseFloat($(this).val()) || 0;
            if (val < 0) val = 0;
            $(this).val(val);
            productsData[index].product_amount = val;
            validateFormState();
          });
          tr.find(".lead-product-del-btn").on("click", function () {
            productsData.splice(index, 1);
            renderRows();
            validateFormState();
          });
        });
      };
      dialog.$wrapper.find("#lead-add-product-btn").on("click", () => {
        productsData.push({ product: "", product_name: "", product_amount: 0 });
        renderRows();
        validateFormState();
      });
      renderRows();
      validateFormState();
    };

    const sourceField = dialog.get_field("source");
    sourceField.df.only_select = 1; 
    sourceField.get_query = function() { return { filters: { "custom_active": 1 } }; };

    dialog.show();

   const $warning = dialog.$wrapper.find("#lead-mandatory-warning");

$warning.detach().appendTo(dialog.$wrapper.find(".modal-header"));

$warning.css({
    "margin": "0",
    "padding": "0px 45px 15px 20px",
    "text-align": "left",
    "white-space": "normal",
    "overflow-wrap": "break-word",
    "line-height": "1.4",
    "width": "100%",
    "box-sizing": "border-box"
});

dialog.$wrapper.find(".modal-header").css({
    "display": "block",
    "padding": "0"
});

dialog.$wrapper.find(".modal-title").css({
    "padding": "18px 45px 12px 20px"
});
    
    // Phone Number Input Validation (Numeric only & Max 10 digits)
    const $mobileInput = dialog.get_field("mobile_no").$input;
    $mobileInput.on("input", function() {
        let val = $(this).val();
        val = val.replace(/\D/g, "");
        if (val.length > 10) {
            val = val.slice(0, 10);
        }
        $(this).val(val);
        // Sirf tab set_value karo jab value actually change ho — onchange avoid
        const currentVal = dialog.get_value("mobile_no");
        if (val !== currentVal) {
            dialog.set_value("mobile_no", val);
        }
        validateFormState();
    });

    // Attach listeners for other fields
    dialog.get_field("first_name").$input.on("input", validateFormState);
    dialog.get_field("source").$input.on("change", validateFormState);
    dialog.get_field("status").$input.on("change", validateFormState);

    renderProductTable();
    dialog.$wrapper.find(".modal-dialog").css({ "max-width": "800px", width: "95%" });
  }
// create appointment function with validation for lead and time
  createAppointment() {
    const me = this;

    const validateApptFormState = () => {
      const party = d.$wrapper.find("#create_appt_lead").val();
      const time = d.$wrapper.find("#create_appt_time").val();

      const isValid = !!party && !!time;
      const btn = d.get_primary_btn();
      if (btn) {
        if (isValid) {
          btn.show();
          d.$wrapper.find("#appt-mandatory-warning").hide();
        } else {
          btn.hide();
          d.$wrapper.find("#appt-mandatory-warning").show();
        }
      }
    };

    const d = new frappe.ui.Dialog({
      title: "Create New Appointment",
      fields: [
        {
          fieldname: "appt_mandatory_info_html",
          fieldtype: "HTML",
          options: `
            <div id="appt-mandatory-warning" style="margin-top: 5px; margin-bottom: 15px; color: #dc2626; font-size: 13px; font-weight: 500; text-align: center; display: block; animation: blinker 1.5s linear infinite;">
              ⚠️ Please select a Lead and Scheduled Date & Time to enable the Create Appointment button.
            </div>
            <style>
              @keyframes blinker {
                50% { opacity: 0.35; }
              }
            </style>
          `,
        },
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

        // Backend validate hook (validate_duplicate_appointment) duplicate check karega

        // Save
        btn.prop('disabled', true);
        freezeScreen("Creating Appointment...");

        try {
          const response = await frappe.call({
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
          });

          if (response.exc) {
            frappe.msgprint({ title: "Error", indicator: "red", message: response._error_message || "Something went wrong" });
            return;
          }

          frappe.show_alert({ message: "Appointment created", indicator: "green" }, 3);
          d.hide();
          this.invalidateCache("appointment");
          await this.refresh();
        } catch (error) {
          frappe.msgprint({ title: "Error", indicator: "red", message: error.message || "Something went wrong" });
        } finally {
          unfreezeScreen();
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
              validateApptFormState();
              return;
            }

            const r = await frappe.db.get_value("Lead", lead, ["first_name", "last_name", "mobile_no", "email_id"]);
            if (r.message) {
              const full_name = (r.message.first_name || "") + " " + (r.message.last_name || "");
              d.$wrapper.find("#create_appt_name").val(full_name.trim());
              d.$wrapper.find("#create_appt_phone").val(r.message.mobile_no || "");
              d.$wrapper.find("#create_appt_email").val(r.message.email_id || `${lead}@lead.local`);
            }
            validateApptFormState();
          }
        },
        parent: d.$wrapper.find("#lead_link_edit_container"),
        render_input: true,
      });
    };

    me._apptDialog = d;
    d.show();
    d.$wrapper.find(".modal-dialog").css({ "max-width": "800px", width: "95%" });
    renderCreateTab();

    // Event listener for Scheduled Date & Time change
    d.$wrapper.on("change input", "#create_appt_time", validateApptFormState);

    // Initial check (button will be hidden initially because Lead & Time are empty)
    validateApptFormState();
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
    let _lastRefresh = 0;
    const THROTTLE_MS = 3000;

    const handleDocChange = (data) => {
      if (data.doctype === "Lead" || data.doctype === "Appointment") {
        this.invalidateCache(data.doctype.toLowerCase());
        const now = Date.now();
        if (now - _lastRefresh > THROTTLE_MS) {
          _lastRefresh = now;
          this.refresh();
        }
      }
    };

    frappe.realtime.on("doc_update", handleDocChange);
    frappe.realtime.on("doc_delete", handleDocChange);
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
  }

  showLoading() {
    $("#mycrm-loading").show();
    $("#mycrm-list-body, #mycrm-empty, #mycrm-load-more").hide();
  }

  hideLoading() {
    $("#mycrm-loading").hide();
  }
}