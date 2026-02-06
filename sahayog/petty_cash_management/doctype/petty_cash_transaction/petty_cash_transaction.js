
frappe.ui.form.on('Petty Cash Transaction', {

    refresh: function(frm) {

        // Define the fields you want to check
        const hide_fields = [
            'finacle_tran_id', 
            'finacle_tran_date', 
            'finacle_tran_particular',
            'journal_entry_ref'
        ];

        // Loop through them and hide if they don't have a value
        hide_fields.forEach(field => {
            // toggle_display(fieldname, show_condition)
            // Shows the field only if frm.doc[field] is truthy (has a value)
            frm.toggle_display(field, !!frm.doc[field]);
        });

         // [NEW] Bulk Allocation Logic
        frm.trigger('toggle_bulk_mode');
        
        // --- DEBUG LOGGING ---
        console.log("=== DEBUGGING BUTTONS ===");
        console.log("Docstatus (1=Submitted):", frm.doc.docstatus);
        console.log("Approval Status:", frm.doc.approval_status);
        console.log("User:", frappe.session.user);
        console.log("Is Manager?", frappe.user.has_role('HO Petty Cash Manager'));
        // ---------------------

        // Standard Read-Only Logic
        if (!frappe.user.has_role('HO Petty Cash Manager')) {
            frm.set_df_property('transaction_type', 'read_only', 1);
            frm.set_df_property('branch', 'read_only', 1);
        } else {
            frm.set_df_property('transaction_type', 'read_only', 0);
            frm.set_df_property('branch', 'read_only', 0);
        }

        // --- BUTTON LOGIC ---

        // SCENARIO 2: Limit Exceeded -> Needs Approval
        if (frm.doc.docstatus === 1 && frm.doc.approval_status === "Pending Approval") {
            
            // Check permissions explicitly
            if (frappe.user.has_role('HO Petty Cash Manager') || frappe.session.user === 'Administrator') {
                console.log(">> Adding 'Approve Limit' Button");
                
                frm.add_custom_button(__('Approve Limit Exceedance'), function() {
                    frappe.confirm('Approve extra expense?', () => {
                        frappe.call({
                            doc: frm.doc,
                            method: 'ho_approve_limit',
                            callback: function() { frm.reload_doc(); }
                        });
                    });
                }, "Actions"); // Should appear in 'Actions' button
            } else {
                console.log(">> User does not have permission for Limit Approval");
            }
        }

        // SCENARIO 1 & 2: Limit OK -> Needs Verification
        if (frm.doc.docstatus === 1 && frm.doc.approval_status === "Approved") {
            
            if (frappe.user.has_role('HO Petty Cash Manager') || frappe.session.user === 'Administrator') {
                console.log(">> Adding 'Verify' Button");
                
                frm.add_custom_button(__('Verify & Process'), function() {
                    frappe.call({
                        doc: frm.doc,
                        method: 'ho_verify_bill',
                        callback: function() { frm.reload_doc(); }
                    });
                }, "Actions");
            } else {
                console.log(">> User does not have permission for Verification");
            }
        }
    },


    transaction_type: function(frm) {
         // Trigger visibility check when type changes
        frm.trigger('toggle_bulk_mode');

        if (frm.doc.transaction_type === "Fund Allocation") {
            frm.clear_table("items");
            frm.refresh_field("items");
            // [NEW] Trigger Auto-Fetch of HO Account
            frm.trigger('set_default_ho_account');
        }
    },

    is_bulk_allocation: function(frm) {
        frm.trigger('toggle_bulk_mode');
    },

    toggle_bulk_mode: function(frm) {
        // 1. Check Role
        let is_manager = frappe.user.has_role('HO Petty Cash Manager') || frappe.session.user === 'Administrator';
        let is_fund = frm.doc.transaction_type === 'Fund Allocation';

        // 2. Show/Hide Bulk Option
        // Only show the Checkbox if user is Manager AND it's a Fund Allocation
        frm.toggle_display('is_bulk_allocation', is_manager && is_fund);

        // 3. Handle Bulk vs Single Mode
        if (is_fund && frm.doc.is_bulk_allocation) {
            // BULK MODE: Hide specific branch, Show Bulk Fields
            frm.set_df_property('branch', 'reqd', 0); // Make branch optional
            frm.toggle_display('branch', false);      // Hide branch
            
            // Note: target_scope and source_bank_account visibility is handled by 'depends_on' in JSON
            
            // Update Label for Amount to be clear
            frm.set_df_property('amount', 'label', 'Amount Per Branch');
        } else {
            // SINGLE MODE: Restore defaults
            if (is_manager) {
                // Only restore if user is allowed to edit branch
                frm.toggle_display('branch', true);
                frm.set_df_property('branch', 'reqd', 1);
            }
            frm.set_df_property('amount', 'label', 'Amount');
        }
    },

     // [NEW FUNCTION] Fetches HO Account from Backend
    set_default_ho_account: function(frm) {
        // Only fetch if currently empty
        if (frm.doc.source_bank_account) return;

        frappe.call({
            method: "sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.get_ho_source_account",
            callback: function(r) {
                if (r.message) {
                    frm.set_value('source_bank_account', r.message);
                }
            }
        });
    },
    
    onload: function(frm) {
        if (frm.is_new()) {
            frm.set_value('transaction_date', frappe.datetime.get_today());
            frm.set_value('amount', 0);

            // Fetch Branch from Employee
            frappe.db.get_value('Employee', 
                { user_id: frappe.session.user, status: 'Active' }, 
                'sahayog_branch'
            ).then(r => {
                if (r && r.message && r.message.sahayog_branch) {
                    let user_branch = r.message.sahayog_branch;
                    frm.set_value('branch', user_branch);
                    frm.trigger('fetch_balance');
                }
            });
        }
    },

    branch: function(frm) {
        frm.trigger('fetch_balance');
    },

        fetch_balance: function(frm) {
        if (!frm.doc.branch) return;

        frappe.call({
            method: "sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.get_branch_balance",
            args: { branch: frm.doc.branch },
            callback: function(r) {
                // Check if response is an object (new format) or just a number (fallback)
                let balance = 0;
                let cash_in_hand = 0;

                if (r.message && typeof r.message === 'object') {
                    // New Dictionary Format
                    balance = r.message.current_balance || 0;
                    cash_in_hand = r.message.unsettled_cash || 0;
                } else {
                    // Old Number Format fallback
                    balance = r.message || 0;
                }
                
                // Set Bank Balance
                frm.set_value('current_branch_balance', balance);
                
                // Set Cash in Hand (only if the field exists in your form)
                if (frm.fields_dict['current_unsettled_cash']) {
                    frm.set_value('current_unsettled_cash', cash_in_hand);
                }

                frm.refresh_field('current_branch_balance');
                frm.refresh_field('current_unsettled_cash');
                
                console.log(`Updated Balances -> Bank: ₹${balance}, Cash: ₹${cash_in_hand}`);
            }
        });
    }

});

