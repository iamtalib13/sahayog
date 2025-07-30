frappe.pages["crm-lead-management"].on_page_load = async function (wrapper) {
  frappe.require(["/assets/sahayog/js/chart.min.js"], async () => {
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
.stats-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 24px;
  border-radius: 8px;
  z-index: 1050;
  width: 85%;
  max-width: 1000px;
  max-height: 85vh;
  overflow: auto;
  display: none;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}
.stats-modal .close-btn {
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

.filter-container {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px 8px 0 0;
  display: none;
}

/* Improved Table Styles */
.lead-table-container {
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  max-height: 500px;
  overflow-y: auto;
}

.lead-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.lead-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
}

.lead-table th, 
.lead-table td {
  padding: 12px 8px;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid #e0e6ed;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lead-table thead th {
  background: #f5f7fa;
  font-weight: 600;
  color: #2e3338;
  position: sticky;
  top: 0;
}

.lead-table thead tr.filter-row th {
  top: 40px;
  padding: 0;
  background: #f5f7fa;
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

.lead-table tbody tr:hover {
  background-color: #f9fafb;
}

/* Column Widths */
.lead-table th:nth-child(1),
.lead-table td:nth-child(1) {
  width: 60px;
}

.lead-table th:nth-child(4),
.lead-table td:nth-child(4) {
  width: 110px;
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
}
.badge-warning {
  background-color: #ffa00a;
}
.badge-danger {
  background-color: #ff5858;
}
.badge-secondary {
  background-color: #6c7680;
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
.stats-export-btn {
  position: absolute;
  top: 16px;
  right: 60px;
  background: #ffffff;
  border: 1px solid #d1d8dd;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.stats-export-btn:hover {
  background: #f5f7fa;
}
.table-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #f5f7fa;
}
.hidden {
  display: none;
}
.loading-indicator {
  display: none;
  text-align: center;
  padding: 10px;
  color: #6c7680;
}
.no-more-records {
  text-align: center;
  padding: 10px;
  color: #6c7680;
  display: none;
}

/* Ensure table cells don't wrap */
.lead-table td {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Add scrollbar styling */
.lead-table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.lead-table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.lead-table-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.lead-table-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Stats table styles */
.stats-table-container {
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  max-height: 70vh;
  overflow-y: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table th, 
.stats-table td {
  padding: 12px 8px;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid #e0e6ed;
}

.stats-table thead th {
  background: #f5f7fa;
  font-weight: 600;
  color: #2e3338;
  position: sticky;
  top: 0;
}

.stats-table tbody tr:hover {
  background-color: #f9fafb;
}

.conversion-rate {
  font-weight: 600;
  color: #2e3338;
}

.high-rate {
  color: #28a745;
}

.medium-rate {
  color: #ffa00a;
}

.low-rate {
  color: #ff5858;
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

      <div class="modal-overlay" id="stats-overlay"></div>
      <div class="stats-modal" id="stats-modal">
        <span class="close-btn" id="close-stats">&times;</span>
        <button class="stats-export-btn" id="export-stats">
          <i class="fa fa-download mr-1"></i> Export as CSV
        </button>
        <div class="card-body">
          <div class="stats-table-container">
            <table class="table table-sm stats-table">
              <thead>
                <tr>
                  <th width="60">Sr.No.</th>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Total Leads</th>
                  <th>Converted</th>
                  <th>Conversion Rate</th>
                </tr>
              </thead>
              <tbody id="stats-content"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card" style="border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div class="card-header d-flex justify-content-between align-items-center" style="border: none; background: none;">
          <div class="d-flex justify-content-between align-items-center">  
            <h5 class="mb-0" style="font-weight: 600;">Lead List</h5>
            <div id="date-filters" class="date-filters d-flex align-items-center ml-3">
  <div class="d-flex align-items-center">
    <span class="text-muted mr-2">From Date</span>
    <input type="date" class="form-control form-control-sm" id="from-date" style="width: 120px;" value="${
      urlParams.get("from_date") || today
    }">
  </div>
  <div class="d-flex align-items-center ml-4">
    <span class="text-muted mr-2">To Date</span>
    <input type="date" class="form-control form-control-sm" id="to-date" style="width: 120px;" value="${
      urlParams.get("to_date") || today
    }">
  </div>
</div>
          </div>
          <div>
            <button class="btn btn-sm btn-analytics mr-2" id="view-stats">
              <i class="fa fa-users mr-1"></i> Employee Stats
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
              <i class="fa fa-spinner fa-spin"></i> Loading more records...
            </div>
            <div id="no-more-records" class="no-more-records">
              No more records to load
            </div>
          </div>
          <div class="p-3 text-center bg-light">
            <small id="record-count" class="text-muted">Showing 0 of 0 records</small>
          </div>
        </div>
      </div>
    `);

    // Variables for infinite scrolling
    let currentLeads = [];
    let filteredLeads = [];
    let employeeMap = {};
    let employeeStats = [];
    let columnFilters = {};
    let isFetching = false;
    let allRecordsLoaded = false;
    let pageSize = 50; // Number of records to load at a time
    let currentPage = 0;
    let totalRecords = 0;

    // Initialize column filters
    for (let i = 0; i < 13; i++) {
      columnFilters[i] = "";
    }

    // Update URL with current filters
    function updateURL() {
      const params = new URLSearchParams();

      const fromDate = $("#from-date").val();
      const toDate = $("#to-date").val();
      const status = $("#filter-status").val();
      const employee = $("#filter-employee").val();
      const branch = $("#filter-branch").val();
      const source = $("#filter-source").val();

      if (fromDate && fromDate !== today) params.set("from_date", fromDate);
      if (toDate && toDate !== today) params.set("to_date", toDate);
      if (status) params.set("status", status);
      if (employee) params.set("employee", employee);
      if (branch) params.set("branch", branch);
      if (source) params.set("source", source);

      const newUrl =
        window.location.pathname +
        (params.toString() ? "?" + params.toString() : "");
      window.history.replaceState({}, "", newUrl);
    }

    // Show stats modal
    $("#view-stats").on("click", function () {
      renderEmployeeStats();
      $("#stats-overlay").show();
      $("#stats-modal").show();
    });

    // Close stats modal
    $("#close-stats, #stats-overlay").on("click", function () {
      $("#stats-overlay").hide();
      $("#stats-modal").hide();
    });

    // Export Stats as CSV
    $("#export-stats").on("click", function () {
      if (employeeStats.length === 0) {
        frappe.msgprint("No data to export");
        return;
      }

      // Prepare the data for export
      const data = employeeStats.map((stat, index) => {
        return {
          "#": index + 1,
          "Employee ID": stat.employee_id,
          "Employee Name": stat.employee_name,
          "Total Leads": stat.total_leads,
          "Converted Leads": stat.converted_leads,
          "Conversion Rate": `${stat.conversion_rate}%`,
        };
      });

      const headers = Object.keys(data[0]);
      let csvContent = headers.join(",") + "\n";

      data.forEach((row) => {
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
        `employee_lead_stats_${frappe.datetime.get_today()}.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    // Export CSV function (only filtered data)
    $("#export-csv").on("click", function () {
      if (filteredLeads.length === 0) {
        frappe.msgprint("No data to export");
        return;
      }

      // Prepare the data for export
      const data = filteredLeads.map((lead, index) => {
        const emp = employeeMap[lead.lead_owner];
        return {
          "#": index + 1,
          "Lead Name": lead.name,
          Customer: lead.lead_name || "-",
          Contact: lead.contact || "-",
          Source: lead.source || "-",
          "Employee Name": emp ? emp.name : lead.lead_owner,
          "Employee ID": emp ? emp.id : "-",
          Designation: emp ? emp.designation : "-",
          Branch: lead.branch || "-",
          Status: lead.status,
          Region: lead.region || "-",
          Zone: lead.zone || "-",
          "Created On": formatDateTimeForDisplay(lead.creation),
        };
      });

      const headers = Object.keys(data[0]);
      let csvContent = headers.join(",") + "\n";

      data.forEach((row) => {
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
      link.setAttribute("download", `leads_${frappe.datetime.get_today()}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    function formatDateTimeForDisplay(datetime) {
      const dateObj = frappe.datetime.str_to_obj(datetime);
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = dateObj.getFullYear();

      let hours = dateObj.getHours();
      const minutes = String(dateObj.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'

      return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
    }

    function applyFilters(leads) {
      const statusFilter = $("#filter-status").val()?.toLowerCase();
      const empFilter = $("#filter-employee").val()?.toLowerCase();
      const branchFilter = $("#filter-branch").val()?.toLowerCase();
      const sourceFilter = $("#filter-source").val()?.toLowerCase();

      return leads.filter((l) => {
        const emp = employeeMap[l.lead_owner];
        const empName = emp?.name || l.lead_owner;
        const empId = emp?.id || "";
        const empDesignation = emp?.designation || "";

        // Check column filters
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

        const columnFilterPassed = Object.entries(columnFilters).every(
          ([col, filter]) => {
            if (!filter) return true;
            return rowValues[col].includes(filter.toLowerCase());
          }
        );

        return (
          columnFilterPassed &&
          (!statusFilter || l.status.toLowerCase().includes(statusFilter)) &&
          (!empFilter ||
            empName.toLowerCase().includes(empFilter) ||
            empId.toLowerCase().includes(empFilter) ||
            empDesignation.toLowerCase().includes(empFilter)) &&
          (!branchFilter ||
            (l.branch || "").toLowerCase().includes(branchFilter)) &&
          (!sourceFilter ||
            (l.source || "").toLowerCase().includes(sourceFilter))
        );
      });
    }

    // Set up column filter event handlers
    $(".col-filter").on("input", function () {
      const colIndex = parseInt(this.id.split("-")[1]);
      columnFilters[colIndex] = $(this).val();
      filterAndRenderLeads();
    });

    // Infinite scroll handler
    $(".lead-table-container").on("scroll", function () {
      const container = $(this);
      const scrollTop = container.scrollTop();
      const scrollHeight = container[0].scrollHeight;
      const clientHeight = container[0].clientHeight;

      // Load more records when user is near the bottom
      if (
        scrollTop + clientHeight >= scrollHeight - 100 &&
        !isFetching &&
        !allRecordsLoaded &&
        filteredLeads.length > 0
      ) {
        loadMoreRecords();
      }
    });

    async function fetchAndRenderLeads() {
      isFetching = true;
      currentPage = 0;
      allRecordsLoaded = false;

      let from_date = $("#from-date").val();
      let to_date = $("#to-date").val();

      let fromDateTime = `${from_date} 00:00:00.000000`;
      let toDateTime = `${to_date} 23:59:59.999999`;

      let filters = [];
      if (from_date) filters.push(["creation", ">=", fromDateTime]);
      if (to_date) filters.push(["creation", "<=", toDateTime]);

      if (from_date && to_date) {
        let from = frappe.datetime.str_to_obj(from_date);
        let to = frappe.datetime.str_to_obj(to_date);
        let fromStr = frappe.datetime.str_to_user(from_date);
        let toStr = frappe.datetime.str_to_user(to_date);
        $("#date-range-subtitle").text(
          `Showing data from ${fromStr} to ${toStr}`
        );
      } else {
        $("#date-range-subtitle").text("");
      }

      try {
        // First get total count
        totalRecords = await frappe.db.count("Lead", {
          filters: filters,
        });

        // Then fetch first page of data
        let leads = await frappe.db.get_list("Lead", {
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
          limit_start: currentPage * pageSize,
          limit: pageSize,
          order_by: "creation desc",
        });

        currentLeads = leads;
        currentPage++;

        // Check if all records are loaded
        if (currentLeads.length >= totalRecords) {
          allRecordsLoaded = true;
          $("#no-more-records").show();
        }

        const stats = {
          total_leads: totalRecords,
          converted: 0,
          follow_up: 0,
          not_interested: 0,
        };

        // Calculate stats from all records (not just current page)
        if (totalRecords > 0) {
          const convertedCount = await frappe.db.count("Lead", {
            filters: [...filters, ["status", "=", "Converted"]],
          });
          const followUpCount = await frappe.db.count("Lead", {
            filters: [...filters, ["status", "=", "Follow Up"]],
          });
          const notInterestedCount = await frappe.db.count("Lead", {
            filters: [...filters, ["status", "=", "Not Interested"]],
          });

          stats.converted = convertedCount;
          stats.follow_up = followUpCount;
          stats.not_interested = notInterestedCount;
        }

        // Fetch employee details in bulk
        const uniqueOwners = [...new Set(leads.map((lead) => lead.lead_owner))];
        const employees = await frappe.db.get_list("Employee", {
          fields: ["name", "employee_name", "user_id", "designation"],
          filters: [["user_id", "in", uniqueOwners]],
          limit: 100,
        });

        // Create employee map
        employeeMap = {};
        employees.forEach((emp) => {
          employeeMap[emp.user_id] = {
            name: emp.employee_name,
            id: emp.name,
            designation: emp.designation || "-",
          };
        });

        // Update cards
        $("#total-leads").text(stats.total_leads);
        $("#converted-leads").text(stats.converted);
        $("#follow-up-leads").text(stats.follow_up);
        $("#not-interested-leads").text(stats.not_interested);

        // Prepare employee stats data
        employeeStats = await getEmployeeStats(filters);

        filterAndRenderLeads();
        updateURL();
      } catch (error) {
        console.error("Error fetching leads:", error);
        frappe.msgprint("Error loading leads. Please try again.");
      } finally {
        isFetching = false;
      }
    }

    async function getEmployeeStats(filters) {
      // Get all leads for stats (we need all for accurate stats)
      const allLeads = await frappe.db.get_list("Lead", {
        fields: ["name", "status", "lead_owner"],
        filters: filters,
        limit: 1000, // Limit to 1000 for performance
      });

      const statsMap = {};

      // Process leads to calculate stats
      for (let lead of allLeads) {
        let empKey = lead.lead_owner;
        if (!statsMap[empKey]) {
          statsMap[empKey] = {
            total_leads: 0,
            converted_leads: 0,
          };
        }
        statsMap[empKey].total_leads++;
        if (lead.status === "Converted") statsMap[empKey].converted_leads++;
      }

      // Convert to array and calculate conversion rates
      const stats = [];
      for (let [empKey, data] of Object.entries(statsMap)) {
        const emp = employeeMap[empKey] || {
          name: empKey,
          id: empKey,
          designation: "-",
        };

        const conversion_rate = Math.round(
          (data.converted_leads / data.total_leads) * 100
        );

        stats.push({
          employee_id: emp.id,
          employee_name: emp.name,
          total_leads: data.total_leads,
          converted_leads: data.converted_leads,
          conversion_rate: conversion_rate || 0,
        });
      }

      // Sort by total leads (descending)
      return stats.sort((a, b) => b.total_leads - a.total_leads);
    }

    function renderEmployeeStats() {
      const rows = employeeStats.map((stat, index) => {
        const rateClass = getRateClass(stat.conversion_rate);
        return `
          <tr>
            <td class="row-number">${index + 1}</td>
            <td>${stat.employee_id}</td>
            <td>${stat.employee_name}</td>
            <td>${stat.total_leads}</td>
            <td>${stat.converted_leads}</td>
            <td class="conversion-rate ${rateClass}">${
          stat.conversion_rate
        }%</td>
          </tr>
        `;
      });

      $("#stats-content").html(rows.join(""));
    }

    function getRateClass(rate) {
      if (rate >= 50) return "high-rate";
      if (rate >= 20) return "medium-rate";
      return "low-rate";
    }

    async function loadMoreRecords() {
      if (isFetching || allRecordsLoaded) return;

      isFetching = true;
      $("#loading-indicator").show();

      try {
        let from_date = $("#from-date").val();
        let to_date = $("#to-date").val();

        let fromDateTime = `${from_date} 00:00:00.000000`;
        let toDateTime = `${to_date} 23:59:59.999999`;

        let filters = [];
        if (from_date) filters.push(["creation", ">=", fromDateTime]);
        if (to_date) filters.push(["creation", "<=", toDateTime]);

        let leads = await frappe.db.get_list("Lead", {
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
          limit_start: currentPage * pageSize,
          limit: pageSize,
          order_by: "creation desc",
        });

        if (leads.length === 0) {
          allRecordsLoaded = true;
          $("#no-more-records").show();
          return;
        }

        currentLeads = [...currentLeads, ...leads];
        currentPage++;

        // Check if all records are loaded
        if (currentLeads.length >= totalRecords) {
          allRecordsLoaded = true;
          $("#no-more-records").show();
        }

        filterAndRenderLeads();
      } catch (error) {
        console.error("Error loading more leads:", error);
        frappe.msgprint("Error loading more leads. Please try again.");
      } finally {
        isFetching = false;
        $("#loading-indicator").hide();
      }
    }

    function filterAndRenderLeads() {
      filteredLeads = applyFilters(currentLeads);
      render_lead_list();
    }

    function render_lead_list() {
      const visibleLeads = filteredLeads.slice(0, currentPage * pageSize);

      const rows = visibleLeads.map((lead, index) => {
        const emp = employeeMap[lead.lead_owner];
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
              <td>${emp ? emp.name : lead.lead_owner}</td>
              <td>${emp ? emp.id : "-"}</td>
              <td>${emp ? emp.designation : "-"}</td>
              <td>${lead.branch || "-"}</td>
              <td><span class="badge ${getStatusBadgeClass(lead.status)}">${
          lead.status
        }</span></td>
              <td>${lead.region || "-"}</td>
              <td>${lead.zone || "-"}</td>
              <td>${formatDateTimeForDisplay(lead.creation)}</td>
            </tr>
          `;
      });

      $("#lead-content").html(rows.join(""));
      $("#record-count").text(
        `Showing ${visibleLeads.length} of ${filteredLeads.length} filtered records (${totalRecords} total)`
      );
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

    // Auto-apply filters when date changes
    $("#from-date, #to-date").on("change", function () {
      fetchAndRenderLeads();
    });

    // Apply other filters on input
    $("#filter-status, #filter-employee, #filter-branch, #filter-source").on(
      "input",
      function () {
        filterAndRenderLeads();
        updateURL();
      }
    );

    // Initial load
    fetchAndRenderLeads();
  });
};
