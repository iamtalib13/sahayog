function extend_listview_event(doctype, event, callback) {
    if (!frappe.listview_settings[doctype]) {
        frappe.listview_settings[doctype] = {};
    }

    const old_event = frappe.listview_settings[doctype][event];
    frappe.listview_settings[doctype][event] = function (listview) {
        if (old_event) {
            old_event(listview);
        }
        callback(listview);
    };
}

extend_listview_event("Loan Application", "refresh", function (listview) {
    // Manual color override because Workflow overrides indicators
    const status_colors = {
        "Draft": "gray",
        "Credit Check": "orange",
        "Valuation Pending": "blue",
        "Credit Decision": "cyan",
        "CPC Processing": "yellow",
        "Approved": "green",
        "Rejected": "red"
    };

    $(document).ready(function() {
        Object.entries(status_colors).forEach(([status, color]) => {
            // Find spans with the status filter and force the color class
            $(`span[data-filter="status,=,${status}"]`).each(function() {
                $(this).removeClass('gray blue red green orange purple cyan yellow').addClass(color);
            });
        });
    });
});

// Keep get_indicator for standard Frappe behavior where possible
frappe.listview_settings['Loan Application'].get_indicator = function(doc) {
    const status_colors = {
        "Draft": "gray",
        "Credit Check": "orange",
        "Valuation Pending": "blue",
        "Credit Decision": "cyan",
        "CPC Processing": "yellow",
        "Approved": "green",
        "Rejected": "red"
    };
    return [__(doc.status), status_colors[doc.status] || "gray", "status,=," + doc.status];
};