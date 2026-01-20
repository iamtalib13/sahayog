// Logic for the Main Doctype "Petty Cash Transaction"

frappe.ui.form.on('Petty Cash Transaction', {

    refresh: function(frm) {
        // 1. STRICT UI Enforcement: Handle Read-Only state based on Role
        // We do this in 'refresh' so it applies even after saving
        if (!frappe.user.has_role('HO Petty Cash Manager')) {
            // Non-Managers: Cannot change Transaction Type
            frm.set_df_property('transaction_type', 'read_only', 1);
        } else {
            // HO Managers: Can change it
            frm.set_df_property('transaction_type', 'read_only', 0);
        }

         // 2. [NEW] Logic for Branch Field Read-Only Access
        // Allow edit ONLY if user is Administrator OR has 'HO Petty Cash Manager' role
        if (frappe.session.user === 'Administrator' || frappe.user.has_role('HO Petty Cash Manager')) {
            frm.set_df_property('branch', 'read_only', 0); // Editable
        } else {
            frm.set_df_property('branch', 'read_only', 1); // Read-only
        }
    },

      // [FIX] Add this trigger to clean up data when switching types
    transaction_type: function(frm) {
        if (frm.doc.transaction_type === "Fund Allocation") {
            frm.clear_table("items");
            frm.refresh_field("items");
        }
    },
    
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

     bill_date: function(frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (row.bill_date) {
            var today_str = frappe.datetime.get_today();
            
            // Use Frappe helper to compare dates properly
            // get_diff returns: date_1 - date_2
            // If result is negative, bill_date is in the future relative to today
            if (frappe.datetime.get_diff(today_str, row.bill_date) < 0) {
                 frappe.msgprint({
                    title: __('Invalid Date'),
                    indicator: 'red',
                    message: __('Bill Date <b>{0}</b> cannot be in the future. The field has been reset.', [row.bill_date])
                });
                
                // Clear the invalid date
                frappe.model.set_value(cdt, cdn, 'bill_date', '');
            }
        }
    },
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
