// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Branch Visit Review", {
	refresh(frm) {
		if (!frm.doc.visited_by) {
			frm.set_value("visited_by", "3130");
		}
		if (!frm.doc.template) {
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Branch Visit Template",
					fields: ["name"],
					limit_page_length: 2,
				},
				callback: function (r) {
					if (r.message && r.message.length === 1) {
						frm.set_value("template", r.message[0].name);
					}
				},
			});
		}
	},
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
						method: "sahayog.branch_visit_review.api.get_branch_manager",
						args: { sol_id: r.message.sol_id },
							callback: function (r) {
								if (r.message && r.message.length > 0) {
									console.log("Branch Manager:", r.message);
									frm.set_value("branch_head", r.message[0].employee_name + "(" + r.message[0].name + ")");
								}
							},
						});
					}
				},
			});
		}
	},
	template(frm) {
		if (frm.doc.template) {
			frappe.call({
				method: "sahayog.branch_visit_review.api.get_template_items",
				args: { template: frm.doc.template },
				callback: function (r) {
					if (r.message && r.message.length > 0) {
						let html = "<table class='table table-bordered'><thead><tr><th>No.</th><th>Section / Category</th><th>Evaluation Parameter / Question</th><th>Response Type</th></tr></thead><tbody>";
						r.message.forEach(function (row, i) {
							let response_html = "";
							if (row.response_type === "Rating (1 to 5)") {
								response_html = '<span class="text-warning">&#9733;&#9733;&#9733;&#9733;&#9733;</span>';
							} else {
								response_html = '<input type="text" class="form-control" placeholder="Enter the text">';
							}
							html += "<tr><td>" + (i + 1) + "</td><td>" + (row.category || "") + "</td><td>" + (row.parameter_name || "") + "</td><td>" + response_html + "</td></tr>";
						});
						html += "</tbody></table>";
						frm.fields_dict.checklist.$wrapper.html(html);
					}
				},
			});
		}
	},
});
