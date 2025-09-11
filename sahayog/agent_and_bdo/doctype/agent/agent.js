// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Agent", {
  refresh(frm) {
    frm.clear_custom_buttons(); // remove old buttons

    frm.trigger("employee_details");

    // --- Unallocated: Show Allocate ---

    if (frm.doc.status === "Unallocated") {
      frm.add_custom_button(__("Allocate"), () => {
        frappe.confirm(
          __("Are you sure you want to request allocation?"),
          () => {
            // First get branch ma  nagers
            frm.call({
              method: "get_branch_managers",
              args: {
                branch_code: frm.doc.branch_code,
              },
              freeze: true,
              freeze_message: __("Getting Branch Managers..."),
              callback: function (r) {
                if (r.message && r.message.length > 0) {
                  // If only one manager found, directly proceed
                  if (r.message.length === 1) {
                    let manager = r.message[0];
                    if (!manager.user_id) {
                      frappe.msgprint({
                        title: __("No User Found"),
                        message: __(
                          "Branch Manager {0} does not have a user account",
                          [manager.employee_name]
                        ),
                        indicator: "red",
                      });
                      return;
                    }

                    // Direct allocation request for single manager
                    send_allocation_request(
                      frm,
                      manager.user_id,
                      manager.employee_name
                    );
                  } else {
                    // Multiple managers - show selection dialog
                    show_manager_selection_dialog(frm, r.message);
                  }
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

    frappe.db
      .get_value("Employee", employee, [
        "employee_number",
        "employee_name",
        "branch",
        "department",
        "designation",
      ])
      .then((r) => {
        if (r.message) {
          let emp = r.message;
          console.log(emp);

          frm.set_intro(`
                    <div style="
                        background: linear-gradient(135deg, #006768 0%, #004a4b 100%);
                        border-radius: 12px;
                        padding: 0;
                        margin: 10px 0;
                        box-shadow: 0 4px 15px rgba(0,103,104,0.2);
                        overflow: hidden;
                    ">
                        <!-- Header -->
                        <div style="
                            background: rgba(255,255,255,0.15);
                            color: white;
                            padding: 15px 20px;
                            border-bottom: 1px solid rgba(255,255,255,0.2);
                        ">
                            <h4 style="margin: 0; display: flex; align-items: center;">
                                <i class="fa fa-id-card-o" style="margin-right: 8px;"></i>
                                Employee Information
                            </h4>
                        </div>
                        
                        <!-- Content -->
                        <div style="
                            background: white;
                            padding: 20px;
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                            gap: 15px;
                        ">
                            <div style="display: flex; align-items: center;">
                                <div style="
                                    width: 40px;
                                    height: 40px;
                                    background: #006768;
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    margin-right: 12px;
                                ">
                                    <i class="fa fa-hashtag" style="color: white; font-size: 14px;"></i>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6c757d; font-weight: 500;">
                                        EMPLOYEE NUMBER
                                    </div>
                                    <div style="font-size: 16px; font-weight: 600; color: #2c3e50;">
                                        ${emp.employee_number || "Not Assigned"}
                                    </div>
                                </div>
                            </div>

                            <div style="display: flex; align-items: center;">
                                <div style="
                                    width: 40px;
                                    height: 40px;
                                    background: #008b8d;
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    margin-right: 12px;
                                ">
                                    <i class="fa fa-user" style="color: white; font-size: 14px;"></i>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6c757d; font-weight: 500;">
                                        FULL NAME
                                    </div>
                                    <div style="font-size: 16px; font-weight: 600; color: #2c3e50;">
                                        ${emp.employee_name || "Not Provided"}
                                    </div>
                                </div>
                            </div>

                            <div style="display: flex; align-items: center;">
                                <div style="
                                    width: 40px;
                                    height: 40px;
                                    background: #00a0a3;
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    margin-right: 12px;
                                ">
                                    <i class="fa fa-building" style="color: white; font-size: 14px;"></i>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6c757d; font-weight: 500;">
                                        BRANCH
                                    </div>
                                    <div style="font-size: 16px; font-weight: 600; color: #2c3e50;">
                                        ${emp.branch || "Not Assigned"}
                                    </div>
                                </div>
                            </div>

                            ${
                              emp.department
                                ? `
                            <div style="display: flex; align-items: center;">
                                <div style="
                                    width: 40px;
                                    height: 40px;
                                    background: #00b5b8;
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    margin-right: 12px;
                                ">
                                    <i class="fa fa-users" style="color: white; font-size: 14px;"></i>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6c757d; font-weight: 500;">
                                        DEPARTMENT
                                    </div>
                                    <div style="font-size: 16px; font-weight: 600; color: #2c3e50;">
                                        ${emp.department}
                                    </div>
                                </div>
                            </div>
                            `
                                : ""
                            }

                            ${
                              emp.designation
                                ? `
                            <div style="display: flex; align-items: center;">
                                <div style="
                                    width: 40px;
                                    height: 40px;
                                    background: #00cacf;
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    margin-right: 12px;
                                ">
                                    <i class="fa fa-star" style="color: white; font-size: 14px;"></i>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6c757d; font-weight: 500;">
                                        DESIGNATION
                                    </div>
                                    <div style="font-size: 16px; font-weight: 600; color: #2c3e50;">
                                        ${emp.designation}
                                    </div>
                                </div>
                            </div>
                            `
                                : ""
                            }
                        </div>

                        <!-- Quick Actions -->
                        <div style="
                            background: linear-gradient(to right, #f8f9fa, #e8f4f5);
                            padding: 15px 20px;
                            border-top: 1px solid #e9ecef;
                            text-align: center;
                        ">
                            <button class="btn btn-sm" 
                                    onclick="frappe.set_route('List', 'Agent', {'employee': '${employee}'})"
                                    style="
                                        background: #006768;
                                        color: white;
                                        border: 1px solid #006768;
                                        transition: all 0.3s ease;
                                        padding: 8px 20px;
                                    "
                                    onmouseover="this.style.background='#004a4b'"
                                    onmouseout="this.style.background='#006768'">
                                <i class="fa fa-list"></i> View All Agents
                            </button>
                        </div>
                    </div>
                `);
        }
      })
      .catch((error) => {
        console.error("Error fetching employee details:", error);
        frm.set_intro(`
                <div style="
                    background: linear-gradient(135deg, #dc3545, #c82333);
                    color: white;
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid #dc3545;
                    box-shadow: 0 2px 8px rgba(220,53,69,0.2);
                ">
                    <i class="fa fa-exclamation-triangle" style="margin-right: 8px;"></i> 
                    Failed to load employee details. Please try again.
                </div>
            `);
      });
  },
});

function show_manager_selection_dialog(frm, managers) {
  // Filter managers who have user_id
  let valid_managers = managers.filter((manager) => manager.user_id);

  if (valid_managers.length === 0) {
    frappe.msgprint({
      title: __("No Valid Approvers"),
      message: __("No Branch Managers have user accounts to approve requests"),
      indicator: "red",
    });
    return;
  }

  let dialog = new frappe.ui.Dialog({
    title: __("Select Branch Manager for Approval"),
    size: "medium",
    fields: [
      {
        fieldtype: "Select",
        fieldname: "selected_manager",
        label: __("Select Branch Manager"),
        options: valid_managers.map(
          (manager) =>
            `${manager.user_id}::${manager.employee_name} (${manager.name})`
        ),
        reqd: 1,
        description: __("Select one Branch Manager to send approval request"),
      },
      {
        fieldtype: "HTML",
        fieldname: "manager_details_html",
      },
    ],
    primary_action_label: __("Send for Approval"),
    primary_action: function (values) {
      if (values.selected_manager) {
        let [user_id, display_name] = values.selected_manager.split("::");
        let employee_name = display_name.split(" (")[0];

        send_allocation_request(frm, user_id, employee_name);
        dialog.hide();
      }
    },
  });

  // Create HTML showing manager details
  let html = '<div class="row"><div class="col-md-12">';
  html += '<h6 class="text-muted">Available Branch Managers:</h6>';
  html +=
    '<div class="manager-list" style="max-height: 200px; overflow-y: auto;">';

  valid_managers.forEach((manager) => {
    html += `<div class="manager-item" style="padding: 8px; border: 1px solid #e0e0e0; margin-bottom: 5px; border-radius: 4px;">
            <strong>${manager.employee_name}</strong> (${manager.name})<br>
            <small class="text-muted">User: ${manager.user_id}</small>
        </div>`;
  });

  html += "</div></div></div>";
  dialog.fields_dict.manager_details_html.$wrapper.html(html);

  dialog.show();
}

function send_allocation_request(frm, approver_user_id, approver_name) {
  frm.call({
    method: "allocation_request",
    doc: frm.doc,
    args: {
      approver_user_id: approver_user_id,
    },
    freeze: true,
    freeze_message: __("Requesting Allocation..."),
    callback: function (resp) {
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
  });
}
