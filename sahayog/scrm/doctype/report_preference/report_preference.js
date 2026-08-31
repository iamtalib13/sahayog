frappe.ui.form.on("Report Preference", {
  setup: function (frm) {
    frm.meta_data = null;
    frm.state = {
      user: null,
      enabled: 1,
      tag: "",
      access_type: "Geographical (Zone / Region / District)",
      roles: new Set(),
      zones: new Set(),
      regions: new Set(),
      districts: new Set(),
      sol_ids: new Set(),
    };
    frm.resolved_branches = [];
  },

  refresh: function (frm) {
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
      args: { user: frm.doc.user },
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
    let roles = frm.meta_data.user_roles || [];

    frm.state.user = frm.doc.user || (pref ? pref.user : "");
    frm.state.enabled = frm.doc.enabled !== undefined ? frm.doc.enabled : (pref ? pref.enabled : 1);
    frm.state.tag = frm.doc.tag || (pref ? pref.tag : "");
    frm.state.access_type = frm.doc.access_type || (pref ? pref.access_type : "Geographical (Zone / Region / District)");

    frm.state.roles = new Set(roles);

    // Populate zones from doc or pref
    let zones = (frm.doc.zone || []).map(d => d.zone).filter(Boolean);
    if (!zones.length && pref && pref.zones) zones = pref.zones;
    frm.state.zones = new Set(zones);

    // Populate regions
    let regions = (frm.doc.region || []).map(d => d.region).filter(Boolean);
    if (!regions.length && pref && pref.regions) regions = pref.regions;
    frm.state.regions = new Set(regions);

    // Populate districts
    let districts = (frm.doc.district || []).map(d => d.district).filter(Boolean);
    if (!districts.length && pref && pref.districts) districts = pref.districts;
    frm.state.districts = new Set(districts);

    // Populate sol_ids
    let sol_ids = (frm.doc.sol_id || []).map(d => String(d.sol_id)).filter(Boolean);
    if (!sol_ids.length && pref && pref.sol_ids) sol_ids = pref.sol_ids;
    frm.state.sol_ids = new Set(sol_ids);
  },

  sync_widget_state_to_doc: function (frm) {
    frm.doc.enabled = frm.state.enabled ? 1 : 0;
    frm.doc.tag = frm.state.tag || "";
    frm.doc.access_type = frm.state.access_type;

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

    frm.refresh_fields(["zone", "region", "district", "sol_id", "enabled", "tag", "access_type"]);
    frm.dirty();
  },

  before_save: function (frm) {
    frm.trigger("sync_widget_state_to_doc");
    // Sync user roles
    if (frm.doc.user && frm.state.roles) {
      frappe.call({
        method: "sahayog.scrm.doctype.report_preference.report_preference.sync_user_roles",
        args: {
          user: frm.doc.user,
          roles: Array.from(frm.state.roles)
        },
        async: false
      });
    }
  },

  render_full_crud_widget: function (frm) {
    if (!frm.fields_dict.widget_html) return;

    let meta = frm.meta_data || {};
    let masterZones = meta.master_zones || [];
    let masterRegions = meta.master_regions || [];
    let masterDistricts = meta.master_districts || [];
    let rolesList = meta.roles_list || [];
    let isGeo = frm.state.access_type === "Geographical (Zone / Region / District)";

    let html = `
      <style>
        .rp-workspace {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .rp-section-title {
          font-size: 12px;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
        }
        .rp-card-block {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 16px;
        }
        .rp-flex-between {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .rp-pill-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .rp-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          background: #ffffff;
          color: #475569;
          border: 1px solid #cbd5e1;
          transition: all 0.15s ease;
          user-select: none;
        }
        .rp-chip:hover {
          border-color: #94a3b8;
          background: #f1f5f9;
        }
        .rp-chip.selected {
          background: #e6f4ea;
          color: #137333;
          border-color: #34a853;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(52, 168, 83, 0.2);
        }
        .rp-chip-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .rp-chip.selected .rp-chip-dot {
          background: #34a853;
        }
        .rp-mode-tabs {
          display: flex;
          gap: 4px;
          background: #e2e8f0;
          padding: 3px;
          border-radius: 8px;
          width: fit-content;
          margin-bottom: 12px;
        }
        .rp-mode-tab {
          padding: 6px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          color: #64748b;
          transition: all 0.15s ease;
        }
        .rp-mode-tab.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .rp-sol-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
          padding: 4px 10px;
          border-radius: 14px;
          font-size: 12px;
          font-weight: 500;
        }
        .rp-sol-tag-remove {
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
          line-height: 1;
        }
        .rp-sol-tag-remove:hover {
          color: #ef4444;
        }
        .rp-branch-search-box {
          position: relative;
          margin-bottom: 10px;
        }
        .rp-branch-search-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          display: none;
        }
        .rp-branch-search-item {
          padding: 8px 12px;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          font-size: 12px;
        }
        .rp-branch-search-item:hover {
          background: #f8fafc;
        }
        .rp-save-bar {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }
      </style>

      <div class="rp-workspace">
        <!-- 1. ROLES SECTION -->
        <div class="rp-card-block">
          <div class="rp-flex-between">
            <div class="rp-section-title">⚡ 1. Department & Finacle Report Roles</div>
            <div>
              <button type="button" class="btn btn-xs btn-default" id="rp-btn-select-all-roles">Select All</button>
              <button type="button" class="btn btn-xs btn-default" id="rp-btn-clear-roles">Clear</button>
            </div>
          </div>
          <div class="rp-pill-grid" id="rp-roles-container">
            ${rolesList.map(r => `
              <div class="rp-chip rp-role-chip ${frm.state.roles.has(r.key) ? 'selected' : ''}" data-role="${r.key}">
                <span class="rp-chip-dot"></span>
                <span>${r.label}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- 2. ACCESS SCOPE CRUD SECTION -->
        <div class="rp-card-block">
          <div class="rp-section-title">📍 2. Branch Access Scope & Filters</div>
          
          <!-- Mode Switcher -->
          <div class="rp-mode-tabs">
            <div class="rp-mode-tab ${isGeo ? 'active' : ''}" data-mode="Geographical (Zone / Region / District)">
              🌍 Geographical Scope (Zone / Region / District)
            </div>
            <div class="rp-mode-tab ${!isGeo ? 'active' : ''}" data-mode="Specific Branches (SOL ID)">
              🏢 Specific Branches (SOL ID)
            </div>
          </div>

          <!-- GEOGRAPHICAL MODE VIEW -->
          <div id="rp-geo-mode-view" style="${isGeo ? '' : 'display:none;'}">
            <!-- Zones -->
            <div style="margin-bottom: 12px;">
              <div class="rp-flex-between">
                <span style="font-size: 12px; font-weight: 600; color: #475569;">Select Zones (Auto-includes current & future branches):</span>
                <button type="button" class="btn btn-xs btn-link text-muted" id="rp-clear-zones">Clear Zones</button>
              </div>
              <div class="rp-pill-grid">
                ${masterZones.map(z => `
                  <div class="rp-chip rp-zone-chip ${frm.state.zones.has(z) ? 'selected' : ''}" data-zone="${z}">
                    <span class="rp-chip-dot"></span>
                    <span>${z}</span>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Regions -->
            <div style="margin-bottom: 12px;">
              <div class="rp-flex-between">
                <span style="font-size: 12px; font-weight: 600; color: #475569;">Select Regions:</span>
                <button type="button" class="btn btn-xs btn-link text-muted" id="rp-clear-regions">Clear Regions</button>
              </div>
              <div class="rp-pill-grid">
                ${masterRegions.map(r => `
                  <div class="rp-chip rp-region-chip ${frm.state.regions.has(r) ? 'selected' : ''}" data-region="${r}">
                    <span class="rp-chip-dot"></span>
                    <span>${r}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <!-- SOL ID SPECIFIC MODE VIEW -->
          <div id="rp-sol-mode-view" style="${!isGeo ? '' : 'display:none;'}">
            <div style="margin-bottom: 10px;">
              <span style="font-size: 12px; font-weight: 600; color: #475569;">Search & Add Specific Branches:</span>
            </div>
            <div class="rp-branch-search-box">
              <input type="text" class="form-control input-sm" id="rp-sol-search-input" placeholder="Type Branch Name or SOL ID to add..." />
              <div class="rp-branch-search-dropdown" id="rp-sol-search-dropdown"></div>
            </div>
            <div style="margin-top: 10px;">
              <div class="rp-flex-between" style="margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: 600; color: #64748b;">Selected Branches (${frm.state.sol_ids.size}):</span>
                <button type="button" class="btn btn-xs btn-link text-danger" id="rp-clear-all-sols">Remove All</button>
              </div>
              <div class="rp-pill-grid" id="rp-selected-sols-tags">
                ${Array.from(frm.state.sol_ids).map(s => {
                  let b = (meta.all_branches || []).find(x => String(x.sol_id) === String(s));
                  let label = b ? `${s} - ${b.branch}` : s;
                  return `
                    <div class="rp-sol-tag" data-sol="${s}">
                      <span>${label}</span>
                      <span class="rp-sol-tag-remove" data-sol="${s}">&times;</span>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          </div>
        </div>

        <!-- 3. LIVE RESOLVED BRANCHES TABLE -->
        <div id="rp-branch-table-container-slot"></div>

        <!-- 4. SAVE & ACTIONS BAR -->
        <div class="rp-save-bar">
          <button type="button" class="btn btn-sm btn-default" id="rp-btn-discard">Discard Changes</button>
          <button type="button" class="btn btn-sm btn-primary" id="rp-btn-direct-save">💾 Save Preferences</button>
        </div>
      </div>
    `;

    frm.fields_dict.widget_html.$wrapper.html(html);
    frm.trigger("attach_widget_events");
  },

  attach_widget_events: function (frm) {
    let $w = frm.fields_dict.widget_html.$wrapper;
    let meta = frm.meta_data || {};

    // Role Toggles
    $w.find(".rp-role-chip").on("click", function () {
      let r = $(this).data("role");
      if (frm.state.roles.has(r)) {
        frm.state.roles.delete(r);
        $(this).removeClass("selected");
      } else {
        frm.state.roles.add(r);
        $(this).addClass("selected");
      }
      frm.trigger("sync_widget_state_to_doc");
    });

    $w.find("#rp-btn-select-all-roles").on("click", function () {
      (meta.roles_list || []).forEach(r => frm.state.roles.add(r.key));
      $w.find(".rp-role-chip").addClass("selected");
      frm.trigger("sync_widget_state_to_doc");
    });

    $w.find("#rp-btn-clear-roles").on("click", function () {
      frm.state.roles.clear();
      $w.find(".rp-role-chip").removeClass("selected");
      frm.trigger("sync_widget_state_to_doc");
    });

    // Mode Switcher Tabs
    $w.find(".rp-mode-tab").on("click", function () {
      let mode = $(this).data("mode");
      frm.state.access_type = mode;
      $w.find(".rp-mode-tab").removeClass("active");
      $(this).addClass("active");

      if (mode === "Geographical (Zone / Region / District)") {
        $w.find("#rp-geo-mode-view").show();
        $w.find("#rp-sol-mode-view").hide();
      } else {
        $w.find("#rp-geo-mode-view").hide();
        $w.find("#rp-sol-mode-view").show();
      }

      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("calculate_and_render_branches");
    });

    // Zone Toggles
    $w.find(".rp-zone-chip").on("click", function () {
      let z = $(this).data("zone");
      if (frm.state.zones.has(z)) {
        frm.state.zones.delete(z);
        $(this).removeClass("selected");
      } else {
        frm.state.zones.add(z);
        $(this).addClass("selected");
      }
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("calculate_and_render_branches");
    });

    $w.find("#rp-clear-zones").on("click", function () {
      frm.state.zones.clear();
      $w.find(".rp-zone-chip").removeClass("selected");
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("calculate_and_render_branches");
    });

    // Region Toggles
    $w.find(".rp-region-chip").on("click", function () {
      let r = $(this).data("region");
      if (frm.state.regions.has(r)) {
        frm.state.regions.delete(r);
        $(this).removeClass("selected");
      } else {
        frm.state.regions.add(r);
        $(this).addClass("selected");
      }
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("calculate_and_render_branches");
    });

    $w.find("#rp-clear-regions").on("click", function () {
      frm.state.regions.clear();
      $w.find(".rp-region-chip").removeClass("selected");
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("calculate_and_render_branches");
    });

    // SOL ID Search & Add
    let allBranches = meta.all_branches || [];
    let $solInput = $w.find("#rp-sol-search-input");
    let $dropdown = $w.find("#rp-sol-search-dropdown");

    $solInput.on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      if (!q) {
        $dropdown.hide().empty();
        return;
      }

      let matches = allBranches.filter(b => 
        String(b.sol_id).toLowerCase().includes(q) || (b.branch && b.branch.toLowerCase().includes(q))
      ).slice(0, 15);

      if (!matches.length) {
        $dropdown.html('<div style="padding:8px 12px; color:#94a3b8; font-size:12px;">No branches found</div>').show();
        return;
      }

      let itemsHtml = matches.map(b => `
        <div class="rp-branch-search-item" data-sol="${b.sol_id}">
          <b>${b.sol_id}</b> - ${b.branch || ""} <span class="text-muted">(${b.zone || ""}, ${b.region || ""})</span>
        </div>
      `).join("");

      $dropdown.html(itemsHtml).show();
    });

    $dropdown.on("click", ".rp-branch-search-item", function () {
      let sol = String($(this).data("sol"));
      frm.state.sol_ids.add(sol);
      $solInput.val("");
      $dropdown.hide().empty();
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("render_full_crud_widget");
      frm.trigger("calculate_and_render_branches");
    });

    $(document).on("click", function (e) {
      if (!$(e.target).closest(".rp-branch-search-box").length) {
        $dropdown.hide();
      }
    });

    // Remove SOL Tag
    $w.find(".rp-sol-tag-remove").on("click", function () {
      let sol = String($(this).data("sol"));
      frm.state.sol_ids.delete(sol);
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("render_full_crud_widget");
      frm.trigger("calculate_and_render_branches");
    });

    $w.find("#rp-clear-all-sols").on("click", function () {
      frm.state.sol_ids.clear();
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("render_full_crud_widget");
      frm.trigger("calculate_and_render_branches");
    });

    // Direct Save Button
    $w.find("#rp-btn-direct-save").on("click", function () {
      if (!frm.doc.user) {
        frappe.msgprint(__("Please select a User first."));
        return;
      }

      frappe.call({
        method: "sahayog.scrm.doctype.report_preference.report_preference.save_widget_preference",
        args: {
          data: {
            user: frm.doc.user,
            enabled: frm.doc.enabled,
            tag: frm.doc.tag,
            access_type: frm.state.access_type,
            roles: Array.from(frm.state.roles),
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

    $w.find("#rp-btn-discard").on("click", function () {
      frm.reload_doc();
    });
  },

  calculate_and_render_branches: function (frm) {
    let zones = Array.from(frm.state.zones);
    let regions = Array.from(frm.state.regions);
    let districts = Array.from(frm.state.districts);
    let sol_ids = Array.from(frm.state.sol_ids);

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
        frm.trigger("render_minimal_table_html");
      }
    });
  },

  render_minimal_table_html: function (frm) {
    let $slot = frm.fields_dict.widget_html.$wrapper.find("#rp-branch-table-container-slot");
    if (!$slot.length) return;

    let branches = frm.resolved_branches || [];
    let count = branches.length;

    let tableHtml = `
      <style>
        .rp-table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .rp-table-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .rp-table-title {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
        }
        .rp-count-badge {
          background: #e0f2fe;
          color: #0369a1;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .rp-table-search {
          max-width: 220px;
          padding: 4px 10px;
          font-size: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
        }
        .rp-table-container {
          max-height: 250px;
          overflow-y: auto;
        }
        .rp-minimal-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .rp-minimal-table th {
          position: sticky;
          top: 0;
          background: #f1f5f9;
          color: #475569;
          font-weight: 600;
          text-align: left;
          padding: 7px 12px;
          border-bottom: 1px solid #cbd5e1;
          z-index: 1;
        }
        .rp-minimal-table td {
          padding: 6px 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }
        .rp-minimal-table tbody tr:hover {
          background-color: #f8fafc;
        }
        .rp-sol-code {
          font-family: monospace;
          font-weight: 600;
          color: #0f172a;
        }
        .rp-empty-state {
          padding: 24px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
        }
      </style>

      <div class="rp-table-card">
        <div class="rp-table-header-bar">
          <div class="rp-table-title">
            <span>🏢 Active Branch Coverage</span>
            <span class="rp-count-badge" id="rp-table-counter">${count} Branches</span>
          </div>
          <input type="text" class="rp-table-search" id="rp-table-quick-search" placeholder="🔍 Filter branches..." />
        </div>
        <div class="rp-table-container">
          ${count === 0 ? `
            <div class="rp-empty-state">
              No branches matching current filters. Select Zones/Regions or SOL IDs above.
            </div>
          ` : `
            <table class="rp-minimal-table" id="rp-active-table-data">
              <thead>
                <tr>
                  <th style="width: 100px;">SOL ID</th>
                  <th>Branch Name</th>
                  <th style="width: 120px;">Zone</th>
                  <th style="width: 120px;">Region</th>
                  <th style="width: 140px;">District</th>
                </tr>
              </thead>
              <tbody>
                ${branches.map(b => `
                  <tr class="rp-branch-row-item">
                    <td class="rp-sol-code">${b.sol_id || "-"}</td>
                    <td><b>${b.branch || "-"}</b></td>
                    <td>${b.zone || "-"}</td>
                    <td>${b.region || "-"}</td>
                    <td>${b.district || "-"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;

    $slot.html(tableHtml);

    // Filter event
    $slot.find("#rp-table-quick-search").on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      let visible = 0;
      $slot.find(".rp-branch-row-item").each(function () {
        let text = $(this).text().toLowerCase();
        let match = text.includes(q);
        $(this).toggle(match);
        if (match) visible++;
      });
      $slot.find("#rp-table-counter").text(
        q ? `${visible} / ${count} Branches` : `${count} Branches`
      );
    });
  }
});
