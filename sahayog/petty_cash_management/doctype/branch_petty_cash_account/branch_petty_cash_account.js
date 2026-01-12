// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Branch Petty Cash Account", {
// 	refresh(frm) {

// 	},
// });


frappe.ui.form.on('Branch Petty Cash Account', {
    branch: function(frm) {
        if (frm.doc.branch) {
            // Fetch the branch_type from the Master
            frappe.db.get_value('Sahayog Branch', frm.doc.branch, 'branch_type')
                .then(r => {
                    if (r && r.message) {
                        let b_type = r.message.branch_type;
                        
                        // Set the limit based on type
                        if (b_type === "Metro") {
                            frm.set_value('monthly_limit', 25000);
                        } else {
                            frm.set_value('monthly_limit', 15000);
                        }
                    }
                });
        }
    }
});
