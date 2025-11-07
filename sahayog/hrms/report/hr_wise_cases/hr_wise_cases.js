frappe.query_reports["HR Wise Cases"] = {
    // -------------------------------
    // On Load (Add New Case Button)
    // -------------------------------
    onload: function (report) {
        const btn = report.page.add_inner_button(__('New Case'), () => frappe.new_doc('Disciplinary Case'));
        $(btn).css({
            background: '#000',
            color: '#fff',
            borderRadius: '6px',
            transition: '0.2s',
        }).hover(
            function () { $(this).css('background', '#444'); },
            function () { $(this).css('background', '#000'); }
        );
    },

    // -----------------------------------------------------------
    // Custom Formatter colors for Status Columns numbers
    // -----------------------------------------------------------
    formatter: function (value, row, column, data, default_formatter) {
        let formatted_value = default_formatter(value, row, column, data);

        // 🧱 Ensure HR Employee fields render as text only
        if (["hr_employee_id", "hr_name"].includes(column.fieldname)) {
            return formatted_value;
        }

        const numericValue = parseInt(value) || 0;

        // Skip link if value is 0
        if (numericValue === 0) return numericValue;

        // Helper for colored links
        function makeLink(color, status) {
            const hr_id = data.hr_employee_id || "";
            return `<a href="#"
                style="color:${color}; font-weight:600; text-decoration:none;"
                onclick="frappe.set_route('List', 'Disciplinary Case', {
                    hr_employee_id: '${hr_id}',
                    status: '${status}'
                }); return false;">
                ${numericValue}
            </a>`;
        }

        // Color-coded clickable counts
        if (column.fieldname === "draft_count") {
            formatted_value = makeLink("#101010", "Draft");
        } else if (column.fieldname === "under_process_count") {
            formatted_value = makeLink("#e53935", "Under Process");
        } else if (column.fieldname === "closed_count") {
            formatted_value = makeLink("#4caf50", "Closed");
        }

        return formatted_value;
    },
};

