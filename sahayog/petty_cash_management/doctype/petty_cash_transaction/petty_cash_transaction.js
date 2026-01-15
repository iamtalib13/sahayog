// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Petty Cash Transaction", {
// 	refresh(frm) {

// 	},
// });


frappe.ui.form.on('Petty Cash Transaction', {
    onload: function(frm) {
        if (frm.is_new()) {
             // 1. Set Date to Today [web:15]
            frm.set_value('transaction_date', frappe.datetime.get_today());
            frm.set_value('amount', 0)

            // 2. Existing logic: Fetch Branch
            frappe.db.get_value('Employee',
                { user_id: frappe.session.user, status: 'Active' },
                'sahayog_branch'
            ).then(r => {
                if (r && r.message && r.message.sahayog_branch) {
                    frm.set_value('branch', r.message.sahayog_branch);
                }
            });
        }
    }
});


// Logic for the Child Table "Petty Cash Transaction Item"
frappe.ui.form.on('Petty Cash Transaction Item', {
    expense_category: function(frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        
        if (!frm.doc.branch || !frm.doc.transaction_date || !row.expense_category) {
            return;
        }

        // Call the Python API we created
        frappe.call({
            method: "sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.get_category_limit_status",
            args: {
                branch: frm.doc.branch,
                category: row.expense_category,
                transaction_date: frm.doc.transaction_date,
                doc_name: frm.doc.name
            },
            callback: function(r) {
                if (r.message != null) {
                    // Set the available limit in the row
                    frappe.model.set_value(cdt, cdn, 'available_limit', r.message);
                }
            }
        });
    }
});
