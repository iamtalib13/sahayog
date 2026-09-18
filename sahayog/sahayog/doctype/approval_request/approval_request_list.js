frappe.listview_settings['Approval Request'] = {
    add_fields: ["approval_status"],

    onload: function(listview) {
        frappe.call({
            method: "sahayog.sahayog.doctype.approval_request.approval_request.is_approval_enabled",
            callback: function(r) {
                if (r.message === false) {
                    frappe.msgprint(__("Approval System is OFF. Please enable it from Sahayog Settings."));
                    frappe.set_route("home");
                }
            }
        });
    },
    
    // Stop Frappe from forcing "Draft" on docstatus 0
    has_indicator_for_draft: true,

    get_indicator: function(doc) {
        let current_status = doc.approval_status || "Draft";
        
        let colors = {
            "Draft": "grey",
            "Pending Approval": "orange",
            "Approved": "green",
            "Rejected": "red"
        };
        
        return [__(current_status), colors[current_status] || "grey", "approval_status,=," + current_status];
    }
};