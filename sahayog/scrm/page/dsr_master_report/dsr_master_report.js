frappe.pages["dsr-master-report"].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "DSR Master Report",
    single_column: true,
  });

  // Complete CSS styles with infinite scroll (unchanged)
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
      
      /* BATCH LOADING: Infinite scroll container */
      .lead-table-container {
        max-height: 600px;
        overflow-y: auto;
        border: 1px solid #e0e6ed;
        border-radius: 8px;
      }
      
      .loading-indicator {
        position: sticky;
        bottom: 0;
        background: #f8f9fa;
        border-top: 1px solid #e0e6ed;
        padding: 15px;
        text-align: center;
        color: #6c7680;
        font-size: 14px;
        z-index: 5;
        display: none;
      }
      
      .loading-indicator.show {
        display: block;
      }
      
      .fa-spinner {
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
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
        
        .lead-table-container {
          max-height: 400px;
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

  // Add filters: Start Date and End Date with user-friendly restrictions
  page.add_field({
    fieldname: "start_date",
    label: __("Start Date"),
    fieldtype: "Date",
    default: getCurrentDate(),
    change: () => {
      const startDate = page.fields_dict.start_date.get_value();
      const endDate = page.fields_dict.end_date.get_value();
      const today = getCurrentDate();

      // Validate start date is not in future
      if (startDate > today) {
        frappe.show_alert({
          message: "❌ Start Date cannot be in the future. Setting to today.",
          indicator: "red",
        });
        page.fields_dict.start_date.set_value(today);
        return;
      }

      // Update end date to match start date if end date is earlier
      if (endDate && startDate > endDate) {
        page.fields_dict.end_date.set_value(startDate);
      }

      // Update end date picker restrictions
      setTimeout(() => {
        if (page.fields_dict.end_date.datepicker) {
          page.fields_dict.end_date.datepicker.update({
            minDate: new Date(startDate),
            maxDate: new Date(today),
          });
        }
      }, 100);

      debouncedLoad();
    },
  });

  page.add_field({
    fieldname: "end_date",
    label: __("End Date"),
    fieldtype: "Date",
    default: getCurrentDate(),
    change: () => {
      const startDate = page.fields_dict.start_date.get_value();
      const endDate = page.fields_dict.end_date.get_value();
      const today = getCurrentDate();

      // Validate that end_date is not in the future
      if (endDate > today) {
        frappe.show_alert({
          message: "❌ End Date cannot be in the future. Setting to today.",
          indicator: "red",
        });
        page.fields_dict.end_date.set_value(today);
        return;
      }

      // Validate that end_date is not before start_date
      if (startDate && endDate < startDate) {
        frappe.show_alert({
          message:
            "❌ End Date cannot be before Start Date. Setting to Start Date.",
          indicator: "red",
        });
        page.fields_dict.end_date.set_value(startDate);
        return;
      }

      debouncedLoad();
    },
  });

  // SET DATEPICKER RESTRICTIONS after fields are created
  setTimeout(() => {
    const today = getCurrentDate();

    // Restrict start date picker - no future dates
    if (page.fields_dict.start_date.datepicker) {
      page.fields_dict.start_date.datepicker.update({
        maxDate: new Date(today),
      });
    }

    // Restrict end date picker - no future dates
    if (page.fields_dict.end_date.datepicker) {
      page.fields_dict.end_date.datepicker.update({
        maxDate: new Date(today),
      });
    }
  }, 200);

  page.add_field({
    fieldname: "branch_filter",
    label: __("Branch"),
    fieldtype: "Link",
    options: "Branch",
    change: () => debouncedLoad(),
  });

  // Content area with infinite scroll structure
  const content_area = $(`
    <div class="dsr-master-content">
      <div class="summary-info" id="period-summary" style="display: none;"></div>
      <div class="table-section">
        <div class="table-header">
          <h3 class="table-title">📈 DSR Master Report (Optimized + Batch Loading)</h3>
          <div class="table-actions">
            <span id="report-date" style="font-size: 12px; color: #6c757d; font-weight: 500;">
              📅 Report Generated: ${frappe.datetime.str_to_user(
                frappe.datetime.now_date()
              )}
            </span>
          </div>
        </div>
        
        <div class="card-body p-0">
          <div class="lead-table-container">
            <table class="table table-sm" id="master-dsr-table">
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
              <tbody id="employee-content"></tbody>
            </table>
            <div id="loading-indicator" class="loading-indicator">
              <i class="fa fa-spinner fa-spin"></i> Loading more employees...
            </div>
          </div>
          <div class="p-3 text-center bg-light">
            <small id="record-count" class="text-muted">Showing 0 of 0 records</small>
          </div>
        </div>
      </div>
    </div>
  `).appendTo(page.body);

  // OPTIMIZED VARIABLES
  let masterData = [];
  let employeeDataMap = new Map(); // Use Map for better performance
  let currentEmployees = [];
  let totalEmployeeCount = 0;
  let isLoading = false;
  let hasMoreEmployees = true;
  let currentPage = 1;
  const pageSize = 20;
  let scrollTimeout;
  let allDatesInPeriod = [];
  let allProcessedData = [];

  // PERFORMANCE OPTIMIZATION: Add caching and debouncing
  const ratingCache = new Map();
  let loadTimeout;

  // Debounced loading function
  const debouncedLoad = function () {
    clearTimeout(loadTimeout);
    loadTimeout = setTimeout(() => {
      loadMasterDSRDataOptimized();
    }, 500);
  };

  // Helper function to generate consistent date range
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

  // Enhanced loading with progress tracking
  function showLoadingWithProgress(message, progress = 0) {
    $(".loading-spinner h4").text(message);
    $(".progress-fill").css("width", `${progress}%`);
    $(".loading-spinner p").text(`${progress}% complete...`);
  }

  function showLoading(message = "Processing Data...") {
    $(".lead-table-container").html(`
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

  // OPTIMIZED: Function to calculate DAILY rating with caching
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

    // Create cache key for similar lead patterns
    const convertedCount = dailyLeads.filter(
      (l) => (l.status || "").toLowerCase() === "converted"
    ).length;
    const followupCount = dailyLeads.filter((l) => l.has_followup).length;

    const cacheKey = `${totalLeads}_${convertedCount}_${followupCount}`;

    if (ratingCache.has(cacheKey)) {
      const cached = ratingCache.get(cacheKey);
      return {
        ...cached,
        totalLeads: totalLeads,
        convertedLeads: convertedCount,
        leadsWithFollowups: followupCount,
      };
    }

    const qualification = totalLeads >= 10 ? "Qualified" : "Disqualified";

    let performance = "Bad";
    if (convertedCount >= 1) {
      performance = "Good";
    } else if (followupCount >= 4) {
      performance = "Average";
    }

    const result = {
      totalLeads,
      convertedLeads: convertedCount,
      leadsWithFollowups: followupCount,
      qualification,
      performance,
    };

    // Cache the performance calculation
    ratingCache.set(cacheKey, {
      qualification: result.qualification,
      performance: result.performance,
    });

    return result;
  }

  // Setup infinite scroll for batch loading
  function setupInfiniteScroll() {
    const tableContainer = document.querySelector(".lead-table-container");
    if (!tableContainer) return;

    tableContainer.removeEventListener("scroll", handleScroll);

    function handleScroll() {
      const { scrollTop, scrollHeight, clientHeight } = tableContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200;

      if (isNearBottom && !isLoading && hasMoreEmployees) {
        console.log("🔄 Near bottom - loading next batch of 20 employees...");
        renderNextBatch();
      }
    }

    tableContainer.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    });
  }

  // Render next batch of 20 employees from processed data
  function renderNextBatch() {
    if (isLoading || !hasMoreEmployees) return;

    isLoading = true;
    $("#loading-indicator").show();

    try {
      console.log(
        `📄 Rendering batch ${currentPage} (${pageSize} employees)...`
      );

      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const batchEmployees = allProcessedData.slice(startIndex, endIndex);

      console.log(
        `📊 Batch ${currentPage}: ${batchEmployees.length} employees (${startIndex} to ${endIndex})`
      );

      if (batchEmployees.length === 0) {
        hasMoreEmployees = false;
        console.log("✅ No more employees to load");
        return;
      }

      if (batchEmployees.length < pageSize) {
        hasMoreEmployees = false;
        console.log("✅ Last batch loaded");
      }

      if (currentPage === 1) {
        currentEmployees = batchEmployees;
      } else {
        currentEmployees = [...currentEmployees, ...batchEmployees];
      }

      renderEmployeeTable(currentEmployees);
      currentPage++;
    } catch (error) {
      console.error("❌ Error rendering next batch:", error);
      hasMoreEmployees = false;
    } finally {
      isLoading = false;
      $("#loading-indicator").hide();
    }
  }

  // Render employee table (batch version)
  function renderEmployeeTable(employees) {
    console.log(`🎨 Rendering ${employees.length} employees in table...`);

    const rows = employees
      .map(
        (employee, index) => `
      <tr>
        <td><span class="sr-no">${index + 1}</span></td>
        <td class="branch-cell">${employee.branch}</td>
        <td style="font-family: monospace; font-weight: 600;">${
          employee.employee_code
        }</td>
        <td class="employee-name-cell">${employee.employee_name}</td>
        <td><span class="metric-badge qualified-bg">${
          employee.qualified
        }</span></td>
        <td><span class="metric-badge disqualified-bg">${
          employee.disqualified
        }</span></td>
        <td><span class="metric-badge bad-bg">${employee.bad_rating}</span></td>
        <td><span class="metric-badge average-bg">${
          employee.average_rating
        }</span></td>
        <td><span class="metric-badge good-bg">${
          employee.good_rating
        }</span></td>
        <td class="total-leads-cell">${employee.total_leads}</td>
        <td><span class="working-days-info">${employee.working_days}/${
          employee.total_days
        }</span></td>
      </tr>
    `
      )
      .join("");

    document.getElementById("employee-content").innerHTML = rows;

    $("#record-count").text(
      `Showing ${employees.length} of ${totalEmployeeCount} employees (loaded in batches of 20)`
    );

    showDataSummary(employees);

    if (employees.length > 0) setupInfiniteScroll();
  }

  // OPTIMIZED: Preprocess data with better data structures
  function preprocessDataOptimized(allLeads, employees, appointments) {
    console.log("🚀 Starting optimized preprocessing...");

    // Create lookup maps for O(1) access
    const employeeMap = new Map();
    employees.forEach((emp) => {
      employeeMap.set(emp.user_id, {
        name: emp.name,
        employee_name: emp.employee_name,
        branch: emp.branch,
      });
    });

    // Create appointment lookup for faster checking
    const appointmentSet = new Set(appointments.map((apt) => apt.party));

    // Group leads by employee efficiently
    const employeeLeadsMap = new Map();

    allLeads.forEach((lead) => {
      if (!lead.lead_owner || !employeeMap.has(lead.lead_owner)) return;

      // Add followup info directly
      lead.has_followup = appointmentSet.has(lead.name);

      if (!employeeLeadsMap.has(lead.lead_owner)) {
        employeeLeadsMap.set(lead.lead_owner, []);
      }
      employeeLeadsMap.get(lead.lead_owner).push(lead);
    });

    return { employeeMap, employeeLeadsMap };
  }

  // OPTIMIZED: Process employees in batches to prevent UI blocking
  async function processEmployeesInBatches(
    employeeMap,
    employeeLeadsMap,
    allDatesInPeriod
  ) {
    const BATCH_SIZE = 10; // Process 10 employees at a time
    const allEmployees = Array.from(employeeMap.keys());
    const processedData = [];

    for (let i = 0; i < allEmployees.length; i += BATCH_SIZE) {
      const batchEmployees = allEmployees.slice(i, i + BATCH_SIZE);

      // Show progress
      const progress = Math.round(65 + (i / allEmployees.length) * 25);
      showLoadingWithProgress(
        `Processing employees ${i + 1}-${Math.min(
          i + BATCH_SIZE,
          allEmployees.length
        )}...`,
        progress
      );

      // Process batch
      const batchResults = processBatch(
        batchEmployees,
        employeeMap,
        employeeLeadsMap,
        allDatesInPeriod
      );
      processedData.push(...batchResults);

      // Allow UI to update between batches
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return processedData;
  }

  function processBatch(
    employeeIds,
    employeeMap,
    employeeLeadsMap,
    allDatesInPeriod
  ) {
    const results = [];

    employeeIds.forEach((employeeId) => {
      const employee = employeeMap.get(employeeId);
      const employeeLeads = employeeLeadsMap.get(employeeId) || [];

      // Group leads by date efficiently using Map
      const leadsByDate = new Map();
      employeeLeads.forEach((lead) => {
        const dateKey = new Date(lead.creation).toISOString().split("T")[0];
        if (!leadsByDate.has(dateKey)) {
          leadsByDate.set(dateKey, []);
        }
        leadsByDate.get(dateKey).push(lead);
      });

      // Calculate metrics for all dates
      const metrics = calculateEmployeeMetricsFast(
        leadsByDate,
        allDatesInPeriod
      );

      results.push({
        branch: employee.branch || "-",
        employee_code: employee.name,
        employee_name: employee.employee_name || "-",
        ...metrics,
        total_leads: employeeLeads.length,
        working_days: leadsByDate.size,
        total_days: allDatesInPeriod.length,
      });
    });

    return results;
  }

  // OPTIMIZED: Fast metrics calculation
  function calculateEmployeeMetricsFast(leadsByDate, allDatesInPeriod) {
    let qualifiedDays = 0;
    let disqualifiedDays = 0;
    let goodRatingDays = 0;
    let averageRatingDays = 0;
    let badRatingDays = 0;

    // Use for...of for better performance with large arrays
    for (const dateKey of allDatesInPeriod) {
      const dailyLeads = leadsByDate.get(dateKey) || [];
      const dailyRating = calculateDailyRating(dailyLeads);

      // Increment counters directly (faster than arrays)
      if (dailyRating.qualification === "Qualified") {
        qualifiedDays++;
      } else {
        disqualifiedDays++;
      }

      if (dailyRating.performance === "Good") {
        goodRatingDays++;
      } else if (dailyRating.performance === "Average") {
        averageRatingDays++;
      } else {
        badRatingDays++;
      }
    }

    return {
      qualified: qualifiedDays,
      disqualified: disqualifiedDays,
      bad_rating: badRatingDays,
      average_rating: averageRatingDays,
      good_rating: goodRatingDays,
    };
  }

  // OPTIMIZED: Load data efficiently with better chunking
  async function loadDataInChunks(doctype, filters, fields, totalCount) {
    if (totalCount <= 5000) {
      // Load all at once for smaller datasets
      return await frappe.db.get_list(doctype, {
        filters,
        fields,
        limit: 0,
        order_by: doctype === "Lead" ? "creation desc" : undefined,
      });
    } else {
      // Load in chunks for large datasets
      const chunks = Math.ceil(totalCount / 5000);
      let allRecords = [];

      for (let i = 0; i < chunks; i++) {
        const chunkRecords = await frappe.db.get_list(doctype, {
          filters,
          fields,
          limit: 5000,
          limit_start: i * 5000,
          order_by: doctype === "Lead" ? "creation desc" : undefined,
        });

        allRecords = allRecords.concat(chunkRecords);

        // Allow UI to breathe between chunks
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      return allRecords;
    }
  }

  // OPTIMIZED: Reset data structures with cleanup
  function resetDataStructures() {
    masterData = [];
    employeeDataMap = new Map();
    currentEmployees = [];
    allProcessedData = [];

    // Clear caches
    ratingCache.clear();

    // Reset pagination
    currentPage = 1;
    hasMoreEmployees = true;
    isLoading = false;
    totalEmployeeCount = 0;

    console.log("🧹 Data structures reset and memory cleared");
  }

  // MAIN OPTIMIZED FUNCTION
  async function loadMasterDSRDataOptimized() {
    console.log("=== Starting OPTIMIZED DSR Master Data Load ===");
    showLoading("Initializing optimized data load...");

    try {
      // Reset everything
      resetDataStructures();

      const leadFilters = getLeadFilters();
      const startDate = page.fields_dict.start_date.get_value();
      const endDate = page.fields_dict.end_date.get_value() || getCurrentDate();

      if (!startDate) {
        renderError("Please select a start date.");
        return;
      }

      const { dates, totalDays } = generateDateRangeFromDates(
        startDate,
        endDate
      );
      allDatesInPeriod = dates;

      console.log("1. Date Range:", { startDate, endDate, totalDays });
      showLoadingWithProgress("Checking data counts...", 5);

      updatePeriodSummary(startDate, endDate, totalDays);

      // Get counts first for optimization decisions
      const [totalLeadCount, totalEmpCount] = await Promise.all([
        frappe.db.count("Lead", { filters: leadFilters }),
        frappe.db.count("Employee", {
          filters: {
            user_id: ["is", "set"],
            ...(page.fields_dict.branch_filter.get_value()
              ? { branch: page.fields_dict.branch_filter.get_value() }
              : {}),
          },
        }),
      ]);

      console.log(
        "2. Data Counts - Leads:",
        totalLeadCount,
        "Employees:",
        totalEmpCount
      );

      if (totalLeadCount === 0) {
        renderNoData(`No leads found for the selected date range`);
        return;
      }

      showLoadingWithProgress("Loading data in parallel...", 15);

      // Load all data in parallel with optimized chunking
      const [allLeads, allEmployees, allAppointments] = await Promise.all([
        loadDataInChunks(
          "Lead",
          leadFilters,
          ["name", "lead_owner", "status", "creation", "custom_branch"],
          totalLeadCount
        ),
        loadDataInChunks(
          "Employee",
          {
            user_id: ["is", "set"],
            ...(page.fields_dict.branch_filter.get_value()
              ? { branch: page.fields_dict.branch_filter.get_value() }
              : {}),
          },
          ["name", "employee_name", "branch", "user_id"],
          totalEmpCount
        ),
        frappe.db.get_list("Appointment", {
          filters: {
            appointment_with: "Lead",
            status: ["!=", "Cancelled"],
          },
          fields: ["party"],
          limit: 0,
        }),
      ]);

      console.log(
        "3. Data Loaded - Leads:",
        allLeads.length,
        "Employees:",
        allEmployees.length,
        "Appointments:",
        allAppointments.length
      );

      // Filter employees who have leads
      const leadsWithOwners = allLeads.filter((lead) => lead.lead_owner);
      const uniqueLeadOwners = new Set(
        leadsWithOwners.map((lead) => lead.lead_owner)
      );
      const employeesWithLeads = allEmployees.filter((emp) =>
        uniqueLeadOwners.has(emp.user_id)
      );

      if (employeesWithLeads.length === 0) {
        renderNoData("No employees found with assigned leads");
        return;
      }

      showLoadingWithProgress("Preprocessing data structures...", 40);

      // Preprocess data efficiently
      const { employeeMap, employeeLeadsMap } = preprocessDataOptimized(
        leadsWithOwners,
        employeesWithLeads,
        allAppointments
      );

      console.log(
        "4. Preprocessed - Employee Map:",
        employeeMap.size,
        "Employee Leads Map:",
        employeeLeadsMap.size
      );

      showLoadingWithProgress("Processing employee metrics...", 50);

      // Process in batches to prevent UI blocking
      const processedData = await processEmployeesInBatches(
        employeeMap,
        employeeLeadsMap,
        dates
      );

      // Sort by total leads descending
      allProcessedData = processedData.sort(
        (a, b) => b.total_leads - a.total_leads
      );
      totalEmployeeCount = allProcessedData.length;

      showLoadingWithProgress("Initializing table...", 90);

      console.log(
        "5. Final processed data:",
        allProcessedData.length,
        "unique employees"
      );

      // Initialize table structure
      $(".lead-table-container").html(`
        <table class="table table-sm" id="master-dsr-table">
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
          <tbody id="employee-content"></tbody>
        </table>
        <div id="loading-indicator" class="loading-indicator">
          <i class="fa fa-spinner fa-spin"></i> Loading more employees...
        </div>
      `);

      // Start batch rendering - first batch of 20 employees
      setTimeout(() => {
        renderNextBatch();
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
        <strong>🚀 Optimized:</strong> Faster processing with better algorithms and batch rendering.
      `
      )
      .show();
  }

  function showDataSummary(data) {
    const displayedEmployees = data.length;
    const totalLeads = data.reduce((sum, emp) => sum + emp.total_leads, 0);
    const avgLeadsPerEmployee =
      displayedEmployees > 0 ? Math.round(totalLeads / displayedEmployees) : 0;
    const topPerformer = data[0];

    const summaryHTML = `
      <div style="background: #f8f9fa; padding: 10px; margin-top: 15px; border-radius: 6px; font-size: 12px; color: #495057;">
        <strong>📊 Summary:</strong> 
        ${displayedEmployees} employees displayed (of ${totalEmployeeCount} total) | 
        ${totalLeads} total leads shown | 
        ~${avgLeadsPerEmployee} leads per employee | 
        Top: ${topPerformer ? topPerformer.employee_name : "N/A"} (${
      topPerformer ? topPerformer.total_leads : 0
    } leads) |
        <strong>⚡ Optimized:</strong> Scroll to load next 20 employees efficiently
      </div>
    `;

    // Remove existing summary and add new one
    $(".lead-table-container")
      .parent()
      .find("div[style*='background: #f8f9fa']")
      .remove();
    $(".lead-table-container").parent().append(summaryHTML);
  }

  function renderNoData(message) {
    $(".lead-table-container").html(`
      <div class="no-data">
        <i class="fa fa-chart-bar"></i>
        <h4 style="margin: 15px 0 10px 0; color: #495057;">No Data Found</h4>
        <p style="margin: 0 0 15px 0;">${message}</p>
      </div>
    `);
  }

  function renderError(message) {
    $(".lead-table-container").html(`
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

  // Export to Excel (exports ALL data, not just displayed 20) - unchanged
  function exportToExcel() {
    if (allProcessedData.length === 0) {
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

    const sortedData = allProcessedData.sort(
      (a, b) => b.total_leads - a.total_leads
    );

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
      message: `✅ DSR Master Report exported successfully! (${sortedData.length} total employees - ALL data exported)`,
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

  // Cleanup on page destroy
  $(window).on("beforeunload", function () {
    resetDataStructures();
  });

  // Load initial data
  loadMasterDSRDataOptimized();
};
