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

function bindCustomEvents(frm, $row, cat, $area) {
	$area.find(".star").on("click", function () {
		let val = parseInt($(this).data("value"));
		$area.find(".star").each(function () {
			$(this).css("color", parseInt($(this).data("value")) <= val ? "gold" : "gray");
		});
		let parameter = $row.find(".custom-parameter").val() || "";
		if (parameter) {
			let existing = frm.doc.responses.find(function (r) { return r.parameter_name === parameter; });
			if (existing) {
				existing.response = val;
			} else {
				frm.add_child("responses", {
					category: cat.replace(/_/g, " "),
					parameter_name: parameter,
					response: val,
				});
			}
			frm.refresh_field("responses");
		}
	});

	$area.find("input[type='radio']").on("change", function () {
		let val = $(this).val();
		let parameter = $row.find(".custom-parameter").val() || "";
		if (parameter) {
			let existing = frm.doc.responses.find(function (r) { return r.parameter_name === parameter; });
			if (existing) {
				existing.response = val;
			} else {
				frm.add_child("responses", {
					category: cat.replace(/_/g, " "),
					parameter_name: parameter,
					response: val,
				});
			}
			frm.refresh_field("responses");
		}
	});

	$area.find(".custom-response-input").on("blur", function () {
		let val = $(this).val();
		let parameter = $row.find(".custom-parameter").val() || "";
		if (val && parameter) {
			let existing = frm.doc.responses.find(function (r) { return r.parameter_name === parameter; });
			if (existing) {
				existing.response = val;
			} else {
				frm.add_child("responses", {
					category: cat.replace(/_/g, " "),
					parameter_name: parameter,
					response: val,
				});
			}
			frm.refresh_field("responses");
		}
	});
}

