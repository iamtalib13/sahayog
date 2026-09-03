// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Training", {
	branch(frm) {
		if (!frm.doc.branch) return;
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

		// Default attendance to Present
		frappe.model.set_value(cdt, cdn, "attendance_status", "Present");

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
