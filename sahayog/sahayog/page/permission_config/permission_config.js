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

  $(wrapper).find(".page-content").css({ padding: "12px 16px", maxWidth: "none" });
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

    let displayBranches = [];
    if (isGeo) {
      if (state.zones.size > 0) {
        displayBranches = allBranches.filter(b => {
          let matchesZone = state.zones.has(b.zone);
          let matchesRegion = state.regions.size === 0 || state.regions.has(b.region);
          return matchesZone && matchesRegion;
        });
      }
    } else {
      let solSet = state.sol_ids;
      displayBranches = Array.from(solSet).map(sol => {
        let b = allBranches.find(x => String(x.sol_id) === String(sol));
        return b || { sol_id: sol, branch: "-", district: "-", region: "-", zone: "-" };
      });
    }

    let solList = Array.from(state.sol_ids);

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
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 10px;
        }
        .min-perm-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .min-perm-subinfo {
          font-size: 12px;
          color: #475569;
        }

        .min-scope-control {
          display: inline-flex;
          background: #f1f5f9;
          padding: 2px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
        }
        .min-scope-seg {
          padding: 3px 12px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          color: #64748b;
          transition: all 0.15s ease;
          user-select: none;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .min-scope-seg:hover { color: #0f172a; }
        .min-scope-seg.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }

        .min-toggle-track {
          width: 34px;
          height: 18px;
          background: #cbd5e1;
          border-radius: 9999px;
          position: relative;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .min-toggle-track.active { background: #16a34a; }
        .min-toggle-thumb {
          width: 14px;
          height: 14px;
          background: #ffffff;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .min-toggle-track.active .min-toggle-thumb { transform: translateX(16px); }

        .min-btn-save {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
          border-radius: 5px;
          padding: 3px 12px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .min-btn-save:hover { background: #1e293b; }

        .min-box-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 8px;
          transition: opacity 0.2s ease;
        }
        @media (max-width: 768px) {
          .min-box-row { grid-template-columns: 1fr; }
        }

        .min-dashed-box {
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          padding: 8px 12px;
          background: #ffffff;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .min-box-label {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          min-width: 40px;
        }

        .min-chip-container {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          flex: 1;
        }
        .min-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 22px;
          padding: 0 8px;
          border-radius: 11px;
          font-size: 11px;
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

        /* Mode Switcher Divider Row */
        .min-mode-divider-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          margin-top: 6px;
          margin-bottom: 8px;
          border-top: 1px solid #e2e8f0;
        }

        .min-sol-box {
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          padding: 10px 14px;
          background: #ffffff;
          margin-bottom: 8px;
          transition: opacity 0.2s ease;
        }
        .min-sol-remove { cursor: pointer; font-size: 13px; font-weight: bold; line-height: 1; }
        .min-sol-remove:hover { color: #dc2626; }

        .min-branch-table-wrap {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
          margin-top: 8px;
          max-height: 380px;
          overflow-y: auto;
        }
        .min-branch-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
        .min-branch-table th {
          background: #f8fafc;
          padding: 6px 10px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .min-branch-table td {
          padding: 6px 10px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }
        .min-branch-table tr:hover { background: #f8fafc; }

        .min-bulk-delete-btn {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fca5a5;
          padding: 2px 8px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.15s ease;
        }
        .min-bulk-delete-btn:hover {
          background: #fee2e2;
          border-color: #ef4444;
        }

        .min-section-disabled {
          opacity: 0.55;
          pointer-events: none;
          user-select: none;
          background: #f8fafc !important;
        }
      </style>

      <div class="min-perm-card">
        <!-- TOP HEADER (Info, Status, Tag, Save) -->
        <div class="min-perm-header">
          <div>
            <div class="min-perm-title">Permission Details</div>
            <div class="min-perm-subinfo">
              <span><b>Employee Name:</b> ${userName.toUpperCase()}</span>
              <span style="color: #cbd5e1; margin: 0 6px;">|</span>
              <span><b>Employee ID:</b> ${userEmpId}</span>
              <span style="margin-left: 8px;">
                <button type="button" class="btn btn-xs btn-default" id="min-btn-change-user">🔍 Select User</button>
              </span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="min-toggle-track ${state.enabled ? 'active' : ''}" id="min-toggle-status" title="Toggle Status">
              <div class="min-toggle-thumb"></div>
            </div>

            <select class="form-control input-sm" id="min-tag-select" style="width: auto; height: 26px; font-size: 11px; font-weight: 600; border-radius: 5px; border-color: #cbd5e1; padding: 2px 6px;">
              <option value="">No Tag</option>
              ${tagsList.map(t => `<option value="${t}" ${state.tag === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>

            <button type="button" class="min-btn-save" id="min-btn-save-manual">Save</button>
          </div>
        </div>

        <!-- 1. GEO CONTROLS SECTION (Zone & Region Chips) -->
        <div class="min-box-row ${!isGeo ? 'min-section-disabled' : ''}">
          <div class="min-dashed-box">
            <span class="min-box-label">Zone</span>
            <div class="min-chip-container">
              <div class="min-chip ${isAllZones ? 'selected' : ''}" id="min-chip-zone-all">ALL</div>
              ${zoneOptions.map(z => `
                <div class="min-chip min-chip-zone ${state.zones.has(z.raw) ? 'selected' : ''}" data-raw="${z.raw}">${z.label}</div>
              `).join('')}
            </div>
          </div>

          <div class="min-dashed-box">
            <span class="min-box-label">Region</span>
            <div class="min-chip-container">
              ${regionOptions.length > 0 ? `
                <div class="min-chip ${isAllRegions ? 'selected' : ''}" id="min-chip-region-all">ALL</div>
                ${regionOptions.map(r => `
                  <div class="min-chip min-chip-region ${state.regions.has(r.raw) ? 'selected' : ''}" data-raw="${r.raw}">${r.label}</div>
                `).join('')}
              ` : `
                <span style="font-size: 11px; color: #94a3b8; font-style: italic;">No regions available</span>
              `}
            </div>
          </div>
        </div>

        <!-- 2. MODE TOGGLE (NICHE RKHO GEO CONTROLS K) -->
        <div class="min-mode-divider-row">
          <div class="min-scope-control">
            <div class="min-scope-seg ${isGeo ? 'active' : ''}" data-mode="Geographical (Zone / Region / District)">
              <span>🌍 Geo Wise</span>
            </div>
            <div class="min-scope-seg ${!isGeo ? 'active' : ''}" data-mode="Specific Branches (SOL ID)">
              <span>🏢 Branch Wise</span>
            </div>
          </div>

          <div style="font-size: 11px; font-weight: 600;">
            ${isGeo ? `
              <span style="color: #16a34a;">● Geographical Mode Active</span>
              <span style="color: #94a3b8; margin: 0 4px;">•</span>
              <span style="color: #64748b;">${displayBranches.length} Branches Accessible</span>
            ` : `
              <span style="color: #0284c7;">● Branch Wise Mode Active</span>
              <span style="color: #94a3b8; margin: 0 4px;">•</span>
              <span style="color: #64748b;">${solList.length} SOLs Configured</span>
            `}
          </div>
        </div>

        <!-- 3. BRANCH / SOL TABLE SECTION (ALWAYS VISIBLE, DISABLED IN GEO MODE) -->
        <div class="min-sol-box ${isGeo ? 'min-section-disabled' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="min-box-label" style="min-width: unset;">SOL ID / Branch Table</span>
              ${!isGeo ? `
                <span style="cursor: pointer; color: #0284c7; font-size: 11.5px; font-weight: 600; text-decoration: underline;" title="Add / Edit SOL IDs" id="min-btn-edit-sol">✏️ Add / Edit SOLs</span>
              ` : `
                <span style="color: #94a3b8; font-size: 11px; font-style: italic;">(Auto-Resolved from Geo selection • Switch to Branch Wise to manually edit)</span>
              `}
            </div>

            ${!isGeo ? `
              <div style="display: flex; align-items: center; gap: 8px;">
                <button type="button" class="min-bulk-delete-btn" id="min-btn-bulk-delete-sol" style="display: none;">
                  <span>🗑️ Delete Selected (<b id="min-bulk-sol-count">0</b>)</span>
                </button>
                ${solList.length > 0 ? `
                  <button type="button" class="btn btn-xs btn-link" id="min-btn-clear-sol" style="color: #dc2626; font-size: 11px; padding: 0;">Clear All</button>
                ` : ''}
              </div>
            ` : ''}
          </div>

          ${displayBranches.length > 0 ? `
            <div class="min-branch-table-wrap">
              <table class="min-branch-table" id="min-sol-grid-table">
                <thead>
                  <tr>
                    ${!isGeo ? `
                      <th style="width: 32px; text-align: center;">
                        <input type="checkbox" id="min-sol-chk-all" style="cursor: pointer;" />
                      </th>
                    ` : ''}
                    <th style="width: 85px;">SOL ID</th>
                    <th>Branch Name</th>
                    <th>District</th>
                    <th>Region</th>
                    <th>Zone</th>
                    ${!isGeo ? `<th style="width: 44px; text-align: center;">Action</th>` : ''}
                  </tr>
                </thead>
                <tbody>
                  ${displayBranches.map(b => `
                    <tr>
                      ${!isGeo ? `
                        <td style="text-align: center;">
                          <input type="checkbox" class="min-sol-row-chk" data-sol="${b.sol_id}" style="cursor: pointer;" />
                        </td>
                      ` : ''}
                      <td><b style="color: #16a34a;">${b.sol_id}</b></td>
                      <td><b>${b.branch || '-'}</b></td>
                      <td>${b.district || '-'}</td>
                      <td>${b.region || '-'}</td>
                      <td>${b.zone || '-'}</td>
                      ${!isGeo ? `
                        <td style="text-align: center;">
                          <span class="min-sol-remove" data-sol="${b.sol_id}" title="Delete" style="color: #dc2626; font-size: 14px;">×</span>
                        </td>
                      ` : ''}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 11.5px;">
              ${isGeo ? (
                state.zones.size === 0 ? '👈 Select a <b>Zone</b> above to view accessible branches.' : 'No branches match the selected Zone/Region criteria.'
              ) : (
                'No branch SOL IDs added yet. Click <b><a id="min-btn-edit-sol-link" style="color: #0284c7; cursor: pointer;">✏️ Add / Edit SOLs</a></b> above to attach branches.'
              )}
            </div>
          `}
        </div>
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

    // Zone Chips Click
    $m.find(".min-chip-zone").on("click", function () {
      let z = $(this).data("raw");
      if (state.zones.has(z)) {
        state.zones.delete(z);
      } else {
        state.zones.add(z);
      }
      renderPage();
      autoSave();
    });

    $m.find("#min-chip-zone-all").on("click", function () {
      if (masterZones.every(z => state.zones.has(z))) {
        state.zones.clear();
      } else {
        masterZones.forEach(z => state.zones.add(z));
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

    $m.find("#min-chip-region-all").on("click", function () {
      let availableRegionNames = sortRegions(Array.from(new Set(allBranches.map(b => b.region).filter(Boolean))));
      if (state.zones.size > 0) {
        availableRegionNames = sortRegions(Array.from(new Set(
          allBranches.filter(b => state.zones.has(b.zone)).map(b => b.region).filter(Boolean)
        )));
      }

      if (availableRegionNames.every(r => state.regions.has(r))) {
        state.regions.clear();
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
