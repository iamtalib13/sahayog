// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Branch Visit Review", {
	refresh(frm) {
		if (!frm.doc.visited_by) {
			frm.set_value("visited_by", "3130");
		}
		if (frm.doc.template) {
			render_checklist(frm, frm.doc.template);
		} else {
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
			render_checklist(frm, frm.doc.template);
		}
	},
});

function render_checklist(frm, template) {
	frappe.call({
		method: "sahayog.branch_visit_review.api.get_template_items",
		args: { template: template },
		callback: function (r) {
			if (r.message && r.message.length > 0) {
				let html = "<h4>Review Checklist</h4><table class='table table-bordered'><thead><tr><th>No.</th><th>Section / Category</th><th>Evaluation Parameter / Question</th><th>Response Type</th></tr></thead><tbody>";
				r.message.forEach(function (row, i) {
					let saved = frm.doc.responses ? frm.doc.responses.find(function (r) { return r.parameter_name === row.parameter_name; }) : null;
					let saved_val = saved ? saved.response : "";
					let response_html = "";
					if (row.response_type === "Rating (1 to 5)") {
						response_html = '<span class="rating-stars" data-parameter="' + i + '">';
						for (let s = 1; s <= 5; s++) {
							let color = (saved_val && s <= parseInt(saved_val)) ? "gold" : "gray";
							response_html += '<span class="star" data-value="' + s + '" style="cursor:pointer;font-size:20px;color:' + color + ';">&#9733;</span>';
						}
						response_html += '</span>';
					} else if (row.response_type === "Yes / No") {
						let yes_checked = saved_val === "Yes" ? "checked" : "";
						let no_checked = saved_val === "No" ? "checked" : "";
						response_html = '<span class="yesno-group" data-parameter="' + i + '">';
						response_html += '<label style="margin-right:10px;"><input type="radio" name="yesno_' + i + '" value="Yes" ' + yes_checked + '> Yes</label>';
						response_html += '<label><input type="radio" name="yesno_' + i + '" value="No" ' + no_checked + '> No</label>';
						response_html += '</span>';
					} else {
						response_html = '<input type="text" class="form-control observation-input" data-parameter="' + i + '" placeholder="Enter the text" value="' + (saved_val || "") + '">';
					}
					html += "<tr><td>" + (i + 1) + "</td><td>" + (row.category || "") + "</td><td>" + (row.parameter_name || "") + "</td><td>" + response_html + "</td></tr>";
				});
				html += "</tbody></table>";
				html += "<button class='btn btn-sm btn-default add-row-btn' style='margin-top:5px;'>Add</button>";
				frm.fields_dict.checklist.$wrapper.html(html);

				let template_items = r.message;

				frm.fields_dict.checklist.$wrapper.find(".star").on("click", function () {
					let $this = $(this);
					let val = parseInt($this.data("value"));
					let $container = $this.closest(".rating-stars");
					let param_idx = $container.data("parameter");
					$container.find(".star").each(function () {
						let v = $(this).data("value");
						$(this).css("color", v <= val ? "gold" : "gray");
					});
					let item = template_items[param_idx];
					let existing = frm.doc.responses.find(function (r) { return r.parameter_name === item.parameter_name; });
					if (existing) {
						existing.response = val;
					} else {
						frm.add_child("responses", {
							category: item.category,
							parameter_name: item.parameter_name,
							response: val,
						});
					}
					frm.refresh_field("responses");
				});

				frm.fields_dict.checklist.$wrapper.find(".yesno-group input[type='radio']").on("change", function () {
					let $this = $(this);
					let val = $this.val();
					let $container = $this.closest(".yesno-group");
					let param_idx = $container.data("parameter");
					let item = template_items[param_idx];
					let existing = frm.doc.responses.find(function (r) { return r.parameter_name === item.parameter_name; });
					if (existing) {
						existing.response = val;
					} else {
						frm.add_child("responses", {
							category: item.category,
							parameter_name: item.parameter_name,
							response: val,
						});
					}
					frm.refresh_field("responses");
				});

				frm.fields_dict.checklist.$wrapper.find(".observation-input").on("blur", function () {
					let $this = $(this);
					let param_idx = $this.data("parameter");
					let val = $this.val();
					if (val) {
						let item = template_items[param_idx];
						let existing = frm.doc.responses.find(function (r) { return r.parameter_name === item.parameter_name; });
						if (existing) {
							existing.response = val;
						} else {
							frm.add_child("responses", {
								category: item.category,
								parameter_name: item.parameter_name,
								response: val,
							});
						}
						frm.refresh_field("responses");
					}
				});

				frm.fields_dict.checklist.$wrapper.find(".add-row-btn").on("click", function () {
					let count = frm.fields_dict.checklist.$wrapper.find("tbody tr").length + 1;
					let new_row = "<tr><td>" + count + "</td><td><input type='text' class='form-control custom-category' placeholder='Section / Category'></td><td><input type='text' class='form-control custom-parameter' placeholder='Evaluation Parameter / Question'></td><td><input type='text' class='form-control custom-response' placeholder='Enter the text'></td></tr>";
					frm.fields_dict.checklist.$wrapper.find("tbody").append(new_row);
					let $newRow = frm.fields_dict.checklist.$wrapper.find("tbody tr:last");
					$newRow.find(".custom-response").on("blur", function () {
						let category = $newRow.find(".custom-category").val() || "";
						let parameter = $newRow.find(".custom-parameter").val() || "";
						let response = $(this).val() || "";
						if (category || parameter || response) {
							frm.add_child("responses", {
								category: category,
								parameter_name: parameter,
								response: response,
							});
							frm.refresh_field("responses");
						}
					});
				});
			}
		},
	});
}
