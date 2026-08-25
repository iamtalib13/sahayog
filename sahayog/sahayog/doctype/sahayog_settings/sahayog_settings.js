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
            },
          });
        })
        .addClass("btn-primary");
    }
  },
});
