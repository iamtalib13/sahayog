frappe.listview_settings["Agent"] = {
  add_fields: ["branch_code"],

  refresh(listview) {
    setupSyncAgentsButton(listview);
    setupBulkCommissionButton(listview);
  },

  onload(listview) {
    hideSidebarElements();
    setupBranchFilter(listview);
    setupRoleBasedActions(listview);
    setupDownloadReportButton(listview);
  },
};

/**
 * Hide listview sidebar section and toggle button for cleaner UI.
 */
function hideSidebarElements() {
  $(".layout-side-section").hide();
  $(".sidebar-toggle-btn").hide();
}

/**
 * Add "Sync Agents" inner button to list view header.
 */
function setupSyncAgentsButton(listview) {
  listview.page.add_inner_button(
    __("Sync Agents"),
    () => {
      frappe.confirm(
        __("Are you sure you want to sync all agents directly from Finacle DB?"),
        () => {
          frappe.call({
            method: "sahayog.api.auto_agent_creation.sync_all_agents_overall",
            freeze: true,
            freeze_message: __("⚡ Direct DB-to-DB Agent Syncing in progress..."),
            callback(r) {
              if (r.message && r.message.status === "success") {
                frappe.msgprint({
                  title: __("Agent Sync Completed"),
                  message: __(r.message.message),
                  indicator: "green",
                });
                listview.refresh();
              } else {
                frappe.msgprint({
                  title: __("Error"),
                  message: __(
                    r.message ? r.message.message : "Failed to sync agents."
                  ),
                  indicator: "red",
                });
              }
            },
          });
        }
      );
    },
    __("Actions")
  );
}

/**
 * Add "Update Bulk Commission" inner button to list view header.
 */
function setupBulkCommissionButton(listview) {
  listview.page.add_inner_button(
    __("Update Bulk Commission"),
    () => {
      frappe.confirm(
        __("Are you sure you want to scan SS & VS Report and update commission JSON for all agents?"),
        () => {
          frappe.call({
            method: "sahayog.agent_and_bdo.doctype.agent.agent.bulk_update_agent_commissions",
            freeze: true,
            freeze_message: __("⚡ Updating commission JSON for all agents in superfast mode..."),
            callback(r) {
              if (r.message && r.message.status === "success") {
                frappe.msgprint({
                  title: __("Bulk Commission Update Completed"),
                  message: __(r.message.message),
                  indicator: "green",
                });
                listview.refresh();
              } else {
                frappe.msgprint({
                  title: __("Error"),
                  message: __(r.message ? r.message.message : "Failed to update bulk commission."),
                  indicator: "red",
                });
              }
            },
          });
        }
      );
    },
    __("Actions")
  );
}

/**
 * Inject "Filter by Branch" button and pre-fetch Sahayog Branch structure.
 */
function setupBranchFilter(listview) {
  const filterBtn = listview.page.add_button(
    __("Filter by Branch"),
    () => openBranchFilterDialog(listview, filterBtn),
    { icon: "filter" }
  );

  frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "Sahayog Branch",
      fields: ["name", "zone", "region", "branch"],
      limit: 500,
      order_by: "zone asc, region asc, branch asc",
    },
    callback(r) {
      if (!r.message) return;
      const tree = {};
      r.message.forEach((row) => {
        const { zone: z, region: reg, name, branch } = row;
        if (!z || !reg) return;
        if (!tree[z]) tree[z] = {};
        if (!tree[z][reg]) tree[z][reg] = [];
        tree[z][reg].push({ code: name, label: branch || name });
      });
      filterBtn.__branchTree = tree;
    },
  });
}

/**
 * Setup role-restricted buttons (Bulk Unallocate & Bulk Transfer).
 */
function setupRoleBasedActions(listview) {
  const hasRequiredRole =
    frappe.user.has_role("System Manager") ||
    frappe.user.has_role("MIS Admin");

  if (!hasRequiredRole) {
    return;
  }

  if (frappe.session.user === "Administrator" || hasRequiredRole) {
    setupBulkTransferButton(listview);
  }
}

/**
 * Add "Bulk Unallocate by Employee" inner button and dialog logic.
 */
