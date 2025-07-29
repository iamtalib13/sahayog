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
          padding: 16px;
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
        .chart-modal {
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
        .chart-modal .close-btn {
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
        .lead-table-container {
          border: 1px solid #e0e6ed;
          border-radius: 8px;
          overflow: hidden;
        }
        .lead-table {
          width: 100%;
          border-collapse: collapse;
        }
        .lead-table thead th {
          background: #f5f7fa;
          border-bottom: 1px solid #e0e6ed;
          font-weight: 600;
          color: #2e3338;
          position: sticky;
          top: 0;
          z-index: 10;
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
        .lead-table tbody {
          display: block;
          overflow-y: auto;
          max-height: 500px;
        }
        .lead-table thead, .lead-table tbody tr {
          display: table;
          width: 100%;
          table-layout: fixed;
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
        .chart-export-btn {
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
        .chart-export-btn:hover {
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

      <div class="modal-overlay" id="chart-overlay"></div>
      <div class="chart-modal" id="chart-modal">
        <span class="close-btn" id="close-chart">&times;</span>
        <button class="chart-export-btn" id="export-chart">
          <i class="fa fa-download mr-1"></i> Export as PNG
        </button>
        <div class="card-body" style="overflow-x: auto; height: 70vh;">
          <canvas id="employee-lead-chart" style="min-width: 800px;"></canvas>
        </div>
      </div>

      <div class="card" style="border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div class="card-header d-flex justify-content-between align-items-center" style="border: none; background: none;">
        	<div class="d-flex justify-content-between align-items-center">  
				<h5 class="mb-0" style="font-weight: 600;">Lead List</h5>
			  	<div id="date-filters" class="date-filters d-flex align-items-center">
			  		<div class="col-md-6">
        	    	  <label class="small text-muted mb-1">From Date</label>
        	    	  <input type="date" class="form-control form-control-sm" id="from-date" value="${
                    urlParams.get("from_date") || today
                  }">
        	    	</div>
        	    	<div class="col-md-6">
        	    	  <label class="small text-muted mb-1">To Date</label>
        	    	  <input type="date" class="form-control form-control-sm" id="to-date" value="${
                    urlParams.get("to_date") || today
                  }">
        	    	</div>
				</div>
			</div>
          <div>
            <!--<button class="btn btn-sm btn-filter mr-2" id="toggle-filters">
              <i class="fa fa-filter mr-1"></i> Filters
            </button>-->
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
          </div>
          <div class="p-3 text-center bg-light">
            <small id="record-count" class="text-muted">Showing 0 of 0 records</small>
          </div>
        </div>
      </div>
    `);

      let clusterize;
      let currentLeads = [];
      let employeeMap = {};
      let chartInstance = null;
      let columnFilters = {};

      // Initialize column filters
      for (let i = 0; i < 10; i++) {
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

      // Toggle filters visibility
      $("#toggle-filters").on("click", function () {
        $("#filter-container").slideToggle();
        $(this).toggleClass("active");
        updateURL();
      });

      // Close filters
      $("#close-filters").on("click", function () {
        $("#filter-container").slideUp();
        $("#toggle-filters").removeClass("active");
        updateURL();
      });

      // Show chart modal
      $("#view-analytics").on("click", function () {
        $("#chart-overlay").show();
        $("#chart-modal").show();
      });

      // Close chart modal
      $("#close-chart, #chart-overlay").on("click", function () {
        $("#chart-overlay").hide();
        $("#chart-modal").hide();
      });

      // Export Chart as PNG
      $("#export-chart").on("click", function () {
        if (chartInstance) {
          const link = document.createElement("a");
          link.download = "lead-conversion-chart.png";
          link.href = document
            .getElementById("employee-lead-chart")
            .toDataURL("image/png");
          link.click();
        }
      });

      // Export CSV function (only filtered data)
      $("#export-csv").on("click", function () {
        if (currentLeads.length === 0) {
          frappe.msgprint("No data to export");
          return;
        }

        // Get filtered leads
        const filteredLeads = getFilteredLeads(currentLeads);

        // Prepare the data for export
        const data = filteredLeads.map((lead, index) => {
          const emp = employeeMap[lead.lead_owner];
          return {
            "#": index + 1,
            "Lead Name": lead.name,
            Customer: lead.lead_name || "-",
            Source: lead.source || "-",
            "Employee Name": emp ? emp.name : lead.lead_owner,
            "Employee ID": emp ? emp.id : "-",
            Designation: emp ? emp.designation : "-",
            Branch: lead.branch || "-",
            Status: lead.status,
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
        link.setAttribute(
          "download",
          `leads_${frappe.datetime.get_today()}.csv`
        );
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

      function getFilteredLeads(leads) {
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
            (l.source || "").toLowerCase(),
            empName.toLowerCase(),
            empId.toLowerCase(),
            empDesignation.toLowerCase(),
            (l.branch || "").toLowerCase(),
            l.status.toLowerCase(),
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
        render_lead_list(currentLeads);
      });

      async function fetchAndRenderLeads() {
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
          limit: 500,
        });

        currentLeads = leads;

        const stats = {
          total_leads: leads.length,
          converted: leads.filter((l) => l.status === "Converted").length,
          follow_up: leads.filter((l) => l.status === "Follow Up").length,
          not_interested: leads.filter((l) => l.status === "Not Interested")
            .length,
        };

        employeeMap = {};
        const chartData = {};

        // Fetch employee details in bulk
        const uniqueOwners = [...new Set(leads.map((lead) => lead.lead_owner))];
        const employees = await frappe.db.get_list("Employee", {
          fields: ["name", "employee_name", "user_id", "designation"],
          filters: [["user_id", "in", uniqueOwners]],
          limit: 100,
        });

        // Create employee map
        employees.forEach((emp) => {
          employeeMap[emp.user_id] = {
            name: emp.employee_name,
            id: emp.name,
            designation: emp.designation || "-",
          };
        });

        // Prepare chart data (only total and converted)
        for (let lead of leads) {
          let empKey = employeeMap[lead.lead_owner]
            ? employeeMap[lead.lead_owner].name
            : lead.lead_owner;

          if (!chartData[empKey]) {
            chartData[empKey] = {
              total: 0,
              converted: 0,
            };
          }
          chartData[empKey].total++;

          if (lead.status === "Converted") chartData[empKey].converted++;
        }

        // Update cards
        $("#total-leads").text(stats.total_leads);
        $("#converted-leads").text(stats.converted);
        $("#follow-up-leads").text(stats.follow_up);
        $("#not-interested-leads").text(stats.not_interested);

        // Format chart data for stacked bar (total and converted)
        const chartFormatted = {
          labels: Object.keys(chartData),
          datasets: [
            {
              label: "Total Leads",
              data: Object.values(chartData).map((e) => e.total),
              backgroundColor: "#7AB8FF", // Soft blue
              datalabels: {
                display: false,
              },
            },
            {
              label: "Converted",
              data: Object.values(chartData).map((e) => e.converted),
              backgroundColor: "#77DD77", // Soft green
              datalabels: {
                display: true,
                formatter: function (value, context) {
                  const total = context.dataset.data[context.dataIndex];
                  const converted =
                    context.chart.data.datasets[1].data[context.dataIndex];
                  const percentage = Math.round((converted / total) * 100) || 0;
                  return `${converted} (${percentage}%)`;
                },
                color: "#2e3338",
                anchor: "end",
                align: "top",
              },
            },
          ],
        };

        render_bar_chart(chartFormatted);
        render_lead_list(leads);
        updateURL();
      }

      function render_lead_list(leads) {
        const filteredLeads = getFilteredLeads(leads);

        const rows = filteredLeads.map((lead, index) => {
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
              <td >${lead.lead_name || "-"}</td>
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

        if (!clusterize) {
          clusterize = new Clusterize({
            rows: rows,
            scrollId: "lead-content",
            contentElem: document.getElementById("lead-content"),
            callbacks: {
              clusterChanged: function () {
                // Ensure the header stays in sync with the table width
                $(".lead-table thead").width($(".lead-table").width());
              },
            },
          });
        } else {
          clusterize.update(rows);
        }

        $("#record-count").text(
          `Showing ${filteredLeads.length} of ${leads.length} records`
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
          render_lead_list(currentLeads);
          updateURL();
        }
      );

      function render_bar_chart(data) {
        let ctx = document
          .getElementById("employee-lead-chart")
          .getContext("2d");

        if (chartInstance) {
          chartInstance.destroy();
        }

        // Register plugin to display data labels
        Chart.register({
          id: "datalabels",
          afterDatasetsDraw(chart) {
            const ctx = chart.ctx;
            chart.data.datasets.forEach((dataset, i) => {
              if (dataset.datalabels && dataset.datalabels.display) {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((bar, index) => {
                  const data = dataset.data[index];
                  if (data > 0) {
                    const label = dataset.datalabels.formatter
                      ? dataset.datalabels.formatter(data, {
                          datasetIndex: i,
                          dataIndex: index,
                          chart: chart,
                        })
                      : data;

                    const x = bar.x;
                    const y = bar.y - 5;

                    ctx.font = "12px Arial";
                    ctx.fillStyle = dataset.datalabels.color || "#666";
                    ctx.textAlign = "center";
                    ctx.fillText(label, x, y);
                  }
                });
              }
            });
          },
        });

        chartInstance = new Chart(ctx, {
          type: "bar",
          data: data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "top",
                labels: {
                  boxWidth: 12,
                  padding: 20,
                  font: {
                    size: 13,
                  },
                },
              },
              tooltip: {
                mode: "index",
                intersect: false,
                callbacks: {
                  label: function (context) {
                    let label = context.dataset.label || "";
                    if (label) {
                      label += ": ";
                    }
                    if (context.datasetIndex === 1) {
                      const total =
                        context.chart.data.datasets[0].data[context.dataIndex];
                      const converted = context.raw;
                      const percentage =
                        Math.round((converted / total) * 100) || 0;
                      label += `${converted} (${percentage}% of ${total})`;
                    } else {
                      label += context.raw;
                    }
                    return label;
                  },
                },
              },
            },
            scales: {
              x: {
                stacked: true,
                grid: {
                  display: false,
                },
                ticks: {
                  maxRotation: 45,
                  minRotation: 45,
                  font: {
                    size: 11,
                  },
                },
              },
              y: {
                stacked: true,
                beginAtZero: true,
                grid: {
                  drawBorder: false,
                },
                ticks: {
                  precision: 0,
                },
              },
            },
          },
        });
      }

      // Initial load
      fetchAndRenderLeads();
    }
  );
};
