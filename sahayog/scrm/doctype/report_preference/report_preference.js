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

    frm.dirty();
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

    let html = `
      <style>
        .rp-root {
          --rp-primary: #0f172a;
          --rp-accent: #2563eb;
          --rp-accent-bg: #eff6ff;
          --rp-accent-border: #bfdbfe;
          --rp-surface: #ffffff;
          --rp-surface-subtle: #f8fafc;
          --rp-border: #e2e8f0;
          --rp-border-light: #f1f5f9;
          --rp-text-main: #0f172a;
          --rp-text-muted: #64748b;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: var(--rp-text-main);
          margin-top: 4px;
        }

        .rp-workspace-card {
          background: #ffffff;
          border: none;
          border-radius: 0;
          overflow: visible;
          box-shadow: none;
        }

        /* Top Bar */
        .rp-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0 14px 0;
          background: transparent;
          border-bottom: 1px solid var(--rp-border);
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Mode Switcher Segmented Control */
        .rp-mode-segmented-control {
          display: inline-flex;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .rp-mode-segment {
          padding: 5px 14px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          color: #64748b;
          transition: all 0.15s ease;
          user-select: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .rp-mode-segment:hover {
          color: #0f172a;
        }
        .rp-mode-segment.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .rp-btn-ghost {
          background: transparent;
          border: 1px solid var(--rp-border);
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--rp-text-muted);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .rp-btn-ghost:hover {
          background: var(--rp-surface-subtle);
          color: var(--rp-primary);
          border-color: #cbd5e1;
        }
        .rp-btn-danger-ghost {
          background: transparent;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #dc2626;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .rp-btn-danger-ghost:hover {
          background: #fef2f2;
          border-color: #f87171;
        }
        .rp-btn-primary {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
          border-radius: 6px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .rp-btn-primary:hover {
          background: #1e293b;
        }

        /* Inner Content Grid */
        .rp-content-body {
          padding: 16px 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* Minimal User Sub-Card with Highlighted Contrast */
        .rp-subcard {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 16px 18px;
        }
        .rp-subcard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .rp-subcard-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #475569;
        }

        /* User Bar Layout */
        .rp-user-grid {
          display: grid;
          grid-template-columns: 2fr 1.6fr 1fr 1fr;
          gap: 14px;
          align-items: center;
        }
        @media (max-width: 860px) {
          .rp-user-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 540px) {
          .rp-user-grid {
            grid-template-columns: 1fr;
          }
        }
        .rp-input-label {
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 4px;
          display: block;
        }
        .rp-box-display {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          color: var(--rp-primary);
          min-height: 31px;
          display: flex;
          align-items: center;
        }

        /* Toggle Switch */
        .rp-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }
        .rp-toggle-track {
          width: 36px;
          height: 20px;
          background: #cbd5e1;
          border-radius: 10px;
          position: relative;
          transition: background 0.2s ease;
        }
        .rp-toggle-track.active {
          background: #10b981;
        }
        .rp-toggle-thumb {
          width: 16px;
          height: 16px;
          background: #ffffff;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.15);
        }
        .rp-toggle-track.active .rp-toggle-thumb {
          transform: translateX(16px);
        }

        /* Search Autocomplete */
        .rp-search-wrapper {
          position: relative;
        }
        .rp-dropdown-popover {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          max-height: 220px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          margin-top: 4px;
          display: none;
        }
        .rp-dropdown-row {
          padding: 8px 12px;
          border-bottom: 1px solid var(--rp-border-light);
          cursor: pointer;
          font-size: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rp-dropdown-row:hover {
          background: #f1f5f9;
        }

        /* Table Section Card */
        .rp-table-section-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }
        .rp-table-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #e2e8f0;
          border-bottom: 1px solid #cbd5e1;
          gap: 12px;
          flex-wrap: wrap;
        }
        .rp-table-badge {
          background: #e0f2fe;
          color: #0369a1;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
        }
        .rp-table-search-box {
          max-width: 220px;
          padding: 5px 12px;
          font-size: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
          background: #ffffff;
        }
        .rp-table-search-box:focus {
          border-color: var(--rp-accent);
        }

        /* Permission Controls Bar inside Table */
        .rp-permission-capsules-bar {
          padding: 12px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #cbd5e1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .rp-capsule-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .rp-capsule-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #475569;
          min-width: 65px;
        }
        .rp-perm-capsule {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 11.5px;
          font-weight: 500;
          cursor: pointer;
          background: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
        }
        .rp-perm-capsule:hover {
          border-color: #94a3b8;
          background: #f1f5f9;
        }
        .rp-perm-capsule.active {
          background: #ecfdf5;
          color: #065f46;
          border-color: #6ee7b7;
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(16, 185, 129, 0.12);
        }
        .rp-capsule-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .rp-perm-capsule.active .rp-capsule-dot {
          background: #10b981;
        }
        .rp-capsule-action-btn {
          background: transparent;
          border: none;
          color: var(--rp-text-muted);
          font-size: 11px;
          cursor: pointer;
          text-decoration: underline;
          padding: 0 4px;
        }
        .rp-capsule-action-btn:hover {
          color: var(--rp-primary);
        }

        /* Pure Tabular Grid Table */
        .rp-table-scroll-wrap {
          max-height: 480px;
          overflow-y: auto;
        }
        .rp-pure-grid-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .rp-pure-grid-table th {
          position: sticky;
          top: 0;
          background: #e2e8f0;
          color: #1e293b;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: left;
          padding: 9px 12px;
          border-bottom: 2px solid #cbd5e1;
          z-index: 2;
        }
        .rp-pure-grid-table td {
          padding: 7px 12px;
          border-bottom: 1px solid #e2e8f0;
          color: #334155;
          vertical-align: middle;
        }

        /* Row Levels */
        .rp-row-zone-header {
          background: #e2e8f0;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
          user-select: none;
          border-top: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
        }
        .rp-row-zone-header:hover {
          background: #cbd5e1;
        }
        .rp-row-region-header {
          background: #edf2f7;
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
          user-select: none;
          border-bottom: 1px solid #e2e8f0;
        }
        .rp-row-region-header:hover {
          background: #e2e8f0;
        }
        .rp-row-district-header {
          background: #f8fafc;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          user-select: none;
          border-bottom: 1px solid #e2e8f0;
        }
        .rp-row-district-header:hover {
          background: #edf2f7;
        }
        .rp-row-branch-leaf {
          background-color: #f0fdf4;
          border-bottom: 1px solid #dcfce7;
          transition: background-color 0.15s ease;
        }
        .rp-row-branch-leaf:hover {
          background-color: #dcfce7;
        }

        .rp-tree-toggle-icon {
          display: inline-block;
          width: 14px;
          text-align: center;
          font-size: 9px;
          margin-right: 6px;
          color: #64748b;
          user-select: none;
        }

        .rp-sol-pill {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
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
        .rp-level-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.02em;
        }
        .rp-level-badge-zone { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .rp-level-badge-region { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
        .rp-level-badge-district { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
        .rp-level-badge-branch { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
      </style>

      <div class="rp-root">
        <div class="rp-workspace-card">
          <!-- Top Bar Header -->
          <div class="rp-top-bar">
            <!-- Mode Toggle Segmented Control -->
            <div class="rp-mode-segmented-control">
              <div class="rp-mode-segment ${isGeo ? 'active' : ''}" data-mode="Geographical (Zone / Region / District)">
                <span>🌍 Geographical Scope</span>
              </div>
              <div class="rp-mode-segment ${!isGeo ? 'active' : ''}" data-mode="Specific Branches (SOL ID)">
                <span>🏢 Specific Branches (SOL ID)</span>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" class="rp-btn-danger-ghost" id="rp-btn-reset-all" title="Clear all selections & save empty state">
                <span>🔄</span>
                <span>Reset & Clear All</span>
              </button>
              <button type="button" class="rp-btn-ghost" id="rp-btn-discard">Discard</button>
              <button type="button" class="rp-btn-primary" id="rp-btn-direct-save">
                <span>💾</span>
                <span>Save Preferences</span>
              </button>
            </div>
          </div>

          <div class="rp-content-body">
            <!-- User Configuration & Status Card -->
            <div class="rp-subcard">
              <div class="rp-subcard-header">
                <span class="rp-subcard-label">User & Status Configuration</span>
              </div>

              <div class="rp-user-grid">
                <!-- User Search / Display -->
                <div class="rp-search-wrapper">
                  <span class="rp-input-label">User (Email / ID)</span>
                  ${isNewDoc ? `
                    <input type="text" class="form-control input-sm" id="rp-user-search-input" placeholder="🔍 Search User..." value="${frm.state.user || ''}" />
                    <div class="rp-dropdown-popover" id="rp-user-search-dropdown"></div>
                  ` : `
                    <div class="rp-box-display">${frm.state.user}</div>
                  `}
                </div>

                <!-- Full Name -->
                <div>
                  <span class="rp-input-label">Full Name</span>
                  <div class="rp-box-display">${frm.state.full_name || (frm.state.user ? '—' : 'Select User')}</div>
                </div>

                <!-- Tag Selector -->
                <div>
                  <span class="rp-input-label">Tag</span>
                  <select class="form-control input-sm" id="rp-tag-select" style="background:#fff;">
                    <option value="">No Tag</option>
                    ${tagsList.map(t => `<option value="${t}" ${frm.state.tag === t ? 'selected' : ''}>${t}</option>`).join('')}
                  </select>
                </div>

                <!-- Active Toggle -->
                <div>
                  <span class="rp-input-label">Status</span>
                  <div class="rp-toggle" id="rp-toggle-enabled">
                    <div class="rp-toggle-track ${frm.state.enabled ? 'active' : ''}">
                      <div class="rp-toggle-thumb"></div>
                    </div>
                    <span style="font-size: 11.5px; font-weight: 600; color: ${frm.state.enabled ? '#059669' : '#64748b'};">
                      ${frm.state.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Table Section Card with Progressive Hierarchical Drilldown -->
            <div id="rp-branch-coverage-slot"></div>
          </div>
        </div>
      </div>
    `;

    frm.fields_dict.widget_html.$wrapper.html(html);
    frm.trigger("attach_widget_events");
  },

  attach_widget_events: function (frm) {
    let $w = frm.fields_dict.widget_html.$wrapper;
    let meta = frm.meta_data || {};

    // Mode Switcher Toggle at Top Bar
    $w.find(".rp-mode-segment").on("click", function () {
      let targetMode = $(this).data("mode");
      if (frm.state.access_type === targetMode) return;

      frm.state.access_type = targetMode;
      $w.find(".rp-mode-segment").removeClass("active");
      $(this).addClass("active");

      // Clear opposing filter selections for consistency
      if (targetMode === "Geographical (Zone / Region / District)") {
        frm.state.sol_ids.clear();
      } else {
        frm.state.zones.clear();
        frm.state.regions.clear();
        frm.state.districts.clear();
      }

      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("render_full_crud_widget");
      frm.trigger("calculate_and_render_branches");
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
                <div class="rp-dropdown-row rp-user-pick-item" data-user="${u.name}" data-fullname="${u.full_name || ''}" data-already="1" data-pref="${u.pref_docname || ''}" style="background:#fff7ed; cursor:not-allowed; opacity:0.85;">
                  <div>
                    <b style="color:#c2410c;">${u.name}</b> <span class="text-muted">(${u.full_name || ''})</span>
                  </div>
                  <span class="badge" style="background:#ffedd5; color:#9a3412; font-size:10px; padding:2px 6px; border:1px solid #fed7aa; border-radius:4px;">Already Added</span>
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
            `Report Preference is already configured for user <b>${u}</b>.<br><br>You cannot create a duplicate record.<br><br><a class="btn btn-xs btn-primary" href="/app/report-preference/${prefDoc}">Click Here to Open Existing Record</a>`
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

    $(document).on("click", function (e) {
      if (!$(e.target).closest(".rp-search-wrapper").length) {
        $userDropdown.hide();
      }
    });

    // Tag Selector
    $w.find("#rp-tag-select").on("change", function () {
      frm.state.tag = $(this).val();
      frm.trigger("sync_widget_state_to_doc");
    });

    // Status Toggle
    $w.find("#rp-toggle-enabled").on("click", function () {
      frm.state.enabled = !frm.state.enabled;
      let $track = $(this).find(".rp-toggle-track");
      let $label = $(this).find("span");

      if (frm.state.enabled) {
        $track.addClass("active");
        $label.text("Active").css("color", "#059669");
      } else {
        $track.removeClass("active");
        $label.text("Disabled").css("color", "#64748b");
      }
      frm.trigger("sync_widget_state_to_doc");
    });

    // Save Button
    $w.find("#rp-btn-direct-save").on("click", function () {
      if (!frm.state.user) {
        frappe.msgprint(__("Please select a User first."));
        return;
      }

      let isGeoMode = frm.state.access_type === "Geographical (Zone / Region / District)";
      if (isGeoMode && !frm.state.zones.size) {
        frappe.msgprint(__("Please select at least one Zone before saving."));
        return;
      }

      if (!isGeoMode && !frm.state.sol_ids.size) {
        frappe.msgprint(__("Please add at least one Branch / SOL ID before saving."));
        return;
      }

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
        freeze: true,
        freeze_message: __("Saving Report Preferences..."),
        callback: function (r) {
          if (r.message && r.message.status === "success") {
            frappe.show_alert({ message: __("Preferences saved successfully!"), indicator: "green" });
            frm.reload_doc();
          }
        }
      });
    });

    // Reset & Clear All Button
    $w.find("#rp-btn-reset-all").on("click", function () {
      if (!frm.state.user) {
        frm.state.zones.clear();
        frm.state.regions.clear();
        frm.state.districts.clear();
        frm.state.sol_ids.clear();
        frm.state.tag = "";
        frm.trigger("render_full_crud_widget");
        frm.trigger("calculate_and_render_branches");
        frappe.show_alert({ message: __("Filters cleared. Select Geographical or SOL ID mode to configure."), indicator: "blue" });
        return;
      }

      frappe.confirm(
        __(`Are you sure you want to <b>Reset and Clear all branch permissions</b> for <b>${frm.state.user}</b>?<br><br><small class="text-muted">This will revoke all assigned branch access and save the cleared state.</small>`),
        () => {
          frm.state.zones.clear();
          frm.state.regions.clear();
          frm.state.districts.clear();
          frm.state.sol_ids.clear();
          frm.state.tag = "";

          frappe.call({
            method: "sahayog.scrm.doctype.report_preference.report_preference.save_widget_preference",
            args: {
              data: {
                user: frm.state.user,
                enabled: frm.state.enabled,
                tag: "",
                access_type: frm.state.access_type,
                zones: [],
                regions: [],
                districts: [],
                sol_ids: []
              }
            },
            freeze: true,
            freeze_message: __("Resetting Preferences & Permissions..."),
            callback: function (r) {
              if (r.message && r.message.status === "success") {
                frappe.show_alert({ message: __("Preferences reset and saved! Choose Geographical or SOL ID mode to reconfigure."), indicator: "blue" });
                frm.reload_doc();
              }
            }
          });
        }
      );
    });

    $w.find("#rp-btn-discard").on("click", function () {
      frm.reload_doc();
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
      frm.trigger("render_progressive_drilldown_table");
      return;
    }

    if (!isGeo && !sol_ids.length) {
      frm.resolved_branches = [];
      frm.trigger("render_progressive_drilldown_table");
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
        frm.trigger("render_progressive_drilldown_table");
      }
    });
  },

  render_progressive_drilldown_table: function (frm) {
    let $slot = frm.fields_dict.widget_html.$wrapper.find("#rp-branch-coverage-slot");
    if (!$slot.length) return;

    let meta = frm.meta_data || {};
    let masterZones = meta.master_zones || [];
    let allBranches = meta.all_branches || [];
    let branches = frm.resolved_branches || [];
    let totalCount = branches.length;
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

      // Clean up regions that no longer belong to selected zones
      let currentSelectedRegions = Array.from(frm.state.regions);
      currentSelectedRegions.forEach(r => {
        if (!availableRegions.includes(r)) {
          frm.state.regions.delete(r);
        }
      });
    } else if (isGeo) {
      frm.state.regions.clear();
    }

    // Build Nested Structure for Progressive Drilldown Table
    let tree = {};
    branches.forEach(b => {
      let z = b.zone || "Unassigned Zone";
      let r = b.region || "Unassigned Region";
      let d = b.district || "Unassigned District";

      if (!tree[z]) tree[z] = {};
      if (!tree[z][r]) tree[z][r] = {};
      if (!tree[z][r][d]) tree[z][r][d] = [];

      tree[z][r][d].push(b);
    });

    let tableHtml = `
      <div class="rp-table-section-card">
        <!-- Top Toolbar -->
        <div class="rp-table-top-bar">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">
              🏢 Branch Permission & Coverage (${isGeo ? 'Geographical' : 'SOL Specific'})
            </span>
            <span class="rp-table-badge" id="rp-table-live-count">${totalCount} Branches Allowed</span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="rp-btn-ghost" id="rp-btn-table-expand-all" style="padding: 3px 8px; font-size: 11px;">▾ Expand All</button>
            <button type="button" class="rp-btn-ghost" id="rp-btn-table-collapse-all" style="padding: 3px 8px; font-size: 11px;">▸ Collapse All</button>
            <input type="text" class="rp-table-search-box" id="rp-table-filter-search" placeholder="🔍 Search branch, SOL, zone..." />
          </div>
        </div>

        <!-- Mode Specific Control Bar -->
        <div class="rp-permission-capsules-bar">
          ${isGeo ? `
            <!-- Zone Capsules -->
            <div class="rp-capsule-row">
              <span class="rp-capsule-label">ZONES:</span>
              ${masterZones.map(z => `
                <div class="rp-perm-capsule rp-zone-capsule ${frm.state.zones.has(z) ? 'active' : ''}" data-zone="${z}">
                  <span class="rp-capsule-dot"></span>
                  <span>${z}</span>
                </div>
              `).join('')}
              <div style="display: inline-flex; align-items: center; gap: 4px; margin-left: 4px;">
                <button type="button" class="rp-capsule-action-btn" id="rp-btn-select-all-zones" style="color: var(--rp-accent); font-weight: 600;">Select All</button>
                <span style="color: #cbd5e1; font-size: 11px;">•</span>
                <button type="button" class="rp-capsule-action-btn" id="rp-btn-clear-all-zones">Clear</button>
              </div>
            </div>

            <!-- Region Capsules -->
            <div class="rp-capsule-row">
              <span class="rp-capsule-label">REGIONS:</span>
              ${!hasZoneSelected ? `
                <span style="font-size: 11.5px; color: #94a3b8; font-style: italic;">
                  ⚠️ Select at least one Zone first to enable and choose Regions
                </span>
              ` : (availableRegions.length > 0 ? `
                ${availableRegions.map(r => `
                  <div class="rp-perm-capsule rp-region-capsule ${frm.state.regions.has(r) ? 'active' : ''}" data-region="${r}">
                    <span class="rp-capsule-dot"></span>
                    <span>${r}</span>
                  </div>
                `).join('')}
                <div style="display: inline-flex; align-items: center; gap: 4px; margin-left: 4px;">
                  <button type="button" class="rp-capsule-action-btn" id="rp-btn-select-all-regions" style="color: var(--rp-accent); font-weight: 600;">Select All</button>
                  <span style="color: #cbd5e1; font-size: 11px;">•</span>
                  <button type="button" class="rp-capsule-action-btn" id="rp-btn-clear-all-regions">Clear</button>
                </div>
              ` : `
                <span style="font-size: 11.5px; color: #94a3b8; font-style: italic;">
                  No regions available in selected zones
                </span>
              `)}
            </div>
          ` : `
            <!-- SOL ID Autocomplete & Comma-Separated Fast Paste -->
            <div class="rp-capsule-row" style="align-items: flex-start;">
              <span class="rp-capsule-label" style="margin-top: 6px;">ADD SOL:</span>
              <div style="flex: 1; max-width: 500px; display: flex; gap: 6px; position: relative;">
                <input type="text" class="form-control input-sm" id="rp-table-sol-search-input" placeholder="Type SOL ID or paste comma separated (e.g. 1001, 1002, 1003)..." />
                <button type="button" class="btn btn-xs btn-primary" id="rp-btn-add-sol-tokens" style="padding: 4px 12px; font-size: 11.5px; white-space: nowrap;">+ Add</button>
                <div class="rp-dropdown-popover" id="rp-table-sol-dropdown" style="top: 34px;"></div>
              </div>
              <button type="button" class="rp-capsule-action-btn" id="rp-btn-clear-all-sols" style="margin-top: 6px; color: #dc2626;">Remove All</button>
            </div>
          `}
        </div>

        <!-- Pure Progressive Drilldown Grid Table -->
        <div class="rp-table-scroll-wrap">
          ${isGeo && !hasZoneSelected ? `
            <div style="padding: 36px; text-align: center; color: #94a3b8; font-size: 13px;">
              👈 Please select a <b>Zone</b> capsule above to grant branch access.
            </div>
          ` : (!isGeo && !frm.state.sol_ids.size ? `
            <div style="padding: 36px; text-align: center; color: #94a3b8; font-size: 13px;">
              🔍 Type single SOL ID or paste comma separated list in the <b>ADD SOL</b> box above.
            </div>
          ` : (totalCount === 0 ? `
            <div style="padding: 32px; text-align: center; color: #94a3b8; font-size: 12.5px;">
              No branches found matching the current selections.
            </div>
          ` : `
            <table class="rp-pure-grid-table" id="rp-pure-grid-table">
              <thead>
                <tr>
                  <th style="width: 140px;">Level</th>
                  <th style="width: 130px;">Zone</th>
                  <th style="width: 130px;">Region</th>
                  <th style="width: 140px;">District</th>
                  <th>Branch Name</th>
                  <th style="width: 100px;">SOL ID</th>
                </tr>
              </thead>
              <tbody>
                ${Object.keys(tree).map(z => {
                  let zBranchesCount = Object.values(tree[z]).reduce((acc, reg) => 
                    acc + Object.values(reg).reduce((a, dist) => a + dist.length, 0), 0);
                  let zRegCount = Object.keys(tree[z]).length;
                  let zKey = `zone-${z.replace(/[^a-zA-Z0-9]/g, '_')}`;

                  return `
                    <!-- Level 1: Zone Row (Click opens Regions) -->
                    <tr class="rp-row-zone-header rp-tree-header-row" data-tree-key="${zKey}" data-zone-key="${zKey}" data-search="${z}">
                      <td>
                        <span class="rp-tree-toggle-icon" id="icon-${zKey}">▸</span>
                        <span class="rp-level-badge rp-level-badge-zone">Zone</span>
                      </td>
                      <td><b>${z}</b></td>
                      <td><span class="text-muted" style="font-size:11px;">(${zRegCount} Regions)</span></td>
                      <td><span class="text-muted" style="font-size:11px;">—</span></td>
                      <td><span class="text-muted" style="font-size:11px; font-weight:600;">${zBranchesCount} Branches</span></td>
                      <td>—</td>
                    </tr>

                    ${Object.keys(tree[z]).map(r => {
                      let rBranchesCount = Object.values(tree[z][r]).reduce((a, dist) => a + dist.length, 0);
                      let rDistCount = Object.keys(tree[z][r]).length;
                      let rKey = `${zKey}-reg-${r.replace(/[^a-zA-Z0-9]/g, '_')}`;

                      return `
                        <!-- Level 2: Region Row (Initially hidden, click opens Districts) -->
                        <tr class="rp-row-region-header rp-tree-header-row rp-under-zone-${zKey}" data-zone-parent="${zKey}" data-tree-key="${rKey}" data-reg-key="${rKey}" data-search="${z} ${r}" style="display: none;">
                          <td>
                            <span class="rp-tree-toggle-icon" id="icon-${rKey}">▸</span>
                            <span class="rp-level-badge rp-level-badge-region">Region</span>
                          </td>
                          <td><span class="rp-tag-micro">${z}</span></td>
                          <td><b>${r}</b></td>
                          <td><span class="text-muted" style="font-size:11px;">(${rDistCount} Districts)</span></td>
                          <td><span class="text-muted" style="font-size:11px; font-weight:600;">${rBranchesCount} Branches</span></td>
                          <td>—</td>
                        </tr>

                        ${Object.keys(tree[z][r]).map(d => {
                          let distBranches = tree[z][r][d];
                          let dKey = `${rKey}-dist-${d.replace(/[^a-zA-Z0-9]/g, '_')}`;

                          return `
                            <!-- Level 3: District Row (Initially hidden, click opens Branches) -->
                            <tr class="rp-row-district-header rp-tree-header-row rp-under-zone-${zKey} rp-under-reg-${rKey}" data-zone-parent="${zKey}" data-reg-parent="${rKey}" data-tree-key="${dKey}" data-dist-key="${dKey}" data-search="${z} ${r} ${d}" style="display: none;">
                              <td>
                                <span class="rp-tree-toggle-icon" id="icon-${dKey}">▸</span>
                                <span class="rp-level-badge rp-level-badge-district">District</span>
                              </td>
                              <td><span class="rp-tag-micro">${z}</span></td>
                              <td><span class="rp-tag-micro">${r}</span></td>
                              <td><b>${d}</b></td>
                              <td><span class="text-muted" style="font-size:11px; font-weight:600;">${distBranches.length} Branches</span></td>
                              <td>—</td>
                            </tr>

                            <!-- Level 4: Branch Rows (Initially hidden) -->
                            ${distBranches.map(b => `
                              <tr class="rp-row-branch-leaf rp-under-zone-${zKey} rp-under-reg-${rKey} rp-under-dist-${dKey}" data-zone-parent="${zKey}" data-reg-parent="${rKey}" data-dist-parent="${dKey}" data-search="${String(b.sol_id)} ${b.branch || ''} ${d} ${r} ${z}" style="display: none;">
                                <td>
                                  <span class="rp-tree-toggle-icon" style="color: #94a3b8; font-size: 8px;">•</span>
                                  <span class="rp-level-badge rp-level-badge-branch">Branch</span>
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
      </div>
    `;

    $slot.html(tableHtml);

    // Zone Capsule Click: Toggle permission in state
    $slot.find(".rp-zone-capsule").on("click", function () {
      let z = $(this).data("zone");
      if (frm.state.zones.has(z)) {
        frm.state.zones.delete(z);
      } else {
        frm.state.zones.add(z);
      }
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("calculate_and_render_branches");
    });

    $slot.find("#rp-btn-select-all-zones").on("click", function () {
      masterZones.forEach(z => frm.state.zones.add(z));
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("calculate_and_render_branches");
    });

    $slot.find("#rp-btn-clear-all-zones").on("click", function () {
      frm.state.zones.clear();
      frm.state.regions.clear();
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("calculate_and_render_branches");
    });

    // Region Capsule Click: Toggle permission in state
    $slot.find(".rp-region-capsule").on("click", function () {
      if (!frm.state.zones.size) {
        frappe.show_alert({ message: __("Please select a Zone first!"), indicator: "orange" });
        return;
      }

      let r = $(this).data("region");
      if (frm.state.regions.has(r)) {
        frm.state.regions.delete(r);
      } else {
        frm.state.regions.add(r);
      }
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("calculate_and_render_branches");
    });

    $slot.find("#rp-btn-select-all-regions").on("click", function () {
      if (!frm.state.zones.size) {
        frappe.show_alert({ message: __("Please select a Zone first!"), indicator: "orange" });
        return;
      }
      availableRegions.forEach(r => frm.state.regions.add(r));
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("calculate_and_render_branches");
    });

    $slot.find("#rp-btn-clear-all-regions").on("click", function () {
      frm.state.regions.clear();
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("calculate_and_render_branches");
    });

    // Helper: Add tokens from SOL input (comma/space/newline separated)
    function processSolTokens(val) {
      if (!val) return;
      let tokens = val.split(/[,;\s\n\r]+/).map(x => x.trim()).filter(Boolean);
      if (!tokens.length) return;

      let addedCount = 0;
      tokens.forEach(tok => {
        if (tok) {
          frm.state.sol_ids.add(String(tok));
          addedCount++;
        }
      });

      if (addedCount > 0) {
        $solInput.val("");
        $solDropdown.hide().empty();
        frappe.show_alert({
          message: __(`Added ${addedCount} SOL ID(s).`),
          indicator: "green"
        });
        frm.trigger("sync_widget_state_to_doc");
        frm.trigger("render_progressive_drilldown_table");
        frm.trigger("calculate_and_render_branches");
      }
    }

    // SOL Mode Search & Add Input
    let $solInput = $slot.find("#rp-table-sol-search-input");
    let $solDropdown = $slot.find("#rp-table-sol-dropdown");

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
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("render_progressive_drilldown_table");
      frm.trigger("calculate_and_render_branches");
    });

    $slot.find("#rp-btn-clear-all-sols").on("click", function () {
      frm.state.sol_ids.clear();
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("render_progressive_drilldown_table");
      frm.trigger("calculate_and_render_branches");
    });

    // 1. Zone Click: Toggles ONLY its child Region rows
    $slot.find(".rp-row-zone-header").on("click", function () {
      let zKey = $(this).data("zone-key");
      let $icon = $(this).find(`#icon-${zKey}`);
      let isExpanding = $icon.text().trim() === "▸";

      if (isExpanding) {
        $icon.text("▼");
        // Show only direct child Region rows (their children stay collapsed)
        $slot.find(`.rp-row-region-header[data-zone-parent="${zKey}"]`).show();
      } else {
        $icon.text("▸");
        // Collapse all descendants under this Zone
        $slot.find(`.rp-under-zone-${zKey}`).hide();
        // Reset sub-icons to collapsed state
        $slot.find(`.rp-row-region-header[data-zone-parent="${zKey}"] .rp-tree-toggle-icon`).text("▸");
        $slot.find(`.rp-row-district-header[data-zone-parent="${zKey}"] .rp-tree-toggle-icon`).text("▸");
      }
    });

    // 2. Region Click: Toggles ONLY its child District rows
    $slot.find(".rp-row-region-header").on("click", function (e) {
      e.stopPropagation();
      let rKey = $(this).data("reg-key");
      let $icon = $(this).find(`#icon-${rKey}`);
      let isExpanding = $icon.text().trim() === "▸";

      if (isExpanding) {
        $icon.text("▼");
        // Show only direct child District rows
        $slot.find(`.rp-row-district-header[data-reg-parent="${rKey}"]`).show();
      } else {
        $icon.text("▸");
        // Collapse all descendants under this Region
        $slot.find(`.rp-under-reg-${rKey}`).hide();
        $slot.find(`.rp-row-district-header[data-reg-parent="${rKey}"] .rp-tree-toggle-icon`).text("▸");
      }
    });

    // 3. District Click: Toggles ONLY its child Branch rows
    $slot.find(".rp-row-district-header").on("click", function (e) {
      e.stopPropagation();
      let dKey = $(this).data("dist-key");
      let $icon = $(this).find(`#icon-${dKey}`);
      let isExpanding = $icon.text().trim() === "▸";

      if (isExpanding) {
        $icon.text("▼");
        // Show direct child Branch rows
        $slot.find(`.rp-row-branch-leaf[data-dist-parent="${dKey}"]`).show();
      } else {
        $icon.text("▸");
        // Collapse child Branch rows
        $slot.find(`.rp-row-branch-leaf[data-dist-parent="${dKey}"]`).hide();
      }
    });

    // Expand All Button
    $slot.find("#rp-btn-table-expand-all").on("click", function () {
      $slot.find(".rp-row-region-header, .rp-row-district-header, .rp-row-branch-leaf").show();
      $slot.find(".rp-tree-toggle-icon").each(function () {
        if ($(this).text().trim() === "▸") $(this).text("▼");
      });
    });

    // Collapse All Button
    $slot.find("#rp-btn-table-collapse-all").on("click", function () {
      $slot.find(".rp-row-region-header, .rp-row-district-header, .rp-row-branch-leaf").hide();
      $slot.find(".rp-tree-toggle-icon").each(function () {
        if ($(this).text().trim() === "▼") $(this).text("▸");
      });
    });

    // Instant Search in Progressive Drilldown Table
    $slot.find("#rp-table-filter-search").on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      let visibleBranchCount = 0;

      if (!q) {
        // Reset to initial collapsed zone view
        $slot.find(".rp-row-zone-header").show();
        $slot.find(".rp-row-region-header, .rp-row-district-header, .rp-row-branch-leaf").hide();
        $slot.find(".rp-tree-toggle-icon").each(function () {
          if ($(this).text().trim() === "▼") $(this).text("▸");
        });
        $slot.find("#rp-table-live-count").text(`${totalCount} Branches Allowed`);
        return;
      }

      // When searching, expand all matching branches and their parents
      $slot.find(".rp-row-zone-header, .rp-row-region-header, .rp-row-district-header, .rp-row-branch-leaf").hide();

      $slot.find(".rp-row-branch-leaf").each(function () {
        let sText = ($(this).data("search") || "").toLowerCase();
        if (sText.includes(q)) {
          $(this).show();
          visibleBranchCount++;
          let pZone = $(this).data("zone-parent");
          let pReg = $(this).data("reg-parent");
          let pDist = $(this).data("dist-parent");

          $slot.find(`.rp-row-zone-header[data-zone-key="${pZone}"]`).show();
          $slot.find(`.rp-row-region-header[data-reg-key="${pReg}"]`).show();
          $slot.find(`.rp-row-district-header[data-dist-key="${pDist}"]`).show();

          $slot.find(`#icon-${pZone}`).text("▼");
          $slot.find(`#icon-${pReg}`).text("▼");
          $slot.find(`#icon-${pDist}`).text("▼");
        }
      });

      $slot.find("#rp-table-live-count").text(`${visibleBranchCount} / ${totalCount} Branches Allowed`);
    });
  }
});
