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
              <div id="infoBox"
          style="
            display:none;
            background:#eee;
            padding:12px 14px;
            border-radius:8px;
            font-size:14px;
            margin-bottom:12px;
          "
        >
          If you don’t see the agent name,
          the record may have been created by someone else.
        </div>



      <input id="searchBox" type="text" class="form-control"
        placeholder="Search Agent ID / Name..."
        style="margin-bottom: 12px; max-width: 420px"
      />

      <nav class="tabs" role="tablist" aria-label="Agent Status Tabs">

        <div class="tab" role="tab" id="myAgentsTab">
          My Agents <span class="tab-count" id="myAgentsCountBadge">0</span>
        </div>

        <div class="tab" role="tab" id="pendingTab">
          Approval Pending 
          <span class="tab-count bubble-anim" id="pendingCountBadge">0</span>
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
/* ---- FIRE BALL COUNT ---- */
.bubble-anim {
  position: relative;
  background: radial-gradient(circle at 50% 60%, #ffea00, #ff7a00, #ff002f);
  box-shadow:
    0 0 6px #ff6a00,
    0 0 12px #ff2f00,
    0 0 18px #ff002f,
    inset 0 0 6px #ffe600;
  border-radius: 50%;
  padding: 3px 8px;
  animation: firePulse 1.6s infinite ease-in-out;
  color: #fff !important;
  font-weight: 700;
}

/* hotter pulsing center */
@keyframes firePulse {
  0% {
    transform: scale(1);
    box-shadow:
      0 0 6px #ff6a00,
      0 0 12px #ff2f00,
      0 0 18px #ff002f,
      inset 0 0 6px #ffe600;
    background: radial-gradient(circle at 50% 60%, #ffe600, #ff7a00, #ff002f);
  }
  50% {
    transform: scale(1.22);
    box-shadow:
      0 0 10px #ff8800,
      0 0 20px #ff3300,
      0 0 28px #ff0040,
      inset 0 0 10px #fff200;
    background: radial-gradient(circle at 50% 60%, #fff200, #ff8100, #ff0034);
  }
  100% {
    transform: scale(1);
    box-shadow:
      0 0 6px #ff6a00,
      0 0 12px #ff2f00,
      0 0 18px #ff002f,
      inset 0 0 6px #ffe600;
    background: radial-gradient(circle at 50% 60%, #ffe600, #ff7a00, #ff002f);
  }
}

/* rising sparks */
.bubble-anim::before,
.bubble-anim::after {
  content: "";
  position: absolute;
  bottom: -2px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 230, 0, 0.8);
  animation: fireSpark 1.6s infinite ease-out;
  opacity: 0;
}

.bubble-anim::before {
  left: 20%;
  animation-delay: 0.3s;
}
.bubble-anim::after {
  left: 70%;
  animation-delay: 0.9s;
}

@keyframes fireSpark {
  0%   { transform: translateY(0) scale(0.3); opacity: 0.4; }
  30%  { opacity: 1; }
  100% { transform: translateY(-16px) scale(0.1); opacity: 0; }
}

      </style>
    `);

  // ---------------- TAB LOGIC ----------------
  const main = $(page.main);
  function activeTab(tabID) {
    main.find(".tab").removeClass("active");
    main.find(".tab-panel").removeClass("active");
    main.find(`#${tabID}`).addClass("active");
    main.find(`#${tabID.replace("Tab", "Panel")}`).addClass("active");

    if (tabID === "myAgentsTab" || tabID === "pendingTab") {
      $("#infoBox").show();
    } else {
      $("#infoBox").hide();
    }
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
      if (
        r.status_label === "Pending" &&
        (r.requested_by?.toLowerCase() ===
          user.name?.toLowerCase() + "@sahayog.com" ||
          r.approved_by?.toLowerCase() ===
            user.name?.toLowerCase() + "@sahayog.com")
      ) {
        groups.Pending.push(r);
        groups.MyAgents.push(r);
      }

      if (r.status_label === "Allocated") groups.Allocated.push(r);

      if (r.status_label === "Unallocated") groups.Unallocated.push(r);

      if (r.employee === user.name) groups.MyAgents.push(r);
    });

    STATE.grouped = groups;

    // ✅ ✅ UPDATED ONLY THIS BLOCK
    $("#pendingCountBadge").text(groups.Pending.length);

    if (groups.Pending.length > 0) {
      $("#pendingCountBadge").addClass("bubble-anim");
    } else {
      $("#pendingCountBadge").removeClass("bubble-anim");
    }

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
      fields: ["name", "status", "employee", "modified", "branch_code"],
      filters: { employee: user_id },
      order_by: "modified desc",
      limit_page_length: 5000,
    });

    let other_records = await frappe.db.get_list("Agent", {
      fields: [
        "name",
        "status",
        "employee",
        "modified",
        "branch_code",
        "requested_by",
        "approved_by",
      ],
      filters: {
        branch_code,
        status: ["in", ["Pending", "Unallocated"]],
      },
      order_by: "modified desc",
      limit_page_length: 5000,
    });

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
