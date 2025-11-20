frappe.query_reports["Zone Wise Cases"] = {
    // filter definitions
    filters: [
        { fieldname: "from_date", 
          label: __("From Date"),
          fieldtype: "Date"
        },
        { fieldname: "to_date", 
          label: __("To Date"),
          fieldtype: "Date" 
        },
        { fieldname: "case_status",
          label: __("Case Status"), 
          fieldtype: "Select", 
          options: "\nDraft\nUnder Process\nClosed" 
        },
        { fieldname: "zone", 
          label: __("Zone"), 
          fieldtype: "Link", 
          options: "Zone" 
        }
    ],

    // clear filters button
    onload: function (report) {
        report.page.add_inner_button(__('Clear Filters'), function () {
            report.filters.forEach(f => f.set_value(''));
            report.refresh();
        });
    },

    // color formatter for clickable counts
    formatter: function (value, row, column, data, default_formatter) {

        if (!["draft_count", "under_process_count", "closed_count", "total_cases"].includes(column.fieldname)) {
            return default_formatter(value, row, column, data);
        }

        const val = parseInt(value) || 0;
        if (val === 0) return 0;

        const color_map = {
            "draft_count": "#101010",
            "under_process_count": "#e53935",
            "closed_count": "#4caf50",
            "total_cases": "#0b62a4"
        };

        const status_map = {
            "draft_count": "Draft",
            "under_process_count": "Under Process",
            "closed_count": "Closed"
        };

        const zone = data.zone || "";

        const from_date = frappe.query_report.get_filter_value("from_date");
        const to_date = frappe.query_report.get_filter_value("to_date");

        // FIXED: VALID DATE FILTER FORMAT
        let date_from_to = "";
        if (from_date && to_date) {
            date_from_to = `args.issue_occurrence_date = ['between', ['${from_date}', '${to_date}']];`;
        }

        const color = color_map[column.fieldname];
        const status = status_map[column.fieldname];

        const link_id = `${column.fieldname}_${zone}`.replace(/\s+/g, "_");

        setTimeout(() => {
            const el = document.getElementById(link_id);
            if (el) {
                el.onclick = () => {
                    let args = { zone: zone };
                    if (status) args.status = status;

                    // apply date filter only when valid
                    if (date_from_to) eval(date_from_to);

                    frappe.set_route("List", "Disciplinary Case", args);
                };
            }
        }, 30);

        return `
            <a id="${link_id}" href="javascript:void(0)"
               style="color:${color}; font-weight:600; text-decoration:none;">
                ${val}
            </a>`;
    }
};
