frappe.ui.form.on("Report Preference", {
  setup: function (frm) {
    frm.meta_data = null;
    frm.state = {
      user: null,
      full_name: "",
      enabled: 1,
      tag: "",
      access_type: "Geographical (Zone / Region / District)",
      zones: new Set(),
      regions: new Set(),
      districts: new Set(),
      sol_ids: new Set(),
      filter_zone: "ALL",
      filter_search: "",
      page_size: 50,
      active_menu_key: null
    };
    frm.resolved_branches = [];
  },

  refresh: function (frm) {
    frm.toggle_display("hidden_fields_section", false);
    frm.trigger("init_widget");
  },

  user: function (frm) {
    if (frm.doc.user) {
      frm.state.user = frm.doc.user;
      frm.trigger("load_user_preference_into_widget");
    }
  },

  init_widget: function (frm) {
    frappe.call({
      method: "sahayog.scrm.doctype.report_preference.report_preference.get_widget_meta",
      args: { user: frm.doc.user || "" },
      callback: function (r) {
        frm.meta_data = r.message || {};
        frm.trigger("sync_doc_to_widget_state");
        frm.trigger("render_full_dashboard");
        frm.trigger("calculate_and_render_branches");
      }
    });
  },

  load_user_preference_into_widget: function (frm) {
    frappe.call({
      method: "sahayog.scrm.doctype.report_preference.report_preference.get_widget_meta",
      args: { user: frm.state.user || frm.doc.user },
      callback: function (r) {
        frm.meta_data = r.message || {};
        frm.trigger("sync_doc_to_widget_state");
        frm.trigger("render_full_dashboard");
        frm.trigger("calculate_and_render_branches");
      }
    });
  },

  sync_doc_to_widget_state: function (frm) {
    let pref = frm.meta_data.user_preference;

    frm.state.user = frm.doc.user || (pref ? pref.user : "");
    frm.state.full_name = frm.doc.full_name || (pref ? pref.full_name : "");
    frm.state.enabled = frm.doc.enabled !== undefined ? frm.doc.enabled : (pref ? pref.enabled : 1);
    frm.state.tag = frm.doc.tag || (pref ? pref.tag : "");
    frm.state.access_type = frm.doc.access_type || (pref ? pref.access_type : "Geographical (Zone / Region / District)");

    let zones = (frm.doc.zone || []).map(d => d.zone).filter(Boolean);
    if (!zones.length && pref && pref.zones) zones = pref.zones;
    frm.state.zones = new Set(zones);

    let regions = (frm.doc.region || []).map(d => d.region).filter(Boolean);
    if (!regions.length && pref && pref.regions) regions = pref.regions;
    frm.state.regions = new Set(regions);

    let districts = (frm.doc.district || []).map(d => d.district).filter(Boolean);
    if (!districts.length && pref && pref.districts) districts = pref.districts;
    frm.state.districts = new Set(districts);

    let sol_ids = (frm.doc.sol_id || []).map(d => String(d.sol_id)).filter(Boolean);
    if (!sol_ids.length && pref && pref.sol_ids) sol_ids = pref.sol_ids;
    frm.state.sol_ids = new Set(sol_ids);
  },

  sync_widget_state_to_doc: function (frm) {
    frm.doc.user = frm.state.user;
    frm.doc.full_name = frm.state.full_name;
    frm.doc.enabled = frm.state.enabled ? 1 : 0;
    frm.doc.tag = frm.state.tag || "";
    frm.doc.access_type = frm.state.access_type || "Geographical (Zone / Region / District)";

    frm.clear_table("zone");
    frm.clear_table("region");
    frm.clear_table("district");
    frm.clear_table("sol_id");

    if (frm.state.access_type === "Geographical (Zone / Region / District)") {
      frm.state.zones.forEach(z => frm.add_child("zone", { zone: z }));
      frm.state.regions.forEach(r => frm.add_child("region", { region: r }));
      frm.state.districts.forEach(d => frm.add_child("district", { district: d }));
    } else {
      frm.state.sol_ids.forEach(s => frm.add_child("sol_id", { sol_id: String(s) }));
    }
  },

  auto_save_preference: function (frm, show_toast = true) {
    if (!frm.state.user) return;

    frm.trigger("sync_widget_state_to_doc");

    frappe.call({
      method: "sahayog.scrm.doctype.report_preference.report_preference.save_widget_preference",
      args: {
        data: {
          user: frm.state.user,
          enabled: frm.state.enabled,
          tag: frm.state.tag,
          access_type: frm.state.access_type,
          zones: Array.from(frm.state.zones),
          regions: Array.from(frm.state.regions),
          districts: Array.from(frm.state.districts),
          sol_ids: Array.from(frm.state.sol_ids)
        }
      },
      callback: function (r) {
        if (r.message && r.message.status === "success") {
          let $saveBtn = frm.fields_dict.widget_html.$wrapper.find("#f16-btn-save-all");
          if ($saveBtn.length) {
            $saveBtn.text("SAVED ✓").css("background", "#16a34a");
            setTimeout(() => {
              $saveBtn.text("SAVE ALL CHANGES").css("background", "#0f2942");
            }, 1200);
          }
          if (show_toast) {
            frappe.show_alert({ message: __("Changes saved ✓"), indicator: "green" });
          }
        }
      }
    });
  },

  before_save: function (frm) {
    frm.trigger("sync_widget_state_to_doc");
  },

  render_full_dashboard: function (frm) {
    if (!frm.fields_dict.widget_html) return;

    let meta = frm.meta_data || {};
    let tagsList = meta.tags || ["COM", "ROM", "RM", "AZM", "ZM"];
    let isGeo = frm.state.access_type === "Geographical (Zone / Region / District)";
    let isNewDoc = frm.is_new() || !frm.state.user;
    let userName = frm.state.full_name || (frm.state.user ? frm.state.user.split('@')[0] : "Select User");
    let userEmail = frm.state.user || "no-user@sahayog.com";

    let html = `
      <style>
        .f16-root {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
          color: #0f172a;
          margin-top: 2px;
          margin-bottom: 20px;
        }

        /* Top Header Title */
        .f16-dashboard-title {
          font-size: 13.5px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #0f172a;
          margin-bottom: 12px;
        }

        /* Section Headings */
        .f16-sec-heading {
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #1e293b;
          margin-top: 18px;
          margin-bottom: 10px;
        }

        /* ROW 1: Top Dual Cards */
        .f16-top-row {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 16px;
          align-items: stretch;
        }
        @media (max-width: 960px) {
          .f16-top-row {
            grid-template-columns: 1fr;
          }
        }

        /* Card 1: Admin & Scope Banner */
        .f16-scope-banner {
          background: #dbeafe;
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

        /* Card 2: Action Console */
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

        /* ROW 2: 4-Column User Configuration Grid */
        .f16-user-grid {
          display: grid;
          grid-template-columns: 1.4fr 1.3fr 1.3fr 1.1fr;
          gap: 14px;
        }
        @media (max-width: 960px) {
          .f16-user-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 580px) {
          .f16-user-grid {
            grid-template-columns: 1fr;
          }
        }

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

        /* Avatar Circle */
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

        /* Switch Toggle Component */
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
        .f16-pill-toggle.active {
          background: #16a34a;
        }
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
        .f16-pill-toggle.active .f16-pill-toggle-thumb {
          transform: translateX(18px);
        }

        /* ROW 3: Master Geographical Permission Split Panel */
        .f16-panel-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          display: flex;
        }
        @media (max-width: 900px) {
          .f16-panel-card {
            flex-direction: column;
          }
        }

        /* Left Sidebar */
        .f16-left-sidebar {
          width: 250px;
          background: #f8fafc;
          border-right: 1px solid #cbd5e1;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 900px) {
          .f16-left-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #cbd5e1;
          }
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
        .f16-sidebar-tree-item:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .f16-sidebar-tree-item.active {
          background: #e0f2fe;
          color: #0369a1;
          font-weight: 700;
        }

        /* Right Table Main Area */
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
        .f16-table-search-input:focus {
          border-color: #0284c7;
          background: #ffffff;
        }

        /* Grid Table Structure */
        .f16-table-container {
          max-height: 460px;
          overflow-y: auto;
        }
        .f16-dashboard-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
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

        /* Level Specific Row Styles */
        .f16-row-zone-lvl {
          background: #f8fafc;
          font-weight: 700;
          color: #0f172a;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }
        .f16-row-region-lvl {
          background: #ffffff;
          font-weight: 600;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
        }
        .f16-row-district-lvl {
          background: #ffffff;
          color: #475569;
          border-bottom: 1px solid #f1f5f9;
        }
        .f16-row-branch-lvl {
          background-color: #f0fdf4;
          border-bottom: 1px solid #dcfce7;
        }
        .f16-row-branch-lvl:hover {
          background-color: #dcfce7;
        }

        /* Badges */
        .f16-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .f16-badge-zone { background: #e0f2fe; color: #0369a1; }
        .f16-badge-region { background: #f3e8ff; color: #7e22ce; }
        .f16-badge-district { background: #fef3c7; color: #b45309; }
        .f16-badge-branch { background: #dcfce7; color: #15803d; }

        /* Action 3-Dots Button */
        .f16-dots-btn {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 12px;
          cursor: pointer;
          color: #475569;
          line-height: 1;
        }
        .f16-dots-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        /* Context Popover Menu */
        .f16-context-popover {
          position: absolute;
          right: 20px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
          z-index: 100;
          min-width: 170px;
          display: none;
          padding: 4px 0;
        }
        .f16-context-item {
          padding: 7px 14px;
          font-size: 11.5px;
          color: #334155;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .f16-context-item:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* Table Footer */
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
        <!-- Dashboard Main Title -->
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
              <button type="button" class="f16-btn-console-white" id="f16-btn-reset-perm" title="Reset all selections">
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

        <!-- Section 2: User Profile Configuration Title -->
        <div class="f16-sec-heading">USER PROFILE CONFIGURATION</div>

        <!-- ROW 2: 4 CARDS GRID -->
        <div class="f16-user-grid">
          <!-- Card 1: User Identity -->
          <div class="f16-card-box">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="f16-avatar">👤</div>
              <div style="flex: 1; min-width: 0;">
                ${isNewDoc ? `
                  <input type="text" class="form-control input-sm" id="rp-user-search-input" placeholder="🔍 Search User..." value="${frm.state.user || ''}" style="font-size:12px; height:28px;" />
                  <div class="rp-dropdown-popover" id="rp-user-search-dropdown" style="left:0; right:0; top:38px;"></div>
                ` : `
                  <div style="font-weight: 700; font-size: 12.5px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${userName}
                  </div>
                  <div style="font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    (${userEmail})
                  </div>
                `}
              </div>
              <span style="color: #94a3b8; font-size: 13px; cursor: pointer;" title="Search User" id="f16-btn-open-user-picker">✏️</span>
            </div>
          </div>

          <!-- Card 2: Permissions Tag -->
          <div class="f16-card-box">
            <div class="f16-card-box-label">Permissions Tag:</div>
            <select class="form-control input-sm" id="rp-tag-select" style="background:#fff; font-size:11.5px; height:26px; border-color:#cbd5e1;">
              <option value="">No Tag</option>
              ${tagsList.map(t => `<option value="${t}" ${frm.state.tag === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>

          <!-- Card 3: Account Status -->
          <div class="f16-card-box" style="flex-direction: row; align-items: center; justify-content: space-between;">
            <div>
              <div class="f16-card-box-label">Account Status:</div>
              <div style="font-size: 12.5px; font-weight: 800; color: ${frm.state.enabled ? '#16a34a' : '#64748b'}; letter-spacing: 0.03em;">
                ${frm.state.enabled ? 'ACTIVE' : 'DISABLED'}
              </div>
              <div style="font-size: 9px; color: #94a3b8;">Auto-save enabled</div>
            </div>
            <div class="f16-pill-toggle ${frm.state.enabled ? 'active' : ''}" id="f16-toggle-user-status">
              <div class="f16-pill-toggle-thumb"></div>
            </div>
          </div>

          <!-- Card 4: User Role Summary -->
          <div class="f16-card-box" style="flex-direction: row; align-items: center; justify-content: space-between;">
            <div>
              <div class="f16-card-box-label">User Role:</div>
              <div style="font-weight: 700; font-size: 12px; color: #0f172a;">
                ${frm.state.tag || 'Standard User'}
              </div>
            </div>
            <button type="button" class="f16-btn-console-white" id="f16-btn-role-change" style="padding: 2px 8px; font-size: 10.5px;">
              Change Role
            </button>
          </div>
        </div>

        <!-- Section 3: Geographical Permission & Coverage Title -->
        <div class="f16-sec-heading">GEOGRAPHICAL PERMISSION & COVERAGE</div>

        <!-- ROW 3: SPLIT PANEL (COVERAGE SUMMARY + MASTER TABLE) -->
        <div id="f16-main-split-slot"></div>
      </div>
    `;

    frm.fields_dict.widget_html.$wrapper.html(html);
    frm.trigger("attach_dashboard_events");
  },

  attach_dashboard_events: function (frm) {
    let $w = frm.fields_dict.widget_html.$wrapper;

    // Scope Mode Switcher Toggle
    $w.find("#f16-switch-scope-mode, #f16-btn-toggle-scope-text").on("click", function () {
      let isGeo = frm.state.access_type === "Geographical (Zone / Region / District)";
      frm.state.access_type = isGeo ? "Specific Branches (SOL ID)" : "Geographical (Zone / Region / District)";

      if (frm.state.access_type === "Geographical (Zone / Region / District)") {
        frm.state.sol_ids.clear();
      } else {
        frm.state.zones.clear();
        frm.state.regions.clear();
        frm.state.districts.clear();
      }

      frm.trigger("render_full_dashboard");
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
    });

    // User Live Search
    let $userInput = $w.find("#rp-user-search-input");
    let $userDropdown = $w.find("#rp-user-search-dropdown");

    $userInput.on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      if (!q) {
        $userDropdown.hide().empty();
        return;
      }

      frappe.call({
        method: "sahayog.scrm.doctype.report_preference.report_preference.search_user",
        args: { search_text: q, current_docname: frm.doc.name || "" },
        callback: function (r) {
          let users = r.message || [];
          if (!users.length) {
            $userDropdown.html('<div style="padding:8px 12px; color:#94a3b8; font-size:12px;">No user found</div>').show();
            return;
          }

          let itemsHtml = users.map(u => `
            <div class="rp-dropdown-row rp-user-pick-item" data-user="${u.name}" data-fullname="${u.full_name || ''}" data-already="${u.is_already_added ? '1' : '0'}" data-pref="${u.pref_docname || ''}">
              <div>
                <b>${u.name}</b> <span class="text-muted">(${u.full_name || ''})</span>
              </div>
              ${u.is_already_added ? '<span class="badge" style="background:#ffedd5; color:#9a3412; font-size:10px;">Already Added</span>' : ''}
            </div>
          `).join("");

          $userDropdown.html(itemsHtml).show();
        }
      });
    });

    $userDropdown.on("click", ".rp-user-pick-item", function () {
      let isAlready = $(this).data("already");
      let u = $(this).data("user");
      let prefDoc = $(this).data("pref");

      if (isAlready == 1 || isAlready == "1") {
        frappe.msgprint({
          title: __("User Already Added"),
          indicator: "orange",
          message: __(
            `Report Preference is already configured for user <b>${u}</b>.<br><br><a class="btn btn-xs btn-primary" href="/app/report-preference/${prefDoc}">Open Existing Record</a>`
          )
        });
        return;
      }

      let fn = $(this).data("fullname");
      frm.state.user = u;
      frm.state.full_name = fn;
      frm.doc.user = u;
      frm.doc.full_name = fn;
      $userDropdown.hide().empty();
      frm.trigger("load_user_preference_into_widget");
    });

    $w.find("#f16-btn-open-user-picker").on("click", function () {
      let d = new frappe.ui.Dialog({
        title: __("Select User"),
        fields: [{ fieldname: "user", fieldtype: "Link", options: "User", label: "User", reqd: 1 }],
        primary_action_label: __("Load User"),
        primary_action: function (values) {
          d.hide();
          frm.state.user = values.user;
          frm.doc.user = values.user;
          frm.trigger("load_user_preference_into_widget");
        }
      });
      d.show();
    });

    // Tag Select
    $w.find("#rp-tag-select").on("change", function () {
      frm.state.tag = $(this).val();
      frm.trigger("auto_save_preference");
    });

    // Status Toggle
    $w.find("#f16-toggle-user-status").on("click", function () {
      frm.state.enabled = !frm.state.enabled;
      frm.trigger("render_full_dashboard");
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
    });

    // Change Role
    $w.find("#f16-btn-role-change").on("click", function () {
      $w.find("#rp-tag-select").focus();
    });

    // Action Console Save
    $w.find("#f16-btn-save-all").on("click", function () {
      if (!frm.state.user) {
        frappe.msgprint(__("Please select a User first."));
        return;
      }
      frm.trigger("auto_save_preference", true);
    });

    $w.find("#f16-btn-discard-perm").on("click", function () {
      frm.reload_doc();
    });

    $w.find("#f16-btn-bulk-perm").on("click", function () {
      frappe.show_alert({ message: __("Click capsules or checkboxes to apply bulk updates."), indicator: "blue" });
    });

    $w.find("#f16-btn-reset-perm").on("click", function () {
      if (!frm.state.user) {
        frm.state.zones.clear();
        frm.state.regions.clear();
        frm.state.districts.clear();
        frm.state.sol_ids.clear();
        frm.trigger("render_split_panel");
        frm.trigger("calculate_and_render_branches");
        frappe.show_alert({ message: __("Permissions cleared."), indicator: "blue" });
        return;
      }

      frappe.confirm(
        __(`Reset and clear all branch permissions for <b>${frm.state.user}</b>?`),
        () => {
          frm.state.zones.clear();
          frm.state.regions.clear();
          frm.state.districts.clear();
          frm.state.sol_ids.clear();
          frm.trigger("auto_save_preference");
          frm.trigger("render_split_panel");
          frm.trigger("calculate_and_render_branches");
        }
      );
    });
  },

  calculate_and_render_branches: function (frm) {
    let isGeo = frm.state.access_type === "Geographical (Zone / Region / District)";
    let zones = Array.from(frm.state.zones);
    let regions = Array.from(frm.state.regions);
    let districts = Array.from(frm.state.districts);
    let sol_ids = Array.from(frm.state.sol_ids);

    if (isGeo && !zones.length) {
      frm.resolved_branches = [];
      frm.trigger("render_split_panel");
      return;
    }

    if (!isGeo && !sol_ids.length) {
      frm.resolved_branches = [];
      frm.trigger("render_split_panel");
      return;
    }

    frappe.call({
      method: "sahayog.scrm.doctype.report_preference.report_preference.get_preview_branches",
      args: {
        zones: zones,
        regions: regions,
        districts: districts,
        sol_ids: sol_ids,
        access_type: frm.state.access_type
      },
      callback: function (r) {
        frm.resolved_branches = r.message || [];
        frm.trigger("render_split_panel");
      }
    });
  },

  render_split_panel: function (frm) {
    let $slot = frm.fields_dict.widget_html.$wrapper.find("#f16-main-split-slot");
    if (!$slot.length) return;

    let meta = frm.meta_data || {};
    let masterZones = meta.master_zones || [];
    let allBranches = meta.all_branches || [];
    let branches = frm.resolved_branches || [];
    let totalAllowedCount = branches.length;
    let totalMasterCount = allBranches.length || 1;
    let isGeo = frm.state.access_type === "Geographical (Zone / Region / District)";
    let hasZoneSelected = frm.state.zones.size > 0;

    // Filter available regions
    let availableRegions = [];
    if (isGeo && hasZoneSelected) {
      availableRegions = Array.from(
        new Set(
          allBranches
            .filter(b => frm.state.zones.has(b.zone))
            .map(b => b.region)
            .filter(Boolean)
        )
      ).sort();

      let currentSelectedRegions = Array.from(frm.state.regions);
      currentSelectedRegions.forEach(r => {
        if (!availableRegions.includes(r)) {
          frm.state.regions.delete(r);
        }
      });
    } else if (isGeo) {
      frm.state.regions.clear();
    }

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

    let panelHtml = `
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
              let isZoneActive = frm.state.zones.has(z);

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
                  let isRegionActive = !frm.state.regions.size || frm.state.regions.has(r);

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
            <!-- Filter Dropdown / Capsules -->
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 240px;">
              ${isGeo ? `
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span style="font-size: 11px; font-weight: 700; color: #475569;">ZONES:</span>
                  ${masterZones.map(z => `
                    <div class="rp-perm-capsule rp-zone-capsule ${frm.state.zones.has(z) ? 'active' : ''}" data-zone="${z}" style="padding: 3px 10px; font-size: 11px;">
                      <span class="rp-capsule-dot"></span>
                      <span>${z}</span>
                    </div>
                  `).join('')}
                  <button type="button" class="rp-capsule-action-btn" id="f16-btn-select-all-zones" style="color: #0284c7; font-weight: 600;">Select All</button>
                  <span style="color: #cbd5e1;">•</span>
                  <button type="button" class="rp-capsule-action-btn" id="f16-btn-clear-all-zones">Clear</button>
                </div>
              ` : `
                <div style="display: flex; align-items: center; gap: 6px; width: 100%; max-width: 420px; position: relative;">
                  <input type="text" class="form-control input-sm" id="rp-table-sol-search-input" placeholder="Type or paste SOL ID (e.g. 1001, 1002)..." style="height: 28px; font-size: 11.5px;" />
                  <button type="button" class="btn btn-xs btn-primary" id="rp-btn-add-sol-tokens" style="padding: 3px 10px; font-size: 11px;">+ Add</button>
                  <div class="rp-dropdown-popover" id="rp-table-sol-dropdown" style="top: 32px;"></div>
                </div>
              `}
            </div>

            <!-- Controls: Expand, Collapse, Search -->
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
                👈 Please select a <b>Zone</b> from above or sidebar to view & grant branch access.
              </div>
            ` : (!isGeo && !frm.state.sol_ids.size ? `
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
                    <th style="width: 40px; text-align: center;">•••</th>
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
                        <td style="text-align: center; position: relative;">
                          <button type="button" class="f16-dots-btn f16-trigger-dots" data-key="${zKey}">•••</button>
                        </td>
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
                            <td style="text-align: center; position: relative;">
                              <button type="button" class="f16-dots-btn f16-trigger-dots" data-key="${rKey}">•••</button>
                            </td>
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
                                <td style="text-align: center; position: relative;">
                                  <button type="button" class="f16-dots-btn f16-trigger-dots" data-key="${dKey}">•••</button>
                                </td>
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
                                  <td style="text-align: center; position: relative;">
                                    <button type="button" class="f16-dots-btn f16-trigger-dots" data-key="${b.sol_id}">•••</button>
                                  </td>
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

          <!-- Table Footer -->
          <div class="f16-footer-row">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>Items per page</span>
              <select class="form-control input-sm" id="f16-page-size" style="width: auto; height: 26px; padding: 2px 6px; font-size: 11px;">
                <option value="50" selected>50</option>
                <option value="100">100</option>
                <option value="500">All</option>
              </select>
            </div>
            <div>
              <b>Total records:</b> ${totalAllowedCount} Allowed / ${totalMasterCount} Master Branches
            </div>
          </div>
        </div>
      </div>

      <!-- Popover Menu -->
      <div class="f16-context-popover" id="f16-context-popover">
        <div class="f16-context-item" id="f16-act-primary">⭐ Set as primary branch</div>
        <div class="f16-context-item" id="f16-act-toggle-units">☑ Select / Deselect child units</div>
        <div class="f16-context-item" id="f16-act-revoke" style="color: #dc2626;">🗑️ Revoke level access</div>
      </div>
    `;

    $slot.html(panelHtml);

    // Sidebar items click
    $slot.find(".f16-tree-item-zone").on("click", function () {
      let z = $(this).data("zone");
      if (frm.state.zones.has(z)) {
        frm.state.zones.delete(z);
      } else {
        frm.state.zones.add(z);
      }
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
    });

    $slot.find(".f16-tree-item-region").on("click", function (e) {
      e.stopPropagation();
      let r = $(this).data("region");
      if (frm.state.regions.has(r)) {
        frm.state.regions.delete(r);
      } else {
        frm.state.regions.add(r);
      }
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
    });

    // Top Bar Zone Capsules
    $slot.find(".rp-zone-capsule").on("click", function () {
      let z = $(this).data("zone");
      if (frm.state.zones.has(z)) {
        frm.state.zones.delete(z);
      } else {
        frm.state.zones.add(z);
      }
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
    });

    $slot.find("#f16-btn-select-all-zones").on("click", function () {
      masterZones.forEach(z => frm.state.zones.add(z));
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
    });

    $slot.find("#f16-btn-clear-all-zones").on("click", function () {
      frm.state.zones.clear();
      frm.state.regions.clear();
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
    });

    // SOL Mode Search & Add Input
    let $solInput = $slot.find("#rp-table-sol-search-input");
    let $solDropdown = $slot.find("#rp-table-sol-dropdown");

    function processSolTokens(val) {
      if (!val) return;
      let tokens = val.split(/[,;\s\n\r]+/).map(x => x.trim()).filter(Boolean);
      if (!tokens.length) return;

      tokens.forEach(tok => {
        if (tok) frm.state.sol_ids.add(String(tok));
      });

      $solInput.val("");
      $solDropdown.hide().empty();
      frm.trigger("render_split_panel");
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
    }

    $solInput.on("keydown", function (e) {
      if (e.which === 13) {
        e.preventDefault();
        processSolTokens($(this).val());
      }
    });

    $slot.find("#rp-btn-add-sol-tokens").on("click", function () {
      processSolTokens($solInput.val());
    });

    $solInput.on("paste", function (e) {
      let pastedData = (e.originalEvent || e).clipboardData.getData("text");
      if (pastedData && (pastedData.includes(",") || pastedData.includes("\n") || pastedData.includes(";"))) {
        e.preventDefault();
        processSolTokens(pastedData);
      }
    });

    $solInput.on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      if (!q || q.includes(",")) {
        $solDropdown.hide().empty();
        return;
      }

      let matches = allBranches.filter(b => 
        String(b.sol_id).toLowerCase().includes(q) || (b.branch && b.branch.toLowerCase().includes(q))
      ).slice(0, 15);

      if (!matches.length) {
        $solDropdown.html('<div style="padding:8px 12px; color:#94a3b8; font-size:12px;">No branches found</div>').show();
        return;
      }

      let itemsHtml = matches.map(b => `
        <div class="rp-dropdown-row rp-table-sol-item" data-sol="${b.sol_id}">
          <div><b>${b.sol_id}</b> - ${b.branch || ""}</div>
          <span class="text-muted" style="font-size:10.5px;">${b.zone || ""}, ${b.region || ""}</span>
        </div>
      `).join("");

      $solDropdown.html(itemsHtml).show();
    });

    $solDropdown.on("click", ".rp-table-sol-item", function () {
      let sol = String($(this).data("sol"));
      frm.state.sol_ids.add(sol);
      $solInput.val("");
      $solDropdown.hide().empty();
      frm.trigger("render_split_panel");
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
    });

    // Progressive Drilldown Table Handlers
    $slot.find(".f16-row-zone-lvl").on("click", function (e) {
      if ($(e.target).is("input, button")) return;
      let zKey = $(this).data("zone-key");
      let $icon = $(this).find(`#icon-${zKey}`);
      let isExpanding = $icon.text().trim() === "▸";

      if (isExpanding) {
        $icon.text("▼");
        $slot.find(`.f16-row-region-lvl[data-zone-parent="${zKey}"]`).show();
      } else {
        $icon.text("▸");
        $slot.find(`.rp-under-zone-${zKey}`).hide();
        $slot.find(`.f16-row-region-lvl[data-zone-parent="${zKey}"] .rp-tree-toggle-icon`).text("▸");
        $slot.find(`.f16-row-district-lvl[data-zone-parent="${zKey}"] .rp-tree-toggle-icon`).text("▸");
      }
    });

    $slot.find(".f16-row-region-lvl").on("click", function (e) {
      if ($(e.target).is("input, button")) return;
      e.stopPropagation();
      let rKey = $(this).data("reg-key");
      let $icon = $(this).find(`#icon-${rKey}`);
      let isExpanding = $icon.text().trim() === "▸";

      if (isExpanding) {
        $icon.text("▼");
        $slot.find(`.f16-row-district-lvl[data-reg-parent="${rKey}"]`).show();
      } else {
        $icon.text("▸");
        $slot.find(`.rp-under-reg-${rKey}`).hide();
        $slot.find(`.f16-row-district-lvl[data-reg-parent="${rKey}"] .rp-tree-toggle-icon`).text("▸");
      }
    });

    $slot.find(".f16-row-district-lvl").on("click", function (e) {
      if ($(e.target).is("input, button")) return;
      e.stopPropagation();
      let dKey = $(this).data("dist-key");
      let $icon = $(this).find(`#icon-${dKey}`);
      let isExpanding = $icon.text().trim() === "▸";

      if (isExpanding) {
        $icon.text("▼");
        $slot.find(`.f16-row-branch-lvl[data-dist-parent="${dKey}"]`).show();
      } else {
        $icon.text("▸");
        $slot.find(`.f16-row-branch-lvl[data-dist-parent="${dKey}"]`).hide();
      }
    });

    // Expand / Collapse All
    $slot.find("#f16-btn-expand-all").on("click", function () {
      $slot.find(".f16-row-region-lvl, .f16-row-district-lvl, .f16-row-branch-lvl").show();
      $slot.find(".rp-tree-toggle-icon").each(function () {
        if ($(this).text().trim() === "▸") $(this).text("▼");
      });
    });

    $slot.find("#f16-btn-collapse-all").on("click", function () {
      $slot.find(".f16-row-region-lvl, .f16-row-district-lvl, .f16-row-branch-lvl").hide();
      $slot.find(".rp-tree-toggle-icon").each(function () {
        if ($(this).text().trim() === "▼") $(this).text("▸");
      });
    });

    // 3-Dots Context Menu
    let $menu = $slot.find("#f16-context-popover");
    let currentKey = null;

    $slot.find(".f16-trigger-dots").on("click", function (e) {
      e.stopPropagation();
      currentKey = $(this).data("key");
      let offset = $(this).offset();
      $menu.css({
        top: offset.top + 24,
        left: offset.left - 130
      }).toggle();
    });

    $(document).on("click", function () {
      $menu.hide();
    });

    $slot.find("#f16-act-revoke").on("click", function () {
      if (currentKey && currentKey.startsWith("zone-")) {
        let zName = currentKey.replace("zone-", "").replace(/_/g, " ");
        frm.state.zones.delete(zName);
      } else if (currentKey) {
        frm.state.sol_ids.delete(String(currentKey));
      }
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
      $menu.hide();
    });

    // Search Filter in Table
    $slot.find("#f16-table-search-box").on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      if (!q) {
        $slot.find(".f16-row-zone-lvl").show();
        $slot.find(".f16-row-region-lvl, .f16-row-district-lvl, .f16-row-branch-lvl").hide();
        $slot.find(".rp-tree-toggle-icon").each(function () {
          if ($(this).text().trim() === "▼") $(this).text("▸");
        });
        return;
      }

      $slot.find(".f16-row-zone-lvl, .f16-row-region-lvl, .f16-row-district-lvl, .f16-row-branch-lvl").hide();

      $slot.find(".f16-row-branch-lvl").each(function () {
        let sText = ($(this).data("search") || "").toLowerCase();
        if (sText.includes(q)) {
          $(this).show();
          let pZone = $(this).data("zone-parent");
          let pReg = $(this).data("reg-parent");
          let pDist = $(this).data("dist-parent");

          $slot.find(`.f16-row-zone-lvl[data-zone-key="${pZone}"]`).show();
          $slot.find(`.f16-row-region-lvl[data-reg-key="${pReg}"]`).show();
          $slot.find(`.f16-row-district-lvl[data-dist-key="${pDist}"]`).show();

          $slot.find(`#icon-${pZone}`).text("▼");
          $slot.find(`#icon-${pReg}`).text("▼");
          $slot.find(`#icon-${pDist}`).text("▼");
        }
      });
    });
  }
});
