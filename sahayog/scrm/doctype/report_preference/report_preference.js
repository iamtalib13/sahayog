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
        frm.trigger("render_minimal_widget");
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
        frm.trigger("render_minimal_widget");
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

    let $saveBtn = frm.fields_dict.widget_html ? frm.fields_dict.widget_html.$wrapper.find("#min-btn-save-manual") : null;
    if ($saveBtn && $saveBtn.length) {
      $saveBtn.text("Saving...").prop("disabled", true);
    }

    frm.save("Save", function () {
      if ($saveBtn && $saveBtn.length) {
        $saveBtn.text("Saved ✓").prop("disabled", false).css("background", "#16a34a").css("color", "#fff");
        setTimeout(() => {
          $saveBtn.text("Save").css("background", "").css("color", "");
        }, 1200);
      }
      if (show_toast) {
        frappe.show_alert({ message: __("Changes saved successfully ✓"), indicator: "green" });
      }
    }, null, function () {
      if ($saveBtn && $saveBtn.length) {
        $saveBtn.text("Save").prop("disabled", false).css("background", "").css("color", "");
      }
    });
  },

  before_save: function (frm) {
    frm.trigger("sync_widget_state_to_doc");
  },

  after_save: function (frm) {
    frm.trigger("sync_doc_to_widget_state");
    frm.trigger("render_minimal_widget");
  },

  show_select_user_dialog: function (frm) {
    let d = new frappe.ui.Dialog({
      title: __("Select User"),
      fields: [{ fieldname: "user", fieldtype: "Link", options: "User", label: "User", reqd: 1 }],
      primary_action_label: __("Select User"),
      primary_action: function (values) {
        if (!values.user) return;

        frappe.db.get_value("Report Preference", { user: values.user }, ["name", "user"], function (res) {
          if (res && res.name && res.name !== frm.doc.name) {
            frappe.msgprint({
              title: __("User Already Configured"),
              indicator: "orange",
              message: __(
                `Report Preference is already configured for user <b>${values.user}</b>.<br><br>` +
                `Ek user ke liye sirf ek hi Report Preference record ban sakta hai.<br><br>` +
                `<a class="btn btn-xs btn-primary" href="/app/report-preference/${res.name}">Click Here to Open Existing Record</a>`
              )
            });
            return;
          }

          d.hide();
          frm.state.user = values.user;
          frm.doc.user = values.user;
          frm.trigger("load_user_preference_into_widget");
        });
      }
    });
    d.show();
  },

  render_minimal_widget: function (frm) {
    if (!frm.fields_dict.widget_html) return;

    // IF NO USER SELECTED YET -> SHOW SELECT USER PROMPT ONLY
    if (!frm.state.user) {
      let initialHtml = `
        <style>
          .min-initial-card {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
            border: 1.5px dashed #cbd5e1;
            border-radius: 10px;
            background: #ffffff;
            padding: 40px 24px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 16px auto;
            max-width: 580px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          }
          .min-initial-btn {
            background: #0f172a;
            color: #ffffff;
            border: 1px solid #0f172a;
            padding: 8px 24px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.15s ease;
          }
          .min-initial-btn:hover {
            background: #1e293b;
          }
        </style>
        <div class="min-initial-card">
          <div style="font-size: 38px; margin-bottom: 12px;">👤</div>
          <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Select User to Configure Preferences</div>
          <div style="font-size: 12.5px; color: #64748b; margin-bottom: 20px; line-height: 1.5;">
            Report Preference configure karne ke liye pehle user select karein.<br>
            User select karte hi Geographical aur Branch-Wise controls open ho jayenge.
          </div>
          <button type="button" class="min-initial-btn" id="min-btn-initial-select-user">
            <span>🔍 Select User</span>
          </button>
        </div>
      `;
      frm.fields_dict.widget_html.$wrapper.html(initialHtml);
      frm.fields_dict.widget_html.$wrapper.find("#min-btn-initial-select-user").on("click", function () {
        frm.trigger("show_select_user_dialog");
      });
      return;
    }

    let meta = frm.meta_data || {};
    let tagsList = meta.tags || ["COM", "ROM", "RM", "AZM", "ZM"];
    let masterZones = meta.master_zones || [];
    let allBranches = meta.all_branches || [];
    let isGeo = frm.state.access_type === "Geographical (Zone / Region / District)";
    let userName = frm.state.full_name || (frm.state.user ? frm.state.user.split('@')[0] : "Select User");
    let userEmpId = frm.state.user ? frm.state.user.split('@')[0] : "-";
    let isNewDoc = frm.is_new() || !frm.doc.name;

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
    if (frm.state.zones.size > 0) {
      availableRegionNames = sortRegions(Array.from(new Set(
        allBranches.filter(b => frm.state.zones.has(b.zone)).map(b => b.region).filter(Boolean)
      )));
    }

    let regionOptions = availableRegionNames.map(r => {
      let code = r.toLowerCase().includes("head office") ? "HO" : (r.match(/\d+/) || [r])[0];
      return { raw: r, label: code };
    });

    let isAllZones = zoneOptions.length > 0 && zoneOptions.every(z => frm.state.zones.has(z.raw));
    let isAllRegions = regionOptions.length > 0 && regionOptions.every(r => frm.state.regions.has(r.raw));

    let displayBranches = [];
    if (isGeo) {
      if (frm.state.zones.size > 0) {
        displayBranches = allBranches.filter(b => {
          let matchesZone = frm.state.zones.has(b.zone);
          let matchesRegion = frm.state.regions.size === 0 || frm.state.regions.has(b.region);
          return matchesZone && matchesRegion;
        });
      }
    } else {
      let solSet = frm.state.sol_ids;
      displayBranches = Array.from(solSet).map(sol => {
        let b = allBranches.find(x => String(x.sol_id) === String(sol));
        return b || { sol_id: sol, branch: "-", district: "-", region: "-", zone: "-" };
      });
    }

    let solList = Array.from(frm.state.sol_ids);

    let html = `
      <style>
        .min-perm-card {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
          color: #24292f;
          padding: 4px 0;
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
          scrollbar-width: thin;
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

        .min-box-disabled {
          opacity: 0.45;
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
              ${isNewDoc ? `
                <span style="margin-left: 8px;">
                  <button type="button" class="btn btn-xs btn-default" id="min-btn-change-user">🔍 Change User</button>
                </span>
              ` : ''}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <!-- Active Toggle -->
            <div class="min-toggle-track ${frm.state.enabled ? 'active' : ''}" id="min-toggle-status" title="Toggle Status">
              <div class="min-toggle-thumb"></div>
            </div>

            <!-- Tag Dropdown -->
            <select class="form-control input-sm" id="min-tag-select" style="width: auto; height: 26px; font-size: 11px; font-weight: 600; border-radius: 5px; border-color: #cbd5e1; padding: 2px 6px;">
              <option value="">No Tag</option>
              ${tagsList.map(t => `<option value="${t}" ${frm.state.tag === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>

            <!-- Save Button -->
            <button type="button" class="min-btn-save" id="min-btn-save-manual">Save</button>
          </div>
        </div>

        <!-- 1. GEO CONTROLS SECTION (Zone & Region Chips) -->
        <div class="min-box-row ${!isGeo ? 'min-box-disabled' : ''}">
          <!-- Zone Box -->
          <div class="min-dashed-box">
            <span class="min-box-label">Zone</span>
            <div class="min-chip-container">
              <div class="min-chip ${isAllZones ? 'selected' : ''}" id="min-chip-zone-all">ALL</div>
              ${zoneOptions.map(z => `
                <div class="min-chip min-chip-zone ${frm.state.zones.has(z.raw) ? 'selected' : ''}" data-raw="${z.raw}">${z.label}</div>
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
                  <div class="min-chip min-chip-region ${frm.state.regions.has(r.raw) ? 'selected' : ''}" data-raw="${r.raw}">${r.label}</div>
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

        <!-- 3. BRANCH / SOL TABLE SECTION (ALWAYS SCROLLABLE, NON-EDITABLE IN GEO MODE) -->
        <div class="min-sol-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="min-box-label" style="min-width: unset;">SOL ID / Branch Table</span>
              ${!isGeo ? `
                <span style="cursor: pointer; color: #0284c7; font-size: 11.5px; font-weight: 600; text-decoration: underline;" title="Add / Edit SOL IDs" id="min-btn-edit-sol">✏️ Add / Edit SOLs</span>
              ` : `
                <span style="color: #64748b; font-size: 11px; background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">👁️ Read-Only Preview (${displayBranches.length} Branches) • Scroll to inspect</span>
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

          <!-- Direct Table for SOL Branches (Always Scrollable!) -->
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
                frm.state.zones.size === 0 ? '👈 Select a <b>Zone</b> above to view accessible branches.' : 'No branches match the selected Zone/Region criteria.'
              ) : (
                'No branch SOL IDs added yet. Click <b><a id="min-btn-edit-sol-link" style="color: #0284c7; cursor: pointer;">✏️ Add / Edit SOLs</a></b> above to attach branches.'
              )}
            </div>
          `}
        </div>
      </div>
    `;

    frm.fields_dict.widget_html.$wrapper.html(html);
    frm.trigger("attach_minimal_events");
  },

  attach_minimal_events: function (frm) {
    let $w = frm.fields_dict.widget_html.$wrapper;
    let meta = frm.meta_data || {};
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
    $w.find(".min-scope-seg").on("click", function () {
      let targetMode = $(this).data("mode");
      if (frm.state.access_type === targetMode) return;

      frm.state.access_type = targetMode;
      frm.trigger("render_minimal_widget");
      frm.trigger("auto_save_preference");
    });

    // Manual Save Button
    $w.find("#min-btn-save-manual").on("click", function () {
      frm.trigger("auto_save_preference", true);
    });

    // Select User Dialog with Duplicate Validation
    $w.find("#min-btn-change-user").on("click", function () {
      frm.trigger("show_select_user_dialog");
    });

    // Toggle Status
    $w.find("#min-toggle-status").on("click", function () {
      frm.state.enabled = frm.state.enabled ? 0 : 1;
      frm.trigger("render_minimal_widget");
      frm.trigger("auto_save_preference");
    });

    // Tag Select
    $w.find("#min-tag-select").on("change", function () {
      frm.state.tag = $(this).val();
      frm.trigger("auto_save_preference");
    });

    // Zone Chips Click
    $w.find(".min-chip-zone").on("click", function () {
      let z = $(this).data("raw");
      if (frm.state.zones.has(z)) {
        frm.state.zones.delete(z);
      } else {
        frm.state.zones.add(z);
      }
      frm.trigger("render_minimal_widget");
      frm.trigger("auto_save_preference");
    });

    $w.find("#min-chip-zone-all").on("click", function () {
      if (masterZones.every(z => frm.state.zones.has(z))) {
        frm.state.zones.clear();
      } else {
        masterZones.forEach(z => frm.state.zones.add(z));
      }
      frm.trigger("render_minimal_widget");
      frm.trigger("auto_save_preference");
    });

    // Region Chips Click
    $w.find(".min-chip-region").on("click", function () {
      let r = $(this).data("raw");
      if (frm.state.regions.has(r)) {
        frm.state.regions.delete(r);
      } else {
        frm.state.regions.add(r);
      }
      frm.trigger("render_minimal_widget");
      frm.trigger("auto_save_preference");
    });

    $w.find("#min-chip-region-all").on("click", function () {
      let availableRegionNames = sortRegions(Array.from(new Set(allBranches.map(b => b.region).filter(Boolean))));
      if (frm.state.zones.size > 0) {
        availableRegionNames = sortRegions(Array.from(new Set(
          allBranches.filter(b => frm.state.zones.has(b.zone)).map(b => b.region).filter(Boolean)
        )));
      }

      if (availableRegionNames.every(r => frm.state.regions.has(r))) {
        availableRegionNames.forEach(r => frm.state.regions.delete(r));
      } else {
        availableRegionNames.forEach(r => frm.state.regions.add(r));
      }
      frm.trigger("render_minimal_widget");
      frm.trigger("auto_save_preference");
    });

    // SOL ID Dialog / Add
    $w.find("#min-btn-edit-sol, #min-btn-edit-sol-link").on("click", function () {
      let d = new frappe.ui.Dialog({
        title: __("Add / Edit Branch SOL IDs"),
        fields: [
          {
            fieldname: "sol_input",
            fieldtype: "Small Text",
            label: "SOL IDs (Comma, Space, or Newline separated)",
            default: Array.from(frm.state.sol_ids).join(", ")
          }
        ],
        primary_action_label: __("Apply & Save"),
        primary_action: function (values) {
          d.hide();
          let tokens = (values.sol_input || "").split(/[,;\s\n\r]+/).map(x => x.trim()).filter(Boolean);
          frm.state.sol_ids = new Set(tokens);
          frm.trigger("render_minimal_widget");
          frm.trigger("auto_save_preference");
        }
      });
      d.show();
    });

    // Remove single SOL ID from table row
    $w.find(".min-sol-remove").on("click", function () {
      let sol = String($(this).data("sol"));
      frm.state.sol_ids.delete(sol);
      frm.trigger("render_minimal_widget");
      frm.trigger("auto_save_preference");
    });

    $w.find("#min-btn-clear-sol").on("click", function () {
      frm.state.sol_ids.clear();
      frm.trigger("render_minimal_widget");
      frm.trigger("auto_save_preference");
    });

    // Table Bulk Selection & Delete Handlers
    function updateBulkDeleteState() {
      let checkedBoxes = $w.find(".min-sol-row-chk:checked");
      let count = checkedBoxes.length;
      let $bulkBtn = $w.find("#min-btn-bulk-delete-sol");
      let $bulkCount = $w.find("#min-bulk-sol-count");

      if (count > 0) {
        $bulkCount.text(count);
        $bulkBtn.show();
      } else {
        $bulkBtn.hide();
      }

      let totalBoxes = $w.find(".min-sol-row-chk").length;
      $w.find("#min-sol-chk-all").prop("checked", totalBoxes > 0 && count === totalBoxes);
    }

    $w.find("#min-sol-chk-all").on("change", function () {
      let isChecked = $(this).is(":checked");
      $w.find(".min-sol-row-chk").prop("checked", isChecked);
      updateBulkDeleteState();
    });

    $w.find(".min-sol-row-chk").on("change", function () {
      updateBulkDeleteState();
    });

    $w.find("#min-btn-bulk-delete-sol").on("click", function () {
      let toDelete = [];
      $w.find(".min-sol-row-chk:checked").each(function () {
        toDelete.push(String($(this).data("sol")));
      });

      if (!toDelete.length) return;

      frappe.confirm(__(`Remove <b>${toDelete.length}</b> selected branches from permission?`), () => {
        toDelete.forEach(sol => frm.state.sol_ids.delete(sol));
        frm.trigger("render_minimal_widget");
        frm.trigger("auto_save_preference");
        frappe.show_alert({ message: __(`${toDelete.length} branches removed ✓`), indicator: "green" });
      });
    });
  }
});
