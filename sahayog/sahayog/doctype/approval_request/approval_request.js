frappe.ui.form.on('Approval Request', {
    setup: function(frm) {
        // Run this only when creating a brand new document
        if (frm.is_new()) {
            frappe.db.get_value('Employee', { 'user_id': frappe.session.user }, 
                ['name', 'employee_name', 'designation'])
            .then(r => {
                if (r.message) {
                    frm.set_value('employee', r.message.name);
                    frm.set_value('employee_name', r.message.employee_name);
                    frm.set_value('designation', r.message.designation);
                } else {
                    frappe.msgprint(__('No Employee record found linked to your user account ({0}).', [frappe.session.user]));
                }
            });
        }
    },
    
    refresh: function(frm) {
        // Show Approve/Reject buttons only if Submitted and Pending
        if (frm.doc.docstatus === 1 && frm.doc.status === 'Pending Approval') {
            let is_approver = frm.doc.approvers.some(a => a.approver === frappe.session.user);
            
            if (is_approver) {
                frm.add_custom_button(__('Approve'), () => prompt_remark(frm, 'Approved'), __('Actions'))
                   .addClass('btn-success');
                   
                frm.add_custom_button(__('Reject'), () => prompt_remark(frm, 'Rejected'), __('Actions'))
                   .addClass('btn-danger');
            }
        }
    },

    // Triggered whenever the 'Category' field is changed
    
    category: function(frm) {
        if (frm.doc.category) {
            // Fetch the actual 'category' text field from the linked Approval Category document
            frappe.db.get_value('Approval Category', frm.doc.category, 'category')
            .then(r => {
                if (r.message && r.message.category) {
                    // Set the fetched text value into the title field
                    frm.set_value('title', r.message.category);
                }
            });
        }
    }
});

function prompt_remark(frm, action) {
    frappe.prompt([
        {
            label: 'Remark',
            fieldname: 'remark',
            fieldtype: 'Small Text',
            reqd: 1,
            description: `Please enter your reason to ${action.toLowerCase()} this request.`
        }
    ], function(values) {
        frappe.call({
            method: 'sahayog.sahayog.doctype.approval_request.approval_request.process_approval',
            args: {
                docname: frm.doc.name,
                action: action,
                remark: values.remark
            },
            freeze: true,
            freeze_message: `Processing ${action}...`,
            callback: function(r) {
                if (!r.exc) {
                    frappe.show_alert({message: `Request ${action} Successfully`, indicator: 'green'});
                    frm.reload_doc();
                }
            }
        });
    }, `Confirm ${action}`, 'Submit');
}

// Trigger for the Child Table
frappe.ui.form.on('Approval Approver', {
    approver: function(frm, cdt, cdn) {
        // Get the specific row that the user is editing
        let row = frappe.get_doc(cdt, cdn);
        
        if (row.approver) {
            // Fetch the 'full_name' from the User DocType based on the selected email/ID
            frappe.db.get_value('User', row.approver, 'full_name')
            .then(r => {
                if (r.message && r.message.full_name) {
                    // Set the fetched name into the approver_name field of that specific row
                    frappe.model.set_value(cdt, cdn, 'approver_name', r.message.full_name);
                }
            });
        } else {
            // If the user clears the approver field, clear the name field too
            frappe.model.set_value(cdt, cdn, 'approver_name', '');
        }
    }
});