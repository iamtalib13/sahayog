frappe.pages["dsr-master-report"].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "DSR Master Report",
    single_column: true,
  });

  // Complete CSS styles (same as before)
  $(`
    <style>
      .dsr-master-content {
        padding: 20px;
        background: #f8f9fa;
        min-height: calc(100vh - 200px);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .filter-section {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 20px;
        border: 1px solid #e3e6f0;
      }
      
      .filter-row {
        display: flex;
        gap: 20px;
        align-items: end;
        flex-wrap: wrap;
        margin-bottom: 15px;
      }
      
      .filter-group {
        flex: 1;
        min-width: 200px;
      }
      
      .filter-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 600;
        color: #555;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .table-section {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        overflow: hidden;
        border: 1px solid #e3e6f0;
      }
      
      .table-header {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding: 15px 20px;
        border-bottom: 2px solid #dee2e6;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .table-title {
        font-size: 18px;
        font-weight: 700;
        color: #2c3e50;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .btn-custom {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-left: 8px;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .btn-primary {
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        color: white;
      }
      
      .btn-primary:hover {
        background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,123,255,0.3);
      }
      
      .btn-success {
        background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
        color: white;
      }
      
      .btn-success:hover {
        background: linear-gradient(135deg, #1e7e34 0%, #155724 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(40,167,69,0.3);
      }
      
      .loading-spinner {
        text-align: center;
        padding: 50px 20px;
        color: #6c757d;
        background: white;
        border-radius: 8px;
      }
      
      .loading-spinner i {
        font-size: 32px;
        color: #007bff;
        margin-bottom: 15px;
      }
      
      .no-data {
        text-align: center;
        padding: 60px 20px;
        color: #6c757d;
        background: white;
        border-radius: 8px;
      }
      
      .no-data i {
        font-size: 48px;
        margin-bottom: 20px;
        opacity: 0.6;
      }
      
      #master-dsr-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        font-family: 'Inter', sans-serif;
      }
      
      #master-dsr-table thead tr:first-child th {
        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
        color: white;
        text-align: center;
        font-size: 12px;
        font-weight: 700;
        padding: 12px 8px;
        border: 1px solid #34495e;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }
      
      #master-dsr-table thead tr:last-child th {
        background: linear-gradient(135deg, #343a40 0%, #495057 100%);
        color: white;
        text-align: center;
        font-size: 11px;
        font-weight: 600;
        padding: 10px 6px;
        border: 1px solid #495057;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
      }
      
      #master-dsr-table th:first-child,
      #master-dsr-table td:first-child {
        width: 50px;
        text-align: center;
      }
      
      #master-dsr-table td {
        vertical-align: middle;
        text-align: center;
        font-size: 13px;
        padding: 12px 8px;
        border: 1px solid #dee2e6;
        transition: background-color 0.2s ease;
      }
      
      #master-dsr-table tbody tr:hover {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        transform: scale(1.001);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      #master-dsr-table tbody tr:nth-child(even) {
        background: #f8f9fa;
      }
      
      .sr-no {
        font-weight: 700;
        color: #495057;
        background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 11px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      
      .metric-badge {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        min-width: 30px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
      }
      
      .metric-badge:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }
      
      .qualified-bg { 
        background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); 
        color: #155724; 
        border: 1px solid #c3e6cb;
      }
      
      .disqualified-bg { 
        background: linear-gradient(135deg, #f8d7da 0%, #f1b0b7 100%); 
        color: #721c24; 
        border: 1px solid #f1b0b7;
      }
      
      .good-bg { 
        background: linear-gradient(135deg, #cce7ff 0%, #99d6ff 100%); 
        color: #004085; 
        border: 1px solid #99d6ff;
      }
      
      .average-bg { 
        background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); 
        color: #856404; 
        border: 1px solid #ffeaa7;
      }
      
      .bad-bg { 
        background: linear-gradient(135deg, #f8d7da 0%, #f1b0b7 100%); 
        color: #721c24; 
        border: 1px solid #f1b0b7;
      }
      
      .summary-info {
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 13px;
        color: #1565c0;
        border: 1px solid #90caf9;
        font-weight: 500;
        box-shadow: 0 2px 4px rgba(33,150,243,0.1);
      }
      
      .summary-info strong {
        color: #0d47a1;
        font-weight: 700;
      }
      
      .working-days-info {
        font-size: 11px;
        color: #6c757d;
        font-weight: 500;
        background: #f8f9fa;
        padding: 2px 6px;
        border-radius: 3px;
        border: 1px solid #dee2e6;
      }
      
      .employee-name-cell {
        text-align: left !important;
        font-weight: 600;
        color: #2c3e50;
      }
      
      .branch-cell {
        font-weight: 600;
        color: #495057;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 12px;
      }
      
      .total-leads-cell {
        font-weight: 700;
        color: #2c3e50;
        font-size: 14px;
      }
      
      .progress-bar {
        width: 100%;
        height: 6px;
        background: #e9ecef;
        border-radius: 3px;
        margin: 10px 0;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #007bff, #0056b3);
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      
      @media (max-width: 1200px) {
        .filter-row {
          flex-direction: column;
          gap: 15px;
        }
        
        .filter-group {
          min-width: 100%;
        }
      }
      
      @media (max-width: 768px) {
        .dsr-master-content {
          padding: 10px;
        }
        
        .table-header {
          flex-direction: column;
          gap: 10px;
          text-align: center;
        }
        
        #master-dsr-table thead tr:first-child th,
        #master-dsr-table thead tr:last-child th,
        #master-dsr-table td {
          font-size: 10px;
          padding: 6px 4px;
        }
        
        #master-dsr-table th:first-child,
        #master-dsr-table td:first-child {
          width: 30px;
        }
        
        .metric-badge {
          padding: 4px 6px;
          font-size: 10px;
          min-width: 20px;
        }
        
        .sr-no {
          padding: 2px 6px;
          font-size: 10px;
        }
      }
    </style>
  `).appendTo(page.body);

  // Function to get current date in YYYY-MM-DD format
  function getCurrentDate() {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }

  // Add filters: Start Date and End Date
  page.add_field({
    fieldname: "start_date",
    label: __("Start Date"),
    fieldtype: "Date",
    default: getCurrentDate(),
    change: () => loadMasterDSRDataOptimized(),
  });

  page.add_field({
    fieldname: "end_date",
    label: __("End Date"),
    fieldtype: "Date",
    default: getCurrentDate(),
    read_only: 1,
    change: () => loadMasterDSRDataOptimized(),
  });

  page.add_field({
    fieldname: "branch_filter",
    label: __("Branch"),
    fieldtype: "Link",
    options: "Branch",
    change: () => loadMasterDSRDataOptimized(),
  });

  // Add action buttons
  page.set_primary_action(
    "📊 Generate Report",
    () => loadMasterDSRDataOptimized(),
    "fa fa-chart-bar"
  );
  page.add_inner_button(
    "📥 Export Excel",
    () => exportToExcel(),
    "fa fa-download"
  );
  page.add_inner_button(
    "🔄 Clear Filters",
    () => clearFilters(),
    "fa fa-refresh"
  );

  // Setup content area
  const content_area = $(`
    <div class="dsr-master-content">
      <div class="summary-info" id="period-summary" style="display: none;"></div>
      <div class="table-section">
        <div class="table-header">
          <h3 class="table-title">📈 DSR Master Report (Optimized)</h3>
          <div class="table-actions">
            <span id="report-date" style="font-size: 12px; color: #6c757d; font-weight: 500;">
              📅 Report Generated: ${frappe.datetime.str_to_user(
                frappe.datetime.now_date()
              )}
            </span>
          </div>
        </div>
        <div class="master-table-container">
          <div class="loading-spinner">
            <i class="fa fa-spinner fa-spin"></i>
            <h4 style="margin: 10px 0 5px 0; color: #495057;">Loading DSR Master Data</h4>
            <div class="progress-bar">
              <div class="progress-fill" style="width: 0%"></div>
            </div>
            <p style="margin: 5px 0; font-size: 12px;">Initializing...</p>
          </div>
        </div>
      </div>
    </div>
  `).appendTo(page.body);

  // OPTIMIZED: Store data with proper deduplication
  let masterData = [];
  let employeeDataMap = {}; // Map to prevent duplicate employees

  // OPTIMIZED: Helper function to generate consistent date range
  function generateDateRangeFromDates(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]); // YYYY-MM-DD
      current.setDate(current.getDate() + 1);
    }

    return {
      dates,
      startDate: start,
      endDate: end,
      totalDays: dates.length,
    };
  }

  // Function to get filters for leads
  function getLeadFilters() {
    const filters = { docstatus: 0 };

    const startDate = page.fields_dict.start_date.get_value();
    const endDate = page.fields_dict.end_date.get_value();

    if (startDate && endDate) {
      filters.creation = ["between", [startDate, endDate]];
    } else if (startDate) {
      filters.creation = [">=", startDate];
    }

    const branchFilter = page.fields_dict.branch_filter.get_value();
    if (branchFilter) {
      filters.custom_branch = branchFilter;
    }

    return filters;
  }

  // OPTIMIZED: Enhanced loading with progress tracking
  function showLoadingWithProgress(message, progress = 0) {
    $(".loading-spinner h4").text(message);
    $(".progress-fill").css("width", `${progress}%`);
    $(".loading-spinner p").text(`${progress}% complete...`);
  }

  function showLoading(message = "Processing Data...") {
    $(".master-table-container").html(`
      <div class="loading-spinner">
        <i class="fa fa-spinner fa-spin"></i>
        <h4 style="margin: 10px 0 5px 0; color: #495057;">${message}</h4>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <p style="margin: 5px 0; font-size: 12px;">Starting...</p>
      </div>
    `);
  }

  // Function to calculate DAILY rating
  function calculateDailyRating(dailyLeads) {
    const totalLeads = dailyLeads.length;

    if (totalLeads === 0) {
      return {
        totalLeads: 0,
        convertedLeads: 0,
        leadsWithFollowups: 0,
        qualification: "Disqualified",
        performance: "Bad",
      };
    }

    const convertedLeads = dailyLeads.filter(
      (l) => (l.status || "").toLowerCase() === "converted"
    ).length;
    const leadsWithFollowups = dailyLeads.filter((l) => l.has_followup).length;

    const qualification = totalLeads >= 10 ? "Qualified" : "Disqualified";

    let performance = "Bad";
    if (convertedLeads >= 1) {
      performance = "Good";
    } else if (leadsWithFollowups >= 4) {
      performance = "Average";
    }

    return {
      totalLeads,
      convertedLeads,
      leadsWithFollowups,
      qualification,
      performance,
    };
  }

  // OPTIMIZED: Batch appointment checking for better performance
  async function checkFollowupAppointmentsBatch(allLeadNames) {
    if (allLeadNames.length === 0) return {};

    try {
      showLoadingWithProgress("Fetching appointment data...", 15);

      const appointments = await frappe.db.get_list("Appointment", {
        filters: {
          party: ["in", allLeadNames],
          appointment_with: "Lead",
          status: ["!=", "Cancelled"],
        },
        fields: ["party"],
        limit: 10000, // Increased limit for large datasets
      });

      const followupMap = {};
      appointments.forEach((apt) => {
        followupMap[apt.party] = true;
      });

      console.log(
        `✅ Fetched ${appointments.length} appointments for ${allLeadNames.length} leads`
      );
      return followupMap;
    } catch (error) {
      console.log("Batch appointment check failed:", error);
      return {};
    }
  }

  // OPTIMIZED: Main function with batch processing and deduplication
  async function loadMasterDSRDataOptimized() {
    console.log("=== Starting OPTIMIZED DSR Master Data Load ===");
    showLoading("Initializing data load...");

    try {
      // RESET: Clear data structures completely
      masterData = [];
      employeeDataMap = {}; // Clear the map to prevent duplicates

      const leadFilters = getLeadFilters();
      const startDate = page.fields_dict.start_date.get_value();
      const endDate = page.fields_dict.end_date.get_value() || getCurrentDate();

      if (!startDate) {
        renderError("Please select a start date.");
        return;
      }

      const { dates: allDatesInPeriod, totalDays } = generateDateRangeFromDates(
        startDate,
        endDate
      );

      console.log("1. Date Range:", { startDate, endDate, totalDays });
      showLoadingWithProgress("Fetching leads data...", 5);

      updatePeriodSummary(startDate, endDate, totalDays);

      // OPTIMIZED: Increased limit and better field selection
      const allLeads = await frappe.db.get_list("Lead", {
        filters: leadFilters,
        fields: ["name", "lead_owner", "status", "creation", "custom_branch"],
        limit: 10000, // Increased from 1000 to handle larger datasets
        order_by: "creation desc",
      });

      console.log("2. All Leads found:", allLeads.length);
      showLoadingWithProgress("Processing leads data...", 10);

      if (allLeads.length === 0) {
        renderNoData(`No leads found for the selected date range`);
        return;
      }

      const leadsWithOwners = allLeads.filter((lead) => lead.lead_owner);
      const uniqueLeadOwners = [
        ...new Set(leadsWithOwners.map((lead) => lead.lead_owner)),
      ];

      console.log("3. Unique Lead Owners:", uniqueLeadOwners.length);

      if (uniqueLeadOwners.length === 0) {
        renderNoData("No leads found with assigned owners");
        return;
      }

      const branchFilter = page.fields_dict.branch_filter.get_value();
      const employeeFilters = {
        user_id: ["in", uniqueLeadOwners],
      };

      if (branchFilter) {
        employeeFilters.branch = branchFilter;
      }

      const employees = await frappe.db.get_list("Employee", {
        filters: employeeFilters,
        fields: ["name", "employee_name", "branch", "user_id"],
        limit: 1000,
      });

      console.log("4. Employees found:", employees.length);

      if (employees.length === 0) {
        renderNoData("No employees found matching criteria");
        return;
      }

      // OPTIMIZED: Batch fetch all appointments at once
      const allLeadNames = allLeads.map((l) => l.name);
      const globalFollowupMap = await checkFollowupAppointmentsBatch(
        allLeadNames
      );

      // OPTIMIZED: Process employees with progress tracking and deduplication
      let processedCount = 0;
      const totalEmployees = employees.length;

      for (let i = 0; i < employees.length; i++) {
        const employee = employees[i];

        // DEDUPLICATION: Skip if employee already processed
        if (employeeDataMap[employee.name]) {
          console.log(`⚠️ Skipping duplicate employee: ${employee.name}`);
          continue;
        }

        processedCount++;
        const progress = Math.round(
          20 + (processedCount / totalEmployees) * 70
        ); // 20-90% range

        console.log(
          `5. Processing employee ${processedCount}/${totalEmployees}: ${employee.name} (${employee.user_id})`
        );

        showLoadingWithProgress(
          `Processing ${processedCount}/${totalEmployees} employees`,
          progress
        );

        const employeeLeads = allLeads.filter(
          (lead) => lead.lead_owner === employee.user_id
        );

        // OPTIMIZED: Use pre-fetched followup data instead of individual queries
        employeeLeads.forEach((lead) => {
          lead.has_followup = !!globalFollowupMap[lead.name];
        });

        // FIXED: Group leads by date using consistent ISO format
        const leadsByDate = {};
        employeeLeads.forEach((lead) => {
          const dateObj = new Date(lead.creation);
          const dateKey = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD

          if (!leadsByDate[dateKey]) {
            leadsByDate[dateKey] = [];
          }
          leadsByDate[dateKey].push(lead);
        });

        const workingDays = Object.keys(leadsByDate).length;

        // Initialize counters
        let qualifiedDays = 0;
        let disqualifiedDays = 0;
        let goodRatingDays = 0;
        let averageRatingDays = 0;
        let badRatingDays = 0;
        let totalLeads = employeeLeads.length;

        // Process every day in the period
        for (const dateKey of allDatesInPeriod) {
          const dailyLeads = leadsByDate[dateKey] || [];
          const dailyRating = calculateDailyRating(dailyLeads);

          // Accumulate ratings (exactly once per day)
          if (dailyRating.qualification === "Qualified") {
            qualifiedDays += 1;
          } else {
            disqualifiedDays += 1;
          }

          if (dailyRating.performance === "Good") {
            goodRatingDays += 1;
          } else if (dailyRating.performance === "Average") {
            averageRatingDays += 1;
          } else {
            badRatingDays += 1;
          }
        }

        // VERIFICATION: Check totals (must equal period days)
        const totalQualificationDays = qualifiedDays + disqualifiedDays;
        const totalRatingDays =
          goodRatingDays + averageRatingDays + badRatingDays;

        if (
          totalQualificationDays !== totalDays ||
          totalRatingDays !== totalDays
        ) {
          console.error(
            `❌ Count mismatch for ${employee.name}: Q+D=${totalQualificationDays}, G+A+B=${totalRatingDays}, Expected=${totalDays}`
          );
        } else {
          console.log(
            `✅ Verified counts for ${employee.name}: All totals = ${totalDays} days`
          );
        }

        // FIXED: Store in Map to prevent duplicates
        employeeDataMap[employee.name] = {
          branch: employee.branch || "-",
          employee_code: employee.name,
          employee_name: employee.employee_name || "-",
          qualified: qualifiedDays,
          disqualified: disqualifiedDays,
          bad_rating: badRatingDays,
          average_rating: averageRatingDays,
          good_rating: goodRatingDays,
          total_leads: totalLeads,
          working_days: workingDays,
          total_days: allDatesInPeriod.length,
        };
      }

      // FIXED: Convert Map to Array (ensures unique employees)
      masterData = Object.values(employeeDataMap);

      showLoadingWithProgress("Rendering report...", 95);

      console.log(
        "6. Final masterData (NO DUPLICATES):",
        masterData.length,
        "unique employees"
      );

      // Small delay to show completion
      setTimeout(() => {
        renderMasterTable(masterData);
      }, 500);
    } catch (error) {
      console.error("Error loading DSR master data:", error);
      renderError(`Error loading data: ${error.message}`);
    }
  }

  function updatePeriodSummary(startDate, endDate, totalDays) {
    const startDateFormatted = frappe.datetime.str_to_user(startDate);
    const endDateFormatted = frappe.datetime.str_to_user(endDate);
    const branchText = page.fields_dict.branch_filter.get_value()
      ? ` | Branch: ${page.fields_dict.branch_filter.get_value()}`
      : " | All Branches";

    $("#period-summary")
      .html(
        `
        <strong>📅 Period:</strong> ${startDateFormatted} to ${endDateFormatted} (${totalDays} days)${branchText} | 
        <strong>📋 Note:</strong> All ${totalDays} days are included in calculations. 
        Non-working days (0 leads) count as Disqualified + Bad rating. | 
        <strong>⚡ Optimized:</strong> Batch processing enabled for large datasets.
      `
      )
      .show();
  }

  // FIXED: Function to render master table with proper clearing
  function renderMasterTable(data) {
    console.log("=== renderMasterTable called ===");

    // FIXED: Always clear container FIRST to prevent duplicates in DOM
    $(".master-table-container").empty();

    if (data.length === 0) {
      renderNoData("No employee data found");
      return;
    }

    let tableHTML = `
      <table id="master-dsr-table">
        <thead>
          <tr>
            <th rowspan="2">Sr.<br>No.</th>
            <th rowspan="2">Branch</th>
            <th rowspan="2">Employee<br>Code</th>
            <th rowspan="2">Employee Name</th>
            <th colspan="2">📊 QUALIFICATION</th>
            <th colspan="3">⭐ RATING</th>
            <th rowspan="2">Total<br>Leads</th>
            <th rowspan="2">Working<br>Days</th>
          </tr>
          <tr>
            <th>No. of<br>Qualified</th>
            <th>No. of<br>Disqualified</th>
            <th>No. of<br>Bad</th>
            <th>No. of<br>Average</th>
            <th>No. of<br>Good</th>
          </tr>
        </thead>
        <tbody>
    `;

    const sortedData = data.sort((a, b) => b.total_leads - a.total_leads);

    sortedData.forEach((row, index) => {
      tableHTML += `
        <tr>
          <td><span class="sr-no">${index + 1}</span></td>
          <td class="branch-cell">${row.branch}</td>
          <td style="font-family: monospace; font-weight: 600;">${
            row.employee_code
          }</td>
          <td class="employee-name-cell">${row.employee_name}</td>
          <td><span class="metric-badge qualified-bg">${
            row.qualified
          }</span></td>
          <td><span class="metric-badge disqualified-bg">${
            row.disqualified
          }</span></td>
          <td><span class="metric-badge bad-bg">${row.bad_rating}</span></td>
          <td><span class="metric-badge average-bg">${
            row.average_rating
          }</span></td>
          <td><span class="metric-badge good-bg">${row.good_rating}</span></td>
          <td class="total-leads-cell">${row.total_leads}</td>
          <td><span class="working-days-info">${row.working_days}/${
        row.total_days
      }</span></td>
        </tr>
      `;
    });

    tableHTML += `</tbody></table>`;
    $(".master-table-container").html(tableHTML);

    showDataSummary(sortedData);
    console.log(
      "✅ Table rendered successfully with",
      sortedData.length,
      "UNIQUE employees (NO DUPLICATES)"
    );
  }

  function showDataSummary(data) {
    const totalEmployees = data.length;
    const totalLeads = data.reduce((sum, emp) => sum + emp.total_leads, 0);
    const avgLeadsPerEmployee = Math.round(totalLeads / totalEmployees);
    const topPerformer = data[0];

    const summaryHTML = `
      <div style="background: #f8f9fa; padding: 10px; margin-top: 15px; border-radius: 6px; font-size: 12px; color: #495057;">
        <strong>📊 Summary:</strong> 
        ${totalEmployees} UNIQUE employees | 
        ${totalLeads} total leads | 
        ~${avgLeadsPerEmployee} leads per employee | 
        Top: ${topPerformer.employee_name} (${topPerformer.total_leads} leads) |
        <strong>⚡ Performance:</strong> Optimized for large datasets
      </div>
    `;

    $(".master-table-container").append(summaryHTML);
  }

  function renderNoData(message) {
    $(".master-table-container").html(`
      <div class="no-data">
        <i class="fa fa-chart-bar"></i>
        <h4 style="margin: 15px 0 10px 0; color: #495057;">No Data Found</h4>
        <p style="margin: 0 0 15px 0;">${message}</p>
      </div>
    `);
  }

  function renderError(message) {
    $(".master-table-container").html(`
      <div class="no-data">
        <i class="fa fa-exclamation-triangle" style="color: #dc3545;"></i>
        <h4 style="margin: 15px 0 10px 0; color: #dc3545;">Error Loading Data</h4>
        <p style="margin: 0 0 15px 0;">${message}</p>
        <button class="btn-custom btn-primary" onclick="location.reload()" style="margin: 0;">
          🔄 Reload Page
        </button>
      </div>
    `);
  }

  function exportToExcel() {
    if (masterData.length === 0) {
      frappe.show_alert({
        message: "❌ No data available to export",
        indicator: "orange",
      });
      return;
    }

    const startDate = page.fields_dict.start_date.get_value();
    const endDate = page.fields_dict.end_date.get_value() || getCurrentDate();
    const branchName =
      page.fields_dict.branch_filter.get_value() || "All_Branches";

    const sortedData = masterData.sort((a, b) => b.total_leads - a.total_leads);

    const exportData = sortedData.map((row, index) => [
      index + 1,
      row.branch,
      row.employee_code,
      row.employee_name,
      row.qualified,
      row.disqualified,
      row.bad_rating,
      row.average_rating,
      row.good_rating,
      row.total_leads,
      `${row.working_days}/${row.total_days}`,
    ]);

    const totals = sortedData.reduce(
      (acc, row) => ({
        qualified: acc.qualified + row.qualified,
        disqualified: acc.disqualified + row.disqualified,
        bad_rating: acc.bad_rating + row.bad_rating,
        average_rating: acc.average_rating + row.average_rating,
        good_rating: acc.good_rating + row.good_rating,
        total_leads: acc.total_leads + row.total_leads,
        working_days: acc.working_days + row.working_days,
      }),
      {
        qualified: 0,
        disqualified: 0,
        bad_rating: 0,
        average_rating: 0,
        good_rating: 0,
        total_leads: 0,
        working_days: 0,
      }
    );

    exportData.push([
      "",
      "",
      "TOTALS",
      `${sortedData.length} Employees`,
      totals.qualified,
      totals.disqualified,
      totals.bad_rating,
      totals.average_rating,
      totals.good_rating,
      totals.total_leads,
      `${totals.working_days} days`,
    ]);

    exportData.unshift([
      "Sr. No.",
      "Branch",
      "Employee Code",
      "Employee Name",
      "Qualification - No. of Qualified Days",
      "Qualification - No. of Disqualified Days",
      "Rating - No. of Bad Days",
      "Rating - No. of Average Days",
      "Rating - No. of Good Days",
      "Total Leads",
      "Working Days/Total Days",
    ]);

    const csvContent = exportData
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const startDateStr = startDate.replace(/-/g, "");
    const endDateStr = endDate.replace(/-/g, "");

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `DSR_Master_Report_OPTIMIZED_${startDateStr}_to_${endDateStr}_${branchName}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    frappe.show_alert({
      message: `✅ DSR Master Report exported successfully! (${sortedData.length} unique employees)`,
      indicator: "green",
    });
  }

  function clearFilters() {
    page.fields_dict.start_date.set_value(getCurrentDate());
    page.fields_dict.end_date.set_value(getCurrentDate());
    page.fields_dict.branch_filter.set_value("");
    loadMasterDSRDataOptimized();

    frappe.show_alert({
      message: "🔄 Filters reset to today",
      indicator: "blue",
    });
  }

  // Load initial data
  loadMasterDSRDataOptimized();
};
