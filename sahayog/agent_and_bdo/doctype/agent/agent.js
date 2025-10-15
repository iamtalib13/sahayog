// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Agent", {
  refresh(frm) {
    frm.clear_custom_buttons(); // remove old buttons
    frm.trigger("employee_details"); // trigger employee details display
    frm.trigger("read_only_fields");

    // --- Unallocated: Show Allocate ---
    if (frm.doc.status === "Unallocated") {
      frm.add_custom_button(__("Allocate"), () => {
        frappe.confirm(
          __("Are you sure you want to request allocation?"),
          () => {
            // Get branch managers with multiple designations
            frm.call({
              method: "get_branch_managers",
              args: {
                branch_code: frm.doc.branch_code,
              },
              freeze: true,
              freeze_message: __("Getting Branch Managers..."),
              callback: function (r) {
                console.log("Branch managers response:", r.message); // Debug log

                if (r.message && r.message.length > 0) {
                  // Always show selection dialog, even for single manager
                  // This prevents automatic request sending
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
              error: function (error) {
                console.error("Error getting branch managers:", error);
                frappe.msgprint({
                  title: __("Error"),
                  message: __(
                    "Failed to get branch managers. Please try again."
                  ),
                  indicator: "red",
                });
              },
            });
          }
        );
      });
    }

    // --- Pending: Show Approve / Reject ---
    if (frm.doc.approved_by == frappe.session.user) {
      if (frm.doc.status === "Pending") {
        frm.add_custom_button(__("Approve"), () => {
          frappe.confirm(
            __("Are you sure you want to approve this allocation?"),
            () => {
              frm.call({
                method: "approve_allocation",
                doc: frm.doc,
                freeze: true,
                freeze_message: __("Approving Allocation..."),
                callback: function (r) {
                  if (r.message?.success) {
                    frappe.show_alert({
                      message: r.message.message,
                      indicator: "green",
                    });
                    frm.reload_doc();
                  }
                },
              });
            }
          );
        });

        frm.add_custom_button(__("Reject"), () => {
          frappe.confirm(
            __("Are you sure you want to reject this allocation?"),
            () => {
              frm.call({
                method: "reject_allocation",
                doc: frm.doc,
                freeze: true,
                freeze_message: __("Rejecting Allocation..."),
                callback: function (r) {
                  if (r.message?.success) {
                    frappe.show_alert({
                      message: r.message.message,
                      indicator: "red",
                    });
                    frm.reload_doc();
                  }
                },
              });
            }
          );
        });
      }
    }

    // --- Allocated: Show Unallocate ---
    if (frm.doc.status === "Allocated") {
      frm.add_custom_button(__("Unallocate"), () => {
        frappe.confirm(
          __("Are you sure you want to unallocate this agent?"),
          () => {
            frm.call({
              method: "unallocate_agent",
              doc: frm.doc,
              freeze: true,
              freeze_message: __("Unallocating Agent..."),
              callback: function (r) {
                if (r.message?.success) {
                  frappe.show_alert({
                    message: r.message.message,
                    indicator: "red",
                  });
                  frm.reload_doc();
                }
              },
            });
          }
        );
      });
    }

    frm.trigger("hide_sidebar_options");
  },

  hide_sidebar_options(frm) {
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();
  },

  employee_details(frm) {
    let employee = frm.doc.employee;
    if (!employee) {
      // Check if status is Pending and approved_by exists
      if (frm.doc.status === "Pending" && frm.doc.approved_by) {
        frappe.call({
          method:
            "sahayog.agent_and_bdo.doctype.agent.agent.get_approver_details",
          args: {
            user_id: frm.doc.approved_by,
          },
          callback: function (r) {
            if (r.message && r.message.display_name) {
              frm.set_intro(
                "Approval Pending from " + r.message.display_name,
                "red"
              );
            } else {
              frm.set_intro(
                "Approval Pending from " + frm.doc.approved_by,
                "red"
              );
            }
          },
          error: function () {
            frm.set_intro(
              "Approval Pending from " + frm.doc.approved_by,
              "red"
            );
          },
        });
      } else {
        frm.set_intro("");
      }
      return;
    }

    frm.call({
      method: "get_employee_info",
      args: { employee: employee },
      callback: function (r) {
        const emp = r.message || null;
        if (!emp) {
          frm.set_intro(`
                        <div style="background: linear-gradient(135deg, #dc3545, #c82333); color:white; padding:15px; border-radius:8px;">
                            <i class="fa fa-exclamation-triangle" style="margin-right:8px;"></i>
                            Employee details not found.
                        </div>
                    `);
          return;
        }

        // Helper function for safe field access
        const safe = (value, fallback = "Not Provided") => value || fallback;

        frm.set_intro(`
                    <div style="background: linear-gradient(135deg, #006767 0%, #004a4b 100%); border-radius: 12px; padding: 0; margin: 10px 0; box-shadow: 0 4px 15px rgba(0,103,104,0.2); overflow: hidden;">
                        <!-- Header -->
                        <div style="color: white; padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.2);">
                            <h4 style="margin: 0; display: flex; align-items: center;">
                                <i class="fa fa-id-card-o" style="margin-right: 8px;"></i>
                                Employee Information
                            </h4>
                        </div>
                        <!-- Content -->
                        <div style="color: white; padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            ${[
                              {
                                icon: "fa-hashtag",
                                label: "EMPLOYEE NUMBER",
                                value: safe(
                                  emp.employee_number,
                                  "Not Assigned"
                                ),
                              },
                              {
                                icon: "fa-user",
                                label: "FULL NAME",
                                value: safe(emp.employee_name),
                              },
                              {
                                icon: "fa-building",
                                label: "BRANCH",
                                value: safe(emp.branch, "Not Assigned"),
                              },
                              emp.department
                                ? {
                                    icon: "fa-users",
                                    label: "DEPARTMENT",
                                    value: emp.department,
                                  }
                                : null,
                              emp.designation
                                ? {
                                    icon: "fa-star",
                                    label: "DESIGNATION",
                                    value: emp.designation,
                                  }
                                : null,
                            ]
                              .filter(Boolean)
                              .map(
                                (item) => `
                                        <div style="display: flex; align-items: center;">
                                            <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                                                <i class="fa ${item.icon}" style="color: white; font-size: 14px;"></i>
                                            </div>
                                            <div>
                                                <div style="font-size: 12px; color: rgba(255,255,255,0.8); font-weight: 500;">${item.label}</div>
                                                <div style="font-size: 16px; font-weight: 600; color: white;">${item.value}</div>
                                            </div>
                                        </div>
                                    `
                              )
                              .join("")}
                        </div>
                        <!-- Quick Actions -->
                        <div style="padding: 15px 20px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
                            <button class="btn btn-sm" onclick="frappe.set_route('List', 'Agent', {'employee': '${employee}'})" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); transition: all 0.3s ease; padding: 8px 20px;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                                <i class="fa fa-list"></i> View All Agents
                            </button>
                        </div>
                    </div>
                `);
      },
      error: function (err) {
        console.error("Error fetching employee info:", err);
        frm.set_intro(`
                    <div style="background: linear-gradient(135deg, #dc3545, #c82333); color:white; padding:15px; border-radius:8px;">
                        <i class="fa fa-exclamation-triangle" style="margin-right:8px;"></i>
                        Failed to load employee details. Please try again.
                    </div>
                `);
      },
    });
  },
  read_only_fields(frm) {
    // Allow only MIS and MIS Admin roles to edit
    const hasRequiredRole =
      frappe.user.has_role("System Manager") ||
      frappe.user.has_role("MIS Admin");

    if (!hasRequiredRole) {
      frm.disable_save();
      frm.set_read_only();
      console.log("Form made read-only for non-MIS users");
    }
  },
});

