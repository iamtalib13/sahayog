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
            frm.call({
              method: "allocation_request",
              doc: frm.doc,
              freeze: true,
              freeze_message: __("Requesting Allocation..."),
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
    }

    // --- Pending: Show Approve / Reject ---
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
      // Clear intro when no employee selected
      frm.set_intro("");
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
