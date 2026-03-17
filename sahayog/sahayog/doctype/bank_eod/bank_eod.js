// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Bank EOD", {
	refresh(frm) {
        if (frm.is_new()) {
            frm.add_custom_button(__('Fetch Checklist Tasks'), () => {
                frm.trigger('fetch_tasks');
            });
        }
	},
    date(frm) {
        if (frm.doc.date && frm.is_new()) {
            frm.trigger('fetch_tasks');
        }
    },
    fetch_tasks(frm) {
        frappe.call({
            method: "sahayog.sahayog.doctype.bank_eod.bank_eod.get_checklist_tasks",
            callback: function(r) {
                if (r.message) {
                    frm.clear_table("eod_tasks");
                    r.message.forEach(task => {
                        let row = frm.add_child("eod_tasks");
                        row.team = task.team;
                        row.task = task.task;
                        row.status = "Pending";
                    });
                    frm.refresh_field("eod_tasks");
                }
            }
        });
    }
});
// END
