// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Agent", {
  refresh(frm) {
    frm.clear_custom_buttons();
    frm.trigger("employee_details");
    frm.trigger("read_only_fields");

    // --- Feature: Update From Finacle ---
    if (!frm.is_new() && (frappe.user.has_role("System Manager") || frappe.user.has_role("Employee"))) {
      frm.add_custom_button(__("Update From Finacle"), () => {
        frappe.call({
          method: "sahayog.api.auto_agent_creation.update_agent_from_finacle",
          args: {
            agent_code: frm.doc.name,
          },
          freeze: true,
          freeze_message: __("Fetching latest details from Finacle..."),
          callback: (r) => {
            if (r.message && r.message.status === "success") {
              frappe.show_alert({
                message: r.message.message,
                indicator: "green",
              });
              frm.reload_doc();
            } else {
              frappe.msgprint({
                title: __("Update Failed"),
                message: r.message ? r.message.message : __("Unknown error occurred"),
                indicator: "red",
              });
            }
          },
        });
      });
    }

    // --- Unallocated: Show Allocate ---
    if (frm.doc.status === "Unallocated" && frappe.session.user === "Administrator") {
      frm.add_custom_button(__("Allocate"), () => {
        frappe.confirm(__("Are you sure you want to request allocation?"), () => {
          frm.call({
            method: "sahayog.agent_and_bdo.doctype.agent.agent.get_branch_managers",
            args: {
              branch_code: frm.doc.branch_code,
            },
            freeze: true,
            freeze_message: __("Getting Branch Managers..."),
            callback: (r) => {
              if (r.message && r.message.length > 0) {
                show_minimal_manager_selection(frm, r.message);
              } else {
                frappe.msgprint({
                  title: __("No Branch Managers Found"),
                  message: __(
                    "No Branch Managers found for branch code: {0}",
                    [frm.doc.branch_code]
                  ),
                  indicator: "orange",
                });
              }
            },
            error: () => {
              frappe.msgprint({
                title: __("Error"),
                message: __("Failed to get branch managers. Please try again."),
                indicator: "red",
              });
            },
          });
        });
      });
    }

    // --- Pending: Show Approve / Reject ---
    if (frm.doc.approved_by === frappe.session.user && frm.doc.status === "Pending") {
      if (frappe.session.user === "Administrator") {
        frm.add_custom_button(__("Approve"), () => {
          frappe.confirm(__("Are you sure you want to approve this allocation?"), () => {
            frm.call({
              method: "approve_allocation",
              doc: frm.doc,
              freeze: true,
              freeze_message: __("Approving Allocation..."),
              callback: (r) => {
                if (r.message?.success) {
                  frappe.show_alert({
                    message: r.message.message,
                    indicator: "green",
                  });
                  frm.reload_doc();
                }
              },
            });
          });
        });

        frm.add_custom_button(__("Reject"), () => {
          frappe.confirm(__("Are you sure you want to reject this allocation?"), () => {
            frm.call({
              method: "reject_allocation",
              doc: frm.doc,
              freeze: true,
              freeze_message: __("Rejecting Allocation..."),
              callback: (r) => {
                if (r.message?.success) {
                  frappe.show_alert({
                    message: r.message.message,
                    indicator: "red",
                  });
                  frm.reload_doc();
                }
              },
            });
          });
        });
      }
    }

    // --- Allocated: Show Unallocate ---
    if (frm.doc.status === "Allocated" && frappe.session.user === "Administrator") {
      frm.add_custom_button(__("Unallocate"), () => {
        frappe.confirm(__("Are you sure you want to unallocate this agent?"), () => {
          frm.call({
            method: "unallocate_agent",
            doc: frm.doc,
            freeze: true,
            freeze_message: __("Unallocating Agent..."),
            callback: (r) => {
              if (r.message?.success) {
                frappe.show_alert({
                  message: r.message.message,
                  indicator: "red",
                });
                frm.reload_doc();
              }
            },
          });
        });
      });
    }

    // --- Pending: Show Cancel ---
    if (frm.doc.status === "Pending" && frappe.session.user === "Administrator") {
      frm.add_custom_button(__("Cancel"), () => {
        frappe.confirm(__("Are you sure you want to cancel this allocation?"), () => {
          frm.call({
            method: "unallocate_agent",
            doc: frm.doc,
            freeze: true,
            freeze_message: __("Unallocating Agent..."),
            callback: (r) => {
              if (r.message?.success) {
                frappe.show_alert({
                  message: r.message.message,
                  indicator: "red",
                });
                frm.reload_doc();
              }
            },
          });
        });
      });
    }

    frm.trigger("hide_sidebar_options");
  },

  hide_sidebar_options(frm) {
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();
  },

  async employee_details(frm) {
    const employee = frm.doc.employee;

    if (!employee) {
      if (frm.doc.status === "Pending" && frm.doc.approved_by && frm.doc.requested_by) {
        try {
          const [req, appr] = await Promise.all([
            frappe.xcall("sahayog.agent_and_bdo.doctype.agent.agent.get_approver_details", {
              user_id: frm.doc.requested_by,
            }),
            frappe.xcall("sahayog.agent_and_bdo.doctype.agent.agent.get_approver_details", {
              user_id: frm.doc.approved_by,
            }),
          ]);

          frm.set_intro(render_pending_intro_html(req || {}, appr || {}, frm.doc));
        } catch (err) {
          frm.set_intro(render_error_intro_html(__("Failed to load approval workflow details.")));
        }
      } else {
        frm.set_intro("");
      }
      return;
    }

    try {
      const emp = await frappe.xcall(
        "sahayog.agent_and_bdo.doctype.agent.agent.get_employee_info",
        { employee: employee }
      );
      if (!emp) {
        frm.set_intro(render_error_intro_html(__("Employee details not found.")));
        return;
      }

      if (frm.doc.status === "Allocated") {
        const requested = frm.doc.requested_by || `${employee}@sahayog.com`;
        const approved = frm.doc.approved_by || "";

        if (!approved) {
          const req = await frappe.xcall(
            "sahayog.agent_and_bdo.doctype.agent.agent.get_approver_details",
            { user_id: requested }
          );
          frm.set_intro(render_allocated_single_html(req || {}, frm.doc, employee));
        } else {
          const [req, appr] = await Promise.all([
            frappe.xcall("sahayog.agent_and_bdo.doctype.agent.agent.get_approver_details", {
              user_id: requested,
            }),
            frappe.xcall("sahayog.agent_and_bdo.doctype.agent.agent.get_approver_details", {
              user_id: approved,
            }),
          ]);
          frm.set_intro(render_allocated_full_html(req || {}, appr || {}, frm.doc));
        }
      } else {
        frm.set_intro("");
      }
    } catch (err) {
      frm.set_intro(render_error_intro_html(__("Failed to load employee details. Please try again.")));
    }
  },

  read_only_fields(frm) {
    const hasRequiredRole =
      frappe.user.has_role("System Manager") ||
      frappe.user.has_role("MIS Admin");

    if (!hasRequiredRole) {
      frm.disable_save();
      frm.set_read_only();
    }
  },
});

