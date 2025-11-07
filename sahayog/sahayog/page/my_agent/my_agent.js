frappe.pages["my-agent"].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "My Agents",
    single_column: true,
  });

  // Inject full HTML markup
  page.main.html(`
      <section id="employeeInfo" aria-label="Employee Information">
        <h2>Loading employee info...</h2>
        <p></p>
      </section>

      <nav class="tabs" role="tablist" aria-label="Agent Status Tabs">
        <div class="tab active" role="tab" tabindex="0" aria-selected="true" id="unallocatedTab2">
          My Agents<span class="tab-count" id="unallocatedCountBadge2">0</span>
        </div>
        <div class="tab" role="tab" tabindex="-1" aria-selected="false" id="pendingTab">
          Approval Pending<span class="tab-count" id="pendingCountBadge">0</span>
        </div>
        <div class="tab" role="tab" tabindex="-1" aria-selected="false" id="allocatedTab">
          Branch Allocated<span class="tab-count" id="allocatedCountBadge">0</span>
        </div>
        <div class="tab" role="tab" tabindex="-1" aria-selected="false" id="unallocatedTab">
          Branch Unallocated<span class="tab-count" id="unallocatedCountBadge">0</span>
        </div>
      </nav>

      <section class="tab-panels">
        <div id="pendingPanel" class="tab-panel" role="tabpanel" aria-labelledby="pendingTab" tabindex="0">
          <table aria-label="My Agents List">
            <thead>
              <tr>
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

        <div id="allocatedPanel" class="tab-panel" role="tabpanel" aria-labelledby="allocatedTab" tabindex="0">
          <table aria-label="Approval Pending List">
            <thead>
              <tr>
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

        <div id="unallocatedPanel" class="tab-panel" role="tabpanel" aria-labelledby="unallocatedTab" tabindex="0">
          <table aria-label="Branch Allocated List">
            <thead>
              <tr>
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

        <div id="unallocatedPanel2" class="tab-panel active" role="tabpanel" aria-labelledby="unallocatedTab2" tabindex="0">
          <table aria-label="Branch Unallocated List">
            <thead>
              <tr>
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

      <style>
        :root {
          --primary: #036d6a;
          --pending: #ffc107;
          --allocated: #28a745;
          --unallocated: #dc3545;
          --gray: #6c757d;
          --light-gray: #f9fafc;
        }
        h1 {margin-bottom: 20px;}
        #employeeInfo {margin-bottom: 30px;}
        #employeeInfo h2 {margin-bottom: 6px; font-weight: 700;}
        #employeeInfo p {color: var(--gray); font-weight: 600;}
        .tabs {display: flex; gap: 1.5rem; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; margin-bottom: 15px; background: #f8f9fa; user-select: none;}
        .tab {flex: 1; padding: 12px 1rem; text-align: center; font-weight: 600; color: var(--gray); cursor: pointer; position: relative; transition: background 0.3s, color 0.3s; border-bottom: 3px solid transparent; border-radius: 8px 8px 0 0;}
        .tab.active {background: white; color: var(--primary); border-bottom: 3px solid var(--primary); box-shadow: 0 -2px 8px rgba(67, 97, 238, 0.3);}
        .tab-count {background: var(--primary); color: white; font-size: 12px; font-weight: 700; border-radius: 12px; padding: 2px 10px; margin-left: 8px; vertical-align: middle;}
        .tab-panels {background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(67, 97, 238, 0.15); border: 1px solid #ccc; padding: 20px;}
        .tab-panel {display: none;}
        .tab-panel.active {display: block;}
        table {width: 100%; border-collapse: collapse; font-size: 14px;}
        thead tr {background: var(--light-gray); font-weight: 600; color: var(--gray);}
        thead th {padding: 12px 10px; text-align: left; border-bottom: 2px solid #eee;}
        tbody tr {border-bottom: 1px solid #eee;}
        tbody tr:hover {background: #f0f4ff; cursor: pointer;}
        tbody td {padding: 10px;}
        .status-badge {padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 600; display: inline-block; color: white; min-width: 90px; text-align: center;}
        .pending-badge {background-color: var(--pending); color: #613c00;}
        .allocated-badge {background-color: var(--allocated);}
        .unallocated-badge {background-color: var(--unallocated);}
        footer {text-align: center; font-size: 12px; margin-top: 30px; color: var(--gray);}
      </style>
    `);

  const main = $(page.main);

  // ✅ FORCE DEFAULT = My Agents
  main.find(".tab").removeClass("active").attr("aria-selected", false);
  main.find(".tab-panel").removeClass("active");

  main
    .find("#unallocatedTab2")
    .addClass("active")
    .attr("aria-selected", true)
    .attr("tabindex", 0);

  main.find("#unallocatedPanel2").addClass("active");

  // --- Tab logic ---
  main.find(".tab").on("click", function () {
    const newActiveId = $(this).attr("id");

    main
      .find(".tab")
      .removeClass("active")
      .attr("aria-selected", false)
      .attr("tabindex", -1);

    $(this).addClass("active").attr("aria-selected", true).attr("tabindex", 0);

    main.find(".tab-panel").removeClass("active");

    const targetPanel = newActiveId.replace("Tab", "Panel");
    main.find(`#${targetPanel}`).addClass("active");
  });

  function formatRow(r) {
    const statusClass =
      r.status === "Pending"
        ? "pending-badge"
        : r.status === "Allocated"
        ? "allocated-badge"
        : r.status === "Unallocated" || r.status === "Branch Unallocated"
        ? "unallocated-badge"
        : "";

    const modifiedDate = frappe.datetime.str_to_user(r.modified);

    return `<tr onclick="window.top.location.href='/app/agent/${r.name}'">
        <td>${r.name}</td>
        <td>${r.employee || "No employee"}</td>
		<td>${r.branch_code || "N/A"}</td>
        <td><span class="status-badge ${statusClass}">${r.status}</span></td>
        <td>${modifiedDate}</td>
      </tr>`;
  }

  function updateDashboard(data) {
    const user = data.message.user;
    const counts = data.message.counts;
    const records = data.message.records;

    if (user) {
      main
        .find("#employeeInfo")
        .html(
          `<h2>${user.employee_name}</h2><p>Employee ID: ${user.name} | Sol ID: ${user.sol_id}</p>`
        );
    } else {
      main.find("#employeeInfo").html("<p>Employee info not available</p>");
    }

    counts.forEach((item) => {
      let badgeId;
      switch (item.status) {
        case "Pending":
          badgeId = "#pendingCountBadge";
          break;
        case "Allocated":
          badgeId = "#allocatedCountBadge";
          break;
        case "Unallocated":
          badgeId = "#unallocatedCountBadge";
          break;
        case "Branch Unallocated":
          badgeId = "#unallocatedCountBadge2";
          break;
      }
      if (badgeId) main.find(badgeId).text(item.count);
    });

    const groups = {
      "Branch Unallocated": [],
      Pending: [],
      Allocated: [],
      Unallocated: [],
    };

    records.forEach((r) => {
      if (groups[r.status]) groups[r.status].push(r);
    });

    main
      .find("#pendingRecords")
      .html(
        groups.Pending.length
          ? groups.Pending.map(formatRow).join("")
          : `<tr><td colspan="4">No records</td></tr>`
      );

    main
      .find("#allocatedRecords")
      .html(
        groups.Allocated.length
          ? groups.Allocated.map(formatRow).join("")
          : `<tr><td colspan="4">No records</td></tr>`
      );

    main
      .find("#unallocatedRecords")
      .html(
        groups.Unallocated.length
          ? groups.Unallocated.map(formatRow).join("")
          : `<tr><td colspan="4">No records</td></tr>`
      );

    main
      .find("#unallocatedRecords2")
      .html(
        groups["Branch Unallocated"].length
          ? groups["Branch Unallocated"].map(formatRow).join("")
          : `<tr><td colspan="4">No records</td></tr>`
      );
  }

  function loadAgentData() {
    frappe.call({
      method: "sahayog.api.get_employee_details.get_agent_records_filtered",
      args: {
        branch_code: "1133",
        allocated_employee: "5888",
      },
      callback: function (r) {
        if (r.message) updateDashboard({ message: r.message });
      },
    });
  }

  loadAgentData();
};
