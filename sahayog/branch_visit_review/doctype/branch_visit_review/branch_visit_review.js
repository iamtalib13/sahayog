// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Branch Visit Review", {
	refresh(frm) {
		if (frappe.session.user !== "Administrator") {
			frm.set_df_property("review_section", "hidden", 1);
			frm.set_df_property("action_section", "hidden", 1);
			frm.set_df_property("summary_section", "hidden", 1);
			frm.set_df_property("section_break_mibr", "hidden", 1);
		}
		load_visit_details_designations(frm);
		set_visit_details_access(frm);
		set_visitor_signoff_access(frm);
		set_branch_head_signoff_access(frm);
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
		if (!frm.doc.key_strengths && frm.doc.responses && frm.doc.responses.length > 0) {
			let strengths = frm.doc.responses
				.filter(function (r) { return r.response && parseInt(r.response) >= 3; })
				.map(function (r) { return r.parameter_name; })
				.join("\n");
			frm.set_value("key_strengths", strengths);
		}
	},
	branch(frm) {
		set_branch_head_signoff_access(frm);
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
	visited_by(frm) {
		set_visit_details_access(frm);
		set_visitor_signoff_access(frm);
	},
	overall_assessment(frm) {
		update_overall_badge(frm);
	},
	template(frm) {
		if (frm.doc.template) {
			render_checklist(frm, frm.doc.template);
		}
	},
});

function update_overall_badge(frm) {
	let $select = frm.fields_dict.checklist.$wrapper.find(".bvr-overall-select");
	if ($select.length) {
		$select.val(frm.doc.overall_assessment || "");
	}
}

const VISIT_DETAILS_FIELDS = [
	"branch",
	"branch_code",
	"region",
	"zone",
	"visit_date",
	"visited_by",
	"branch_head",
	"visit_duration",
	"template",
];

let visit_designations = ["Cluster Head", "Regional Head (RH)", "Zonal Head (ZH)"];
let visit_designations_loaded = false;

function load_visit_details_designations(frm) {
	frm.set_query("visited_by", function () {
		return { filters: { designation: ["in", visit_designations] } };
	});
	if (visit_designations_loaded) {
		return;
	}
	visit_designations_loaded = true;
	frappe.call({
		method: "sahayog.branch_visit_review.api.get_visit_details_designations",
		callback: function (r) {
			if (r.message && r.message.length) {
				visit_designations = r.message;
			}
		},
	});
}

function set_visit_details_access(frm) {
	let set_read_only = function (value) {
		VISIT_DETAILS_FIELDS.forEach(function (field) {
			frm.set_df_property(field, "read_only", value);
		});
	};
	if (frm.doc.docstatus) {
		set_read_only(1);
		return;
	}
	if (frappe.session.user === "Administrator") {
		set_read_only(0);
		return;
	}
	frappe.call({
		method: "sahayog.branch_visit_review.api.can_user_edit_visit_details",
		args: { visited_by: frm.doc.visited_by },
		callback: function (r) {
			set_read_only(!!r.message ? 0 : 1);
		},
	});
}

function set_visitor_signoff_access(frm) {
	set_signoff_access(
		frm,
		"visitor_signoff",
		frm.doc.visited_by,
		"sahayog.branch_visit_review.api.can_visitor_sign_off",
		"visited_by"
	);
}

function set_branch_head_signoff_access(frm) {
	set_signoff_access(
		frm,
		"branch_head_signoff",
		frm.doc.branch,
		"sahayog.branch_visit_review.api.can_branch_head_sign_off",
		"branch"
	);
}

function set_signoff_access(frm, flag_field, value, method, arg_name) {
	if (frm.doc.docstatus) {
		frm.set_df_property(flag_field, "read_only", 1);
		return;
	}
	if (frappe.session.user === "Administrator") {
		frm.set_df_property(flag_field, "read_only", 0);
		return;
	}
	if (!value) {
		frm.set_df_property(flag_field, "read_only", 1);
		return;
	}
	let args = {};
	args[arg_name] = value;
	frappe.call({
		method: method,
		args: args,
		callback: function (r) {
			let can_sign = !!r.message && !frm.doc.docstatus;
			frm.set_df_property(flag_field, "read_only", can_sign ? 0 : 1);
		},
	});
}

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