function setupBulkUnallocateButton(listview) {
  listview.page.add_inner_button(
    __("Bulk Unallocate by Employee"),
    () => {
    const d = new frappe.ui.Dialog({
      title: __("Select Employee to Unallocate Agents"),
      size: "large",
      fields: [
        {
          label: __("Employee"),
          fieldname: "employee",
          fieldtype: "Link",
          options: "Employee",
          reqd: 1,
          change() {
            const employee = d.get_value("employee");
            fetchAndRenderAllocatedAgents(d, employee);
          },
        },
        {
          fieldtype: "HTML",
          fieldname: "agent_list_html",
          label: __("Agents"),
        },
      ],
      primary_action_label: __("Unallocate Selected"),
      primary_action() {
        const selected = getSelectedAgentNames(d);

        if (!selected.length) {
          frappe.msgprint(
            __("Please select at least one agent to unallocate.")
          );
          return;
        }

        frappe.confirm(
          __("Are you sure you want to unallocate {0} agent(s)?", [
            selected.length,
          ]),
          () => {
            frappe.call({
              method:
                "sahayog.agent_and_bdo.doctype.agent.agent.bulk_unallocate",
              args: { agent_names: JSON.stringify(selected) },
              freeze: true,
              freeze_message: __("Unallocating Agents..."),
              callback(r) {
                if (r.message?.success) {
                  frappe.show_alert({
                    message: r.message.message,
                    indicator: "red",
                  });
                  d.hide();
                  listview.refresh();
                } else {
                  frappe.msgprint(
                    r.message?.message || __("Failed to unallocate agents.")
                  );
                }
              },
            });
          }
        );
      },
    });

    bindAgentSelectionEvents(d);
    d.show();
  },
  __("Actions")
  );
}

/**
 * Add "Bulk Transfer by Employee" inner button and dialog logic.
 */
function setupBulkTransferButton(listview) {
  listview.page.add_inner_button(
    __("Bulk Transfer by Employee"),
    () => {
    const d = new frappe.ui.Dialog({
      title: __("Bulk Transfer Agents"),
      size: "large",
      fields: [
        {
          label: __("From Employee"),
          fieldname: "from_employee",
          fieldtype: "Link",
          options: "Employee",
          reqd: 1,
          change() {
            const fromEmp = d.get_value("from_employee");
            fetchAndRenderAllocatedAgents(d, fromEmp);
          },
        },
        {
          label: __("To Employee"),
          fieldname: "to_employee",
          fieldtype: "Link",
          options: "Employee",
          reqd: 1,
        },
        {
          fieldtype: "HTML",
          fieldname: "agent_list_html",
          label: __("Agents"),
        },
      ],
      primary_action_label: __("Transfer Selected"),
      primary_action(values) {
        const selected = getSelectedAgentNames(d);

        if (!selected.length) {
          frappe.msgprint(
            __("Please select at least one agent to transfer.")
          );
          return;
        }
        if (!values.to_employee) {
          frappe.msgprint(__("Please select the target employee."));
          return;
        }

        frappe.confirm(
          __("Are you sure you want to transfer {0} agent(s) to {1}?", [
            selected.length,
            values.to_employee,
          ]),
          () => {
            frappe.call({
              method:
                "sahayog.agent_and_bdo.doctype.agent.agent.bulk_transfer",
              args: {
                agent_names: JSON.stringify(selected),
                to_employee: values.to_employee,
              },
              freeze: true,
              freeze_message: __("Transferring Agents..."),
              callback(r) {
                if (r.message?.success) {
                  frappe.show_alert({
                    message: r.message.message,
                    indicator: "green",
                  });
                  d.hide();
                  listview.refresh();
                } else {
                  frappe.msgprint(
                    r.message?.message || __("Failed to transfer agents.")
                  );
                }
              },
            });
          }
        );
      },
    });

    bindAgentSelectionEvents(d);
    d.show();
  },
  __("Actions")
  );
}

/**
 * Fetch allocated agents for employee and render checkbox list inside dialog.
 */