// --- Helper UI Components for Workflow Introductions ---

function render_pending_intro_html(req, appr, doc) {
  const reqName = frappe.utils.escape_html(req.employee_name || req.display_name || doc.requested_by || "");
  const reqBranch = frappe.utils.escape_html(req.branch || "-");
  const reqContact = [
    req.cell_number ? `  ${req.cell_number}` : "",
    req.company_email ? ` | ${req.company_email}` : "",
  ].filter(Boolean).join("");

  const apprName = frappe.utils.escape_html(appr.employee_name || appr.display_name || doc.approved_by || "");
  const apprBranch = frappe.utils.escape_html(appr.branch || "-");
  const apprContact = [
    appr.cell_number ? `  ${appr.cell_number}` : "",
    appr.company_email ? ` | ${appr.company_email}` : "",
  ].filter(Boolean).join("");

  return `
    <div style="background:#fff;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,0.03);padding:22px 28px 18px 28px;color:#56423d;font-size:15px;min-width:320px;">
      <div style="color:#c8ad63;font-weight:600;margin-bottom:13px;letter-spacing:0.3px;display:flex;align-items:center;">
        <i class="fa fa-info-circle" style="margin-right:7px;font-size:16px;"></i>
        ${__("Approval Workflow Info")}
      </div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div style="min-width:130px;">
          <div style="color:#a9a9a9;font-size:12px;margin-bottom:2px;">${__("Requested By")}</div>
          <div style="font-weight:600;margin-bottom:3px;">${reqName}</div>
          <div style="font-size:12px;color:#bfaf86;">${reqBranch}<br>${reqContact}</div>
        </div>
        <div style="flex:1;min-width:70px;max-width:850px;display:flex;align-items:center;justify-content:center;">
          <div style="width:16px;height:16px;border-radius:8px;background:#c8ad63;display:flex;align-items:center;justify-content:center;">
            <i class="fa fa-check" style="color:#fff;font-size:10px;"></i>
          </div>
          <div style="flex:1;height:2.7px;background:linear-gradient(90deg,#c8ad63 70%,#eee 100%);margin:0 14px;"></div>
          <div style="width:16px;height:16px;border-radius:8px;background:#eee;display:flex;align-items:center;justify-content:center;">
            <i class="fa fa-user" style="color:#c8ad63;font-size:10px;"></i>
          </div>
        </div>
        <div style="min-width:130px;text-align:right;">
          <div style="color:#a9a9a9;font-size:12px;margin-bottom:2px;">${__("Approval Pending From")}</div>
          <div style="font-weight:600;margin-bottom:3px;">${apprName}</div>
          <div style="font-size:12px;color:#bfaf86;">${apprBranch}<br>${apprContact}</div>
        </div>
      </div>
    </div>
  `;
}

