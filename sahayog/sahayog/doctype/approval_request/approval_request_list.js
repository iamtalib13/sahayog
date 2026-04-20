frappe.listview_settings['Approval Request'] = {
    add_fields: ["approval_status"],
    
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