function fetchAndRenderAllocatedAgents(
  dialog,
  employeeId,
  fieldname = "agent_list_html"
) {
  if (!employeeId) {
    dialog.set_df_property(fieldname, "options", "");
    return;
  }

  frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "Agent",
      filters: {
        employee: employeeId,
        status: "Allocated",
      },
      fields: ["name", "agent_name"],
    },
    callback(r) {
      const agents = r.message || [];
      let html = "";
      if (agents.length) {
        html = `
          <div style="margin-bottom: 10px;">
            <button class="btn btn-xs btn-default select-all-agents-btn" type="button">${__(
              "Select All"
            )}</button>
            <button class="btn btn-xs btn-default unselect-all-agents-btn" type="button">${__(
              "Unselect All"
            )}</button>
          </div>
          <div style="max-height: 250px; overflow-y: auto; border: 1px solid #d1d8dd; padding: 8px; border-radius: 4px;">
            ${agents
              .map(
                (row) => `
              <div>
                <label>
                  <input type="checkbox" class="agent-checkbox" value="${
                    row.name
                  }" checked>
                  <b>${frappe.utils.escape_html(
                    row.agent_name || ""
                  )}</b> (${frappe.utils.escape_html(row.name)})
                </label>
              </div>`
              )
              .join("")}
          </div>
        `;
      } else {
        html = `<p class="text-muted">${__("No allocated agents found.")}</p>`;
      }
      dialog.set_df_property(fieldname, "options", html);
    },
  });
}

/**
 * Bind delegated event handlers on dialog wrapper for agent check/uncheck all.
 */
function bindAgentSelectionEvents(dialog) {
  dialog.$wrapper.on("click", ".select-all-agents-btn", (e) => {
    e.preventDefault();
    dialog.$wrapper.find(".agent-checkbox").prop("checked", true);
  });
  dialog.$wrapper.on("click", ".unselect-all-agents-btn", (e) => {
    e.preventDefault();
    dialog.$wrapper.find(".agent-checkbox").prop("checked", false);
  });
}

/**
 * Extract array of selected agent IDs from dialog checkboxes.
 */
function getSelectedAgentNames(dialog) {
  const selected = [];
  dialog.$wrapper.find(".agent-checkbox:checked").each(function () {
    selected.push($(this).val());
  });
  return selected;
}

/**
 * Setup "Download Report" inner button.
 */
function setupDownloadReportButton(listview) {
  listview.page.add_inner_button(
    __("Download Report"),
    () => {
    frappe.call({
      method: "sahayog.custom_api.get_agent_report_data",
      freeze: true,
      freeze_message: __("Generating report..."),
      callback(r) {
        if (r.message && r.message.status === "success") {
          const data = r.message.data;

          if (data && data.length > 0) {
            generateAndDownloadCSV(data);

            frappe.show_alert({
              message: __(
                "Report downloaded successfully with {0} records",
                [data.length]
              ),
              indicator: "green",
            });
          } else {
            frappe.msgprint(__("No data found to export"));
          }
        } else {
          frappe.msgprint(
            __("Failed to generate report. Please try again.")
          );
        }
      },
      error() {
        frappe.msgprint(__("Error occurred while generating report"));
      },
    });
  },
  __("Actions")
  );
}

/**
 * Generate CSV and trigger browser download.
 */
function generateAndDownloadCSV(data) {
  const csvData = convertToOptimizedCSV(data);
  const today = frappe.datetime.nowdate();
  const filename = `Agent_Report_${today}.csv`;
  downloadCSV(csvData, filename);
}

/**
 * Convert report records array into formatted CSV string.
 */
function convertToOptimizedCSV(data) {
  if (!data || data.length === 0) return "";

  const headers = [
    "agent_id",
    "status",
    "sol_id",
    "agent_name",
    "agent_status",
    "branch_code",
    "branch_name",
    "role",
    "employee",
    "employee_name",
    "auth_id",
    "branch",
    "zone",
    "region",
    "district",
    "creation",
  ];

  const headerLabels = [
    "Agent ID",
    "Status",
    "SOL ID",
    "Agent Name",
    "Agent Status",
    "Branch Code",
    "Branch Name",
    "Role",
    "Employee ID",
    "Employee Name",
    "AUTH ID",
    "Branch",
    "Zone",
    "Region",
    "District",
    "Created Date",
  ];

  let csvContent = headerLabels.join(",") + "\n";

  data.forEach((row) => {
    const values = headers.map((header) => {
      let value = row[header];

      if (
        value === null ||
        value === undefined ||
        value === "null" ||
        value === "None" ||
        value === "#VALUE!" ||
        String(value).includes("#VALUE!")
      ) {
        value = "";
      } else {
        value = String(value).trim();
      }

      if (
        value &&
        (value.includes(",") || value.includes('"') || value.includes("\n"))
      ) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }

      return value;
    });

    csvContent += values.join(",") + "\n";
  });

  return csvContent;
}

