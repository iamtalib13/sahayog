frappe.listview_settings["Lead"] = {
  refresh(listview) {
    listview.page.add_inner_button(__("Filter by Employee"), function () {
      let dialog = new frappe.ui.Dialog({
        title: __("Select Employee"),
        fields: [
          {
            fieldname: "employee",
            fieldtype: "Link",
            options: "Employee",
            label: __("Employee"),
            reqd: 1,
          },
        ],
        primary_action_label: __("Apply Filter"),
        primary_action(values) {
          let emp = values.employee;
          if (!emp) {
            frappe.msgprint(__("Please select an employee"));
            return;
          }
          frappe.db.get_value("Employee", emp, "user_id").then((r) => {
            let user_id = (r.message && r.message.user_id) || null;
            if (user_id) {
              listview.filter_area.clear().then(() => {
                listview.filter_area.add("Lead", "lead_owner", "=", user_id);
              });
              dialog.hide();
            } else {
              frappe.msgprint(
                __("Selected employee does not have a User ID linked"),
              );
            }
          });
        },
      });
      dialog.show();
    });
  },
};
