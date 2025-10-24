frappe.ui.form.on("Sahayog Settings", {
  refresh: function (frm) {
    if (!frm.is_new()) {
      frm
        .add_custom_button(__("Create Bulk Employee Warehouses"), function () {
          frappe.call({
            method:
              "sahayog.patches.fixtures.add_employee_warehouses.start_employee_warehouse_creation",
            callback: function (response) {
              console.log(response);
              frappe.msgprint(__("✅ Background Job Started!"));
              //frappe.msgprint(__("Employee Warehouses Created Successfully!"));
              //frm.reload_doc();
            },
          });
        })
        .addClass("btn-primary");
    }
  },

  create_agents: function (frm) {
    // Simple validation
    if (!frm.doc.agent_automation_days) {
      frappe.msgprint({
        title: __("Missing Value"),
        message: __(
          "Please enter Agent Automation Days before creating agents."
        ),
        indicator: "orange",
      });
      return;
    }

    // Direct API call - no need to calculate dates in frontend
    frappe.call({
      method:
        "sahayog.api.auto_agent_creation.auto_create_agents_from_scheduler",
      freeze: true,
      freeze_message: __("Creating Agents... Please wait."),
      callback: function (r) {
        if (r.message && r.message.status === "success") {
          frappe.msgprint({
            title: __("Success"),
            message: __(r.message.message),
            indicator: "green",
          });
          frm.reload_doc(); // Refresh form after success
        } else {
          frappe.msgprint({
            title: __("Error"),
            message: __("Something went wrong. Check server logs."),
            indicator: "red",
          });
        }
      },
    });
  },
});