/**
 * Trigger file download for generated CSV string.
 */
function downloadCSV(csvData, filename) {
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });

  if (window.navigator && window.navigator.msSaveBlob) {
    window.navigator.msSaveBlob(blob, filename);
  } else {
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Open modal UI for filtering Agent listview by Zone, Region, and Branches.
 */
function openBranchFilterDialog(listview, filterBtn) {
  const tree = filterBtn.__branchTree || {};
  const selectedCodes = new Set();
  let currentBranches = [];

  const zoneOptions = Object.keys(tree)
    .map(
      (z) =>
        `<option value="${frappe.utils.escape_html(
          z
        )}">${frappe.utils.escape_html(z)}</option>`
    )
    .join("");

  const dialog = new frappe.ui.Dialog({
    title: __("Filter by Branch"),
    fields: [
      {
        fieldtype: "HTML",
        fieldname: "filter_widget",
        options: `
          <div style="padding: 4px 0;">
            <div style="margin-bottom: 14px;">
              <div style="font-size: 11px; color: #8d99a6; font-weight: 500; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.04em;">${__(
                "Zone"
              )}</div>
              <select class="fb-zone-select" style="width:100%; height:34px; border:1px solid #d1d8dd; border-radius:5px; padding:0 10px; font-size:13px; color:#333;">
                <option value="">— ${__("Select Zone")} —</option>
                ${zoneOptions}
              </select>
            </div>

            <div style="margin-bottom: 14px;">
              <div style="font-size: 11px; color: #8d99a6; font-weight: 500; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.04em;">${__(
                "Region"
              )}</div>
              <select class="fb-region-select" disabled style="width:100%; height:34px; border:1px solid #d1d8dd; border-radius:5px; padding:0 10px; font-size:13px; color:#333;">
                <option value="">— ${__("Select Zone first")} —</option>
              </select>
            </div>

            <div class="fb-branch-section" style="display:none; margin-bottom: 14px;">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px;">
                <div style="font-size: 11px; color: #8d99a6; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em;">${__(
                  "Branches"
                )}</div>
                <div style="display:flex; gap:6px;">
                  <span class="fb-sel-all" style="font-size:11px; color:#5e64ff; cursor:pointer; text-decoration:underline;">${__(
                    "Select all"
                  )}</span>
                  <span class="fb-clr-all" style="font-size:11px; color:#8d99a6; cursor:pointer; text-decoration:underline;">${__(
                    "Clear all"
                  )}</span>
                </div>
              </div>
              <div class="fb-chips" style="display:flex; flex-wrap:wrap; gap:6px; padding:10px; background:#f8f9fa; border:1px solid #e2e6ea; border-radius:6px; min-height:48px;"></div>
            </div>

            <div class="fb-summary" style="padding: 8px 12px; background:#f0f4ff; border:1px solid #c5cfff; border-radius:6px; min-height:36px; display:none;">
              <div style="font-size:11px; color:#5e64ff; font-weight:500; margin-bottom:5px;">${__(
                "Selected branches"
              )}</div>
              <div class="fb-tags" style="display:flex; flex-wrap:wrap; gap:5px;"></div>
            </div>
          </div>`,
      },
    ],
    primary_action_label: __("Apply Filter"),
    primary_action() {
      if (!selectedCodes.size) return;
      const codes = Array.from(selectedCodes);

      listview.filter_area.remove("branch_code");
      listview.filter_area.add([
        ["Agent", "branch_code", "in", codes.join(",")],
      ]);
      listview.refresh();

      filterBtn.$btn.html(
        `<span class="fa fa-filter"></span> Filter by Branch <span style="background:#5e64ff;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px;">${codes.length}</span>`
      );
      dialog.hide();
    },
    secondary_action_label: __("Reset"),
    secondary_action() {
      listview.filter_area.remove("branch_code");
      listview.refresh();
      filterBtn.$btn.html(
        '<span class="fa fa-filter"></span> Filter by Branch'
      );
      dialog.hide();
    },
  });

  dialog.show();

  const $w = dialog.$wrapper;
  const zoneEl = $w.find(".fb-zone-select");
  const regionEl = $w.find(".fb-region-select");
  const branchSection = $w.find(".fb-branch-section");
  const chipsEl = $w.find(".fb-chips");
  const summaryEl = $w.find(".fb-summary");
  const tagsEl = $w.find(".fb-tags");

  const chipStyle = (selected) =>
    selected
      ? "background:#dce4ff;border-color:#aab5ff;color:#2b37c7;font-weight:500;"
      : "background:#fff;border-color:#d1d8dd;color:#6c7680;";

  const updateChipBaseStyle = (selected) =>
    `display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:12px;border:1px solid;cursor:pointer;transition:all 0.1s;${chipStyle(
      selected
    )}`;

  function renderSummary() {
    dialog.get_primary_btn().prop("disabled", selectedCodes.size === 0);
    if (!selectedCodes.size) {
      summaryEl.hide();
      return;
    }
    summaryEl.show();
    tagsEl.empty();

    selectedCodes.forEach((code) => {
      const b = currentBranches.find((x) => x.code === code);
      const label = b ? b.label : code;

      const $tag = $(`
        <span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:12px;background:#dce4ff;color:#2b37c7;border:1px solid #aab5ff;">
          ${frappe.utils.escape_html(label)}
          <span class="fb-remove-tag" data-code="${frappe.utils.escape_html(
            code
          )}" style="cursor:pointer;font-size:14px;color:#5e64ff;line-height:1;margin-left:2px;">&times;</span>
        </span>
      `);
      tagsEl.append($tag);
    });
  }

  tagsEl.on("click", ".fb-remove-tag", function () {
    const code = $(this).attr("data-code");
    selectedCodes.delete(code);

    const $chip = chipsEl.find(`[data-code="${code}"]`);
    if ($chip.length) {
      $chip.attr("style", updateChipBaseStyle(false));
    }
    renderSummary();
  });

  zoneEl.on("change", function () {
    const zone = $(this).val();
    regionEl.html(`<option value="">— ${__("Select Region")} —</option>`);
    regionEl.prop("disabled", !zone);
    branchSection.hide();
    selectedCodes.clear();
    currentBranches = [];
    renderSummary();

    if (!zone || !tree[zone]) return;

    Object.keys(tree[zone]).forEach((r) => {
      regionEl.append(
        `<option value="${frappe.utils.escape_html(
          r
        )}">${frappe.utils.escape_html(r)}</option>`
      );
    });
  });

  regionEl.on("change", function () {
    const zone = zoneEl.val();
    const region = $(this).val();
    selectedCodes.clear();
    chipsEl.empty();
    currentBranches = [];

    if (!region) {
      branchSection.hide();
      renderSummary();
      return;
    }

    currentBranches = tree[zone]?.[region] || [];
    currentBranches.forEach((b) => {
      const $chip = $(`
        <div data-code="${frappe.utils.escape_html(
          b.code
        )}" style="${updateChipBaseStyle(false)}">
          ${frappe.utils.escape_html(
            b.label
          )} <span style="font-size:11px;opacity:0.55;">${frappe.utils.escape_html(
        b.code
      )}</span>
        </div>
      `);

      $chip.on("click", function () {
        if (selectedCodes.has(b.code)) {
          selectedCodes.delete(b.code);
          $(this).attr("style", updateChipBaseStyle(false));
        } else {
          selectedCodes.add(b.code);
          $(this).attr("style", updateChipBaseStyle(true));
        }
        renderSummary();
      });

      chipsEl.append($chip);
    });

    branchSection.show();
    renderSummary();
  });

  $w.find(".fb-sel-all").on("click", () => {
    currentBranches.forEach((b) => selectedCodes.add(b.code));
    chipsEl.children("div").each(function () {
      $(this).attr("style", updateChipBaseStyle(true));
    });
    renderSummary();
  });

  $w.find(".fb-clr-all").on("click", () => {
    selectedCodes.clear();
    chipsEl.children("div").each(function () {
      $(this).attr("style", updateChipBaseStyle(false));
    });
    renderSummary();
  });

  dialog.get_primary_btn().prop("disabled", true);
}