function show_minimal_manager_selection(frm, managers) {
  console.log("show_minimal_manager_selection called with managers:", managers); // Debug log

  let valid_managers = managers.filter((manager) => manager.user_id);
  console.log("Valid managers after filtering:", valid_managers); // Debug log

  if (valid_managers.length === 0) {
    frappe.msgprint({
      title: __("No Valid Managers"),
      message: __("No managers with user accounts available"),
      indicator: "red",
    });
    return;
  }

  // Global variable to track selection
  let selectedManagerData = null;

  let dialog = new frappe.ui.Dialog({
    title: __("Select Manager for Approval"),
    size: "medium",
    fields: [{ fieldtype: "HTML", fieldname: "manager_list_html" }],
    primary_action_label: __("Send for Approval"),
    primary_action: function () {
      console.log("Primary action triggered");
      console.log("Selected manager data:", selectedManagerData);

      // Check 1: Global variable
      if (!selectedManagerData) {
        frappe.msgprint({
          title: __("No Selection"),
          message: __("Please select a manager first"),
          indicator: "orange",
        });
        return false;
      }

      // Check 2: Radio button state
      let radioSelected = dialog.$wrapper.find(
        'input[name="manager_radio"]:checked'
      );
      console.log("Radio selected:", radioSelected.length);

      if (radioSelected.length === 0) {
        frappe.msgprint({
          title: __("Selection Error"),
          message: __("No manager is selected. Please select one."),
          indicator: "red",
        });
        return false;
      }

      // Check 3: Data integrity
      if (!selectedManagerData.user_id || !selectedManagerData.employee_name) {
        frappe.msgprint({
          title: __("Data Missing"),
          message: __("Manager information is incomplete"),
          indicator: "red",
        });
        return false;
      }

      // Show confirmation before proceeding
      frappe.confirm(
        __(
          `Send allocation request to <b>${selectedManagerData.employee_name}</b>?`
        ),
        () => {
          console.log("Confirmed, sending request to:", selectedManagerData);
          send_allocation_request(
            frm,
            selectedManagerData.user_id,
            selectedManagerData.employee_name
          );
          dialog.hide();
        },
        () => {
          console.log("Request cancelled by user");
        }
      );
    },
  });

  // Group managers by designation
  const groups = {
    "BRANCH MANAGER": [],
    "Asst. Branch Manager": [],
    "Branch Operation Manager": [],
  };

  valid_managers.forEach((m) => {
    if (groups[m.designation]) {
      groups[m.designation].push(m);
    } else {
      console.log("Unknown designation:", m.designation); // Debug log
    }
  });

  console.log("Grouped managers:", groups); // Debug log

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

  // Generate sections in required sequence
  let hasAnyManagers = false;

  [
    { k: "BRANCH MANAGER", t: "Branch Manager", c: "#006767", b: "BM" },
    {
      k: "Asst. Branch Manager",
      t: "Assistant Branch Manager",
      c: "#28a745",
      b: "ABM",
    },
    {
      k: "Branch Operation Manager",
      t: "Branch Operation Manager",
      c: "#17a2b8",
      b: "BOM",
    },
  ].forEach((s) => {
    if (groups[s.k] && groups[s.k].length > 0) {
      hasAnyManagers = true;
      html += `
                <div class="agent-group">
                    <div class="agent-title" style="background: ${s.c};">
                        ${s.t} (${groups[s.k].length})
                    </div>
            `;

      groups[s.k].forEach((m, i) => {
        html += `
                    <label class="agent-item" data-user-id="${
                      m.user_id
                    }" data-employee-name="${m.employee_name}">
                        <input type="radio" name="manager_radio" class="agent-radio" 
                               value='${JSON.stringify({
                                 user_id: m.user_id,
                                 employee_name: m.employee_name,
                               })}'>
                        <span class="agent-name">${m.employee_name}</span>
                        <span class="agent-badge" style="background: ${s.c};">${
          s.b
        }</span>
                    </label>
                `;
      });

      html += `</div>`;
    }
  });

  if (!hasAnyManagers) {
    html += `
            <div class="agent-no-managers">
                <i class="fa fa-info-circle"></i> No managers available for selection
            </div>
        `;
  }

  html += `</div>`;

  console.log("Generated HTML length:", html.length); // Debug log

  dialog.fields_dict.manager_list_html.$wrapper.html(html);

  // Enhanced selection handling
  dialog.$wrapper.find(".agent-item").click(function (e) {
    e.preventDefault();
    console.log("Manager item clicked"); // Debug log

    // Update global selection variable
    let radioInput = $(this).find('input[type="radio"]');
    try {
      selectedManagerData = JSON.parse(radioInput.val());
      console.log("Manager selected via click:", selectedManagerData);
    } catch (error) {
      console.error("Error parsing manager data:", error);
      selectedManagerData = null;
      return;
    }

    // Visual updates
    dialog.$wrapper.find(".agent-item").removeClass("agent-selected");
    $(this).addClass("agent-selected");
    radioInput.prop("checked", true);
  });

  // Radio button change handler
  dialog.$wrapper.find('input[name="manager_radio"]').change(function () {
    console.log("Radio button changed"); // Debug log

    if ($(this).is(":checked")) {
      try {
        selectedManagerData = JSON.parse($(this).val());
        console.log("Manager selected via radio:", selectedManagerData);
      } catch (error) {
        console.error("Error parsing manager data:", error);
        selectedManagerData = null;
        return;
      }

      // Visual updates
      dialog.$wrapper.find(".agent-item").removeClass("agent-selected");
      $(this).closest(".agent-item").addClass("agent-selected");
    }
  });

  // Initialize with no selection
  selectedManagerData = null;

  console.log("Dialog about to show"); // Debug log
  dialog.show();
}

function send_allocation_request(frm, approver_user_id, approver_name) {
  console.log(
    "Sending allocation request to:",
    approver_user_id,
    approver_name
  ); // Debug log

  frm.call({
    method: "allocation_request",
    doc: frm.doc,
    args: {
      approver_user_id: approver_user_id,
    },
    freeze: true,
    freeze_message: __("Requesting Allocation..."),
    callback: function (resp) {
      console.log("Allocation request response:", resp); // Debug log

      if (resp.message?.success) {
        frappe.show_alert({
          message: __("Allocation request sent to {0} for approval", [
            approver_name,
          ]),
          indicator: "green",
        });
        frm.reload_doc();
      } else {
        frappe.show_alert({
          message:
            resp.message?.message || __("Error sending allocation request"),
          indicator: "red",
        });
      }
    },
    error: function (error) {
      console.error("Error in allocation request:", error);
      frappe.show_alert({
        message: __("Failed to send allocation request"),
        indicator: "red",
      });
    },
  });
}