function render_allocated_single_html(req, doc, fallbackEmp) {
  const reqName = frappe.utils.escape_html(req.employee_name || req.display_name || doc.requested_by || fallbackEmp || "");
  const reqBranch = frappe.utils.escape_html(req.branch || "-");
  const reqContact = [
    req.cell_number ? `  ${req.cell_number}` : "",
    req.company_email ? ` | ${req.company_email}` : "",
  ].filter(Boolean).join("");

  return `
    <div style="background:#fff;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,0.03);padding:22px 28px 18px 28px;color:#56423d;font-size:15px;min-width:320px;">
      <div style="color:#43b353;font-weight:600;margin-bottom:13px;letter-spacing:0.3px;display:flex;align-items:center;">
        <i class="fa fa-check-circle" style="margin-right:7px;color:#43b353;font-size:16px;"></i>
        ${__("Allocation Completed")}
      </div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div style="min-width:130px;">
          <div style="color:#a9a9a9;font-size:12px;margin-bottom:2px;">${__("Allocated To")}</div>
          <div style="font-weight:600;margin-bottom:3px;">${reqName}</div>
          <div style="font-size:12px;color:#43b35399;">${reqBranch}<br>${reqContact}</div>
        </div>
      </div>
    </div>
  `;
}

function render_allocated_full_html(req, appr, doc) {
  const reqName = frappe.utils.escape_html(req.employee_name || req.display_name || doc.requested_by || "");
  const reqBranch = frappe.utils.escape_html(req.branch || "-");
  const reqContact = [
    req.cell_number ? `  ${req.cell_number}` : "",
    req.company_email ? ` | ${req.company_email}` : "",
  ].filter(Boolean).join("");

  const apprName = frappe.utils.escape_html(appr.employee_name || appr.display_name || doc.approved_by || "");
  const apprBranch = frappe.utils.escape_html(appr.branch || "-");
  const apprContact = [
    appr.cell_number ? `  ${appr.cell_number}` : "",
    appr.company_email ? ` | ${appr.company_email}` : "",
  ].filter(Boolean).join("");

  return `
    <div style="background:#fff;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,0.03);padding:22px 28px 18px 28px;color:#56423d;font-size:15px;min-width:320px;">
      <div style="color:#43b353;font-weight:600;margin-bottom:13px;letter-spacing:0.3px;display:flex;align-items:center;">
        <i class="fa fa-check-circle" style="margin-right:7px;color:#43b353;font-size:16px;"></i>
        ${__("Allocation Completed")}
      </div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div style="min-width:130px;">
          <div style="color:#a9a9a9;font-size:12px;margin-bottom:2px;">${__("Allocated To")}</div>
          <div style="font-weight:600;margin-bottom:3px;">${reqName}</div>
          <div style="font-size:12px;color:#43b35399;">${reqBranch}<br>${reqContact}</div>
        </div>
        <div style="flex:1;min-width:70px;max-width:850px;display:flex;align-items:center;justify-content:center;">
          <div style="width:16px;height:16px;border-radius:8px;background:#43b353;display:flex;align-items:center;justify-content:center;">
            <i class="fa fa-check" style="color:#fff;font-size:10px;"></i>
          </div>
          <div style="flex:1;height:2.7px;background:linear-gradient(90deg,#43b353 80%,#eee 100%);margin:0 14px;"></div>
          <div style="width:16px;height:16px;border-radius:8px;background:#43b35322;display:flex;align-items:center;justify-content:center;">
            <i class="fa fa-user" style="color:#43b353;font-size:10px;"></i>
          </div>
        </div>
        <div style="min-width:130px;text-align:right;">
          <div style="color:#a9a9a9;font-size:12px;margin-bottom:2px;">${__("Approved By")}</div>
          <div style="font-weight:600;margin-bottom:3px;">${apprName}</div>
          <div style="font-size:12px;color:#43b35399;">${apprBranch}<br>${apprContact}</div>
        </div>
      </div>
    </div>
  `;
}

