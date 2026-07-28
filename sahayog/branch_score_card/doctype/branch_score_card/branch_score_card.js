frappe.ui.form.on("Branch Score Card", {
	refresh(frm) {
		if (frm.doc.branch && frm.doc.date) {
			frm.trigger("date");
		}
	},

	branch(frm) {
		if (frm.doc.date) {
			frm.trigger("date");
		}
	},

	date(frm) {
		if (!frm.doc.date || !frm.doc.branch) return;

		const d = frappe.datetime.str_to_obj(frm.doc.date);
		const month = d.toLocaleString("default", { month: "long" });
		const year = d.getFullYear();

		frm.set_intro(
			`Month: ${month} ${year} — Only one record per branch per month is allowed.`,
			"blue"
		);
	},
});