function render_checklist(frm, template) {
	frappe.call({
		method: "sahayog.branch_visit_review.api.get_employee_list",
		callback: function (emp_r) {
			let employees = emp_r.message || [];
			let employee_options = "";
			employees.forEach(function (emp) {
				let label = emp.employee_name ? emp.employee_name + "(" + emp.name + ")" : emp.name;
				employee_options += "<option value='" + emp.name + "'>" + label + "</option>";
			});
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
					let safe_cat = cat.replace(/[^a-zA-Z0-9]/g, "_");
					checklist_html += "<div class='category-header'><h5>" + cat + "</h5><button class='bvr-btn-add add-category-row' data-category='" + safe_cat + "' title='Add new row'>+</button></div>";
					checklist_html += "<table class='category-table' data-category='" + safe_cat + "'><thead><tr><th style='width:50px;'>Sr</th><th>Evaluation Parameter / Question</th><th style='width:280px;'>Response Type</th></tr></thead><tbody>";
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
						checklist_html += "<div class='category-header'><h5>Additional Items</h5></div>";
						checklist_html += "<table><thead><tr><th style='width:50px;'>Sr</th><th>Evaluation Parameter / Question</th><th style='width:280px;'>Response Type</th></tr></thead><tbody>";
						custom_items.forEach(function (resp) {
							let response_html = '<input type="text" class="form-control observation-input" placeholder="Enter the text" value="' + (resp.response || "") + '">';
							checklist_html += "<tr><td>" + sr + "</td><td>" + (resp.parameter_name || "") + "</td><td>" + response_html + "</td></tr>";
							sr++;
							all_items.push(resp);
						});
						checklist_html += "</tbody></table>";
					}
				}
			}

			let action_html = "<table class='action-items-table'><thead><tr><th style='width:40px;'>No.</th><th>Action Item</th><th>Responsible</th><th style='width:100px;'>Priority</th><th style='width:130px;'>Target Date</th><th style='width:110px;'>Status</th><th>Resolution Notes</th></tr></thead><tbody>";
			if (frm.doc.action_items && frm.doc.action_items.length > 0) {
				frm.doc.action_items.forEach(function (item, i) {
					let owner_display = item.owner || "";
					if (item.owner) {
						let emp = employees.find(function (e) { return e.name === item.owner; });
						if (emp && emp.employee_name) owner_display = emp.employee_name + "(" + emp.name + ")";
					}
					action_html += "<tr><td>" + (i + 1) + "</td><td>" + (item.action_item || "") + "</td><td><div class='employee-search-wrapper' data-value='" + (item.owner || "") + "'><input type='text' class='form-control employee-search-input' placeholder='Search employee' value='" + owner_display + "'><div class='employee-dropdown' style='display:none;'></div></div></td><td>" + (item.priority || "") + "</td><td>" + (item.tat || "") + "</td><td>" + (item.status || "") + "</td><td>" + (item.resolution_notes || "") + "</td></tr>";
				});
			}
			let action_count = (frm.doc.action_items ? frm.doc.action_items.length : 0) + 1;
			action_html += "<tr><td>" + action_count + "</td>";
			action_html += "<td><input type='text' class='form-control action-input' data-field='action_item' placeholder='Enter action item'></td>";
			action_html += "<td><div class='employee-search-wrapper' data-value=''><input type='text' class='form-control employee-search-input' placeholder='Search employee' value=''><div class='employee-dropdown' style='display:none;'></div></div></td>";
			action_html += "<td><select class='form-control action-input' data-field='priority'><option value='Medium'>Medium</option><option value='High'>High</option><option value='Low'>Low</option></select></td>";
			action_html += "<td><input type='date' class='form-control action-input' data-field='tat'></td>";
			action_html += "<td><select class='form-control action-input' data-field='status'><option value='Open'>Open</option><option value='In Progress'>In Progress</option><option value='Resolved'>Resolved</option></select></td>";
			action_html += "<td><input type='text' class='form-control action-input' data-field='resolution_notes' placeholder='Enter notes'></td>";
			action_html += "</tr>";
			action_html += "</tbody></table>";
			action_html += "<button class='bvr-btn-add bvr-btn-action add-action-row'>+ Add Action Item</button>";

			let tabs_html = "<div class='bvr-tabs'><ul class='nav nav-tabs'>";
			tabs_html += "<li class='active'><a class='tab-review' style='cursor:pointer;'>Review Checklist</a></li>";
			tabs_html += "<li><a class='tab-action' style='cursor:pointer;'>Action Items</a></li>";
			tabs_html += "</ul>";
			tabs_html += "<div class='tab-content-review'>" + checklist_html + "</div>";
			tabs_html += "<div class='tab-content-action' style='display:none;'>" + action_html + "</div></div>";

			frm.fields_dict.checklist.$wrapper.html(tabs_html);

			let style = `<style>
				.bvr-tabs .nav-tabs { border-bottom: 2px solid #d1d8dd; margin-bottom: 12px; }
				.bvr-tabs .tab-content-review { width: 100%; }
				.bvr-tabs .nav-tabs > li > a { border: none; color: #6c7680; font-weight: 600; padding: 8px 16px; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
				.bvr-tabs .nav-tabs > li.active > a, .bvr-tabs .nav-tabs > li > a:hover { border: none; color: #16181d; border-bottom: 2px solid #5e64ff; background: none; }
				.bvr-tabs .category-header { background: linear-gradient(135deg, #f5f7fa 0%, #eef1f5 100%); padding: 8px 12px; border-radius: 6px; margin: 12px 0 6px 0; display: flex; align-items: center; justify-content: space-between; border-left: 4px solid #5e64ff; box-sizing: border-box; }
				.bvr-tabs .category-header + table, .bvr-tabs .category-header + .category-table { width: 100%; }
				.bvr-tabs .category-header h5 { margin: 0; font-size: 13px; font-weight: 600; color: #16181d; }
				.bvr-tabs .category-header .bvr-btn-add { background: #5e64ff; color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; font-size: 16px; line-height: 22px; text-align: center; cursor: pointer; padding: 0; transition: all 0.2s; box-shadow: 0 2px 4px rgba(94,100,255,0.3); flex-shrink: 0; }
				.bvr-tabs .category-header .bvr-btn-add:hover { background: #4c53d0; transform: scale(1.1); box-shadow: 0 3px 8px rgba(94,100,255,0.4); }
				.bvr-tabs .category-header .bvr-btn-add:active { transform: scale(0.95); }
				.bvr-tabs table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 6px; }
				.bvr-tabs table thead th { background: #f8f9fb; color: #4a5568; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 7px 10px; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
				.bvr-tabs table tbody td { padding: 7px 10px; border-bottom: 1px solid #edf0f4; vertical-align: middle; font-size: 13px; }
				.bvr-tabs table tbody tr:last-child td { border-bottom: none; }
				.bvr-tabs table tbody tr:hover { background: #f7f8fc; }
				.bvr-tabs .rating-stars .star { display: inline-block; font-size: 20px; transition: all 0.15s; margin: 0; }
				.bvr-tabs .rating-stars .star:hover { transform: scale(1.25); }
				.bvr-tabs .yesno-group label { display: inline-flex; align-items: center; gap: 3px; cursor: pointer; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; transition: all 0.2s; margin-right: 4px; }
				.bvr-tabs .yesno-group input[type='radio'] { accent-color: #5e64ff; }
				.bvr-tabs .employee-search-wrapper { position: relative; min-width: 160px; }
				.bvr-tabs .employee-search-input { width: 100%; }
				.bvr-tabs .employee-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 100; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); max-height: 200px; overflow-y: auto; margin-top: 2px; }
				.bvr-tabs .employee-dropdown .employee-option { padding: 6px 10px; cursor: pointer; font-size: 12px; border-bottom: 1px solid #f5f5f5; transition: background 0.15s; }
				.bvr-tabs .employee-dropdown .employee-option:last-child { border-bottom: none; }
				.bvr-tabs .employee-dropdown .employee-option:hover { background: #f0f1ff; color: #5e64ff; }
				.bvr-tabs .bvr-btn-add { background: #5e64ff; color: #fff; border: none; border-radius: 6px; padding: 7px 16px; font-weight: 600; font-size: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(94,100,255,0.3); }
				.bvr-tabs .bvr-btn-add:hover { background: #4c53d0; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(94,100,255,0.35); }
				.bvr-tabs .bvr-btn-add:active { transform: translateY(0); }
				.bvr-tabs .bvr-btn-action { margin-top: 8px; }
				.bvr-tabs select.form-control, .bvr-tabs input.form-control { border-radius: 6px; border-color: #e2e8f0; font-size: 12px; padding: 5px 8px; height: auto; }
				.bvr-tabs select.form-control:focus, .bvr-tabs input.form-control:focus { border-color: #5e64ff; box-shadow: 0 0 0 2px rgba(94,100,255,0.15); }
			</style>`;
			frm.fields_dict.checklist.$wrapper.find("style").remove();
			frm.fields_dict.checklist.$wrapper.prepend(style);

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

			frm.fields_dict.checklist.$wrapper.find(".action-input").on("blur change", function () {
				let $row = $(this).closest("tr");
				let action_item = $row.find("[data-field='action_item']").val() || "";
				let owner = $row.find(".employee-search-wrapper").data("value") || "";
				let priority = $row.find("[data-field='priority']").val() || "Medium";
				let tat = $row.find("[data-field='tat']").val() || "";
				let status = $row.find("[data-field='status']").val() || "Open";
				let resolution_notes = $row.find("[data-field='resolution_notes']").val() || "";
				if (action_item) {
					let idx = $row.index();
					let last_row_idx = $row.closest("tbody").find("tr").length - 1;
					if (frm.doc.action_items && frm.doc.action_items[idx]) {
						frm.doc.action_items[idx].action_item = action_item;
						frm.doc.action_items[idx].owner = owner;
						frm.doc.action_items[idx].priority = priority;
						frm.doc.action_items[idx].tat = tat;
						frm.doc.action_items[idx].status = status;
						frm.doc.action_items[idx].resolution_notes = resolution_notes;
					} else {
						frm.add_child("action_items", {
							action_item: action_item,
							owner: owner,
							priority: priority,
							tat: tat,
							status: status,
							resolution_notes: resolution_notes,
						});
					}
					frm.refresh_field("action_items");
				}
			});

			frm.fields_dict.checklist.$wrapper.find(".add-action-row").on("click", function () {
				let $table = frm.fields_dict.checklist.$wrapper.find(".action-items-table");
				let count = $table.find("tbody tr").length + 1;
				let new_row = "<tr><td>" + count + "</td>";
				new_row += "<td><input type='text' class='form-control action-input' data-field='action_item' placeholder='Enter action item'></td>";
				new_row += "<td><div class='employee-search-wrapper' data-value=''><input type='text' class='form-control employee-search-input' placeholder='Search employee' value=''><div class='employee-dropdown' style='display:none;'></div></div></td>";
				new_row += "<td><select class='form-control action-input' data-field='priority'><option value='Medium'>Medium</option><option value='High'>High</option><option value='Low'>Low</option></select></td>";
				new_row += "<td><input type='date' class='form-control action-input' data-field='tat'></td>";
				new_row += "<td><select class='form-control action-input' data-field='status'><option value='Open'>Open</option><option value='In Progress'>In Progress</option><option value='Resolved'>Resolved</option></select></td>";
				new_row += "<td><input type='text' class='form-control action-input' data-field='resolution_notes' placeholder='Enter notes'></td>";
				new_row += "</tr>";
				$table.find("tbody").append(new_row);
			});

			frm.fields_dict.checklist.$wrapper.find(".employee-search-input").on("focus keyup", function () {
				let $wrapper = $(this).closest(".employee-search-wrapper");
				let $dropdown = $wrapper.find(".employee-dropdown");
				let query = $(this).val().toLowerCase();
				let filtered = employees.filter(function (emp) {
					let label = (emp.employee_name ? emp.employee_name + "(" + emp.name + ")" : emp.name).toLowerCase();
					return label.indexOf(query) > -1;
				});
				if (filtered.length > 0) {
					let options_html = "";
					filtered.forEach(function (emp) {
						let label = emp.employee_name ? emp.employee_name + "(" + emp.name + ")" : emp.name;
						options_html += "<div class='employee-option' style='padding:5px 10px;cursor:pointer;' data-name='" + emp.name + "'>" + label + "</div>";
					});
					$dropdown.html(options_html).show();
				} else {
					$dropdown.html("<div style='padding:5px 10px;color:#999;'>No results</div>").show();
				}
			});

			frm.fields_dict.checklist.$wrapper.on("click", ".employee-option", function () {
				let $wrapper = $(this).closest(".employee-search-wrapper");
				let $row = $wrapper.closest("tr");
				let name = $(this).data("name");
				let label = $(this).text();
				$wrapper.find(".employee-search-input").val(label);
				$wrapper.data("value", name);
				$wrapper.find(".employee-dropdown").hide();
				let idx = $row.index();
				if (frm.doc.action_items && frm.doc.action_items[idx]) {
					frm.doc.action_items[idx].owner = name;
					frm.refresh_field("action_items");
				}
			});

			frm.fields_dict.checklist.$wrapper.on("click", function (e) {
				if (!$(e.target).closest(".employee-search-wrapper").length) {
					frm.fields_dict.checklist.$wrapper.find(".employee-dropdown").hide();
				}
			});

			frm.fields_dict.checklist.$wrapper.find(".employee-search-input").on("blur", function () {
				let $wrapper = $(this).closest(".employee-search-wrapper");
				let val = $(this).val();
				let emp = employees.find(function (e) {
					let label = e.employee_name ? e.employee_name + "(" + e.name + ")" : e.name;
					return label === val || e.name === val;
				});
				$wrapper.data("value", emp ? emp.name : val);
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

			frm.fields_dict.checklist.$wrapper.find(".add-category-row").on("click", function () {
				let cat = $(this).data("category");
				let $table = frm.fields_dict.checklist.$wrapper.find(".category-table[data-category='" + cat + "']");
				let count = $table.find("tbody tr").length + 1;
				let custom_idx = "custom_" + cat + "_" + count;
				let select_html = "<select class='form-control custom-type-select' data-custom='" + custom_idx + "'>";
				select_html += "<option value=''>Select response type</option>";
				select_html += "<option value='Rating (1 to 5)'>Stars</option>";
				select_html += "<option value='Yes / No'>Y/N</option>";
				select_html += "<option value='Text'>Text</option>";
				select_html += "</select>";
				let response_html = "<div class='custom-response-area' data-custom='" + custom_idx + "'>" + select_html + "</div>";
				let new_row = "<tr><td>" + count + "</td><td><input type='text' class='form-control custom-parameter' placeholder='Evaluation Parameter / Question'></td><td>" + response_html + "</td></tr>";
				$table.find("tbody").append(new_row);
				let $newRow = $table.find("tbody tr:last");

				$newRow.find(".custom-type-select").on("change", function () {
					let val = $(this).val();
					let $area = $(this).closest(".custom-response-area");
					let cidx = $(this).data("custom");
					if (val === "Rating (1 to 5)") {
						let stars = '<span class="rating-stars" data-custom="' + cidx + '">';
						for (let s = 1; s <= 5; s++) {
							stars += '<span class="star" data-value="' + s + '" style="cursor:pointer;font-size:20px;color:gray;">&#9733;</span>';
						}
						stars += '</span>';
						$area.html(stars);
					} else if (val === "Yes / No") {
						let yn = '<span class="yesno-group" data-custom="' + cidx + '">';
						yn += '<label style="margin-right:10px;"><input type="radio" name="custom_yn_' + cidx + '" value="Yes"> Yes</label>';
						yn += '<label><input type="radio" name="custom_yn_' + cidx + '" value="No"> No</label>';
						yn += '</span>';
						$area.html(yn);
					} else if (val === "Text") {
						$area.html('<input type="text" class="form-control custom-response-input" placeholder="Enter the text">');
					} else {
						$area.html(select_html);
						$area.find(".custom-type-select").data("custom", cidx);
					}
					bindCustomEvents(frm, $newRow, cat, $area);
				});
			});
		},
	});
		},
	});
}
