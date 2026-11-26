frappe.ui.form.on("Sahayog Settings", {
  refresh: function (frm) {
    frm.trigger("toggle_crm_alert_fields");

    if (!frm.is_new()) {
      frm
        .add_custom_button(__("Create Bulk Employee Warehouses"), function () {
          frappe.call({
            method:
              "sahayog.patches.fixtures.add_employee_warehouses.start_employee_warehouse_creation",
            callback: function (response) {
              console.log(response);
              frappe.msgprint(__("✅ Background Job Started!"));
            },
          });
        })
        .addClass("btn-primary");
    }
  },

  enable_crm_inactivity_alerts: function (frm) {
    frm.trigger("toggle_crm_alert_fields");
  },

  toggle_crm_alert_fields: function (frm) {
    let masterEnabled = Boolean(frm.doc.enable_crm_inactivity_alerts);
    frm.set_df_property("enable_crm_alert_to", "read_only", masterEnabled ? 0 : 1);
    frm.set_df_property("enable_crm_alert_cc", "read_only", masterEnabled ? 0 : 1);
  },
});
