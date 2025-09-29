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

      // Complete CSS styling for modern CRM interface with analytics
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
                    <th width="60"><input type="text" id="col-0-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-1-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-2-filter" placeholder="Filter..." class="col-filter"></th>
                    <th width="110"><input type="text" id="col-3-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-4-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-5-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-6-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-7-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-8-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-9-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-10-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-11-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-12-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-13-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-14-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-15-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-16-filter" placeholder="Filter..." class="col-filter"></th>
                    <th><input type="text" id="col-17-filter" placeholder="Filter..." class="col-filter"></th>
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

      // Fetch employee mapping using custom API with permission bypass
      async function fetchAllEmployees() {
        try {
          console.log("Fetching employees via custom lead owner data API...");

          const response = await frappe.call({
            method: "sahayog.scrm.api.lead_owner_data.get_employee_mapping",
          });

          const empMap = response.message || {};
          console.log(
            `Successfully fetched ${
              Object.keys(empMap).length
            } employees via custom API`
          );

          return empMap;
        } catch (error) {
          console.error("Custom employee API failed:", error);
          frappe.msgprint({
            title: "Employee Data Warning",
            message:
              "Could not load employee data via custom API. Some information may appear as 'Unknown'.",
            indicator: "orange",
          });
          return await fetchAllEmployeesOriginal();
        }
      }

      // Fetch branch to SOL ID mapping using custom API
      async function fetchAllBranches() {
        try {
          console.log("Fetching branches via custom lead owner data API...");

          const response = await frappe.call({
            method: "sahayog.scrm.api.lead_owner_data.get_branch_mapping",
          });

          const branchMap = response.message || {};
          console.log(
            `Successfully fetched ${
              Object.keys(branchMap).length
            } branches with SOL IDs via custom API`
          );

          return branchMap;
        } catch (error) {
          console.error("Custom branch API failed:", error);
          frappe.msgprint({
            title: "Branch Data Warning",
            message:
              "Could not load branch SOL ID mapping. SOL IDs may appear as '-'.",
            indicator: "orange",
          });
          return {};
        }
      }

      // Most efficient: Combined API call for both employee and branch data
      async function fetchCRMMasterData() {
        try {
          console.log(
            "Fetching CRM master data via combined lead owner API..."
          );

          const response = await frappe.call({
            method: "sahayog.scrm.api.lead_owner_data.get_crm_master_data",
          });

          const data = response.message || {};
          const empMap = data.employees || {};
          const branchMap = data.branches || {};
          const stats = data.stats || {};

          console.log(
            `Successfully fetched master data: ${stats.total_employees} employees, ${stats.total_branches} branches`
          );

          return {
            employees: empMap,
            branches: branchMap,
          };
        } catch (error) {
          console.error("Combined master data API failed:", error);
          frappe.msgprint({
            title: "Master Data Warning",
            message: "Custom API failed. Attempting fallback methods...",
            indicator: "orange",
          });

          // Fallback to individual API calls
          const employees = await fetchAllEmployees();
          const branches = await fetchAllBranches();
          return { employees, branches };
        }
      }

      // Fallback employee fetching method if custom API fails
      async function fetchAllEmployeesOriginal() {
        try {
          console.log("Using fallback employee fetch method...");

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
                "custom_district",
              ],
              limit_page_length: 0,
              as_dict: true,
            },
          });

          // Process employee mapping similar to custom API format
          const empMap = {};
          const employeeList = employees.message || [];

          employeeList.forEach((emp) => {
            if (emp.user_id) {
              const empName =
                emp.employee_name ||
                (emp.first_name && emp.last_name
                  ? `${emp.first_name} ${emp.last_name}`
                  : emp.first_name || emp.user_id);

              empMap[emp.user_id] = {
                name: empName,
                id: emp.name,
                user_id: emp.user_id,
                employee_number: emp.employee_number || emp.name,
                designation: emp.designation || "-",
                branch: emp.branch || "-",
                district: emp.custom_district || "-",
              };
            }
          });

          console.log(
            `Mapped ${
              Object.keys(empMap).length
            } employees using fallback method`
          );
          return empMap;
        } catch (error) {
          console.error("Fallback employee fetch also failed:", error);
          return {};
        }
      }

      // Update employee mapping for new lead owners encountered during pagination
      async function updateEmployeeMapping(newLeads) {
        // Extract unique lead owners from new leads
        const newOwners = [...new Set(newLeads.map((lead) => lead.lead_owner))];
        const unknownOwners = newOwners.filter(
          (owner) => owner && !employeeMap[owner]
        );

        if (unknownOwners.length > 0) {
          console.log(
            `Fetching data for ${unknownOwners.length} unknown lead owners:`,
            unknownOwners
          );

          try {
            // Use custom API to fetch unknown employees by user IDs
            const response = await frappe.call({
              method:
                "sahayog.scrm.api.lead_owner_data.get_employee_by_user_ids",
              args: {
                user_ids: unknownOwners,
              },
            });

            const employees = response.message || [];

            // Process fetched employees and add to global mapping
            employees.forEach((emp) => {
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
                district: emp.custom_district || "-",
              };
              console.log(`Mapped new employee: ${emp.user_id} -> ${empName}`);
            });

            // Handle employees not found in database
            unknownOwners.forEach((owner) => {
              if (!employeeMap[owner]) {
                console.warn(`Employee not found for user_id: ${owner}`);
                employeeMap[owner] = {
                  name: owner,
                  id: "-",
                  user_id: owner,
                  employee_number: "-",
                  designation: "Not Found",
                  branch: "Not Found",
                  district: "Not Found",
                };
              }
            });
          } catch (error) {
            console.error("Error updating employee mapping:", error);
            // Set fallback data for failed lookups to prevent display issues
            unknownOwners.forEach((owner) => {
              if (!employeeMap[owner]) {
                employeeMap[owner] = {
                  name: owner,
                  id: "-",
                  user_id: owner,
                  employee_number: "-",
                  designation: "API Error",
                  branch: "API Error",
                  district: "API Error",
                };
              }
            });
          }
        }
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

      // Fetch lead counts for dashboard cards display
      async function fetchLeadCounts() {
        const dateFilters = getDateFilters();

        try {
          // Fetch total leads count
          const totalCount = await frappe.db.count("Lead", {
            filters: dateFilters,
          });

          // Fetch converted leads count
          const convertedFilters = [
            ...dateFilters,
            ["status", "=", "Converted"],
          ];
          const convertedCount = await frappe.db.count("Lead", {
            filters: convertedFilters,
          });

          // Fetch follow up leads count
          const followUpFilters = [
            ...dateFilters,
            ["status", "=", "Follow Up"],
          ];
          const followUpCount = await frappe.db.count("Lead", {
            filters: followUpFilters,
          });

          // Fetch not interested leads count
          const notInterestedFilters = [
            ...dateFilters,
            ["status", "=", "Not Interested"],
          ];
          const notInterestedCount = await frappe.db.count("Lead", {
            filters: notInterestedFilters,
          });

          // Update dashboard card displays with fetched counts
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

      // Fetch leads page with product information for infinite scrolling
      async function fetchLeadsPage(page) {
        if (isLoading || !hasMoreLeads) return;

        isLoading = true;
        $("#loading-indicator").show();

        try {
          const filters = getDateFilters();

          // Fetch basic lead information with pagination
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
            limit_page_length: 0,
            order_by: "creation desc",
          });

          console.log(`Fetched ${leads.length} leads for page ${page}`);

          // Check if this is the last page for infinite scrolling
          if (leads.length < pageSize) hasMoreLeads = false;

          // Fetch complete lead documents with product information
          const leadsWithProducts = await Promise.all(
            leads.map(async (lead) => {
              try {
                // Get complete lead document to access product table
                const fullLead = await frappe.call({
                  method: "frappe.client.get",
                  args: {
                    doctype: "Lead",
                    name: lead.name,
                  },
                });

                const leadDoc = fullLead.message;
                const products = leadDoc.custom_product_table || [];

                // Format and sort products by index for consistent display
                const formattedProducts = products
                  .map((product) => ({
                    product: product.product || "Unknown Product",
                    product_name: product.product_name || "Unknown Product",
                    amount: parseFloat(product.product_amount) || 0,
                    idx: product.idx || 0,
                  }))
                  .sort((a, b) => a.idx - b.idx);

                return {
                  ...lead,
                  products: formattedProducts,
                };
              } catch (error) {
                console.warn(
                  `Failed to fetch products for lead ${lead.name}:`,
                  error
                );
                return {
                  ...lead,
                  products: [],
                };
              }
            })
          );

          console.log(
            "Leads with products processed:",
            leadsWithProducts.length
          );

          // Update employee mapping for any new lead owners found
          await updateEmployeeMapping(leadsWithProducts);

          // Append to current leads array or replace for first page
          if (page === 1) {
            currentLeads = leadsWithProducts;
          } else {
            currentLeads = [...currentLeads, ...leadsWithProducts];
          }

          // Render the updated lead list in the table
          renderLeadList(currentLeads);

          // Increment page number for next fetch
          if (leadsWithProducts.length > 0) currentPage++;
        } catch (error) {
          console.error("Error fetching leads page:", error);
          frappe.msgprint("Error loading leads. Please try again.");
          hasMoreLeads = false;
        } finally {
          isLoading = false;
          $("#loading-indicator").hide();
        }
      }

      // Render lead list with product rows and complete employee information
      function renderLeadList(leads) {
        const filteredLeads = getFilteredLeads(leads);
        console.log(`Rendering ${filteredLeads.length} filtered leads`);

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
          console.log("Table rows updated successfully");
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

        // Remove existing scroll listener to prevent duplicates
        tableContainer.removeEventListener("scroll", handleScroll);

        function handleScroll() {
          const { scrollTop, scrollHeight, clientHeight } = tableContainer;
          const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200;

          if (isNearBottom && !isLoading && hasMoreLeads) {
            fetchLeadsPage(currentPage);
          }
        }

        // Add throttled scroll listener for optimal performance
        tableContainer.addEventListener("scroll", () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(handleScroll, 100);
        });
      }

      // Update URL with current filter parameters for bookmarking
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

      // Main initialization function for loading and rendering CRM data
      async function fetchAndRenderLeads() {
        // Reset pagination state for fresh data load
        currentPage = 1;
        hasMoreLeads = true;
        currentLeads = [];
        isLoading = false;

        // Clear existing table content
        const tbody = document.getElementById("lead-content");
        if (tbody) tbody.innerHTML = "";

        $("#loading-indicator").show();

        try {
          // Load master data (employees and branches) using custom API
          console.log("Loading master data for CRM system...");
          const masterData = await fetchCRMMasterData();
          employeeMap = masterData.employees;
          branchMap = masterData.branches;

          console.log("Master data loaded successfully");
          console.log(`Employees loaded: ${Object.keys(employeeMap).length}`);
          console.log(`Branches loaded: ${Object.keys(branchMap).length}`);

          // Show success message for data loading
          if (Object.keys(employeeMap).length > 0) {
            // frappe.show_alert(
            //   {
            //     message: `Loaded ${
            //       Object.keys(employeeMap).length
            //     } employees, ${Object.keys(branchMap).length} branches`,
            //     indicator: "green",
            //   },
            //   2
            // );
          }
        } catch (error) {
          console.error("Error loading master data:", error);
          // Continue with empty mappings - system will still function with limited info
          employeeMap = {};
          branchMap = {};
          console.warn("Continuing with limited employee/branch data...");
        }

        // Load dashboard counts and first page of leads
        await fetchLeadCounts();
        await fetchLeadsPage(currentPage);
        updateURL();
      }

      // Complete Analytics Implementation
      async function generateAnalyticsData() {
        try {
          $("#analytics-loading").show();
          $("#analytics-content").hide();

          const filters = getDateFilters();
          console.log("Starting analytics generation for all leads...");

          let allAnalyticsLeads = [];
          const batchSize = 500;
          let batchStart = 0;
          let hasMore = true;

          const totalCount = await frappe.db.count("Lead", {
            filters: filters,
          });

          console.log(`Total leads for analytics: ${totalCount}`);

          if (totalCount === 0) {
            $("#analytics-loading").hide();
            $("#analytics-content").show();
            $("#analytics-table-body").html(
              '<tr><td colspan="13" class="text-center">No data available for the selected date range</td></tr>'
            );
            renderAnalyticsSummary([]);
            return;
          }

          // Fetch all leads in batches for analytics
          while (hasMore) {
            try {
              console.log(
                `Fetching analytics batch starting from ${batchStart}`
              );

              const batchLeads = await frappe.call({
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
                  limit_start: batchStart,
                  limit_page_length: batchSize,
                  order_by: "creation desc",
                  as_dict: true,
                },
              });

              const leads = batchLeads.message || [];

              if (leads.length === 0) {
                hasMore = false;
                break;
              }

              const transformedLeads = leads.map((lead) => ({
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

              allAnalyticsLeads = [...allAnalyticsLeads, ...transformedLeads];
              await updateEmployeeMapping(transformedLeads);

              batchStart += batchSize;

              if (leads.length < batchSize) {
                hasMore = false;
              }

              if (allAnalyticsLeads.length >= totalCount) {
                hasMore = false;
              }
            } catch (batchError) {
              console.error("Error in analytics batch:", batchError);
              hasMore = false;
            }
          }

          console.log(`Loaded ${allAnalyticsLeads.length} leads for analytics`);

          // Process analytics data
          const employeeStats = {};

          allAnalyticsLeads.forEach((lead) => {
            const emp = employeeMap[lead.lead_owner];
            const empKey = lead.lead_owner || "unknown";

            if (!employeeStats[empKey]) {
              const empBranch = emp ? emp.branch : lead.branch || "-";
              const solId = branchMap[empBranch] || "-";

              employeeStats[empKey] = {
                employeeName: emp ? emp.name : lead.lead_owner || "Unknown",
                employeeId: emp ? emp.id : "-",
                designation: emp ? emp.designation : "-",
                solId: solId,
                branch: empBranch,
                district: emp ? emp.district : "-",
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

          // Sort by conversion rate, then by total leads
          analyticsData.sort((a, b) => {
            if (b.conversionRate !== a.conversionRate) {
              return b.conversionRate - a.conversionRate;
            }
            return b.totalLeads - a.totalLeads;
          });

          console.log(
            `Generated analytics for ${analyticsData.length} employees`
          );

          const fromDate = $("#from-date").val();
          const toDate = $("#to-date").val();

          let fromDateText = fromDate
            ? frappe.datetime.str_to_user(fromDate)
            : "N/A";
          let toDateText = toDate ? frappe.datetime.str_to_user(toDate) : "N/A";

          $("#analytics-date-range").text(
            `Date Range: ${fromDateText} to ${toDateText} | Total Leads Analyzed: ${allAnalyticsLeads.length}`
          );

          $("#analytics-loading").hide();
          $("#analytics-content").show();

          renderAnalyticsTable();
          renderAnalyticsSummary();
        } catch (error) {
          console.error("Error generating analytics:", error);
          $("#analytics-loading").hide();
          frappe.msgprint({
            title: "Analytics Error",
            message: `Failed to generate analytics: ${error.message}`,
            indicator: "red",
          });
        }
      }

      // Render analytics summary cards
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
        const totalConverted = analyticsData.reduce(
          (sum, emp) => sum + emp.converted,
          0
        );
        const totalLeads = analyticsData.reduce(
          (sum, emp) => sum + emp.totalLeads,
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
            <h4>${totalLeads}</h4>
            <p>Total Leads Analyzed</p>
          </div>
          <div class="summary-card">
            <h4>${totalConverted}</h4>
            <p>Total Conversions</p>
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

      // Export CSV functionality with complete lead and product data
      $("#export-csv").on("click", function () {
        if (expandedLeadRows.length === 0) {
          frappe.msgprint(
            "No data available for export. Please load some leads first."
          );
          return;
        }

        try {
          // Create comprehensive CSV content from expanded rows
          const headers = [
            "#",
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

          expandedLeadRows.forEach((row, index) => {
            const csvData = [
              index + 1,
              row.leadId,
              row.customerName,
              row.contact,
              row.source,
              row.productCode,
              row.productName,
              row.amount,
              row.empName,
              row.empId,
              row.empDesignation,
              row.solId,
              row.empBranch,
              row.empDistrict,
              row.status,
              row.region,
              row.zone,
              row.createdOn,
            ];

            // Properly escape CSV values that contain commas or quotes
            const escapedData = csvData.map((value) => {
              if (
                typeof value === "string" &&
                (value.includes(",") ||
                  value.includes("\n") ||
                  value.includes('"'))
              ) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            });

            csvContent += escapedData.join(",") + "\n";
          });

          // Create and trigger download
          const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `crm_leads_with_products_sol_id_${frappe.datetime.get_today()}_${
            expandedLeadRows.length
          }_rows.csv`;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          frappe.msgprint({
            title: "Export Completed Successfully",
            message: `Successfully exported ${expandedLeadRows.length} product rows with complete lead owner and SOL ID information!`,
            indicator: "green",
          });
        } catch (error) {
          console.error("Export error:", error);
          frappe.msgprint({
            title: "Export Failed",
            message: `An error occurred while exporting: ${error.message}`,
            indicator: "red",
          });
        }
      });

      // Initialize the CRM Lead Management application
      console.log(
        "Initializing CRM Lead Management System with custom APIs and analytics..."
      );
      fetchAndRenderLeads();
    }
  );
};
