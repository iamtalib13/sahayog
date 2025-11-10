frappe.pages["my-agent"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "My Agents",
    single_column: true,
  });

  // ---------------- HTML ----------------
  page.main.html(`
      <section id="employeeInfo" aria-label="Employee Information">
        <h2>Loading employee info...</h2>
        <p></p>
      </section>

      <input id="searchBox" type="text" class="form-control"
        placeholder="Search Agent ID / Name..."
        style="margin-bottom: 12px; max-width: 420px"
      />

      <nav class="tabs" role="tablist" aria-label="Agent Status Tabs">

        <div class="tab" role="tab" id="myAgentsTab">
          My Agents <span class="tab-count" id="myAgentsCountBadge">0</span>
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

        <!-- ✅ Pending -->
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
          <button id="pendingLoadMore" class="btn btn-secondary" style="margin-top:10px">Load More</button>
        </div>

        <!-- ✅ Allocated -->
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
          <button id="allocatedLoadMore" class="btn btn-secondary" style="margin-top:10px">Load More</button>
        </div>

        <!-- ✅ Unallocated -->
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
          <button id="unallocatedLoadMore" class="btn btn-secondary" style="margin-top:10px">Load More</button>
        </div>

        <!-- ✅ My Agents -->
        <div id="myAgentsPanel" class="tab-panel">
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
            <tbody id="myAgentsRecords"></tbody>
          </table>
          <button id="myAgentsLoadMore" class="btn btn-secondary" style="margin-top:10px">Load More</button>
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
        .tab-panel { display: none; margin-bottom: 20px; }
        .tab-panel.active { display: block; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; background: white; border-radius: 10px; overflow: hidden; }
        thead { background: #f9fafc; font-weight: bold; }
        td, th { padding: 10px; border-bottom: 1px solid #eee; }
        #toast-container { position: fixed; top: 120px; right: 30px; display: flex; flex-direction: column; gap: 12px; z-index: 10000; }
        .toast-card { background: #036d6a; padding: 14px 18px; border-radius: 14px; color: white; display: flex; justify-content: space-between; min-width: 260px; animation: fadeIn .3s ease-out; cursor: pointer; }
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
    main.find(`#${tabID.replace("Tab", "Panel")}`).addClass("active");
  }
  activeTab("myAgentsTab");
  main.find(".tab").on("click", function () {
    activeTab($(this).attr("id"));
  });

  // ---------------- Toast ----------------
  function showToast({
    title,
    message,
    icon = "⏳",
    timeout = 3500,
    agent_id = null,
  }) {
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

    if (agent_id) {
      toast.onclick = () =>
        (window.top.location.href = `/app/agent/${agent_id}`);
    }
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "fadeOut .3s forwards";
      setTimeout(() => toast.remove(), 300);
    }, timeout);
  }

  let pendingAgentQueue = [];
  let pendingToastInterval = null;
  function startPendingAgentToasts() {
    if (pendingToastInterval) return;
    let index = 0;
    pendingToastInterval = setInterval(() => {
      if (!pendingAgentQueue.length) return;
      showToast({
        title: "Pending Approval",
        message: `Agent ID: ${pendingAgentQueue[index]}`,
        agent_id: pendingAgentQueue[index],
      });
      index = (index + 1) % pendingAgentQueue.length;
    }, 5000);
  }

  // ---------------- STATE ----------------
  const STATE = {
    records: [],
    grouped: {},
    limits: { Pending: 10, Allocated: 10, Unallocated: 10, MyAgents: 10 },
    pageSize: 10,
    user: null,
    filtered: [],
  };

  function resetLimits() {
    STATE.limits = {
      Pending: 10,
      Allocated: 10,
      Unallocated: 10,
      MyAgents: 10,
    };
  }

  // ---------------- HELPERS ----------------
  function formatRow(r, i) {
    const modified = r.modified ? frappe.datetime.str_to_user(r.modified) : "";
    return `
      <tr onclick="window.top.location.href='/app/agent/${r.name}'">
        <td>${i + 1}</td>
        <td>${r.name}</td>
        <td>${r.employee ?? "NA"}</td>
        <td>${r.branch_code ?? "NA"}</td>
        <td>${r.status_label}</td>
        <td>${modified}</td>
      </tr>`;
  }

  function blank() {
    return `<tr><td colspan="6" style="text-align:center">No Records</td></tr>`;
  }

  function renderGroup(label, tbodyId, loadBtnId) {
    let tbody = document.getElementById(tbodyId);
    let loadBtn = document.getElementById(loadBtnId);

    let group = STATE.grouped[label] || [];
    let limit = STATE.limits[label];

    let visible = group.slice(0, limit);
    tbody.innerHTML = visible.map(formatRow).join("") || blank();

    if (visible.length >= group.length) loadBtn.style.display = "none";
    else loadBtn.style.display = "block";
  }

  // ---------------- SEARCH ----------------
  $("#searchBox").on("input", function () {
    let q = this.value.trim().toLowerCase();
    resetLimits();
    if (!q) {
      updateDashboard({ user: STATE.user, records: STATE.records });
      return;
    }

    let filtered = STATE.records.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.employee?.toLowerCase().includes(q)
    );

    updateDashboard({ user: STATE.user, records: filtered });
  });

  // ---------------- UPDATE UI ----------------
  function updateDashboard(data) {
    let user = data.user;
    let records = data.records || [];
    STATE.filtered = records;

    if (user) {
      $("#employeeInfo").html(
        `<h2>${frappe.utils.escape_html(user.employee_name || "")}</h2>
         <p>Employee ID: ${frappe.utils.escape_html(user.name || "")} |
            Sol ID: ${frappe.utils.escape_html(user.sol_id || "")}</p>`
      );
    }

    const groups = {
      Pending: [],
      Allocated: [],
      Unallocated: [],
      MyAgents: [],
    };

    records.forEach((r) => {
      if (r.status_label === "Pending") groups.Pending.push(r);
      if (r.status_label === "Allocated") groups.Allocated.push(r);
      if (r.status_label === "Unallocated") groups.Unallocated.push(r);
      if (r.employee === user.name) groups.MyAgents.push(r);
    });

    STATE.grouped = groups;

    $("#pendingCountBadge").text(groups.Pending.length);
    $("#allocatedCountBadge").text(groups.Allocated.length);
    $("#unallocatedCountBadge").text(groups.Unallocated.length);
    $("#myAgentsCountBadge").text(groups.MyAgents.length);

    renderGroup("Pending", "pendingRecords", "pendingLoadMore");
    renderGroup("Allocated", "allocatedRecords", "allocatedLoadMore");
    renderGroup("Unallocated", "unallocatedRecords", "unallocatedLoadMore");
    renderGroup("MyAgents", "myAgentsRecords", "myAgentsLoadMore");

    pendingAgentQueue = groups.Pending.map((r) => r.name);
    startPendingAgentToasts();
  }

  // ---------------- LOAD MORE ----------------
  $("#pendingLoadMore").on("click", function () {
    STATE.limits.Pending += STATE.pageSize;
    renderGroup("Pending", "pendingRecords", "pendingLoadMore");
  });
  $("#allocatedLoadMore").on("click", function () {
    STATE.limits.Allocated += STATE.pageSize;
    renderGroup("Allocated", "allocatedRecords", "allocatedLoadMore");
  });
  $("#unallocatedLoadMore").on("click", function () {
    STATE.limits.Unallocated += STATE.pageSize;
    renderGroup("Unallocated", "unallocatedRecords", "unallocatedLoadMore");
  });
  $("#myAgentsLoadMore").on("click", function () {
    STATE.limits.MyAgents += STATE.pageSize;
    renderGroup("MyAgents", "myAgentsRecords", "myAgentsLoadMore");
  });

  // ---------------- FETCH DATA ----------------
  async function get_agent_records_filtered_js() {
    let emp_code = frappe.session.user.split("@")[0];

    let empRes = await frappe.db.get_value("Employee", emp_code, [
      "name",
      "employee_name",
      "sol_id",
    ]);

    let employee = empRes?.message || null;
    if (!employee) return { user: null, records: [] };

    let user_id = employee.name;
    let branch_code = employee.sol_id;

    let my_agents = await frappe.db.get_list("Agent", {




    let final = [...my_agents, ...other_records];
    let unique = {};
    final.forEach((r) => {
      r.status = (r.status || "").trim().toLowerCase();
      unique[r.name] = r;
    });
    final = Object.values(unique);

    final = final.map((r) => ({
      ...r,
      status_label: r.status.replace(/\b\w/g, (c) => c.toUpperCase()),
    }));

    return {
      user: employee,
      records: final,
    };
  }

  // ---------------- LOAD DATA ----------------
  async function loadAgentData() {
    const data = await get_agent_records_filtered_js();
    STATE.records = data.records;
    STATE.user = data.user;
    updateDashboard(data);
  }

  loadAgentData();
};
