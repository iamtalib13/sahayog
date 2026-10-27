// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Training", {
	program_duration_hours(frm) {
		if (!frm.doc.program_duration_hours) return;
		var h = parseFloat(frm.doc.program_duration_hours);
		if (isNaN(h) || h <= 0) return;
		frm.set_value("start_time", "10:00:00");
		var totalMin = 10 * 60 + Math.round(h * 60);
		var cap = 18 * 60;
		if (totalMin > cap) totalMin = cap;
		var hh = Math.floor(totalMin / 60);
		var mm = totalMin % 60;
		frm.set_value("end_time", (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm + ":00");
	},
	branch(frm) {
		frappe.call({
			method: "sahayog.agent_and_bdo.doctype.training.training.get_branch_geo",
			args: { branch: frm.doc.branch },
			callback(r) {
				if (!r.message) return;
				if (r.message.zone) frm.set_value("zone", r.message.zone);
				if (r.message.region) frm.set_value("region", r.message.region);
				if (r.message.district) frm.set_value("district", r.message.district);
			},
		});
	},
});

frappe.ui.form.on("Training Geography", {
	branch(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (!row.branch) return;
		frappe.call({
			method: "sahayog.agent_and_bdo.doctype.training.training.get_branch_geo",
			args: { branch: row.branch },
			callback(r) {
				if (!r.message) return;
				frappe.model.set_value(cdt, cdn, "zone", r.message.zone || "");
				frappe.model.set_value(cdt, cdn, "region", r.message.region || "");
				frappe.model.set_value(cdt, cdn, "district", r.message.district || "");
			},
		});
	},
});

frappe.ui.form.on("Training Participant", {
	// When type changes, clear the previous link + name
	reference_doctype(frm, cdt, cdn) {
		frappe.model.set_value(cdt, cdn, "agent_employee", "");
		frappe.model.set_value(cdt, cdn, "full_name", "");
	},

	// Auto-fill full_name and default attendance when a participant is picked
	agent_employee(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (!row.agent_employee || !row.reference_doctype) return;

		if (row.reference_doctype === "Employee") {
			frappe.db.get_value("Employee", row.agent_employee, "employee_name", (r) => {
				if (r && r.employee_name) {
					frappe.model.set_value(cdt, cdn, "full_name", r.employee_name);
				}
			});
		} else if (row.reference_doctype === "Agent") {
			frappe.db.get_value("Agent", row.agent_employee, "agent_name", (r) => {
				if (r && r.agent_name) {
					frappe.model.set_value(cdt, cdn, "full_name", r.agent_name);
				}
			});
		}
	},
});
