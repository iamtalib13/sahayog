frappe.pages["operation-lead-repor"].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Operation Lead Report",
    single_column: true,
  });

  $(page.body).append(`
    <style>
.operation-lead-container {
  
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}



.dashboard-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.dashboard-subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 8px;
  font-weight: 400;
}

.data-table-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
}

.table-header-section {
    background: #f8fafc;
    padding: 15px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
}

.table-title-main {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  flex: 1;
  min-width: 200px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
  white-space: nowrap;
}

.date-input {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  transition: all 0.2s ease;
  background: white;
  min-width: 140px;
}

.date-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  text-decoration: none;
}

.refresh-btn {
  background: #f3f4f6;
  color: #374151;
  border: 2px solid #e5e7eb;
}

.refresh-btn:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

.export-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.export-btn:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}

.record-counter {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background: white;
}

.modern-table thead {
  background: linear-gradient(135deg, #1f2937, #374151);
}

.modern-table thead th {
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.5px;
  padding: 16px 12px;
  text-align: left;
  position: relative;
}

.modern-table thead th:not(:last-child)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 25%;
  height: 50%;
  width: 1px;
  background: rgba(255, 255, 255, 0.2);
}

.modern-table tbody tr {
  transition: all 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
}

.modern-table tbody tr:hover {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  transform: scale(1.001);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.modern-table tbody tr:nth-child(even) {
  background: #fafbfc;
}

.modern-table td {
  padding: 16px 12px;
  color: #374151;
  font-weight: 500;
  vertical-align: middle;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 24px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  color: white;
  padding: 0 8px;
}

.lead-count-badge {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.assigned-count-badge {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.loading-spinner {
  display: inline-block;
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.no-data-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.no-data-icon {
  font-size: 48px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.empty-message {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 14px;
  opacity: 0.7;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.table-row-animate {
  animation: fadeInUp 0.3s ease forwards;
}

/* Responsive Design */
@media (max-width: 768px) {
  .operation-lead-container {
    padding: 16px;
  }
  
  .table-header-section {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .table-title-main {
    text-align: center;
    min-width: auto;
  }
  
  .header-controls {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  
  .dashboard-title {
    font-size: 24px;
  }
  
  .modern-table {
    font-size: 12px;
  }
  
  .modern-table th,
  .modern-table td {
    padding: 12px 8px;
  }
}

@media (max-width: 480px) {
  .header-controls {
    flex-direction: column;
    width: 100%;
  }
  
  .filter-group {
    width: 100%;
    justify-content: space-between;
  }
  
  .date-input {
    flex: 1;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
  }
  
  .modern-table th,
  .modern-table td {
    padding: 10px 6px;
    font-size: 11px;
  }
  
  .record-counter {
    order: -1;
    align-self: center;
  }
}
    </style>

    <div class="operation-lead-container">

      <!-- Data Table with Integrated Controls -->
      <div class="data-table-card">
        <div class="table-header-section">
          <h3 class="table-title-main">Lead Performance Overview</h3>
          
          <div class="header-controls">
            <div class="filter-group">
              <label for="single-date-filter">Select Date:</label>
              <input type="date" id="single-date-filter" class="date-input" />
            </div>
            
            <button class="action-btn refresh-btn" id="refresh-btn">
              <i class="fas fa-sync-alt"></i>
              <span>Refresh</span>
            </button>
            
            <button class="action-btn export-btn" id="export-btn">
              <i class="fas fa-download"></i>
              <span>Export CSV</span>
            </button>
            
            <div class="record-counter" id="record-counter">
              <i class="fas fa-chart-bar"></i>
              <span id="record-count">0 records</span>
            </div>
          </div>
        </div>
        
        <div class="table-container">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Designation</th>
                <th>Branch</th>
                <th>Total Leads</th>
                <th>Assigned Leads</th>
              </tr>
            </thead>
            <tbody id="lead-table-body">
              <tr>
                <td colspan="6" class="loading-state">
                  <div class="loading-spinner"></div>
                  <div>Loading lead data...</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `);

  let cachedData = [];

  // Enhanced fetch function with better error handling
  function fetchDataByRange(startDate, endDate) {
    showLoadingState();

    let filters = [["custom_is_operation_lead", "=", 1]];

    if (startDate) filters.push(["creation", ">=", startDate]);
    if (endDate) filters.push(["creation", "<=", `${endDate} 23:59:59`]);

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Lead",
        fields: [
          "lead_owner",
          "custom_branch",
          "creation",
          "first_name",
          "_assign",
        ],
        filters,
        limit_page_length: 1000,
      },
      callback: function (r) {
        if (r.message && r.message.length) {
          processLeadData(r.message);
        } else {
          cachedData = [];
          showNoDataState();
        }
      },
      error: function (err) {
        console.error("Error fetching lead data:", err);
        showErrorState();
      },
    });
  }

  // Enhanced data processing
  function processLeadData(leads) {
    let leadGroups = leads.reduce((acc, lead) => {
      let key = `${lead.lead_owner}|${lead.custom_branch}`;
      if (!acc[key])
        acc[key] = {
          lead_owner: lead.lead_owner || "",
          custom_branch: lead.custom_branch || "",
          count: 0,
          assigned_count: 0,
        };
      acc[key].count++;
      if (lead._assign) acc[key].assigned_count++;
      return acc;
    }, {});

    let uniqueLeadOwners = [...new Set(leads.map((l) => l.lead_owner))];

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["employee_name", "employee_number", "designation", "user_id"],
        filters: [["user_id", "in", uniqueLeadOwners]],
        limit_page_length: 1000,
      },
      callback: function (emp_res) {
        let employees = {};
        if (emp_res.message && emp_res.message.length) {
          emp_res.message.forEach((emp) => {
            employees[emp.user_id] = emp;
          });
        }
        renderLeadTable(leadGroups, employees);
      },
      error: function (err) {
        console.error("Error fetching employee data:", err);
        showErrorState();
      },
    });
  }

  // Enhanced table rendering with animations
  function renderLeadTable(leadGroups, employees) {
    cachedData = Object.values(leadGroups).map((d) => {
      let emp = employees[d.lead_owner] || {};
      return {
        "Employee Number": emp.employee_number || "N/A",
        "Employee Name": emp.employee_name || "N/A",
        Designation: emp.designation || "N/A",
        Branch: d.custom_branch || "N/A",
        "Lead Count": d.count,
        "Assigned Leads Count": d.assigned_count,
      };
    });

    // Sort by lead count descending
    cachedData.sort((a, b) => b["Lead Count"] - a["Lead Count"]);

    let rowsHtml = cachedData
      .map(
        (d, index) => `
      <tr class="table-row-animate" style="animation-delay: ${index * 50}ms">
        <td><strong>${d["Employee Number"]}</strong></td>
        <td>${d["Employee Name"]}</td>
        <td><span style="color: #6b7280; font-size: 13px;">${
          d["Designation"]
        }</span></td>
        <td>${d["Branch"]}</td>
        <td><span class="count-badge lead-count-badge">${
          d["Lead Count"]
        }</span></td>
        <td><span class="count-badge assigned-count-badge">${
          d["Assigned Leads Count"]
        }</span></td>
      </tr>
    `
      )
      .join("");

    $("#lead-table-body").html(rowsHtml);
    $("#record-count").text(`${cachedData.length} records`);

    // Success notification
    frappe.show_alert(
      {
        message: `Loaded ${cachedData.length} records successfully`,
        indicator: "green",
      },
      3
    );
  }

  // Enhanced loading state
  function showLoadingState() {
    $("#lead-table-body").html(`
      <tr>
        <td colspan="6" class="loading-state">
          <div class="loading-spinner"></div>
          <div>Fetching latest lead data...</div>
        </td>
      </tr>
    `);
    $("#record-count").text("Loading...");
  }

  // Enhanced no data state
  function showNoDataState() {
    $("#lead-table-body").html(`
      <tr>
        <td colspan="6" class="no-data-state">
          <div class="no-data-icon">
            <i class="fas fa-inbox"></i>
          </div>
          <div class="empty-message">No lead data found</div>
          <div class="empty-subtitle">Try selecting a different date or check your filters</div>
        </td>
      </tr>
    `);
    $("#record-count").text("0 records");
  }

  // Error state
  function showErrorState() {
    $("#lead-table-body").html(`
      <tr>
        <td colspan="6" class="no-data-state">
          <div class="no-data-icon" style="color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="empty-message">Error loading data</div>
          <div class="empty-subtitle">Please try refreshing or contact support</div>
        </td>
      </tr>
    `);
    $("#record-count").text("Error");
  }

  // Utility function to get date range (kept for potential future use)
  function getDateRange(filter) {
    const today = new Date();
    switch (filter) {
      case "today":
        return {
          start: today.toISOString().slice(0, 10),
          end: today.toISOString().slice(0, 10),
        };
      case "yesterday": {
        let d = new Date(today);
        d.setDate(today.getDate() - 1);
        let yDate = d.toISOString().slice(0, 10);
        return { start: yDate, end: yDate };
      }
      case "day_before_yesterday": {
        let d = new Date(today);
        d.setDate(today.getDate() - 2);
        let dDate = d.toISOString().slice(0, 10);
        return { start: dDate, end: dDate };
      }
      default:
        return { start: null, end: null };
    }
  }

  // Enhanced event handlers
  $("#single-date-filter").change(function () {
    let date = $(this).val();
    if (date) {
      fetchDataByRange(date, date);
    } else {
      fetchDataByRange(null, null);
    }
  });

  $("#refresh-btn").click(function () {
    let date = $("#single-date-filter").val();
    if (date) {
      fetchDataByRange(date, date);
    } else {
      fetchDataByRange(null, null);
    }

    // Enhanced refresh animation
    const icon = $("#refresh-btn i");
    icon.addClass("fa-spin");
    setTimeout(function () {
      icon.removeClass("fa-spin");
    }, 1000);
  });

  // Enhanced CSV export
  $("#export-btn").click(function () {
    if (!cachedData.length) {
      frappe.msgprint({
        title: __("No Data Available"),
        indicator: "orange",
        message: __(
          "There is no data available to export. Please ensure you have loaded some data first."
        ),
      });
      return;
    }

    try {
      const headers = Object.keys(cachedData[0]);
      const rows = cachedData.map(function (r) {
        return headers.map(function (h) {
          let c = r[h];
          c =
            c === null || c === undefined ? "" : String(c).replace(/"/g, '""');
          return `"${c}"`;
        });
      });

      const csvContent =
        headers.join(",") +
        "\n" +
        rows
          .map(function (r) {
            return r.join(",");
          })
          .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);

        const selectedDate = $("#single-date-filter").val();
        const dateStr = selectedDate || new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `operation_lead_report_${dateStr}.csv`);

        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        URL.revokeObjectURL(url);

        frappe.show_alert(
          {
            message: __("CSV exported successfully!"),
            indicator: "green",
          },
          5
        );
      } else {
        frappe.msgprint({
          title: __("Export Error"),
          indicator: "red",
          message: __("Your browser does not support file downloads."),
        });
      }
    } catch (error) {
      console.error("Export error:", error);
      frappe.msgprint({
        title: __("Export Error"),
        indicator: "red",
        message: __(
          "An error occurred while exporting the data. Please try again."
        ),
      });
    }
  });

  // Initial data load on page load
  fetchDataByRange(null, null);
};
