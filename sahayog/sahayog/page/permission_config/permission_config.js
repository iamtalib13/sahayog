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

  $(wrapper).find(".page-content").css({ padding: "8px 12px", maxWidth: "none" });
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
    meta_data: {},

    // Strong Server-Side Pagination & Employee Filter State
    users: [],
    total_count: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
    search_query: "",
    search_timer: null,
    is_loading_list: false,

    filter_designation: "",
    filter_branch: "",
    employee_meta: {
      designations: [],
      branches: []
    }
  };

  function initPage() {
    // 1. Fetch metadata for designation & branch filter dropdowns
    frappe.call({
      method: "sahayog.sahayog.page.permission_config.permission_config.get_employee_filters_meta",
      callback: (res) => {
        state.employee_meta = res.message || { designations: [], branches: [] };
        
        // 2. Fetch paginated employees
        fetchUserPage(1, "", () => {
          const route = frappe.get_route();
          if (route[2]) {
            selectUser(route[2]);
          } else {
            renderPage();
          }
        });
      }
    });
  }

  // Pure Server-Side Pagination API Caller with SQL Limit & Offset + Designation + Branch Filters
  function fetchUserPage(pageNo, searchQuery, callback) {
    state.is_loading_list = true;
    state.current_page = pageNo || 1;
    state.search_query = searchQuery !== undefined ? searchQuery : state.search_query;

    frappe.call({
      method: "sahayog.sahayog.page.permission_config.permission_config.get_paginated_users",
      args: {
        page: state.current_page,
        page_size: state.page_size,
        search: state.search_query || "",
        designation: state.filter_designation || "",
        branch: state.filter_branch || ""
      },
      callback: (r) => {
        state.is_loading_list = false;
        let data = r.message || {};
        state.users = data.users || [];
        state.total_count = data.total_count || 0;
        state.total_pages = data.total_pages || 1;
        state.current_page = data.page || 1;

        renderSideListOnly();
        if (callback) callback();
      }
    });
  }

  function selectUser(userEmail) {
    state.user = userEmail;
    let sideUser = (state.users || []).find(x => x.user === userEmail || x.employee_id === userEmail);

    frappe.call({
      method: "sahayog.scrm.doctype.report_preference.report_preference.get_widget_meta",
      args: { user: userEmail || "" },
      callback: function (r) {
        state.meta_data = r.message || {};
        let pref = state.meta_data.user_preference;

        state.full_name = (pref && pref.full_name) ? pref.full_name : (state.meta_data.user_full_name || (sideUser ? sideUser.full_name : ""));
        state.user_emp_id = (sideUser && sideUser.employee_id) ? sideUser.employee_id : (state.meta_data.user_emp_id || (userEmail ? userEmail.split('@')[0] : "-"));
        state.enabled = pref && pref.enabled !== undefined ? pref.enabled : 1;
        state.tag = pref ? pref.tag : "";
        state.zones = new Set(pref && pref.zones ? pref.zones : []);
        state.regions = new Set(pref && pref.regions ? pref.regions : []);
        state.districts = new Set(pref && pref.districts ? pref.districts : []);
        state.sol_ids = new Set(pref && pref.sol_ids ? pref.sol_ids : []);

        // Smart access_type resolution:
        let savedAccessType = pref ? pref.access_type : null;
        if (!savedAccessType) {
          if (state.sol_ids.size > 0 && state.zones.size === 0 && state.regions.size === 0) {
            state.access_type = "Specific Branches (SOL ID)";
          } else {
            state.access_type = "Geographical (Zone / Region / District)";
          }
        } else if (savedAccessType === "Geographical (Zone / Region / District)" && state.sol_ids.size > 0 && state.zones.size === 0 && state.regions.size === 0) {
          // If in DB it was set as Geographical, but only sol_ids exist (like 6880, 8751)
          state.access_type = "Specific Branches (SOL ID)";
        } else {
          state.access_type = savedAccessType;
        }

        renderPage();
      }
    });
  }

  function autoSave(show_toast = true) {
    if (!state.user) return;

    let $saveBtn = page.main.find("#min-btn-save-manual");
    if ($saveBtn.length) {
      $saveBtn.text("Saving...").prop("disabled", true).css("background", "#334155").css("border-color", "#334155").css("color", "#fff");
    }

    clearTimeout(state.auto_save_timer);
    state.auto_save_timer = setTimeout(() => {
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
            $saveBtn.text("Saved ✓").prop("disabled", false).css("background", "#16a34a").css("border-color", "#16a34a").css("color", "#fff");
            setTimeout(() => {
              $saveBtn.text("Save").css("background", "").css("border-color", "").css("color", "");
            }, 1000);
          }

          // Update in-memory user preference metadata
          if (state.meta_data) {
            if (!state.meta_data.user_preference) state.meta_data.user_preference = {};
            state.meta_data.user_preference.zones = Array.from(state.zones);
            state.meta_data.user_preference.regions = Array.from(state.regions);
            state.meta_data.user_preference.districts = Array.from(state.districts);
            state.meta_data.user_preference.sol_ids = Array.from(state.sol_ids);
            state.meta_data.user_preference.access_type = state.access_type;
            state.meta_data.user_preference.enabled = state.enabled;
            state.meta_data.user_preference.tag = state.tag;
          }

          // Update list status in memory without re-fetching
          let found = state.users.find(x => x.user === state.user || x.employee_id === state.user);
          if (found) {
            found.tag = state.tag;
            found.enabled = state.enabled;
            found.is_configured = 1;
            found.access_type = state.access_type;
          }

          renderSideListOnly();

          if (r.message && r.message.status === "success") {
            if (show_toast) {
              frappe.show_alert({ message: __("Auto-saved successfully ✓"), indicator: "green" }, 3);
            }
          }
        },
        error: function () {
          if ($saveBtn.length) {
            $saveBtn.text("Save").prop("disabled", false).css("background", "").css("color", "");
          }
        }
      });
    }, 150);
  }

  function showSelectUserDialog() {
    let d = new frappe.ui.Dialog({
      title: __("Add / Select Employee"),
      fields: [
        {
          fieldname: "employee",
          fieldtype: "Link",
          options: "Employee",
          label: "Active Employee",
          get_query: () => {
            return {
              filters: {
                status: "Active",
                user_id: ["is", "set"]
              }
            };
          },
          reqd: 1
        }
      ],
      primary_action_label: __("Select Employee"),
      primary_action: function (values) {
        if (!values.employee) return;
        frappe.db.get_value("Employee", values.employee, ["user_id", "employee_name"], function (r) {
          if (r && r.user_id) {
            d.hide();
            selectUser(r.user_id);
            fetchUserPage(1, values.employee);
          } else {
            frappe.msgprint(__("Selected employee does not have a linked User ID."));
          }
        });
      }
    });
    d.show();
  }

  function renderSideListOnly() {
    let items = state.users || [];
    let startIdx = (state.current_page - 1) * state.page_size;
    let endIdx = Math.min(startIdx + items.length, state.total_count);

    let itemsHtml = items.map(item => {
      let isSelected = state.user === item.user;
      let shortName = item.full_name || item.user.split('@')[0];
      let empId = item.employee_id || item.user.split('@')[0];
      let designation = item.designation || "";
      let branchName = item.branch_name || "";
      let isConfigured = item.is_configured == 1;
      let isEnabled = item.enabled == 1;

      return `
        <div class="min-side-user-item ${isSelected ? 'active' : ''}" data-user="${item.user}">
          <div class="min-side-user-avatar">
            ${shortName.charAt(0).toUpperCase()}
          </div>
          <div class="min-side-user-meta">
            <div class="min-side-user-name" title="${shortName}">${shortName}</div>
            <div class="min-side-user-sub">
              <span><b>ID:</b> ${empId}</span>
              ${designation ? `<span style="color: #475569;" title="${designation}">• ${designation}</span>` : ''}
            </div>
            <div class="min-side-user-branch">
              <span style="color: #0284c7; font-weight: 700;">📍 SOL: ${item.sol_id || '-'}</span>
              <span style="color: #64748b;" title="${branchName}">• ${branchName || 'Unassigned'}</span>
              ${item.tag ? `<span class="min-side-user-tag">${item.tag}</span>` : ''}
            </div>
          </div>
          <div class="min-side-user-status">
            ${isConfigured ? (
              isEnabled ? '<span title="Configured & Active" style="color: #16a34a; font-size: 10px;">🟢</span>' : '<span title="Configured & Inactive" style="color: #94a3b8; font-size: 10px;">⚪</span>'
            ) : '<span title="Not Configured" style="color: #f59e0b; font-size: 10px;">🟡</span>'}
          </div>
        </div>
      `;
    }).join('');

    if (items.length === 0) {
      itemsHtml = `<div style="padding: 24px 12px; text-align: center; color: #94a3b8; font-size: 11.5px;">No active employees found matching criteria</div>`;
    }

    let $listWrap = page.main.find("#min-side-user-list");
    let currentScrollTop = $listWrap.length ? $listWrap.scrollTop() : 0;

    $listWrap.html(itemsHtml);
    $listWrap.scrollTop(currentScrollTop);
    page.main.find("#min-side-header-count").text(state.total_count);
    page.main.find("#min-side-page-info").text(`${state.total_count === 0 ? 0 : startIdx + 1}-${endIdx} of ${state.total_count}`);
    page.main.find("#min-side-page-num").text(`Page ${state.current_page}/${state.total_pages}`);
    page.main.find("#min-side-btn-prev").prop("disabled", state.current_page <= 1);
    page.main.find("#min-side-btn-next").prop("disabled", state.current_page >= state.total_pages);

    // Attach click to side items
    page.main.find(".min-side-user-item").on("click", function () {
      let u = $(this).data("user");
      if (u !== state.user) {
        selectUser(u);
      }
    });
  }

  function updateResetFiltersVisibility() {
    let $m = page.main;
    let selectedBranchObj = (state.employee_meta.branches || []).find(b => b.sol_id === state.filter_branch);
    let selectedBranchLabel = selectedBranchObj ? `${selectedBranchObj.sol_id} - ${selectedBranchObj.branch}` : '';

    let hasFilters = !!(state.filter_designation || state.filter_branch || state.search_query);
    let $wrap = $m.find("#min-side-clear-filters-wrap");

    if (hasFilters) {
      let detailsHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
          <span style="font-size: 9.5px; color: #1e40af; font-weight: 700;">Filtered By:</span>
          <span id="min-side-clear-filters" style="font-size: 10px; color: #dc2626; cursor: pointer; font-weight: 700;">✕ Reset</span>
        </div>
        <div style="font-size: 9.5px; color: #1e3a8a; display: flex; flex-direction: column; gap: 1px;">
          ${state.filter_designation ? `<div>• <b>Desig:</b> ${state.filter_designation}</div>` : ''}
          ${state.filter_branch ? `<div>• <b>Branch:</b> ${selectedBranchLabel}</div>` : ''}
          ${state.search_query ? `<div>• <b>Search:</b> "${state.search_query}"</div>` : ''}
        </div>
      `;
      $wrap.html(detailsHtml).css("display", "flex");

      $wrap.find("#min-side-clear-filters").off("click").on("click", function () {
        state.filter_designation = "";
        state.filter_branch = "";
        state.search_query = "";
        $m.find("#min-side-filter-designation").val("");
        $m.find("#min-side-filter-branch").val("");
        $m.find("#min-side-search-input").val("");
        updateResetFiltersVisibility();
        fetchUserPage(1);
      });
    } else {
      $wrap.hide().empty();
    }
  }

  function renderPage() {
    let meta = state.meta_data || {};
    let tagsList = meta.tags || ["COM", "ROM", "RM", "AZM", "ZM"];
    let masterZones = meta.master_zones || [];
    let allBranches = meta.all_branches || [];
    let isGeo = state.access_type === "Geographical (Zone / Region / District)";
    let userName = state.full_name || (state.user ? state.user.split('@')[0] : "Select User");
    let userEmpId = state.user_emp_id || (state.user ? state.user.split('@')[0] : "-");
    let selectedBranchObj = (state.employee_meta.branches || []).find(b => b.sol_id === state.filter_branch);
    let selectedBranchLabel = selectedBranchObj ? `${selectedBranchObj.sol_id} - ${selectedBranchObj.branch}` : 'All Branches';

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

    let getNormRegion = r => (r && (r.toUpperCase() === "HO" || r.toLowerCase().includes("head office"))) ? "HEAD OFFICE" : r;

    let allRegionNames = sortRegions(Array.from(new Set(allBranches.map(b => getNormRegion(b.region)).filter(Boolean))));
    let availableRegionNames = allRegionNames;
    if (state.zones.size > 0) {
      availableRegionNames = sortRegions(Array.from(new Set(
        allBranches.filter(b => state.zones.has(b.zone)).map(b => getNormRegion(b.region)).filter(Boolean)
      )));
    }

    let regionOptionsMap = new Map();
    availableRegionNames.forEach(r => {
      let isHo = r.toLowerCase().includes("head office") || r.toUpperCase() === "HO";
      let rawVal = isHo ? "HEAD OFFICE" : r;
      let code = isHo ? "HO" : (r.match(/\d+/) || [r])[0];
      if (!regionOptionsMap.has(rawVal)) {
        regionOptionsMap.set(rawVal, { raw: rawVal, label: code });
      }
    });
    let regionOptions = Array.from(regionOptionsMap.values());

    function sortDistricts(list) {
      return [...list].sort((a, b) => String(a).localeCompare(String(b)));
    }

    let allDistrictNames = sortDistricts(Array.from(new Set(allBranches.map(b => b.district).filter(Boolean))));
    let availableDistrictNames = allDistrictNames;
    if (state.zones.size > 0 || state.regions.size > 0) {
      availableDistrictNames = sortDistricts(Array.from(new Set(
        allBranches.filter(b => {
          let matchesZone = state.zones.size === 0 || state.zones.has(b.zone);
          let matchesRegion = state.regions.size === 0 || state.regions.has(b.region) ||
            ((state.regions.has("HEAD OFFICE") || state.regions.has("HO")) && (b.region === "HEAD OFFICE" || b.region === "HO"));
          return matchesZone && matchesRegion;
        }).map(b => b.district).filter(Boolean)
      )));
    }

    let isAllZones = zoneOptions.length > 0 && zoneOptions.every(z => state.zones.has(z.raw));
    let isAllRegions = regionOptions.length > 0 && regionOptions.every(r => state.regions.has(r.raw) || (r.raw === "HEAD OFFICE" && state.regions.has("HO")));
    let isAllDistricts = availableDistrictNames.length > 0 && availableDistrictNames.every(d => state.districts.has(d));

    let hasGeo = state.zones.size > 0 || state.regions.size > 0 || state.districts.size > 0;
    let hasSol = state.sol_ids.size > 0;

    let displayBranches = [...allBranches];
    if (!isGeo) {
      displayBranches.sort((a, b) => {
        let isSelA = state.sol_ids.has(String(a.sol_id)) ? 1 : 0;
        let isSelB = state.sol_ids.has(String(b.sol_id)) ? 1 : 0;
        if (isSelA !== isSelB) {
          return isSelB - isSelA;
        }
        let numA = parseInt(String(a.sol_id), 10) || 0;
        let numB = parseInt(String(b.sol_id), 10) || 0;
        return numA - numB;
      });
    }

    let geoAllowedCount = 0;
    if (hasGeo) {
      geoAllowedCount = allBranches.filter(b => {
        let matchesZone = state.zones.size === 0 || state.zones.has(b.zone);
        let matchesRegion = state.regions.size === 0 || state.regions.has(b.region) ||
          ((state.regions.has("HEAD OFFICE") || state.regions.has("HO")) && (b.region === "HEAD OFFICE" || b.region === "HO"));
        let matchesDistrict = state.districts.size === 0 || state.districts.has(b.district);
        return matchesZone && matchesRegion && matchesDistrict;
      }).length;
    }
    let selectedSolCount = allBranches.filter(b => state.sol_ids.has(String(b.sol_id))).length;


    let mainContentHtml = `
      ${state.user ? `
        <!-- TOP HEADER -->
        <div class="min-perm-header">
          <div>
            <div class="min-perm-title">Permission Details</div>
            <div class="min-perm-subinfo">
              <span><b>Employee Name:</b> ${userName.toUpperCase()}</span>
              <span style="color: #cbd5e1; margin: 0 6px;">|</span>
              <span><b>Employee ID:</b> ${userEmpId}</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="min-toggle-track ${state.enabled ? 'active' : ''}" id="min-toggle-status" title="Toggle Status">
              <div class="min-toggle-thumb"></div>
            </div>

            <select class="form-control input-sm" id="min-tag-select" style="width: auto; height: 24px; font-size: 10.5px; font-weight: 600; border-radius: 4px; border-color: #cbd5e1; padding: 1px 5px;">
              <option value="">No Tag</option>
              ${tagsList.map(t => `<option value="${t}" ${state.tag === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>

            <!-- Clear Permissions Button -->
            <button type="button" class="min-btn-clear-perm" id="min-btn-clear-all-perm" title="Clear all configured permissions for this user">
              <span>🧹 Clear</span>
            </button>

            <button type="button" class="min-btn-save" id="min-btn-save-manual">Save</button>
          </div>
        </div>

        <!-- 1. GEO CONTROLS SECTION -->
        <div class="min-box-row ${!isGeo ? 'min-box-disabled' : ''}">
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
                <span style="font-size: 10.5px; color: #94a3b8; font-style: italic;">No regions available</span>
              `}
            </div>
          </div>

          <!-- District Box -->
          <div class="min-dashed-box">
            <span class="min-box-label">District</span>
            <div class="min-chip-container">
              ${availableDistrictNames.length > 0 ? `
                <div class="min-chip ${isAllDistricts ? 'selected' : ''}" id="min-chip-district-all">ALL</div>
                <div class="dropdown min-district-dropdown-wrap" style="position: relative; display: inline-block;">
                  <button type="button" class="btn btn-xs btn-default dropdown-toggle" id="min-btn-district-drop" style="font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 11px; border-color: #cbd5e1;">
                    🔍 Select (${state.districts.size}) ▾
                  </button>
                  <div class="dropdown-menu min-district-drop-menu" id="min-district-drop-menu" style="width: 250px; padding: 8px; max-height: 280px; overflow-y: auto; right: 0; left: auto; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                    <input type="text" class="form-control input-xs" id="min-district-search" placeholder="🔍 Search district..." style="margin-bottom: 6px; font-size: 10.5px;" />
                    <div id="min-district-checklist" style="max-height: 180px; overflow-y: auto;">
                      ${availableDistrictNames.map(d => {
                        let isChecked = state.districts.has(d);
                        return `
                          <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 500; margin-bottom: 4px; cursor: pointer; color: #334155;">
                            <input type="checkbox" class="min-chk-district" data-raw="${d}" ${isChecked ? 'checked' : ''} />
                            <span>${d}</span>
                          </label>
                        `;
                      }).join('')}
                    </div>
                  </div>
                </div>

                ${Array.from(state.districts).map(d => `
                  <div class="min-chip min-chip-district selected" data-raw="${d}">
                    ${d} <span class="min-remove-dist" data-dist="${d}" style="margin-left: 4px; font-weight: bold; cursor: pointer;">×</span>
                  </div>
                `).join('')}
              ` : `
                <span style="font-size: 10.5px; color: #94a3b8; font-style: italic;">No districts available</span>
              `}
            </div>
          </div>
        </div>

        <!-- 2. MODE TOGGLE -->
        <div class="min-mode-divider-row">
          <div class="min-scope-control">
            <div class="min-scope-seg ${isGeo ? 'active' : ''}" data-mode="Geographical (Zone / Region / District)">
              <span>🌍 Geo Wise</span>
            </div>
            <div class="min-scope-seg ${!isGeo ? 'active' : ''}" data-mode="Specific Branches (SOL ID)">
              <span>🏢 Branch Wise</span>
            </div>
          </div>

          <div style="font-size: 10.5px; font-weight: 600;">
            ${isGeo ? `
              <span style="color: #16a34a;">● Geographical Mode Active</span>
              <span style="color: #94a3b8; margin: 0 4px;">•</span>
              <span style="color: #16a34a;"><b id="min-branch-selected-badge">${geoAllowedCount}</b> / ${allBranches.length} Branches Allowed</span>
            ` : `
              <span style="color: #0284c7;">● Branch Wise Mode Active</span>
              <span style="color: #94a3b8; margin: 0 4px;">•</span>
              <span style="color: #16a34a;"><b id="min-branch-selected-badge">${selectedSolCount}</b> / ${allBranches.length} Branches Allowed</span>
            `}
          </div>
        </div>

        <!-- 3. BRANCH TABLE SECTION (WITH COLUMN-WISE SEARCH HEADERS & DIRECT CHECKBOXES) -->
        <div class="min-sol-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="min-box-label" style="min-width: unset;">Branches Table (Filter by column below)</span>
            ${!isGeo ? `
              <div style="display: flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700;">
                <button type="button" class="btn btn-xs btn-default" id="min-btn-select-all-filtered">Select All Visible</button>
                <button type="button" class="btn btn-xs btn-default" id="min-btn-deselect-all-filtered">Deselect All Visible</button>
              </div>
            ` : `
              <span style="color: #64748b; font-size: 10.5px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; white-space: nowrap;">👁️ Read-Only Preview (${geoAllowedCount} / ${allBranches.length} Allowed)</span>
            `}
          </div>

          ${displayBranches.length > 0 ? `
            <div class="min-branch-table-wrap">
              <table class="min-branch-table" id="min-sol-grid-table">
                <thead>
                  <!-- Column Title Row -->
                  <tr>
                    <th style="width: 40px; text-align: center;">Sr.</th>
                    <th style="width: 32px; text-align: center;">
                      ${!isGeo ? `<input type="checkbox" id="min-sol-chk-all" style="cursor: pointer;" title="Toggle All" />` : ''}
                    </th>
                    <th style="width: 80px;">SOL ID</th>
                    <th>Branch Name</th>
                    <th>Zone</th>
                    <th>Region</th>
                    <th>District</th>
                    <th style="width: 72px; text-align: center;">Status</th>
                  </tr>

                  <!-- Column Search Row -->
                  <tr class="min-filter-header-row">
                    <th></th>
                    <th></th>
                    <th>
                      <input type="text" class="min-col-filter" data-col="sol_id" placeholder="🔍 SOL..." />
                    </th>
                    <th>
                      <input type="text" class="min-col-filter" data-col="branch" placeholder="🔍 Branch..." />
                    </th>
                    <th>
                      <input type="text" class="min-col-filter" data-col="zone" placeholder="🔍 Zone..." />
                    </th>
                    <th>
                      <input type="text" class="min-col-filter" data-col="region" placeholder="🔍 Region..." />
                    </th>
                    <th>
                      <input type="text" class="min-col-filter" data-col="district" placeholder="🔍 District..." />
                    </th>
                    <th style="text-align: center;">
                      <select class="min-col-filter-select" data-col="status">
                        <option value="">All</option>
                        <option value="allowed">Allowed</option>
                        <option value="off">Off</option>
                      </select>
                    </th>
                  </tr>
                </thead>
                <tbody id="min-branch-table-tbody">
                  ${displayBranches.map((b, idx) => {
                    let matchesZone = state.zones.size === 0 || state.zones.has(b.zone);
                    let matchesRegion = state.regions.size === 0 || state.regions.has(b.region) ||
                      ((state.regions.has("HEAD OFFICE") || state.regions.has("HO")) && (b.region === "HEAD OFFICE" || b.region === "HO"));
                    let matchesDistrict = state.districts.size === 0 || state.districts.has(b.district);
                    let matchesGeo = (matchesZone && matchesRegion && matchesDistrict);
                    let isSolChecked = state.sol_ids.has(String(b.sol_id));
                    let isAllowed = isGeo ? (hasGeo ? matchesGeo : isSolChecked) : isSolChecked;

                    return `
                      <tr class="min-branch-data-row ${isAllowed ? 'row-selected' : ''}"
                          data-sol_id="${String(b.sol_id || '').toLowerCase()}"
                          data-branch="${String(b.branch || '').toLowerCase()}"
                          data-district="${String(b.district || '').toLowerCase()}"
                          data-region="${String(b.region || '').toLowerCase()}"
                          data-zone="${String(b.zone || '').toLowerCase()}"
                          data-status="${isAllowed ? 'allowed' : 'off'}">
                        <td style="text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
                        <td style="text-align: center;">
                          ${!isGeo ? `
                            <input type="checkbox" class="min-sol-toggle-chk" data-sol="${b.sol_id}" ${isAllowed ? 'checked' : ''} style="cursor: pointer;" />
                          ` : `
                            <input type="checkbox" ${isAllowed ? 'checked' : ''} disabled title="Allowed via Geographical filter" style="accent-color: #16a34a; cursor: default;" />
                          `}
                        </td>
                        <td><b style="color: ${isAllowed ? '#16a34a' : '#475569'};">${b.sol_id}</b></td>
                        <td><b>${b.branch || '-'}</b></td>
                        <td>${b.zone || '-'}</td>
                        <td>${b.region || '-'}</td>
                        <td>${b.district || '-'}</td>
                        <td style="text-align: center;">
                          ${isAllowed ? `
                            <span style="background: #dcfce7; color: #15803d; font-size: 9.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px;">Allowed</span>
                          ` : `
                            <span style="color: #94a3b8; font-size: 9.5px; font-weight: 600;">Off</span>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="padding: 14px; text-align: center; color: #94a3b8; font-size: 11px;">
              No branches found.
            </div>
          `}
        </div>
      ` : `
        <!-- EMPTY STATE CARD -->
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 380px; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px 20px;">
          <div style="font-size: 44px; margin-bottom: 12px;">👈</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Please Select an Employee</div>
          <div style="font-size: 12px; color: #64748b; max-width: 360px; line-height: 1.5;">
            Select an employee from the left side panel list to view or configure their Report Preference and branch permissions.
          </div>
        </div>
      `}
    `;

    html = `
      <style>
        .min-perm-layout {
          display: flex;
          gap: 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
          color: #24292f;
          min-height: calc(100vh - 160px);
        }

        /* 1. LEFT SIDEBAR PANEL (Server-Side 20-Item Pagination & Filters) */
        .min-side-panel {
          width: 320px;
          min-width: 320px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .min-side-header {
          padding: 8px 10px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: #f8fafc;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }

        .min-side-user-list {
          flex: 1;
          overflow-y: auto;
          max-height: calc(100vh - 300px);
          scrollbar-width: thin;
        }

        .min-side-user-item {
          padding: 8px 10px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .min-side-user-item:hover { background: #f8fafc; }
        .min-side-user-item.active { background: #f0fdf4; border-left: 3px solid #16a34a; }

        .min-side-user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .min-side-user-item.active .min-side-user-avatar {
          background: #dcfce7;
          color: #15803d;
        }

        .min-side-user-meta { flex: 1; min-width: 0; }
        .min-side-user-name { font-size: 11.5px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .min-side-user-sub { font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; }
        .min-side-user-branch { font-size: 9.5px; color: #475569; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 1px; }

        .min-side-user-tag {
          font-size: 8.5px;
          font-weight: 700;
          background: #e0f2fe;
          color: #0369a1;
          padding: 0 4px;
          border-radius: 3px;
        }

        .min-side-footer {
          padding: 6px 10px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10.5px;
          color: #64748b;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
        .min-side-page-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          border-radius: 4px;
          padding: 1px 6px;
          font-size: 10px;
          cursor: pointer;
        }
        .min-side-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* RIGHT MAIN CONTENT */
        .min-main-content {
          flex: 1;
          min-width: 0;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 14px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .min-perm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 8px;
        }
        .min-perm-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .min-perm-subinfo {
          font-size: 11.5px;
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
          padding: 3px 10px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          color: #64748b;
          transition: all 0.15s ease;
          user-select: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .min-scope-seg:hover { color: #0f172a; }
        .min-scope-seg.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }

        .min-toggle-track {
          width: 32px;
          height: 17px;
          background: #cbd5e1;
          border-radius: 9999px;
          position: relative;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .min-toggle-track.active { background: #16a34a; }
        .min-toggle-thumb {
          width: 13px;
          height: 13px;
          background: #ffffff;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .min-toggle-track.active .min-toggle-thumb { transform: translateX(15px); }

        .min-btn-save {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
          border-radius: 5px;
          padding: 3px 12px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .min-btn-save:hover { background: #1e293b; }

        .min-btn-clear-perm {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fca5a5;
          border-radius: 5px;
          padding: 3px 9px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .min-btn-clear-perm:hover {
          background: #fee2e2;
          border-color: #ef4444;
        }

        .min-box-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 8px;
        }
        @media (max-width: 992px) {
          .min-box-row { grid-template-columns: 1fr; }
        }

        .min-dashed-box {
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          padding: 6px 10px;
          background: #ffffff;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .min-box-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #1e293b;
          min-width: 40px;
        }

        .min-chip-container {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
          flex: 1;
        }
        .min-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 21px;
          padding: 0 7px;
          border-radius: 11px;
          font-size: 10.5px;
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

        .min-mode-divider-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0;
          margin-top: 4px;
          margin-bottom: 6px;
          border-top: 1px solid #e2e8f0;
        }

        .min-sol-box {
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          padding: 8px 10px;
          background: #ffffff;
          margin-bottom: 6px;
        }

        .min-branch-table-wrap {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
          margin-top: 6px;
          max-height: 420px;
          overflow-y: auto;
          scrollbar-width: thin;
        }
        .min-branch-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .min-branch-table th {
          background: #f8fafc;
          padding: 5px 8px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .min-branch-table td {
          padding: 5px 8px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }
        .min-branch-table tr:hover { background: #f8fafc; }
        .min-branch-table tr.row-selected { background: #f0fdf4; }

        /* Column Specific Filter Row */
        .min-filter-header-row th {
          background: #f1f5f9 !important;
          padding: 3px 6px !important;
          border-bottom: 1.5px solid #cbd5e1 !important;
          top: 29px !important;
          z-index: 2;
        }
        .min-col-filter {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 3px;
          padding: 2px 5px;
          font-size: 10px;
          outline: none;
          background: #ffffff;
          font-weight: normal;
        }
        .min-col-filter:focus {
          border-color: #0284c7;
        }
        .min-col-filter-select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 3px;
          padding: 1px 3px;
          font-size: 9.5px;
          font-weight: normal;
          outline: none;
          background: #ffffff;
          height: 20px;
        }

        .min-box-disabled {
          opacity: 0.45;
          pointer-events: none;
          user-select: none;
          background: #f8fafc !important;
        }
      </style>

      <div class="min-perm-layout">
        <!-- 1. LEFT SIDEBAR PANEL -->
        <div class="min-side-panel">
          <div class="min-side-header">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 4px;">
                <span>👥 Active Employees</span>
                <span id="min-side-header-count" style="font-size: 10px; background: #e2e8f0; color: #334155; padding: 1px 6px; border-radius: 10px; font-weight: 700;">0</span>
              </div>
              <button type="button" class="btn btn-xs btn-default" id="min-side-btn-add-user" style="font-size: 10px; font-weight: 700;">+ Add</button>
            </div>

            <!-- Sidebar Search Input -->
            <input type="text" class="form-control input-xs" id="min-side-search-input" placeholder="🔍 Search Employee Name, ID, Tag..." value="${state.search_query || ''}" style="font-size: 10.5px; margin-bottom: 6px; border-color: #cbd5e1;" />
            
            <!-- Filter Dropdowns Grid with Explicit Labels -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 4px;">
              <div>
                <label style="font-size: 9.5px; font-weight: 700; color: #475569; margin-bottom: 2px; display: block;">Designation</label>
                <select class="form-control input-xs" id="min-side-filter-designation" style="font-size: 10px; border-color: #cbd5e1; height: 26px; padding: 1px 4px;">
                  <option value="">All Designations (${(state.employee_meta.designations || []).length})</option>
                  ${(state.employee_meta.designations || []).map(d => `
                    <option value="${d}" ${state.filter_designation === d ? 'selected' : ''}>${d}</option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label style="font-size: 9.5px; font-weight: 700; color: #475569; margin-bottom: 2px; display: block;">Branch</label>
                <select class="form-control input-xs" id="min-side-filter-branch" style="font-size: 10px; border-color: #cbd5e1; height: 26px; padding: 1px 4px;">
                  <option value="">All Branches (${(state.employee_meta.branches || []).length})</option>
                  ${(state.employee_meta.branches || []).map(b => `
                    <option value="${b.sol_id}" ${state.filter_branch === b.sol_id ? 'selected' : ''}>${b.sol_id} - ${b.branch}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- Active Filters Badge Container -->
            <div id="min-side-clear-filters-wrap" style="display: none; flex-direction: column; gap: 2px; margin-top: 4px; padding: 4px 6px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px;">
            </div>
          </div>

          <div class="min-side-user-list" id="min-side-user-list">
            <!-- Rendered by renderSideListOnly() -->
          </div>

          <div class="min-side-footer">
            <span id="min-side-page-info">0-0 of 0</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <button type="button" class="min-side-page-btn" id="min-side-btn-prev">◀</button>
              <span id="min-side-page-num" style="font-weight: 600;">Page 1/1</span>
              <button type="button" class="min-side-page-btn" id="min-side-btn-next">▶</button>
            </div>
          </div>
        </div>

        <!-- 2. RIGHT MAIN CONTENT -->
        <div class="min-main-content">
          ${mainContentHtml}
        </div>
      </div>
    `;

    if (page.main.find(".min-side-panel").length > 0) {
      page.main.find(".min-main-content").html(mainContentHtml);
      page.main.find(".min-side-user-item").removeClass("active");
      if (state.user) {
        page.main.find(`.min-side-user-item[data-user="${state.user}"]`).addClass("active");
      }
      page.main.find("#min-side-filter-designation").val(state.filter_designation || "");
      page.main.find("#min-side-filter-branch").val(state.filter_branch || "");
    } else {
      page.main.html(html);
      renderSideListOnly();
    }
    attachEvents();
    updateResetFiltersVisibility();
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

    // Debounced Search Input for Employees Side Panel
    $m.find("#min-side-search-input").off("input").on("input", function () {
      let query = $(this).val();
      clearTimeout(state.search_timer);
      state.search_timer = setTimeout(() => {
        fetchUserPage(1, query);
        updateResetFiltersVisibility();
      }, 300);
    });

    // Designation Filter Select Change
    $m.find("#min-side-filter-designation").off("change").on("change", function () {
      state.filter_designation = $(this).val();
      updateResetFiltersVisibility();
      fetchUserPage(1);
    });

    // Branch Filter Select Change
    $m.find("#min-side-filter-branch").off("change").on("change", function () {
      state.filter_branch = $(this).val();
      updateResetFiltersVisibility();
      fetchUserPage(1);
    });

    // Reset All Side Filters Button
    $m.find("#min-side-clear-filters").off("click").on("click", function () {
      state.filter_designation = "";
      state.filter_branch = "";
      state.search_query = "";
      $m.find("#min-side-filter-designation").val("");
      $m.find("#min-side-filter-branch").val("");
      $m.find("#min-side-search-input").val("");
      updateResetFiltersVisibility();
      fetchUserPage(1);
    });

    // Side Add User Button
    $m.find("#min-side-btn-add-user").on("click", function () {
      showSelectUserDialog();
    });

    // Side Pagination Buttons
    $m.find("#min-side-btn-prev").on("click", function () {
      if (state.current_page > 1) {
        fetchUserPage(state.current_page - 1);
      }
    });

    $m.find("#min-side-btn-next").on("click", function () {
      if (state.current_page < state.total_pages) {
        fetchUserPage(state.current_page + 1);
      }
    });

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

    // Clear All Permissions Button
    $m.find("#min-btn-clear-all-perm").on("click", function () {
      frappe.confirm(
        __("Are you sure you want to clear all configured permissions (Zones, Regions, and Branches) for this user?"),
        () => {
          setTimeout(() => {
            state.zones.clear();
            state.regions.clear();
            state.districts.clear();
            state.sol_ids.clear();
            state.tag = "";

            if (state.meta_data && state.meta_data.user_preference) {
              state.meta_data.user_preference.zones = [];
              state.meta_data.user_preference.regions = [];
              state.meta_data.user_preference.districts = [];
              state.meta_data.user_preference.sol_ids = [];
              state.meta_data.user_preference.tag = "";
            }

            let found = state.users.find(x => x.user === state.user || x.employee_id === state.user);
            if (found) {
              found.tag = "";
              found.is_configured = 0;
            }

            renderPage();
            renderSideListOnly();
            autoSave();
            frappe.show_alert({ message: __("All permissions cleared successfully ✓"), indicator: "green" }, 3);
          }, 50);
        }
      );
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
      let z = String($(this).attr("data-raw") || $(this).data("raw") || "");
      state.access_type = "Geographical (Zone / Region / District)";
      if (state.zones.has(z)) {
        state.zones.delete(z);
      } else {
        state.zones.add(z);
      }
      if (state.zones.size > 0) {
        let validRegions = new Set(allBranches.filter(b => state.zones.has(b.zone)).map(b => b.region).filter(Boolean));
        state.regions.forEach(r => {
          if (!validRegions.has(r)) state.regions.delete(r);
        });
      }
      renderPage();
      autoSave();
    });

    $m.find("#min-chip-zone-all").on("click", function () {
      state.access_type = "Geographical (Zone / Region / District)";
      if (masterZones.length > 0 && masterZones.every(z => state.zones.has(z))) {
        state.zones.clear();
        state.regions.clear();
        state.districts.clear();
      } else {
        masterZones.forEach(z => state.zones.add(z));
        state.regions.clear();
        state.districts.clear();
      }
      renderPage();
      autoSave();
    });

    // Region Chips Click
    $m.find(".min-chip-region").on("click", function () {
      let r = String($(this).attr("data-raw") || $(this).data("raw") || "");
      state.access_type = "Geographical (Zone / Region / District)";
      if (state.regions.has(r)) {
        state.regions.delete(r);
      } else {
        state.regions.add(r);
      }
      renderPage();
      autoSave();
    });

    $m.find("#min-chip-region-all").on("click", function () {
      state.access_type = "Geographical (Zone / Region / District)";
      let getNormRegion = r => (r && (r.toUpperCase() === "HO" || r.toLowerCase().includes("head office"))) ? "HEAD OFFICE" : r;
      let availableRegionNames = sortRegions(Array.from(new Set(allBranches.map(b => getNormRegion(b.region)).filter(Boolean))));
      if (state.zones.size > 0) {
        availableRegionNames = sortRegions(Array.from(new Set(
          allBranches.filter(b => state.zones.has(b.zone)).map(b => getNormRegion(b.region)).filter(Boolean)
        )));
      }

      if (availableRegionNames.length > 0 && availableRegionNames.every(r => state.regions.has(r))) {
        availableRegionNames.forEach(r => state.regions.delete(r));
      } else {
        if (state.zones.size > 0) {
          let validRegions = new Set(availableRegionNames);
          state.regions.forEach(r => {
            if (!validRegions.has(r)) state.regions.delete(r);
          });
        }
        availableRegionNames.forEach(r => state.regions.add(r));
      }
      renderPage();
      autoSave();
    });

    // District Dropdown & Search Handlers
    $m.find("#min-btn-district-drop").on("click", function (e) {
      e.stopPropagation();
      let $menu = $m.find("#min-district-drop-menu");
      $menu.toggle();
      if ($menu.is(":visible")) {
        setTimeout(() => $m.find("#min-district-search").focus(), 50);
      }
    });

    $m.find("#min-district-drop-menu").on("click", function (e) {
      e.stopPropagation();
    });

    $(document).off("click.min_dist_drop_page").on("click.min_dist_drop_page", function () {
      $m.find("#min-district-drop-menu").hide();
    });

    $m.find("#min-district-search").on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      $m.find("#min-district-checklist label").each(function () {
        let txt = $(this).text().toLowerCase();
        $(this).toggle(txt.includes(q));
      });
    });

    $m.find(".min-chk-district").on("change", function () {
      let d = String($(this).attr("data-raw") || $(this).data("raw") || "");
      state.access_type = "Geographical (Zone / Region / District)";
      if ($(this).is(":checked")) {
        state.districts.add(d);
      } else {
        state.districts.delete(d);
      }
      renderPage();
      autoSave();
    });

    $m.find(".min-chip-district").on("click", function (e) {
      if ($(e.target).hasClass("min-remove-dist")) return;
      let d = String($(this).attr("data-raw") || $(this).data("raw") || "");
      state.access_type = "Geographical (Zone / Region / District)";
      if (state.districts.has(d)) {
        state.districts.delete(d);
      } else {
        state.districts.add(d);
      }
      renderPage();
      autoSave();
    });

    $m.find(".min-remove-dist").on("click", function (e) {
      e.stopPropagation();
      let d = String($(this).attr("data-dist") || $(this).data("dist") || "");
      state.access_type = "Geographical (Zone / Region / District)";
      state.districts.delete(d);
      renderPage();
      autoSave();
    });

    $m.find("#min-chip-district-all").on("click", function () {
      state.access_type = "Geographical (Zone / Region / District)";
      let availableDistrictNames = sortDistricts(Array.from(new Set(allBranches.map(b => b.district).filter(Boolean))));
      if (state.zones.size > 0 || state.regions.size > 0) {
        availableDistrictNames = sortDistricts(Array.from(new Set(
          allBranches.filter(b => {
            let matchesZone = state.zones.size === 0 || state.zones.has(b.zone);
            let matchesRegion = state.regions.size === 0 || state.regions.has(b.region);
            return matchesZone && matchesRegion;
          }).map(b => b.district).filter(Boolean)
        )));
      }

      if (availableDistrictNames.length > 0 && availableDistrictNames.every(d => state.districts.has(d))) {
        availableDistrictNames.forEach(d => state.districts.delete(d));
      } else {
        availableDistrictNames.forEach(d => state.districts.add(d));
      }
      renderPage();
      autoSave();
    });

    // Multi-Column Search Filter Logic
    function filterTableRows() {
      let filters = {};
      $m.find(".min-col-filter").each(function () {
        let col = $(this).data("col");
        let val = ($(this).val() || "").toLowerCase().trim();
        if (val) filters[col] = val;
      });

      let statusFilter = $m.find(".min-col-filter-select").val();
      if (statusFilter) filters["status"] = statusFilter;

      $m.find(".min-branch-data-row").each(function () {
        let $row = $(this);
        let match = true;

        for (let col in filters) {
          let rowVal = String($row.data(col) || "");
          if (col === "status") {
            if (rowVal !== filters[col]) {
              match = false;
              break;
            }
          } else {
            if (!rowVal.includes(filters[col])) {
              match = false;
              break;
            }
          }
        }

        if (match) {
          $row.show();
        } else {
          $row.hide();
        }
      });
    }

    $m.find(".min-col-filter").on("input", filterTableRows);
    $m.find(".min-col-filter-select").on("change", filterTableRows);

    // Direct Row Checkbox Toggle: Enable / Disable Branch
    $m.find(".min-sol-toggle-chk").on("change", function () {
      let sol = String($(this).data("sol"));
      let isChecked = $(this).is(":checked");
      if (isChecked) {
        state.sol_ids.add(sol);
      } else {
        state.sol_ids.delete(sol);
      }
      renderPage();
      autoSave();
    });

    // Header Checkbox Toggle All Visible Rows
    $m.find("#min-sol-chk-all").on("change", function () {
      let isChecked = $(this).is(":checked");
      $m.find(".min-branch-data-row:visible .min-sol-toggle-chk").each(function () {
        let sol = String($(this).data("sol"));
        if (isChecked) {
          state.sol_ids.add(sol);
        } else {
          state.sol_ids.delete(sol);
        }
      });
      renderPage();
      autoSave();
    });

    // Quick Select All Filtered
    $m.find("#min-btn-select-all-filtered").on("click", function () {
      $m.find(".min-branch-data-row:visible .min-sol-toggle-chk").each(function () {
        state.sol_ids.add(String($(this).data("sol")));
      });
      renderPage();
      autoSave();
    });

    // Quick Deselect All Filtered
    $m.find("#min-btn-deselect-all-filtered").on("click", function () {
      $m.find(".min-branch-data-row:visible .min-sol-toggle-chk").each(function () {
        state.sol_ids.delete(String($(this).data("sol")));
      });
      renderPage();
      autoSave();
    });
  }

  initPage();
};
