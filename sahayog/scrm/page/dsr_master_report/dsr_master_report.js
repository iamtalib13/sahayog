frappe.pages["dsr-master-report"].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "DSR Master Report",
    single_column: true,
  });

  // Complete styling
  $(`<style>
        .dsr-container { padding: 2px; font-family: 'Inter', Arial, sans-serif; }
        .dsr-header { margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
        .dsr-description { color: #6c757d; font-size: 13px; margin: 3px 0 0 0; }
        #date-filters { 
            display: flex; align-items: center; gap: 15px; margin-bottom: 15px;
            background: #f8f9fa; padding: 15px; border-radius: 8px; flex-wrap: wrap;
        }
        .filter-field { display: flex; flex-direction: column; }
        .filter-label { font-size: 12px; color: #6c757d; margin-bottom: 4px; font-weight: 600; }
        .summary-cards {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px; margin-bottom: 20px;
        }
        .summary-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
            border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; text-align: center;
        }
        .summary-value { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
        .summary-label { font-size: 12px; color: #6c757d; font-weight: 500; text-transform: uppercase; }
        .qualified { color: #28a745; } .disqualified { color: #dc3545; }
        .good-rating { color: #28a745; } .average-rating { color: #ffc107; } .bad-rating { color: #dc3545; }
        .table-container {
            background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            overflow: hidden; max-height: 500px; overflow-y: auto;
        }
        #master-table { width: 100%; border-collapse: collapse; margin: 0; font-size: 13px; }
        #master-table thead {
            background: linear-gradient(135deg, #343a40 0%, #495057 100%);
            position: sticky; top: 0; z-index: 10;
        }
        #master-table th {
            color: white; text-align: center; font-size: 13px; font-weight: 600;
            padding: 12px 8px; border: none; text-transform: uppercase; letter-spacing: 0.3px;
        }
        #master-table td {
            text-align: center; font-size: 13px; padding: 10px 8px;
            border-bottom: 1px solid #dee2e6; vertical-align: middle;
        }
        .badge { 
            padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block;
        }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-danger { background: #f8d7da; color: #721c24; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .loading-spinner { 
            display: flex; justify-content: center; align-items: center; padding: 20px; 
            font-size: 14px; color: #6c757d;
        }
        .spinner { 
            width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #007bff; 
            border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .empty-state { text-align: center; padding: 24px 12px; color: #6c757d; font-size: 13px; }
        .success-message { color: #28a745; font-size: 14px; margin-top: 10px; }
    </style>`).appendTo("head");

  var $container = $('<div class="dsr-container"></div>').appendTo(page.body);

  $(`<div class="dsr-header">
        <p class="dsr-description">Monthly performance summary</p>
    </div>`).appendTo($container);

  var $filtersDiv = $('<div id="date-filters"></div>').appendTo($container);

  var $monthField = $('<div class="filter-field"></div>').appendTo($filtersDiv);
  $('<label class="filter-label">Select Month</label>').appendTo($monthField);
  var $monthInput = $(
    `<input type="month" id="report-month" value="${frappe.datetime
      .now_date()
      .slice(0, 7)}" class="form-control" style="width: 150px;">`
  ).appendTo($monthField);

  var $branchField = $('<div class="filter-field"></div>').appendTo(
    $filtersDiv
  );
  $('<label class="filter-label">Branch (Optional)</label>').appendTo(
    $branchField
  );
  var branchControl = frappe.ui.form.make_control({
    parent: $branchField[0],
    df: {
      fieldtype: "Link",
      fieldname: "branch_filter",
      options: "Branch",
      placeholder: "All Branches",
    },
    render_input: true,
  });

  var $loadBtn =
    $(`<button class="btn btn-primary" id="load-master-report" style="margin-top: 18px;">
        <i class="fa fa-refresh"></i> Load Report
    </button>`).appendTo($filtersDiv);

  var $statusDiv = $('<div id="status-message"></div>').appendTo($container);
  var $summaryContainer = $('<div class="summary-cards"></div>').appendTo(
    $container
  );
  var $tableContainer = $('<div class="table-container"></div>').appendTo(
    $container
  );

  $(`<table id="master-table">
        <thead>
            <tr>
                <th>Branch Name</th><th>Employee Name</th><th>Employee Code</th>
                <th>No of Disqualified</th><th>No of Qualified</th><th>No of Bad Rating</th>
                <th>No of Average Rating</th><th>No of Good Rating</th>
            </tr>
        </thead>
        <tbody><tr><td colspan="8" class="empty-state">Click "Load Report" to view data</td></tr></tbody>
    </table>`).appendTo($tableContainer);

  // FAST server-side data loading
  function loadDSRMasterDataFast() {
    const selectedMonth = $("#report-month").val();
    const selectedBranch = branchControl.get_value();

    if (!selectedMonth) {
      frappe.msgprint("Please select a month");
      return;
    }

    $("#master-table tbody").html(
      '<tr><td colspan="8" class="loading-spinner"><div class="spinner"></div>Loading data from server...</td></tr>'
    );
    $summaryContainer.html("");
    $statusDiv.html("");

    const startTime = Date.now();

    // Single API call - all heavy processing on server
    frappe.call({
      method: "sahayog.scrm.api.dsr_master.get_dsr_master_report",
      args: {
        month: selectedMonth,
        branch: selectedBranch,
      },
      callback: function (response) {
        const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);

        if (response.message && response.message.success) {
          const data = response.message.data;
          const totals = response.message.totals;
          const employeeCount = response.message.total_employees || data.length;

          // updateSummaryCards(totals);
          updateMasterTable(data);

          // $statusDiv.html(
          //   `<div class="success-message">✅ Report loaded successfully! (${employeeCount} employees, ${loadTime}s)</div>`
          // );

          // frappe.show_alert({
          //   message: `Report loaded in ${loadTime} seconds!`,
          //   indicator: "green",
          // });
        } else {
          $("#master-table tbody").html(
            '<tr><td colspan="8" class="empty-state">No data found for selected month</td></tr>'
          );
          $statusDiv.html(
            '<div class="text-warning">⚠️ No data found for the selected criteria</div>'
          );

          if (response.message && response.message.error) {
            console.error("API Error:", response.message.error);
            frappe.msgprint(`Error: ${response.message.error}`);
          }
        }
      },
      error: function (error) {
        console.error("Error loading DSR master data:", error);
        $("#master-table tbody").html(
          '<tr><td colspan="8" class="text-center text-danger">❌ Error loading data. Please try again.</td></tr>'
        );
        $statusDiv.html(
          '<div class="text-danger">❌ Failed to load report. Check console for details.</div>'
        );

        frappe.msgprint(
          "Failed to load report. Please check your internet connection and try again."
        );
      },
    });
  }

  function updateSummaryCards(totals) {
    $summaryContainer.html(`
            <div class="summary-card">
                <div class="summary-value qualified">${totals.qualified}</div>
                <div class="summary-label">Total Qualified Days</div>
            </div>
            <div class="summary-card">
                <div class="summary-value disqualified">${totals.disqualified}</div>
                <div class="summary-label">Total Disqualified Days</div>
            </div>
            <div class="summary-card">
                <div class="summary-value good-rating">${totals.good_rating}</div>
                <div class="summary-label">Total Good Rating Days</div>
            </div>
            <div class="summary-card">
                <div class="summary-value average-rating">${totals.average_rating}</div>
                <div class="summary-label">Total Average Rating Days</div>
            </div>
            <div class="summary-card">
                <div class="summary-value bad-rating">${totals.bad_rating}</div>
                <div class="summary-label">Total Bad Rating Days</div>
            </div>
        `);
  }

  function updateMasterTable(results) {
    if (results.length === 0) {
      $("#master-table tbody").html(
        '<tr><td colspan="8" class="empty-state">No data found for selected month</td></tr>'
      );
      return;
    }

    let tableHtml = "";
    results.forEach(function (row) {
      tableHtml += `
                <tr>
                    <td><strong>${row.branch_name}</strong></td>
                    <td><strong>${row.employee_name}</strong></td>
                    <td>${row.employee_code}</td>
                    <td><span class="badge badge-danger">${row.disqualified_days}</span></td>
                    <td><span class="badge badge-success">${row.qualified_days}</span></td>
                    <td><span class="badge badge-danger">${row.bad_days}</span></td>
                    <td><span class="badge badge-warning">${row.average_days}</span></td>
                    <td><span class="badge badge-success">${row.good_days}</span></td>
                </tr>
            `;
    });
    $("#master-table tbody").html(tableHtml);
  }

  $("#load-master-report").on("click", loadDSRMasterDataFast);
  $("#report-month").on("change", loadDSRMasterDataFast);
  branchControl.$input.on("change", loadDSRMasterDataFast);

  setTimeout(loadDSRMasterDataFast, 500);
};
