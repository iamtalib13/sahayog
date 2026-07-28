// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Branch Score Card", {
	date(frm) {
		if (!frm.doc.date) return;

		// Show a friendly indicator of which month this record belongs to
		const d     = frappe.datetime.str_to_obj(frm.doc.date);
		const month = d.toLocaleString("default", { month: "long" });
		const year  = d.getFullYear();

		frm.set_intro(
			`📅 This record is for <b>${month} ${year}</b>. Only one record per branch per month is allowed.`,
			"blue"
		);
	},

	branch(frm) {
		// Re-trigger date handler to refresh intro after branch change
		if (frm.doc.date) frm.trigger("date");
	},
});
