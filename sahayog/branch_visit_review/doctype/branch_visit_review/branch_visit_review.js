// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Branch Visit Review", {
	branch(frm) {
		if (frm.doc.branch) {
			frappe.call({
				method: "frappe.client.get_value",
				args: {
					doctype: "Sahayog Branch",
					filters: { name: frm.doc.branch },
					fieldname: "sol_id",
				},
				callback: function (r) {
					if (r.message && r.message.sol_id) {
						frappe.call({
							method: "frappe.client.get_list",
							args: {
								doctype: "Employee",
								filters: {
									sol_id: r.message.sol_id,
									designation: "BRANCH MANAGER",
								},
								fields: ["name", "employee_name", "sol_id", "designation"],
								limit_page_length: 0,
							},
							callback: function (r) {
								if (r.message) {
									console.log("Branch Manager:", r.message);
								}
							},
						});
					}
				},
			});
		}
	},
});
