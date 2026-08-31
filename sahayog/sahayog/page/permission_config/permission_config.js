frappe.pages["permission-config"].on_page_load = function (wrapper) {
  const authorized_roles = ["Administrator", "Permission Manager", "System Manager"];
  const user_roles = frappe.user_roles;
  const is_authorized = authorized_roles.some((role) => user_roles.includes(role));

  if (!is_authorized) {
    wrapper.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; color: #57606a;">
        <h2 style="margin-top: 20px; color: #24292f;">Access Denied</h2>
        <p style="font-size: 14px; max-width: 400px; text-align: center; line-height: 1.6;">
            You do not have the required permissions to access this page.
        </p>
        <button class="btn btn-default btn-sm" style="margin-top: 15px;" onclick="frappe.set_route('')">
            Back to Home
        </button>
      </div>
    `;
    return;
  }

  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Permission Configuration",
    single_column: true,
  });

  page.add_inner_button(__("View Report"), () => {
    frappe.set_route("query-report", "Report Preference Report");
  });

  $(wrapper).find(".page-content").css({ padding: "16px 20px", maxWidth: "none", background: "#f8fafc" });
  $(wrapper).find(".layout-main-section").css({ maxWidth: "none" });

  let state = {
    user: null,
    full_name: "",
    enabled: 1,
    tag: "",
    access_type: "Geographical (Zone / Region / District)",
    zones: new Set(),
    regions: new Set(),
    districts: new Set(),
    sol_ids: new Set(),
    pref_list: [],
    meta_data: {},
    resolved_branches: []
  };

  function initPage() {
    loadUserList(() => {
      const route = frappe.get_route();
      if (route[2]) {
        selectUser(route[2]);
      } else if (state.pref_list.length > 0) {
        selectUser(state.pref_list[0].user);
      } else {
        renderDashboard();
      }
    });
  }

  function loadUserList(callback) {
    frappe.call({
      method: "sahayog.sahayog.page.permission_config.permission_config.get_all_preferences",
      callback: (r) => {
        state.pref_list = r.message || [];
        if (callback) callback();
      }
    });
  }

  function selectUser(userEmail) {
    state.user = userEmail;
    frappe.call({
      method: "sahayog.scrm.doctype.report_preference.report_preference.get_widget_meta",
      args: { user: userEmail || "" },
      callback: function (r) {
        state.meta_data = r.message || {};
        let pref = state.meta_data.user_preference;

        state.full_name = pref ? pref.full_name : "";
        state.enabled = pref && pref.enabled !== undefined ? pref.enabled : 1;
        state.tag = pref ? pref.tag : "";
        state.access_type = pref && pref.access_type ? pref.access_type : "Geographical (Zone / Region / District)";
        state.zones = new Set(pref && pref.zones ? pref.zones : []);
        state.regions = new Set(pref && pref.regions ? pref.regions : []);
        state.districts = new Set(pref && pref.districts ? pref.districts : []);
        state.sol_ids = new Set(pref && pref.sol_ids ? pref.sol_ids : []);

        calculateBranches(() => {
          renderDashboard();
        });
      }
    });
  }

  function calculateBranches(callback) {
    let isGeo = state.access_type === "Geographical (Zone / Region / District)";
    let zones = Array.from(state.zones);
    let regions = Array.from(state.regions);
    let districts = Array.from(state.districts);
    let sol_ids = Array.from(state.sol_ids);

    if ((isGeo && !zones.length) || (!isGeo && !sol_ids.length)) {
      state.resolved_branches = [];
      if (callback) callback();
      return;
    }

    frappe.call({
      method: "sahayog.scrm.doctype.report_preference.report_preference.get_preview_branches",
      args: {
        zones: zones,
        regions: regions,
        districts: districts,
        sol_ids: sol_ids,
        access_type: state.access_type
      },
      callback: function (r) {
        state.resolved_branches = r.message || [];
        if (callback) callback();
      }
    });
  }

  function autoSave() {
    if (!state.user) return;

    frappe.call({
      method: "sahayog.scrm.doctype.report_preference.report_preference.save_widget_preference",
      args: {
        data: {
          user: state.user,
          enabled: state.enabled,
          tag: state.tag,
          access_type: state.access_type,
          zones: Array.from(state.zones),
          regions: Array.from(state.regions),
          districts: Array.from(state.districts),
          sol_ids: Array.from(state.sol_ids)
        }
      },
      callback: function (r) {
        if (r.message && r.message.status === "success") {
          let $saveBtn = page.main.find("#f16-btn-save-all");
          if ($saveBtn.length) {
            $saveBtn.text("SAVED ✓").css("background", "#16a34a");
            setTimeout(() => {
              $saveBtn.text("SAVE ALL CHANGES").css("background", "#0f2942");
            }, 1200);
          }
          frappe.show_alert({ message: __("Changes saved ✓"), indicator: "green" });
        }
      }
    });
  }

  function renderDashboard() {
    let meta = state.meta_data || {};
    let tagsList = meta.tags || ["COM", "ROM", "RM", "AZM", "ZM"];
    let masterZones = meta.master_zones || [];
    let allBranches = meta.all_branches || [];
    let branches = state.resolved_branches || [];
    let totalAllowedCount = branches.length;
    let totalMasterCount = allBranches.length || 1;
    let isGeo = state.access_type === "Geographical (Zone / Region / District)";
    let hasZoneSelected = state.zones.size > 0;
    let userName = state.full_name || (state.user ? state.user.split('@')[0] : "Select User");
    let userEmail = state.user || "no-user@sahayog.com";

    // Build Nested Tree structures
    let masterTree = {};
    allBranches.forEach(b => {
      let z = b.zone || "Unassigned Zone";
      let r = b.region || "Unassigned Region";
      let d = b.district || "Unassigned District";

      if (!masterTree[z]) masterTree[z] = {};
      if (!masterTree[z][r]) masterTree[z][r] = {};
      if (!masterTree[z][r][d]) masterTree[z][r][d] = [];

      masterTree[z][r][d].push(b);
    });

    let activeTree = {};
    branches.forEach(b => {
      let z = b.zone || "Unassigned Zone";
      let r = b.region || "Unassigned Region";
      let d = b.district || "Unassigned District";

      if (!activeTree[z]) activeTree[z] = {};
      if (!activeTree[z][r]) activeTree[z][r] = {};
      if (!activeTree[z][r][d]) activeTree[z][r][d] = [];

      activeTree[z][r][d].push(b);
    });

    let html = `
      <style>
        .f16-root {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
          color: #0f172a;
          max-width: 1400px;
          margin: 0 auto;
        }

        .f16-dashboard-title {
          font-size: 13.5px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .f16-sec-heading {
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #1e293b;
          margin-top: 18px;
          margin-bottom: 10px;
        }

        /* ROW 1: TOP DUAL CARDS */
        .f16-top-row {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 16px;
          align-items: stretch;
        }
        @media (max-width: 960px) {
          .f16-top-row { grid-template-columns: 1fr; }
        }

        .f16-scope-banner {
          background: linear-gradient(135deg, #cbeafe 0%, #e0f2fe 100%);
          border: 1px solid #93c5fd;
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .f16-scope-icon-box {
          width: 48px;
          height: 48px;
          background: #ffffff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #0284c7;
          box-shadow: 0 2px 5px rgba(2, 132, 199, 0.08);
          flex-shrink: 0;
        }
        .f16-scope-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .f16-scope-text-title {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #0369a1;
        }
        .f16-scope-pill-switch {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          padding: 3px 12px;
          border-radius: 9999px;
          border: 1px solid #93c5fd;
          font-size: 11px;
          font-weight: 700;
        }

        .f16-console-card {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .f16-console-header-label {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }
        .f16-console-actions-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .f16-btn-console-white {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 11.5px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .f16-btn-console-white:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .f16-btn-save-all {
          background: #0f2942;
          color: #ffffff;
          border: 1px solid #0f2942;
          border-radius: 6px;
          padding: 6px 16px;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 6px rgba(15, 41, 66, 0.25);
        }
        .f16-btn-save-all:hover {
          background: #1e3a5f;
        }

        /* ROW 2: USER PROFILE CONFIGURATION */
        .f16-user-grid {
          display: grid;
          grid-template-columns: 1.4fr 1.3fr 1.3fr 1.1fr;
          gap: 14px;
        }
        @media (max-width: 960px) { .f16-user-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 580px) { .f16-user-grid { grid-template-columns: 1fr; } }

        .f16-card-box {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px 14px;
          min-height: 64px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
          position: relative;
        }
        .f16-card-box-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 4px;
        }
        .f16-avatar {
          width: 36px;
          height: 36px;
          background: #e2e8f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #475569;
          flex-shrink: 0;
        }

        .f16-pill-toggle {
          width: 38px;
          height: 20px;
          background: #cbd5e1;
          border-radius: 10px;
          position: relative;
          cursor: pointer;
          transition: background 0.2s ease;
          flex-shrink: 0;
        }
        .f16-pill-toggle.active { background: #16a34a; }
        .f16-pill-toggle-thumb {
          width: 16px;
          height: 16px;
          background: #ffffff;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .f16-pill-toggle.active .f16-pill-toggle-thumb { transform: translateX(18px); }

        /* ROW 3: SPLIT PANEL */
        .f16-panel-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          display: flex;
        }
        @media (max-width: 900px) { .f16-panel-card { flex-direction: column; } }

        .f16-left-sidebar {
          width: 250px;
          background: #f8fafc;
          border-right: 1px solid #cbd5e1;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 900px) {
          .f16-left-sidebar { width: 100%; border-right: none; border-bottom: 1px solid #cbd5e1; }
        }
        .f16-sidebar-dark-header {
          background: #0f172a;
          color: #ffffff;
          padding: 10px 14px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .f16-sidebar-tree-list {
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 480px;
          overflow-y: auto;
        }
        .f16-sidebar-tree-item {
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 11.5px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.15s ease;
          color: #334155;
        }
        .f16-sidebar-tree-item:hover { background: #e2e8f0; color: #0f172a; }
        .f16-sidebar-tree-item.active { background: #e0f2fe; color: #0369a1; font-weight: 700; }

        .f16-right-table-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .f16-table-top-bar {
          padding: 10px 16px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .f16-table-search-input {
          max-width: 220px;
          padding: 5px 12px;
          font-size: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
          background: #f8fafc;
        }
        .f16-table-search-input:focus { border-color: #0284c7; background: #ffffff; }

        .f16-table-container { max-height: 460px; overflow-y: auto; }
        .f16-dashboard-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .f16-dashboard-table th {
          position: sticky;
          top: 0;
          background: #0f172a;
          color: #ffffff;
          font-weight: 700;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: left;
          padding: 10px 12px;
          z-index: 2;
        }
        .f16-dashboard-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          vertical-align: middle;
        }

        .f16-row-zone-lvl { background: #f8fafc; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
        .f16-row-region-lvl { background: #ffffff; font-weight: 600; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
        .f16-row-district-lvl { background: #ffffff; color: #475569; border-bottom: 1px solid #f1f5f9; }
        .f16-row-branch-lvl { background-color: #f0fdf4; border-bottom: 1px solid #dcfce7; }
        .f16-row-branch-lvl:hover { background-color: #dcfce7; }

        .f16-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; }
        .f16-badge-zone { background: #e0f2fe; color: #0369a1; }
        .f16-badge-region { background: #f3e8ff; color: #7e22ce; }
        .f16-badge-district { background: #fef3c7; color: #b45309; }
        .f16-badge-branch { background: #dcfce7; color: #15803d; }

        .rp-sol-pill {
          font-family: ui-monospace, monospace;
          font-weight: 700;
          font-size: 11.5px;
          color: #15803d;
          background: #dcfce7;
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid #86efac;
          display: inline-block;
        }
        .rp-tag-micro {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 4px;
          background: #f1f5f9;
          color: #475569;
        }

        .rp-perm-capsule {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          background: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
        }
        .rp-perm-capsule.active {
          background: #ecfdf5;
          color: #065f46;
          border-color: #6ee7b7;
        }
        .rp-capsule-dot { width: 5px; height: 5px; border-radius: 50%; background: #94a3b8; }
        .rp-perm-capsule.active .rp-capsule-dot { background: #10b981; }

        .f16-footer-row {
          padding: 10px 16px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11.5px;
          color: #64748b;
        }
      </style>

      <div class="f16-root">
        <!-- Main Dashboard Title -->
        <div class="f16-dashboard-title">USER MANAGEMENT DASHBOARD</div>

        <!-- ROW 1: TOP DUAL CARDS -->
        <div class="f16-top-row">
          <!-- Card 1: Admin & Scope Banner -->
          <div class="f16-scope-banner">
            <div class="f16-scope-icon-box">🛡️</div>
            <div class="f16-scope-details">
              <div class="f16-scope-text-title">ADMIN & PERMISSION SCOPE</div>
              <div class="f16-scope-pill-switch">
                <div class="f16-pill-toggle ${isGeo ? 'active' : ''}" id="f16-switch-scope-mode">
                  <div class="f16-pill-toggle-thumb"></div>
                </div>
                <span style="color: ${isGeo ? '#0369a1' : '#64748b'}; font-weight: 700;">
                  ${isGeo ? 'GEOGRAPHICAL SCOPE' : 'Branch-Level View'}
                </span>
                <span style="color: #cbd5e1;">|</span>
                <span style="color: #0284c7; font-weight: 500; cursor: pointer; text-decoration: underline;" id="f16-btn-toggle-scope-text">
                  ${isGeo ? 'Branch-Level View' : 'Geographical Scope'}
                </span>
              </div>
            </div>
          </div>

          <!-- Card 2: Action Console -->
          <div class="f16-console-card">
            <div class="f16-console-header-label">Action Console</div>
            <div class="f16-console-actions-row">
              <button type="button" class="f16-btn-console-white" id="f16-btn-reset-perm">
                <span>✕</span> <span>Reset Permissions</span>
              </button>
              <button type="button" class="f16-btn-console-white" id="f16-btn-discard-perm">
                <span>Discard Changes</span>
              </button>
              <button type="button" class="f16-btn-console-white" id="f16-btn-bulk-perm">
                <span>🔄</span> <span>Bulk Update</span>
              </button>
              <button type="button" class="f16-btn-save-all" id="f16-btn-save-all">
                <span>SAVE ALL CHANGES</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Section 2: User Profile Configuration -->
        <div class="f16-sec-heading">USER PROFILE CONFIGURATION</div>

        <!-- ROW 2: 4-CARDS USER GRID -->
        <div class="f16-user-grid">
          <!-- Card 1: User Identity -->
          <div class="f16-card-box">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="f16-avatar">👤</div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 700; font-size: 12.5px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${userName}
                </div>
                <div style="font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  (${userEmail})
                </div>
              </div>
              <span style="color: #94a3b8; font-size: 13px; cursor: pointer;" title="Select User" id="f16-btn-open-user-picker">✏️</span>
            </div>
          </div>

          <!-- Card 2: Permissions Tag -->
          <div class="f16-card-box">
            <div class="f16-card-box-label">Permissions Tag:</div>
            <select class="form-control input-sm" id="rp-tag-select" style="background:#fff; font-size:11.5px; height:26px; border-color:#cbd5e1;">
              <option value="">No Tag</option>
              ${tagsList.map(t => `<option value="${t}" ${state.tag === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>

          <!-- Card 3: Account Status -->
          <div class="f16-card-box" style="flex-direction: row; align-items: center; justify-content: space-between;">
            <div>
              <div class="f16-card-box-label">Account Status:</div>
              <div style="font-size: 12.5px; font-weight: 800; color: ${state.enabled ? '#16a34a' : '#64748b'}; letter-spacing: 0.03em;">
                ${state.enabled ? 'ACTIVE' : 'DISABLED'}
              </div>
              <div style="font-size: 9px; color: #94a3b8;">Auto-save enabled</div>
            </div>
            <div class="f16-pill-toggle ${state.enabled ? 'active' : ''}" id="f16-toggle-user-status">
              <div class="f16-pill-toggle-thumb"></div>
            </div>
          </div>

          <!-- Card 4: User Role -->
          <div class="f16-card-box" style="flex-direction: row; align-items: center; justify-content: space-between;">
            <div>
              <div class="f16-card-box-label">User Role:</div>
              <div style="font-weight: 700; font-size: 12px; color: #0f172a;">
                ${state.tag || 'Regional Manager'}
              </div>
            </div>
            <button type="button" class="f16-btn-console-white" id="f16-btn-role-change" style="padding: 2px 8px; font-size: 10.5px;">
              Change Role
            </button>
          </div>
        </div>

        <!-- Section 3: Geographical Permission & Coverage -->
        <div class="f16-sec-heading">GEOGRAPHICAL PERMISSION & COVERAGE</div>

        <!-- ROW 3: SPLIT PANEL -->
        <div class="f16-panel-card">
          <!-- LEFT SIDEBAR: COVERAGE SUMMARY -->
          <div class="f16-left-sidebar">
            <div class="f16-sidebar-dark-header">
              <span>Coverage Summary</span>
              <span>% Branches</span>
            </div>

            <div class="f16-sidebar-tree-list">
              ${Object.keys(masterTree).map(z => {
                let zTotal = Object.values(masterTree[z]).reduce((acc, reg) => 
                  acc + Object.values(reg).reduce((a, dist) => a + dist.length, 0), 0);
                let zAllowed = activeTree[z] ? Object.values(activeTree[z]).reduce((acc, reg) => 
                  acc + Object.values(reg).reduce((a, dist) => a + dist.length, 0), 0) : 0;
                let zPct = ((zAllowed / totalMasterCount) * 100).toFixed(1);
                let isZoneActive = state.zones.has(z);

                return `
                  <div class="f16-sidebar-tree-item ${isZoneActive ? 'active' : ''} f16-tree-item-zone" data-zone="${z}">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span style="font-size: 11px;">${isZoneActive ? '🟦' : '◻️'}</span>
                      <b>${z}</b>
                    </div>
                    <span style="font-weight: 700; font-size: 11px; color: ${isZoneActive ? '#0369a1' : '#64748b'};">
                      ${zPct}% (${zAllowed})
                    </span>
                  </div>

                  ${isZoneActive ? Object.keys(masterTree[z]).map(r => {
                    let rAllowed = (activeTree[z] && activeTree[z][r]) ? Object.values(activeTree[z][r]).reduce((a, dist) => a + dist.length, 0) : 0;
                    let isRegionActive = !state.regions.size || state.regions.has(r);

                    return `
                      <div class="f16-sidebar-tree-item ${isRegionActive ? 'active' : ''} f16-tree-item-region" data-zone="${z}" data-region="${r}" style="padding-left: 18px; font-size: 11px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span style="color: #94a3b8; font-size: 9px;">▪</span>
                          <span>${r}</span>
                        </div>
                        <span style="color: #64748b;">${rAllowed} Br</span>
                      </div>
                    `;
                  }).join('') : ''}
                `;
              }).join('')}
            </div>
          </div>

          <!-- RIGHT MAIN TABLE -->
          <div class="f16-right-table-area">
            <!-- Top Table Toolbar -->
            <div class="f16-table-top-bar">
              <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 240px;">
                ${isGeo ? `
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="font-size: 11px; font-weight: 700; color: #475569;">ZONES:</span>
                    ${masterZones.map(z => `
                      <div class="rp-perm-capsule rp-zone-capsule ${state.zones.has(z) ? 'active' : ''}" data-zone="${z}">
                        <span class="rp-capsule-dot"></span>
                        <span>${z}</span>
                      </div>
                    `).join('')}
                    <button type="button" class="btn btn-xs btn-link" id="f16-btn-select-all-zones" style="font-size: 11px; font-weight: 600; color: #0284c7;">Select All</button>
                    <span style="color: #cbd5e1;">•</span>
                    <button type="button" class="btn btn-xs btn-link" id="f16-btn-clear-all-zones" style="font-size: 11px; color: #64748b;">Clear</button>
                  </div>
                ` : `
                  <div style="display: flex; align-items: center; gap: 6px; width: 100%; max-width: 420px; position: relative;">
                    <input type="text" class="form-control input-sm" id="rp-table-sol-search-input" placeholder="Type or paste SOL ID (e.g. 1001, 1002)..." style="height: 28px; font-size: 11.5px;" />
                    <button type="button" class="btn btn-xs btn-primary" id="rp-btn-add-sol-tokens" style="padding: 3px 10px; font-size: 11px;">+ Add</button>
                    <div class="rp-dropdown-popover" id="rp-table-sol-dropdown" style="top: 32px;"></div>
                  </div>
                `}
              </div>

              <!-- Controls -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <button type="button" class="f16-btn-console-white" id="f16-btn-expand-all" style="padding: 3px 8px; font-size: 10.5px;">▾ Expand All</button>
                <button type="button" class="f16-btn-console-white" id="f16-btn-collapse-all" style="padding: 3px 8px; font-size: 10.5px;">▸ Collapse All</button>
                <input type="text" class="f16-table-search-input" id="f16-table-search-box" placeholder="🔍 Search branch, SOL..." />
              </div>
            </div>

            <!-- Table Container -->
            <div class="f16-table-container">
              ${isGeo && !hasZoneSelected ? `
                <div style="padding: 44px; text-align: center; color: #94a3b8; font-size: 13px;">
                  👈 Please select a <b>Zone</b> from above or sidebar to grant branch access.
                </div>
              ` : (!isGeo && !state.sol_ids.size ? `
                <div style="padding: 44px; text-align: center; color: #94a3b8; font-size: 13px;">
                  🔍 Type single SOL ID or paste comma separated list above to attach branches.
                </div>
              ` : (totalAllowedCount === 0 ? `
                <div style="padding: 40px; text-align: center; color: #94a3b8; font-size: 12.5px;">
                  No branches found matching current criteria.
                </div>
              ` : `
                <table class="f16-dashboard-table" id="f16-grid-table">
                  <thead>
                    <tr>
                      <th style="width: 32px; text-align: center;">
                        <input type="checkbox" id="f16-select-all-chk" checked style="cursor: pointer;" />
                      </th>
                      <th style="width: 105px;">LEVEL</th>
                      <th style="width: 110px;">ZONE</th>
                      <th style="width: 130px;">REGION</th>
                      <th style="width: 130px;">DISTRICT</th>
                      <th>BRANCH NAME</th>
                      <th style="width: 90px;">SOL ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Object.keys(activeTree).map(z => {
                      let zBranchesCount = Object.values(activeTree[z]).reduce((acc, reg) => 
                        acc + Object.values(reg).reduce((a, dist) => a + dist.length, 0), 0);
                      let zRegCount = Object.keys(activeTree[z]).length;
                      let zKey = `zone-${z.replace(/[^a-zA-Z0-9]/g, '_')}`;

                      return `
                        <!-- Level 1: ZONE ROW -->
                        <tr class="f16-row-zone-lvl rp-tree-header-row" data-tree-key="${zKey}" data-zone-key="${zKey}" data-search="${z}">
                          <td style="text-align: center;">
                            <input type="checkbox" class="f16-row-chk f16-zone-chk" data-zone="${z}" checked />
                          </td>
                          <td>
                            <span class="rp-tree-toggle-icon" id="icon-${zKey}">▸</span>
                            <span class="f16-badge f16-badge-zone">Zone</span>
                          </td>
                          <td><b>${z}</b></td>
                          <td><span class="text-muted">(${zRegCount} Regions)</span></td>
                          <td><span class="text-muted">—</span></td>
                          <td><span class="text-muted" style="font-weight: 600;">${zBranchesCount} Branches</span></td>
                          <td>—</td>
                        </tr>

                        ${Object.keys(activeTree[z]).map(r => {
                          let rBranchesCount = Object.values(activeTree[z][r]).reduce((a, dist) => a + dist.length, 0);
                          let rDistCount = Object.keys(activeTree[z][r]).length;
                          let rKey = `${zKey}-reg-${r.replace(/[^a-zA-Z0-9]/g, '_')}`;

                          return `
                            <!-- Level 2: REGION ROW -->
                            <tr class="f16-row-region-lvl rp-tree-header-row rp-under-zone-${zKey}" data-zone-parent="${zKey}" data-tree-key="${rKey}" data-reg-key="${rKey}" data-search="${z} ${r}" style="display: none;">
                              <td style="text-align: center;">
                                <input type="checkbox" class="f16-row-chk f16-region-chk" data-zone="${z}" data-region="${r}" checked />
                              </td>
                              <td>
                                <span class="rp-tree-toggle-icon" id="icon-${rKey}">▸</span>
                                <span class="f16-badge f16-badge-region">Region</span>
                              </td>
                              <td><span class="rp-tag-micro">${z}</span></td>
                              <td><b>${r}</b></td>
                              <td><span class="text-muted">(${rDistCount} Districts)</span></td>
                              <td><span class="text-muted" style="font-weight: 600;">${rBranchesCount} Branches</span></td>
                              <td>—</td>
                            </tr>

                            ${Object.keys(activeTree[z][r]).map(d => {
                              let distBranches = activeTree[z][r][d];
                              let dKey = `${rKey}-dist-${d.replace(/[^a-zA-Z0-9]/g, '_')}`;

                              return `
                                <!-- Level 3: DISTRICT ROW -->
                                <tr class="f16-row-district-lvl rp-tree-header-row rp-under-zone-${zKey} rp-under-reg-${rKey}" data-zone-parent="${zKey}" data-reg-parent="${rKey}" data-tree-key="${dKey}" data-dist-key="${dKey}" data-search="${z} ${r} ${d}" style="display: none;">
                                  <td style="text-align: center;">
                                    <input type="checkbox" class="f16-row-chk f16-district-chk" data-district="${d}" checked />
                                  </td>
                                  <td>
                                    <span class="rp-tree-toggle-icon" id="icon-${dKey}">▸</span>
                                    <span class="f16-badge f16-badge-district">District</span>
                                  </td>
                                  <td><span class="rp-tag-micro">${z}</span></td>
                                  <td><span class="rp-tag-micro">${r}</span></td>
                                  <td><b>${d}</b></td>
                                  <td><span class="text-muted" style="font-weight: 600;">${distBranches.length} Branches</span></td>
                                  <td>—</td>
                                </tr>

                                <!-- Level 4: BRANCH ROWS -->
                                ${distBranches.map(b => `
                                  <tr class="f16-row-branch-lvl rp-under-zone-${zKey} rp-under-reg-${rKey} rp-under-dist-${dKey}" data-zone-parent="${zKey}" data-reg-parent="${rKey}" data-dist-parent="${dKey}" data-search="${String(b.sol_id)} ${b.branch || ''} ${d} ${r} ${z}" style="display: none;">
                                    <td style="text-align: center;">
                                      <input type="checkbox" class="f16-row-chk f16-branch-chk" data-sol="${b.sol_id}" checked />
                                    </td>
                                    <td>
                                      <span class="rp-tree-toggle-icon" style="color: #94a3b8; font-size: 8px;">•</span>
                                      <span class="f16-badge f16-badge-branch">Branch</span>
                                    </td>
                                    <td><span class="rp-tag-micro">${z}</span></td>
                                    <td><span class="rp-tag-micro">${r}</span></td>
                                    <td><span class="rp-tag-micro">${d}</span></td>
                                    <td><b>${b.branch || '-'}</b></td>
                                    <td><span class="rp-sol-pill">${b.sol_id || '-'}</span></td>
                                  </tr>
                                `).join('')}
                              `;
                            }).join('')}
                          `;
                        }).join('')}
                      `;
                    }).join('')}
                  </tbody>
                </table>
              `))}
            </div>

            <!-- Footer -->
            <div class="f16-footer-row">
              <div><b>Total records:</b> ${totalAllowedCount} Allowed / ${totalMasterCount} Master Branches</div>
              <div style="font-size: 11px; color: #94a3b8;">Frappe v16 Dashboard View</div>
            </div>
          </div>
        </div>
      </div>
    `;

    page.main.html(html);
    attachEvents();
  }

  function attachEvents() {
    let $m = page.main;

    // Scope Toggle
    $m.find("#f16-switch-scope-mode, #f16-btn-toggle-scope-text").on("click", function () {
      let isGeo = state.access_type === "Geographical (Zone / Region / District)";
      state.access_type = isGeo ? "Specific Branches (SOL ID)" : "Geographical (Zone / Region / District)";
      if (state.access_type === "Geographical (Zone / Region / District)") {
        state.sol_ids.clear();
      } else {
        state.zones.clear();
        state.regions.clear();
        state.districts.clear();
      }
      calculateBranches(() => {
        renderDashboard();
        autoSave();
      });
    });

    // User Picker Dialog
    $m.find("#f16-btn-open-user-picker").on("click", function () {
      let d = new frappe.ui.Dialog({
        title: __("Select User"),
        fields: [{ fieldname: "user", fieldtype: "Link", options: "User", label: "User", reqd: 1 }],
        primary_action_label: __("Load User"),
        primary_action: function (values) {
          d.hide();
          selectUser(values.user);
        }
      });
      d.show();
    });

    // Tag Select
    $m.find("#rp-tag-select").on("change", function () {
      state.tag = $(this).val();
      autoSave();
    });

    // Status Toggle
    $m.find("#f16-toggle-user-status").on("click", function () {
      state.enabled = state.enabled ? 0 : 1;
      renderDashboard();
      autoSave();
    });

    // Save All Button
    $m.find("#f16-btn-save-all").on("click", function () {
      autoSave();
    });

    // Reset Permissions Button
    $m.find("#f16-btn-reset-perm").on("click", function () {
      if (!state.user) return;
      frappe.confirm(__(`Reset and clear all permissions for <b>${state.user}</b>?`), () => {
        state.zones.clear();
        state.regions.clear();
        state.districts.clear();
        state.sol_ids.clear();
        autoSave();
        calculateBranches(() => {
          renderDashboard();
        });
      });
    });

    $m.find("#f16-btn-discard-perm").on("click", function () {
      selectUser(state.user);
    });

    // Sidebar items click
    $m.find(".f16-tree-item-zone").on("click", function () {
      let z = $(this).data("zone");
      if (state.zones.has(z)) {
        state.zones.delete(z);
      } else {
        state.zones.add(z);
      }
      calculateBranches(() => {
        renderDashboard();
        autoSave();
      });
    });

    $m.find(".f16-tree-item-region").on("click", function (e) {
      e.stopPropagation();
      let r = $(this).data("region");
      if (state.regions.has(r)) {
        state.regions.delete(r);
      } else {
        state.regions.add(r);
      }
      calculateBranches(() => {
        renderDashboard();
        autoSave();
      });
    });

    // Top Bar Zone Capsules
    $m.find(".rp-zone-capsule").on("click", function () {
      let z = $(this).data("zone");
      if (state.zones.has(z)) {
        state.zones.delete(z);
      } else {
        state.zones.add(z);
      }
      calculateBranches(() => {
        renderDashboard();
        autoSave();
      });
    });

    $m.find("#f16-btn-select-all-zones").on("click", function () {
      (state.meta_data.master_zones || []).forEach(z => state.zones.add(z));
      calculateBranches(() => {
        renderDashboard();
        autoSave();
      });
    });

    $m.find("#f16-btn-clear-all-zones").on("click", function () {
      state.zones.clear();
      state.regions.clear();
      calculateBranches(() => {
        renderDashboard();
        autoSave();
      });
    });

    // SOL Mode Search & Add Input
    let $solInput = $m.find("#rp-table-sol-search-input");
    let $solDropdown = $m.find("#rp-table-sol-dropdown");

    function processSolTokens(val) {
      if (!val) return;
      let tokens = val.split(/[,;\s\n\r]+/).map(x => x.trim()).filter(Boolean);
      if (!tokens.length) return;

      tokens.forEach(tok => {
        if (tok) state.sol_ids.add(String(tok));
      });

      $solInput.val("");
      $solDropdown.hide().empty();
      calculateBranches(() => {
        renderDashboard();
        autoSave();
      });
    }

    $solInput.on("keydown", function (e) {
      if (e.which === 13) {
        e.preventDefault();
        processSolTokens($(this).val());
      }
    });

    $m.find("#rp-btn-add-sol-tokens").on("click", function () {
      processSolTokens($solInput.val());
    });

    // Progressive Drilldown Click Handlers
    $m.find(".f16-row-zone-lvl").on("click", function (e) {
      if ($(e.target).is("input, button")) return;
      let zKey = $(this).data("zone-key");
      let $icon = $(this).find(`#icon-${zKey}`);
      let isExpanding = $icon.text().trim() === "▸";

      if (isExpanding) {
        $icon.text("▼");
        $m.find(`.f16-row-region-lvl[data-zone-parent="${zKey}"]`).show();
      } else {
        $icon.text("▸");
        $m.find(`.rp-under-zone-${zKey}`).hide();
        $m.find(`.f16-row-region-lvl[data-zone-parent="${zKey}"] .rp-tree-toggle-icon`).text("▸");
        $m.find(`.f16-row-district-lvl[data-zone-parent="${zKey}"] .rp-tree-toggle-icon`).text("▸");
      }
    });

    $m.find(".f16-row-region-lvl").on("click", function (e) {
      if ($(e.target).is("input, button")) return;
      e.stopPropagation();
      let rKey = $(this).data("reg-key");
      let $icon = $(this).find(`#icon-${rKey}`);
      let isExpanding = $icon.text().trim() === "▸";

      if (isExpanding) {
        $icon.text("▼");
        $m.find(`.f16-row-district-lvl[data-reg-parent="${rKey}"]`).show();
      } else {
        $icon.text("▸");
        $m.find(`.rp-under-reg-${rKey}`).hide();
        $m.find(`.f16-row-district-lvl[data-reg-parent="${rKey}"] .rp-tree-toggle-icon`).text("▸");
      }
    });

    $m.find(".f16-row-district-lvl").on("click", function (e) {
      if ($(e.target).is("input, button")) return;
      e.stopPropagation();
      let dKey = $(this).data("dist-key");
      let $icon = $(this).find(`#icon-${dKey}`);
      let isExpanding = $icon.text().trim() === "▸";

      if (isExpanding) {
        $icon.text("▼");
        $m.find(`.f16-row-branch-lvl[data-dist-parent="${dKey}"]`).show();
      } else {
        $icon.text("▸");
        $m.find(`.f16-row-branch-lvl[data-dist-parent="${dKey}"]`).hide();
      }
    });

    // Expand / Collapse All
    $m.find("#f16-btn-expand-all").on("click", function () {
      $m.find(".f16-row-region-lvl, .f16-row-district-lvl, .f16-row-branch-lvl").show();
      $m.find(".rp-tree-toggle-icon").each(function () {
        if ($(this).text().trim() === "▸") $(this).text("▼");
      });
    });

    $m.find("#f16-btn-collapse-all").on("click", function () {
      $m.find(".f16-row-region-lvl, .f16-row-district-lvl, .f16-row-branch-lvl").hide();
      $m.find(".rp-tree-toggle-icon").each(function () {
        if ($(this).text().trim() === "▼") $(this).text("▸");
      });
    });

    // Search Filter
    $m.find("#f16-table-search-box").on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      if (!q) {
        $m.find(".f16-row-zone-lvl").show();
        $m.find(".f16-row-region-lvl, .f16-row-district-lvl, .f16-row-branch-lvl").hide();
        $m.find(".rp-tree-toggle-icon").each(function () {
          if ($(this).text().trim() === "▼") $(this).text("▸");
        });
        return;
      }

      $m.find(".f16-row-zone-lvl, .f16-row-region-lvl, .f16-row-district-lvl, .f16-row-branch-lvl").hide();

      $m.find(".f16-row-branch-lvl").each(function () {
        let sText = ($(this).data("search") || "").toLowerCase();
        if (sText.includes(q)) {
          $(this).show();
          let pZone = $(this).data("zone-parent");
          let pReg = $(this).data("reg-parent");
          let pDist = $(this).data("dist-parent");

          $m.find(`.f16-row-zone-lvl[data-zone-key="${pZone}"]`).show();
          $m.find(`.f16-row-region-lvl[data-reg-key="${pReg}"]`).show();
          $m.find(`.f16-row-district-lvl[data-dist-key="${pDist}"]`).show();

          $m.find(`#icon-${pZone}`).text("▼");
          $m.find(`#icon-${pReg}`).text("▼");
          $m.find(`#icon-${pDist}`).text("▼");
        }
      });
    });
  }

  initPage();
};
