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

  $(wrapper).find(".page-content").css({ padding: "16px 20px", maxWidth: "none" });
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
    meta_data: {}
  };

  function initPage() {
    loadUserList(() => {
      const route = frappe.get_route();
      if (route[2]) {
        selectUser(route[2]);
      } else if (state.pref_list.length > 0) {
        selectUser(state.pref_list[0].user);
      } else {
        renderPage();
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

        renderPage();
      }
    });
  }

  function autoSave(show_toast = true) {
    if (!state.user) return;

    let $saveBtn = page.main.find("#min-btn-save-manual");
    if ($saveBtn.length) {
      $saveBtn.text("Saving...").prop("disabled", true);
    }

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
        if ($saveBtn.length) {
          $saveBtn.text("Saved ✓").prop("disabled", false).css("background", "#16a34a").css("color", "#fff");
          setTimeout(() => {
            $saveBtn.text("Save").css("background", "").css("color", "");
          }, 1200);
        }
        if (r.message && r.message.status === "success" && show_toast) {
          frappe.show_alert({ message: __("Changes saved successfully ✓"), indicator: "green" });
        }
      }
    });
  }

  function renderPage() {
    let meta = state.meta_data || {};
    let tagsList = meta.tags || ["COM", "ROM", "RM", "AZM", "ZM"];
    let masterZones = meta.master_zones || [];
    let allBranches = meta.all_branches || [];
    let isGeo = state.access_type === "Geographical (Zone / Region / District)";
    let userName = state.full_name || (state.user ? state.user.split('@')[0] : "Select User");
    let userEmpId = state.user ? state.user.split('@')[0] : "-";

    function sortZones(list) {
      return [...list].sort((a, b) => {
        let numA = parseInt((String(a).match(/\d+/) || [9999])[0], 10);
        let numB = parseInt((String(b).match(/\d+/) || [9999])[0], 10);
        return numA - numB;
      });
    }

    function sortRegions(list) {
      return [...list].sort((a, b) => {
        let isHoA = String(a).toLowerCase().includes("head office") || String(a).toUpperCase() === "HO";
        let isHoB = String(b).toLowerCase().includes("head office") || String(b).toUpperCase() === "HO";
        if (isHoA && !isHoB) return -1;
        if (!isHoA && isHoB) return 1;
        let numA = parseInt((String(a).match(/\d+/) || [9999])[0], 10);
        let numB = parseInt((String(b).match(/\d+/) || [9999])[0], 10);
        return numA - numB;
      });
    }

    let sortedMasterZones = sortZones(masterZones);
    let zoneOptions = sortedMasterZones.map(z => {
      let num = (z.match(/\d+/) || [z])[0];
      return { raw: z, label: num };
    });

    let allRegionNames = sortRegions(Array.from(new Set(allBranches.map(b => b.region).filter(Boolean))));
    let availableRegionNames = allRegionNames;
    if (state.zones.size > 0) {
      availableRegionNames = sortRegions(Array.from(new Set(
        allBranches.filter(b => state.zones.has(b.zone)).map(b => b.region).filter(Boolean)
      )));
    }

    let regionOptions = availableRegionNames.map(r => {
      let code = r.toLowerCase().includes("head office") ? "HO" : (r.match(/\d+/) || [r])[0];
      return { raw: r, label: code };
    });

    let isAllZones = zoneOptions.length > 0 && zoneOptions.every(z => state.zones.has(z.raw));
    let isAllRegions = regionOptions.length > 0 && regionOptions.every(r => state.regions.has(r.raw));
    let solList = Array.from(state.sol_ids);

    let totalGeoBranches = 0;

    let fullTreeData = sortedMasterZones.map(z => {
      let isSelected = state.zones.has(z);
      let zoneBranches = allBranches.filter(b => b.zone === z);
      let zoneRegions = sortRegions(Array.from(new Set(zoneBranches.map(b => b.region).filter(Boolean))));

      // Only regions in state.regions for this zone
      let activeRegions = zoneRegions.filter(r => state.regions.has(r));
      let isAllRegionsAllowed = activeRegions.length === zoneRegions.length;

      let activeZoneBranches = zoneBranches.filter(b => activeRegions.includes(b.region));
      if (isSelected) {
        totalGeoBranches += activeZoneBranches.length;
      }

      let regionDetails = activeRegions.map(r => {
        let rBranches = zoneBranches.filter(b => b.region === r);
        return {
          region: r,
          branch_count: rBranches.length
        };
      });

      return {
        zone: z,
        is_selected: isSelected,
        all_regions_count: zoneRegions.length,
        active_regions_count: activeRegions.length,
        is_all_regions_allowed: isAllRegionsAllowed,
        total_zone_branches: activeZoneBranches.length,
        all_zone_branches_count: zoneBranches.length,
        regions: regionDetails
      };
    });

    let html = `
      <style>
        .min-perm-card {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
          color: #24292f;
          max-width: 1200px;
          margin: 0 auto;
        }

        .min-perm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 14px;
        }
        .min-perm-title {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 3px;
        }
        .min-perm-subinfo {
          font-size: 13px;
          color: #475569;
        }

        .min-scope-control {
          display: inline-flex;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
        }
        .min-scope-seg {
          padding: 4px 14px;
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
        .min-scope-seg:hover { color: #0f172a; }
        .min-scope-seg.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .min-toggle-track {
          width: 40px;
          height: 22px;
          background: #cbd5e1;
          border-radius: 9999px;
          position: relative;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .min-toggle-track.active { background: #16a34a; }
        .min-toggle-thumb {
          width: 16px;
          height: 16px;
          background: #ffffff;
          border-radius: 50%;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .min-toggle-track.active .min-toggle-thumb { transform: translateX(18px); }

        .min-btn-save {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
          border-radius: 6px;
          padding: 4px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .min-btn-save:hover { background: #1e293b; }

        .min-box-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (max-width: 768px) {
          .min-box-row { grid-template-columns: 1fr; }
        }

        .min-dashed-box {
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: 12px 16px;
          background: #ffffff;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .min-box-label {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          min-width: 48px;
        }

        .min-chip-container {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
        }
        .min-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 26px;
          padding: 0 10px;
          border-radius: 13px;
          font-size: 12px;
          font-weight: 600;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid transparent;
          cursor: pointer;
          user-select: none;
          transition: all 0.15s ease;
        }
        .min-chip:hover { background: #e2e8f0; color: #0f172a; }
        .min-chip.selected {
          background: #ffffff;
          color: #16a34a;
          border: 1.5px solid #16a34a;
          font-weight: 700;
        }

        /* Centered Flowchart Tree */
        .min-flowchart-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          padding: 20px 16px;
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .min-tree-root-box {
          background: #0f172a;
          color: #ffffff;
          padding: 8px 20px;
          border-radius: 24px;
          font-size: 12.5px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15);
          z-index: 2;
        }

        .min-tree-vertical-stem {
          width: 2px;
          height: 20px;
          background: #cbd5e1;
        }

        .min-tree-zones-row {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: 16px;
          width: 100%;
          flex-wrap: wrap;
          position: relative;
        }

        .min-tree-zone-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 160px;
          max-width: 200px;
          position: relative;
        }

        /* Zone Node - Disabled / Enabled Styles */
        .min-tree-zone-node {
          border-radius: 10px;
          padding: 8px 12px;
          text-align: center;
          width: 100%;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }

        .min-tree-zone-node.disabled {
          background: #f1f5f9;
          border: 1.5px dashed #cbd5e1;
          color: #94a3b8;
          opacity: 0.7;
        }
        .min-tree-zone-node.disabled:hover {
          opacity: 1;
          border-color: #94a3b8;
          background: #e2e8f0;
          color: #475569;
        }
        .min-tree-zone-node.disabled .min-tree-zone-heading {
          color: #64748b;
        }

        .min-tree-zone-node.enabled {
          background: #ffffff;
          border: 2px solid #16a34a;
          color: #16a34a;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.12);
        }
        .min-tree-zone-node.enabled .min-tree-zone-heading {
          color: #0f172a;
          font-weight: 800;
        }

        .min-tree-zone-heading {
          font-size: 13px;
          margin-bottom: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .min-tree-zone-badge-all {
          font-size: 10px;
          font-weight: 700;
          color: #16a34a;
          background: #dcfce7;
          padding: 2px 6px;
          border-radius: 6px;
          display: inline-block;
        }
        .min-tree-zone-badge-partial {
          font-size: 10px;
          font-weight: 700;
          color: #0369a1;
          background: #e0f2fe;
          padding: 2px 6px;
          border-radius: 6px;
          display: inline-block;
        }
        .min-tree-zone-badge-off {
          font-size: 10px;
          font-weight: 600;
          color: #94a3b8;
          display: inline-block;
        }

        .min-tree-regions-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
          margin-top: 6px;
        }
        .min-tree-region-leaf {
          background: #ffffff;
          border: 1px solid #bbf7d0;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 11px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
          transition: all 0.15s ease;
        }
        .min-tree-region-leaf:hover {
          border-color: #86efac;
          background: #f0fdf4;
        }

        .min-tree-remove-region {
          cursor: pointer;
          color: #94a3b8;
          font-weight: bold;
          font-size: 13px;
          line-height: 1;
          padding: 0 4px;
          border-radius: 3px;
          transition: all 0.15s ease;
        }
        .min-tree-remove-region:hover {
          color: #dc2626;
          background: #fee2e2;
        }

        .min-sol-box {
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: 14px 16px;
          background: #ffffff;
          margin-bottom: 16px;
        }
        .min-sol-remove { cursor: pointer; font-size: 14px; font-weight: bold; line-height: 1; }
        .min-sol-remove:hover { color: #dc2626; }

        .min-branch-table-wrap {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          margin-top: 10px;
        }
        .min-branch-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .min-branch-table th {
          background: #f8fafc;
          padding: 8px 12px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }
        .min-branch-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }
        .min-branch-table tr:hover { background: #f8fafc; }

        .min-bulk-delete-btn {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fca5a5;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s ease;
        }
        .min-bulk-delete-btn:hover {
          background: #fee2e2;
          border-color: #ef4444;
        }
      </style>

      <div class="min-perm-card">
        <!-- TOP HEADER -->
        <div class="min-perm-header">
          <div>
            <div class="min-perm-title">Permission Details</div>
            <div class="min-perm-subinfo">
              <span><b>Employee Name:</b> ${userName.toUpperCase()}</span>
              <span style="color: #cbd5e1; margin: 0 8px;">|</span>
              <span><b>Employee ID:</b> ${userEmpId}</span>
              <span style="margin-left: 10px;">
                <button type="button" class="btn btn-xs btn-default" id="min-btn-change-user">🔍 Select User</button>
              </span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <!-- Geo / Branch Wise Segmented Toggle -->
            <div class="min-scope-control">
              <div class="min-scope-seg ${isGeo ? 'active' : ''}" data-mode="Geographical (Zone / Region / District)">
                <span>🌍 Geo Wise</span>
              </div>
              <div class="min-scope-seg ${!isGeo ? 'active' : ''}" data-mode="Specific Branches (SOL ID)">
                <span>🏢 Branch Wise</span>
              </div>
            </div>

            <div class="min-toggle-track ${state.enabled ? 'active' : ''}" id="min-toggle-status" title="Toggle Status">
              <div class="min-toggle-thumb"></div>
            </div>

            <select class="form-control input-sm" id="min-tag-select" style="width: auto; height: 30px; font-size: 12px; font-weight: 600; border-radius: 6px; border-color: #cbd5e1;">
              <option value="">No Tag</option>
              ${tagsList.map(t => `<option value="${t}" ${state.tag === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>

            <button type="button" class="min-btn-save" id="min-btn-save-manual">Save</button>
          </div>
        </div>

        ${isGeo ? `
          <!-- ZONE & REGION DASHED BOXES (GEO WISE - SORTED Z1 TO Z6) -->
          <div class="min-box-row">
            <!-- Zone Box -->
            <div class="min-dashed-box">
              <span class="min-box-label">Zone</span>
              <div class="min-chip-container">
                <div class="min-chip ${isAllZones ? 'selected' : ''}" id="min-chip-zone-all">ALL</div>
                ${zoneOptions.map(z => `
                  <div class="min-chip min-chip-zone ${state.zones.has(z.raw) ? 'selected' : ''}" data-raw="${z.raw}">${z.label}</div>
                `).join('')}
              </div>
            </div>

            <!-- Region Box -->
            <div class="min-dashed-box">
              <span class="min-box-label">Region</span>
              <div class="min-chip-container">
                ${regionOptions.length > 0 ? `
                  <div class="min-chip ${isAllRegions ? 'selected' : ''}" id="min-chip-region-all">ALL</div>
                  ${regionOptions.map(r => `
                    <div class="min-chip min-chip-region ${state.regions.has(r.raw) ? 'selected' : ''}" data-raw="${r.raw}">${r.label}</div>
                  `).join('')}
                ` : `
                  <span style="font-size: 12px; color: #94a3b8; font-style: italic;">No regions available</span>
                `}
              </div>
            </div>
          </div>

          <!-- MINIMAL CENTERED FLOWCHART TREE DIAGRAM (ALL ZONES CONNECTED, ENABLED GREEN) -->
          <div class="min-flowchart-card">
            <!-- Level 0: Root User Node -->
            <div class="min-tree-root-box">
              <span>👤</span>
              <span>${userName.toUpperCase()} (${userEmpId})</span>
              ${state.tag ? `<span style="background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 4px; font-size: 10px;">${state.tag}</span>` : ''}
            </div>

            <!-- Stem Line -->
            <div class="min-tree-vertical-stem"></div>

            <!-- Level 1: Connected Zones Row (Z1 to Z6, default disabled, selected enabled green) -->
            <div class="min-tree-zones-row">
              ${fullTreeData.map(item => `
                <div class="min-tree-zone-col">
                  <!-- Zone Node (Clickable) -->
                  <div class="min-tree-zone-node min-tree-click-zone ${item.is_selected ? 'enabled' : 'disabled'}" data-raw="${item.zone}" title="${item.is_selected ? 'Click to Disable Zone' : 'Click to Enable Zone'}">
                    <div class="min-tree-zone-heading">
                      <span>${item.is_selected ? '🟢' : '⚪'}</span>
                      <b>${item.zone}</b>
                    </div>
                    ${item.is_selected ? (
                      item.is_all_regions_allowed ? `
                        <div class="min-tree-zone-badge-all">
                          All ${item.all_regions_count} Regions (${item.total_zone_branches} Br)
                        </div>
                      ` : `
                        <div class="min-tree-zone-badge-partial">
                          ${item.active_regions_count} of ${item.all_regions_count} Regions (${item.total_zone_branches} Br)
                        </div>
                      `
                    ) : `
                      <div class="min-tree-zone-badge-off">
                        Disabled (${item.all_zone_branches_count} Br)
                      </div>
                    `}
                  </div>

                  ${item.is_selected ? `
                    <!-- Stem to regions -->
                    <div class="min-tree-vertical-stem" style="height: 10px; background: #86efac;"></div>

                    <!-- Level 2: Region Leaves -->
                    <div class="min-tree-regions-container">
                      ${item.regions.length > 0 ? item.regions.map(r => `
                        <div class="min-tree-region-leaf">
                          <div style="display: flex; align-items: center; gap: 4px;">
                            <span style="font-weight: 600; color: #15803d;">🔹 ${r.region}</span>
                            <span style="color: #64748b; font-size: 10px; font-weight: 600;">(${r.branch_count} Br)</span>
                          </div>
                          <span class="min-tree-remove-region" data-raw="${r.region}" title="Remove ${r.region}">×</span>
                        </div>
                      `).join('') : `
                        <div style="font-size: 10px; color: #94a3b8; font-style: italic; text-align: center; padding: 4px;">No regions selected</div>
                      `}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <!-- SOL ID BOX (BRANCH WISE - PURE TABLE VIEW) -->
          <div class="min-sol-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="min-box-label" style="min-width: unset;">SOL ID</span>
                <span style="cursor: pointer; color: #0284c7; font-size: 13px; font-weight: 600; text-decoration: underline;" title="Add / Edit SOL IDs" id="min-btn-edit-sol">✏️ Add / Edit SOLs</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <button type="button" class="min-bulk-delete-btn" id="min-btn-bulk-delete-sol" style="display: none;">
                  <span>🗑️ Delete Selected (<b id="min-bulk-sol-count">0</b>)</span>
                </button>
                ${solList.length > 0 ? `
                  <button type="button" class="btn btn-xs btn-link" id="min-btn-clear-sol" style="color: #dc2626; font-size: 11px; padding: 0;">Clear All</button>
                ` : ''}
              </div>
            </div>

            <!-- Direct Table for SOL Branches -->
            ${solList.length > 0 ? `
              <div class="min-branch-table-wrap">
                <table class="min-branch-table" id="min-sol-grid-table">
                  <thead>
                    <tr>
                      <th style="width: 36px; text-align: center;">
                        <input type="checkbox" id="min-sol-chk-all" style="cursor: pointer;" />
                      </th>
                      <th style="width: 100px;">SOL ID</th>
                      <th>Branch Name</th>
                      <th>District</th>
                      <th>Region</th>
                      <th>Zone</th>
                      <th style="width: 50px; text-align: center;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${solList.map(sol => {
                      let b = allBranches.find(x => String(x.sol_id) === String(sol)) || {};
                      return `
                        <tr>
                          <td style="text-align: center;">
                            <input type="checkbox" class="min-sol-row-chk" data-sol="${sol}" style="cursor: pointer;" />
                          </td>
                          <td><b style="color: #16a34a;">${sol}</b></td>
                          <td><b>${b.branch || '-'}</b></td>
                          <td>${b.district || '-'}</td>
                          <td>${b.region || '-'}</td>
                          <td>${b.zone || '-'}</td>
                          <td style="text-align: center;">
                            <span class="min-sol-remove" data-sol="${sol}" title="Delete" style="color: #dc2626; font-size: 15px;">×</span>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 12.5px;">
                No branch SOL IDs added yet. Click <b><a id="min-btn-edit-sol-link" style="color: #0284c7; cursor: pointer;">✏️ Add / Edit SOLs</a></b> above to attach branches.
              </div>
            `}
          </div>
        `}
      </div>
    `;

    page.main.html(html);
    attachEvents();
  }

  function attachEvents() {
    let $m = page.main;
    let meta = state.meta_data || {};
    let masterZones = meta.master_zones || [];
    let allBranches = meta.all_branches || [];

    function sortRegions(list) {
      return [...list].sort((a, b) => {
        let isHoA = String(a).toLowerCase().includes("head office") || String(a).toUpperCase() === "HO";
        let isHoB = String(b).toLowerCase().includes("head office") || String(b).toUpperCase() === "HO";
        if (isHoA && !isHoB) return -1;
        if (!isHoA && isHoB) return 1;
        let numA = parseInt((String(a).match(/\d+/) || [9999])[0], 10);
        let numB = parseInt((String(b).match(/\d+/) || [9999])[0], 10);
        return numA - numB;
      });
    }

    // Geo / Branch Wise Mode Switcher
    $m.find(".min-scope-seg").on("click", function () {
      let targetMode = $(this).data("mode");
      if (state.access_type === targetMode) return;

      state.access_type = targetMode;
      if (targetMode === "Geographical (Zone / Region / District)") {
        state.sol_ids.clear();
      } else {
        state.zones.clear();
        state.regions.clear();
        state.districts.clear();
      }

      renderPage();
      autoSave();
    });

    // Manual Save Button
    $m.find("#min-btn-save-manual").on("click", function () {
      autoSave(true);
    });

    // Select User Dialog
    $m.find("#min-btn-change-user").on("click", function () {
      let d = new frappe.ui.Dialog({
        title: __("Select User"),
        fields: [{ fieldname: "user", fieldtype: "Link", options: "User", label: "User", reqd: 1 }],
        primary_action_label: __("Select User"),
        primary_action: function (values) {
          if (!values.user) return;
          d.hide();
          selectUser(values.user);
        }
      });
      d.show();
    });

    // Toggle Status
    $m.find("#min-toggle-status").on("click", function () {
      state.enabled = state.enabled ? 0 : 1;
      renderPage();
      autoSave();
    });

    // Tag Select
    $m.find("#min-tag-select").on("change", function () {
      state.tag = $(this).val();
      autoSave();
    });

    // Zone Chips & Tree Zone Nodes Click: When Zone selected -> Auto-add all its regions by default!
    $m.find(".min-chip-zone, .min-tree-click-zone").on("click", function () {
      let z = $(this).data("raw");
      let zoneBranches = allBranches.filter(b => b.zone === z);
      let zoneRegions = Array.from(new Set(zoneBranches.map(b => b.region).filter(Boolean)));

      if (state.zones.has(z)) {
        state.zones.delete(z);
        let remainingZoneRegions = new Set(allBranches.filter(b => state.zones.has(b.zone)).map(b => b.region).filter(Boolean));
        zoneRegions.forEach(r => {
          if (!remainingZoneRegions.has(r)) {
            state.regions.delete(r);
          }
        });
      } else {
        state.zones.add(z);
        zoneRegions.forEach(r => state.regions.add(r));
      }
      renderPage();
      autoSave();
    });

    $m.find("#min-chip-zone-all").on("click", function () {
      if (masterZones.every(z => state.zones.has(z))) {
        state.zones.clear();
        state.regions.clear();
      } else {
        masterZones.forEach(z => state.zones.add(z));
        allBranches.map(b => b.region).filter(Boolean).forEach(r => state.regions.add(r));
      }
      renderPage();
      autoSave();
    });

    // Region Chips Click
    $m.find(".min-chip-region").on("click", function () {
      let r = $(this).data("raw");
      if (state.regions.has(r)) {
        state.regions.delete(r);
      } else {
        state.regions.add(r);
      }
      renderPage();
      autoSave();
    });

    // Delete Region from Tree Leaf (× button)
    $m.find(".min-tree-remove-region").on("click", function (e) {
      e.stopPropagation();
      let r = $(this).data("raw");
      state.regions.delete(r);
      renderPage();
      autoSave();
    });

    $m.find("#min-chip-region-all").on("click", function () {
      let availableRegionNames = sortRegions(Array.from(new Set(allBranches.map(b => b.region).filter(Boolean))));
      if (state.zones.size > 0) {
        availableRegionNames = sortRegions(Array.from(new Set(
          allBranches.filter(b => state.zones.has(b.zone)).map(b => b.region).filter(Boolean)
        )));
      }

      if (availableRegionNames.every(r => state.regions.has(r))) {
        availableRegionNames.forEach(r => state.regions.delete(r));
      } else {
        availableRegionNames.forEach(r => state.regions.add(r));
      }
      renderPage();
      autoSave();
    });

    // SOL ID Dialog / Add
    $m.find("#min-btn-edit-sol, #min-btn-edit-sol-link").on("click", function () {
      let d = new frappe.ui.Dialog({
        title: __("Add / Edit Branch SOL IDs"),
        fields: [
          {
            fieldname: "sol_input",
            fieldtype: "Small Text",
            label: "SOL IDs (Comma, Space, or Newline separated)",
            default: Array.from(state.sol_ids).join(", ")
          }
        ],
        primary_action_label: __("Apply & Save"),
        primary_action: function (values) {
          d.hide();
          let tokens = (values.sol_input || "").split(/[,;\s\n\r]+/).map(x => x.trim()).filter(Boolean);
          state.sol_ids = new Set(tokens);
          renderPage();
          autoSave();
        }
      });
      d.show();
    });

    // Remove single SOL ID
    $m.find(".min-sol-remove").on("click", function () {
      let sol = String($(this).data("sol"));
      state.sol_ids.delete(sol);
      renderPage();
      autoSave();
    });

    $m.find("#min-btn-clear-sol").on("click", function () {
      state.sol_ids.clear();
      renderPage();
      autoSave();
    });

    // Table Bulk Selection & Delete Handlers
    function updateBulkDeleteState() {
      let checkedBoxes = $m.find(".min-sol-row-chk:checked");
      let count = checkedBoxes.length;
      let $bulkBtn = $m.find("#min-btn-bulk-delete-sol");
      let $bulkCount = $m.find("#min-bulk-sol-count");

      if (count > 0) {
        $bulkCount.text(count);
        $bulkBtn.show();
      } else {
        $bulkBtn.hide();
      }

      let totalBoxes = $m.find(".min-sol-row-chk").length;
      $m.find("#min-sol-chk-all").prop("checked", totalBoxes > 0 && count === totalBoxes);
    }

    $m.find("#min-sol-chk-all").on("change", function () {
      let isChecked = $(this).is(":checked");
      $m.find(".min-sol-row-chk").prop("checked", isChecked);
      updateBulkDeleteState();
    });

    $m.find(".min-sol-row-chk").on("change", function () {
      updateBulkDeleteState();
    });

    $m.find("#min-btn-bulk-delete-sol").on("click", function () {
      let toDelete = [];
      $m.find(".min-sol-row-chk:checked").each(function () {
        toDelete.push(String($(this).data("sol")));
      });

      if (!toDelete.length) return;

      frappe.confirm(__(`Remove <b>${toDelete.length}</b> selected branches from permission?`), () => {
        toDelete.forEach(sol => state.sol_ids.delete(sol));
        renderPage();
        autoSave();
        frappe.show_alert({ message: __(`${toDelete.length} branches removed ✓`), indicator: "green" });
      });
    });
  }

  initPage();
};
