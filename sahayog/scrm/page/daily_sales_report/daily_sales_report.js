frappe.pages["daily-sales-report"].on_page_load = async function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Daily Sales Report",
    single_column: true,
  });

  // Improved Custom Styles (including rating styles)
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
        margin: 15px 0; padding: 16px; border-left: 4px solid #007bff;
      }
      .rating-header {
        font-size: 16px; font-weight: 700; color: #212529; margin-bottom: 12px;
        display: flex; align-items: center;
      }
      .rating-header .icon { margin-right: 8px; font-size: 18px; }
      .rating-metrics {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px; margin-bottom: 15px;
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
      
      #user-date { display: flex; align-items: center; color: #4c4c4c; padding: 0 3px; margin-bottom: 10px; font-weight: bold; }
      #user-date .report-date-icon { margin-right: 8px; font-size: 16px; }
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
        #user-date { justify-content: center; font-size: 12px; }
        #employee-details { grid-template-columns: repeat(2, 1fr); gap: 6px; padding: 10px; }
        #dsr-table th, #dsr-table td { font-size: 12px; padding: 7px 3px; }
        .emp-label, .emp-value { font-size: 12px; }
        .rating-metrics { grid-template-columns: 1fr; }
      }
    </style>
  `).appendTo(page.body);

  // Layout (including rating section)
  $(`
    <div>
      <div id="user-date">
        <span class="report-date-icon">📅</span>
        <span>Report Date: ${frappe.datetime.str_to_user(
          frappe.datetime.now_date()
        )}</span>
      </div>
      <div id="employee-details">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <span style="margin-left: 8px; font-size: 13px;">Loading employee details...</span>
        </div>
      </div>
      
      <!-- Rating Section -->
      <div class="rating-section" id="performance-rating" style="display: none;">
        <div class="rating-header">
          <span class="icon">⭐</span>
          Performance Rating
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
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <div>
            <strong>Qualification:</strong>
            <span class="rating-badge" id="qualification-badge">-</span>
          </div>
          <div>
            <strong>Performance:</strong>
            <span class="rating-badge" id="performance-badge">-</span>
          </div>
        </div>
      </div>

      <div class="table-container">
        <table id="dsr-table">
          <thead>
            <tr>
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
              <td colspan="6" class="loading-spinner">
                <div class="spinner"></div>
                <span style="margin-left: 8px; font-size: 13px;">Loading leads...</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `).appendTo(page.body);

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

  // Rating calculation function
  function calculateRating(leads) {
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(
      (l) => (l.status || "").toLowerCase() === "converted"
    ).length;
    const notInterestedLeads = leads.filter(
      (l) => (l.status || "").toLowerCase() === "not interested"
    ).length;

    // Count leads with follow-ups (you may need to adjust this based on your actual followup logic)
    const leadsWithFollowups = leads.filter(
      (l) => l.followup_date && l.followup_date !== "-"
    ).length;

    // 1. Qualification Logic: Minimum 10 leads → Qualified, otherwise Disqualified
    const qualification = totalLeads >= 10 ? "Qualified" : "Disqualified";
    const qualificationClass =
      totalLeads >= 10 ? "rating-qualified" : "rating-disqualified";

    // 2. Performance Rating Logic
    let performance = "Average";
    let performanceClass = "rating-average";

    if (convertedLeads >= 1) {
      // At least 1 lead converted → Good
      performance = "Good";
      performanceClass = "rating-good";
    } else if (totalLeads > 0 && notInterestedLeads === totalLeads) {
      // All leads are "Not Interested" → Bad
      performance = "Bad";
      performanceClass = "rating-bad";
    } else if (leadsWithFollowups >= 4) {
      // At least 4 follow-ups → Average (this is already the default)
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

  // Update rating display
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

  // Fetch employee details
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
        $("#employee-details").html(`
        <div class="emp-field"><span class="emp-label employee">Employee</span>
    <div class="emp-value">${emp.employee_name || "-"}</div></div>
        <div class="emp-field"><span class="emp-label designation">Designation</span><div class="emp-value">${
          emp.designation || "-"
        }</div></div>
        <div class="emp-field"><span class="emp-label branch">Branch</span><div class="emp-value">${
          emp.branch || "-"
        }</div></div>
        <div class="emp-field"><span class="emp-label zone">Zone</span><div class="emp-value">${
          emp.custom_zone || "-"
        }</div></div>
        <div class="emp-field"><span class="emp-label region">Region</span><div class="emp-value">${
          emp.custom_region || "-"
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

  // Helper: get lead's next followup appointment date
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

  // Fetch Leads and render table (async per-lead for followup date)
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

  // Process leads with followup dates and calculate rating
  let processedLeads = [];
  let rows = "";

  for (const l of leads) {
    let followup = await getFollowupDate(l.name);
    processedLeads.push({
      ...l,
      followup_date: followup,
    });

    rows += `<tr>
      <td>${l.name}</td>
      <td><strong style="font-size: 13px;">${l.lead_name || "-"}</strong></td>
      <td style="font-size: 13px;">${l.mobile_no || "-"}</td>
      <td style="font-size: 13px;">${l.source || "-"}</td>
      <td>${getStatusBadge(l.status)}</td>
      <td style="font-size: 13px; color: #007bff; font-weight: 600;">${followup}</td>
    </tr>`;
  }

  // Update table
  $("#dsr-table tbody").html(
    rows ||
      `<tr><td colspan="6" class="empty-state"><i>📭</i>No leads found for today</td></tr>`
  );

  // Calculate and display rating
  if (processedLeads.length > 0) {
    const rating = calculateRating(processedLeads);
    updateRatingDisplay(rating);
  } else {
    // Show rating section even with no leads
    updateRatingDisplay({
      totalLeads: 0,
      convertedLeads: 0,
      notInterestedLeads: 0,
      leadsWithFollowups: 0,
      qualification: "Disqualified",
      qualificationClass: "rating-disqualified",
      performance: "Bad",
      performanceClass: "rating-bad",
    });
  }
};
