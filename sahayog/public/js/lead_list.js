frappe.listview_settings["Lead"] = {
  refresh(listview) {
    const is_privileged = frappe.user_roles.includes("System Manager") || frappe.session.user === "Administrator";
    if (is_privileged) {
      listview.page.add_inner_button(__("Generate Fast Report"), function () {
        frappe.show_alert({ message: __("Generating CSV Report..."), indicator: "orange" });
        frappe.call({
          method: "sahayog.scrm.api.report_access.generate_fast_lead_report",
          freeze: true,
          freeze_message: __("Generating Fast Lead Report..."),
          callback: function (r) {
            if (r.message && r.message.status === "success") {
              frappe.msgprint({
                title: __("Report Generated"),
                indicator: "green",
                message: __(`Report generated successfully using <b>${r.message.method}</b>.<br>File Size: <b>${r.message.size_kb} KB</b>.<br>Click 'Download Report' to download the CSV.`)
              });
            }
          }
        });
      }, __("Fast Report Test"));

      listview.page.add_inner_button(__("Download Report"), function () {
        let download_url = "/api/method/sahayog.scrm.api.report_access.download_fast_lead_report";
        window.open(download_url, "_blank");
      }, __("Fast Report Test"));
    }

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
