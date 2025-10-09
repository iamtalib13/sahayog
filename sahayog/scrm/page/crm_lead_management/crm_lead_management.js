frappe.pages["crm-lead-management"].on_page_load = async function (wrapper) {
  frappe.require(
    ["/assets/sahayog/js/chart.min.js", "/assets/sahayog/js/clusterize.min.js"],
    async () => {
      let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "CRM Lead Management",
        single_column: true,
      });

      let $container = $(page.body).css({ padding: "15px" });

      // Extract URL parameters for filter initialization
      const urlParams = new URLSearchParams(window.location.search);
      const today = frappe.datetime.get_today();

      // Complete CSS styling for modern CRM interface with analytics and export progress
      $container.append(`
        <style>
          /* Modern Minimal UI Card Styles */
          .custom-card {
            border: none;
            background-color: #ffffff;
            color: #2e3338;
            height: 100px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .custom-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          }
          .custom-card .card-title {
            color: #6c7680 !important;
            margin: 0 0 8px 0;
            font-size: 13px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .custom-card .card-text {
            color: #2e3338 !important;
            font-weight: 600;
            font-size: 22px;
            margin: 0;
          }
          
          /* Status-based card border colors */
          .card-lead { border-top: 4px solid #5e64ff; }
          .card-converted { border-top: 4px solid #28a745; }
          .card-follow-up { border-top: 4px solid #ffa00a; }
          .card-not-interested { border-top: 4px solid #ff5858; }
          
          /* Analytics Modal Styles */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1040;
            display: none;
            backdrop-filter: blur(5px);
          }
          
          .analytics-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 24px;
            border-radius: 8px;
            z-index: 1050;
            width: 90%;
            max-width: 1200px;
            max-height: 85vh;
            overflow: auto;
            display: none;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .analytics-modal .close-btn {
            position: absolute;
            top: 16px;
            right: 16px;
            cursor: pointer;
            font-size: 24px;
            color: #6c7680;
            background: #f5f7fa;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
          }
          .analytics-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }
          .analytics-table th,
          .analytics-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e0e6ed;
          }
          .analytics-table th {
            background: #f5f7fa;
            font-weight: 600;
            color: #2e3338;
            position: sticky;
            top: 0;
            z-index: 10;
          }
          .analytics-table tbody tr:hover {
            background: #f8f9fb;
          }
          .conversion-rate {
            font-weight: 600;
          }
          .conversion-rate.high {
            color: #28a745;
          }
          .conversion-rate.medium {
            color: #ffa00a;
          }
          .conversion-rate.low {
            color: #ff5858;
          }
          .progress-bar {
            width: 100%;
            height: 20px;
            background: #e0e6ed;
            border-radius: 10px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #ff5858 0%, #ffa00a 50%, #28a745 100%);
            transition: width 0.3s ease;
          }
          .analytics-export-btn {
            position: absolute;
            top: 16px;
            right: 60px;
            background: #ffffff;
            border: 1px solid #d1d8dd;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
          }
          .analytics-export-btn:hover {
            background: #f5f7fa;
          }
          .analytics-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }
          .summary-card {
            background: #f8f9fb;
            padding: 16px;
            border-radius: 8px;
            text-align: center;
          }
          .summary-card h4 {
            margin: 0 0 8px 0;
            color: #2e3338;
            font-size: 24px;
            font-weight: 600;
          }
          .summary-card p {
            margin: 0;
            color: #6c7680;
            font-size: 14px;
          }
          .analytics-loading {
            text-align: center;
            padding: 40px;
            color: #6c7680;
          }
          .analytics-loading i {
            font-size: 24px;
            margin-bottom: 16px;
            display: block;
          }
          
          /* Export Progress Modal Styles */
          .export-progress-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 12px;
            z-index: 1060;
            width: 90%;
            max-width: 450px;
            display: none;
            box-shadow: 0 15px 35px rgba(0,0,0,0.2);
            text-align: center;
          }
          .export-progress-modal h4 {
            margin: 0 0 20px 0;
            color: #2e3338;
            font-weight: 600;
          }
          .export-progress-bar {
            width: 100%;
            height: 8px;
            background: #e0e6ed;
            border-radius: 4px;
            overflow: hidden;
            margin: 20px 0;
          }
          .export-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #5e64ff, #4a50d1);
            transition: width 0.3s ease;
            border-radius: 4px;
          }
          .export-progress-text {
            margin: 15px 0;
            color: #6c7680;
            font-size: 14px;
          }
          .export-progress-percentage {
            font-weight: 600;
            color: #2e3338;
            font-size: 16px;
            margin-bottom: 10px;
          }
          .export-cancel-btn {
            background: #ffffff;
            color: #6c7680;
            border: 1px solid #d1d8dd;
            padding: 8px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            margin-top: 15px;
          }
          .export-cancel-btn:hover {
            background: #f5f7fa;
          }
          
          /* Table container and styling */
          .lead-table-container {
            border: 1px solid #e0e6ed;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            max-height: 600px;
            overflow-x: auto;
            overflow-y: auto;
          }
          .lead-table {
            width: 100%;
            min-width: 1800px;
            border-collapse: collapse;
            margin: 0;
          }
          .lead-table thead th {
            background: #f5f7fa;
            border-bottom: 1px solid #e0e6ed;
            font-weight: 600;
            color: #2e3338;
            position: sticky;
            top: 0;
            z-index: 10;
            padding: 12px 8px;
            white-space: nowrap;
          }
          .lead-table thead tr.filter-row th {
            top: 40px;
            padding: 0;
            background: #f5f7fa;
            z-index: 9;
          }
          .lead-table thead tr.filter-row input {
            width: 100%;
            border: none;
            border-bottom: 1px solid #e0e6ed;
            padding: 8px;
            background: #fff;
            font-size: 12px;
          }
          .lead-table thead tr.filter-row input:focus {
            outline: none;
            border-bottom: 1px solid #5e64ff;
          }
          .lead-table tbody td {
            padding: 12px 8px;
            border-bottom: 1px solid #f0f2f5;
            white-space: nowrap;
          }
          .lead-table tbody tr:hover {
            background: #f8f9fb;
          }
          
          /* Button styling */
          .btn-export {
            background: #ffffff;
            color: #5e64ff;
            border: 1px solid #5e64ff;
            font-weight: 500;
          }
          .btn-export:hover {
            background: #5e64ff;
            color: #ffffff;
          }
          .btn-analytics {
            background: #5e64ff;
            color: #ffffff;
            font-weight: 500;
          }
          .btn-analytics:hover {
            background: #4a50d1;
            color: #ffffff;
          }
          
          /* Status badge styling */
          .badge-success {
            background-color: #28a745;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
          }
          .badge-warning {
            background-color: #ffa00a;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
          }
          .badge-danger {
            background-color: #ff5858;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
          }
          .badge-secondary {
            background-color: #6c7680;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
          }
          
          /* Link and interactive elements */
          .lead-link {
            color: #5e64ff;
            cursor: pointer;
            font-weight: 500;
          }
          .lead-link:hover {
            text-decoration: underline;
          }
          .row-number {
            color: #6c7680;
            font-weight: 500;
          }
          
          /* Loading indicator */
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
          
          /* Product row styling for multiple products per lead */
          .product-row {
            background-color: #fafbfc;
          }
          .product-row:hover {
            background-color: #f1f3f5;
          }
          
        </style>

        <!-- Analytics Modal Overlay -->
        <div class="modal-overlay" id="analytics-overlay"></div>
        <div class="analytics-modal" id="analytics-modal">
          <span class="close-btn" id="close-analytics">&times;</span>
          <button class="analytics-export-btn" id="export-analytics">
            <i class="fa fa-download mr-1"></i> Export Analytics
          </button>
          <h4 style="margin: 0 0 24px 0; font-weight: 600; color: #2e3338;">Employee Conversion Rate Analytics</h4>
          <p id="analytics-date-range" style="color: #6c7680; margin-bottom: 16px;"></p>

          <div id="analytics-loading" class="analytics-loading" style="display: none;">
            <i class="fa fa-spinner fa-spin"></i>
            <div>Loading analytics data...</div>
            <small>Please wait while we fetch all leads for analysis</small>
          </div>

          <div id="analytics-content" style="display: none;">
            <div class="analytics-summary" id="analytics-summary">
              <!-- Summary cards will be populated here -->
            </div>
            
            <div style="max-height: 60vh; overflow-y: auto;">
              <table class="analytics-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">#</th>
                    <th>Employee Name</th>
                    <th>Employee ID</th>
                    <th>Designation</th>
                    <th>SOL ID</th>
                    <th>Branch</th>
                    <th>District</th>
                    <th style="width: 100px;">Total Leads</th>
                    <th style="width: 100px;">Converted</th>
                    <th style="width: 100px;">Follow Up</th>
                    <th style="width: 120px;">Not Interested</th>
                    <th style="width: 120px;">Conversion Rate</th>
                    <th style="width: 150px;">Progress</th>
                  </tr>
                </thead>
                <tbody id="analytics-table-body">
                  <!-- Analytics data will be populated here -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Export Progress Modal -->
        <div class="modal-overlay" id="export-progress-overlay"></div>
        <div class="export-progress-modal" id="export-progress-modal">
          <h4>Exporting Selected Date Range</h4>
          <div class="export-progress-percentage" id="export-progress-percentage">0%</div>
          <div class="export-progress-bar">
            <div class="export-progress-fill" id="export-progress-fill" style="width: 0%"></div>
          </div>
          <div class="export-progress-text" id="export-progress-text">Preparing export...</div>
          <div id="export-date-info" style="margin: 15px 0; font-size: 14px; color: #6c7680;"></div>
          <button class="export-cancel-btn" id="export-cancel-btn">Cancel</button>
        </div>

        <!-- Dashboard Cards Section -->
        <div class="row mb-4">
          <div class="col-md-3">
            <div class="card custom-card card-lead">
              <div class="card-body">
                <h6 class="card-title">Total Leads</h6>
                <p class="card-text" id="total-leads">0</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card custom-card card-converted">
              <div class="card-body">
                <h6 class="card-title">Converted</h6>
                <p class="card-text" id="converted-leads">0</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card custom-card card-follow-up">
              <div class="card-body">
                <h6 class="card-title">Follow Up</h6>
                <p class="card-text" id="follow-up-leads">0</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card custom-card card-not-interested">
              <div class="card-body">
                <h6 class="card-title">Not Interested</h6>
                <p class="card-text" id="not-interested-leads">0</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Lead Data Table -->
        <div class="card" style="border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div class="card-header d-flex justify-content-between align-items-center" style="border: none; background: none;">
            <div class="d-flex justify-content-between align-items-center">  
              <h5 class="mb-0" style="font-weight: 600;">Lead List</h5>
              <div id="date-filters" class="date-filters d-flex align-items-center ml-3">
                <div class="d-flex align-items-center">
                  <span class="small text-muted mr-2">From Date</span>
                  <input type="date" class="form-control form-control-sm" id="from-date" style="width: 120px;" value="${
                    urlParams.get("from_date") || today
                  }">
                </div>
                <div class="d-flex align-items-center ml-2">
                  <span class="small text-muted mr-2">To Date</span>
                  <input type="date" class="form-control form-control-sm" id="to-date" style="width: 120px;" value="${
                    urlParams.get("to_date") || today
                  }">
                </div>
              </div>
            </div>
            <div>
              <button class="btn btn-sm btn-analytics mr-2" id="view-analytics">
                <i class="fa fa-chart-bar mr-1"></i> Analytics
              </button>
              <button class="btn btn-sm btn-export" id="export-csv">
                <i class="fa fa-download mr-1"></i> Export
              </button>
            </div>
          </div>
          
          <div class="card-body p-0">
            <div class="lead-table-container">
              <table class="table table-sm lead-table">
                <thead>
                  <tr class="table-header">
                    <th width="60">Sr.No.</th>
                    <th>Lead ID</th>
                    <th>Customer</th>
                    <th width="110">Contact</th>
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
                    <th>Status</th>
                    <th>Region</th>
                    <th>Zone</th>
                    <th>Created On</th>
                  </tr>
                  <tr class="filter-row">
                    <th width="60"><input type="text" id="col-0-filter" placeholder="Filter Sr. No." class="col-filter"></th>
                    <th><input type="text" id="col-1-filter" placeholder="Filter Lead ID" class="col-filter"></th>
                    <th><input type="text" id="col-2-filter" placeholder="Filter Customer" class="col-filter"></th>
                    <th width="110"><input type="text" id="col-3-filter" placeholder="Filter Contact" class="col-filter"></th>
                    <th><input type="text" id="col-4-filter" placeholder="Filter Source" class="col-filter"></th>
                    <th><input type="text" id="col-5-filter" placeholder="Filter Product Code" class="col-filter"></th>
                    <th><input type="text" id="col-6-filter" placeholder="Filter Product Name" class="col-filter"></th>
                    <th><input type="text" id="col-7-filter" placeholder="Filter Amount" class="col-filter"></th>
                    <th><input type="text" id="col-8-filter" placeholder="Filter Employee" class="col-filter"></th>
                    <th><input type="text" id="col-9-filter" placeholder="Filter ID" class="col-filter"></th>
                    <th><input type="text" id="col-10-filter" placeholder="Filter Designation" class="col-filter"></th>
                    <th><input type="text" id="col-11-filter" placeholder="Filter SOL ID" class="col-filter"></th>
                    <th><input type="text" id="col-12-filter" placeholder="Filter Branch" class="col-filter"></th>
                    <th><input type="text" id="col-13-filter" placeholder="Filter District" class="col-filter"></th>
                    <th><input type="text" id="col-14-filter" placeholder="Filter Status" class="col-filter"></th>
                    <th><input type="text" id="col-15-filter" placeholder="Filter Region" class="col-filter"></th>
                    <th><input type="text" id="col-16-filter" placeholder="Filter Zone" class="col-filter"></th>
                    <th><input type="text" id="col-17-filter" placeholder="Filter Date" class="col-filter"></th>
                  </tr>
                </thead>
                <tbody id="lead-content"></tbody>
              </table>
              <div id="loading-indicator" class="loading-indicator">
                <i class="fa fa-spinner fa-spin"></i> Loading more leads...
              </div>
            </div>
            <div class="p-3 text-center bg-light">
              <small id="record-count" class="text-muted">Showing 0 of 0 records</small>
            </div>
          </div>
        </div>
      `);

      // Global Variables for CRM Application State Management
      let currentLeads = [];
      let expandedLeadRows = [];
      let employeeMap = {};
      let branchMap = {};
      let analyticsData = [];
      let columnFilters = {};
      let isLoading = false;
      let hasMoreLeads = true;
      let currentPage = 1;
      let totalLeadsCount = 0;
      const pageSize = 50;
      let scrollTimeout;
      let exportCancelled = false;

      // Initialize column filters for all 18 table columns
      for (let i = 0; i < 18; i++) {
        columnFilters[i] = "";
      }

      // Update URL with current filters
      function updateURL() {
        const params = new URLSearchParams();

        const fromDate = $("#from-date").val();
        const toDate = $("#to-date").val();

        if (fromDate && fromDate !== today) params.set("from_date", fromDate);
        if (toDate && toDate !== today) params.set("to_date", toDate);

        const newUrl =
          window.location.pathname +
          (params.toString() ? "?" + params.toString() : "");
        window.history.replaceState({}, "", newUrl);
      }

      // Progress modal functions
      function showExportProgress() {
        exportCancelled = false;
        $("#export-progress-overlay").show();
        $("#export-progress-modal").show();
        updateExportProgress(0, "Preparing export...");

        // Show selected date range
        const fromDate = $("#from-date").val();
        const toDate = $("#to-date").val();
        $("#export-date-info").text(`Date Range: ${fromDate} to ${toDate}`);
      }

      function hideExportProgress() {
        $("#export-progress-overlay").hide();
        $("#export-progress-modal").hide();
      }

      function updateExportProgress(percentage, text) {
        $("#export-progress-percentage").text(percentage + "%");
        $("#export-progress-fill").css("width", percentage + "%");
        $("#export-progress-text").text(text);
      }

      // Generate date filters for database queries based on UI inputs
      function getDateFilters() {
        let from_date = $("#from-date").val();
        let to_date = $("#to-date").val();

        let filters = [];
        if (from_date) {
          let fromDateTime = `${from_date} 00:00:00.000000`;
          filters.push(["creation", ">=", fromDateTime]);
        }
        if (to_date) {
          let toDateTime = `${to_date} 23:59:59.999999`;
          filters.push(["creation", "<=", toDateTime]);
        }

        return filters;
      }

      // Single API call for complete data - Uses custom API with permission handling
      async function fetchCompleteData(page = 1) {
        try {
          isLoading = true;
          $("#loading-indicator").show();

          const filters = getDateFilters();
          const limit_start = (page - 1) * pageSize;

          console.log(`📊 Fetching complete data for page ${page}...`);

          // Single API call for complete data
          const response = await frappe.call({
            method: "sahayog.scrm.api.lead_owner_data.get_complete_crm_data",
            args: {
              filters: filters,
              limit_start: limit_start,
              limit_page_length: pageSize,
            },
          });

          const data = response.message;

          if (!data.success) {
            frappe.msgprint(`Error loading data: ${data.error}`);
            return;
          }

          // Update global variables with permission-filtered data
          employeeMap = data.employees;
          branchMap = data.branches;

          // Handle pagination
          if (page === 1) {
            currentLeads = data.leads;
          } else {
            currentLeads = [...currentLeads, ...data.leads];
          }

          hasMoreLeads = data.pagination.has_more;
          totalLeadsCount = data.pagination.total_count;

          // Update dashboard counts with permission-filtered counts
          $("#total-leads").text(data.counts.total_leads);
          $("#converted-leads").text(data.counts.converted);
          $("#follow-up-leads").text(data.counts.follow_up);
          $("#not-interested-leads").text(data.counts.not_interested);

          // Render table with permission-filtered data
          renderLeadList(currentLeads);

          // Show permission info
          if (data.stats.user_permission_applied) {
            console.log("✅ User permissions applied to lead data");
          } else {
            console.log("⚠️ No permission restrictions for current user");
          }

          console.log(
            `📊 Loaded: ${data.stats.total_employees} employees, ${data.stats.total_branches} branches, ${data.leads.length} leads`
          );

          currentPage++;
        } catch (error) {
          console.error("Error fetching complete data:", error);
          frappe.msgprint("Error loading CRM data. Please try again.");
        } finally {
          isLoading = false;
          $("#loading-indicator").hide();
        }
      }

      // Updated analytics function using custom API with permission
      async function generateAnalyticsData() {
        try {
          $("#analytics-loading").show();
          $("#analytics-content").hide();

          const filters = getDateFilters();

          console.log(
            "🔍 Generating analytics with permission-filtered data..."
          );

          const response = await frappe.call({
            method: "sahayog.scrm.api.lead_owner_data.get_analytics_data",
            args: { filters: filters },
          });

          const data = response.message;

          if (!data.success) {
            frappe.msgprint(`Analytics error: ${data.error}`);
            return;
          }

          // Process analytics with permission-filtered leads
          const employeeStats = {};

          data.leads.forEach((lead) => {
            const owner = lead.lead_owner;
            if (!owner) return;

            if (!employeeStats[owner]) {
              employeeStats[owner] = {
                totalLeads: 0,
                converted: 0,
                followUp: 0,
                notInterested: 0,
              };
            }

            employeeStats[owner].totalLeads++;

            switch (lead.status) {
              case "Converted":
                employeeStats[owner].converted++;
                break;
              case "Follow Up":
                employeeStats[owner].followUp++;
                break;
              case "Not Interested":
                employeeStats[owner].notInterested++;
                break;
            }
          });

          // Convert to analytics data format using employee mapping
          analyticsData = Object.entries(employeeStats)
            .map(([userId, stats]) => {
              const emp = data.employees[userId];
              const empBranch = emp ? emp.branch : "-";
              const solId = branchMap[empBranch] || "-";

              const conversionRate =
                stats.totalLeads > 0
                  ? Math.round((stats.converted / stats.totalLeads) * 100)
                  : 0;

              return {
                userId: userId,
                employeeName: emp ? emp.name : userId || "Unknown",
                employeeId: emp ? emp.id : "-",
                designation: emp ? emp.designation : "-",
                branch: empBranch,
                district: emp ? emp.district : "-",
                solId: solId,
                totalLeads: stats.totalLeads,
                converted: stats.converted,
                followUp: stats.followUp,
                notInterested: stats.notInterested,
                conversionRate: conversionRate,
              };
            })
            .filter((emp) => emp.totalLeads > 0)
            .sort((a, b) => b.conversionRate - a.conversionRate);

          console.log(
            `✅ Analytics generated with ${
              data.user_permission_applied ? "permission-filtered" : "all"
            } leads (${data.leads.length} leads, ${
              analyticsData.length
            } employees)`
          );

          const fromDate = $("#from-date").val();
          const toDate = $("#to-date").val();
          $("#analytics-date-range").text(
            `Analysis Period: ${fromDate} to ${toDate} | Total Leads: ${
              data.leads.length
            } | Permission Applied: ${
              data.user_permission_applied ? "Yes" : "No"
            }`
          );

          renderAnalyticsSummary();
          renderAnalyticsTable();

          $("#analytics-loading").hide();
          $("#analytics-content").show();
        } catch (error) {
          console.error("Analytics error:", error);
          $("#analytics-loading").hide();
          frappe.msgprint({
            title: "Analytics Error",
            message: `Failed to generate analytics: ${error.message}`,
            indicator: "red",
          });
        }
      }

      // Render lead list with product rows and complete employee information
      function renderLeadList(leads) {
        const filteredLeads = getFilteredLeads(leads);
        console.log(`🎨 Rendering ${filteredLeads.length} filtered leads`);

        const allRows = [];
        let rowIndex = 1;

        // Process each lead and create table rows
        filteredLeads.forEach((lead) => {
          // Get employee information from mapping
          const emp = employeeMap[lead.lead_owner];
          const empName = emp ? emp.name : lead.lead_owner || "Unknown";
          const empId = emp ? emp.id : "-";
          const empDesignation = emp ? emp.designation : "-";
          const empDistrict = emp ? emp.district : "-";
          const empBranch = emp ? emp.branch : lead.branch || "-";
          const solId = branchMap[empBranch] || "-"; // Get SOL ID from branch mapping

          // Check if lead has products to determine row structure
          if (
            lead.products &&
            Array.isArray(lead.products) &&
            lead.products.length > 0
          ) {
            // Create separate row for each product in the lead
            lead.products.forEach((product, productIndex) => {
              const productCode = product.product || "-";
              const productName = product.product_name || "-";
              const amount = new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(parseFloat(product.amount) || 0);

              const rowClass =
                productIndex > 0
                  ? "product-row same-lead-group"
                  : "same-lead-group";

              const row = {
                html: `
                  <tr class="${rowClass}">
                    <td width="60" class="row-number">${rowIndex}</td>
                    <td>
                      <span class="lead-link" onclick="frappe.set_route('Form/Lead/${
                        lead.name
                      }')">
                        ${lead.name}
                      </span>
                    </td>
                    <td>${lead.lead_name || "-"}</td>
                    <td width="110">${lead.contact || "-"}</td>
                    <td>${lead.source || "-"}</td>
                    <td>${productCode}</td>
                    <td>${productName}</td>
                    <td>${amount}</td>
                    <td>${empName}</td>
                    <td>${empId}</td>
                    <td>${empDesignation}</td>
                    <td>${solId}</td>
                    <td>${empBranch}</td>
                    <td>${empDistrict}</td>
                    <td><span class="badge ${getStatusBadgeClass(
                      lead.status
                    )}">${lead.status}</span></td>
                    <td>${lead.region || "-"}</td>
                    <td>${lead.zone || "-"}</td>
                    <td>${formatDateTimeForDisplay(lead.creation)}</td>
                  </tr>
                `,
                // Store data for filtering and export functionality
                leadId: lead.name,
                productCode: productCode,
                productName: productName,
                amount: amount.toString(),
                empName: empName,
                empId: empId,
                empDesignation: empDesignation,
                solId: solId,
                empBranch: empBranch,
                empDistrict: empDistrict,
                customerName: lead.lead_name || "",
                contact: lead.contact || "",
                source: lead.source || "",
                status: lead.status || "",
                region: lead.region || "",
                zone: lead.zone || "",
                createdOn: formatDateTimeForDisplay(lead.creation),
              };

              allRows.push(row);
              rowIndex++;
            });
          } else {
            // Lead with no products - create single row with empty product fields
            const row = {
              html: `
                <tr>
                  <td width="60" class="row-number">${rowIndex}</td>
                  <td>
                    <span class="lead-link" onclick="frappe.set_route('Form/Lead/${
                      lead.name
                    }')">
                      ${lead.name}
                    </span>
                  </td>
                  <td>${lead.lead_name || "-"}</td>
                  <td width="110">${lead.contact || "-"}</td>
                  <td>${lead.source || "-"}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>${empName}</td>
                  <td>${empId}</td>
                  <td>${empDesignation}</td>
                  <td>${solId}</td>
                  <td>${empBranch}</td>
                  <td>${empDistrict}</td>
                  <td><span class="badge ${getStatusBadgeClass(lead.status)}">${
                lead.status
              }</span></td>
                  <td>${lead.region || "-"}</td>
                  <td>${lead.zone || "-"}</td>
                  <td>${formatDateTimeForDisplay(lead.creation)}</td>
                </tr>
              `,
              // Store data for filtering and export functionality
              leadId: lead.name,
              productCode: "-",
              productName: "-",
              amount: "-",
              empName: empName,
              empId: empId,
              empDesignation: empDesignation,
              solId: solId,
              empBranch: empBranch,
              empDistrict: empDistrict,
              customerName: lead.lead_name || "",
              contact: lead.contact || "",
              source: lead.source || "",
              status: lead.status || "",
              region: lead.region || "",
              zone: lead.zone || "",
              createdOn: formatDateTimeForDisplay(lead.creation),
            };

            allRows.push(row);
            rowIndex++;
          }
        });

        // Store expanded rows for export functionality
        expandedLeadRows = allRows;
        const htmlContent = allRows.map((row) => row.html).join("");

        // Update table body with rendered HTML content
        const tbody = document.getElementById("lead-content");
        if (tbody) {
          tbody.innerHTML = htmlContent;
          console.log("✅ Table rows updated successfully");
        }

        // Update record count display at bottom of table
        $("#record-count").text(
          `Showing ${allRows.length} product rows from ${filteredLeads.length} leads of ${totalLeadsCount} total leads (${currentLeads.length} loaded)`
        );

        // Setup infinite scroll for additional page loading
        if (currentLeads.length > 0) setupInfiniteScroll();
      }

      // Apply column filters to leads list based on user input
      function getFilteredLeads(leads) {
        return leads.filter((l) => {
          const emp = employeeMap[l.lead_owner];
          const empName = emp ? emp.name : l.lead_owner || "Unknown";
          const empId = emp ? emp.id : "-";
          const empDesignation = emp ? emp.designation : "-";
          const empDistrict = emp ? emp.district : "-";
          const empBranch = emp ? emp.branch : l.branch || "-";
          const solId = branchMap[empBranch] || "-";

          let matchesFilter = true;

          // Apply each column filter to determine if lead matches
          Object.entries(columnFilters).forEach(([col, filter]) => {
            if (!filter || !matchesFilter) return;

            const colIndex = parseInt(col);
            let fieldMatches = false;

            // Apply filter based on column index
            switch (colIndex) {
              case 0: // Sr.No. - skip this filter
                fieldMatches = true;
                break;
              case 1: // Lead ID
                fieldMatches = l.name
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 2: // Customer
                fieldMatches = (l.lead_name || "")
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 3: // Contact
                fieldMatches = (l.contact || "")
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 4: // Source
                fieldMatches = (l.source || "")
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 5: // Product Code
                if (l.products && Array.isArray(l.products)) {
                  fieldMatches = l.products.some((p) =>
                    (p.product || "")
                      .toLowerCase()
                      .includes(filter.toLowerCase())
                  );
                }
                break;
              case 6: // Product Name
                if (l.products && Array.isArray(l.products)) {
                  fieldMatches = l.products.some((p) =>
                    (p.product_name || "")
                      .toLowerCase()
                      .includes(filter.toLowerCase())
                  );
                }
                break;
              case 7: // Amount
                if (l.products && Array.isArray(l.products)) {
                  fieldMatches = l.products.some((p) =>
                    (p.amount || "")
                      .toString()
                      .toLowerCase()
                      .includes(filter.toLowerCase())
                  );
                }
                break;
              case 8: // Employee Name
                fieldMatches = empName
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 9: // Employee ID
                fieldMatches = empId
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 10: // Designation
                fieldMatches = empDesignation
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 11: // SOL ID
                fieldMatches = solId
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 12: // Branch
                fieldMatches = empBranch
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 13: // District
                fieldMatches = empDistrict
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 14: // Status
                fieldMatches = l.status
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 15: // Region
                fieldMatches = (l.region || "")
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 16: // Zone
                fieldMatches = (l.zone || "")
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              case 17: // Created On
                fieldMatches = formatDateTimeForDisplay(l.creation)
                  .toLowerCase()
                  .includes(filter.toLowerCase());
                break;
              default:
                fieldMatches = true;
            }

            if (!fieldMatches) {
              matchesFilter = false;
            }
          });

          return matchesFilter;
        });
      }

      // Format datetime for consistent display in table cells
      function formatDateTimeForDisplay(datetime) {
        const dateObj = frappe.datetime.str_to_obj(datetime);
        const day = String(dateObj.getDate()).padStart(2, "0");
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const year = dateObj.getFullYear();

        let hours = dateObj.getHours();
        const minutes = String(dateObj.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12;

        return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
      }

      // Get appropriate CSS class for status badges based on lead status
      function getStatusBadgeClass(status) {
        switch (status) {
          case "Converted":
            return "badge-success";
          case "Follow Up":
            return "badge-warning";
          case "Not Interested":
            return "badge-danger";
          default:
            return "badge-secondary";
        }
      }

      // Setup infinite scroll functionality for seamless pagination
      function setupInfiniteScroll() {
        const tableContainer = document.querySelector(".lead-table-container");

        if (!tableContainer) {
          console.error("Table container not found for infinite scroll setup");
          return;
        }

        // Remove existing listener to prevent duplicates
        tableContainer.removeEventListener("scroll", handleScroll);

        function handleScroll() {
          const { scrollTop, scrollHeight, clientHeight } = tableContainer;
          const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200;

          if (isNearBottom && !isLoading && hasMoreLeads) {
            fetchCompleteData(currentPage);
          }
        }

        tableContainer.addEventListener("scroll", () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(handleScroll, 100);
        });
      }

      // Render analytics summary cards
      function renderAnalyticsSummary() {
        if (analyticsData.length === 0) return;

        const totalEmployees = analyticsData.length;
        const avgConversionRate = Math.round(
          analyticsData.reduce((sum, emp) => sum + emp.conversionRate, 0) /
            totalEmployees
        );
        const topPerformer = analyticsData[0];
        const totalLeadsAnalyzed = analyticsData.reduce(
          (sum, emp) => sum + emp.totalLeads,
          0
        );

        const summaryHtml = `
          <div class="summary-card">
            <h4>${totalEmployees}</h4>
            <p>Active Employees</p>
          </div>
          <div class="summary-card">
            <h4>${avgConversionRate}%</h4>
            <p>Average Conversion Rate</p>
          </div>
          <div class="summary-card">
            <h4>${topPerformer.conversionRate}%</h4>
            <p>Top Conversion Rate<br><small>${topPerformer.employeeName}</small></p>
          </div>
          <div class="summary-card">
            <h4>${totalLeadsAnalyzed}</h4>
            <p>Total Leads Analyzed</p>
          </div>
        `;

        $("#analytics-summary").html(summaryHtml);
      }

      // Render analytics table with employee data
      function renderAnalyticsTable() {
        const tableBody = $("#analytics-table-body");

        if (analyticsData.length === 0) {
          tableBody.html(
            '<tr><td colspan="13" class="text-center">No data available</td></tr>'
          );
          return;
        }

        const rows = analyticsData
          .map((emp, index) => {
            const rateClass =
              emp.conversionRate >= 70
                ? "high"
                : emp.conversionRate >= 40
                ? "medium"
                : "low";

            return `
              <tr>
                <td>${index + 1}</td>
                <td><strong>${emp.employeeName}</strong></td>
                <td>${emp.employeeId}</td>
                <td>${emp.designation}</td>
                <td>${emp.solId}</td>
                <td>${emp.branch}</td>
                <td>${emp.district}</td>
                <td><strong>${emp.totalLeads}</strong></td>
                <td>${emp.converted}</td>
                <td>${emp.followUp}</td>
                <td>${emp.notInterested}</td>
                <td><span class="conversion-rate ${rateClass}">${
              emp.conversionRate
            }%</span></td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${
                      emp.conversionRate
                    }%"></div>
                  </div>
                </td>
              </tr>
            `;
          })
          .join("");

        tableBody.html(rows);
      }

      // Replace fetchAndRenderLeads function with single API call
      async function fetchAndRenderLeads() {
        currentPage = 1;
        hasMoreLeads = true;
        currentLeads = [];

        // Clear existing table content
        const tbody = document.getElementById("lead-content");
        if (tbody) tbody.innerHTML = "";

        // Single function call loads everything with permissions
        await fetchCompleteData(1);
        updateURL();
      }

      // Event Handlers Setup

      // Column filter input handlers for real-time filtering
      $(".col-filter").on("input", function () {
        const colIndex = parseInt(this.id.split("-")[1]);
        columnFilters[colIndex] = $(this).val();
        renderLeadList(currentLeads);
      });

      // Date filter change handlers for data refresh
      $("#from-date, #to-date").on("change", function () {
        fetchAndRenderLeads();
      });

      // Cancel export functionality
      $("#export-cancel-btn").on("click", function () {
        exportCancelled = true;
        hideExportProgress();
        frappe.msgprint("Export cancelled by user.");
      });

      // Close progress modal on overlay click
      $("#export-progress-overlay").on("click", function () {
        if (confirm("Are you sure you want to cancel the export?")) {
          exportCancelled = true;
          hideExportProgress();
        }
      });

      // Show analytics modal
      $("#view-analytics").on("click", function () {
        if (Object.keys(employeeMap).length === 0) {
          frappe.msgprint("Please load employee data first to view analytics.");
          return;
        }

        $("#analytics-overlay").show();
        $("#analytics-modal").show();
        generateAnalyticsData();
      });

      // Close analytics modal
      $("#close-analytics, #analytics-overlay").on("click", function () {
        $("#analytics-overlay").hide();
        $("#analytics-modal").hide();
      });

      // Export Analytics as CSV with SOL ID
      $("#export-analytics").on("click", function () {
        if (analyticsData.length === 0) {
          frappe.msgprint("No analytics data to export");
          return;
        }

        const csvData = analyticsData.map((row, index) => ({
          "#": index + 1,
          "Employee Name": row.employeeName,
          "Employee ID": row.employeeId,
          Designation: row.designation,
          "SOL ID": row.solId,
          Branch: row.branch,
          District: row.district,
          "Total Leads": row.totalLeads,
          Converted: row.converted,
          "Follow Up": row.followUp,
          "Not Interested": row.notInterested,
          "Conversion Rate": row.conversionRate + "%",
        }));

        const headers = Object.keys(csvData[0]);
        let csvContent = headers.join(",") + "\n";

        csvData.forEach((row) => {
          csvContent +=
            headers
              .map((header) => {
                let value = row[header] || "";
                if (typeof value === "string" && value.includes(",")) {
                  value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
              })
              .join(",") + "\n";
        });

        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `lead_analytics_${frappe.datetime.get_today()}.csv`
        );
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });

      // Export CSV functionality using existing expanded rows with proper permission handling
      // FIXED Export Function - Remove limit completely for export
      // ✅ COMPLETE EXPORT FUNCTION - Direct download without save dialog
      // ✅ FINAL SOLUTION - No save dialog, direct download
      $("#export-csv").on("click", async function () {
        try {
          showExportProgress();
          updateExportProgress(5, "Initializing export...");

          const fromDate = $("#from-date").val();
          const toDate = $("#to-date").val();

          // Validate dates
          if (!fromDate || !toDate) {
            hideExportProgress();
            frappe.msgprint(
              "Please select both From Date and To Date for export."
            );
            return;
          }

          if (fromDate > toDate) {
            hideExportProgress();
            frappe.msgprint("From Date cannot be greater than To Date.");
            return;
          }

          updateExportProgress(15, "Fetching data from server...");

          // Get data from API
          const filters = getDateFilters();
          const response = await frappe.call({
            method: "sahayog.scrm.api.lead_owner_data.get_complete_crm_data",
            args: {
              filters: filters,
              limit_start: 0,
              limit_page_length: 999999,
            },
            freeze: false,
          });

          if (exportCancelled) return;

          const data = response.message;
          if (!data.success) {
            hideExportProgress();
            frappe.msgprint(`Error: ${data.error}`);
            return;
          }

          if (data.leads.length === 0) {
            hideExportProgress();
            frappe.msgprint(
              `No leads found between ${fromDate} and ${toDate}.`
            );
            return;
          }

          updateExportProgress(40, "Processing data...");

          // Process data
          const allDateRangeLeads = data.leads;
          const employeeMap = data.employees;
          const branchMap = data.branches;

          // Apply column filters if any
          let finalLeadsForExport = allDateRangeLeads;
          const hasActiveFilters = Object.values(columnFilters).some(
            (f) => f && f.trim() !== ""
          );

          if (hasActiveFilters) {
            finalLeadsForExport = allDateRangeLeads.filter((lead) => {
              // TODO: Add filter logic if needed
              return true;
            });
          }

          updateExportProgress(60, "Generating CSV...");

          // CSV headers
          const headers = [
            "Sr.No.",
            "Lead ID",
            "Customer",
            "Contact",
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
            "Status",
            "Region",
            "Zone",
            "Created On",
          ];

          let csvContent = headers.join(",") + "\n";
          let rowIndex = 1;

          // Generate CSV rows
          finalLeadsForExport.forEach((lead) => {
            const emp = employeeMap[lead.lead_owner];
            const empName = emp ? emp.name : lead.lead_owner || "Unknown";
            const empId = emp ? emp.id : "-";
            const empDesignation = emp ? emp.designation : "-";
            const empBranch = emp ? emp.branch : lead.branch || "-";
            const empDistrict = emp ? emp.district : "-";
            const solId = branchMap[empBranch] || "-";

            if (
              lead.products &&
              Array.isArray(lead.products) &&
              lead.products.length > 0
            ) {
              lead.products.forEach((product) => {
                const productCode = product.product || "-";
                const productName = product.product_name || "-";
                const amount = parseFloat(product.amount || 0).toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }
                );

                const row = [
                  rowIndex,
                  lead.name,
                  lead.lead_name || "-",
                  lead.contact || "-",
                  lead.source || "-",
                  productCode,
                  productName,
                  amount,
                  empName,
                  empId,
                  empDesignation,
                  solId,
                  empBranch,
                  empDistrict,
                  lead.status,
                  lead.region || "-",
                  lead.zone || "-",
                  formatDateTimeForDisplay(lead.creation),
                ];

                csvContent +=
                  row
                    .map((field) => {
                      let value = field || "";
                      if (
                        typeof value === "string" &&
                        (value.includes(",") || value.includes('"'))
                      ) {
                        value = `"${value.replace(/"/g, '""')}"`;
                      }
                      return value;
                    })
                    .join(",") + "\n";

                rowIndex++;
              });
            } else {
              const row = [
                rowIndex,
                lead.name,
                lead.lead_name || "-",
                lead.contact || "-",
                lead.source || "-",
                "-",
                "-",
                "-",
                empName,
                empId,
                empDesignation,
                solId,
                empBranch,
                empDistrict,
                lead.status,
                lead.region || "-",
                lead.zone || "-",
                formatDateTimeForDisplay(lead.creation),
              ];

              csvContent +=
                row
                  .map((field) => {
                    let value = field || "";
                    if (
                      typeof value === "string" &&
                      (value.includes(",") || value.includes('"'))
                    ) {
                      value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                  })
                  .join(",") + "\n";

              rowIndex++;
            }
          });

          updateExportProgress(80, "Creating download...");

          // File name
          const filename = `crm_leads_${fromDate}_to_${toDate}_${
            rowIndex - 1
          }_rows.csv`;

          // Data URI
          const dataUri =
            "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);

          // Download link
          const downloadLink = document.createElement("a");
          downloadLink.href = dataUri;
          downloadLink.download = filename;
          downloadLink.style.display = "none";
          document.body.appendChild(downloadLink);

          updateExportProgress(95, "Starting download...");

          // Trigger download
          setTimeout(() => {
            downloadLink.click();

            // Cleanup and final UI updates
            setTimeout(() => {
              document.body.removeChild(downloadLink);

              updateExportProgress(100, "Download complete!");

              setTimeout(() => {
                hideExportProgress();
                frappe.msgprint({
                  title: "✅ Export Successful",
                  message: `Successfully exported ${
                    rowIndex - 1
                  } rows!<br><br>📁 File: ${filename}<br>📅 Date: ${fromDate} to ${toDate}`,
                  indicator: "green",
                });
              }, 500);
            }, 1000);
          }, 300);
        } catch (error) {
          console.error("Export error:", error);
          hideExportProgress();
          frappe.msgprint(`Export failed: ${error.message}`);
        }
      });

      // Initialize the CRM Lead Management application
      console.log(
        "🚀 Initializing CRM Lead Management System with single API and permission handling..."
      );
      fetchAndRenderLeads();
    }
  );
};
