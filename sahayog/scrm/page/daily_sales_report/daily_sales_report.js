frappe.pages["daily-sales-report"].on_page_load = async function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Daily Sales Report",
    single_column: true,
  });

  // Improved Custom Styles (including rating and export styles)
  $(`
    <style>
      body, #employee-details, .dsr-header, #dsr-table, #user-date,
      .emp-field, .empty-state, .lead-link {
        font-family: 'Inter', 'Arial', sans-serif;
      }
      .dsr-header { margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
      .dsr-description { color: #6c757d; font-size: 13px; margin: 3px 0 0 0; }
      #employee-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 8px;
        margin-bottom: 12px;
        background: #fff; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      .emp-field {
        background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 10px 12px;
        font-size: 13px;
      }
      .emp-label {
        font-size: 12px;
        color: #6c757d;
        margin-bottom: 2px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .emp-value {
        font-size: 13px;
        font-weight: 600;
        color: #212529;
        line-height: 1.25;
      }
      /* Rating styles */
      .rating-section {
        background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        margin: 15px 0; padding:2px 16px; border-left: 4px solid #007bff;
      }
      .rating-header {
        font-size: 16px; font-weight: 700; color: #212529; margin-bottom: 12px;
        display: flex; align-items: center; justify-content: space-between;
      }
      .rating-header .icon { margin-right: 8px; font-size: 18px; }
      .rating-title {
        display: flex; align-items: center;
      }
      .rating-top-badges {
        display: flex; gap: 14px; align-items: center;
      }
      .rating-metrics {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px; margin-bottom: 8px;
      }
      .metric-card {
        background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
        border: 1px solid #dee2e6; border-radius: 6px; padding: 12px;
        text-align: center;
      }
      .metric-label {
        font-size: 12px; color: #6c757d; margin-bottom: 4px;
        font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px;
      }
      .metric-value {
        font-size: 20px; font-weight: 700; line-height: 1.2;
      }
      .rating-badge {
        display: inline-flex; align-items: center; padding: 8px 16px;
        border-radius: 20px; font-size: 14px; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.5px;
      }
      .rating-qualified { background: #d4edda; color: #155724; }
      .rating-disqualified { background: #f8d7da; color: #721c24; }
      .rating-good { background: #cce7ff; color: #004085; }
      .rating-average { background: #fff3cd; color: #856404; }
      .rating-bad { background: #f8d7da; color: #721c24; }
      
      /* Updated rating criteria styles */
      .rating-criteria {
        font-size: 12px;
        color: #383d41;
        margin: 2px 0 2px 0;
        padding-left: 0;
        line-height: 1.5;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
      }
      .criteria-content {
        flex: 1;
      }
      .criteria-badges {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-end;
      }
      .badge-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .badge-label {
        font-size: 12px;
        font-weight: 600;
        color: #6c757d;
        min-width: 80px;
        text-align: right;
      }
      
      .rating-criteria ul {
        margin: 0 0 0 15px;
        padding: 0;
      }
      .rating-criteria li {
        margin: 0 0 2px 0;
        padding: 0;
      }
      .criteria-good { color: #155724; font-weight: bold; }
      .criteria-average { color: #856404; font-weight: bold; }
      .criteria-bad { color: #721c24; font-weight: bold; }
      .criteria-qualified { color: #155724; font-weight: bold; }
      .criteria-disqualified { color: #721c24; font-weight: bold; }
      
      /* Updated user-date styles */
      #user-date { 
        display: flex; 
        align-items: center; 
        justify-content: space-between;
        color: #4c4c4c; 
        padding: 0 3px; 
        margin-bottom: 10px; 
        font-weight: bold;
        flex-wrap: wrap;
        gap: 10px;
      }
      .date-section {
        display: flex;
        align-items: center;
      }
      #user-date .report-date-icon { 
        margin-right: 8px; 
        font-size: 16px; 
      }
      
      /* Export button styles */
      .export-controls-inline {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .export-btn-inline {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .export-btn-inline span {
        margin-right: 4px;
        font-size: 12px;
      }
      .export-btn-inline.export-csv {
        background: #28a745;
        color: white;
      }
      .export-btn-inline.export-csv:hover {
        background: #218838;
      }
      .export-btn-inline.export-excel {
        background: #17a2b8;
        color: white;
      }
      .export-btn-inline.export-excel:hover {
        background: #138496;
      }
      .export-btn-inline.export-pdf {
        background: #dc3545;
        color: white;
      }
      .export-btn-inline.export-pdf:hover {
        background: #c82333;
      }
      
      .table-container {
        background: #fff; border-radius: 6px; box-shadow: 0 1px 6px rgba(0,0,0,0.06);
        margin-top: 10px; max-height: 400px; overflow-y: auto;
      }
      #dsr-table { width: 100%; margin: 0; border-collapse: collapse; font-size: 13px; }
      #dsr-table thead {
        background: linear-gradient(135deg, #343a40 0%, #495057 100%);
        position: sticky; top: 0; z-index: 10;
      }
      #dsr-table th {
        color: white; text-align: center; font-size: 13px; font-weight: 600;
        padding: 10px 6px; border: none; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.3;
      }
      #dsr-table td {
        vertical-align: middle; text-align: center; font-size: 13px; padding: 9px 6px;
        border-top: 1px solid #dee2e6; border-bottom: none; line-height: 1.45;
      }
      /* Sr No column specific styling */
      #dsr-table th:first-child,
      #dsr-table td:first-child {
        width: 60px;
        min-width: 60px;
        text-align: center;
        font-weight: 600;
      }
      .status-badge {
        display: inline-flex; align-items: center; font-size: 12px; font-weight: 500;
        padding: 2px 8px; border-radius: 8px;
      }
      .status-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; display: inline-block; }
      .status-open .status-dot { background: #28a745; }
      .status-open { background: #d4edda; color: #155724; }
      .status-qualified .status-dot { background: #17a2b8; }
      .status-qualified { background: #d1ecf1; color: #0c5460; }
      .status-lost .status-dot { background: #dc3545; }
      .status-lost { background: #f8d7da; color: #721c24; }
      .status-converted .status-dot { background: #007bff; }
      .status-converted { background: #cce7ff; color: #004085; }
      .status-default .status-dot { background: #6c757d; }
      .status-default { background: #e2e3e5; color: #6c757d; }
      .lead-link { color: #007bff; text-decoration: none; font-weight: 600; transition: all 0.15s ease; font-size: 13px; }
      .lead-link:hover { color: #0056b3; text-decoration: underline; }
      .empty-state { text-align: center; padding: 24px 12px; color: #6c757d; font-size: 13px; }
      .loading-spinner { display: flex; justify-content: center; align-items: center; padding: 15px; }
      .spinner { width: 18px; height: 18px; border: 2px solid #f3f3f3; border-top: 2px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      
      @media (max-width: 768px) {
        #user-date { 
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .date-section {
          justify-content: center;
          width: 100%;
          font-size: 12px;
        }
        .export-controls-inline {
          width: 100%;
          justify-content: center;
        }
        .export-btn-inline {
          font-size: 11px;
          padding: 5px 10px;
        }
        #employee-details { grid-template-columns: repeat(2, 1fr); gap: 6px; padding: 10px; }
        #dsr-table th, #dsr-table td { font-size: 12px; padding: 7px 3px; }
        .emp-label, .emp-value { font-size: 12px; }
        .rating-metrics { grid-template-columns: 1fr; }
        
        /* Mobile responsive for criteria section */
        .rating-criteria {
          flex-direction: column;
          gap: 12px;
        }
        .criteria-badges {
          align-items: flex-start;
        }
        .badge-row {
          justify-content: flex-start;
        }
        .badge-label {
          min-width: 70px;
          text-align: left;
        }
      }
    </style>
  `).appendTo(page.body);

  // Include SheetJS library for Excel export
  if (typeof XLSX === "undefined") {
    $("<script>")
      .attr(
        "src",
        "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
      )
      .appendTo("head");
  }

  // Layout (including rating section and export buttons)
  $(`
    <div>
    <div id="user-date">
      <div class="date-section">
        <span class="report-date-icon">📅</span>
        <span>Report Date: ${frappe.datetime.str_to_user(
          frappe.datetime.now_date()
        )}</span>
      </div>
      <div class="export-controls-inline" style="display: none;">
        <button id="export-csv" class="export-btn-inline export-csv">
          <span>📄</span> CSV
        </button>
        <button id="export-excel" class="export-btn-inline export-excel">
          <span>📗</span> Excel
        </button>
        <button id="export-pdf" class="export-btn-inline export-pdf">
          <span>📕</span> PDF
        </button>
      </div>
    </div>
      <div id="employee-details">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <span style="margin-left: 8px; font-size: 13px;">Loading employee details...</span>
        </div>
      </div>
      <div class="rating-section" id="performance-rating" style="display: none;">
        <div class="rating-header">
          <div class="rating-title">
            <span class="icon">⭐</span>
            Rating
          </div>
        </div>
        <div class="rating-metrics">
          <div class="metric-card">
            <div class="metric-label">Total Leads</div>
            <div class="metric-value" id="total-leads">0</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Follow-ups</div>
            <div class="metric-value" id="followup-count">0</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Converted</div>
            <div class="metric-value" id="converted-count">0</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Not Interested</div>
            <div class="metric-value" id="not-interested-count">0</div>
          </div>
        </div>
        <div class="rating-criteria">
          <div class="criteria-content">
            <b>Rating Criteria:</b>
            <ul>
              <li><span class="criteria-good">Good</span>: At least 1 converted.</li>
              <li><span class="criteria-average">Average</span>: At least 4 follow-ups and none converted.</li>
              <li><span class="criteria-bad">Bad</span>: Neither above.</li>
            </ul>
            <b>Qualification Criteria:</b>
            <ul>
              <li><span class="criteria-qualified">Qualified</span>: At least 10 leads.</li>
              <li><span class="criteria-disqualified">Disqualified</span>: Less than 10 leads.</li>
            </ul>
          </div>
          <div class="criteria-badges">
            <div class="badge-row">
              <span class="badge-label">Qualification:</span>
              <span class="rating-badge" id="qualification-badge">-</span>
            </div>
            <div class="badge-row">
              <span class="badge-label">Rating:</span>
              <span class="rating-badge" id="performance-badge">-</span>
            </div>
          </div>
        </div>
      </div>
      <div class="table-container">
        <table id="dsr-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Customer ID</th>
              <th>Customer Name</th>
              <th>Contact</th>
              <th>Source</th>
              <th>Status</th>
              <th>Follow Up Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="7" class="loading-spinner">
                <div class="spinner"></div>
                <span style="margin-left: 8px; font-size: 13px;">Loading leads...</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `).appendTo(page.body);

  // Store data for export
  let employeeData = {};
  let processedLeads = [];
  let currentRating = {};

  // Export Functions
  function exportToCSV(data, employeeData, rating) {
    const csvContent = generateCSVContent(data, employeeData, rating);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `daily_sales_report_${frappe.datetime.now_date()}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    frappe.show_alert({
      message: "CSV report exported successfully!",
      indicator: "green",
    });
  }

  function exportToExcel(data, employeeData, rating) {
    if (typeof XLSX === "undefined") {
      frappe.show_alert({
        message: "Excel library is loading. Please try again in a moment.",
        indicator: "orange",
      });
      return;
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Employee Info Sheet
    const empInfo = [
      ["Daily Sales Report"],
      ["Report Date", frappe.datetime.str_to_user(frappe.datetime.now_date())],
      [""],
      ["Employee Details"],
      ["Employee ID", employeeData.name || "-"],
      ["Employee Name", employeeData.employee_name || "-"],
      ["Designation", employeeData.designation || "-"],
      ["Branch", employeeData.branch || "-"],
      ["Region", employeeData.custom_region || "-"],
      ["Zone", employeeData.custom_zone || "-"],
      [""],
      ["Performance Rating"],
      ["Total Leads", rating.totalLeads],
      ["Follow-ups", rating.leadsWithFollowups],
      ["Converted", rating.convertedLeads],
      ["Not Interested", rating.notInterestedLeads],
      ["Qualification", rating.qualification],
      ["Performance", rating.performance],
    ];

    const empWs = XLSX.utils.aoa_to_sheet(empInfo);
    XLSX.utils.book_append_sheet(wb, empWs, "Employee Info");

    // Leads Data Sheet
    const leadsData = data.map((lead, index) => [
      index + 1, // Sr No
      lead.name,
      lead.lead_name || "-",
      lead.mobile_no || "-",
      lead.source || "-",
      lead.status || "-",
      lead.followup_date || "-",
    ]);

    leadsData.unshift([
      "Sr No",
      "Customer ID",
      "Customer Name",
      "Contact",
      "Source",
      "Status",
      "Follow Up Date",
    ]);

    const leadsWs = XLSX.utils.aoa_to_sheet(leadsData);
    XLSX.utils.book_append_sheet(wb, leadsWs, "Leads Data");

    // Save file
    XLSX.writeFile(wb, `daily_sales_report_${frappe.datetime.now_date()}.xlsx`);

    frappe.show_alert({
      message: "Excel report exported successfully!",
      indicator: "green",
    });
  }

  function exportToPDF(data, employeeData, rating) {
    const printWindow = window.open("", "_blank");
    const pdfContent = generatePDFContent(data, employeeData, rating);

    printWindow.document.write(pdfContent);
    printWindow.document.close();
    printWindow.print();

    frappe.show_alert({
      message: "PDF export initiated!",
      indicator: "blue",
    });
  }

  function generateCSVContent(data, employeeData, rating) {
    let csv = "Daily Sales Report\n";
    csv += `Report Date,${frappe.datetime.str_to_user(
      frappe.datetime.now_date()
    )}\n\n`;

    csv += "Employee Details\n";
    csv += `Employee ID,${employeeData.name || "-"}\n`;
    csv += `Employee Name,${employeeData.employee_name || "-"}\n`;
    csv += `Designation,${employeeData.designation || "-"}\n`;
    csv += `Branch,${employeeData.branch || "-"}\n`;
    csv += `Region,${employeeData.custom_region || "-"}\n`;
    csv += `Zone,${employeeData.custom_zone || "-"}\n\n`;

    csv += "Performance Rating\n";
    csv += `Total Leads,${rating.totalLeads}\n`;
    csv += `Follow-ups,${rating.leadsWithFollowups}\n`;
    csv += `Converted,${rating.convertedLeads}\n`;
    csv += `Not Interested,${rating.notInterestedLeads}\n`;
    csv += `Qualification,${rating.qualification}\n`;
    csv += `Performance,${rating.performance}\n\n`;

    csv += "Leads Data\n";
    csv +=
      "Sr No,Customer ID,Customer Name,Contact,Source,Status,Follow Up Date\n";

    data.forEach((lead, index) => {
      csv += `"${index + 1}","${lead.name}","${lead.lead_name || "-"}","${
        lead.mobile_no || "-"
      }","${lead.source || "-"}","${lead.status || "-"}","${
        lead.followup_date || "-"
      }"\n`;
    });

    return csv;
  }

  function generatePDFContent(data, employeeData, rating) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Sales Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 25px; }
          .section h3 { border-bottom: 2px solid #007bff; padding-bottom: 5px; }
          .info-table, .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .info-table td, .data-table th, .data-table td { 
            border: 1px solid #ddd; padding: 8px; text-align: left; 
          }
          .data-table th { background-color: #f8f9fa; font-weight: bold; }
          .data-table th:first-child, .data-table td:first-child { 
            width: 60px; text-align: center; font-weight: bold; 
          }
          .rating-section { background: #f8f9fa; padding: 15px; border-radius: 5px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Daily Sales Report</h1>
          <p><strong>Report Date:</strong> ${frappe.datetime.str_to_user(
            frappe.datetime.now_date()
          )}</p>
        </div>
        
        <div class="section">
          <h3>Employee Details</h3>
          <table class="info-table">
            <tr><td><strong>Employee ID:</strong></td><td>${
              employeeData.name || "-"
            }</td></tr>
            <tr><td><strong>Employee Name:</strong></td><td>${
              employeeData.employee_name || "-"
            }</td></tr>
            <tr><td><strong>Designation:</strong></td><td>${
              employeeData.designation || "-"
            }</td></tr>
            <tr><td><strong>Branch:</strong></td><td>${
              employeeData.branch || "-"
            }</td></tr>
            <tr><td><strong>Region:</strong></td><td>${
              employeeData.custom_region || "-"
            }</td></tr>
            <tr><td><strong>Zone:</strong></td><td>${
              employeeData.custom_zone || "-"
            }</td></tr>
          </table>
        </div>
        
        <div class="section">
          <h3>Performance Rating</h3>
          <div class="rating-section">
            <p><strong>Qualification:</strong> ${
              rating.qualification
            } | <strong>Performance:</strong> ${rating.performance}</p>
            <table class="info-table">
              <tr>
                <td><strong>Total Leads:</strong> ${rating.totalLeads}</td>
                <td><strong>Follow-ups:</strong> ${
                  rating.leadsWithFollowups
                }</td>
              </tr>
              <tr>
                <td><strong>Converted:</strong> ${rating.convertedLeads}</td>
                <td><strong>Not Interested:</strong> ${
                  rating.notInterestedLeads
                }</td>
              </tr>
            </table>
          </div>
        </div>
        
        <div class="section">
          <h3>Leads Data</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Sr No</th>
                <th>Customer ID</th>
                <th>Customer Name</th>
                <th>Contact</th>
                <th>Source</th>
                <th>Status</th>
                <th>Follow Up Date</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (lead, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${lead.name}</td>
                  <td>${lead.lead_name || "-"}</td>
                  <td>${lead.mobile_no || "-"}</td>
                  <td>${lead.source || "-"}</td>
                  <td>${lead.status || "-"}</td>
                  <td>${lead.followup_date || "-"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
  }

  // Status badge helper
  function getStatusBadge(status) {
    let className = "status-default";
    switch ((status || "").toLowerCase()) {
      case "open":
        className = "status-open";
        break;
      case "qualified":
        className = "status-qualified";
        break;
      case "lost":
        className = "status-lost";
        break;
      case "converted":
        className = "status-converted";
        break;
    }
    return `<span class="status-badge ${className}"><span class="status-dot"></span>${
      status || "-"
    }</span>`;
  }

  function calculateRating(leads) {
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(
      (l) => (l.status || "").toLowerCase() === "converted"
    ).length;
    const notInterestedLeads = leads.filter(
      (l) => (l.status || "").toLowerCase() === "not interested"
    ).length;
    const leadsWithFollowups = leads.filter(
      (l) => l.followup_date && l.followup_date !== "-"
    ).length;

    const qualification = totalLeads >= 10 ? "Qualified" : "Disqualified";
    const qualificationClass =
      totalLeads >= 10 ? "rating-qualified" : "rating-disqualified";

    // Rating Logic
    let performance = "Bad";
    let performanceClass = "rating-bad";
    if (convertedLeads >= 1) {
      performance = "Good";
      performanceClass = "rating-good";
    } else if (leadsWithFollowups >= 4) {
      performance = "Average";
      performanceClass = "rating-average";
    }
    return {
      totalLeads,
      convertedLeads,
      notInterestedLeads,
      leadsWithFollowups,
      qualification,
      qualificationClass,
      performance,
      performanceClass,
    };
  }

  function updateRatingDisplay(rating) {
    $("#total-leads").text(rating.totalLeads);
    $("#followup-count").text(rating.leadsWithFollowups);
    $("#converted-count").text(rating.convertedLeads);
    $("#not-interested-count").text(rating.notInterestedLeads);

    $("#qualification-badge")
      .removeClass("rating-qualified rating-disqualified")
      .addClass(rating.qualificationClass)
      .text(rating.qualification);

    $("#performance-badge")
      .removeClass("rating-good rating-average rating-bad")
      .addClass(rating.performanceClass)
      .text(rating.performance);

    $("#performance-rating").show();
  }

  // Fetch employee details (including employee ID)
  frappe.db
    .get_value("Employee", { user_id: frappe.session.user }, [
      "name",
      "employee_name",
      "branch",
      "designation",
      "custom_zone",
      "custom_region",
    ])
    .then((r) => {
      if (r.message) {
        let emp = r.message;
        employeeData = emp; // Store for export
        $("#employee-details").html(`
        <div class="emp-field"><span class="emp-label">Employee ID</span>
    <div class="emp-value">${emp.name || "-"}</div></div>
        <div class="emp-field"><span class="emp-label employee">Employee</span>
    <div class="emp-value">${emp.employee_name || "-"}</div></div>
        <div class="emp-field"><span class="emp-label designation">Designation</span><div class="emp-value">${
          emp.designation || "-"
        }</div></div>
        <div class="emp-field"><span class="emp-label branch">Branch</span><div class="emp-value">${
          emp.branch || "-"
        }</div></div>
      
        <div class="emp-field"><span class="emp-label region">Region</span><div class="emp-value">${
          emp.custom_region || "-"
        }</div></div>
          <div class="emp-field"><span class="emp-label zone">Zone</span><div class="emp-value">${
            emp.custom_zone || "-"
          }</div></div>
      `);
      } else {
        $("#employee-details").html(
          '<div class="empty-state">👤 Employee details not found</div>'
        );
      }
    })
    .catch(() => {
      $("#employee-details").html(
        '<div class="empty-state">❌ Error loading employee details</div>'
      );
    });

  async function getFollowupDate(lead_name) {
    let appts = await frappe.db.get_list("Appointment", {
      filters: {
        party: lead_name,
        appointment_with: "Lead",
        status: ["!=", "Cancelled"],
        scheduled_time: [">=", frappe.datetime.now_date()],
      },
      fields: ["scheduled_time"],
      order_by: "scheduled_time asc",
      limit: 1,
    });
    return appts.length
      ? frappe.datetime.str_to_user(appts[0].scheduled_time)
      : "-";
  }

  let leads = await frappe.db.get_list("Lead", {
    filters: {
      owner: frappe.session.user,
      creation: [">=", frappe.datetime.now_date()],
      docstatus: 0,
    },
    fields: [
      "name",
      "lead_name",
      "mobile_no",
      "source",
      "request_type",
      "status",
      "lead_owner",
      "creation",
    ],
    order_by: "creation desc",
    limit: 100,
  });

  // PRE-FETCH: all followup appointments in a single bulk query
  const followupMap = {};
  if (leads.length > 0) {
    const leadNames = leads.map((l) => l.name);
    const appts = await frappe.db.get_list("Appointment", {
      filters: {
        party: ["in", leadNames],
        appointment_with: "Lead",
        status: ["!=", "Cancelled"],
        scheduled_time: [">=", frappe.datetime.now_date()],
      },
      fields: ["party", "scheduled_time"],
      order_by: "scheduled_time asc",
      limit: leadNames.length * 5,
    });
    for (const appt of appts) {
      // Keep only earliest appointment per lead (already sorted asc)
      if (!followupMap[appt.party]) {
        followupMap[appt.party] = frappe.datetime.str_to_user(appt.scheduled_time);
      }
    }
  }

  let rows = "";

  for (let index = 0; index < leads.length; index++) {
    const l = leads[index];
    const followup = followupMap[l.name] || "-";
    processedLeads.push({
      ...l,
      followup_date: followup,
    });

    rows += `<tr>
      <td style="font-weight: 600; color: #495057;">${index + 1}</td>
      <td>${l.name}</td>
      <td><strong style="font-size: 13px;">${l.lead_name || "-"}</strong></td>
      <td style="font-size: 13px;">${l.mobile_no || "-"}</td>
      <td style="font-size: 13px;">${l.source || "-"}</td>
      <td>${getStatusBadge(l.status)}</td>
      <td style="font-size: 13px; color: #007bff; font-weight: 600;">${followup}</td>
    </tr>`;
  }

  $("#dsr-table tbody").html(
    rows ||
      `<tr><td colspan="7" class="empty-state"><i>📭</i>No leads found for today</td></tr>`
  );

  if (processedLeads.length > 0) {
    const rating = calculateRating(processedLeads);
    currentRating = rating; // Store for export
    updateRatingDisplay(rating);
    $(".export-controls-inline").show(); // Show export controls
  } else {
    currentRating = {
      totalLeads: 0,
      convertedLeads: 0,
      notInterestedLeads: 0,
      leadsWithFollowups: 0,
      qualification: "Disqualified",
      qualificationClass: "rating-disqualified",
      performance: "Bad",
      performanceClass: "rating-bad",
    };
    updateRatingDisplay(currentRating);
    $(".export-controls-inline").show(); // Show export controls even with no data
  }

  // Add event listeners for export buttons
  $("#export-csv").on("click", function () {
    exportToCSV(processedLeads, employeeData, currentRating);
  });

  $("#export-excel").on("click", function () {
    exportToExcel(processedLeads, employeeData, currentRating);
  });

  $("#export-pdf").on("click", function () {
    exportToPDF(processedLeads, employeeData, currentRating);
  });
};
