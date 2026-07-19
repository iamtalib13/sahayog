// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Sahayog HR Setting", {
	refresh(frm) {
		if (!frm.doc.employee_master) return;

		frm.add_custom_button(__("Insert Employee"), () => {
			frappe.confirm(
				__("Are you sure you want to insert new employees from the uploaded file?"),
				() => {
					frappe.call({
						method: "sahayog.hrms.doctype.sahayog_hr_setting.sahayog_hr_setting.insert_employees",
						btn: $(".btn-primary"),
						freeze: true,
						freeze_message: __("Inserting employees..."),
						callback: (r) => {
							frm.refresh();
							frappe.msgprint({
								title: __("Import Complete"),
								message: r.message || __("Done"),
								indicator: "green",
							});
						},
					});
				}
			);
		}, __("Action"));

		frm.add_custom_button(__("Update Employee"), () => {
			frappe.confirm(
				__("Are you sure you want to update existing employees from the uploaded file?"),
				() => {
					frappe.call({
						method: "sahayog.hrms.doctype.sahayog_hr_setting.sahayog_hr_setting.update_employees",
						btn: $(".btn-primary"),
						freeze: true,
						freeze_message: __("Updating employees..."),
						callback: (r) => {
							frm.refresh();
							frappe.msgprint({
								title: __("Update Complete"),
								message: r.message || __("Done"),
								indicator: "blue",
							});
						},
					});
				}
			);
		}, __("Action"));
	},
});
