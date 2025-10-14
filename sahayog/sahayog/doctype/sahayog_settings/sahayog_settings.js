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
    if (!frm.doc.agent_automation_days) {
      frappe.msgprint({
        title: __("Missing Value"),
        message: __("Please enter Agent Automation Days before creating agents."),
        indicator: "orange",
      });
      return;
    }

    // Calculate dates based on user input
    const end_date = frappe.datetime.get_today();
    const start_date = frappe.datetime.add_days(
      end_date,
      -frm.doc.agent_automation_days
    );

    frappe.call({
      method: "sahayog.api.auto_agent_creation.sync_agents_to_doctype",
      args: {
        start_date: start_date,
        end_date: end_date,
      },
      freeze: true,
      freeze_message: __("Creating Agents... Please wait."),
      callback: function (r) {
        if (r && r.message && r.message.status === "success") {
          frappe.msgprint({
            title: __("Success"),
            message: __(r.message.message),
            indicator: "green",
          });
        } else {
          frappe.msgprint({
            title: __("Error"),
            message: __("Something went wrong. Check server logs."),
            indicator: "red",
            // 
          });
        }
      },
    });
  },
});