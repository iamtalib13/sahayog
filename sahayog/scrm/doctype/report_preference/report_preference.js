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
      selected_sidebar_zone: null,
      selected_sidebar_region: null,
      items_per_page: 50,
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
        frm.trigger("render_full_crud_widget");
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
        frm.trigger("render_full_crud_widget");
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
          let $saveBtn = frm.fields_dict.widget_html.$wrapper.find("#rp-btn-save-all");
          if ($saveBtn.length) {
            $saveBtn.html("<span>✓</span> <span>SAVED</span>").css("background", "#059669");
            setTimeout(() => {
              $saveBtn.html("<span>SAVE ALL CHANGES</span>").css("background", "#0f2942");
            }, 1200);
          }
          if (show_toast) {
            frappe.show_alert({ message: __("Preferences auto-saved ✓"), indicator: "green" });
          }
        }
      }
    });
  },

  before_save: function (frm) {
    frm.trigger("sync_widget_state_to_doc");
  },

  render_full_crud_widget: function (frm) {
    if (!frm.fields_dict.widget_html) return;

    let meta = frm.meta_data || {};
    let tagsList = meta.tags || ["COM", "ROM", "RM", "AZM", "ZM"];
    let isGeo = frm.state.access_type === "Geographical (Zone / Region / District)";
    let isNewDoc = frm.is_new() || !frm.state.user;
    let userName = frm.state.full_name || (frm.state.user ? frm.state.user.split('@')[0] : "Select User");
    let userEmail = frm.state.user || "No user selected";

    let html = `
      <style>
        .f16-dashboard {
          --f16-bg: #f8fafc;
          --f16-surface: #ffffff;
          --f16-surface-subtle: #f1f5f9;
          --f16-border: #e2e8f0;
          --f16-border-strong: #cbd5e1;
          --f16-text-main: #0f172a;
          --f16-text-muted: #64748b;
          --f16-primary: #0f2942;
          --f16-primary-hover: #1e3a5f;
          --f16-accent-blue: #0284c7;
          --f16-accent-blue-bg: #e0f2fe;
          --f16-success: #16a34a;
          --f16-success-bg: #dcfce7;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
          color: var(--f16-text-main);
          margin-top: 4px;
        }

        /* Top Section Title */
        .f16-section-title {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #0f172a;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Row 1: Top Dual Cards */
        .f16-top-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 22px;
        }
        @media (max-width: 900px) {
          .f16-top-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Scope Banner Card (Left) */
        .f16-scope-card {
          background: linear-gradient(135deg, #cbeafe 0%, #e0f2fe 100%);
          border: 1px solid #93c5fd;
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(186, 230, 253, 0.35);
        }
        .f16-scope-icon-wrap {
          width: 52px;
          height: 52px;
          background: #ffffff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          color: #0284c7;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }
        .f16-scope-title {
          font-size: 13.5px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #0369a1;
          margin-bottom: 6px;
        }
        .f16-scope-toggle-wrap {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: #ffffff;
          padding: 4px 12px;
          border-radius: 9999px;
          border: 1px solid #bfdbfe;
          font-size: 11.5px;
          font-weight: 700;
        }

        /* Action Console Card (Right) */
        .f16-action-console {
          background: #f1f5f9;
          border: 1px solid var(--f16-border-strong);
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .f16-console-header {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }
        .f16-console-btn-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .f16-btn-outline {
          background: #ffffff;
          border: 1px solid var(--f16-border-strong);
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 11.5px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .f16-btn-outline:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .f16-btn-save-primary {
          background: #0f2942;
          color: #ffffff;
          border: 1px solid #0f2942;
          border-radius: 8px;
          padding: 7px 18px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 6px rgba(15, 41, 66, 0.25);
        }
        .f16-btn-save-primary:hover {
          background: #1e3a5f;
        }

        /* Row 2: User Profile Configuration (4 Cards Grid) */
        .f16-user-profile-grid {
          display: grid;
          grid-template-columns: 1.4fr 1.3fr 1.3fr 1.1fr;
          gap: 14px;
          margin-bottom: 22px;
        }
        @media (max-width: 990px) {
          .f16-user-profile-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 600px) {
          .f16-user-profile-grid {
            grid-template-columns: 1fr;
          }
        }

        .f16-subcard {
          background: #ffffff;
          border: 1px solid var(--f16-border-strong);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 72px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          position: relative;
        }
        .f16-subcard-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--f16-text-muted);
          margin-bottom: 4px;
        }

        /* User Card with Avatar */
        .f16-user-card-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .f16-user-avatar {
          width: 38px;
          height: 38px;
          background: #e2e8f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #475569;
          flex-shrink: 0;
        }

        /* Status Pill */
        .f16-status-active {
          color: #15803d;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.04em;
        }
        .f16-status-disabled {
          color: #64748b;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.04em;
        }

        /* Switch Toggle */
        .f16-switch {
          position: relative;
          display: inline-block;
          width: 38px;
          height: 22px;
          cursor: pointer;
        }
        .f16-switch-track {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #cbd5e1;
          border-radius: 9999px;
          transition: background 0.2s ease;
        }
        .f16-switch-track.active {
          background: #22c55e;
        }
        .f16-switch-thumb {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 16px;
          height: 16px;
          background: #ffffff;
          border-radius: 50%;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .f16-switch-track.active .f16-switch-thumb {
          transform: translateX(16px);
        }

        /* Row 3: Split View (Coverage Summary Sidebar + Master Table) */
        .f16-main-panel {
          background: #ffffff;
          border: 1px solid var(--f16-border-strong);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
          display: flex;
        }
        @media (max-width: 900px) {
          .f16-main-panel {
            flex-direction: column;
          }
        }

        /* Left Sidebar: Coverage Summary */
        .f16-sidebar {
          width: 250px;
          background: #f8fafc;
          border-right: 1px solid var(--f16-border-strong);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 900px) {
          .f16-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--f16-border-strong);
          }
        }
        .f16-sidebar-header-row {
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
        .f16-sidebar-list {
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 480px;
          overflow-y: auto;
        }
        .f16-sidebar-item {
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11.5px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: background 0.15s ease;
          color: #334155;
        }
        .f16-sidebar-item:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .f16-sidebar-item.active {
          background: #e0f2fe;
          color: #0369a1;
          font-weight: 700;
        }

        /* Right Area: Table Container */
        .f16-table-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .f16-table-toolbar {
          padding: 10px 16px;
          background: #ffffff;
          border-bottom: 1px solid var(--f16-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .f16-search-input {
          max-width: 240px;
          padding: 6px 12px;
          font-size: 12px;
          border: 1px solid var(--f16-border-strong);
          border-radius: 8px;
          outline: none;
          background: #f8fafc;
        }
        .f16-search-input:focus {
          border-color: #0284c7;
          background: #ffffff;
        }

        /* Table Design */
        .f16-table-wrap {
          max-height: 440px;
          overflow-y: auto;
        }
        .f16-grid-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .f16-grid-table th {
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
        .f16-grid-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          vertical-align: middle;
        }

        /* Tree Level Rows */
        .f16-row-zone {
          background: #f8fafc;
          font-weight: 700;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }
        .f16-row-region {
          background: #ffffff;
          font-weight: 600;
          border-bottom: 1px solid #f1f5f9;
        }
        .f16-row-district {
          background: #ffffff;
          color: #475569;
          border-bottom: 1px solid #f1f5f9;
        }
        .f16-row-branch {
          background: #f0fdf4;
          border-bottom: 1px solid #dcfce7;
        }
        .f16-row-branch:hover {
          background: #dcfce7;
        }

        /* Badges */
        .f16-level-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
          text-transform: capitalize;
        }
        .f16-level-zone { background: #e0f2fe; color: #0369a1; }
        .f16-level-region { background: #f3e8ff; color: #7e22ce; }
        .f16-level-district { background: #fef3c7; color: #b45309; }
        .f16-level-branch { background: #dcfce7; color: #15803d; }

        /* Action Menu Button (•••) */
        .f16-action-dots-btn {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 12px;
          cursor: pointer;
          color: #475569;
          line-height: 1;
        }
        .f16-action-dots-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        /* Dropdown Popover Menu */
        .f16-menu-popover {
          position: absolute;
          right: 20px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
          z-index: 50;
          min-width: 170px;
          display: none;
          padding: 4px 0;
        }
        .f16-menu-item {
          padding: 7px 14px;
          font-size: 11.5px;
          color: #334155;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .f16-menu-item:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* Table Footer */
        .f16-table-footer {
          padding: 10px 16px;
          background: #f8fafc;
          border-top: 1px solid var(--f16-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11.5px;
          color: var(--f16-text-muted);
        }
      </style>

      <div class="f16-dashboard">
        <!-- Section Title: USER MANAGEMENT DASHBOARD -->
        <div class="f16-section-title">
          <span>USER MANAGEMENT DASHBOARD</span>
        </div>

        <!-- ROW 1: TOP DUAL CARDS -->
        <div class="f16-top-grid">
          <!-- Left Card: Admin & Permission Scope -->
          <div class="f16-scope-card">
            <div class="f16-scope-icon-wrap">
              <span>🛡️</span>
            </div>
            <div>
              <div class="f16-scope-title">ADMIN & PERMISSION SCOPE</div>
              <div class="f16-scope-toggle-wrap">
                <div class="f16-switch" id="f16-toggle-scope-mode">
                  <div class="f16-switch-track ${isGeo ? 'active' : ''}">
                    <div class="f16-switch-thumb"></div>
                  </div>
                </div>
                <span style="color: ${isGeo ? '#0369a1' : '#64748b'}; font-weight: 700;">
                  ${isGeo ? 'GEOGRAPHICAL SCOPE' : 'Branch-Level View'}
                </span>
                <span style="color: #cbd5e1;">|</span>
                <span style="color: ${!isGeo ? '#0369a1' : '#64748b'}; font-weight: 500; cursor: pointer;" id="f16-btn-switch-branch-view">
                  ${isGeo ? 'Switch to Branch-Level View' : 'Switch to Geographical Scope'}
                </span>
              </div>
            </div>
          </div>

          <!-- Right Card: Action Console -->
          <div class="f16-action-console">
            <div class="f16-console-header">Action Console</div>
            <div class="f16-console-btn-group">
              <button type="button" class="f16-btn-outline" id="f16-btn-reset-permissions">
                <span>✕</span> <span>Reset Permissions</span>
              </button>
              <button type="button" class="f16-btn-outline" id="f16-btn-discard-changes">
                <span>Discard Changes</span>
              </button>
              <button type="button" class="f16-btn-outline" id="f16-btn-bulk-update">
                <span>🔄</span> <span>Bulk Update</span>
              </button>
              <button type="button" class="f16-btn-save-primary" id="rp-btn-save-all">
                <span>SAVE ALL CHANGES</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Section Title: USER PROFILE CONFIGURATION -->
        <div class="f16-section-title">
          <span>USER PROFILE CONFIGURATION</span>
        </div>

        <!-- ROW 2: USER PROFILE CONFIGURATION (4 CARDS) -->
        <div class="f16-user-profile-grid">
          <!-- Card 1: User Search & Identity -->
          <div class="f16-subcard" style="position: relative;">
            <div class="f16-user-card-content">
              <div class="f16-user-avatar">👤</div>
              <div style="flex: 1; min-width: 0;">
                ${isNewDoc ? `
                  <input type="text" class="form-control input-sm" id="rp-user-search-input" placeholder="🔍 Search User..." value="${frm.state.user || ''}" style="font-size:12px; height:28px;" />
                  <div class="rp-dropdown-popover" id="rp-user-search-dropdown" style="left:0; right:0; top:42px;"></div>
                ` : `
                  <div style="font-weight: 700; font-size: 13px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${userName}
                  </div>
                  <div style="font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    (${userEmail})
                  </div>
                `}
              </div>
              <span style="color: #94a3b8; font-size: 13px; cursor: pointer;" title="Edit / Search User" id="f16-btn-user-edit">✏️</span>
            </div>
          </div>

          <!-- Card 2: Permissions Tag -->
          <div class="f16-subcard">
            <div class="f16-subcard-label">Permissions Tag:</div>
            <select class="form-control input-sm" id="rp-tag-select" style="background:#fff; font-size:12px; height:28px; border-color:#cbd5e1;">
              <option value="">No Tag</option>
              ${tagsList.map(t => `<option value="${t}" ${frm.state.tag === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>

          <!-- Card 3: Account Status -->
          <div class="f16-subcard" style="flex-direction: row; align-items: center; justify-content: space-between;">
            <div>
              <div class="f16-subcard-label">Account Status:</div>
              <div class="${frm.state.enabled ? 'f16-status-active' : 'f16-status-disabled'}">
                ${frm.state.enabled ? 'ACTIVE' : 'DISABLED'}
              </div>
              <div style="font-size: 9.5px; color: #94a3b8;">Auto-sync permissions</div>
            </div>
            <div class="f16-switch" id="f16-toggle-status">
              <div class="f16-switch-track ${frm.state.enabled ? 'active' : ''}">
                <div class="f16-switch-thumb"></div>
              </div>
            </div>
          </div>

          <!-- Card 4: User Role / Access Summary -->
          <div class="f16-subcard" style="flex-direction: row; align-items: center; justify-content: space-between;">
            <div>
              <div class="f16-subcard-label">User Role:</div>
              <div style="font-weight: 700; font-size: 12.5px; color: #0f172a;">
                ${frm.state.tag || 'Standard User'}
              </div>
            </div>
            <button type="button" class="f16-btn-outline" id="f16-btn-change-role" style="padding: 3px 8px; font-size: 10.5px;">
              Change Role
            </button>
          </div>
        </div>

        <!-- Section Title: GEOGRAPHICAL PERMISSION & COVERAGE -->
        <div class="f16-section-title">
          <span>GEOGRAPHICAL PERMISSION & COVERAGE</span>
        </div>

        <!-- ROW 3: SPLIT PANEL (COVERAGE SUMMARY + MASTER TABLE) -->
        <div id="rp-main-coverage-panel-slot"></div>
      </div>
    `;

    frm.fields_dict.widget_html.$wrapper.html(html);
    frm.trigger("attach_widget_events");
  },

  attach_widget_events: function (frm) {
    let $w = frm.fields_dict.widget_html.$wrapper;
    let meta = frm.meta_data || {};

    // Mode Switcher Toggle
    $w.find("#f16-toggle-scope-mode, #f16-btn-switch-branch-view").on("click", function () {
      let isGeo = frm.state.access_type === "Geographical (Zone / Region / District)";
      frm.state.access_type = isGeo ? "Specific Branches (SOL ID)" : "Geographical (Zone / Region / District)";
      
      if (frm.state.access_type === "Geographical (Zone / Region / District)") {
        frm.state.sol_ids.clear();
      } else {
        frm.state.zones.clear();
        frm.state.regions.clear();
        frm.state.districts.clear();
      }

      frm.trigger("render_full_crud_widget");
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
        args: {
          search_text: q,
          current_docname: frm.doc.name || ""
        },
        callback: function (r) {
          let users = r.message || [];
          if (!users.length) {
            $userDropdown.html('<div style="padding:8px 12px; color:#94a3b8; font-size:12px;">No user found</div>').show();
            return;
          }

          let itemsHtml = users.map(u => {
            if (u.is_already_added) {
              return `
                <div class="rp-dropdown-row rp-user-pick-item" data-user="${u.name}" data-fullname="${u.full_name || ''}" data-already="1" data-pref="${u.pref_docname || ''}" style="background:#fff7ed; cursor:not-allowed;">
                  <div>
                    <b style="color:#c2410c;">${u.name}</b> <span class="text-muted">(${u.full_name || ''})</span>
                  </div>
                  <span class="badge" style="background:#ffedd5; color:#9a3412; font-size:10px;">Already Added</span>
                </div>
              `;
            }
            return `
              <div class="rp-dropdown-row rp-user-pick-item" data-user="${u.name}" data-fullname="${u.full_name || ''}" data-already="0">
                <b>${u.name}</b> <span class="text-muted">(${u.full_name || ''})</span>
              </div>
            `;
          }).join("");

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

    $w.find("#f16-btn-user-edit").on("click", function () {
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

    // Tag Selector
    $w.find("#rp-tag-select").on("change", function () {
      frm.state.tag = $(this).val();
      frm.trigger("auto_save_preference");
    });

    // Status Toggle
    $w.find("#f16-toggle-status").on("click", function () {
      frm.state.enabled = !frm.state.enabled;
      frm.trigger("render_full_crud_widget");
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
    });

    // Change Role Button
    $w.find("#f16-btn-change-role").on("click", function () {
      $w.find("#rp-tag-select").focus();
    });

    // Action Console Buttons
    $w.find("#rp-btn-save-all").on("click", function () {
      if (!frm.state.user) {
        frappe.msgprint(__("Please select a User first."));
        return;
      }
      frm.trigger("auto_save_preference", true);
    });

    $w.find("#f16-btn-discard-changes").on("click", function () {
      frm.reload_doc();
    });

    $w.find("#f16-btn-bulk-update").on("click", function () {
      frappe.show_alert({ message: __("Select capsules or tick checkboxes to apply bulk updates."), indicator: "blue" });
    });

    $w.find("#f16-btn-reset-permissions").on("click", function () {
      if (!frm.state.user) {
        frm.state.zones.clear();
        frm.state.regions.clear();
        frm.state.districts.clear();
        frm.state.sol_ids.clear();
        frm.trigger("render_main_split_panel");
        frm.trigger("calculate_and_render_branches");
        frappe.show_alert({ message: __("Permissions reset."), indicator: "blue" });
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
          frm.trigger("render_main_split_panel");
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
      frm.trigger("render_main_split_panel");
      return;
    }

    if (!isGeo && !sol_ids.length) {
      frm.resolved_branches = [];
      frm.trigger("render_main_split_panel");
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
        frm.trigger("render_main_split_panel");
      }
    });
  },

  render_main_split_panel: function (frm) {
    let $slot = frm.fields_dict.widget_html.$wrapper.find("#rp-main-coverage-panel-slot");
    if (!$slot.length) return;

    let meta = frm.meta_data || {};
    let masterZones = meta.master_zones || [];
    let allBranches = meta.all_branches || [];
    let branches = frm.resolved_branches || [];
    let totalAllowedCount = branches.length;
    let totalMasterCount = allBranches.length || 1;
    let isGeo = frm.state.access_type === "Geographical (Zone / Region / District)";
    let hasZoneSelected = frm.state.zones.size > 0;

    // Filter regions based on selected zones
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

    // Build Nested Hierarchy Structure for Sidebar Summary and Table
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
      <div class="f16-main-panel">
        <!-- LEFT SIDEBAR: COVERAGE SUMMARY -->
        <div class="f16-sidebar">
          <div class="f16-sidebar-header-row">
            <span>Coverage Summary</span>
            <span>% Branches</span>
          </div>

          <div class="f16-sidebar-list">
            ${Object.keys(masterTree).map(z => {
              let zTotal = Object.values(masterTree[z]).reduce((acc, reg) => 
                acc + Object.values(reg).reduce((a, dist) => a + dist.length, 0), 0);
              let zAllowed = activeTree[z] ? Object.values(activeTree[z]).reduce((acc, reg) => 
                acc + Object.values(reg).reduce((a, dist) => a + dist.length, 0), 0) : 0;
              let zPct = ((zAllowed / totalMasterCount) * 100).toFixed(1);
              let isZoneActive = frm.state.zones.has(z);

              return `
                <div class="f16-sidebar-item ${isZoneActive ? 'active' : ''} f16-sidebar-zone-item" data-zone="${z}">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 10px;">${isZoneActive ? '🟦' : '◻️'}</span>
                    <b>${z}</b>
                  </div>
                  <span style="font-weight: 700; font-size: 11px; color: ${isZoneActive ? '#0369a1' : '#64748b'};">
                    ${zPct}% (${zAllowed})
                  </span>
                </div>

                ${isZoneActive ? Object.keys(masterTree[z]).map(r => {
                  let rTotal = Object.values(masterTree[z][r]).reduce((a, dist) => a + dist.length, 0);
                  let rAllowed = (activeTree[z] && activeTree[z][r]) ? Object.values(activeTree[z][r]).reduce((a, dist) => a + dist.length, 0) : 0;
                  let isRegionActive = !frm.state.regions.size || frm.state.regions.has(r);

                  return `
                    <div class="f16-sidebar-item ${isRegionActive ? 'active' : ''} f16-sidebar-region-item" data-zone="${z}" data-region="${r}" style="padding-left: 20px; font-size: 11px;">
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

        <!-- RIGHT MAIN TABLE AREA -->
        <div class="f16-table-area">
          <!-- Top Table Toolbar -->
          <div class="f16-table-toolbar">
            <!-- Global Permission Filter Selector -->
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

            <!-- Search Filter -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" class="f16-btn-outline" id="f16-btn-expand-all" style="padding: 3px 8px; font-size: 10.5px;">▾ Expand All</button>
              <button type="button" class="f16-btn-outline" id="f16-btn-collapse-all" style="padding: 3px 8px; font-size: 10.5px;">▸ Collapse All</button>
              <input type="text" class="f16-search-input" id="f16-table-search-input" placeholder="🔍 Search branch, SOL..." />
            </div>
          </div>

          <!-- Master Drilldown Table -->
          <div class="f16-table-wrap">
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
              <table class="f16-grid-table" id="f16-main-grid-table">
                <thead>
                  <tr>
                    <th style="width: 32px; text-align: center;">
                      <input type="checkbox" id="f16-chk-select-all" checked style="cursor: pointer;" />
                    </th>
                    <th style="width: 110px;">LEVEL</th>
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
                      <tr class="f16-row-zone rp-tree-header-row" data-tree-key="${zKey}" data-zone-key="${zKey}" data-search="${z}">
                        <td style="text-align: center;">
                          <input type="checkbox" class="f16-row-checkbox f16-zone-chk" data-zone="${z}" checked />
                        </td>
                        <td>
                          <span class="rp-tree-toggle-icon" id="icon-${zKey}">▸</span>
                          <span class="f16-level-badge f16-level-zone">Zone</span>
                        </td>
                        <td><b>${z}</b></td>
                        <td><span class="text-muted">(${zRegCount} Regions)</span></td>
                        <td><span class="text-muted">—</span></td>
                        <td><span class="text-muted" style="font-weight: 600;">${zBranchesCount} Branches</span></td>
                        <td>—</td>
                        <td style="text-align: center; position: relative;">
                          <button type="button" class="f16-action-dots-btn f16-menu-trigger" data-key="${zKey}">•••</button>
                        </td>
                      </tr>

                      ${Object.keys(activeTree[z]).map(r => {
                        let rBranchesCount = Object.values(activeTree[z][r]).reduce((a, dist) => a + dist.length, 0);
                        let rDistCount = Object.keys(activeTree[z][r]).length;
                        let rKey = `${zKey}-reg-${r.replace(/[^a-zA-Z0-9]/g, '_')}`;

                        return `
                          <!-- Level 2: REGION ROW -->
                          <tr class="f16-row-region rp-tree-header-row rp-under-zone-${zKey}" data-zone-parent="${zKey}" data-tree-key="${rKey}" data-reg-key="${rKey}" data-search="${z} ${r}" style="display: none;">
                            <td style="text-align: center;">
                              <input type="checkbox" class="f16-row-checkbox f16-region-chk" data-zone="${z}" data-region="${r}" checked />
                            </td>
                            <td>
                              <span class="rp-tree-toggle-icon" id="icon-${rKey}">▸</span>
                              <span class="f16-level-badge f16-level-region">Region</span>
                            </td>
                            <td><span class="rp-tag-micro">${z}</span></td>
                            <td><b>${r}</b></td>
                            <td><span class="text-muted">(${rDistCount} Districts)</span></td>
                            <td><span class="text-muted" style="font-weight: 600;">${rBranchesCount} Branches</span></td>
                            <td>—</td>
                            <td style="text-align: center; position: relative;">
                              <button type="button" class="f16-action-dots-btn f16-menu-trigger" data-key="${rKey}">•••</button>
                            </td>
                          </tr>

                          ${Object.keys(activeTree[z][r]).map(d => {
                            let distBranches = activeTree[z][r][d];
                            let dKey = `${rKey}-dist-${d.replace(/[^a-zA-Z0-9]/g, '_')}`;

                            return `
                              <!-- Level 3: DISTRICT ROW -->
                              <tr class="f16-row-district rp-tree-header-row rp-under-zone-${zKey} rp-under-reg-${rKey}" data-zone-parent="${zKey}" data-reg-parent="${rKey}" data-tree-key="${dKey}" data-dist-key="${dKey}" data-search="${z} ${r} ${d}" style="display: none;">
                                <td style="text-align: center;">
                                  <input type="checkbox" class="f16-row-checkbox f16-district-chk" data-district="${d}" checked />
                                </td>
                                <td>
                                  <span class="rp-tree-toggle-icon" id="icon-${dKey}">▸</span>
                                  <span class="f16-level-badge f16-level-district">District</span>
                                </td>
                                <td><span class="rp-tag-micro">${z}</span></td>
                                <td><span class="rp-tag-micro">${r}</span></td>
                                <td><b>${d}</b></td>
                                <td><span class="text-muted" style="font-weight: 600;">${distBranches.length} Branches</span></td>
                                <td>—</td>
                                <td style="text-align: center; position: relative;">
                                  <button type="button" class="f16-action-dots-btn f16-menu-trigger" data-key="${dKey}">•••</button>
                                </td>
                              </tr>

                              <!-- Level 4: BRANCH LEAF ROWS -->
                              ${distBranches.map(b => `
                                <tr class="f16-row-branch rp-under-zone-${zKey} rp-under-reg-${rKey} rp-under-dist-${dKey}" data-zone-parent="${zKey}" data-reg-parent="${rKey}" data-dist-parent="${dKey}" data-search="${String(b.sol_id)} ${b.branch || ''} ${d} ${r} ${z}" style="display: none;">
                                  <td style="text-align: center;">
                                    <input type="checkbox" class="f16-row-checkbox f16-branch-chk" data-sol="${b.sol_id}" checked />
                                  </td>
                                  <td>
                                    <span class="rp-tree-toggle-icon" style="color: #94a3b8; font-size: 8px;">•</span>
                                    <span class="f16-level-badge f16-level-branch">Branch</span>
                                  </td>
                                  <td><span class="rp-tag-micro">${z}</span></td>
                                  <td><span class="rp-tag-micro">${r}</span></td>
                                  <td><span class="rp-tag-micro">${d}</span></td>
                                  <td><b>${b.branch || '-'}</b></td>
                                  <td><span class="rp-sol-pill">${b.sol_id || '-'}</span></td>
                                  <td style="text-align: center; position: relative;">
                                    <button type="button" class="f16-action-dots-btn f16-menu-trigger" data-key="${b.sol_id}">•••</button>
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
          <div class="f16-table-footer">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>Items per page</span>
              <select class="form-control input-sm" id="f16-select-page-size" style="width: auto; height: 26px; padding: 2px 6px; font-size: 11px;">
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

      <!-- Context Popover Menu -->
      <div class="f16-menu-popover" id="f16-context-menu">
        <div class="f16-menu-item" id="f16-menu-set-primary">⭐ Set as primary branch</div>
        <div class="f16-menu-item" id="f16-menu-toggle-units">☑ Select / Deselect units</div>
        <div class="f16-menu-item" id="f16-menu-revoke" style="color: #dc2626;">🗑️ Revoke level access</div>
      </div>
    `;

    $slot.html(panelHtml);

    // Sidebar Zone Item Click
    $slot.find(".f16-sidebar-zone-item").on("click", function () {
      let z = $(this).data("zone");
      if (frm.state.zones.has(z)) {
        frm.state.zones.delete(z);
      } else {
        frm.state.zones.add(z);
      }
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
    });

    // Sidebar Region Item Click
    $slot.find(".f16-sidebar-region-item").on("click", function (e) {
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
      frm.trigger("render_main_split_panel");
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
      frm.trigger("render_main_split_panel");
      frm.trigger("calculate_and_render_branches");
      frm.trigger("auto_save_preference");
    });

    // Tree Collapse / Expand
    $slot.find(".f16-row-zone").on("click", function (e) {
      if ($(e.target).is("input, button")) return;
      let zKey = $(this).data("zone-key");
      let $icon = $(this).find(`#icon-${zKey}`);
      let isExpanding = $icon.text().trim() === "▸";

      if (isExpanding) {
        $icon.text("▼");
        $slot.find(`.f16-row-region[data-zone-parent="${zKey}"]`).show();
      } else {
        $icon.text("▸");
        $slot.find(`.rp-under-zone-${zKey}`).hide();
        $slot.find(`.f16-row-region[data-zone-parent="${zKey}"] .rp-tree-toggle-icon`).text("▸");
        $slot.find(`.f16-row-district[data-zone-parent="${zKey}"] .rp-tree-toggle-icon`).text("▸");
      }
    });

    $slot.find(".f16-row-region").on("click", function (e) {
      if ($(e.target).is("input, button")) return;
      e.stopPropagation();
      let rKey = $(this).data("reg-key");
      let $icon = $(this).find(`#icon-${rKey}`);
      let isExpanding = $icon.text().trim() === "▸";

      if (isExpanding) {
        $icon.text("▼");
        $slot.find(`.f16-row-district[data-reg-parent="${rKey}"]`).show();
      } else {
        $icon.text("▸");
        $slot.find(`.rp-under-reg-${rKey}`).hide();
        $slot.find(`.f16-row-district[data-reg-parent="${rKey}"] .rp-tree-toggle-icon`).text("▸");
      }
    });

    $slot.find(".f16-row-district").on("click", function (e) {
      if ($(e.target).is("input, button")) return;
      e.stopPropagation();
      let dKey = $(this).data("dist-key");
      let $icon = $(this).find(`#icon-${dKey}`);
      let isExpanding = $icon.text().trim() === "▸";

      if (isExpanding) {
        $icon.text("▼");
        $slot.find(`.f16-row-branch[data-dist-parent="${dKey}"]`).show();
      } else {
        $icon.text("▸");
        $slot.find(`.f16-row-branch[data-dist-parent="${dKey}"]`).hide();
      }
    });

    // Expand All / Collapse All
    $slot.find("#f16-btn-expand-all").on("click", function () {
      $slot.find(".f16-row-region, .f16-row-district, .f16-row-branch").show();
      $slot.find(".rp-tree-toggle-icon").each(function () {
        if ($(this).text().trim() === "▸") $(this).text("▼");
      });
    });

    $slot.find("#f16-btn-collapse-all").on("click", function () {
      $slot.find(".f16-row-region, .f16-row-district, .f16-row-branch").hide();
      $slot.find(".rp-tree-toggle-icon").each(function () {
        if ($(this).text().trim() === "▼") $(this).text("▸");
      });
    });

    // Context Popover Menu (•••)
    let $menu = $slot.find("#f16-context-menu");
    let currentKey = null;

    $slot.find(".f16-menu-trigger").on("click", function (e) {
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

    $slot.find("#f16-menu-revoke").on("click", function () {
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

    // Search Box
    $slot.find("#f16-table-search-input").on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      if (!q) {
        $slot.find(".f16-row-zone").show();
        $slot.find(".f16-row-region, .f16-row-district, .f16-row-branch").hide();
        $slot.find(".rp-tree-toggle-icon").each(function () {
          if ($(this).text().trim() === "▼") $(this).text("▸");
        });
        return;
      }

      $slot.find(".f16-row-zone, .f16-row-region, .f16-row-district, .f16-row-branch").hide();

      $slot.find(".f16-row-branch").each(function () {
        let sText = ($(this).data("search") || "").toLowerCase();
        if (sText.includes(q)) {
          $(this).show();
          let pZone = $(this).data("zone-parent");
          let pReg = $(this).data("reg-parent");
          let pDist = $(this).data("dist-parent");

          $slot.find(`.f16-row-zone[data-zone-key="${pZone}"]`).show();
          $slot.find(`.f16-row-region[data-reg-key="${pReg}"]`).show();
          $slot.find(`.f16-row-district[data-dist-key="${pDist}"]`).show();

          $slot.find(`#icon-${pZone}`).text("▼");
          $slot.find(`#icon-${pReg}`).text("▼");
          $slot.find(`#icon-${pDist}`).text("▼");
        }
      });
    });
  }
});