// Child Table Logic
frappe.ui.form.on('Petty Cash Transaction Item', {
    amount: function(frm, cdt, cdn) {
        check_limit_warning(frm, cdt, cdn);
    },

    bill_date: function(frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (row.bill_date) {
            var today_str = frappe.datetime.get_today();
            if (frappe.datetime.get_diff(today_str, row.bill_date) < 0) {
                 frappe.msgprint({
                    title: __('Invalid Date'),
                    indicator: 'red',
                    message: __('Bill Date <b>{0}</b> cannot be in the future.', [row.bill_date])
                });
                frappe.model.set_value(cdt, cdn, 'bill_date', '');
            }
        }
    },

    expense_category: function(frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (!frm.doc.branch || !frm.doc.transaction_date || !row.expense_category) {
            return;
        }

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
                    frappe.model.set_value(cdt, cdn, 'available_limit', r.message);
                    check_limit_warning(frm, cdt, cdn);
                }
            }
        });
    }
});

function check_limit_warning(frm, cdt, cdn) {
    var row = locals[cdt][cdn];
    if (row.amount > 0 && row.available_limit != null) {
        if (row.amount > row.available_limit) {
            frappe.show_alert({
                message: __("Row #{0} exceeds available limit. It will require HO Approval.", [row.idx]),
                indicator: 'orange'
            }, 3);
        }
    }
}
