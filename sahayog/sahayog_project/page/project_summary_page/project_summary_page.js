frappe.pages["project-summary-page"].on_page_load = function (wrapper) {
  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Project Task Matrix",
    single_column: true,
  });

  // Add container with controls
  page.main.html(`
    <div class="project-matrix-container">
      <div class="matrix-controls card mb-4">
        <div class="card-body p-3">
          <div class="row align-items-center">
            <div class="col-md-6 mb-2 mb-md-0">
              <div class="input-group">
                <div class="input-group-prepend">
                  <span class="input-group-text bg-white">
                    <i class="fa fa-search text-muted"></i>
                  </span>
                </div>
                <input type="text" class="form-control project-search border-left-0" placeholder="Search projects...">
              </div>
            </div>
            <div class="col-md-6 d-flex justify-content-md-end">
              <button class="btn btn-sm btn-outline-secondary mr-2" id="refresh-btn">
                <i class="fa fa-refresh mr-1"></i> Refresh
              </button>
              <button class="btn btn-sm btn-primary" id="export-btn">
                <i class="fa fa-download mr-1"></i> Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="matrix-loading text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="sr-only">Loading...</span>
        </div>
        <p class="mt-3 text-muted">Loading project data...</p>
      </div>
      
      <div class="matrix-content" style="display: none;"></div>
      
      <div class="matrix-error alert alert-danger d-none">
        <i class="fa fa-exclamation-circle mr-2"></i>
        <span class="error-message"></span>
      </div>
    </div>
  `);

  // Add CSS
  $("<style>")
    .text(
      `
      .project-matrix-container {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .matrix-table-container {
        overflow-x: auto;
        margin-top: 20px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        border: 1px solid #e3e6f0;
      }
      
      .matrix-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin: 0;
      }
      
      .matrix-table th {
        background-color: #f8f9fc;
        position: sticky;
        top: 0;
        z-index: 10;
        padding: 14px 16px;
        font-weight: 600;
        text-align: left;
        border-bottom: 1px solid #e3e6f0;
        color: #4e73df;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .matrix-table td {
        padding: 14px 16px;
        border-bottom: 1px solid #e3e6f0;
        vertical-align: middle;
        font-size: 14px;
        color: #6e707e;
      }
      
      .matrix-table tr:last-child td {
        border-bottom: none;
      }
      
      .matrix-table tr:hover {
        background-color: #f8f9fc;
      }
      
      .matrix-table th:first-child,
      .matrix-table td:first-child {
        position: sticky;
        left: 0;
        background-color: white;
        z-index: 5;
        box-shadow: 1px 0 0 #e3e6f0;
        font-weight: 600;
        color: #5a5c69;
      }
      
      .matrix-table th:first-child {
        background-color: #f8f9fc;
        z-index: 11;
      }
      
      .matrix-table tr:hover td:first-child {
        background-color: #f8f9fc;
      }
      
      .task-status {
        display: inline-block;
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        min-width: 90px;
        text-align: center;
      }
      
      .status-completed {
        background-color: #e6f4e6;
        color: #137333;
        border: 1px solid #c6e7c6;
      }
      
      .status-working {
        background-color: #e8f0fe;
        color: #1a73e8;
        border: 1px solid #c5d9f8;
      }
      
      .status-open {
        background-color: #fef7e0;
        color: #f9ab00;
        border: 1px solid #fbe6a2;
      }
      
      .status-overdue {
        background-color: #fde8e8;
        color: #d93025;
        border: 1px solid #f9c6c6;
      }
      
      .status-not-started {
        background-color: #f3f4f6;
        color: #6b7280;
        border: 1px solid #e5e7eb;
      }
      
      .project-summary {
        background: linear-gradient(to right, #f8f9fc, #ffffff);
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 25px;
        border: 1px solid #e3e6f0;
      }
      
      .project-summary .col-md-2 {
        text-align: center;
        border-right: 1px solid #eaecf4;
      }
      
      .project-summary .col-md-2:last-child {
        border-right: none;
      }
      
      .project-summary h5 {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 5px;
        color: #4e73df;
      }
      
      .project-summary p {
        font-size: 13px;
        margin-bottom: 0;
      }
      
      .matrix-controls .input-group-text {
        border-right: none;
      }
      
      .matrix-controls .form-control.border-left-0 {
        border-left: none;
      }
      
      @media (max-width: 768px) {
        .matrix-table th:first-child,
        .matrix-table td:first-child {
          position: relative;
        }
        
        .project-summary .col-md-2 {
          margin-bottom: 15px;
          border-right: none;
          border-bottom: 1px solid #eaecf4;
          padding-bottom: 15px;
        }
        
        .project-summary .col-md-2:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
      }
      
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #858796;
      }
      
      .empty-state i {
        font-size: 48px;
        margin-bottom: 15px;
        color: #dddfeb;
      }
    `
    )
    .appendTo("head");

  // Bind events
  $("#refresh-btn").click(load_report);
  $(".project-search").on("keyup", function () {
    filterProjects($(this).val());
  });
  $("#export-btn").click(exportCSV);

  load_report();

  // ---------------- Load Report ----------------
  function load_report() {
    $(".matrix-loading").show();
    $(".matrix-content").hide();
    $(".matrix-error").addClass("d-none");

    frappe.call({
      method:
        "sahayog.sahayog_project.page.project_summary_page.project_summary_page.get_project_task_matrix",
      callback: function (r) {
        $(".matrix-loading").hide();
        if (
          r.message &&
          r.message.projects &&
          Object.keys(r.message.projects).length > 0
        ) {
          $(".matrix-content").show();
          render_matrix(r.message);
        } else {
          showEmptyState();
        }
      },
      error: function () {
        $(".matrix-loading").hide();
        showError("Error loading project data");
      },
    });
  }

  // ---------------- Render Table ----------------
  function render_matrix(data) {
    const tasks = data.tasks; // fixed task headers
    console.log("Tasks:", tasks);
    const projects = data.projects;
    console.log("Projects Data:", projects);

    // Calculate summary stats
    let totalProjects = Object.keys(projects).length;
    let totalTasks = tasks.length;
    let totalCompleted = 0,
      totalWorking = 0,
      totalOpen = 0,
      totalOverdue = 0,
      totalNotStarted = 0;

    Object.keys(projects).forEach((projectKey) => {
      const project = projects[projectKey];
      tasks.forEach((t) => {
        const status = (project[t] || "Not Started").toLowerCase();
        if (
          status.includes("complete") ||
          status === "completed" ||
          status === "yes" ||
          status === "done"
        ) {
          totalCompleted++;
        } else if (
          status.includes("work") ||
          status === "working" ||
          status === "in progress"
        ) {
          totalWorking++;
        } else if (status.includes("open")) {
          totalOpen++;
        } else if (status.includes("overdue")) {
          totalOverdue++;
        } else {
          totalNotStarted++;
        }
      });
    });

    let summaryHtml = `
      <div class="project-summary">
        <div class="row">
          <div class="col-md-2"><h5>${totalProjects}</h5><p class="text-muted">Total Projects</p></div>
          <div class="col-md-2"><h5>${totalTasks}</h5><p class="text-muted">Task Types</p></div>
          <div class="col-md-2"><h5>${totalCompleted}</h5><p class="text-success">Completed</p></div>
          <div class="col-md-2"><h5>${totalWorking}</h5><p class="text-primary">Working</p></div>
          <div class="col-md-2"><h5>${
            totalOpen + totalOverdue + totalNotStarted
          }</h5><p class="text-warning">Pending</p></div>
        </div>
      </div>
    `;

    let html = `
      ${summaryHtml}
      <div class="matrix-table-container">
        <table class="matrix-table">
          <thead>
            <tr><th>Project</th>
    `;

    // Add task headers
    tasks.forEach((t) => {
      html += `<th>${frappe.format(t, { fieldtype: "Data" })}</th>`;
    });

    html += `</tr></thead><tbody>`;

    // Add project rows
    Object.keys(projects).forEach((projectKey) => {
      const project = projects[projectKey];
      const projectName = project.project_name || projectKey;
      const projectId = project.name || projectKey;

      html += `<tr>
        <td class="font-weight-bold">
          <a href="/app/project/${encodeURIComponent(
            projectId
          )}" target="_blank">
            ${frappe.format(projectName, { fieldtype: "Data" })}
          </a>
        </td>`;

      tasks.forEach((t) => {
        const value = project[t] || "Not Started";
        html += `<td>${formatTaskValue(value)}</td>`;
      });

      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    $(".matrix-content").html(html);
  }

  // ---------------- Format Task Status ----------------
  function formatTaskValue(value) {
    if (!value) return "";
    const lowerValue = value.toString().toLowerCase();

    if (
      lowerValue.includes("complete") ||
      lowerValue === "completed" ||
      lowerValue === "yes" ||
      lowerValue === "done"
    ) {
      return `<span class="task-status status-completed">Completed</span>`;
    } else if (
      lowerValue.includes("work") ||
      lowerValue === "working" ||
      lowerValue === "in progress"
    ) {
      return `<span class="task-status status-working">Working</span>`;
    } else if (lowerValue.includes("open")) {
      return `<span class="task-status status-open">Open</span>`;
    } else if (lowerValue.includes("overdue")) {
      return `<span class="task-status status-overdue">Overdue</span>`;
    } else {
      return `<span class="task-status status-not-started">Not Started</span>`;
    }
  }

  // ---------------- Filter Projects ----------------
  function filterProjects(searchTerm) {
    const rows = $(".matrix-table tbody tr");
    if (!searchTerm) {
      rows.show();
      return;
    }

    searchTerm = searchTerm.toLowerCase();
    rows.each(function () {
      const projectName = $(this).find("td:first").text().toLowerCase();
      $(this).toggle(projectName.includes(searchTerm));
    });
  }

  // ---------------- Export CSV ----------------
  function exportCSV() {
    const rows = $(".matrix-table tr");
    if (rows.length === 0) {
      frappe.msgprint("No data available to export");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    rows.each(function () {
      let rowData = [];
      $(this)
        .find("th, td")
        .each(function () {
          let text = $(this).text().trim().replace(/,/g, ""); // remove commas
          rowData.push('"' + text + '"');
        });
      csvContent += rowData.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "project_task_matrix.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ---------------- Show Error ----------------
  function showError(message) {
    $(".matrix-error .error-message").text(message);
    $(".matrix-error").removeClass("d-none");
  }

  // ---------------- Show Empty State ----------------
  function showEmptyState() {
    $(".matrix-content")
      .html(
        `
      <div class="empty-state">
        <i class="fa fa-folder-open"></i>
        <h4>No Projects Found</h4>
        <p>There are no projects to display at this time.</p>
      </div>
    `
      )
      .show();
  }
};
