frappe.pages['operation-lead-repor'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Operation lead report',
		single_column: true
	});

  $(page.body).append(`
    <style>.lead-count-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
}

.lead-count-card {
  border-radius: 8px;
  padding: 8px 12px;
  background: #fff;
  box-shadow: 0px 1px 3px rgba(40, 60, 96, 0.05);
  border: 1px solid #f0f4f8;
  margin-top: 0;
}

.lead-count-custom-table {
  width: 100%;
  border-collapse: separate;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 10px;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  background: #fff;
  border: 1px solid #e1e8f0;
}

.lead-count-custom-table th, 
.lead-count-custom-table td {
  border: none;
  padding: 6px 8px;
  font-size: 12px;
  text-align: center;
  border-bottom: 1px solid #f0f4f8;
  transition: none;
}

.lead-count-custom-table thead th {
  background: #2d3e50;
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 11px;
  border-bottom: 2px solid #4a6178;
  padding: 10px;
  position: relative;
  overflow: hidden;
}

.lead-count-custom-table thead th::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
}

.lead-count-custom-table tbody tr {
  border-bottom: 1px solid #f0f4f8;
  transition: none;
}

.lead-count-custom-table tbody tr:hover {
  background: #f0f7ff;
  transform: none;
  box-shadow: none;
}

.lead-count-custom-table tbody tr:nth-child(even) {
  background: #fafcff;
}

.lead-count-custom-table tbody tr:nth-child(odd) {
  background: #ffffff;
}

.lead-count-custom-table td {
  color: #2c3e50;
  font-weight: 500;
  position: relative;
}

.lead-count-custom-table td:not(:last-child)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 60%;
  background: linear-gradient(to bottom, transparent, #e1e8f0, transparent);
}

.table-header {
  display: flex;
  align-items: right;
  justify-content: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.table-title {
  font-size: 14px;
  font-weight: 700;
  color: #2d3e50;
  display: flex;
  align-items: center;
  gap: 4px;
}

.data-count {
  background: #3498db;
  color: white;
  padding: 2px 8px;
  border-radius: 14px;
  font-size: 10px;
  font-weight: 600;
}

.controls-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

#day-filter {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #d1d9e6;
  font-size: 12px;
  background: white;
  box-shadow: none;
  cursor: pointer;
}

#day-filter:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
  transform: none;
}

.refresh-btn, .export-btn {
  background: #f8f9fa;
  color: #2d3e50;
  border-radius: 6px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  padding: 6px 10px;
  border: 1px solid #e1e8f0;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: none;
  box-shadow: none;
}

.refresh-btn:hover, .export-btn:hover {
  background: #e9ecef;
  box-shadow: none;
  transform: none;
}

.export-btn:hover {
  background: #219653;
  box-shadow: none;
}

.custom-date-group {
  display: flex;
  gap: 8px;
  margin: 8px 0;
  border: 1px solid #e1e8f0;
  background: #f8fafc;
  border-radius: 6px;
  padding: 4px 8px;
  align-items: center;
  transition: none;
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  pointer-events: none;
}

.custom-date-group.active {
  max-height: 60px;
  opacity: 1;
  pointer-events: auto;
}

.custom-date-group label {
  font-weight: 600;
  min-width: 70px;
  color: #2d3e50;
  font-size: 13px;
  margin: 0;
}

.custom-date-group input[type="date"] {
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #d1d9e6;
  font-size: 13px;
  width: 120px;
  box-shadow: none;
}

.custom-date-group input[type="date"]:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
  transform: none;
}

.no-data-message {
  text-align: center;
  padding: 20px 10px;
  color: #7f8c8d;
  font-size: 14px;
  font-style: italic;
}

.loading-shimmer {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 6px;
}

@keyframes shimmer {
  0% {background-position: -200% 0;}
  100% {background-position: 200% 0;}
}
</style>

    <div class="lead-count-container">
      <div class="lead-count-card">
        <div class="table-header" style="justify-content: flex-end;">

          <div class="controls-section">

            <div class="table-title-section" style="margin-right: auto;">
              <div class="table-title">
                <i class="fas fa-chart-bar"></i>
                <span class="data-count" id="record-count">0 records</span>
              </div>
            </div>

            <div class="filter-group">
              <label for="single-date-filter">Select Date:</label>
              <input type="date" id="single-date-filter" />
            </div>

            <button class="refresh-btn" id="refresh-btn">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>

            <button class="export-btn" id="export-btn">
              <i class="fas fa-file-export"></i> Export CSV
            </button>
            
          </div>
        </div>

        <div class="table-container">
          <table class="lead-count-custom-table">
            <thead>
              <tr>
                <th>Employee Number</th>
                <th>Employee Name</th>
                <th>Designation</th>
                <th>Branch</th>
                <th>Lead Count</th>
                <th>Assigned Leads</th>
              </tr>
            </thead>
            <tbody id="lead-count-table-body">
              <tr>
                <td colspan="6" style="text-align:center; padding:40px; color: #7f8c8d;">
                  <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading lead data...</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `);

  let cachedData = [];

  // Fetch data helper
  function fetchDataByRange(startDate, endDate) {
    $("#lead-count-table-body").html(`
      <tr>
        <td colspan="6" style="text-align:center; padding:40px; color:#7f8c8d;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading lead data...</span>
          </div>
        </td>
      </tr>
    `);

    let filters = [["custom_is_operation_lead", "=", 1]];

    if (startDate) filters.push(["creation", ">=", startDate]);
    if (endDate) filters.push(["creation", "<=", `${endDate} 23:59:59`]);

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Lead",
        fields: ["lead_owner", "custom_branch", "creation", "first_name", "_assign"],
        filters,
        limit_page_length: 1000,
      },
      callback: function(r) {
        if (r.message && r.message.length) {
          processLeadData(r.message);
        } else {
          cachedData = [];
          showNoData();
        }
      },
    });
  }

  // Process and render lead data
  function processLeadData(leads) {
    let leadGroups = leads.reduce((acc, lead) => {
      let key = `${lead.lead_owner}|${lead.custom_branch}`;
      if (!acc[key]) acc[key] = { lead_owner: lead.lead_owner || "", custom_branch: lead.custom_branch || "", count: 0, assigned_count: 0 };
      acc[key].count++;
      if (lead._assign) acc[key].assigned_count++;
      return acc;
    }, {});

    let uniqueLeadOwners = [...new Set(leads.map(l => l.lead_owner))];

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["employee_name", "employee_number", "designation", "user_id"],
        filters: [["user_id", "in", uniqueLeadOwners]],
        limit_page_length: 1000,
      },
      callback: function(emp_res) {
        let employees = {};
        if (emp_res.message && emp_res.message.length) {
          emp_res.message.forEach(emp => {
            employees[emp.user_id] = emp;
          });
        }
        renderLeadTable(leadGroups, employees);
      }
    });
  }

  // Render lead data table rows
  function renderLeadTable(leadGroups, employees) {
    cachedData = Object.values(leadGroups).map(d => {
      let emp = employees[d.lead_owner] || {};
      return {
        "Employee Number": emp.employee_number || "N/A",
        "Employee Name": emp.employee_name || "N/A",
        "Designation": emp.designation || "N/A",
        "Branch": d.custom_branch,
        "Lead Count": d.count,
        "Assigned Leads Count": d.assigned_count,
      };
    });

    let rowsHtml = cachedData.map(d => `
      <tr>
        <td>${d["Employee Number"]}</td>
        <td>${d["Employee Name"]}</td>
        <td>${d["Designation"]}</td>
        <td>${d["Branch"]}</td>
        <td><span class="count-badge lead-count-badge">${d["Lead Count"]}</span></td>
        <td><span class="count-badge assigned-count-badge">${d["Assigned Leads Count"]}</span></td>
      </tr>
    `).join("");

    $("#lead-count-table-body").html(rowsHtml);
    $("#record-count").text(`${cachedData.length} records`);

    $("#lead-count-table-body tr").each(function(i) {
      $(this).css("opacity", 0).delay(i * 50).animate({opacity: 1}, 300);
    });
  }

  // Show no data message
  function showNoData() {
    $("#lead-count-table-body").html(`
      <tr>
        <td colspan="6" class="no-data-message">
          <i class="fas fa-inbox"></i><br>No lead data found for the selected criteria
        </td>
      </tr>
    `);
    $("#record-count").text("0 records");
  }

  // Utility to get date range (unused now but kept if needed later)
  function getDateRange(filter) {
    const today = new Date();
    switch (filter) {
      case "today":
        return { start: today.toISOString().slice(0,10), end: today.toISOString().slice(0,10) };
      case "yesterday": {
        let d = new Date(today);
        d.setDate(today.getDate() - 1);
        let yDate = d.toISOString().slice(0,10);
        return { start: yDate, end: yDate };
      }
      case "day_before_yesterday": {
        let d = new Date(today);
        d.setDate(today.getDate() - 2);
        let dDate = d.toISOString().slice(0,10);
        return { start: dDate, end: dDate };
      }
      default:
        return { start: null, end: null };
    }
  }

  // Event handlers

  // Date picker change: filter by selected exact date
  $("#single-date-filter").change(() => {
    let date = $("#single-date-filter").val();
    fetchDataByRange(date, date);
  });

  // Refresh button click: re-fetch current date filter
  $("#refresh-btn").click(() => {
    let date = $("#single-date-filter").val();
    fetchDataByRange(date, date);

    const icon = $("#refresh-btn i");
    icon.css({transition: "transform 0.5s ease", transform: "rotate(360deg)"});
    setTimeout(() => icon.css("transform", "rotate(0deg)"), 500);
  });

  // Export CSV click: create and download CSV of current cachedData
  $("#export-btn").click(() => {
    if (!cachedData.length) {
      frappe.msgprint({ title: __('No Data'), indicator: 'orange', message: __('No data available to export')});
      return;
    }
    const headers = Object.keys(cachedData[0]);
    const rows = cachedData.map(r => headers.map(h => {
      let c = r[h];
      c = c === null || c === undefined ? "" : String(c).replace(/"/g, '""');
      return `"${c}"`;
    }));
    const csvContent = headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `lead_count_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      frappe.show_alert({message: __('CSV exported successfully'), indicator: 'green'});
    }
  });

  // Initial fetch: load all data
  fetchDataByRange(null, null);
};