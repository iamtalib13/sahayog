frappe.ui.form.on("Expense Category", {
    refresh(frm) {
        
        // 1. Identify the User
        let is_manager = frappe.user.has_role('HO Petty Cash Manager');
        let is_admin = frappe.session.user === 'Administrator';

        // 2. DEFAULT STATE: Lock sensitive fields for everyone
        // (Even if they have Write access, we start by locking these)
        // frm.set_df_property('finacle_gl_code', 'read_only', 0);

        // 3. MANAGER LOGIC
        if (is_manager || is_admin) {
            
            // Allow editing limits (These are always open for Managers)
            frm.set_df_property('metro_limit', 'read_only', 0);
            frm.set_df_property('non_metro_limit', 'read_only', 0);
            frm.set_df_property('finacle_gl_code', 'read_only', 0);


            // CONDITIONAL UNLOCK: Finacle GL Code
            // Only if Category Name is "Other Expenses"
            if (frm.doc.category_name === 'Other Expenses') {
                frm.set_df_property('finacle_gl_code', 'read_only', 0);
            }
            
        } else {
            // NON-MANAGERS: Lock everything
            frm.set_df_property('metro_limit', 'read_only', 1);
            frm.set_df_property('non_metro_limit', 'read_only', 1);
            frm.set_df_property('finacle_gl_code', 'read_only', 1);
            // finacle_gl_code is already locked by default above
        }
    },
});
