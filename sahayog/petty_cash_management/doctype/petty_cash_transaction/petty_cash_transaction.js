
// // Logic for the Main Doctype "Petty Cash Transaction"
// frappe.ui.form.on('Petty Cash Transaction', {

//     refresh: function(frm) {
//         // ... (Existing Role Logic) ...
//         if (!frappe.user.has_role('HO Petty Cash Manager')) {
//             frm.set_df_property('transaction_type', 'read_only', 1);
//         } else {
//             frm.set_df_property('transaction_type', 'read_only', 0);
//         }

//         if (frappe.session.user === 'Administrator' || frappe.user.has_role('HO Petty Cash Manager')) {
//             frm.set_df_property('branch', 'read_only', 0);
//         } else {
//             frm.set_df_property('branch', 'read_only', 1);
//         }
        
//         // [NEW] Trigger balance fetch on refresh too, just in case
//         if(frm.doc.branch && frm.is_new()) {
//             frm.trigger('fetch_balance');
//         }
//     },

//     transaction_type: function(frm) {
//         if (frm.doc.transaction_type === "Fund Allocation") {
//             frm.clear_table("items");
//             frm.refresh_field("items");
//         }
//     },
    
//     onload: function(frm) {
//         if (frm.is_new()) {
//             frm.set_value('transaction_date', frappe.datetime.get_today());
//             frm.set_value('amount', 0);

//             // Fetch Branch from Employee
//             frappe.db.get_value('Employee', 
//                 { user_id: frappe.session.user, status: 'Active' }, 
//                 'sahayog_branch'
//             ).then(r => {
//                 if (r && r.message && r.message.sahayog_branch) {
//                     let user_branch = r.message.sahayog_branch;
//                     frm.set_value('branch', user_branch);
                    
//                     // Trigger the balance fetch
//                     frm.trigger('fetch_balance');
//                 }
//             });
//         }
//     },

//     branch: function(frm) {
//         frm.trigger('fetch_balance');
//     },

//     // [NEW] Centralized function to fetch balance
//     fetch_balance: function(frm) {
//         if (!frm.doc.branch) return;

//         frappe.call({
//             method: "sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.get_branch_balance",
//             args: { branch: frm.doc.branch },
//             callback: function(r) {
//                 // Console log to verify response
//                 console.log("Fetched Balance for " + frm.doc.branch + ": ", r.message);
                
//                 frm.set_value('current_branch_balance', r.message || 0);
//                 frm.refresh_field('current_branch_balance'); // Ensure UI updates
//             }
//         });
//     }
// });



// // Logic for the Child Table "Petty Cash Transaction Item"
// frappe.ui.form.on('Petty Cash Transaction Item', {

//     // 1. Validate when Amount is changed
//     amount: function(frm, cdt, cdn) {
//         validate_limit(frm, cdt, cdn);
//     },

//     // 2. Bill Date Validation
//      bill_date: function(frm, cdt, cdn) {
//         var row = locals[cdt][cdn];
//         if (row.bill_date) {
//             var today_str = frappe.datetime.get_today();
            
//             // Use Frappe helper to compare dates properly
//             if (frappe.datetime.get_diff(today_str, row.bill_date) < 0) {
//                  frappe.msgprint({
//                     title: __('Invalid Date'),
//                     indicator: 'red',
//                     message: __('Bill Date <b>{0}</b> cannot be in the future. The field has been reset.', [row.bill_date])
//                 });
                
//                 // Clear the invalid date
//                 frappe.model.set_value(cdt, cdn, 'bill_date', '');
//             }
//         }
//     },

//     expense_category: function(frm, cdt, cdn) {
//         var row = locals[cdt][cdn];
        
//         if (!frm.doc.branch || !frm.doc.transaction_date || !row.expense_category) {
//             return;
//         }

//         // Call the Python API we created
//         frappe.call({
//             method: "sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.get_category_limit_status",
//             args: {
//                 branch: frm.doc.branch,
//                 category: row.expense_category,
//                 transaction_date: frm.doc.transaction_date,
//                 doc_name: frm.doc.name
//             },
//             callback: function(r) {
//                 if (r.message != null) {
//                     // Set the available limit in the row
//                     frappe.model.set_value(cdt, cdn, 'available_limit', r.message);
                    
