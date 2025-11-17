frappe.query_reports["My Pending Approvals"] = {
    // "filters": [
    //     {
    //         "fieldname": "approval_status",
    //         "label": __("Approval Status"),
    //         "fieldtype": "Select",
    //         "options": [
    //             "",
    //             "Pending",
    //             "Approved",
    //             "Rejected",
    //             "Skip"
    //         ],
    //         "default": "Pending"
    //     }
    // ],
    
    "formatter": function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);
        
        // Style Request ID to look clearly clickable
        if (column.fieldname == "name" && data.full_name) {
            value = `<a href="/app/employee-material-request/${data.full_name}" 
                style="
                    color: #2196F3;
                    font-weight: 600;
                    padding: 4px 10px;
                    border-radius: 4px;
                    background: #E3F2FD;
                    text-decoration: none;
                    display: inline-block;
                    transition: all 0.2s;
                    border: 1px solid #BBDEFB;
                "
                onmouseover="this.style.background='#2196F3'; this.style.color='#fff';"
                onmouseout="this.style.background='#E3F2FD'; this.style.color='#2196F3';"
            >${data.name}</a>`;
        }
        
        // Color coding for Reporting Person Status
        if (column.fieldname == "reporting_person_status") {
            if (data.reporting_person_status == "Approved") {
                value = `<span style="
                    color: #4CAF50;
                    font-weight: bold;
                    padding: 3px 8px;
                    border-radius: 4px;
                    background: #E8F5E9;
                ">✓ Approved</span>`;
            } else if (data.reporting_person_status == "Rejected") {
                value = `<span style="
                    color: #f44336;
                    font-weight: bold;
                    padding: 3px 8px;
                    border-radius: 4px;
                    background: #FFEBEE;
                ">✗ Rejected</span>`;
            } else if (data.reporting_person_status == "Pending") {
                value = `<span style="
                    color: #ff9800;
                    font-weight: bold;
                    padding: 3px 8px;
                    border-radius: 4px;
                    background: #FFF3E0;
                ">⏱ Pending</span>`;
            } else if (data.reporting_person_status == "Skip") {
                value = `<span style="
                    color: #2196F3;
                    font-weight: bold;
                    padding: 3px 8px;
                    border-radius: 4px;
                    background: #E3F2FD;
                ">⤭ Skip</span>`;
            }
        }
        
        // Color coding for HO Officer Status
        if (column.fieldname == "ho_officer_status") {
            if (data.ho_officer_status == "Approved") {
                value = `<span style="
                    color: #4CAF50;
                    font-weight: bold;
                    padding: 3px 8px;
                    border-radius: 4px;
                    background: #E8F5E9;
                ">✓ Approved</span>`;
            } else if (data.ho_officer_status == "Rejected") {
                value = `<span style="
                    color: #f44336;
                    font-weight: bold;
                    padding: 3px 8px;
                    border-radius: 4px;
                    background: #FFEBEE;
                ">✗ Rejected</span>`;
            } else if (data.ho_officer_status == "Pending") {
                value = `<span style="
                    color: #ff9800;
                    font-weight: bold;
                    padding: 3px 8px;
                    border-radius: 4px;
                    background: #FFF3E0;
                ">⏱ Pending</span>`;
            }
        }
        
        // Highlight Request Age based on days
        if (column.fieldname == "request_age_days") {
            let days = parseInt(data.request_age_days);
            if (days > 7) {
                value = `<span style="
                    color: #f44336;
                    font-weight: bold;
                    padding: 3px 8px;
                    border-radius: 4px;
                    background: #FFEBEE;
                ">${days} days</span>`;
            } else if (days > 3) {
                value = `<span style="
                    color: #ff9800;
                    font-weight: bold;
                    padding: 3px 8px;
                    border-radius: 4px;
                    background: #FFF3E0;
                ">${days} days</span>`;
            } else {
                value = `<span style="
                    color: #4CAF50;
                    font-weight: bold;
                    padding: 3px 8px;
                    border-radius: 4px;
                    background: #E8F5E9;
                ">${days} days</span>`;
            }
        }
        
        return value;
    }
};
