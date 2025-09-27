frappe.ui.form.on("Finacle Settings", {
  refresh: function (frm) {
    frm.add_custom_button(__("Test DB Connection"), function () {
      frappe.dom.freeze(__("Testing DB Connection..."));

      let timeout = setTimeout(() => {
        frappe.dom.unfreeze();
        frappe.msgprint(
          "Database connection test is taking too long. Please try again later."
        );
      }, 15000); // 15 seconds timeout

      frappe.call({
        method: "sahayog.api.user_unlock.test_db_connection",
        args: {},
        callback: function (r) {
          clearTimeout(timeout); // clear timeout if response comes
          frappe.dom.unfreeze();

          if (r.message && r.message.success) {
            frappe.msgprint(__("Database connection successful!"));
          } else {
            let msg =
              r.message && r.message.message
                ? r.message.message
                : "Unknown error";
            frappe.msgprint("Database connection failed: " + msg);
          }
        },
        error: function () {
          clearTimeout(timeout); // clear timeout on error
          frappe.dom.unfreeze();
          frappe.msgprint("Database connection failed: Unknown error");
        },
      });
    });
  },
});