//                     // Re-validate in case amount was entered first
//                     validate_limit(frm, cdt, cdn);
//                 }
//             }
//         });
//     }
// });

// // Helper function to check limit
// function validate_limit(frm, cdt, cdn) {
//     var row = locals[cdt][cdn];
    
//     // Only check if we have both values
//     if (row.amount > 0 && row.available_limit != null) {
//         if (row.amount > row.available_limit) {
//             frappe.throw(
//                 __("Row #{0}: Expense Amount (₹{1}) exceeds the Available Category Limit (₹{2}).<br>You cannot proceed until the amount is reduced.", 
//                 [row.idx, row.amount, row.available_limit])
//             );
//         }
//     }
// }


frappe.ui.form.on('Petty Cash Transaction', {

    // refresh: function(frm) {
    //     // ==============================
    //     // 1. Field & Role Logic
    //     // ==============================
    //     if (!frappe.user.has_role('HO Petty Cash Manager')) {
    //         frm.set_df_property('transaction_type', 'read_only', 1);
    //     } else {
    //         frm.set_df_property('transaction_type', 'read_only', 0);
    //     }

    //     if (frappe.session.user === 'Administrator' || frappe.user.has_role('HO Petty Cash Manager')) {
    //         frm.set_df_property('branch', 'read_only', 0);
    //     } else {
    //         frm.set_df_property('branch', 'read_only', 1);
    //     }
        
    //     // Trigger balance fetch on refresh for new docs
    //     if(frm.doc.branch && frm.is_new()) {
    //         frm.trigger('fetch_balance');
    //     }

    //     // ==============================
    //     // 2. HO Approval Buttons
    //     // ==============================
        
    //     // Debugging: Check console to see if logic runs
    //     // console.log("Docstatus:", frm.doc.docstatus, "Status:", frm.doc.approval_status);

    //     // BUTTON 1: Approve Limit Exceedance
    //     // Shows if: Submitted (docstatus==1) AND Status is 'Pending Approval' AND User is Manager/Admin
    //     if (frm.doc.docstatus === 1 && 
    //         frm.doc.approval_status === "Pending Approval" && 
    //         (frappe.user.has_role('HO Petty Cash Manager') || frappe.session.user === 'Administrator')) {
            
    //         frm.add_custom_button(__('Approve Limit Exceedance'), function() {
    //             frappe.confirm('Are you sure you want to approve the extra expense? This will deduct the remaining balance from the branch wallet.', () => {
    //                 frappe.call({
    //                     doc: frm.doc,
    //                     method: 'ho_approve_limit',
    //                     callback: function() {
    //                         frm.reload_doc();
    //                     }
    //                 });
    //             });
    //         }, "Actions"); // Puts it in 'Actions' menu at top right
            
    //         frm.dashboard.set_headline_alert("This transaction exceeds category limits. HO Approval required for full deduction.", "orange");
    //     }

    //     // BUTTON 2: Verify & Process
    //     // Shows if: Submitted (docstatus==1) AND Status is 'Approved' (Limits OK) AND User is Manager/Admin
    //     if (frm.doc.docstatus === 1 && 
    //         frm.doc.approval_status === "Approved" && 
    //         (frappe.user.has_role('HO Petty Cash Manager') || frappe.session.user === 'Administrator')) {
            
    //         frm.add_custom_button(__('Verify & Process'), function() {
    //             frappe.call({
    //                 doc: frm.doc,
    //                 method: 'ho_verify_bill',
    //                 callback: function() {
    //                     frm.reload_doc();
    //                 }
    //             });
    //         }, "Actions");
    //     }
    // },


    refresh: function(frm) {
        
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
        if (frm.doc.transaction_type === "Fund Allocation") {
            frm.clear_table("items");
            frm.refresh_field("items");
        }
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
                frm.set_value('current_branch_balance', r.message || 0);
                frm.refresh_field('current_branch_balance'); 
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
