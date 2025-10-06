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
  background: #f8fafc;
  min-height: 100vh;
}

.dashboard-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: #006767;
  text-shadow: 0 2px 4px rgba(0,103,103,0.1);
}

.dashboard-subtitle {
  font-size: 14px;
  opacity: 0.8;
  margin-top: 6px;
  font-weight: 400;
  color: #4a5568;
}

.data-table-card {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
}

.table-header-section {
  background: #f7fafc;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.table-title-main {
  font-size: 18px;
  font-weight: 600;
  color: #006767;
  margin: 0;
  flex: 1;
  min-width: 180px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.date-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-group label {
  font-weight: 500;
  color: #4a5568;
  font-size: 13px;
  white-space: nowrap;
}

.date-input {
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  transition: all 0.2s ease;
  background: white;
  min-width: 130px;
  color: #2d3748;
}

.date-input:focus {
  outline: none;
  border-color: #006767;
  box-shadow: 0 0 0 2px rgba(0, 103, 103, 0.1);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  text-decoration: none;
}

.refresh-btn {
  background: #e2e8f0;
  color: #4a5568;
  border: 1px solid #cbd5e0;
}

.refresh-btn:hover {
  background: #cbd5e0;
  transform: translateY(-1px);
}

.analytics-btn {
  background: #006767;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 103, 103, 0.2);
}

.analytics-btn:hover {
  background: #005555;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 103, 103, 0.3);
}

.export-btn {
  background: #38a169;
  color: white;
  box-shadow: 0 2px 8px rgba(56, 161, 105, 0.2);
}

.export-btn:hover {
  background: #2f855a;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(56, 161, 105, 0.3);
}

.record-counter {
  background: #718096;
  color: white;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.table-container {
  overflow-x: auto;
  max-height: 70vh;
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background: white;
  min-width: 1400px;
}

.modern-table thead {
  background: #006767;
  position: sticky;
  top: 0;
  z-index: 10;
}

.modern-table thead th {
  color: white;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.3px;
  padding: 10px 8px;
  text-align: left;
  position: relative;
  white-space: nowrap;
}

.modern-table thead th:not(:last-child)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 20%;
  height: 60%;
  width: 1px;
  background: rgba(255, 255, 255, 0.2);
}

.modern-table tbody tr {
  transition: all 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
}

.modern-table tbody tr:hover {
  background: #f0fff4;
  transform: scale(1.001);
}

.modern-table tbody tr:nth-child(even) {
  background: #f8fafc;
}

.modern-table tbody tr:nth-child(even):hover {
  background: #f0fff4;
}

.modern-table td {
  padding: 8px;
  color: #2d3748;
  font-weight: 400;
  vertical-align: middle;
  white-space: nowrap; /* allow wrapping */
  overflow: visible;   /* show full text */
  text-overflow: clip;
}


.lead-id-cell {
  font-weight: 600;
  color: #006767;
  cursor: pointer;
}

.lead-id-cell:hover {
  text-decoration: underline;
}

.status-badge {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  white-space: nowrap;
}

.status-lead { background: #3b82f6; color: white; }
.status-open { background: #10b981; color: white; }
.status-replied { background: #8b5cf6; color: white; }
.status-opportunity { background: #f59e0b; color: white; }
.status-quotation { background: #ef4444; color: white; }
.status-lost-quotation { background: #6b7280; color: white; }
.status-interested { background: #06b6d4; color: white; }
.status-converted { background: #059669; color: white; }
.status-do-not-contact { background: #dc2626; color: white; }

.amount-cell {
  text-align: right;
  font-weight: 600;
  color: #38a169;
}

.contact-cell {
  font-size: 10px;
  color: #718096;
  max-width: 120px;
}

.employee-cell {
  font-weight: 500;
  color: #2d3748;
}

.designation-cell {
  font-size: 10px;
  color: #718096;
}

.date-cell {
  font-size: 10px;
  color: #718096;
}

.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: #718096;
}

.loading-spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #006767;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

.no-data-state {
  text-align: center;
  padding: 40px 20px;
  color: #718096;
}

.no-data-icon {
  font-size: 36px;
  color: #cbd5e0;
  margin-bottom: 12px;
}

.empty-message {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #4a5568;
}

.empty-subtitle {
  font-size: 12px;
  opacity: 0.8;
  color: #718096;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.table-row-animate {
  animation: fadeInUp 0.3s ease forwards;
}

/* Analytics Modal Styles */
.analytics-metric-card {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  text-align: center;
  transition: all 0.2s ease;
}

.analytics-metric-card:hover {
  border-color: #006767;
  transform: translateY(-1px);
}

.analytics-metric-value {
  font-size: 20px;
  font-weight: 600;
  color: #006767;
  margin-bottom: 4px;
}

.analytics-metric-label {
  font-size: 11px;
  color: #718096;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.analytics-section-header {
  font-size: 14px;
  font-weight: 500;
  color: #2d3748;
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid #e2e8f0;
}

.top-performer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}

.top-performer-item:last-child {
  border-bottom: none;
}

.performer-name {
  font-weight: 500;
  color: #2d3748;
  font-size: 12px;
}

.performer-count {
  background: #006767;
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 500;
}

/* Custom scrollbar */
.table-container::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.table-container::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #006767;
}

/* Responsive Design */
@media (max-width: 768px) {
  .operation-lead-container {
    padding: 12px;
  }
  
  .table-header-section {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 10px 12px;
  }
  
  .table-title-main {
    text-align: center;
    min-width: auto;
    font-size: 16px;
  }
  
  .header-controls {
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .date-filters {
    justify-content: center;
    width: 100%;
    gap: 6px;
  }
  
  .modern-table {
    font-size: 10px;
    min-width: 1200px;
  }
  
  .modern-table th,
  .modern-table td {
    padding: 6px 4px;
  }
}

@media (max-width: 480px) {
  .header-controls {
    flex-direction: column;
    width: 100%;
    gap: 6px;
  }
  
  .date-filters {
    flex-direction: column;
    width: 100%;
    gap: 6px;
  }
  
  .filter-group {
    width: 100%;
    justify-content: space-between;
  }
  
  .date-input {
    flex: 1;
    min-width: auto;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
    padding: 8px 12px;
  }
  
  .record-counter {
    order: -1;
    align-self: center;
  }
}

.custom-modal {
  display: none;
  position: fixed;
  z-index: 1050;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.5);
}

.custom-modal-content {
  background-color: #fff;
  margin: 4% auto;
  padding: 24px;
  border-radius: 12px;
  width: 85%;
  max-width: 1000px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  animation: slideDown 0.3s ease;
  font-family: "Inter", sans-serif;
}

.custom-modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #004d40;
  margin-bottom: 16px;
}

.custom-modal-close {
  color: #888;
  float: right;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  margin-top: -8px;
}

.custom-modal-close:hover {
  color: #000;
}

.table-container {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px; /* ✅ Increased font size */
}

.custom-table thead {
  background-color: #f1f5f9;
  position: sticky;
  top: 0;
  z-index: 2;
}

.custom-table th,
.custom-table td {
  padding: 10px 14px; /* ✅ Larger cell padding */
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.custom-table tbody tr:hover {
  background-color: #f8fafc;
}

.custom-table th {
  font-weight: 600;
  color: #374151;
  font-size: 15px;
}

.custom-table td {
  color: #111827;
  font-size: 14.5px;
}

.lead-count {
  font-weight: 700;
  color: #006767;
  text-align: right;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

    </style>

    <div class="operation-lead-container">
      <div class="data-table-card">
        <div class="table-header-section">
          <h3 class="table-title-main">Lead Report</h3>
          
          <div class="header-controls">
            <div class="date-filters">
              <div class="filter-group">
                <label for="from-date-filter">From Date:</label>
                <input type="date" id="from-date-filter" class="date-input" />
              </div>
              
              <div class="filter-group">
                <label for="to-date-filter">To Date:</label>
                <input type="date" id="to-date-filter" class="date-input" />
              </div>
            </div>
            
            <button class="action-btn analytics-btn" id="analytics-btn">
              <i class="fas fa-chart-line"></i>
              <span>Analytics</span>
            </button>
            
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
                <th>S.No</th>
                <th>Lead ID</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Source</th>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Amount</th>
                <th>Employee Name</th>
                <th>Employee ID</th>
                <th>Designation</th>
                <th>SOL ID</th>
                <th>Branch</th>
                <th>District</th>
                <th>Region</th>
                <th>Zone</th>
                <th>Created On</th>
              </tr>
            </thead>
            <tbody id="lead-table-body">
              <tr>
                <td colspan="17" class="loading-state">
                  <div class="loading-spinner"></div>
                  <div>Loading detailed lead data...</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `);

  let cachedData = [];
  let summaryData = {};

  // Get current date in YYYY-MM-DD format
  function getCurrentDate() {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  }

  // Set default dates to current date
  function setDefaultDates() {
    const currentDate = getCurrentDate();
    $("#from-date-filter").val(currentDate);
    $("#to-date-filter").val(currentDate);
  }

  // Format date for display
  function formatDate(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  }

  // Format currency
  function formatCurrency(amount) {
    if (!amount || amount === 0) return "-";
    return (
      "₹" +
      parseFloat(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    );
  }

  // Truncate text for display
  function truncateText(text, maxLength = 20) {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  }

  // Fetch detailed lead data using custom API
  function fetchDataByRange(startDate, endDate) {
    showLoadingState();

    frappe.call({
      method: "sahayog.scrm.api.operation_api.get_operation_lead_report",
      args: {
        from_date: startDate,
        to_date: endDate,
      },
      callback: function (r) {
        if (r.message && r.message.success) {
          let data = r.message.data || [];
          console.log("Fetched Lead Data:", data);
          console.log("API Data:", r.message);
          processDetailedApiData(data, r.message.summary);
        } else {
          console.error("API Error:", r.message?.error || "Unknown error");
          frappe.show_alert(
            {
              message:
                "Error loading data: " + (r.message?.error || "Unknown error"),
              indicator: "red",
            },
            5
          );
          showErrorState();
        }
      },
      error: function (err) {
        console.error("Network Error:", err);
        frappe.show_alert(
          {
            message: "Network error while loading data",
            indicator: "red",
          },
          5
        );
        showErrorState();
      },
    });
  }

  // Process detailed lead data from API
  function processDetailedApiData(apiData, summary) {
    summaryData = summary || {};

    cachedData = [];

    apiData.forEach((lead) => {
      const owner = lead.lead_owner_details || {};
      const products = lead.products || [];

      if (products.length > 0) {
        products.forEach((p) => {
          cachedData.push({
            "Lead ID": lead.name || "",
            Customer: lead.lead_name || "",
            Contact: lead.mobile_no || "",
            Status: lead.status || "",
            Source: lead.source || "",
            "Product Code": p.product || "",
            "Product Name": p.product_name || "",
            Amount: p.amount || 0,
            "Employee Name": owner.employee_name || "",
            "Employee ID": owner.name || "",
            Designation: owner.designation || "",
            "SOL ID": owner.sol_id || "",
            Branch: owner.branch || "",
            District: owner.custom_district || "",
            Region: owner.custom_region || "",
            Zone: owner.custom_zone || "",
            "Created On": lead.creation || "",
            Owner: lead.lead_owner || "",
          });
        });
      } else {
        // Lead with no products
        cachedData.push({
          "Lead ID": lead.name || "",
          Customer: lead.lead_name || "",
          Contact: lead.mobile_no || "",
          Status: lead.status || "",
          Source: lead.source || "",
          "Product Code": "",
          "Product Name": "",
          Amount: 0,
          "Employee Name": owner.employee_name || "",
          "Employee ID": owner.name || "",
          Designation: owner.designation || "",
          "SOL ID": owner.sol_id || "",
          Branch: owner.branch || "",
          District: owner.custom_district || "",
          Region: owner.custom_region || "",
          Zone: owner.custom_zone || "",
          "Created On": lead.creation || "",
          Owner: lead.lead_owner || "",
        });
      }
    });

    console.log("Processed Lead Data:", cachedData);
    renderDetailedLeadTable();
  }

  // Render detailed lead table
  function renderDetailedLeadTable() {
    if (cachedData.length === 0) {
      showNoDataState();
      return;
    }

    let rowsHtml = cachedData
      .map((d, index) => {
        const statusClass = d["Status"]
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");

        return `
      <tr class="table-row-animate" style="animation-delay: ${index * 20}ms">
          <td class="serial-cell">${index + 1}</td>
          <td class="lead-id-cell" onclick="openLead('${
            d["Lead ID"]
          }')" title="${d["Lead ID"]}">
                ${d["Lead ID"] || ""}
            </td>
            <td title="${d["Customer"]}">${d["Customer"] || ""}</td>
            <td title="${d["Contact"]}">${d["Contact"] || ""}</td>
            <td>
                <span class="status-badge status-${statusClass}">
                    ${d["Status"] || ""}
                </span>
            </td>
            <td title="${d["Source"]}">${d["Source"] || ""}</td>
            <td title="${
              d["Product Code"]
            }" style="font-weight: 600; color: #006767;">
                ${d["Product Code"] || ""}
            </td>
            <td title="${d["Product Name"]}">${d["Product Name"] || ""}</td>
            <td class="amount-cell">${formatCurrency(d["Amount"])}</td>
            <td class="employee-cell" title="${d["Employee Name"]}">${
          d["Employee Name"] || ""
        }</td>
            <td style="font-weight: 600;" title="${d["Employee ID"]}">${
          d["Employee ID"] || ""
        }</td>
            <td title="${d["Designation"]}">${d["Designation"] || ""}</td>
            <td title="${d["SOL ID"]}">${d["SOL ID"] || ""}</td>
            <td title="${d["Branch"]}">${d["Branch"] || ""}</td>
            <td title="${d["District"]}">${d["District"] || ""}</td>
            <td title="${d["Region"]}">${d["Region"] || ""}</td>
            <td title="${d["Zone"]}">${d["Zone"] || ""}</td>
            <td title="${d["Created On"]}">${formatDate(d["Created On"])}</td>
        </tr>
        `;
      })
      .join("");

    $("#lead-table-body").html(rowsHtml);

    // Update record counter
    const uniqueLeads = new Set(cachedData.map((d) => d["Lead ID"])).size;
    $("#record-count").text(`${cachedData.length} rows (${uniqueLeads} leads)`);

    // Show success notification
    const totalAmount = summaryData.total_amount || 0;
    const message = `Loaded ${uniqueLeads} leads with ${
      cachedData.length
    } product rows. Total: ${formatCurrency(totalAmount)}`;

    frappe.show_alert({ message: message, indicator: "green" }, 4);
  }

  // Open lead in new tab
  function openLead(leadId) {
    if (leadId) {
      window.open(`/app/lead/${leadId}`, "_blank");
    }
  }

  // Make openLead function globally accessible
  window.openLead = openLead;

  // Show employee lead analytics with table + detailed analytics
  function showEmployeeLeadAnalytics() {
    const fromDate = $("#from-date-filter").val();
    const toDate = $("#to-date-filter").val();

    frappe.call({
      method: "sahayog.scrm.api.operation_api.get_employee_lead_summary",
      args: { from_date: fromDate, to_date: toDate },
      callback: function (r) {
        if (r.message && r.message.success) {
          const data = r.message.data || [];

          if (!data.length) {
            frappe.msgprint("No leads found for selected date range");
            return;
          }

          // Build table rows
          const rows = data
            .map(
              (emp) => `
          <tr>
            <td>${emp["Employee ID"] || "-"}</td>
            <td>${emp["Employee Name"] || "-"}</td>
            <td>${emp["Designation"] || "-"}</td>
            <td>${emp["SOL ID"] || "-"}</td>
            <td>${emp["Branch"] || "-"}</td>
            <td>${emp["District"] || "-"}</td>
            <td style="font-weight:600; color:#006767;">${
              emp["Total Leads"] || 0
            }</td>
          </tr>`
            )
            .join("");

          // Create the HTML modal
          const modalHTML = `
          <div id="employeeLeadModal" class="custom-modal">
            <div class="custom-modal-content">
              <span class="custom-modal-close">&times;</span>
              <h4 style="margin-bottom: 10px; color: #004d40;">
                🧑‍💼 Employee Lead Summary (${fromDate || "-"} to ${
            toDate || "-"
          })
              </h4>
              <div style="max-height: 400px; overflow-y: auto;">
                <table class="table table-bordered table-hover" style="font-size: 12px; width: 100%;">
                  <thead style="background: #f1f5f9;">
                    <tr>
                      <th>Employee ID</th>
                      <th>Employee Name</th>
                      <th>Designation</th>
                      <th>SOL ID</th>
                      <th>Branch</th>
                      <th>District</th>
                      <th>Total Leads</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            </div>
          </div>
        `;

          // Remove old modal if it exists
          $("#employeeLeadModal").remove();

          // Append new modal to the body
          $("body").append(modalHTML);

          // Show the modal
          const modal = document.getElementById("employeeLeadModal");
          modal.style.display = "block";

          // Close modal when clicking the X
          document.querySelector(".custom-modal-close").onclick = function () {
            modal.style.display = "none";
          };

          // Close modal when clicking outside the modal content
          window.onclick = function (event) {
            if (event.target === modal) {
              modal.style.display = "none";
            }
          };
        } else {
          frappe.show_alert(
            {
              message:
                "Error fetching employee lead summary: " +
                (r.message?.error || "Unknown error"),
              indicator: "red",
            },
            5
          );
        }
      },
    });
  }

  // Loading state
  function showLoadingState() {
    $("#lead-table-body").html(`
      <tr>
        <td colspan="17" class="loading-state">
          <div class="loading-spinner"></div>
          <div>Fetching detailed lead data with products...</div>
        </td>
      </tr>
    `);
    $("#record-count").text("Loading...");
  }

  // No data state
  function showNoDataState() {
    $("#lead-table-body").html(`
      <tr>
        <td colspan="17" class="no-data-state">
          <div class="no-data-icon">
            <i class="fas fa-inbox"></i>
          </div>
          <div class="empty-message">No detailed lead data found</div>
          <div class="empty-subtitle">Try selecting a different date range or check your filters</div>
        </td>
      </tr>
    `);
    $("#record-count").text("0 records");
  }

  // Error state
  function showErrorState() {
    $("#lead-table-body").html(`
      <tr>
        <td colspan="17" class="no-data-state">
          <div class="no-data-icon" style="color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="empty-message">Error loading detailed data</div>
          <div class="empty-subtitle">Please check your connection and try again</div>
        </td>
      </tr>
    `);
    $("#record-count").text("Error");
  }

  // Event handlers
  $("#from-date-filter, #to-date-filter").change(function () {
    let fromDate = $("#from-date-filter").val();
    let toDate = $("#to-date-filter").val();

    if (fromDate && toDate && fromDate > toDate) {
      frappe.show_alert(
        {
          message: "From date cannot be greater than To date",
          indicator: "orange",
        },
        3
      );
      return;
    }

    fetchDataByRange(fromDate, toDate);
  });

  $("#refresh-btn").click(function () {
    let fromDate = $("#from-date-filter").val();
    let toDate = $("#to-date-filter").val();
    fetchDataByRange(fromDate, toDate);

    const icon = $("#refresh-btn i");
    icon.addClass("fa-spin");
    setTimeout(() => icon.removeClass("fa-spin"), 1000);
  });

  $("#analytics-btn").click(function () {
    if (cachedData.length === 0) {
      frappe.show_alert(
        {
          message: "Please load data first to view analytics",
          indicator: "orange",
        },
        3
      );
      return;
    }
    showEmployeeLeadAnalytics();
  });

  // Enhanced CSV export with all fields
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
      const headers = [
        "Lead ID",
        "Customer",
        "Contact",
        "Status",
        "Source",
        "Product Code",
        "Product Name",
        "Amount",
        "Employee Name",
        "Employee ID",
        "Designation",
        "SOL ID",
        "Branch",
        "District",
        "Region",
        "Zone",
        "Created On",
      ];

      const rows = cachedData.map(function (r) {
        return headers.map(function (h) {
          let c = r[h];
          if (h === "Amount") {
            c = c || 0;
          }
          c =
            c === null || c === undefined ? "" : String(c).replace(/"/g, '""');
          return `"${c}"`;
        });
      });

      const csvContent =
        headers.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);

        const fromDate = $("#from-date-filter").val();
        const toDate = $("#to-date-filter").val();
        const dateStr =
          fromDate && toDate ? `${fromDate}_to_${toDate}` : getCurrentDate();
        link.setAttribute("download", `detailed_lead_report_${dateStr}.csv`);

        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        frappe.show_alert(
          {
            message: __("Detailed lead report exported successfully!"),
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

  // Initialize page
  setDefaultDates();
  const currentDate = getCurrentDate();
  fetchDataByRange(currentDate, currentDate);
};
