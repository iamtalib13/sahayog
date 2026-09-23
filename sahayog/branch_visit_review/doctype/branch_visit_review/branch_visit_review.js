// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Branch Visit Review", {
	refresh(frm) {
		if (frappe.session.user !== "Administrator") {
			frm.set_df_property("review_section", "hidden", 1);
		}
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
	validate(frm) {
		if (frm.doc.responses && frm.doc.responses.length > 0) {
			let strengths = frm.doc.responses
				.filter(function (r) { return r.response && parseInt(r.response) >= 3; })
				.map(function (r) { return r.parameter_name; })
				.join("\n");
			frm.set_value("key_strengths", strengths);
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
			let all_items = r.message || [];
			let checklist_html = "";

			if (all_items.length > 0) {
				let grouped = {};
				all_items.forEach(function (row, i) {
					let cat = row.category || "Uncategorized";
					if (!grouped[cat]) grouped[cat] = [];
					row._idx = i;
					grouped[cat].push(row);
				});

				let sr = 1;
				Object.keys(grouped).forEach(function (cat) {
					checklist_html += "<h5 style='margin-top:15px;margin-bottom:5px;'><b>" + cat + "</b></h5>";
					checklist_html += "<table class='table table-bordered'><thead><tr><th>Sr</th><th>Evaluation Parameter / Question</th><th>Response Type</th></tr></thead><tbody>";
					grouped[cat].forEach(function (row) {
						let i = row._idx;
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
						checklist_html += "<tr><td>" + sr + "</td><td>" + (row.parameter_name || "") + "</td><td>" + response_html + "</td></tr>";
						sr++;
					});
					checklist_html += "</tbody></table>";
				});

				if (frm.doc.responses && frm.doc.responses.length > 0) {
					let custom_items = [];
					frm.doc.responses.forEach(function (resp) {
						let exists = all_items.find(function (t) { return t.parameter_name === resp.parameter_name; });
						if (!exists) custom_items.push(resp);
					});
					if (custom_items.length > 0) {
						checklist_html += "<h5 style='margin-top:15px;margin-bottom:5px;'><b>Additional Items</b></h5>";
						checklist_html += "<table class='table table-bordered'><thead><tr><th>Sr</th><th>Evaluation Parameter / Question</th><th>Response Type</th></tr></thead><tbody>";
						custom_items.forEach(function (resp) {
							let response_html = '<input type="text" class="form-control observation-input" placeholder="Enter the text" value="' + (resp.response || "") + '">';
							checklist_html += "<tr><td>" + sr + "</td><td>" + (resp.parameter_name || "") + "</td><td>" + response_html + "</td></tr>";
							sr++;
							all_items.push(resp);
						});
						checklist_html += "</tbody></table>";
					}
				}
				checklist_html += "<button class='btn btn-sm btn-default add-row-btn' style='margin-top:5px;'>Add</button>";
			}

			let action_html = "<table class='table table-bordered'><thead><tr><th>No.</th><th>Action</th><th>Assigned To</th><th>Due Date</th></tr></thead><tbody>";
			if (frm.doc.action_items && frm.doc.action_items.length > 0) {
				frm.doc.action_items.forEach(function (item, i) {
					action_html += "<tr><td>" + (i + 1) + "</td><td>" + (item.action || "") + "</td><td>" + (item.assigned_to || "") + "</td><td>" + (item.due_date || "") + "</td></tr>";
				});
			}
			action_html += "</tbody></table>";

			let tabs_html = "<ul class='nav nav-tabs' style='margin-bottom:15px;'>";
			tabs_html += "<li class='active'><a class='tab-review' style='cursor:pointer;'>Review Checklist</a></li>";
			tabs_html += "<li><a class='tab-action' style='cursor:pointer;'>Action Items</a></li>";
			tabs_html += "</ul>";
			tabs_html += "<div class='tab-content-review'>" + checklist_html + "</div>";
			tabs_html += "<div class='tab-content-action' style='display:none;'>" + action_html + "</div>";

			frm.fields_dict.checklist.$wrapper.html(tabs_html);

			let template_items = r.message || [];

			frm.fields_dict.checklist.$wrapper.find(".tab-review").on("click", function () {
				frm.fields_dict.checklist.$wrapper.find(".nav-tabs li").removeClass("active");
				$(this).parent().addClass("active");
				frm.fields_dict.checklist.$wrapper.find(".tab-content-review").show();
				frm.fields_dict.checklist.$wrapper.find(".tab-content-action").hide();
			});

			frm.fields_dict.checklist.$wrapper.find(".tab-action").on("click", function () {
				frm.fields_dict.checklist.$wrapper.find(".nav-tabs li").removeClass("active");
				$(this).parent().addClass("active");
				frm.fields_dict.checklist.$wrapper.find(".tab-content-review").hide();
				frm.fields_dict.checklist.$wrapper.find(".tab-content-action").show();
			});

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
				let count = frm.fields_dict.checklist.$wrapper.find(".tab-content-review tbody tr").length + 1;
				let new_row = "<tr><td>" + count + "</td><td><input type='text' class='form-control custom-category' placeholder='Section / Category'></td><td><input type='text' class='form-control custom-parameter' placeholder='Evaluation Parameter / Question'></td><td><input type='text' class='form-control custom-response' placeholder='Enter the text'></td></tr>";
				frm.fields_dict.checklist.$wrapper.find(".tab-content-review tbody").append(new_row);
				let $newRow = frm.fields_dict.checklist.$wrapper.find(".tab-content-review tbody tr:last");
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
		},
	});
}
