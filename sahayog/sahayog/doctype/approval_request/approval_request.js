// frappe.ui.form.on("Approval Request", {
//     refresh: function(frm) {
        // First block: Approver logic
        // if (!frm.is_new()) {
        //     frappe.call({
        //         method: "sahayog.sahayog.doctype.approval_request.approval_request.is_user_approver",
        //         args: { docname: frm.doc.name },
        //         callback: function(r) {
        //             if (!r.message) {
        //                 // hide approve/reject buttons for non-approvers
        //                 setTimeout(() => {
        //                     $(".btn-approve, .btn-reject").hide();
        //                 }, 300);
        //             } else {
        //                 // r.message gives true/false if user is approver
        //                 // Now check this approver's decision
        //                 let approver = frm.doc.approvers.find(a => a.user === frappe.session.user);
        //                 if (approver && ["Approved", "Rejected"].includes(approver.status)) {
        //                     // Hide cancel button if decision already given
        //                     frm.page.btn_secondary?.remove();
        //                     frm.page.clear_actions_menu();
        //                 }
        //             }
        //         }
        //     });
        // }

        // Second block: Remove cancel for non-System Manager if doc is submitted
//         if (frm.doc.docstatus === 1 && !frappe.user.has_role("System Manager")) {
//             frm.page.btn_secondary?.remove();
//             frm.page.clear_actions_menu();
//         }
//     }
// });


frappe.ui.form.on("Approval Request", {
    refresh: function(frm) {
        // Remove Cancel button for non-System Managers if doc is submitted
        if (frm.doc.docstatus === 1 && !frappe.user.has_role("System Manager")) {
            frm.page.btn_secondary?.remove();
            frm.page.clear_actions_menu();
        }
    }
});
