frappe.ui.form.on('Approval Request', {
    setup: function(frm) {
        // Run this only when creating a brand new document
        if (frm.is_new()) {
            // Fetch the Employee record where user_id matches the currently logged-in user
            frappe.db.get_value('Employee', { 'user_id': frappe.session.user }, 
                ['name', 'employee_name', 'designation'])
            .then(r => {
                // If a matching Employee is found
                if (r.message) {
                    // Set the fetched values to the corresponding fields in the form
                    frm.set_value('employee', r.message.name);
                    frm.set_value('employee_name', r.message.employee_name);
                    frm.set_value('designation', r.message.designation);
                } else {
                    // If no Employee record is linked to this user, show a warning
                    frappe.msgprint(__('No Employee record found linked to your user account ({0}). Please contact HR.', [frappe.session.user]));
                }
            });
        }
    },
    
    // ... [Keep your existing refresh code for the Approve/Reject buttons here] ...
    refresh: function(frm) {
        if (frm.doc.docstatus === 1 && frm.doc.status === 'Pending Approval') {
            let is_approver = frm.doc.approvers.some(a => a.approver === frappe.session.user);
            
            if (is_approver) {
                frm.add_custom_button(__('Approve'), () => prompt_remark(frm, 'Approved'), __('Actions'))
                   .addClass('btn-success');
                   
                frm.add_custom_button(__('Reject'), () => prompt_remark(frm, 'Rejected'), __('Actions'))
                   .addClass('btn-danger');
            }
        }
    }
});

function prompt_remark(frm, action) {
    // ... [Keep your existing prompt_remark function here] ...
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