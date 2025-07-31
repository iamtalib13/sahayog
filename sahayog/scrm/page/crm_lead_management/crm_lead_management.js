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

      // Get filters from URL
      const urlParams = new URLSearchParams(window.location.search);
      const today = frappe.datetime.get_today();

      $container.append(`
      <style>
        /* Modern Minimal UI Styles */
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
        .card-lead {
          border-top: 4px solid #5e64ff;
        }
        .card-converted {
          border-top: 4px solid #28a745;
        }
        .card-follow-up {
          border-top: 4px solid #ffa00a;
        }
        .card-not-interested {
          border-top: 4px solid #ff5858;
        }
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
        
        .filter-container {
          background: #f5f7fa;
          padding: 16px;
          border-radius: 8px 8px 0 0;
          display: none;
        }
        .lead-table-container {
          border: 1px solid #e0e6ed;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          max-height: 600px;
          overflow-y: auto;
        }
        .lead-table {
          width: 100%;
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
        .lead-table tbody {
          display: table-row-group;
        }
        .lead-table tbody tr {
          display: table-row;
        }
        .lead-table tbody td {
          padding: 12px 8px;
          border-bottom: 1px solid #f0f2f5;
        }
        .lead-table tbody tr:hover {
          background: #f8f9fb;
        }
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
        .btn-filter {
          background: #ffffff;
          color: #6c7680;
          border: 1px solid #d1d8dd;
          font-weight: 500;
        }
        .btn-filter:hover {
          background: #f5f7fa;
        }
        .btn-filter.active {
          background: #5e64ff;
          color: #ffffff;
          border-color: #5e64ff;
        }
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
        .table-header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: #f5f7fa;
        }
        .table {
          margin: 0;
        }
        .hidden {
          display: none;
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
      </style>

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

      <div class="modal-overlay" id="analytics-overlay"></div>
      <div class="analytics-modal" id="analytics-modal">
        <span class="close-btn" id="close-analytics">&times;</span>
        <button class="analytics-export-btn" id="export-analytics">
          <i class="fa fa-download mr-1"></i> Export Analytics
        </button>
        <h4 style="margin: 0 0 24px 0; font-weight: 600; color: #2e3338;">Employee Conversion Rate Analytics</h4>
        <p id="analytics-date-range" style="color: #6c7680; margin-bottom: 16px;"></p>

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
                <th>Branch</th>
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

      <!-- Export Progress Modal -->
      <div class="modal-overlay" id="export-progress-overlay"></div>
      <div class="export-progress-modal" id="export-progress-modal">
        <h4>Exporting Data</h4>
        <div class="export-progress-percentage" id="export-progress-percentage">0%</div>
        <div class="export-progress-bar">
          <div class="export-progress-fill" id="export-progress-fill" style="width: 0%"></div>
        </div>
        <div class="export-progress-text" id="export-progress-text">Preparing export...</div>
        <button class="export-cancel-btn" id="export-cancel-btn">Cancel</button>
      </div>

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
        
        <div class="filter-container" id="filter-container">
          <div class="row mb-3">
            <div class="col-md-12 d-flex justify-content-between align-items-center">
              <h6 class="mb-0" style="font-weight: 500;">Filter Leads</h6>
              <button class="btn btn-sm btn-link text-danger" id="close-filters">
                <i class="fa fa-times"></i> Close
              </button>
            </div>
          </div>
        </div>

        <div class="card-body p-0">
          <div class="lead-table-container">
            <table class="table table-sm lead-table">
              <thead>
                <tr class="table-header">
                  <th width="60">Sr.No.</th>
                  <th class="hidden">Lead Name</th>
                  <th>Customer</th>
                  <th width="110">Contact</th>
                  <th>Source</th>
                  <th>Employee Name</th>
                  <th>Employee ID</th>
                  <th>Designation</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Region</th>
                  <th>Zone</th>
                  <th>Created On</th>
                </tr>
                <tr class="filter-row">
                  <th width="60"><input type="text" id="col-0-filter" placeholder="Filter Sr. No." class="col-filter"></th>
                  <th class="hidden"><input type="text" id="col-1-filter" placeholder="Filter Lead" class="col-filter"></th>
                  <th><input type="text" id="col-2-filter" placeholder="Filter Customer" class="col-filter"></th>
                  <th width="110"><input type="text" id="col-3-filter" placeholder="Filter Contact" class="col-filter"></th>
                  <th><input type="text" id="col-4-filter" placeholder="Filter Source" class="col-filter"></th>
                  <th><input type="text" id="col-5-filter" placeholder="Filter Employee" class="col-filter"></th>
                  <th><input type="text" id="col-6-filter" placeholder="Filter ID" class="col-filter"></th>
                  <th><input type="text" id="col-7-filter" placeholder="Filter Designation" class="col-filter"></th>
                  <th><input type="text" id="col-8-filter" placeholder="Filter Branch" class="col-filter"></th>
                  <th><input type="text" id="col-9-filter" placeholder="Filter Status" class="col-filter"></th>
                  <th><input type="text" id="col-10-filter" placeholder="Filter Region" class="col-filter"></th>
                  <th><input type="text" id="col-11-filter" placeholder="Filter Zone" class="col-filter"></th>
                  <th><input type="text" id="col-12-filter" placeholder="Filter Date" class="col-filter"></th>
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

      // Variables
      let currentLeads = [];
      let employeeMap = {};
      let analyticsData = [];
      let columnFilters = {};
      let isLoading = false;
      let hasMoreLeads = true;
      let currentPage = 1;
      let totalLeadsCount = 0;
      const pageSize = 50;
      let scrollTimeout;
      let exportCancelled = false;

      // Initialize column filters
      for (let i = 0; i < 13; i++) {
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

      // Function to get date filters for database queries
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

      // Function to get counts from database
      async function fetchLeadCounts() {
        const dateFilters = getDateFilters();

        try {
          // Get total count
          const totalCount = await frappe.db.count("Lead", {
            filters: dateFilters,
          });

          // Get converted count
          const convertedFilters = [
            ...dateFilters,
            ["status", "=", "Converted"],
          ];
          const convertedCount = await frappe.db.count("Lead", {
            filters: convertedFilters,
          });

          // Get follow up count
          const followUpFilters = [
            ...dateFilters,
            ["status", "=", "Follow Up"],
          ];
          const followUpCount = await frappe.db.count("Lead", {
            filters: followUpFilters,
          });

          // Get not interested count
          const notInterestedFilters = [
            ...dateFilters,
            ["status", "=", "Not Interested"],
          ];
          const notInterestedCount = await frappe.db.count("Lead", {
            filters: notInterestedFilters,
          });

          // Update the cards with actual counts from database
          $("#total-leads").text(totalCount);
          $("#converted-leads").text(convertedCount);
          $("#follow-up-leads").text(followUpCount);
          $("#not-interested-leads").text(notInterestedCount);

          totalLeadsCount = totalCount;

          return {
            total: totalCount,
            converted: convertedCount,
            followUp: followUpCount,
            notInterested: notInterestedCount,
          };
        } catch (error) {
          console.error("Error fetching lead counts:", error);
          return {
            total: 0,
            converted: 0,
            followUp: 0,
            notInterested: 0,
          };
        }
      }

      // **ENHANCED: Function to fetch all employees at once for better mapping**
      async function fetchAllEmployees() {
        try {
          console.log("Fetching all employees for mapping...");

          const employees = await frappe.call({
            method: "frappe.client.get_list",
            args: {
              doctype: "Employee",
              fields: [
                "name",
                "employee_name",
                "user_id",
                "designation",
                "branch",
                "employee_number",
                "first_name",
                "last_name",
              ],
              limit_page_length: 0, // Get all employees
              as_dict: true,
            },
          });

          const empMap = {};
          const employeeList = employees.message || [];

          console.log(`Found ${employeeList.length} employees to map`);

          employeeList.forEach((emp) => {
            if (emp.user_id) {
              // Use multiple fallback options for employee name
              const empName =
                emp.employee_name ||
                (emp.first_name && emp.last_name
                  ? `${emp.first_name} ${emp.last_name}`
                  : null) ||
                emp.first_name ||
                emp.user_id;

              empMap[emp.user_id] = {
                name: empName,
                id: emp.name,
                user_id: emp.user_id, // Include user_id for mapping
                employee_number: emp.employee_number || emp.name,
                designation: emp.designation || "-",
                branch: emp.branch || "-",
              };
            }
          });

          console.log(
            `Successfully mapped ${Object.keys(empMap).length} employees`
          );
          return empMap;
        } catch (error) {
          console.error("Error fetching all employees:", error);
          frappe.msgprint(`Error loading employee data: ${error.message}`);
          return {};
        }
      }

      // **IMPROVED: Updated employee mapping for new leads with better error handling**
      async function updateEmployeeMapping(newLeads) {
        const newOwners = [...new Set(newLeads.map((lead) => lead.lead_owner))];
        const unknownOwners = newOwners.filter(
          (owner) => owner && !employeeMap[owner]
        );

        if (unknownOwners.length > 0) {
          console.log(
            `Fetching data for ${unknownOwners.length} unknown employees:`,
            unknownOwners
          );

          try {
            const employees = await frappe.call({
              method: "frappe.client.get_list",
              args: {
                doctype: "Employee",
                fields: [
                  "name",
                  "employee_name",
                  "user_id",
                  "designation",
                  "branch",
                  "employee_number",
                  "first_name",
                  "last_name",
                ],
                filters: [["user_id", "in", unknownOwners]],
                as_dict: true,
              },
            });

            const employeeList = employees.message || [];

            employeeList.forEach((emp) => {
              const empName =
                emp.employee_name ||
                (emp.first_name && emp.last_name
                  ? `${emp.first_name} ${emp.last_name}`
                  : null) ||
                emp.first_name ||
                emp.user_id;

              employeeMap[emp.user_id] = {
                name: empName,
                id: emp.name,
                user_id: emp.user_id, // Include user_id for mapping
                employee_number: emp.employee_number || emp.name,
                designation: emp.designation || "-",
                branch: emp.branch || "-",
              };
              console.log(`Mapped employee: ${emp.user_id} -> ${empName}`);
            });

            // Add fallback for employees still not found
            unknownOwners.forEach((owner) => {
              if (!employeeMap[owner]) {
                console.warn(`Employee not found for user_id: ${owner}`);
                employeeMap[owner] = {
                  name: owner,
                  id: "-",
                  user_id: owner, // Include user_id for mapping
                  employee_number: "-",
                  designation: "Not Found",
                  branch: "Not Found",
                };
              }
            });
          } catch (error) {
            console.error("Error updating employee mapping:", error);
            // Add fallback for all unknown owners
            unknownOwners.forEach((owner) => {
              if (!employeeMap[owner]) {
                employeeMap[owner] = {
                  name: owner,
                  id: "-",
                  user_id: owner, // Include user_id for mapping
                  employee_number: "-",
                  designation: "Error",
                  branch: "Error",
                };
              }
            });
          }
        }
      }

      // Fixed infinite scroll setup
      function setupInfiniteScroll() {
        const tableContainer = document.querySelector(".lead-table-container");

        if (!tableContainer) {
          console.error("Table container not found for infinite scroll");
          return;
        }

        // Remove any existing scroll listeners
        tableContainer.removeEventListener("scroll", handleScroll);

        function handleScroll() {
          const { scrollTop, scrollHeight, clientHeight } = tableContainer;

          // Check if we're near the bottom (within 200px)
          const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200;

          if (isNearBottom && !isLoading && hasMoreLeads) {
            fetchLeadsPage(currentPage);
          }
        }

        // Throttle scroll events to improve performance
        tableContainer.addEventListener("scroll", () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(handleScroll, 100);
        });
      }

      // Updated fetchLeadsPage function with improved limits
      async function fetchLeadsPage(page) {
        if (isLoading || !hasMoreLeads) return;

        isLoading = true;
        $("#loading-indicator").show();

        try {
          const filters = getDateFilters();

          const leads = await frappe.db.get_list("Lead", {
            fields: [
              "name",
              "status",
              "lead_owner",
              "creation",
              "custom_branch as branch",
              "source",
              "lead_name",
              "custom_region as region",
              "custom_zone as zone",
              "mobile_no as contact",
            ],
            filters: filters,
            limit_start: (page - 1) * pageSize,
            limit: pageSize,
            limit_page_length: 0, // Remove default 20 record limit
            order_by: "creation desc",
          });

          if (leads.length < pageSize) hasMoreLeads = false;

          // Update employee mapping for new leads
          await updateEmployeeMapping(leads);

          if (page === 1) {
            currentLeads = leads;
          } else {
            currentLeads = [...currentLeads, ...leads];
          }

          render_lead_list(currentLeads);

          if (leads.length > 0) currentPage++;
        } catch (error) {
          console.error("Error fetching leads:", error);
          frappe.msgprint("Error loading leads. Please try again.");
          hasMoreLeads = false;
        } finally {
          isLoading = false;
          $("#loading-indicator").hide();
        }
      }

      // **IMPROVED: Updated render function to better handle employee data**
      function render_lead_list(leads) {
        const filteredLeads = getFilteredLeads(leads);

        const rows = filteredLeads
          .map((lead, index) => {
            const emp = employeeMap[lead.lead_owner];
            const empName = emp ? emp.name : lead.lead_owner || "Unknown";
            const empId = emp ? emp.id : "-";
            const empDesignation = emp ? emp.designation : "-";

            return `
            <tr>
              <td width="60" class="row-number">${index + 1}</td>
              <td class="hidden">
                <span class="lead-link" onclick="frappe.set_route('Form/Lead/${
                  lead.name
                }')">
                  ${lead.name}
                </span>
              </td>
              <td>${lead.lead_name || "-"}</td>
              <td width="110">${lead.contact || "-"}</td>
              <td>${lead.source || "-"}</td>
              <td>${empName}</td>
              <td>${empId}</td>
              <td>${empDesignation}</td>
              <td>${lead.branch || "-"}</td>
              <td><span class="badge ${getStatusBadgeClass(lead.status)}">${
              lead.status
            }</span></td>
              <td>${lead.region || "-"}</td>
              <td>${lead.zone || "-"}</td>
              <td>${formatDateTimeForDisplay(lead.creation)}</td>
            </tr>
          `;
          })
          .join("");

        const tbody = document.getElementById("lead-content");
        if (tbody) tbody.innerHTML = rows;

        $("#record-count").text(
          `Showing ${filteredLeads.length} of ${totalLeadsCount} records (${currentLeads.length} loaded)`
        );

        if (currentLeads.length > 0) setupInfiniteScroll();
      }

      // **IMPROVED: Initial load with employee data**
      async function fetchAndRenderLeads() {
        currentPage = 1;
        hasMoreLeads = true;
        currentLeads = [];
        isLoading = false;

        const tbody = document.getElementById("lead-content");
        if (tbody) tbody.innerHTML = "";

        $("#loading-indicator").show();

        // **Load employee data first if not already loaded**
        if (Object.keys(employeeMap).length === 0) {
          employeeMap = await fetchAllEmployees();
        }

        await fetchLeadCounts();
        await fetchLeadsPage(currentPage);
        updateURL();
      }

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

      function getFilteredLeads(leads) {
        return leads.filter((l) => {
          const emp = employeeMap[l.lead_owner];
          const empName = emp ? emp.name : l.lead_owner || "Unknown";
          const empId = emp ? emp.id : "-";
          const empDesignation = emp ? emp.designation : "-";

          const rowValues = [
            "", // # column is handled separately
            l.name.toLowerCase(),
            (l.lead_name || "").toLowerCase(),
            (l.contact || "").toLowerCase(),
            (l.source || "").toLowerCase(),
            empName.toLowerCase(),
            empId.toLowerCase(),
            empDesignation.toLowerCase(),
            (l.branch || "").toLowerCase(),
            l.status.toLowerCase(),
            (l.region || "").toLowerCase(),
            (l.zone || "").toLowerCase(),
            formatDateTimeForDisplay(l.creation).toLowerCase(),
          ];

          return Object.entries(columnFilters).every(([col, filter]) => {
            if (!filter) return true;
            return (
              rowValues[col] && rowValues[col].includes(filter.toLowerCase())
            );
          });
        });
      }

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

      // Set up column filter event handlers
      $(".col-filter").on("input", function () {
        const colIndex = parseInt(this.id.split("-")[1]);
        columnFilters[colIndex] = $(this).val();
        render_lead_list(currentLeads);
      });

      // Show analytics modal
      $("#view-analytics").on("click", function () {
        generateAnalyticsData();
        $("#analytics-overlay").show();
        $("#analytics-modal").show();
      });

      // Close analytics modal
      $("#close-analytics, #analytics-overlay").on("click", function () {
        $("#analytics-overlay").hide();
        $("#analytics-modal").hide();
      });

      // Export Analytics as CSV
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
          Branch: row.branch,
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

      // **COMPLETELY REWRITTEN Export CSV function with comprehensive employee mapping**
      $("#export-csv").on("click", async function () {
        try {
          showExportProgress();
          updateExportProgress(5, "Initializing export...");

          if (exportCancelled) return;

          // **CRITICAL: Load ALL employee data first**
          updateExportProgress(10, "Loading complete employee database...");
          employeeMap = await fetchAllEmployees();

          if (Object.keys(employeeMap).length === 0) {
            hideExportProgress();
            frappe.msgprint(
              "Warning: No employee data found. Employee names and IDs may not appear correctly in the export."
            );
            // Continue with export but warn user
          }

          const filters = getDateFilters();

          // Get total count
          const totalCount = await frappe.db.count("Lead", {
            filters: filters,
          });

          if (totalCount === 0) {
            hideExportProgress();
            frappe.msgprint("No leads found for the selected filters.");
            return;
          }

          updateExportProgress(
            20,
            `Found ${totalCount} leads. Starting data fetch...`
          );

          if (exportCancelled) return;

          let allLeads = [];
          const batchSize = 200; // Smaller batch size for reliability
          const totalBatches = Math.ceil(totalCount / batchSize);
          const maxRecords = 50000;

          if (totalCount > maxRecords) {
            hideExportProgress();
            frappe.msgprint(
              `Dataset too large (${totalCount} records). Maximum export limit is ${maxRecords} records. Please apply date filters to reduce the dataset size.`
            );
            return;
          }

          // Fetch leads in batches
          for (let i = 0; i < totalBatches; i++) {
            if (exportCancelled) return;

            const batchProgress = 20 + (i / totalBatches) * 40;
            updateExportProgress(
              Math.round(batchProgress),
              `Fetching batch ${i + 1} of ${totalBatches} (${
                allLeads.length
              }/${totalCount} records)`
            );

            try {
              const response = await frappe.call({
                method: "frappe.client.get_list",
                args: {
                  doctype: "Lead",
                  fields: [
                    "name",
                    "status",
                    "lead_owner",
                    "creation",
                    "custom_branch",
                    "source",
                    "lead_name",
                    "custom_region",
                    "custom_zone",
                    "mobile_no",
                  ],
                  filters: filters,
                  limit_start: i * batchSize,
                  limit_page_length: batchSize,
                  order_by: "creation desc",
                  as_dict: true,
                },
                freeze: false,
              });

              const batchLeads = response.message || [];

              const transformedLeads = batchLeads.map((lead) => ({
                name: lead.name,
                status: lead.status,
                lead_owner: lead.lead_owner,
                creation: lead.creation,
                branch: lead.custom_branch,
                source: lead.source,
                lead_name: lead.lead_name,
                region: lead.custom_region,
                zone: lead.custom_zone,
                contact: lead.mobile_no,
              }));

              allLeads = [...allLeads, ...transformedLeads];

              // Delay to prevent server overload
              await new Promise((resolve) => setTimeout(resolve, 150));
            } catch (batchError) {
              console.error(`Error in batch ${i + 1}:`, batchError);
              updateExportProgress(
                Math.round(batchProgress),
                `Error in batch ${i + 1}, continuing...`
              );
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          if (exportCancelled) return;

          if (allLeads.length === 0) {
            hideExportProgress();
            frappe.msgprint("No leads found for the selected filters.");
            return;
          }

          updateExportProgress(65, "Processing employee information...");

          // **CRITICAL: Ensure ALL employee mappings are complete**
          const uniqueOwners = [
            ...new Set(allLeads.map((lead) => lead.lead_owner).filter(Boolean)),
          ];
          const missingOwners = uniqueOwners.filter(
            (owner) => !employeeMap[owner]
          );

          if (missingOwners.length > 0) {
            updateExportProgress(
              70,
              `Fetching additional employee data for ${missingOwners.length} employees...`
            );

            // Process missing employees in smaller chunks
            const chunkSize = 50;
            for (let i = 0; i < missingOwners.length; i += chunkSize) {
              if (exportCancelled) return;

              const chunk = missingOwners.slice(i, i + chunkSize);

              try {
                const employees = await frappe.call({
                  method: "frappe.client.get_list",
                  args: {
                    doctype: "Employee",
                    fields: [
                      "name",
                      "employee_name",
                      "user_id",
                      "designation",
                      "branch",
                      "employee_number",
                      "first_name",
                      "last_name",
                    ],
                    filters: [["user_id", "in", chunk]],
                    as_dict: true,
                  },
                });

                const employeeList = employees.message || [];

                employeeList.forEach((emp) => {
                  const empName =
                    emp.employee_name ||
                    (emp.first_name && emp.last_name
                      ? `${emp.first_name} ${emp.last_name}`
                      : null) ||
                    emp.first_name ||
                    emp.user_id;

                  employeeMap[emp.user_id] = {
                    name: empName,
                    id: emp.name,
                    user_id: emp.user_id,
                    employee_number: emp.employee_number || emp.name,
                    designation: emp.designation || "-",
                    branch: emp.branch || "-",
                  };
                  console.log(
                    `CSV Export - Mapped: ${emp.user_id} -> ${empName}`
                  );
                });
              } catch (empError) {
                console.error("Error fetching chunk of employees:", empError);
              }
            }

            // Final fallback for any still missing employees
            missingOwners.forEach((owner) => {
              if (!employeeMap[owner]) {
                console.warn(
                  `CSV Export - Employee mapping still missing for: ${owner}`
                );
                employeeMap[owner] = {
                  name: owner,
                  id: "Not Found",
                  user_id: owner,
                  employee_number: "Not Found",
                  designation: "Not Found",
                  branch: "Not Found",
                };
              }
            });
          }

          updateExportProgress(75, "Applying filters...");

          // Apply column filters
          const filteredLeads = allLeads.filter((lead) => {
            const emp = employeeMap[lead.lead_owner];
            const empName = emp ? emp.name : lead.lead_owner || "Unknown";
            const empId = emp ? emp.id : "-";
            const empDesignation = emp ? emp.designation : "-";

            const rowValues = [
              "",
              lead.name.toLowerCase(),
              (lead.lead_name || "").toLowerCase(),
              (lead.contact || "").toLowerCase(),
              (lead.source || "").toLowerCase(),
              empName.toLowerCase(),
              empId.toLowerCase(),
              empDesignation.toLowerCase(),
              (lead.branch || "").toLowerCase(),
              lead.status.toLowerCase(),
              (lead.region || "").toLowerCase(),
              (lead.zone || "").toLowerCase(),
              formatDateTimeForDisplay(lead.creation).toLowerCase(),
            ];

            return Object.entries(columnFilters).every(([col, filter]) => {
              if (!filter) return true;
              return (
                rowValues[col] && rowValues[col].includes(filter.toLowerCase())
              );
            });
          });

          if (filteredLeads.length === 0) {
            hideExportProgress();
            frappe.msgprint("No data available for the current filters.");
            return;
          }

          updateExportProgress(85, "Generating CSV data...");

          // Generate CSV
          const headers = [
            "#",
            "Lead Name",
            "Customer",
            "Contact",
            "Source",
            "Employee Name",
            "Employee ID",
            "Employee Number",
            "User ID", // Include User ID column
            "Designation",
            "Branch",
            "Status",
            "Region",
            "Zone",
            "Created On",
          ];

          let csvContent = headers.join(",") + "\n";

          // Process leads in chunks for CSV generation
          const csvChunkSize = 500;
          for (let i = 0; i < filteredLeads.length; i += csvChunkSize) {
            if (exportCancelled) return;

            const chunk = filteredLeads.slice(i, i + csvChunkSize);
            const chunkContent = chunk
              .map((lead, index) => {
                const emp = employeeMap[lead.lead_owner];

                // Debug logging for mapping issues
                if (!emp && lead.lead_owner) {
                  console.warn(
                    `No employee mapping found for lead_owner: ${lead.lead_owner}`
                  );
                } else if (emp) {
                  console.log(
                    `Successfully mapped lead_owner: ${lead.lead_owner} -> Employee: ${emp.name} (ID: ${emp.id})`
                  );
                }

                const data = {
                  "#": i + index + 1,
                  "Lead Name": lead.name || "-",
                  Customer: lead.lead_name || "-",
                  Contact: lead.contact || "-",
                  Source: lead.source || "-",
                  "Employee Name": emp
                    ? emp.name
                    : lead.lead_owner || "Unknown",
                  "Employee ID": emp ? emp.id : "Not Found",
                  "Employee Number": emp ? emp.employee_number : "Not Found",
                  "User ID": emp ? emp.user_id : lead.lead_owner || "Not Found",
                  Designation: emp ? emp.designation : "Not Found",
                  Branch: (emp ? emp.branch : null) || lead.branch || "-",
                  Status: lead.status || "-",
                  Region: lead.region || "-",
                  Zone: lead.zone || "-",
                  "Created On": formatDateTimeForDisplay(lead.creation),
                };

                return headers
                  .map((header) => {
                    let value = data[header] || "";
                    if (typeof value === "string" && value.includes(",")) {
                      value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                  })
                  .join(",");
              })
              .join("\n");

            csvContent += chunkContent + "\n";

            const csvProgress =
              85 + ((i + csvChunkSize) / filteredLeads.length) * 10;
            updateExportProgress(
              Math.round(csvProgress),
              `Processing records ${i + 1} to ${Math.min(
                i + csvChunkSize,
                filteredLeads.length
              )} of ${filteredLeads.length}...`
            );
          }

          updateExportProgress(95, "Creating download file...");

          const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `leads_complete_${frappe.datetime.get_today()}_${
            filteredLeads.length
          }_records.csv`;

          document.body.appendChild(link);
          updateExportProgress(100, "Download starting...");
          link.click();

          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            hideExportProgress();

            // Show detailed completion message
            frappe.msgprint({
              title: "Export Completed Successfully",
              message: `Successfully exported ${filteredLeads.length} leads!`,
              indicator: "green",
            });
          }, 1000);
        } catch (error) {
          console.error("Export error:", error);
          hideExportProgress();
          frappe.msgprint({
            title: "Export Failed",
            message: `An error occurred while exporting: ${error.message}. Please try again with a smaller date range.`,
            indicator: "red",
          });
        }
      });

      function generateAnalyticsData() {
        const employeeStats = {};

        currentLeads.forEach((lead) => {
          const emp = employeeMap[lead.lead_owner];
          const empKey = lead.lead_owner;

          if (!employeeStats[empKey]) {
            employeeStats[empKey] = {
              employeeName: emp ? emp.name : lead.lead_owner,
              employeeId: emp ? emp.id : "-",
              designation: emp ? emp.designation : "-",
              branch: lead.branch || "-",
              totalLeads: 0,
              converted: 0,
              followUp: 0,
              notInterested: 0,
              conversionRate: 0,
            };
          }

          employeeStats[empKey].totalLeads++;

          switch (lead.status) {
            case "Converted":
              employeeStats[empKey].converted++;
              break;
            case "Follow Up":
              employeeStats[empKey].followUp++;
              break;
            case "Not Interested":
              employeeStats[empKey].notInterested++;
              break;
          }
        });

        analyticsData = Object.values(employeeStats).map((emp) => {
          emp.conversionRate =
            emp.totalLeads > 0
              ? Math.round((emp.converted / emp.totalLeads) * 100)
              : 0;
          return emp;
        });

        analyticsData.sort((a, b) => b.conversionRate - a.conversionRate);

        const fromDate = $("#from-date").val();
        const toDate = $("#to-date").val();

        let fromDateText = fromDate
          ? frappe.datetime.str_to_user(fromDate)
          : "N/A";
        let toDateText = toDate ? frappe.datetime.str_to_user(toDate) : "N/A";

        $("#analytics-date-range").text(
          `Date Range: ${fromDateText} to ${toDateText}`
        );

        renderAnalyticsTable();
        renderAnalyticsSummary();
      }

      function renderAnalyticsSummary() {
        const totalEmployees = analyticsData.length;
        const avgConversionRate =
          analyticsData.length > 0
            ? Math.round(
                analyticsData.reduce(
                  (sum, emp) => sum + emp.conversionRate,
                  0
                ) / analyticsData.length
              )
            : 0;
        const topPerformer = analyticsData.length > 0 ? analyticsData[0] : null;
        const totalConverted = analyticsData.reduce(
          (sum, emp) => sum + emp.converted,
          0
        );

        const summaryHtml = `
          <div class="summary-card">
            <h4>${totalEmployees}</h4>
            <p>Total Employees</p>
          </div>
          <div class="summary-card">
            <h4>${avgConversionRate}%</h4>
            <p>Average Conversion Rate</p>
          </div>
          <div class="summary-card">
            <h4>${totalConverted}</h4>
            <p>Total Conversions</p>
          </div>
          <div class="summary-card">
            <h4>${topPerformer ? topPerformer.employeeName : "-"}</h4>
            <p>Top Performer (${
              topPerformer ? topPerformer.conversionRate : 0
            }%)</p>
          </div>
        `;

        $("#analytics-summary").html(summaryHtml);
      }

      function renderAnalyticsTable() {
        const tableBody = $("#analytics-table-body");

        if (analyticsData.length === 0) {
          tableBody.html(
            '<tr><td colspan="11" class="text-center">No data available</td></tr>'
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
              <td>${emp.branch}</td>
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

      // Auto-apply filters when date changes
      $("#from-date, #to-date").on("change", function () {
        fetchAndRenderLeads();
      });

      // Initial load
      fetchAndRenderLeads();
    }
  );
};
