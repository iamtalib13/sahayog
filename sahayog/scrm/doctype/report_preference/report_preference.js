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

        /* Hero Mode Switcher (Step 1) */
        .rp-hero-box {
          background: #ffffff;
          border: 1px solid var(--rp-border);
          border-radius: 14px;
          padding: 40px 24px;
          text-align: center;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04);
        }
        .rp-hero-header {
          max-width: 520px;
          margin: 0 auto 28px auto;
        }
        .rp-hero-title {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--rp-primary);
          margin-bottom: 6px;
        }
        .rp-hero-subtitle {
          font-size: 13px;
          color: var(--rp-text-muted);
          line-height: 1.5;
        }
        .rp-hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          max-width: 680px;
          margin: 0 auto;
        }
        @media (max-width: 640px) {
          .rp-hero-grid {
            grid-template-columns: 1fr;
          }
        }
        .rp-hero-card {
          background: #ffffff;
          border: 1.5px solid var(--rp-border);
          border-radius: 12px;
          padding: 24px 20px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
        }
        .rp-hero-card:hover {
          border-color: var(--rp-accent);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.1);
        }
        .rp-hero-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: var(--rp-surface-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          margin-bottom: 14px;
          border: 1px solid var(--rp-border);
          transition: all 0.2s ease;
        }
        .rp-hero-card:hover .rp-hero-icon {
          background: var(--rp-accent-bg);
          border-color: var(--rp-accent-border);
        }
        .rp-hero-card-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--rp-primary);
          margin-bottom: 6px;
        }
        .rp-hero-card-desc {
          font-size: 12px;
          color: var(--rp-text-muted);
          line-height: 1.45;
        }

        /* Active Workspace Container */
        .rp-workspace-card {
          background: #ffffff;
          border: 1px solid var(--rp-border);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.03);
        }

        /* Top Bar */
        .rp-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          background: #ffffff;
          border-bottom: 1px solid var(--rp-border);
          gap: 12px;
          flex-wrap: wrap;
        }
        .rp-mode-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          background: var(--rp-accent-bg);
          border: 1px solid var(--rp-accent-border);
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          color: var(--rp-accent);
        }
        .rp-btn-ghost {
          background: transparent;
          border: 1px solid var(--rp-border);
          border-radius: 6px;
          padding: 5px 10px;
          font-size: 11px;
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
        .rp-btn-primary {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
          border-radius: 6px;
          padding: 6px 14px;
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
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* Minimal Sub-Card */
        .rp-subcard {
          background: var(--rp-surface-subtle);
          border: 1px solid var(--rp-border);
          border-radius: 10px;
          padding: 16px 18px;
        }
        .rp-subcard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .rp-subcard-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--rp-text-muted);
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
          color: var(--rp-text-muted);
          margin-bottom: 4px;
          display: block;
        }
        .rp-box-display {
          background: #ffffff;
          border: 1px solid var(--rp-border);
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

        /* Chips Grid */
        .rp-chips-group {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .rp-pill-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 11.5px;
          font-weight: 500;
          cursor: pointer;
          background: #ffffff;
          color: #475569;
          border: 1px solid var(--rp-border);
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
        }
        .rp-pill-chip:hover {
          border-color: #94a3b8;
          background: #f1f5f9;
        }
        .rp-pill-chip.selected {
          background: #ecfdf5;
          color: #065f46;
          border-color: #6ee7b7;
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(16, 185, 129, 0.12);
        }
        .rp-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .rp-pill-chip.selected .rp-dot {
          background: #10b981;
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
          border: 1px solid var(--rp-border);
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
          background: var(--rp-surface-subtle);
        }

        /* Dismissible Tag */
        .rp-tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #dbeafe;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 500;
        }
        .rp-tag-remove {
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          line-height: 1;
          color: #93c5fd;
        }
        .rp-tag-remove:hover {
          color: #ef4444;
        }

        /* Direct Clean Table Card */
        .rp-table-section-card {
          background: #ffffff;
          border: 1px solid var(--rp-border);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .rp-table-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--rp-surface-subtle);
          border-bottom: 1px solid var(--rp-border);
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
          max-width: 240px;
          padding: 5px 12px;
          font-size: 12px;
          border: 1px solid var(--rp-border);
          border-radius: 6px;
          outline: none;
          background: #ffffff;
        }
        .rp-table-search-box:focus {
          border-color: var(--rp-accent);
        }

        /* Table Structure */
        .rp-table-scroll-wrap {
          max-height: 380px;
          overflow-y: auto;
        }
        .rp-minimal-grid-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .rp-minimal-grid-table th {
          position: sticky;
          top: 0;
          background: #f8fafc;
          color: #475569;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: left;
          padding: 9px 14px;
          border-bottom: 1px solid var(--rp-border);
          z-index: 2;
        }
        .rp-minimal-grid-table td {
          padding: 8px 14px;
          border-bottom: 1px solid var(--rp-border-light);
          color: #334155;
          vertical-align: middle;
        }
        .rp-minimal-grid-table tbody tr:hover {
          background-color: #f8fafc;
        }
        .rp-sol-pill {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-weight: 700;
          font-size: 11.5px;
          color: var(--rp-accent);
          background: #eff6ff;
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid #dbeafe;
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
      </style>

      <div class="rp-root">
        <!-- STEP 1: INITIAL MINIMAL HERO AREA TOGGLE -->
        ${!hasModeChosen ? `
          <div class="rp-hero-box">
            <div class="rp-hero-header">
              <div class="rp-hero-title">Select Branch Access Mode</div>
              <div class="rp-hero-subtitle">Choose how report and branch permissions should be scoped for this user:</div>
            </div>

            <div class="rp-hero-grid">
              <!-- Geographical Scope Card -->
              <div class="rp-hero-card" data-mode="Geographical (Zone / Region / District)">
                <div class="rp-hero-icon">🌍</div>
                <div class="rp-hero-card-title">Geographical Scope</div>
                <div class="rp-hero-card-desc">
                  Select <b>Zones</b> and <b>Regions</b>. All current & future branches in these areas will be automatically accessible.
                </div>
              </div>

              <!-- Specific Branches Card -->
              <div class="rp-hero-card" data-mode="Specific Branches (SOL ID)">
                <div class="rp-hero-icon">🏢</div>
                <div class="rp-hero-card-title">Specific Branches (SOL ID)</div>
                <div class="rp-hero-card-desc">
                  Assign <b>exact standalone branches / SOL IDs</b> individually for granular custom access.
                </div>
              </div>
            </div>
          </div>
        ` : `
          <!-- MAIN WORKSPACE AFTER AREA SELECTION -->
          <div class="rp-workspace-card">
            <!-- Top Bar Header -->
            <div class="rp-top-bar">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="rp-mode-pill">
                  <span>${isGeo ? '🌍 Geographical Scope' : '🏢 Specific Branches'}</span>
                </span>
                <button type="button" class="rp-btn-ghost" id="rp-btn-change-mode">
                  ⇄ Switch Mode
                </button>
              </div>

              <div style="display: flex; align-items: center; gap: 8px;">
                <button type="button" class="rp-btn-ghost" id="rp-btn-discard">Discard</button>
                <button type="button" class="rp-btn-primary" id="rp-btn-direct-save">
                  <span>💾</span>
                  <span>Save Preferences</span>
                </button>
              </div>
            </div>

            <div class="rp-content-body">
              <!-- Sub-Card 1: User & Identity -->
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

              <!-- Sub-Card 2: Area Scope Filters -->
              <div class="rp-subcard">
                <div class="rp-subcard-header">
                  <span class="rp-subcard-label">
                    ${isGeo ? 'Geographical Filters (Zone & Region Selection)' : 'Specific Branches Selection'}
                  </span>
                </div>

                ${isGeo ? `
                  <div>
                    <!-- Zones -->
                    <div style="margin-bottom: 12px;">
                      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="font-size: 11.5px; font-weight: 600; color: #475569;">Zones (Auto-includes current & future branches):</span>
                        <button type="button" class="btn btn-xs btn-link text-muted" id="rp-clear-zones" style="padding:0; font-size:11px;">Clear</button>
                      </div>
                      <div class="rp-chips-group">
                        ${masterZones.map(z => `
                          <div class="rp-pill-chip rp-zone-chip ${frm.state.zones.has(z) ? 'selected' : ''}" data-zone="${z}">
                            <span class="rp-dot"></span>
                            <span>${z}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>

                    <!-- Regions -->
                    <div>
                      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="font-size: 11.5px; font-weight: 600; color: #475569;">Regions:</span>
                        <button type="button" class="btn btn-xs btn-link text-muted" id="rp-clear-regions" style="padding:0; font-size:11px;">Clear</button>
                      </div>
                      <div class="rp-chips-group">
                        ${masterRegions.map(r => `
                          <div class="rp-pill-chip rp-region-chip ${frm.state.regions.has(r) ? 'selected' : ''}" data-region="${r}">
                            <span class="rp-dot"></span>
                            <span>${r}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  </div>
                ` : `
                  <div>
                    <div class="rp-search-wrapper" style="margin-bottom: 10px;">
                      <input type="text" class="form-control input-sm" id="rp-sol-search-input" placeholder="Type Branch Name or SOL ID to add..." />
                      <div class="rp-dropdown-popover" id="rp-sol-search-dropdown"></div>
                    </div>

                    <div>
                      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="font-size: 11.5px; font-weight: 600; color: #64748b;">Selected Branches (${frm.state.sol_ids.size}):</span>
                        <button type="button" class="btn btn-xs btn-link text-danger" id="rp-clear-all-sols" style="padding:0; font-size:11px;">Remove All</button>
                      </div>
                      <div class="rp-chips-group" id="rp-selected-sols-tags">
                        ${Array.from(frm.state.sol_ids).map(s => {
                          let b = (meta.all_branches || []).find(x => String(x.sol_id) === String(s));
                          let label = b ? `${s} - ${b.branch}` : s;
                          return `
                            <div class="rp-tag-badge" data-sol="${s}">
                              <span>${label}</span>
                              <span class="rp-tag-remove" data-sol="${s}">&times;</span>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  </div>
                `}
              </div>

              <!-- Direct Clean Table View -->
              <div id="rp-branch-coverage-slot"></div>
            </div>
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

    // Initial Hero Toggle Cards
    $w.find(".rp-hero-card").on("click", function () {
      let mode = $(this).data("mode");
      frm.state.access_type = mode;
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("render_full_crud_widget");
      frm.trigger("calculate_and_render_branches");
    });

    // Switch Mode Button
    $w.find("#rp-btn-change-mode").on("click", function () {
      let current = frm.state.access_type;
      let target = current === "Geographical (Zone / Region / District)" 
        ? "Specific Branches (SOL ID)" 
        : "Geographical (Zone / Region / District)";

      frappe.confirm(
        __(`Switch Area Scope to <b>${target}</b>?<br><small class="text-muted">Current filter selections will be cleared for consistency.</small>`),
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
    let $solDropdown = $w.find("#rp-sol-search-dropdown");

    $solInput.on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      if (!q) {
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
        <div class="rp-dropdown-row rp-sol-pick-item" data-sol="${b.sol_id}">
          <div><b>${b.sol_id}</b> - ${b.branch || ""}</div>
          <span class="text-muted" style="font-size:10.5px;">${b.zone || ""}, ${b.region || ""}</span>
        </div>
      `).join("");

      $solDropdown.html(itemsHtml).show();
    });

    $solDropdown.on("click", ".rp-sol-pick-item", function () {
      let sol = String($(this).data("sol"));
      frm.state.sol_ids.add(sol);
      $solInput.val("");
      $solDropdown.hide().empty();
      frm.trigger("sync_widget_state_to_doc");
      frm.trigger("render_full_crud_widget");
      frm.trigger("calculate_and_render_branches");
    });

    $(document).on("click", function (e) {
      if (!$(e.target).closest(".rp-search-wrapper").length) {
        $solDropdown.hide();
        $userDropdown.hide();
      }
    });

    $w.find(".rp-tag-remove").on("click", function () {
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

    // Save Button
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
        frm.trigger("render_direct_table_view");
      }
    });
  },

  render_direct_table_view: function (frm) {
    let $slot = frm.fields_dict.widget_html.$wrapper.find("#rp-branch-coverage-slot");
    if (!$slot.length) return;

    let branches = frm.resolved_branches || [];
    let totalCount = branches.length;

    let tableHtml = `
      <div class="rp-table-section-card">
        <!-- Top Toolbar -->
        <div class="rp-table-top-bar">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">
              🏢 Active Branch Coverage
            </span>
            <span class="rp-table-badge" id="rp-table-live-count">${totalCount} Branches</span>
          </div>

          <input type="text" class="rp-table-search-box" id="rp-table-filter-search" placeholder="🔍 Search branch, SOL, zone..." />
        </div>

        <!-- Direct Clean Table -->
        <div class="rp-table-scroll-wrap">
          ${totalCount === 0 ? `
            <div style="padding: 32px; text-align: center; color: #94a3b8; font-size: 12.5px;">
              No branches matching current filters. Select Zones/Regions or SOL IDs above.
            </div>
          ` : `
            <table class="rp-minimal-grid-table" id="rp-branch-grid-table">
              <thead>
                <tr>
                  <th style="width: 100px;">SOL ID</th>
                  <th>Branch Name</th>
                  <th style="width: 140px;">Zone</th>
                  <th style="width: 140px;">Region</th>
                  <th style="width: 160px;">District</th>
                </tr>
              </thead>
              <tbody>
                ${branches.map(b => `
                  <tr class="rp-table-branch-row" data-search="${String(b.sol_id)} ${b.branch || ''} ${b.district || ''} ${b.region || ''} ${b.zone || ''}">
                    <td><span class="rp-sol-pill">${b.sol_id || '-'}</span></td>
                    <td><b>${b.branch || '-'}</b></td>
                    <td><span class="rp-tag-micro">${b.zone || '-'}</span></td>
                    <td><span class="rp-tag-micro">${b.region || '-'}</span></td>
                    <td><span class="rp-tag-micro">${b.district || '-'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;

    $slot.html(tableHtml);

    // Instant Search
    $slot.find("#rp-table-filter-search").on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      let visibleCount = 0;

      $slot.find(".rp-table-branch-row").each(function () {
        let rowSearch = ($(this).data("search") || "").toLowerCase();
        let isVisible = (!q || rowSearch.includes(q));
        $(this).toggle(isVisible);
        if (isVisible) visibleCount++;
      });

      $slot.find("#rp-table-live-count").text(
        q ? `${visibleCount} / ${totalCount} Branches` : `${totalCount} Branches`
      );
    });
  }
});