function render_error_intro_html(message) {
  return `
    <div style="background: linear-gradient(135deg, #dc3545, #c82333); color:white; padding:15px; border-radius:8px;">
      <i class="fa fa-exclamation-triangle" style="margin-right:8px;"></i>
      ${frappe.utils.escape_html(message)}
    </div>
  `;
}

// --- Manager Selection Dialog & Request Handling ---

function show_minimal_manager_selection(frm, managers) {
  const valid_managers = managers.filter((manager) => manager.user_id);

  if (valid_managers.length === 0) {
    frappe.msgprint({
      title: __("No Valid Managers"),
      message: __("No managers with user accounts available"),
      indicator: "red",
    });
    return;
  }

  let selectedManagerData = null;

  const dialog = new frappe.ui.Dialog({
    title: __("Select Manager for Approval"),
    size: "medium",
    fields: [{ fieldtype: "HTML", fieldname: "manager_list_html" }],
    primary_action_label: __("Send for Approval"),
    primary_action() {
      if (!selectedManagerData) {
        frappe.msgprint({
          title: __("No Selection"),
          message: __("Please select a manager first"),
          indicator: "orange",
        });
        return false;
      }

      const radioSelected = dialog.$wrapper.find('input[name="manager_radio"]:checked');
      if (radioSelected.length === 0) {
        frappe.msgprint({
          title: __("Selection Error"),
          message: __("No manager is selected. Please select one."),
          indicator: "red",
        });
        return false;
      }

      if (!selectedManagerData.user_id || !selectedManagerData.employee_name) {
        frappe.msgprint({
          title: __("Data Missing"),
          message: __("Manager information is incomplete"),
          indicator: "red",
        });
        return false;
      }

      frappe.confirm(
        __("Send allocation request to <b>{0}</b>?", [
          frappe.utils.escape_html(selectedManagerData.employee_name),
        ]),
        () => {
          send_allocation_request(
            frm,
            selectedManagerData.user_id,
            selectedManagerData.employee_name
          );
          dialog.hide();
        }
      );
    },
  });

  const groups = {
    "BRANCH MANAGER": [],
    "Asst. Branch Manager": [],
    "Branch Operation Manager": [],
  };

  valid_managers.forEach((m) => {
    if (groups[m.designation]) {
      groups[m.designation].push(m);
    }
  });

  let html = `
    <style>
      .agent-list { font-size: 13px; padding: 10px; }
      .agent-group { margin: 8px 0; }
      .agent-title { 
        background: #006767; color: white; padding: 6px 12px; 
        font-size: 12px; font-weight: 600; border-radius: 4px;
        margin-bottom: 5px;
      }
      .agent-item { 
        display: flex; align-items: center; padding: 8px 10px; 
        border: 1px solid #ddd; cursor: pointer; transition: 0.2s;
        margin-bottom: 4px; border-radius: 4px; background: white;
      }
      .agent-item:hover:not(.agent-selected) { 
        background: #f8f9fa; border-color: #006767;
      }
      .agent-item.agent-selected { 
        background: rgba(0,103,103,0.15); border-color: #006767; 
        box-shadow: 0 0 0 2px rgba(0, 103, 103, 0.3);
      }
      .agent-name { 
        flex: 1; margin-left: 8px; font-weight: 500; color: #2c3e50;
      }
      .agent-badge { 
        font-size: 9px; padding: 2px 6px; border-radius: 8px; 
        color: white; font-weight: 600;
      }
      .agent-radio { 
        accent-color: #006767; margin-right: 0;
      }
      .agent-no-managers {
        text-align: center; color: #6c757d; padding: 15px;
        font-style: italic; background: #f8f9fa; border-radius: 4px;
      }
    </style>
    <div class="agent-list">
  `;

  let hasAnyManagers = false;

  const sections = [
    { k: "BRANCH MANAGER", t: __("Branch Manager"), c: "#006767", b: __("BM") },
    { k: "Asst. Branch Manager", t: __("Assistant Branch Manager"), c: "#28a745", b: __("ABM") },
    { k: "Branch Operation Manager", t: __("Branch Operation Manager"), c: "#17a2b8", b: __("BOM") },
  ];

  sections.forEach((s) => {
    if (groups[s.k] && groups[s.k].length > 0) {
      hasAnyManagers = true;
      html += `
        <div class="agent-group">
          <div class="agent-title" style="background: ${s.c};">
            ${s.t} (${groups[s.k].length})
          </div>
      `;

      groups[s.k].forEach((m) => {
        const mgrJson = JSON.stringify({
          user_id: m.user_id,
          employee_name: m.employee_name,
        });
        html += `
          <label class="agent-item" data-user-id="${frappe.utils.escape_html(m.user_id)}" data-employee-name="${frappe.utils.escape_html(m.employee_name)}">
            <input type="radio" name="manager_radio" class="agent-radio" value='${mgrJson}'>
            <span class="agent-name">${frappe.utils.escape_html(m.employee_name)}</span>
            <span class="agent-badge" style="background: ${s.c};">${s.b}</span>
          </label>
        `;
      });

      html += `</div>`;
    }
  });

  if (!hasAnyManagers) {
    html += `
      <div class="agent-no-managers">
        <i class="fa fa-info-circle"></i> ${__("No managers available for selection")}
      </div>
    `;
  }

  html += `</div>`;

  dialog.fields_dict.manager_list_html.$wrapper.html(html);

  const updateSelection = (targetElem) => {
    const radioInput = targetElem.find('input[type="radio"]');
    try {
      selectedManagerData = JSON.parse(radioInput.val());
    } catch (error) {
      selectedManagerData = null;
      return;
    }
    dialog.$wrapper.find(".agent-item").removeClass("agent-selected");
    targetElem.closest(".agent-item").addClass("agent-selected");
    radioInput.prop("checked", true);
  };

  dialog.$wrapper.find(".agent-item").on("click", function (e) {
    e.preventDefault();
    updateSelection($(this));
  });

  dialog.$wrapper.find('input[name="manager_radio"]').on("change", function () {
    if ($(this).is(":checked")) {
      updateSelection($(this).closest(".agent-item"));
    }
  });

  dialog.show();
}

function send_allocation_request(frm, approver_user_id, approver_name) {
  frm.call({
    method: "allocation_request",
    doc: frm.doc,
    args: { approver_user_id: approver_user_id },
    freeze: true,
    freeze_message: __("Requesting Allocation..."),
    callback(resp) {
      if (resp.message?.success) {
        frappe.show_alert({
          message: __("Allocation request sent to {0} for approval", [approver_name]),
          indicator: "green",
        });
        frm.reload_doc();
      } else {
        frappe.show_alert({
          message: resp.message?.message || __("Error sending allocation request"),
          indicator: "red",
        });
      }
    },
    error() {
      frappe.show_alert({
        message: __("Failed to send allocation request"),
        indicator: "red",
      });
    },
  });
}
