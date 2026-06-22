import frappe

def execute():
    doc = frappe.get_doc("Custom HTML Block", "Trainer Dashboard")

    doc.html = """<div class="aad-dashboard">
  <div class="aad-header">
    <div>
      <h1 class="aad-title">SS Trainer Dashboard</h1>
      <p class="aad-subtitle">Track agent activation calls and performance</p>
    </div>
    <div class="aad-header-actions">
      <div class="aad-reports-dropdown">
        <button class="aad-btn aad-btn-secondary aad-reports-btn">
          📊 Reports ▾
        </button>
        <div class="aad-dropdown-menu">
          <a class="aad-dropdown-item" data-report="Trainer Assignment Report">Trainer Assignment Report</a>
          <a class="aad-dropdown-item" data-report="Follow-up Report">Follow-up Report</a>
          <a class="aad-dropdown-item" data-report="Calling Not Done Report">Calling Not Done Report</a>
          <a class="aad-dropdown-item" data-report="Trainer-wise Calling Summary">Trainer-wise Calling Summary</a>
          <a class="aad-dropdown-item" data-report="Agent Exit Summary Report">Agent Exit Summary Report</a>
        </div>
      </div>
      <button class="aad-btn aad-btn-primary aad-create-btn">+ New Call Log</button>
    </div>
  </div>

  <div class="aad-filters-section">
    <div class="aad-filters-container">
      <div class="aad-filter-group">
        <label class="aad-label">From Date</label>
        <input type="date" class="aad-input aad-date-from" />
      </div>
      <div class="aad-filter-group">
        <label class="aad-label">To Date</label>
        <input type="date" class="aad-input aad-date-to" />
      </div>
      <button class="aad-btn aad-btn-secondary aad-reset-filter">Reset Filters</button>
    </div>
  </div>

  <div class="aad-stats">
    <div class="aad-stat-card" data-filter="all">
      <div class="aad-stat-label">Total Calls</div>
      <div class="aad-stat-value aad-total-count">0</div>
    </div>
    <div class="aad-stat-card" data-filter="stay">
      <div class="aad-stat-label">Wants to Stay</div>
      <div class="aad-stat-value aad-stat-green aad-stay-count">0</div>
    </div>
    <div class="aad-stat-card" data-filter="followup">
      <div class="aad-stat-label">Follow-up</div>
      <div class="aad-stat-value aad-stat-blue aad-followup-count">0</div>
    </div>
    <div class="aad-stat-card" data-filter="not_reachable">
      <div class="aad-stat-label">Not Reachable</div>
      <div class="aad-stat-value aad-stat-orange aad-notreachable-count">0</div>
    </div>
    <div class="aad-stat-card" data-filter="exited">
      <div class="aad-stat-label">Exited</div>
      <div class="aad-stat-value aad-stat-red aad-exited-count">0</div>
    </div>
  </div>

  <div class="aad-search-bar">
    <input type="text" class="aad-search" placeholder="Search by agent name or code..." />
  </div>

  <div class="aad-table-wrapper">
    <table class="aad-table">
      <thead>
        <tr>
          <th class="aad-col-index">#</th>
          <th>ID</th>
          <th>Status</th>
          <th>Agent</th>
          <th>Calling Date</th>
          <th>Reply Type</th>
          <th>Follow-up Date</th>
          <th>Doc Status</th>
        </tr>
      </thead>
      <tbody class="aad-table-body">
        <tr class="aad-loading-row"><td colspan="8"><div class="aad-spinner"></div></td></tr>
      </tbody>
    </table>
  </div>

  <div class="aad-footer">
    <div class="aad-pagination-info"><span class="aad-range-text">Showing 0-0 of 0</span></div>
    <div class="aad-pagination-buttons">
      <button class="aad-btn aad-prev-btn" disabled>Previous</button>
      <div class="aad-page-numbers"></div>
      <button class="aad-btn aad-next-btn" disabled>Next</button>
    </div>
  </div>
</div>"""

    doc.script = """(function(){
  const trainer = frappe.session.user !== "Administrator" ? frappe.session.user : null;
  const root = root_element;

  let statusFilter = null;
  let currentPage = 1;
  const pageSize = 20;
  let totalRecords = 0;
  let searchText = "";
  let dateFrom = null;
  let dateTo = null;
  let currentOffset = 0;
  const pageCache = {};

  function clearCache() { Object.keys(pageCache).forEach(k => delete pageCache[k]); }

  function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function initializeDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    dateFrom = formatDate(firstDay);
    dateTo = formatDate(today);
    root.querySelector(".aad-date-from").value = dateFrom;
    root.querySelector(".aad-date-to").value = dateTo;
  }

  function getBaseFilters(search = "") {
    const filters = {};
    if (trainer) filters["trainer"] = trainer;
    if (dateFrom && dateTo) filters["calling_date"] = ["between", [dateFrom, dateTo]];
    else if (dateFrom) filters["calling_date"] = [">=", dateFrom];
    else if (dateTo)   filters["calling_date"] = ["<=", dateTo];
    if (search) filters["agent"] = ["like", `%${search}%`];
    return filters;
  }

  function getFilters(search = "") {
    const filters = getBaseFilters(search);
    if (statusFilter === "stay")          filters["wants_to_stay"] = 1;
    else if (statusFilter === "exited")   filters["exited"] = 1;
    else if (statusFilter === "followup") filters["reply_type"] = ["in", ["Follow-up Required", "Call Back Later"]];
    else if (statusFilter === "not_reachable") filters["reply_type"] = "Not Reachable";
    return filters;
  }

  function getStatusInfo(log) {
    if (log.exited)        return { label: "Exited",        cls: "red" };
    if (log.wants_to_stay) return { label: "Wants to Stay", cls: "green" };
    if (log.reply_type === "Follow-up Required" || log.reply_type === "Call Back Later")
                           return { label: "Follow-up",     cls: "blue" };
    if (log.reply_type === "Not Reachable")
                           return { label: "Not Reachable", cls: "orange" };
    if (log.reply_type)    return { label: log.reply_type,  cls: "gray" };
    return { label: "Pending", cls: "gray" };
  }

  function getDocStatusInfo(ds) {
    if (ds === 0) return { label: "Draft",     cls: "gray" };
    if (ds === 1) return { label: "Submitted", cls: "green" };
    return { label: "Cancelled", cls: "red" };
  }

  async function fetchCount(filters) {
    try {
      const r = await frappe.call({ method: "frappe.client.get_count", args: { doctype: "Agent Activation Call Log", filters } });
      return r.message || 0;
    } catch(e) { return 0; }
  }

  async function fetchAnalytics() {
    const base = getBaseFilters();
    const [total, stay, exited, followup, notreachable] = await Promise.all([
      fetchCount(base),
      fetchCount({ ...base, wants_to_stay: 1 }),
      fetchCount({ ...base, exited: 1 }),
      fetchCount({ ...base, reply_type: ["in", ["Follow-up Required", "Call Back Later"]] }),
      fetchCount({ ...base, reply_type: "Not Reachable" }),
    ]);
    root.querySelector(".aad-total-count").textContent = total;
    root.querySelector(".aad-stay-count").textContent = stay;
    root.querySelector(".aad-exited-count").textContent = exited;
    root.querySelector(".aad-followup-count").textContent = followup;
    root.querySelector(".aad-notreachable-count").textContent = notreachable;
    totalRecords = statusFilter ? await fetchCount(getFilters()) : total;
  }

  async function fetchLogs(page = 1, search = "") {
    try {
      if (pageCache[page] && !search) return pageCache[page];
      const logs = await frappe.db.get_list("Agent Activation Call Log", {
        fields: ["name","agent","calling_date","modified","wants_to_stay","exited","reply_type","follow_up_date","docstatus"],
        filters: getFilters(search),
        order_by: "modified desc",
        limit_page_length: pageSize,
        limit_start: (page - 1) * pageSize
      });
      currentOffset = (page - 1) * pageSize;
      if (!search) pageCache[page] = logs;
      return logs;
    } catch(e) { console.error(e); return []; }
  }

  function renderTable(logs) {
    const tbody = root.querySelector(".aad-table-body");
    if (!logs.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="aad-empty-state"><p>No records found</p></td></tr>`;
      return;
    }
    tbody.innerHTML = logs.map((log, i) => {
      const s = getStatusInfo(log);
      const ds = getDocStatusInfo(log.docstatus);
      return `<tr style="cursor:pointer" onclick="frappe.set_route('Form','Agent Activation Call Log','${encodeURIComponent(log.name)}')">
        <td class="aad-col-index aad-font-mono">${currentOffset + i + 1}</td>
        <td><a class="aad-link" href="/app/agent-activation-call-log/${encodeURIComponent(log.name)}" onclick="event.stopPropagation()">${frappe.utils.escape_html(log.name)}</a></td>
        <td><span class="aad-badge aad-badge-${s.cls}">${s.label}</span></td>
        <td>${frappe.utils.escape_html(log.agent || "-")}</td>
        <td>${log.calling_date ? frappe.datetime.str_to_user(log.calling_date) : "-"}</td>
        <td>${frappe.utils.escape_html(log.reply_type || "-")}</td>
        <td>${log.follow_up_date ? frappe.datetime.str_to_user(log.follow_up_date) : "-"}</td>
        <td><span class="aad-badge aad-badge-${ds.cls}">${ds.label}</span></td>
      </tr>`;
    }).join("");
  }

  function updatePagination() {
    const totalPages = Math.ceil(totalRecords / pageSize);
    const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalRecords);
    root.querySelector(".aad-range-text").textContent = `Showing ${start}-${end} of ${totalRecords}`;
    root.querySelector(".aad-prev-btn").disabled = currentPage === 1;
    root.querySelector(".aad-next-btn").disabled = currentPage >= totalPages || !totalRecords;
    const container = root.querySelector(".aad-page-numbers");
    container.innerHTML = "";
    if (totalPages <= 1) return;
    let s = Math.max(1, currentPage - 2), e = Math.min(totalPages, s + 4);
    if (e - s < 4) s = Math.max(1, e - 4);
    for (let i = s; i <= e; i++) {
      const btn = document.createElement("button");
      btn.className = "aad-btn aad-page-btn" + (i === currentPage ? " aad-page-active" : "");
      btn.textContent = i;
      btn.onclick = () => goToPage(i);
      container.appendChild(btn);
    }
  }

  function updateActiveCard() {
    root.querySelectorAll(".aad-stat-card").forEach(c => c.classList.remove("active"));
    const sel = statusFilter ? `[data-filter="${statusFilter}"]` : `[data-filter="all"]`;
    const card = root.querySelector(`.aad-stat-card${sel}`);
    if (card) card.classList.add("active");
  }

  async function loadData() {
    root.querySelector(".aad-table-body").innerHTML =
      `<tr class="aad-loading-row"><td colspan="8"><div class="aad-spinner"></div></td></tr>`;
    await fetchAnalytics();
    updateActiveCard();
    const logs = await fetchLogs(currentPage, searchText);
    renderTable(logs);
    updatePagination();
  }

  async function goToPage(page) { currentPage = page; await loadData(); }

  function setupListeners() {
    root.querySelector(".aad-create-btn").onclick = () => frappe.new_doc("Agent Activation Call Log");

    // Reports dropdown
    const reportsBtn = root.querySelector(".aad-reports-btn");
    const dropdownMenu = root.querySelector(".aad-dropdown-menu");
    reportsBtn.onclick = (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("show");
    };
    document.addEventListener("click", () => dropdownMenu.classList.remove("show"));
    root.querySelectorAll(".aad-dropdown-item").forEach(item => {
      item.onclick = (e) => {
        e.stopPropagation();
        frappe.set_route("query-report", item.dataset.report);
        dropdownMenu.classList.remove("show");
      };
    });

    root.querySelector(".aad-date-from").onchange = e => { dateFrom = e.target.value; currentPage=1; clearCache(); loadData(); };
    root.querySelector(".aad-date-to").onchange   = e => { dateTo   = e.target.value; currentPage=1; clearCache(); loadData(); };

    root.querySelector(".aad-reset-filter").onclick = () => {
      initializeDates(); searchText=""; currentPage=1; statusFilter=null;
      root.querySelector(".aad-search").value="";
      clearCache(); loadData();
    };

    let searchTimer;
    root.querySelector(".aad-search").oninput = e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { searchText=e.target.value.trim(); currentPage=1; clearCache(); loadData(); }, 300);
    };

    root.querySelector(".aad-prev-btn").onclick = () => { if(currentPage>1) goToPage(currentPage-1); };
    root.querySelector(".aad-next-btn").onclick = () => {
      if(currentPage < Math.ceil(totalRecords/pageSize)) goToPage(currentPage+1);
    };

    root.querySelectorAll(".aad-stat-card").forEach(card => {
      card.style.cursor = "pointer";
      card.onclick = () => {
        statusFilter = card.dataset.filter === "all" ? null : card.dataset.filter;
        currentPage=1; clearCache(); loadData();
      };
    });
  }

  initializeDates();
  setupListeners();
  loadData();
})();"""

    # Append new CSS for dropdown + blue/gray stat colors
    extra_css = """
.aad-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.aad-reports-dropdown {
  position: relative;
}

.aad-dropdown-menu {
  display: none;
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  background: white;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  min-width: 220px;
  z-index: 1000;
  overflow: hidden;
}

.aad-dropdown-menu.show { display: block; }

.aad-dropdown-item {
  display: block;
  padding: 9px 14px;
  font-size: 13px;
  color: var(--text-base);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.1s;
}

.aad-dropdown-item:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

.aad-stat-blue { color: #2563eb; }
.aad-stat-gray { color: #6b7280; }
.aad-badge-blue { background:#dbeafe; color:#1d4ed8; border:1px solid #93c5fd; }
"""
    current_style = doc.style or ""
    if ".aad-dropdown-menu" not in current_style:
        doc.style = current_style + extra_css

    doc.save()
    frappe.db.commit()
    print("Trainer Dashboard v3 updated successfully.")
