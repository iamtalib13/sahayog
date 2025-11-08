frappe.pages["my-agent"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "My Agents",
    single_column: true,
  });

  // ---------------- HTML UI ----------------
  page.main.html(`
      <section id="employeeInfo" aria-label="Employee Information">
        <h2>Loading employee info...</h2>
        <p></p>
      </section>

      <nav class="tabs" role="tablist" aria-label="Agent Status Tabs">
        <div class="tab" role="tab" id="unallocatedTab2">
          My Agents <span class="tab-count" id="unallocatedCountBadge2">0</span>
        </div>
        <div class="tab" role="tab" id="pendingTab">
          Approval Pending <span class="tab-count" id="pendingCountBadge">0</span>
        </div>
        <div class="tab" role="tab" id="allocatedTab">
          Branch Allocated <span class="tab-count" id="allocatedCountBadge">0</span>
        </div>
        <div class="tab" role="tab" id="unallocatedTab">
          Branch Unallocated <span class="tab-count" id="unallocatedCountBadge">0</span>
        </div>
      </nav>

      <section class="tab-panels">
        <div id="pendingPanel" class="tab-panel">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Agent ID</th>
                <th>Agent Name</th>
                <th>Branch Code</th>
                <th>Status</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody id="pendingRecords"></tbody>
          </table>
        </div>

        <div id="allocatedPanel" class="tab-panel">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Agent ID</th>
                <th>Agent Name</th>
                <th>Branch Code</th>
                <th>Status</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody id="allocatedRecords"></tbody>
          </table>
        </div>

        <div id="unallocatedPanel" class="tab-panel">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Agent ID</th>
                <th>Agent Name</th>
                <th>Branch Code</th>
                <th>Status</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody id="unallocatedRecords"></tbody>
          </table>
        </div>

        <div id="unallocatedPanel2" class="tab-panel">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Agent ID</th>
                <th>Agent Name</th>
                <th>Branch Code</th>
                <th>Status</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody id="unallocatedRecords2"></tbody>
          </table>
        </div>
      </section>

      <!-- Toast container -->
      <div id="toast-container"></div>

      <style>
        #employeeInfo { margin-bottom: 15px; }
        .tabs { display: flex; gap: 10px; margin-bottom: 12px; }
        .tab { padding: 10px 18px; border-radius: 8px; background: #f4f4f4; cursor: pointer; font-weight: 600; }
        .tab.active { background: white; border-bottom: 3px solid #036d6a; }
        .tab-count { background: #036d6a; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
        .tab-panel { display: none; }
        .tab-panel.active { display: block; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; background: white; border-radius: 10px; overflow: hidden; }
        thead { background: #f9fafc; font-weight: bold; }
        td, th { padding: 10px; border-bottom: 1px solid #eee; }
        #toast-container { position: fixed; top: 120px; right: 30px; display: flex; flex-direction: column; gap: 12px; z-index: 10000; }
        .toast-card { background: #036d6a; border: 1px solid rgba(255,255,255,0.1); padding: 14px 18px; border-radius: 14px; backdrop-filter: blur(10px); color: white; display: flex; justify-content: space-between; min-width: 260px; animation: fadeIn .3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeOut { to { opacity: 0; transform: translateY(-10px); } }
      </style>
    `);

  // ---------------- TAB LOGIC ----------------
  const main = $(page.main);

  function activeTab(tabID) {
    main.find(".tab").removeClass("active");
    main.find(".tab-panel").removeClass("active");
    main.find(`#${tabID}`).addClass("active");
    const panelID = tabID.replace("Tab", "Panel");
    main.find(`#${panelID}`).addClass("active");
  }

  // Default
  activeTab("unallocatedTab2");

  main.find(".tab").on("click", function () {
    activeTab($(this).attr("id"));
  });

  // ---------------- Toast Function ----------------
  function showToast({ title, message, icon = "⏳", timeout = 3500 }) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast-card";
    toast.innerHTML = `
        <div>
          <strong>${title}</strong><br>
          <small>${message}</small>
        </div>
        <div>${icon}</div>
      `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "fadeOut .3s forwards";
      setTimeout(() => toast.remove(), 300);
    }, timeout);
  }

  // ---------------- Pending Toast Rotation ----------------
  let pendingAgentQueue = [];
  let pendingToastInterval = null;

  function startPendingAgentToasts() {
    if (pendingToastInterval) return;
    let index = 0;
    pendingToastInterval = setInterval(() => {
      if (!pendingAgentQueue.length) return;
      const agentID = pendingAgentQueue[index];
      showToast({
        title: "Pending Approval Request",
        message: `Agent ID: ${agentID}`,
        icon: "⏳",
      });
      index = (index + 1) % pendingAgentQueue.length;
    }, 5000);
  }

  // ---------------- Update UI ----------------
  function formatRow(r, i) {
    const modified = r.modified ? frappe.datetime.str_to_user(r.modified) : "";
    return `
      <tr onclick="window.top.location.href='/app/agent/${r.name}'">
        <td>${i + 1}</td>
        <td>${r.name}</td>
        <td>${r.employee ?? "No employee"}</td>
        <td>${r.branch_code ?? "N/A"}</td>
        <td>${r.status}</td>
        <td>${modified}</td>
      </tr>
    `;
  }

  function blank() {
    // fixed colspan: we have 6 columns in header
    return `<tr><td colspan="6" style="text-align:center">No Records</td></tr>`;
  }

  function updateDashboard(data) {
    const user = data.message.user;
    const records = data.message.records || [];

    if (user) {
      $("#employeeInfo").html(
        `<h2>${frappe.utils.escape_html(user.employee_name || "")}</h2>
         <p>Employee ID: ${frappe.utils.escape_html(
           user.name || ""
         )} | Sol ID: ${frappe.utils.escape_html(user.sol_id || "")}</p>`
      );
    }

    // Keep keys Title Case to match your original grouping/UI
    const groups = {
      Pending: [],
      Allocated: [],
      Unallocated: [],
      "Branch Unallocated": [],
    };

    // If your DB stores lowercase statuses, normalize to Title Case:
    records.forEach((r) => {
      const key = (r.status || "").replace(/\b\w/g, (c) => c.toUpperCase());
      if (groups[key]) groups[key].push(r);
    });

    // counts
    $("#pendingCountBadge").text(groups.Pending.length);
    $("#allocatedCountBadge").text(groups.Allocated.length);
    $("#unallocatedCountBadge").text(groups.Unallocated.length);
    $("#unallocatedCountBadge2").text(groups["Branch Unallocated"].length);

    // rotating toast
    pendingAgentQueue = groups.Pending.map((r) => r.name);
    startPendingAgentToasts();

    // tables
    $("#pendingRecords").html(
      groups.Pending.map((r, i) => formatRow(r, i)).join("") || blank()
    );
    $("#allocatedRecords").html(
      groups.Allocated.map((r, i) => formatRow(r, i)).join("") || blank()
    );
    $("#unallocatedRecords").html(
      groups.Unallocated.map((r, i) => formatRow(r, i)).join("") || blank()
    );
    $("#unallocatedRecords2").html(
      groups["Branch Unallocated"].map((r, i) => formatRow(r, i)).join("") ||
        blank()
    );
  }

  // ---------- JS replacement for your Python API (uses client-side helpers)
  async function get_agent_records_filtered_js(
    branch_code = "1133",
    allocated_employee = "5888"
  ) {
    const always_show_statuses = ["pending", "unallocated"];

    const [other_records, allocated_records, userResp] = await Promise.all([
      frappe.db.get_list("Agent", {
        fields: ["name", "status", "employee", "modified", "branch_code"],
        filters: { branch_code, status: ["in", always_show_statuses] },
        order_by: "status asc",
        limit_page_length: 1000,
      }),
      frappe.db.get_list("Agent", {
        fields: ["name", "status", "employee", "modified", "branch_code"],
        filters: {
          branch_code,
          status: "allocated",
          employee: allocated_employee,
        },
        order_by: "name asc",
        limit_page_length: 1000,
      }),
      frappe.db.get_value("Employee", { name: allocated_employee }, [
        "name",
        "user_id",
        "employee_name",
        "sol_id",
      ]),
    ]);

    const user = userResp?.message || null;
    const records = [...allocated_records, ...other_records];

    const status_counts = {};
    for (const rec of records) {
      const s = rec.status || "";
      status_counts[s] = (status_counts[s] || 0) + 1;
    }
    const counts = Object.keys(status_counts).map((status) => ({
      status,
      count: status_counts[status],
    }));

    return { user, counts, records };
  }

  // ---------------- Load Data ----------------
  async function loadAgentData() {
    console.log("Current logged in user:", frappe.session.user);
    const data = await get_agent_records_filtered_js("1133", "5888");
    updateDashboard({ message: data });
  }

  loadAgentData();
};
