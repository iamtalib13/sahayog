// Logic for the Main Doctype "Petty Cash Transaction"

frappe.ui.form.on('Petty Cash Transaction', {
    onload: function(frm) {
        if (frm.is_new()) {
            // 1. Set Date to Today
            frm.set_value('transaction_date', frappe.datetime.get_today());
            frm.set_value('amount', 0);

            // 2. Fetch Branch from Employee
            frappe.db.get_value('Employee', 
                { user_id: frappe.session.user, status: 'Active' }, 
                'sahayog_branch'
            ).then(r => {
                if (r && r.message && r.message.sahayog_branch) {
                    let user_branch = r.message.sahayog_branch;
                    
                    // Set the branch
                    frm.set_value('branch', user_branch);

                    // 3. NOW fetch the Wallet Balance for this specific branch
                    frappe.db.get_value('Branch Petty Cash Account', 
                        { branch: user_branch }, 
                        'current_balance'
                    ).then(wallet_r => {
                        let balance = 0;
                        if (wallet_r && wallet_r.message) {
                            balance = wallet_r.message.current_balance;
                        }
                        frm.set_value('current_branch_balance', balance);
                    });
                }
            });
        }
    },

    // Optional: Also update balance if the user manually changes the Branch field
    branch: function(frm) {
        if (frm.doc.branch) {
            frappe.db.get_value('Branch Petty Cash Account', 
                { branch: frm.doc.branch }, 
                'current_balance'
            ).then(r => {
                let balance = (r && r.message) ? r.message.current_balance : 0;
                frm.set_value('current_branch_balance', balance);
            });
        }
    },
    
    // This create a issue if balance changes after submission doc status is changed to Not Saved
    // on_submit: function(frm) {
    //     if (frm.doc.branch) {
    //         frappe.db.get_value('Branch Petty Cash Account', 
    //             { branch: frm.doc.branch }, 
    //             'current_balance'
    //         ).then(r => {
    //             let balance = (r && r.message) ? r.message.current_balance : 0;
    //             frm.set_value('current_branch_balance', balance);
    //         });
    //     }
    // }
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
