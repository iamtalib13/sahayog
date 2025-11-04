// frappe.query_reports["Disciplinary Cases"] = {
// 	// define report filters for disciplinary cases report
//     filters: [
// 		// filter for from date
//         {
//             fieldname: "from_date",
//             label: __("From Date"),
//             fieldtype: "Date",
//         },
// 		// filter for to date
//         {
//             fieldname: "to_date",
//             label: __("To Date"),
//             fieldtype: "Date",
//         },
// 		// filter for case status
//         {
//             fieldname: "case_status",
//             label: __("Case Status"),
//             fieldtype: "Select",
//             options: "\nUnder Process\nClosed",
//         },
// 		// filter for branch
//         {
//             fieldname: "branch_name",
//             label: __("Branch"),
//             fieldtype: "Link",
//             options: "Branch",
//         },
//     ],

// 	// Add Clear Filters button on report load
//     onload: function(report) {
//         // Add button to filter area
//         report.page.add_inner_button(__('Clear Filters'), function() {
//             // Loop through each filter field
//             report.filters.forEach(f => {
//                 // Clear filter values
//                 f.set_value('');
//             });

//             // Refresh the report with cleared filters
//             report.refresh();
//         }).addClass('btn-secondary'); // Optional styling (grey button)
//     }
	
// };

// // ---------------------------
// // Custom formatter for Status column color
// // ---------------------------
// frappe.query_reports["Disciplinary Cases"].formatter = function (value, row, column, data, default_formatter) {
//     // Apply default formatter first
//     value = default_formatter(value, row, column, data);

//     // Highlight Status column with colors
//     if (column.fieldname === "case_status") {
//         if (value === "Under Process") {
//             // Yellow color text
//             value = `<span style="color: #fbc02d; font-weight: 600;">${value}</span>`;
//         } 
//         else if (value === "Closed") {
//             // Green color text
//             value = `<span style="color: #4caf50; font-weight: 600;">${value}</span>`;
//         }
//     }

//     return value;
// };




frappe.query_reports["Disciplinary Cases"] = {
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
            fieldname: "case_status",
            label: __("Case Status"),
            fieldtype: "Select",
            options: "\nUnder Process\nClosed",
        },
        {
            fieldname: "branch_name",
            label: __("Branch"),
            fieldtype: "Link",
            options: "Branch",
        },
    ],

    // ---------------------------
    // On Load (Add Clear Filters Button)
    // ---------------------------
    onload: function (report) {
        report.page.add_inner_button(__('Clear Filters'), function () {
            // Clear all filter values
            report.filters.forEach(f => f.set_value(''));

            // Refresh report
            report.refresh();
        }).addClass('btn-secondary'); // Grey style button
    },

    // ---------------------------
    // Custom Formatter for Status Column
    // ---------------------------
    formatter: function (value, row, column, data, default_formatter) {
        // Apply default formatter first
        value = default_formatter(value, row, column, data);

        // Highlight Case Status column
        if (column.fieldname === "case_status") {
            if (value === "Under Process") {
                value = `<span style="color: #FF0000; font-weight: 600;">${value}</span>`;
            } 
            else if (value === "Closed") {
                value = `<span style="color: #4caf50; font-weight: 600;">${value}</span>`;
            }
        }

        return value;
    }
};
