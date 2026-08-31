frappe.ui.form.on("Report Preference", {
  setup: function (frm) {
    frm.selected_roles = new Set();
    frm.resolved_branches = [];
  },

  refresh: function (frm) {
    frm.trigger("render_role_control");
    frm.trigger("load_user_roles");
    frm.trigger("refresh_branch_preview");

    if (frm.is_new()) {
      frm.add_custom_button(__("Search User"), function () {
        frm.trigger("show_user_search_dialog");
      });
    }

    frm.add_custom_button(__("Refresh Preview"), function () {
      frm.trigger("refresh_branch_preview");
    });
  },

  user: function (frm) {
    if (frm.doc.user) {
      frm.trigger("load_user_roles");
    }
  },

  access_type: function (frm) {
    frm.trigger("refresh_branch_preview");
  },

  zone_add: function (frm) { frm.trigger("debounced_preview"); },
  zone_remove: function (frm) { frm.trigger("debounced_preview"); },
  region_add: function (frm) { frm.trigger("debounced_preview"); },
  region_remove: function (frm) { frm.trigger("debounced_preview"); },
  state_add: function (frm) { frm.trigger("debounced_preview"); },
  state_remove: function (frm) { frm.trigger("debounced_preview"); },
  district_add: function (frm) { frm.trigger("debounced_preview"); },
  district_remove: function (frm) { frm.trigger("debounced_preview"); },
  sol_id_add: function (frm) { frm.trigger("debounced_preview"); },
  sol_id_remove: function (frm) { frm.trigger("debounced_preview"); },

  debounced_preview: function (frm) {
    if (frm._preview_timeout) clearTimeout(frm._preview_timeout);
    frm._preview_timeout = setTimeout(() => {
      frm.trigger("refresh_branch_preview");
    }, 250);
  },

  before_save: function (frm) {
    // Sync roles to user
    if (frm.doc.user && frm.selected_roles) {
      frappe.call({
        method: "sahayog.scrm.doctype.report_preference.report_preference.sync_user_roles",
        args: {
          user: frm.doc.user,
          roles: Array.from(frm.selected_roles)
        },
        async: false
      });
    }
  },

  load_user_roles: function (frm) {
    if (!frm.doc.user) return;
    frappe.call({
      method: "sahayog.scrm.doctype.report_preference.report_preference.get_user_roles",
      args: { user: frm.doc.user },
      callback: function (r) {
        let roles = r.message || [];
        frm.selected_roles = new Set(roles);
        frm.trigger("update_role_pills_ui");
      }
    });
  },

  render_role_control: function (frm) {
    const rolesList = [
      { key: "HR", label: "HR Report" },
      { key: "MIS", label: "MIS Report" },
      { key: "Loan", label: "Loan Report" },
      { key: "Audit", label: "Audit Report" },
      { key: "Finance", label: "Finance Report" },
      { key: "Operation", label: "Operation Report" },
      { key: "TW", label: "Two Wheeler Report" },
      { key: "Branch", label: "Branch Report" },
      { key: "Admin", label: "Report Admin" },
      { key: "Vigilance", label: "Vigilance Report" },
      { key: "JLL", label: "JLL Report" },
      { key: "IT", label: "IT Report" },
    ];

    let html = `
      <style>
        .rp-roles-container {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 8px;
        }
        .rp-roles-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .rp-roles-title {
          font-size: 12px;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .rp-roles-actions {
          display: flex;
          gap: 6px;
        }
        .rp-roles-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .rp-role-chip {
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
        .rp-role-chip:hover {
          border-color: #94a3b8;
          background: #f1f5f9;
        }
        .rp-role-chip.active {
          background: #e6f4ea;
          color: #137333;
          border-color: #34a853;
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(52, 168, 83, 0.15);
        }
        .rp-role-chip .rp-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .rp-role-chip.active .rp-dot {
          background: #34a853;
        }
      </style>
      <div class="rp-roles-container">
        <div class="rp-roles-header">
          <div class="rp-roles-title">⚡ Assigned Department / Finacle Roles</div>
          <div class="rp-roles-actions">
            <button type="button" class="btn btn-xs btn-default" id="rp-select-all-roles">Select All</button>
            <button type="button" class="btn btn-xs btn-default" id="rp-clear-all-roles">Clear</button>
          </div>
        </div>
        <div class="rp-roles-grid" id="rp-roles-chip-grid">
          ${rolesList.map(r => `
            <div class="rp-role-chip" data-role="${r.key}">
              <span class="rp-dot"></span>
              <span>${r.label}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    frm.fields_dict.roles_html.$wrapper.html(html);

    // Event listeners
    frm.fields_dict.roles_html.$wrapper.find(".rp-role-chip").on("click", function () {
      let role = $(this).data("role");
      if (frm.selected_roles.has(role)) {
        frm.selected_roles.delete(role);
      } else {
        frm.selected_roles.add(role);
      }
      frm.trigger("update_role_pills_ui");
      frm.dirty();
    });

    frm.fields_dict.roles_html.$wrapper.find("#rp-select-all-roles").on("click", function () {
      rolesList.forEach(r => frm.selected_roles.add(r.key));
      frm.trigger("update_role_pills_ui");
      frm.dirty();
    });

    frm.fields_dict.roles_html.$wrapper.find("#rp-clear-all-roles").on("click", function () {
      frm.selected_roles.clear();
      frm.trigger("update_role_pills_ui");
      frm.dirty();
    });
  },

  update_role_pills_ui: function (frm) {
    if (!frm.fields_dict.roles_html) return;
    frm.fields_dict.roles_html.$wrapper.find(".rp-role-chip").each(function () {
      let role = $(this).data("role");
      if (frm.selected_roles && frm.selected_roles.has(role)) {
        $(this).addClass("active");
      } else {
        $(this).removeClass("active");
      }
    });
  },

  refresh_branch_preview: function (frm) {
    if (!frm.fields_dict.branch_preview_html) return;

    let zones = (frm.doc.zone || []).map(d => d.zone).filter(Boolean);
    let regions = (frm.doc.region || []).map(d => d.region).filter(Boolean);
    let states = (frm.doc.state || []).map(d => d.state).filter(Boolean);
    let districts = (frm.doc.district || []).map(d => d.district).filter(Boolean);
    let sol_ids = (frm.doc.sol_id || []).map(d => d.sol_id).filter(Boolean);

    frappe.call({
      method: "sahayog.scrm.doctype.report_preference.report_preference.get_preview_branches",
      args: {
        zones: zones,
        regions: regions,
        states: states,
        districts: districts,
        sol_ids: sol_ids,
        access_type: frm.doc.access_type
      },
      callback: function (r) {
        frm.resolved_branches = r.message || [];
        frm.trigger("render_branch_preview_table");
      }
    });
  },

  render_branch_preview_table: function (frm) {
    let branches = frm.resolved_branches || [];
    let count = branches.length;

    let html = `
      <style>
        .rp-table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
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
        .rp-table-search:focus {
          border-color: #3b82f6;
        }
        .rp-table-container {
          max-height: 240px;
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
            <span class="rp-count-badge" id="rp-branch-count-label">${count} Branches</span>
          </div>
          <input type="text" class="rp-table-search" id="rp-branch-search-input" placeholder="🔍 Quick Filter..." />
        </div>
        <div class="rp-table-container">
          ${count === 0 ? `
            <div class="rp-empty-state">
              No branches matching current filters. Select Zones/Regions or SOL IDs above.
            </div>
          ` : `
            <table class="rp-minimal-table" id="rp-preview-table-data">
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
                  <tr class="rp-branch-row">
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

    frm.fields_dict.branch_preview_html.$wrapper.html(html);

    // Fast client-side search filter
    frm.fields_dict.branch_preview_html.$wrapper.find("#rp-branch-search-input").on("input", function () {
      let q = $(this).val().toLowerCase().trim();
      let visibleCount = 0;
      frm.fields_dict.branch_preview_html.$wrapper.find(".rp-branch-row").each(function () {
        let text = $(this).text().toLowerCase();
        let match = text.includes(q);
        $(this).toggle(match);
        if (match) visibleCount++;
      });
      frm.fields_dict.branch_preview_html.$wrapper.find("#rp-branch-count-label").text(
        q ? `${visibleCount} / ${count} Branches` : `${count} Branches`
      );
    });
  },

  show_user_search_dialog: function (frm) {
    let d = new frappe.ui.Dialog({
      title: __("Search & Select User"),
      fields: [
        {
          label: __("User Name / Email"),
          fieldname: "search_text",
          fieldtype: "Data",
          reqd: 1,
        },
        {
          fieldname: "results",
          fieldtype: "HTML",
        },
      ],
    });

    d.fields_dict.search_text.$input.on("input", function () {
      let value = d.get_value("search_text");
      if (!value || value.length < 1) {
        d.fields_dict.results.$wrapper.html("");
        return;
      }

      frappe.call({
        method: "sahayog.scrm.doctype.report_preference.report_preference.search_user",
        args: { search_text: value },
        callback: function (r) {
          let results = r.message || [];
          let html = "<ul style='list-style:none; padding:0; margin-top:8px; border:1px solid #e2e8f0; border-radius:6px; max-height:220px; overflow-y:auto;'>";
          let regex = new RegExp(`(${value})`, "gi");

          results.forEach((u) => {
            let highlightedName = u.name.replace(regex, "<mark style='background:#fef08a; padding:0;'>$1</mark>");
            let highlightedFull = (u.full_name || "").replace(regex, "<mark style='background:#fef08a; padding:0;'>$1</mark>");

            html += `
              <li style="padding:8px 12px; border-bottom:1px solid #f1f5f9; cursor:pointer;"
                  onmouseover="this.style.backgroundColor='#f8fafc'"
                  onmouseout="this.style.backgroundColor='transparent'"
                  onclick="cur_frm.set_value('user', '${u.name}'); cur_dialog.hide();">
                <span style="font-weight:600; color:#1e293b;">${highlightedName}</span> 
                <span style="color:#64748b; margin-left:8px;">(${highlightedFull})</span>
              </li>`;
          });

          html += "</ul>";
          d.fields_dict.results.$wrapper.html(html);
        },
      });
    });

    d.show();
  }
});
