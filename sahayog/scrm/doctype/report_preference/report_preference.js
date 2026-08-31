frappe.ui.form.on("Report Preference", {
  setup: function (frm) {
    frm.meta_data = null;
    frm.state = {
      user: null,
      full_name: "",
      enabled: 1,
      tag: "",
      access_type: "", // Empty for new records so user must select first
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
        if (frm.state.access_type) {
          frm.trigger("calculate_and_render_branches");
        }
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
        if (frm.state.access_type) {
          frm.trigger("calculate_and_render_branches");
        }
      }
    });
  },

  sync_doc_to_widget_state: function (frm) {
    let pref = frm.meta_data.user_preference;

    frm.state.user = frm.doc.user || (pref ? pref.user : "");
    frm.state.full_name = frm.doc.full_name || (pref ? pref.full_name : "");
    frm.state.enabled = frm.doc.enabled !== undefined ? frm.doc.enabled : (pref ? pref.enabled : 1);
    frm.state.tag = frm.doc.tag || (pref ? pref.tag : "");
    
    // Only prefill access_type if editing an existing doc
    if (!frm.is_new() || frm.doc.user) {
      frm.state.access_type = frm.doc.access_type || (pref ? pref.access_type : "");
    } else {
      frm.state.access_type = "";
    }

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
    } else if (frm.state.access_type === "Specific Branches (SOL ID)") {
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
    let masterZones = meta.master_zones || [];
    let masterRegions = meta.master_regions || [];
    let tagsList = meta.tags || ["COM", "ROM", "RM", "AZM", "ZM"];
    let accessType = frm.state.access_type;
    let isGeo = accessType === "Geographical (Zone / Region / District)";
    let isSol = accessType === "Specific Branches (SOL ID)";
    let hasModeChosen = Boolean(accessType);
    let isNewDoc = frm.is_new() || !frm.state.user;

    let html = `
      <style>
        .rp-workspace {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 22px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.03);
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
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .rp-flex-between {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .rp-mode-toggle-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          max-width: 780px;
          margin: 16px auto 8px auto;
        }
        @media (max-width: 680px) {
          .rp-mode-toggle-group {
            grid-template-columns: 1fr;
          }
        }
        .rp-mode-toggle-card {
          background: #ffffff;
          border: 2px solid #cbd5e1;
          border-radius: 12px;
          padding: 24px 20px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          user-select: none;
        }
        .rp-mode-toggle-card:hover {
          border-color: #3b82f6;
          background: #f0f9ff;
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.15);
        }
        .rp-mode-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }
        .rp-mode-title {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 6px;
        }
        .rp-mode-desc {
          font-size: 12px;
          color: #64748b;
          line-height: 1.45;
        }
        .rp-mode-active-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 16px;
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
          padding: 6px 14px;
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
        .rp-top-user-bar {
          display: grid;
          grid-template-columns: 2fr 1.5fr 1fr 1fr;
          gap: 12px;
          align-items: center;
        }
        @media(max-width: 900px) {
          .rp-top-user-bar {
            grid-template-columns: 1fr;
          }
        }
        .rp-toggle-switch {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }
        .rp-toggle-btn {
          width: 38px;
          height: 22px;
          background: #cbd5e1;
          border-radius: 11px;
          position: relative;
          transition: background 0.2s ease;
        }
        .rp-toggle-btn.active {
          background: #22c55e;
        }
        .rp-toggle-knob {
          width: 18px;
          height: 18px;
          background: #ffffff;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .rp-toggle-btn.active .rp-toggle-knob {
          transform: translateX(16px);
        }
        .rp-save-bar {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #e2e8f0;
        }
      </style>

      <div class="rp-workspace">
        <!-- IF NO MODE SELECTED YET: ONLY SHOW THE TWO BIG AREA TOGGLES -->
        ${!hasModeChosen ? `
          <div style="padding: 30px 15px; text-align: center;">
            <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
              🌍 Select Branch Access Scope
            </div>
            <div style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
              Please select the area configuration mode to begin:
            </div>

            <div class="rp-mode-toggle-group">
              <!-- Option 1: Geographical Scope -->
              <div class="rp-mode-toggle-card" data-mode="Geographical (Zone / Region / District)">
                <div class="rp-mode-icon">🌍</div>
                <div class="rp-mode-title">Geographical Scope</div>
                <div class="rp-mode-desc">
                  Select <b>Zones</b> and <b>Regions</b>. All current & future branches in these areas will be <b>automatically accessible</b>.
                </div>
              </div>

              <!-- Option 2: Specific Branches (SOL ID) -->
              <div class="rp-mode-toggle-card" data-mode="Specific Branches (SOL ID)">
                <div class="rp-mode-icon">🏢</div>
                <div class="rp-mode-title">Specific Branches (SOL ID)</div>
                <div class="rp-mode-desc">
                  Select <b>exact standalone branches / SOL IDs</b> individually for strict custom branch access.
                </div>
              </div>
            </div>
          </div>
        ` : `
          <!-- ACTIVE SCOPE BANNER WITH SWITCHER -->
          <div class="rp-mode-active-banner">
            <div>
              <span style="font-size: 11px; font-weight: 600; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">Selected Area Scope:</span>
              <span style="font-size: 13px; font-weight: 700; color: #1e3a8a; margin-left: 6px;">
                ${isGeo ? '🌍 Geographical Scope (Zone / Region / District)' : '🏢 Specific Branches (SOL ID)'}
              </span>
            </div>
            <button type="button" class="btn btn-xs btn-default" id="rp-btn-change-mode" style="font-weight: 600;">
              ⇄ Change Area Scope
            </button>
          </div>

          <!-- USER CONFIGURATION & STATUS -->
          <div class="rp-card-block" style="background: #f1f5f9; border-color: #cbd5e1;">
            <div class="rp-section-title">👤 User Configuration & Status</div>
            
            <div class="rp-top-user-bar">
              <!-- User Selector / Search -->
              <div style="position: relative;">
                <label style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 3px; display: block;">USER (Email / ID)</label>
                ${isNewDoc ? `
                  <div class="rp-branch-search-box" style="margin-bottom: 0;">
                    <input type="text" class="form-control input-sm" id="rp-user-search-input" placeholder="🔍 Search User Name/Email..." value="${frm.state.user || ''}" />
                    <div class="rp-branch-search-dropdown" id="rp-user-search-dropdown"></div>
                  </div>
                ` : `
                  <div style="font-weight: 700; font-size: 13px; color: #0f172a; padding: 6px 10px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px;">
                    ${frm.state.user}
                  </div>
                `}
              </div>

              <!-- Full Name Display -->
              <div>
                <label style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 3px; display: block;">FULL NAME</label>
                <div style="font-weight: 600; font-size: 13px; color: #334155; padding: 6px 10px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; min-height: 31px;">
                  ${frm.state.full_name || (frm.state.user ? "—" : "Select a User")}
                </div>
              </div>

              <!-- Tag Selection -->
              <div>
                <label style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 3px; display: block;">TAG</label>
                <select class="form-control input-sm" id="rp-tag-select">
                  <option value="">No Tag</option>
                  ${tagsList.map(t => `<option value="${t}" ${frm.state.tag === t ? 'selected' : ''}>${t}</option>`).join("")}
                </select>
              </div>

              <!-- Enabled Status Toggle -->
              <div>
                <label style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 3px; display: block;">STATUS</label>
                <div class="rp-toggle-switch" id="rp-toggle-enabled">
                  <div class="rp-toggle-btn ${frm.state.enabled ? 'active' : ''}">
                    <div class="rp-toggle-knob"></div>
                  </div>
                  <span style="font-size: 12px; font-weight: 600; color: ${frm.state.enabled ? '#166534' : '#64748b'};">
                    ${frm.state.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- AREA FILTER CONTROLS DEPENDING ON SCOPE -->
          <div class="rp-card-block">
            <div class="rp-section-title">📍 Configure ${isGeo ? 'Geographical Filters' : 'Specific Branches'}</div>

            <!-- GEOGRAPHICAL MODE VIEW -->
            ${isGeo ? `
              <div id="rp-geo-mode-view">
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
            ` : `
              <!-- SOL ID SPECIFIC MODE VIEW -->
              <div id="rp-sol-mode-view">
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
            `}
          </div>

          <!-- ACTIVE BRANCH COVERAGE DRILLDOWN -->
          <div id="rp-branch-coverage-slot"></div>

          <!-- SAVE & ACTIONS BAR -->
          <div class="rp-save-bar">
            <button type="button" class="btn btn-sm btn-default" id="rp-btn-discard">Discard Changes</button>
            <button type="button" class="btn btn-sm btn-primary" id="rp-btn-direct-save">💾 Save Preferences</button>
          </div>
        `}
      </div>
    `;

    frm.fields_dict.widget_html.$wrapper.html(html);
    frm.trigger("attach_widget_events");
  },

  attach_widget_events: function (frm) {
    let $w = frm.fields_dict.widget_html.$wrapper;
    let meta = frm.meta_data || {};

    // Initial Area Toggle Card Click
    $w.find(".rp-mode-toggle-card").on("click", function () {
      let mode = $(this).data("mode");
      frm.state.access_type = mode;
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("render_full_crud_widget");
      frm.trigger("calculate_and_render_branches");
    });

    // Change Area Scope Button
    $w.find("#rp-btn-change-mode").on("click", function () {
      let current = frm.state.access_type;
      let target = current === "Geographical (Zone / Region / District)" 
        ? "Specific Branches (SOL ID)" 
        : "Geographical (Zone / Region / District)";

      frappe.confirm(
        __(`Switch Area Scope to <b>${target}</b>?<br><small class="text-muted">Previous filter selections will be cleared for consistency.</small>`),
        () => {
          frm.state.access_type = target;
          frm.state.zones.clear();
          frm.state.regions.clear();
          frm.state.districts.clear();
          frm.state.sol_ids.clear();
          frm.trigger("sync_widget_state_to_doc");
          frm.trigger("render_full_crud_widget");
          frm.trigger("calculate_and_render_branches");
        }
      );
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
                <div class="rp-branch-search-item rp-user-pick-item disabled-user" data-user="${u.name}" data-fullname="${u.full_name || ''}" data-already="1" data-pref="${u.pref_docname || ''}" style="display:flex; justify-content:space-between; align-items:center; background:#fff7ed; cursor:not-allowed; opacity:0.85;">
                  <div>
                    <b style="color:#c2410c;">${u.name}</b> <span class="text-muted">(${u.full_name || ''})</span>
                  </div>
                  <span class="badge" style="background:#ffedd5; color:#9a3412; font-size:10px; padding:2px 6px; border:1px solid #fed7aa; border-radius:4px;">Already Added</span>
                </div>
              `;
            }
            return `
              <div class="rp-branch-search-item rp-user-pick-item" data-user="${u.name}" data-fullname="${u.full_name || ''}" data-already="0">
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

    // Tag Change
    $w.find("#rp-tag-select").on("change", function () {
      frm.state.tag = $(this).val();
      frm.trigger("sync_widget_state_to_doc");
    });

    // Toggle Enabled
    $w.find("#rp-toggle-enabled").on("click", function () {
      frm.state.enabled = !frm.state.enabled;
      let $btn = $(this).find(".rp-toggle-btn");
      let $label = $(this).find("span");

      if (frm.state.enabled) {
        $btn.addClass("active");
        $label.text("Active").css("color", "#166534");
      } else {
        $btn.removeClass("active");
        $label.text("Disabled").css("color", "#64748b");
      }
      frm.trigger("sync_widget_state_to_doc");
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
        $userDropdown.hide();
      }
    });

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
      if (!frm.state.user) {
        frappe.msgprint(__("Please select a User first."));
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
        frm.trigger("render_coverage_view");
      }
    });
  },

  render_coverage_view: function (frm) {
    let $slot = frm.fields_dict.widget_html.$wrapper.find("#rp-branch-coverage-slot");
    if (!$slot.length) return;

    let branches = frm.resolved_branches || [];
    let count = branches.length;

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

    let treeHtml = `
      <style>
        .rp-drill-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .rp-drill-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 10px;
        }
        .rp-drill-title {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
        }
        .rp-badge-primary {
          background: #e0f2fe;
          color: #0369a1;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .rp-drill-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rp-drill-search {
          max-width: 220px;
          padding: 4px 10px;
          font-size: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
        }
        .rp-tree-container {
          max-height: 380px;
          overflow-y: auto;
          padding: 10px 14px;
        }
        .rp-tree-zone {
          margin-bottom: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
        }
        .rp-zone-head {
          background: #f1f5f9;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
          transition: background 0.15s ease;
        }
        .rp-zone-head:hover {
          background: #e2e8f0;
        }
        .rp-zone-body {
          padding: 8px 10px;
          background: #ffffff;
        }
        .rp-tree-region {
          margin-bottom: 6px;
          border: 1px solid #edf2f7;
          border-left: 3px solid #3b82f6;
          border-radius: 4px;
          overflow: hidden;
        }
        .rp-region-head {
          background: #f8fafc;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        }
        .rp-region-head:hover {
          background: #f1f5f9;
        }
        .rp-region-body {
          padding: 6px 8px;
          background: #ffffff;
        }
        .rp-tree-district {
          margin-bottom: 4px;
          border: 1px dashed #cbd5e1;
          border-radius: 4px;
          overflow: hidden;
        }
        .rp-district-head {
          background: #fafafa;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        }
        .rp-district-head:hover {
          background: #f1f5f9;
        }
        .rp-district-body {
          padding: 6px 8px;
          background: #ffffff;
        }
        .rp-branch-grid-item {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .rp-branch-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 9px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 11px;
          color: #334155;
        }
        .rp-branch-pill-badge .sol-code {
          font-family: monospace;
          font-weight: 700;
          color: #0284c7;
        }
        .rp-count-chip {
          background: #f1f5f9;
          color: #475569;
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
        }
        .rp-arrow-icon {
          display: inline-block;
          transition: transform 0.2s ease;
          font-size: 10px;
          margin-right: 6px;
        }
        .rp-arrow-icon.collapsed {
          transform: rotate(-90deg);
        }
      </style>

      <div class="rp-drill-card">
        <div class="rp-drill-header">
          <div class="rp-drill-title">
            <span>🏢 Active Branch Coverage</span>
            <span class="rp-badge-primary" id="rp-drill-total-badge">${count} Branches</span>
          </div>

          <div class="rp-drill-controls">
            <button type="button" class="btn btn-xs btn-default" id="rp-btn-expand-all">▾ Expand All</button>
            <button type="button" class="btn btn-xs btn-default" id="rp-btn-collapse-all">▸ Collapse All</button>
            <input type="text" class="rp-drill-search" id="rp-drill-search-input" placeholder="🔍 Quick search branch/SOL..." />
          </div>
        </div>

        <div class="rp-tree-container">
          ${count === 0 ? `
            <div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 13px;">
              No branches matching current filters. Select Zones/Regions or SOL IDs above.
            </div>
          ` : `
            <div id="rp-drill-tree-root">
              ${Object.keys(tree).map(z => {
                let zoneBranchCount = Object.values(tree[z]).reduce((acc, reg) => 
                  acc + Object.values(reg).reduce((a, dist) => a + dist.length, 0), 0);
                let regionCount = Object.keys(tree[z]).length;

                return `
                  <div class="rp-tree-zone rp-filter-node">
                    <div class="rp-zone-head">
                      <div>
                        <span class="rp-arrow-icon">▼</span>
                        <span><b>ZONE:</b> ${z}</span>
                      </div>
                      <div style="display: flex; gap: 6px;">
                        <span class="rp-count-chip">${regionCount} Regions</span>
                        <span class="rp-badge-primary">${zoneBranchCount} Branches</span>
                      </div>
                    </div>
                    <div class="rp-zone-body">
                      ${Object.keys(tree[z]).map(r => {
                        let regBranchCount = Object.values(tree[z][r]).reduce((a, dist) => a + dist.length, 0);
                        let distCount = Object.keys(tree[z][r]).length;

                        return `
                          <div class="rp-tree-region rp-filter-node">
                            <div class="rp-region-head">
                              <div>
                                <span class="rp-arrow-icon">▼</span>
                                <span><b>REGION:</b> ${r}</span>
                              </div>
                              <div style="display: flex; gap: 6px;">
                                <span class="rp-count-chip">${distCount} Districts</span>
                                <span class="rp-badge-primary" style="background:#f0fdf4; color:#166534;">${regBranchCount} Branches</span>
                              </div>
                            </div>
                            <div class="rp-region-body">
                              ${Object.keys(tree[z][r]).map(d => {
                                let distBranches = tree[z][r][d];
                                return `
                                  <div class="rp-tree-district rp-filter-node">
                                    <div class="rp-district-head">
                                      <div>
                                        <span class="rp-arrow-icon">▼</span>
                                        <span><b>DISTRICT:</b> ${d}</span>
                                      </div>
                                      <span class="rp-count-chip">${distBranches.length} Branches</span>
                                    </div>
                                    <div class="rp-district-body">
                                      <div class="rp-branch-grid-item">
                                        ${distBranches.map(b => `
                                          <div class="rp-branch-pill-badge rp-branch-leaf" data-search="${String(b.sol_id)} ${b.branch || ''} ${d} ${r} ${z}">
                                            <span class="sol-code">${b.sol_id}</span>
                                            <span>${b.branch || ''}</span>
                                          </div>
                                        `).join("")}
                                      </div>
                                    </div>
                                  </div>
                                `;
                              }).join("")}
                            </div>
                          </div>
                        `;
                      }).join("")}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          `}
        </div>
      </div>
    `;

    $slot.html(treeHtml);

    // Collapsible Handlers
    $slot.find(".rp-zone-head").on("click", function () {
      let $body = $(this).next(".rp-zone-body");
      let $arrow = $(this).find(".rp-arrow-icon");
      $body.slideToggle(150);
      $arrow.toggleClass("collapsed");
    });

    $slot.find(".rp-region-head").on("click", function () {
      let $body = $(this).next(".rp-region-body");
      let $arrow = $(this).find(".rp-arrow-icon");
      $body.slideToggle(150);
      $arrow.toggleClass("collapsed");
    });

    $slot.find(".rp-district-head").on("click", function () {
      let $body = $(this).next(".rp-district-body");
      let $arrow = $(this).find(".rp-arrow-icon");
      $body.slideToggle(150);
      $arrow.toggleClass("collapsed");
    });

    $slot.find("#rp-btn-expand-all").on("click", function () {
      $slot.find(".rp-zone-body, .rp-region-body, .rp-district-body").slideDown(150);
      $slot.find(".rp-arrow-icon").removeClass("collapsed");
    });

    $slot.find("#rp-btn-collapse-all").on("click", function () {
      $slot.find(".rp-zone-body, .rp-region-body, .rp-district-body").slideUp(150);
      $slot.find(".rp-arrow-icon").addClass("collapsed");
    });

    // Real-time search filter in drilldown tree
    $slot.find("#rp-drill-search-input").on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      let totalVisible = 0;

      if (!q) {
        $slot.find(".rp-branch-leaf, .rp-filter-node").show();
        $slot.find("#rp-drill-total-badge").text(`${count} Branches`);
        return;
      }

      $slot.find(".rp-zone-body, .rp-region-body, .rp-district-body").show();
      $slot.find(".rp-arrow-icon").removeClass("collapsed");

      $slot.find(".rp-tree-district").each(function () {
        let districtHasMatch = false;
        $(this).find(".rp-branch-leaf").each(function () {
          let sText = ($(this).data("search") || "").toLowerCase();
          let match = sText.includes(q);
          $(this).toggle(match);
          if (match) {
            districtHasMatch = true;
            totalVisible++;
          }
        });
        $(this).toggle(districtHasMatch);
      });

      $slot.find(".rp-tree-region").each(function () {
        let hasVisibleDistricts = $(this).find(".rp-tree-district:visible").length > 0;
        $(this).toggle(hasVisibleDistricts);
      });

      $slot.find(".rp-tree-zone").each(function () {
        let hasVisibleRegions = $(this).find(".rp-tree-region:visible").length > 0;
        $(this).toggle(hasVisibleRegions);
      });

      $slot.find("#rp-drill-total-badge").text(`${totalVisible} / ${count} Branches`);
    });
  }
});