function bvr_escape(value) {
	return (value || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function open_action_item_dialog(frm, idx, item) {
	let is_add = idx === null || idx === undefined;
	$(".bvr-modal-overlay").remove();

	let select_options = function (options, selected) {
		let html = "";
		options.forEach(function (opt) {
			html += "<option value='" + opt + "'" + (selected === opt ? " selected" : "") + ">" + opt + "</option>";
		});
		return html;
	};

	let modal_html = "";
	modal_html += "<div class='bvr-modal-overlay'>";
	modal_html += "<div class='bvr-modal'>";
	modal_html += "<div class='bvr-modal-header'><h5>" + (is_add ? "Add Action Item" : "Edit Action Item") + "</h5><button class='bvr-modal-close' title='Close' type='button'>&times;</button></div>";
	modal_html += "<div class='bvr-modal-body'>";
	modal_html += "<div class='bvr-modal-field'><label>Action Item <span class='bvr-req'>*</span></label><input type='text' class='form-control bvr-modal-input' data-field='action_item' placeholder='Enter action item' value=\"" + bvr_escape(item.action_item) + "\"></div>";
	modal_html += "<div class='bvr-modal-field'><label>Responsible</label><div class='employee-search-wrapper bvr-modal-emp' data-value='" + bvr_escape(item.owner) + "'><input type='text' class='form-control bvr-modal-input employee-search-input' placeholder='Search employee' autocomplete='off' value=''><div class='employee-dropdown' style='display:none;'></div></div></div>";
	modal_html += "<div class='bvr-modal-grid'>";
	modal_html += "<div class='bvr-modal-field'><label>Priority</label><select class='form-control bvr-modal-input' data-field='priority'>" + select_options(["High", "Medium", "Low"], item.priority || "Medium") + "</select></div>";
	modal_html += "<div class='bvr-modal-field'><label>Target Date (TAT)</label><input type='date' class='form-control bvr-modal-input' data-field='tat' value='" + bvr_escape(item.tat) + "'></div>";
	modal_html += "<div class='bvr-modal-field'><label>Status</label><select class='form-control bvr-modal-input' data-field='status'>" + select_options(["Open", "In Progress", "Resolved"], item.status || "Open") + "</select></div>";
	modal_html += "</div>";
	modal_html += "<div class='bvr-modal-field'><label>Resolution Notes</label><textarea class='form-control bvr-modal-input' data-field='resolution_notes' rows='3' placeholder='Enter notes'>" + bvr_escape(item.resolution_notes) + "</textarea></div>";
	modal_html += "</div>";
	modal_html += "<div class='bvr-modal-footer'><button class='bvr-modal-btn bvr-modal-btn-cancel' type='button'>Cancel</button><button class='bvr-modal-btn bvr-modal-btn-save' type='button'>Save</button></div>";
	modal_html += "</div></div>";

	$("body").append(modal_html);

	let $overlay = $(".bvr-modal-overlay");
	let close_modal = function () {
		$overlay.remove();
		$(document).off("keydown.bvr-modal");
	};
	$overlay.on("click", function (e) {
		if ($(e.target).is(".bvr-modal-overlay")) {
			close_modal();
		}
	});
	$overlay.find(".bvr-modal-close, .bvr-modal-btn-cancel").on("click", close_modal);
	$(document).on("keydown.bvr-modal", function (e) {
		if (e.key === "Escape") {
			close_modal();
		}
	});

	let $emp_wrapper = $overlay.find(".bvr-modal-emp");
	let $emp_input = $emp_wrapper.find(".employee-search-input");
	let $emp_dd = $emp_wrapper.find(".employee-dropdown");

	frappe.call({
		method: "sahayog.branch_visit_review.api.get_employee_list",
		callback: function (r) {
			let employees = r.message || [];
			let label_for = function (emp) {
				return emp.employee_name ? emp.employee_name + "(" + emp.name + ")" : emp.name;
			};
			if (item.owner) {
				let emp = employees.find(function (e) { return e.name === item.owner; });
				$emp_input.val(emp ? label_for(emp) : item.owner);
			}
			$emp_input.on("focus keyup", function () {
				let query = $(this).val().toLowerCase();
				let filtered = employees.filter(function (emp) {
					return label_for(emp).toLowerCase().indexOf(query) > -1;
				});
				if (filtered.length > 0) {
					let options_html = "";
					filtered.forEach(function (emp) {
						options_html += "<div class='employee-option' data-name='" + bvr_escape(emp.name) + "'>" + bvr_escape(label_for(emp)) + "</div>";
					});
					$emp_dd.html(options_html).show();
				} else {
					$emp_dd.html("<div class='employee-no-result'>No results</div>").show();
				}
			});
			$emp_dd.on("click", ".employee-option", function () {
				$emp_input.val($(this).text());
				$emp_wrapper.data("value", $(this).attr("data-name"));
				$emp_dd.hide();
			});
			$emp_input.on("blur", function () {
				let val = $(this).val();
				let emp = employees.find(function (e) { return label_for(e) === val || e.name === val; });
				$emp_wrapper.data("value", emp ? emp.name : val);
			});
		},
	});

	$overlay.find(".bvr-modal-btn-save").on("click", function () {
		let action_item = ($overlay.find("[data-field='action_item']").val() || "").trim();
		if (!action_item) {
			frappe.msgprint(__("Action Item is required"));
			$overlay.find("[data-field='action_item']").focus();
			return;
		}
		let row_values = {
			action_item: action_item,
			owner: $emp_wrapper.data("value") || "",
			priority: $overlay.find("[data-field='priority']").val() || "Medium",
			tat: $overlay.find("[data-field='tat']").val() || "",
			status: $overlay.find("[data-field='status']").val() || "Open",
			resolution_notes: $overlay.find("[data-field='resolution_notes']").val() || "",
		};
		if (is_add) {
			frm.add_child("action_items", row_values);
		} else {
			Object.keys(row_values).forEach(function (key) {
				frm.doc.action_items[idx][key] = row_values[key];
			});
		}
		frm.refresh_field("action_items");
		close_modal();
		render_checklist(frm, frm.doc.template);
	});

	$overlay.find("[data-field='action_item']").focus();
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

			let action_html = "<table class='action-items-table'><thead><tr><th style='width:40px;'>No.</th><th>Action Item</th><th>Responsible</th><th style='width:100px;'>Priority</th><th style='width:130px;'>Target Date</th><th style='width:110px;'>Status</th><th>Resolution Notes</th><th style='width:40px;'></th></tr></thead><tbody>";
			if (frm.doc.action_items && frm.doc.action_items.length > 0) {
				frm.doc.action_items.forEach(function (item, i) {
					let owner_display = item.owner || "";
					if (item.owner) {
						let emp = employees.find(function (e) { return e.name === item.owner; });
						if (emp && emp.employee_name) owner_display = emp.employee_name + "(" + emp.name + ")";
					}
					let action_display = item.action_item || "<span style='color:#8a93a5;'>Click to add details&hellip;</span>";
					action_html += "<tr class='action-row-edit' data-idx='" + i + "' title='Click to edit'><td>" + (i + 1) + "</td><td>" + action_display + "</td><td><div class='employee-search-wrapper' data-value='" + (item.owner || "") + "'><input type='text' class='form-control employee-search-input' placeholder='Search employee' value='" + owner_display + "'><div class='employee-dropdown' style='display:none;'></div></div></td><td>" + (item.priority || "") + "</td><td>" + (item.tat || "") + "</td><td>" + (item.status || "") + "</td><td>" + (item.resolution_notes || "") + "</td><td style='text-align:center;'><button class='bvr-btn-remove remove-action-row' title='Remove row'>&times;</button></td></tr>";
				});
			}
			let action_count = (frm.doc.action_items ? frm.doc.action_items.length : 0) + 1;
			action_html += "<tr class='action-row-add' title='Click to add'><td>" + action_count + "</td>";
			action_html += "<td colspan='6' style='color:#8a93a5;text-align:center;'>+ Click to add action item</td>";
			action_html += "<td style='text-align:center;'></td>";
			action_html += "</tr>";
			action_html += "</tbody></table>";
			action_html += "<button class='bvr-btn-add bvr-btn-action add-action-row'>+ Add Action Item</button>";

			let leadership_html = "";
			leadership_html += "<div class='leadership-field'><div class='category-header'><h5>Key Strengths (Top 3)</h5></div><textarea class='form-control leadership-input' data-field='key_strengths' rows='4' placeholder='Enter key strengths'>" + (frm.doc.key_strengths || "") + "</textarea></div>";
			leadership_html += "<div class='leadership-field'><div class='category-header'><h5>Areas Requiring Attention (Top 3)</h5></div><textarea class='form-control leadership-input' data-field='areas_requiring_attention' rows='4' placeholder='Enter areas requiring attention'>" + (frm.doc.areas_requiring_attention || "") + "</textarea></div>";
			leadership_html += "<div class='leadership-field'><div class='category-header'><h5>Leadership Remarks</h5></div><textarea class='form-control leadership-input' data-field='leadership_remarks' rows='4' placeholder='Enter leadership remarks'>" + (frm.doc.leadership_remarks || "") + "</textarea></div>";

			let overall_field = frm.get_field("overall_assessment");
			let overall_options = [];
			if (overall_field && overall_field.df.options) {
				overall_options = overall_field.df.options.split("\n").filter(function (opt) { return opt; });
			}
			let overall_html = "<span class='bvr-overall-badge'>Overall Assessment: <select class='bvr-overall-select'>";
			overall_html += "<option value=''" + (frm.doc.overall_assessment ? "" : " selected") + ">&mdash;</option>";
			overall_options.forEach(function (opt) {
				overall_html += "<option value='" + opt + "'" + (frm.doc.overall_assessment === opt ? " selected" : "") + ">" + opt + "</option>";
			});
			overall_html += "</select></span>";

			let active_tab = "review";
			let $cw = frm.fields_dict.checklist.$wrapper;
			if ($cw.find(".tab-content-action").is(":visible")) {
				active_tab = "action";
			} else if ($cw.find(".tab-content-leadership").is(":visible")) {
				active_tab = "leadership";
			}
			let li_active = {
				review: active_tab === "review" ? "active" : "",
				action: active_tab === "action" ? "active" : "",
				leadership: active_tab === "leadership" ? "active" : "",
			};

			let tabs_html = "<div class='bvr-tabs'><div class='bvr-tab-bar'><ul class='nav nav-tabs'>";
			tabs_html += "<li class='" + li_active.review + "'><a class='tab-review' style='cursor:pointer;'>Review Checklist</a></li>";
			tabs_html += "<li class='" + li_active.action + "'><a class='tab-action' style='cursor:pointer;'>Action Items</a></li>";
			tabs_html += "<li class='" + li_active.leadership + "'><a class='tab-leadership' style='cursor:pointer;'>Leadership Assessment</a></li>";
			tabs_html += "</ul>" + overall_html + "</div>";
			tabs_html += "<div class='tab-content-review' style='display:" + (active_tab === "review" ? "block" : "none") + ";'>" + checklist_html + "</div>";
			tabs_html += "<div class='tab-content-action' style='display:" + (active_tab === "action" ? "block" : "none") + ";'>" + action_html + "</div>";
			tabs_html += "<div class='tab-content-leadership' style='display:" + (active_tab === "leadership" ? "block" : "none") + ";'>" + leadership_html + "</div></div>";

			frm.fields_dict.checklist.$wrapper.html(tabs_html);

			let style = `<style>
				.bvr-tabs .bvr-tab-bar { display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; background: #f8f9fb; border-radius: 8px 8px 0 0; padding: 4px 8px 0 4px; }
				.bvr-tabs .bvr-tab-bar .nav-tabs { border-bottom: none; margin-bottom: 0; background: transparent; border-radius: 0; padding: 0; display: inline-flex; gap: 2px; }
				.bvr-tabs .bvr-overall-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #4a5568; background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 5px 14px; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
				.bvr-tabs .bvr-overall-select { border: none; background: transparent; color: #5e64ff; font-size: 12px; font-weight: 700; cursor: pointer; outline: none; padding: 0; margin: 0; }
				.bvr-tabs .tab-content-review { width: 100%; }
				.bvr-tabs .nav-tabs > li > a { border: none; color: #6c7680; font-weight: 600; padding: 10px 20px; border-radius: 6px 6px 0 0; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; font-size: 13px; background: transparent; }
				.bvr-tabs .nav-tabs > li.active > a, .bvr-tabs .nav-tabs > li > a:hover { border: none; color: #16181d; border-bottom: 2px solid #5e64ff; background: #fff; border-radius: 6px 6px 0 0; }
				.bvr-tabs .category-header { background: linear-gradient(135deg, #f0f2ff 0%, #e8ebff 100%); padding: 10px 14px; border-radius: 8px; margin: 14px 0 8px 0; display: flex; align-items: center; justify-content: space-between; border-left: 4px solid #5e64ff; box-sizing: border-box; }
				.bvr-tabs .category-header + table, .bvr-tabs .category-header + .category-table { width: 100%; }
				.bvr-tabs .category-header h5 { margin: 0; font-size: 13px; font-weight: 700; color: #16181d; letter-spacing: 0.3px; }
				.bvr-tabs .category-header .bvr-btn-add { background: #5e64ff; color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; font-size: 16px; line-height: 22px; text-align: center; cursor: pointer; padding: 0; transition: all 0.2s; box-shadow: 0 2px 4px rgba(94,100,255,0.3); flex-shrink: 0; }
				.bvr-tabs .category-header .bvr-btn-add:hover { background: #4c53d0; transform: scale(1.1); box-shadow: 0 3px 8px rgba(94,100,255,0.4); }
				.bvr-tabs .category-header .bvr-btn-add:active { transform: scale(0.95); }
				.bvr-tabs table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
				.bvr-tabs table thead th:first-child { border-top-left-radius: 7px; }
				.bvr-tabs table thead th:last-child { border-top-right-radius: 7px; }
				.bvr-tabs table tbody tr:last-child td:first-child { border-bottom-left-radius: 7px; }
				.bvr-tabs table tbody tr:last-child td:last-child { border-bottom-right-radius: 7px; }
				.bvr-tabs table thead th { background: #f1f3f9; color: #4a5568; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; padding: 9px 12px; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
				.bvr-tabs table tbody td { padding: 8px 12px; border-bottom: 1px solid #edf0f4; vertical-align: middle; font-size: 13px; }
				.bvr-tabs table tbody tr:last-child td { border-bottom: none; }
				.bvr-tabs table tbody tr { transition: background 0.15s; }
				.bvr-tabs table tbody tr:hover { background: #f5f6ff; }
				.bvr-tabs table tbody tr.action-row-edit { cursor: pointer; }
				.bvr-tabs table tbody tr.action-row-edit:hover td { background: #f0f1ff; }
				.bvr-tabs table tbody tr.action-row-add { cursor: pointer; }
				.bvr-tabs table tbody tr.action-row-add:hover td { background: #f0f1ff; }
				.bvr-tabs .rating-stars .star { display: inline-block; font-size: 22px; transition: all 0.15s; margin: 0 1px; }
				.bvr-tabs .rating-stars .star:hover { transform: scale(1.3); }
				.bvr-tabs .yesno-group label { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; transition: all 0.2s; margin-right: 6px; border: 1px solid #e2e8f0; background: #fff; }
				.bvr-tabs .yesno-group label:hover { border-color: #5e64ff; background: #f5f6ff; }
				.bvr-tabs .yesno-group input[type='radio'] { accent-color: #5e64ff; }
				.bvr-tabs .employee-search-wrapper { position: relative; min-width: 170px; }
				.bvr-tabs .employee-search-input { width: 100%; }
				.bvr-tabs .employee-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 300; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.12); max-height: 200px; overflow-y: auto; margin-top: 2px; }
				.bvr-tabs .employee-dropdown .employee-option { padding: 8px 12px; cursor: pointer; font-size: 12px; border-bottom: 1px solid #f5f5f5; transition: background 0.15s; }
				.bvr-tabs .employee-dropdown .employee-option:last-child { border-bottom: none; }
				.bvr-tabs .employee-dropdown .employee-option:hover { background: #f0f1ff; color: #5e64ff; }
				.bvr-tabs .bvr-btn-add { background: #5e64ff; color: #fff; border: none; border-radius: 8px; padding: 8px 18px; font-weight: 600; font-size: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 6px rgba(94,100,255,0.3); letter-spacing: 0.3px; }
				.bvr-tabs .bvr-btn-add:hover { background: #4c53d0; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(94,100,255,0.4); }
				.bvr-tabs .bvr-btn-add:active { transform: translateY(0); }
				.bvr-tabs .bvr-btn-action { margin-top: 10px; }
				.bvr-tabs .bvr-btn-remove { background: transparent; color: #e74c3c; border: none; border-radius: 50%; width: 24px; height: 24px; font-size: 18px; line-height: 22px; text-align: center; cursor: pointer; padding: 0; transition: all 0.2s; }
				.bvr-tabs .bvr-btn-remove:hover { background: #fdecea; color: #c0392b; transform: scale(1.15); }
				.bvr-tabs select.form-control, .bvr-tabs input.form-control { border-radius: 6px; border-color: #e2e8f0; font-size: 12px; padding: 6px 10px; height: auto; transition: border-color 0.2s, box-shadow 0.2s; }
				.bvr-tabs select.form-control:focus, .bvr-tabs input.form-control:focus { border-color: #5e64ff; box-shadow: 0 0 0 3px rgba(94,100,255,0.12); }
				.bvr-tabs .tab-content-action { background: #fff; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; padding: 12px; }
				.bvr-tabs .tab-content-leadership { background: #fff; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; padding: 4px 0; width: 100%; }
				.bvr-tabs .leadership-field { margin-bottom: 16px; max-width: 760px; }
				.bvr-tabs .leadership-field:last-child { margin-bottom: 0; }
				.bvr-tabs .leadership-field .category-header { margin: 0; border-radius: 8px 8px 0 0; }
				.bvr-tabs .leadership-field textarea { width: 100%; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 10px 12px; font-size: 13px; resize: vertical; background: #fff; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
				.bvr-tabs .leadership-field textarea:focus { border-color: #5e64ff; box-shadow: 0 0 0 3px rgba(94,100,255,0.12); outline: none; }
				.bvr-tabs .tab-content-review { padding: 4px 0; }
				.bvr-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.45); z-index: 2000; display: flex; align-items: flex-start; justify-content: center; padding: 60px 16px 16px; }
				.bvr-modal { background: #fff; border-radius: 12px; width: 560px; max-width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.25); overflow: hidden; }
				.bvr-modal-header { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, #f0f2ff 0%, #e8ebff 100%); border-left: 4px solid #5e64ff; padding: 12px 16px; }
				.bvr-modal-header h5 { margin: 0; font-size: 14px; font-weight: 700; color: #16181d; }
				.bvr-modal-close { background: transparent; border: none; font-size: 22px; line-height: 1; color: #6c7680; cursor: pointer; padding: 0 4px; }
				.bvr-modal-close:hover { color: #e74c3c; }
				.bvr-modal-body { padding: 16px; }
				.bvr-modal-field { margin-bottom: 14px; }
				.bvr-modal-field label { display: block; font-size: 12px; font-weight: 600; color: #4a5568; margin-bottom: 5px; }
				.bvr-modal-field .bvr-req { color: #e74c3c; }
				.bvr-modal-input { border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px; padding: 8px 10px; width: 100%; box-sizing: border-box; }
				.bvr-modal-input:focus { border-color: #5e64ff; box-shadow: 0 0 0 3px rgba(94,100,255,0.12); outline: none; }
				.bvr-modal-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
				.bvr-modal .employee-search-wrapper { position: relative; }
				.bvr-modal .employee-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 2100; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.12); max-height: 200px; overflow-y: auto; margin-top: 2px; }
				.bvr-modal .employee-dropdown .employee-option { padding: 8px 12px; cursor: pointer; font-size: 12px; border-bottom: 1px solid #f5f5f5; }
				.bvr-modal .employee-dropdown .employee-option:hover { background: #f0f1ff; color: #5e64ff; }
				.bvr-modal .employee-dropdown .employee-no-result { padding: 8px 12px; color: #999; font-size: 12px; }
				.bvr-modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid #edf0f4; background: #f8f9fb; }
				.bvr-modal-btn { border: none; border-radius: 8px; padding: 8px 18px; font-weight: 600; font-size: 12px; cursor: pointer; letter-spacing: 0.3px; transition: all 0.2s; }
				.bvr-modal-btn-cancel { background: #fff; color: #4a5568; border: 1px solid #e2e8f0; }
				.bvr-modal-btn-cancel:hover { background: #f5f6ff; }
				.bvr-modal-btn-save { background: #5e64ff; color: #fff; box-shadow: 0 2px 6px rgba(94,100,255,0.3); }
				.bvr-modal-btn-save:hover { background: #4c53d0; }
			</style>`;
			frm.fields_dict.checklist.$wrapper.find("style").remove();
			frm.fields_dict.checklist.$wrapper.prepend(style);

			let template_items = r.message || [];

			let tab_map = {
				".tab-review": ".tab-content-review",
				".tab-action": ".tab-content-action",
				".tab-leadership": ".tab-content-leadership",
			};
			Object.keys(tab_map).forEach(function (tab_sel) {
				frm.fields_dict.checklist.$wrapper.find(tab_sel).on("click", function () {
					frm.fields_dict.checklist.$wrapper.find(".nav-tabs li").removeClass("active");
					$(this).parent().addClass("active");
					Object.keys(tab_map).forEach(function (sel) {
						frm.fields_dict.checklist.$wrapper.find(tab_map[sel]).hide();
					});
					frm.fields_dict.checklist.$wrapper.find(tab_map[tab_sel]).show();
				});
			});

			frm.fields_dict.checklist.$wrapper.find(".leadership-input").on("blur change", function () {
				let field = $(this).data("field");
				frm.set_value(field, $(this).val());
			});

			frm.fields_dict.checklist.$wrapper.find(".bvr-overall-select").on("change", function () {
				frm.set_value("overall_assessment", $(this).val());
			});

			frm.fields_dict.checklist.$wrapper.off("click.bvr-add").on("click.bvr-add", ".action-row-add, .add-action-row", function () {
				frm.add_child("action_items", { priority: "Medium", status: "Open" });
				frm.refresh_field("action_items");
				render_checklist(frm, frm.doc.template);
			});

			frm.fields_dict.checklist.$wrapper.off("click.bvr-remove").on("click.bvr-remove", ".remove-action-row", function () {
				let $row = $(this).closest("tr");
				let idx = $row.index();
				if (frm.doc.action_items && frm.doc.action_items[idx]) {
					frm.doc.action_items.splice(idx, 1);
					frm.refresh_field("action_items");
				}
				$row.remove();
			});

			frm.fields_dict.checklist.$wrapper.off("click.bvr-edit").on("click.bvr-edit", ".action-row-edit", function (e) {
				if ($(e.target).closest(".employee-search-wrapper, .bvr-btn-remove").length) {
					return;
				}
				let idx = parseInt($(this).attr("data-idx"), 10);
				let item = frm.doc.action_items ? frm.doc.action_items[idx] : null;
				if (!item) {
					return;
				}
				open_action_item_dialog(frm, idx, item);
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

			frm.fields_dict.checklist.$wrapper.off("click.bvr-emp").on("click.bvr-emp", ".employee-option", function () {
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

			frm.fields_dict.checklist.$wrapper.off("click.bvr-dd").on("click.bvr-dd", function (e) {
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
				let new_row = "<tr><td>" + count + "</td><td><input type='text' class='form-control custom-parameter' placeholder='Evaluation Parameter / Question'></td><td>" + response_html + "</td><td style='text-align:center;width:40px;'><button class='bvr-btn-remove remove-custom-row' title='Remove row'>&times;</button></td></tr>";
				$table.find("tbody").append(new_row);
				let $newRow = $table.find("tbody tr:last");

				$newRow.find(".remove-custom-row").on("click", function () {
					let $tr = $(this).closest("tr");
					let parameter = $tr.find(".custom-parameter").val();
					if (parameter && frm.doc.responses) {
						let idx = frm.doc.responses.findIndex(function (r) { return r.parameter_name === parameter; });
						if (idx > -1) {
							frm.doc.responses.splice(idx, 1);
							frm.refresh_field("responses");
						}
					}
					$tr.remove();
				});

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
