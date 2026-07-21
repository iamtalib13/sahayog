// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Unauthorized Cases"] = {
    // ---------------------------
    // Report Filters
    // ---------------------------
    filters: [
        {
            fieldname: "from_date",
            label: __("From Date"),
            fieldtype: "Date",
        },
        {
            fieldname: "to_date",
            label: __("To Date"),
            fieldtype: "Date",
        },
        {
            fieldname: "status",
            label: __("Case Status"),
            fieldtype: "Select",
            options: "\nDraft\nUnder Process\nClosed",
        },
        {
            fieldname: "branch_name",
            label: __("Branch"),
            fieldtype: "Link",
            options: "Branch",
        },
    ],

    // ---------------------------
    // On Load (Add Clear Filters & New Case Button renamed to Initiate Case)
    // ---------------------------
    onload: function (report) {
        const btn = report.page.add_inner_button(__('Initiate Case'), () => frappe.new_doc('Unauthorized Absence'));
        $(btn).css({ background: '#000', color: '#fff', borderRadius: '6px', transition: '0.2s',})
		.hover(
          function () { $(this).css('background', '#444'); },
          function () { $(this).css('background', '#000'); }
        );
        report.page.add_inner_button(__('Clear Filters'), function () {
            // Clear all filter values
            report.filters.forEach(f => f.set_value(''));
            report.refresh();
        }).addClass('btn-secondary'); // Grey style button

    },

    // ---------------------------
    // Custom Formatter for Status Column
    // ---------------------------
    formatter: function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (column.fieldname === "status") {
            if (value === "Draft") {
                value = `<span style="color: #404040; font-weight: 600;">${value}</span>`;
            } 
            else if (value === "Under Process") {
                value = `<span style="color: #FF0000; font-weight: 600;">${value}</span>`;
            } 
            else if (value === "Closed") {
                value = `<span style="color: #4caf50; font-weight: 600;">${value}</span>`;
            }
        }
        return value;
    }
};
