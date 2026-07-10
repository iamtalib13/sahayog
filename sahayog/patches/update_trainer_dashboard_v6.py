import frappe

# ─────────────────────────────────────────────────────────────────────────────
# HTML
# ─────────────────────────────────────────────────────────────────────────────
DASHBOARD_HTML = """<div class="aad-dashboard">

  <!-- HEADER -->
  <div class="aad-header">
    <div>
      <h1 class="aad-title">SS Trainer Dashboard</h1>
      <p class="aad-subtitle">Track agent activation calls and performance</p>
    </div>
    <div class="aad-header-actions">
      <div class="aad-reports-dropdown">
        <button class="aad-btn aad-btn-secondary aad-reports-btn">&#128202; Reports &#9662;</button>
        <div class="aad-dropdown-menu">
          <a class="aad-dropdown-item" data-report="Trainer Assignment Report">Trainer Assignment Report</a>
          <a class="aad-dropdown-item" data-report="Follow-up Report">Follow-up Report</a>
          <a class="aad-dropdown-item" data-report="Calling Not Done Report">Calling Not Done Report</a>
          <a class="aad-dropdown-item" data-report="Trainer-wise Calling Summary">Trainer-wise Calling Summary</a>
          <a class="aad-dropdown-item" data-report="Agent Exit Summary Report">Agent Exit Summary Report</a>
          <a class="aad-dropdown-item" data-report="Detailed Agent Calling Report">Detailed Agent Calling Report</a>
        </div>
      </div>
      <button class="aad-btn aad-btn-primary aad-create-btn">+ New Call Log</button>
    </div>
  </div>

  <!-- TABS -->
  <div class="aad-tabs">
    <button class="aad-tab active" data-tab="calllogs">&#128203; Call Logs</button>
    <button class="aad-tab" data-tab="trainers">&#128197; Meetings</button>
    <button class="aad-tab" data-tab="calendar">&#128198; Calendar</button>
  </div>

  <!-- TAB 1: CALL LOGS -->
  <div class="aad-tab-content active" id="tab-calllogs">
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
      <div class="aad-stat-card" data-filter="want_to_exit">
        <div class="aad-stat-label">Want to Exit</div>
        <div class="aad-stat-value aad-stat-red aad-want-to-exit-count">0</div>
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
            <th>Last Modified</th>
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
  </div>

  <!-- TAB 2: MEETINGS -->
  <div class="aad-tab-content" id="tab-trainers">
    <div class="aad-filters-section">
      <div class="aad-filters-container">
        <div class="aad-filter-group">
          <label class="aad-label">From Date</label>
          <input type="date" class="aad-input aad-tr-date-from" />
        </div>
        <div class="aad-filter-group">
          <label class="aad-label">To Date</label>
          <input type="date" class="aad-input aad-tr-date-to" />
        </div>
        <div class="aad-filter-group">
          <label class="aad-label">Topic</label>
          <select class="aad-input aad-tr-topic-filter">
            <option value="">All Topics</option>
            <option value="Meeting">Meeting</option>
            <option value="Induction">Induction</option>
            <option value="Refreshment Training">Refreshment Training</option>
          </select>
        </div>
        <div class="aad-filter-group">
          <label class="aad-label">Calendar Type</label>
          <select class="aad-input aad-tr-caltype-filter">
            <option value="">All</option>
            <option value="SS Training">SS Training</option>
            <option value="Employee Training">Employee Training</option>
          </select>
        </div>
        <button class="aad-btn aad-btn-secondary aad-tr-reset">Reset</button>
        <button class="aad-btn aad-btn-primary aad-tr-new-meeting">+ New Meeting</button>
      </div>
    </div>
    <div class="aad-table-wrapper">
      <table class="aad-table">
        <thead>
          <tr>
            <th class="aad-col-index">#</th>
            <th>Date</th>
            <th>Time</th>
            <th>Topic</th>
            <th>Calendar Type</th>
            <th>Trainer</th>
            <th>Attendees</th>
          </tr>
        </thead>
        <tbody class="aad-tr-body">
          <tr class="aad-loading-row"><td colspan="7"><div class="aad-spinner"></div></td></tr>
        </tbody>
      </table>
    </div>
    <div class="aad-footer">
      <div class="aad-pagination-info"><span class="aad-mt-range-text">Showing 0-0 of 0</span></div>
      <div class="aad-pagination-buttons">
        <button class="aad-btn aad-mt-prev-btn" disabled>Previous</button>
        <div class="aad-mt-page-numbers"></div>
        <button class="aad-btn aad-mt-next-btn" disabled>Next</button>
      </div>
    </div>
  </div>

  <!-- TAB 3: CALENDAR -->
  <div class="aad-tab-content" id="tab-calendar">
    <div class="aad-cal-type-bar aad-cal-type-hidden">
      <span class="aad-cal-type-pill active" data-ctype="SS Training">SS Training</span>
      <span class="aad-cal-type-pill" data-ctype="Employee Training">Employee Training</span>
      <span class="aad-cal-type-pill" data-ctype="">All</span>
    </div>
    <div class="aad-cal-nav">
      <button class="aad-btn aad-cal-prev">&#8592;</button>
      <h2 class="aad-cal-month-label"></h2>
      <button class="aad-btn aad-cal-next">&#8594;</button>
      <button class="aad-btn aad-btn-primary aad-cal-new-meeting aad-cal-type-hidden">+ New Meeting</button>
    </div>
    <div class="aad-cal-legend">
      <span class="aad-cal-legend-item"><span class="aad-cal-dot cal-dot-meeting"></span>Meeting</span>
      <span class="aad-cal-legend-item"><span class="aad-cal-dot cal-dot-induction"></span>Induction</span>
      <span class="aad-cal-legend-item"><span class="aad-cal-dot cal-dot-refreshment"></span>Refreshment</span>
      <span class="aad-cal-legend-item"><span class="aad-cal-dot cal-dot-ss"></span>SS Training</span>
      <span class="aad-cal-legend-item"><span class="aad-cal-dot cal-dot-employee"></span>Employee Training</span>
    </div>
    <div class="aad-cal-dow-row">
      <div class="aad-cal-dow">Sun</div><div class="aad-cal-dow">Mon</div>
      <div class="aad-cal-dow">Tue</div><div class="aad-cal-dow">Wed</div>
      <div class="aad-cal-dow">Thu</div><div class="aad-cal-dow">Fri</div>
      <div class="aad-cal-dow">Sat</div>
    </div>
    <div class="aad-cal-body"></div>
    <div class="aad-cal-popup aad-cal-type-hidden">
      <div class="aad-cal-popup-card">
        <button class="aad-cal-popup-close">&#10005;</button>
        <div class="aad-cal-popup-body"></div>
      </div>
    </div>
  </div>

</div>"""

# ─────────────────────────────────────────────────────────────────────────────
# SCRIPT — Part 1: setup + call logs tab
# ─────────────────────────────────────────────────────────────────────────────
DASHBOARD_SCRIPT_P1 = """(function(){
  const root = root_element;
  const user = frappe.session.user;
  const roles = frappe.user_roles || [];
  const isHead = roles.includes("Trainer Head") || roles.includes("System Manager") || roles.includes("Administrator");
  const isTrainer = roles.includes("Trainer");
  const isEmployee = roles.includes("Employee") && !isHead && !isTrainer;
  const trainer = (!isHead && isTrainer) ? user : null;

  /* ── TAB SWITCHING ─────────────────────────────────────── */
  let activeTab = "calllogs";
  
  // Hide Meetings and Calendar tabs for non-Administrator users
  const isAdmin = roles.includes("Administrator");
  if (!isAdmin) {
    root.querySelector('.aad-tab[data-tab="trainers"]').style.display = 'none';
    root.querySelector('.aad-tab[data-tab="calendar"]').style.display = 'none';
  }
  
  root.querySelectorAll(".aad-tab").forEach(btn => {
    btn.onclick = () => {
      root.querySelectorAll(".aad-tab").forEach(t => t.classList.remove("active"));
      root.querySelectorAll(".aad-tab-content").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      activeTab = btn.dataset.tab;
      root.querySelector("#tab-" + activeTab).classList.add("active");
      if (activeTab === "trainers" && !trainerLoaded) loadTrainers();
      if (activeTab === "calendar" && !calLoaded) initCalendar();
    };
  });

  /* ── HEADER ACTIONS ────────────────────────────────────── */
  root.querySelector(".aad-create-btn").onclick = () => frappe.new_doc("Agent Activation Call Log");
  const reportsBtn = root.querySelector(".aad-reports-btn");
  const dropMenu   = root.querySelector(".aad-dropdown-menu");
  reportsBtn.onclick = e => { e.stopPropagation(); dropMenu.classList.toggle("show"); };
  document.addEventListener("click", () => dropMenu.classList.remove("show"));
  root.querySelectorAll(".aad-dropdown-item").forEach(item => {
    item.onclick = e => {
      e.stopPropagation();
      frappe.set_route("query-report", item.dataset.report);
      dropMenu.classList.remove("show");
    };
  });

  /* ════════════════════════════════════════════════════════
     TAB 1 — CALL LOGS
  ════════════════════════════════════════════════════════ */
  let statusFilter = null, currentPage = 1, totalRecords = 0;
  let searchText = "", dateFrom = null, dateTo = null, currentOffset = 0;
  const pageSize = 20, pageCache = {};

  function clearCache() { Object.keys(pageCache).forEach(k => delete pageCache[k]); }

  function fmt(date) {
    const d = new Date(date);
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }

  function initDates() {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    dateFrom = fmt(first); dateTo = fmt(today);
    root.querySelector(".aad-date-from").value = dateFrom;
    root.querySelector(".aad-date-to").value   = dateTo;
  }

  function baseFilters(search) {
    const f = {};
    if (trainer) f["trainer"] = trainer;
    if (dateFrom && dateTo) f["calling_date"] = ["between", [dateFrom, dateTo]];
    else if (dateFrom) f["calling_date"] = [">=", dateFrom];
    else if (dateTo)   f["calling_date"] = ["<=", dateTo];
    if (search) f["agent"] = ["like", "%" + search + "%"];
    return f;
  }

  function getFilters(search) {
    const f = baseFilters(search || "");
    if (statusFilter === "stay")          f["wants_to_stay"] = 1;
    else if (statusFilter === "exited")   f["exited"] = 1;
    else if (statusFilter === "want_to_exit") f["want_to_exit"] = 1;
    else if (statusFilter === "followup") f["reply_type"] = "Follow-up Required";
    else if (statusFilter === "not_reachable") f["reply_type"] = "Not Reachable";
    return f;
  }

  function statusInfo(log) {
    if (log.exited)        return { label: "Exited",        cls: "red" };
    if (log.want_to_exit)  return { label: "Want to Exit",  cls: "red" };
    if (log.wants_to_stay) return { label: "Wants to Stay", cls: "green" };
    if (log.reply_type === "Follow-up Required") return { label: "Follow-up",    cls: "blue" };
    if (log.reply_type === "Not Reachable")      return { label: "Not Reachable",cls: "orange" };
    if (log.reply_type) return { label: log.reply_type, cls: "gray" };
    return { label: "Pending", cls: "gray" };
  }

  function docStatusInfo(ds) {
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
    const base = baseFilters("");
    const [total, stay, exited, wte, followup, nr] = await Promise.all([
      fetchCount(base),
      fetchCount({ ...base, wants_to_stay: 1 }),
      fetchCount({ ...base, exited: 1 }),
      fetchCount({ ...base, want_to_exit: 1 }),
      fetchCount({ ...base, reply_type: "Follow-up Required" }),
      fetchCount({ ...base, reply_type: "Not Reachable" }),
    ]);
    root.querySelector(".aad-total-count").textContent       = total;
    root.querySelector(".aad-stay-count").textContent        = stay;
    root.querySelector(".aad-exited-count").textContent      = exited;
    root.querySelector(".aad-want-to-exit-count").textContent= wte;
    root.querySelector(".aad-followup-count").textContent    = followup;
    root.querySelector(".aad-notreachable-count").textContent= nr;
    totalRecords = statusFilter ? await fetchCount(getFilters("")) : total;
  }

  async function fetchLogs(page, search) {
    try {
      if (pageCache[page] && !search) return pageCache[page];
      const logs = await frappe.db.get_list("Agent Activation Call Log", {
        fields: ["name","agent","calling_date","modified","wants_to_stay","want_to_exit","exited","reply_type","follow_up_date","docstatus"],
        filters: getFilters(search || ""),
        order_by: "modified desc",
        limit_page_length: pageSize,
        limit_start: (page - 1) * pageSize
      });
      currentOffset = (page - 1) * pageSize;
      if (!search) pageCache[page] = logs;
      return logs;
    } catch(e) { return []; }
  }

  function renderTable(logs) {
    const tbody = root.querySelector(".aad-table-body");
    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="aad-empty-state"><p>No records found</p></td></tr>';
      return;
    }
    tbody.innerHTML = logs.map((log, i) => {
      const s = statusInfo(log), ds = docStatusInfo(log.docstatus);
      const fd = log.follow_up_date ? frappe.datetime.str_to_user(log.follow_up_date) : "-";
      const mod = log.modified ? frappe.datetime.prettyDate(log.modified) : "-";
      return '<tr class="aad-log-row" style="cursor:pointer" data-name="' + encodeURIComponent(log.name) + '">'
        + '<td class="aad-col-index aad-font-mono">' + (currentOffset + i + 1) + '</td>'
        + '<td><a class="aad-link" href="/app/agent-activation-call-log/' + encodeURIComponent(log.name) + '">' + frappe.utils.escape_html(log.name) + '</a></td>'
        + '<td><span class="aad-badge aad-badge-' + s.cls + '">' + s.label + '</span></td>'
        + '<td>' + frappe.utils.escape_html(log.agent || "-") + '</td>'
        + '<td>' + (log.calling_date ? frappe.datetime.str_to_user(log.calling_date) : "-") + '</td>'
        + '<td style="color:' + (log.reply_type === 'Positive' ? 'green' : log.reply_type === 'Negative' ? 'red' : 'inherit') + ';font-weight:' + (log.reply_type === 'Positive' || log.reply_type === 'Negative' ? '600' : 'normal') + '">' + frappe.utils.escape_html(log.reply_type || "-") + '</td>'
        + '<td>' + fd + '</td>'
        + '<td>' + mod + '</td>'
        + '</tr>';
    }).join("");
    // attach row click via JS — avoids inline onclick quote issues in shadow DOM
    tbody.querySelectorAll(".aad-log-row").forEach(row => {
      row.onclick = e => {
        if (e.target.tagName === "A") return;
        frappe.set_route("Form", "Agent Activation Call Log", decodeURIComponent(row.dataset.name));
      };
    });
  }

  function updatePagination() {
    const totalPages = Math.ceil(totalRecords / pageSize);
    const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end   = Math.min(currentPage * pageSize, totalRecords);
    root.querySelector(".aad-range-text").textContent = "Showing " + start + "-" + end + " of " + totalRecords;
    root.querySelector(".aad-prev-btn").disabled = currentPage === 1;
    root.querySelector(".aad-next-btn").disabled = currentPage >= totalPages || !totalRecords;
    const container = root.querySelector(".aad-page-numbers");
    container.innerHTML = "";
    if (totalPages <= 1) return;
    let s = Math.max(1, currentPage - 2), e = Math.min(totalPages, s + 4);
    if (e - s < 4) s = Math.max(1, e - 4);
    for (let pg = s; pg <= e; pg++) {
      const btn = document.createElement("button");
      btn.className = "aad-btn aad-page-btn" + (pg === currentPage ? " aad-page-active" : "");
      btn.textContent = pg;
      btn.onclick = () => goToPage(pg);
      container.appendChild(btn);
    }
  }

  function updateActiveCard() {
    root.querySelectorAll(".aad-stat-card").forEach(c => c.classList.remove("active"));
    const sel = statusFilter ? '[data-filter="' + statusFilter + '"]' : '[data-filter="all"]';
    const card = root.querySelector(".aad-stat-card" + sel);
    if (card) card.classList.add("active");
  }

  async function loadData() {
    root.querySelector(".aad-table-body").innerHTML =
      '<tr class="aad-loading-row"><td colspan="8"><div class="aad-spinner"></div></td></tr>';
    await fetchAnalytics();
    updateActiveCard();
    const logs = await fetchLogs(currentPage, searchText);
    renderTable(logs);
    updatePagination();
  }

  async function goToPage(page) { currentPage = page; await loadData(); }

  // Call Logs listeners
  root.querySelector(".aad-date-from").onchange = e => { dateFrom = e.target.value; currentPage=1; clearCache(); loadData(); };
  root.querySelector(".aad-date-to").onchange   = e => { dateTo   = e.target.value; currentPage=1; clearCache(); loadData(); };
  root.querySelector(".aad-reset-filter").onclick = () => {
    initDates(); searchText=""; currentPage=1; statusFilter=null;
    root.querySelector(".aad-search").value="";
    clearCache(); loadData();
  };
  let searchTimer;
  root.querySelector(".aad-search").oninput = e => {
    e.stopPropagation();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { searchText=e.target.value.trim(); currentPage=1; clearCache(); loadData(); }, 300);
  };
  root.querySelector(".aad-search").onkeydown = e => { e.stopPropagation(); };
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

  initDates();
  loadData();

  /* ── SHARED HELPERS (used by Meetings + Calendar tabs) ── */
  function fmtTime(t) {
    if (!t) return "";
    const parts = t.split(":");
    const h = parseInt(parts[0]), m = parseInt(parts[1]);
    const ap = h >= 12 ? "PM" : "AM";
    return (h % 12 || 12) + ":" + String(m).padStart(2,"0") + " " + ap;
  }

  const TOPIC_COLORS = {
    "Meeting":              { bg:"#dbeafe", border:"#3b82f6", text:"#1d4ed8" },
    "Induction":            { bg:"#dcfce7", border:"#22c55e", text:"#15803d" },
    "Refreshment Training": { bg:"#fef3c7", border:"#f59e0b", text:"#92400e" },
    "SS Training":          { bg:"#ede9fe", border:"#8b5cf6", text:"#5b21b6" },
    "Employee Training":    { bg:"#fce7f3", border:"#ec4899", text:"#9d174d" },
  };

  function eventColor(ev) {
    if (ev.calendar_type && TOPIC_COLORS[ev.calendar_type]) return TOPIC_COLORS[ev.calendar_type];
    return TOPIC_COLORS[ev.topic] || { bg:"#f3f4f6", border:"#9ca3af", text:"#374151" };
  }
"""

# ─────────────────────────────────────────────────────────────────────────────
# SCRIPT — Part 2: Meetings tab
# ─────────────────────────────────────────────────────────────────────────────
DASHBOARD_SCRIPT_P2 = """
  /* ════════════════════════════════════════════════════════
     TAB 2 — MEETINGS
  ════════════════════════════════════════════════════════ */
  let trainerLoaded = false;
  let trDateFrom = null, trDateTo = null, trTopic = "", trCalType = "";
  let mtCurrentPage = 1, mtTotalRecords = 0;
  const mtPageSize = 20;

  function initTrDates() {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    trDateFrom = fmt(first); trDateTo = fmt(today);
    root.querySelector(".aad-tr-date-from").value = trDateFrom;
    root.querySelector(".aad-tr-date-to").value   = trDateTo;
  }

  function getMtFilters() {
    const f = { docstatus: ["<", 2] };
    if (trDateFrom && trDateTo) f["date"] = ["between", [trDateFrom, trDateTo]];
    if (trTopic) f["topic"] = trTopic;
    if (trCalType) f["calendar_type"] = trCalType;
    // Employee role: only show their own meetings
    if (isEmployee) f["owner"] = user;
    return f;
  }

  async function fetchMeetingCount(filters) {
    try {
      const r = await frappe.call({ method: "frappe.client.get_count", args: { doctype: "Meeting", filters } });
      return r.message || 0;
    } catch(e) { return 0; }
  }

  async function fetchMeetings(page) {
    try {
      return await frappe.db.get_list("Meeting", {
        fields: ["name","date","start_time","end_time","topic","calendar_type","training_location","trainer"],
        filters: getMtFilters(),
        order_by: "date desc, start_time desc",
        limit_page_length: mtPageSize,
        limit_start: (page - 1) * mtPageSize
      });
    } catch(e) { return []; }
  }

  function renderMeetingsTable(meetings) {
    const tbody = root.querySelector(".aad-tr-body");
    if (!meetings.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="aad-empty-state"><p>No meetings found</p></td></tr>';
      return;
    }

    // Initialize data structures
    const trainerIds = meetings.map(m => m.trainer).filter(Boolean);
    const meetingNames = meetings.map(m => m.name);
    const trainerNames = {};
    const attendeeDetails = {};

    // Create promises array
    const allPromises = [];

    // Fetch trainer names
    if (trainerIds.length) {
      const trainerPromise = frappe.db.get_list("Employee", {
        filters: [["name","in", trainerIds]],
        fields: ["name","employee_name"],
        limit_page_length: 0
      }).then(emps => {
        emps.forEach(e => { trainerNames[e.name] = e.employee_name || e.name; });
      });
      allPromises.push(trainerPromise);
    }

    // Fetch attendee details for each meeting
    meetingNames.forEach(name => {
      const attendeePromise = frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "Meeting",
          name: name
        }
      }).then(r => {
        if (r.message && r.message.attandees_table && r.message.attandees_table.length > 0) {
          // Use full_name if available, otherwise agent_employee
          attendeeDetails[name] = r.message.attandees_table.map(a => 
            a.full_name || a.agent_employee || "-"
          ).filter(n => n !== "-");
        } else {
          attendeeDetails[name] = [];
        }
      }).catch(err => {
        console.error("Error fetching attendees for " + name, err);
        attendeeDetails[name] = [];
      });
      allPromises.push(attendeePromise);
    });

    // Wait for all promises to complete then render
    Promise.all(allPromises).then(() => {
      tbody.innerHTML = meetings.map((m, i) => {
        const dateStr = m.date ? frappe.datetime.str_to_user(m.date) : "-";
        const timeStr = (m.start_time ? fmtTime(m.start_time) : "") + (m.end_time ? " – " + fmtTime(m.end_time) : "");
        const c = eventColor(m);
        const trainer = trainerNames[m.trainer] || m.trainer || "-";
        const attendees = attendeeDetails[m.name] || [];
        
        let attendeeDisplay = "-";
        if (attendees.length > 0) {
          const showNames = attendees.slice(0, 2);
          const remaining = attendees.length - showNames.length;
          attendeeDisplay = '<div style="font-size:11px;line-height:1.4">' 
            + showNames.map(name => '<div style="margin:2px 0">' + frappe.utils.escape_html(name) + '</div>').join('')
            + (remaining > 0 ? '<div style="color:#6c7680;font-style:italic;margin-top:2px">+' + remaining + ' more</div>' : '')
            + '</div>';
        }
        
        return '<tr class="aad-mt-row" style="cursor:pointer" data-name="' + encodeURIComponent(m.name) + '">'
          + '<td class="aad-col-index">' + ((mtCurrentPage - 1) * mtPageSize + i + 1) + '</td>'
          + '<td>' + dateStr + '</td>'
          + '<td>' + (timeStr || "-") + '</td>'
          + '<td><span class="aad-badge" style="background:' + c.bg + ';color:' + c.text + ';border:1px solid ' + c.border + '">' + frappe.utils.escape_html(m.topic || "-") + '</span></td>'
          + '<td>' + (m.calendar_type ? '<span class="aad-badge" style="background:' + c.bg + ';color:' + c.text + ';border:1px solid ' + c.border + '">' + m.calendar_type + '</span>' : "-") + '</td>'
          + '<td>' + frappe.utils.escape_html(trainer) + '</td>'
          + '<td class="aad-tr-left">' + attendeeDisplay + '</td>'
          + '</tr>';
      }).join("");

      // Attach row click
      tbody.querySelectorAll(".aad-mt-row").forEach(row => {
        row.onclick = () => { frappe.set_route("Form", "Meeting", decodeURIComponent(row.dataset.name)); };
      });
    }).catch(err => {
      console.error("Error rendering meetings table", err);
      tbody.innerHTML = '<tr><td colspan="7" class="aad-empty-state" style="color:red"><p>Error loading data</p></td></tr>';
    });
  }

  function updateMtPagination() {
    const totalPages = Math.ceil(mtTotalRecords / mtPageSize);
    const start = mtTotalRecords === 0 ? 0 : (mtCurrentPage - 1) * mtPageSize + 1;
    const end   = Math.min(mtCurrentPage * mtPageSize, mtTotalRecords);
    root.querySelector(".aad-mt-range-text").textContent = "Showing " + start + "-" + end + " of " + mtTotalRecords;
    root.querySelector(".aad-mt-prev-btn").disabled = mtCurrentPage === 1;
    root.querySelector(".aad-mt-next-btn").disabled = mtCurrentPage >= totalPages || !mtTotalRecords;
    const container = root.querySelector(".aad-mt-page-numbers");
    container.innerHTML = "";
    if (totalPages <= 1) return;
    let s = Math.max(1, mtCurrentPage - 2), e = Math.min(totalPages, s + 4);
    if (e - s < 4) s = Math.max(1, e - 4);
    for (let pg = s; pg <= e; pg++) {
      const btn = document.createElement("button");
      btn.className = "aad-btn aad-page-btn" + (pg === mtCurrentPage ? " aad-page-active" : "");
      btn.textContent = pg;
      btn.onclick = () => { mtCurrentPage = pg; loadTrainers(); };
      container.appendChild(btn);
    }
  }

  async function loadTrainers() {
    trainerLoaded = true;
    const tbody = root.querySelector(".aad-tr-body");
    tbody.innerHTML = '<tr class="aad-loading-row"><td colspan="8"><div class="aad-spinner"></div></td></tr>';
    mtTotalRecords = await fetchMeetingCount(getMtFilters());
    const meetings = await fetchMeetings(mtCurrentPage);
    renderMeetingsTable(meetings);
    updateMtPagination();
  }

  initTrDates();
  root.querySelector(".aad-tr-date-from").onchange = e => { trDateFrom = e.target.value; mtCurrentPage=1; trainerLoaded=false; if(activeTab==="trainers") loadTrainers(); };
  root.querySelector(".aad-tr-date-to").onchange   = e => { trDateTo   = e.target.value; mtCurrentPage=1; trainerLoaded=false; if(activeTab==="trainers") loadTrainers(); };
  root.querySelector(".aad-tr-topic-filter").onchange = e => { trTopic = e.target.value; mtCurrentPage=1; trainerLoaded=false; if(activeTab==="trainers") loadTrainers(); };
  root.querySelector(".aad-tr-caltype-filter").onchange = e => { trCalType = e.target.value; mtCurrentPage=1; trainerLoaded=false; if(activeTab==="trainers") loadTrainers(); };
  root.querySelector(".aad-tr-reset").onclick = () => {
    initTrDates(); trTopic=""; trCalType=""; mtCurrentPage=1; trainerLoaded=false;
    root.querySelector(".aad-tr-topic-filter").value = "";
    root.querySelector(".aad-tr-caltype-filter").value = "";
    if(activeTab==="trainers") loadTrainers();
  };
  root.querySelector(".aad-tr-new-meeting").onclick = () => { frappe.new_doc("Meeting"); };
  root.querySelector(".aad-mt-prev-btn").onclick = () => { if(mtCurrentPage>1){ mtCurrentPage--; loadTrainers(); } };
  root.querySelector(".aad-mt-next-btn").onclick = () => { if(mtCurrentPage < Math.ceil(mtTotalRecords/mtPageSize)){ mtCurrentPage++; loadTrainers(); } };
  
"""

# ─────────────────────────────────────────────────────────────────────────────
# SCRIPT — Part 3: Calendar tab
# ─────────────────────────────────────────────────────────────────────────────
DASHBOARD_SCRIPT_P3 = """
  /* ════════════════════════════════════════════════════════
     TAB 3 — CALENDAR
  ════════════════════════════════════════════════════════ */
  let calLoaded = false;
  let calYear, calMonth, calEvents = [], calTypeFilter = "";

  // Role-based default calendar type filter
  if (isHead) {
    root.querySelector(".aad-cal-type-bar").classList.remove("aad-cal-type-hidden");
    root.querySelector(".aad-cal-new-meeting").classList.remove("aad-cal-type-hidden");
    calTypeFilter = "SS Training";
  } else if (isTrainer) {
    calTypeFilter = "SS Training";
    root.querySelector(".aad-cal-new-meeting").classList.remove("aad-cal-type-hidden");
  } else if (isEmployee) {
    // Employee: show only Employee Training calendar, no calendar type filter pills
    calTypeFilter = "";  // Show all their meetings regardless of calendar type
    root.querySelector(".aad-cal-new-meeting").classList.remove("aad-cal-type-hidden");
  } else {
    calTypeFilter = "Employee Training";
  }

  // Calendar type toggle pills (Trainer Head / System Manager only)
  root.querySelectorAll(".aad-cal-type-pill").forEach(pill => {
    pill.onclick = async () => {
      root.querySelectorAll(".aad-cal-type-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      calTypeFilter = pill.dataset.ctype;
      // Re-fetch events with new filter
      calEvents = await fetchCalEvents(calYear, calMonth);
      renderCalendar();
    };
  });

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  async function fetchCalEvents(year, month) {
    const from = year + "-" + String(month+1).padStart(2,"0") + "-01";
    const lastDay = new Date(year, month+1, 0).getDate();
    const to   = year + "-" + String(month+1).padStart(2,"0") + "-" + String(lastDay).padStart(2,"0");
    const filters = { date: ["between", [from, to]], docstatus: ["<", 2] };
    if (calTypeFilter) filters["calendar_type"] = calTypeFilter;
    // Employee role: only show their own meetings
    if (isEmployee) filters["owner"] = user;
    try {
      return await frappe.db.get_list("Meeting", {
        fields: ["name","date","start_time","end_time","topic","training_location","calendar_type","trainer"],
        filters,
        order_by: "date asc, start_time asc",
        limit_page_length: 0
      });
    } catch(e) { return []; }
  }

  function renderCalendar() {
    const body = root.querySelector(".aad-cal-body");
    root.querySelector(".aad-cal-month-label").textContent = MONTHS[calMonth] + " " + calYear;

    const firstDow = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
    const today = new Date();
    const todayStr = fmt(today);

    // group events by date
    const byDate = {};
    calEvents.forEach(ev => {
      const d = ev.date ? ev.date.substring(0,10) : null;
      if (!d) return;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(ev);
    });

    let html = '<div class="aad-cal-grid">';
    // empty leading cells
    for (let i = 0; i < firstDow; i++) {
      html += '<div class="aad-cal-cell aad-cal-empty"></div>';
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = calYear + "-" + String(calMonth+1).padStart(2,"0") + "-" + String(day).padStart(2,"0");
      const isToday = dateStr === todayStr;
      const evs = byDate[dateStr] || [];
      const canCreate = isTrainer || isHead;
      html += '<div class="aad-cal-cell' + (isToday ? " aad-cal-today" : "") + '"'
            + (canCreate ? ' style="cursor:pointer"' : '')
            + ' data-date="' + dateStr + '">'
            + '<div class="aad-cal-day-num' + (isToday ? " aad-cal-today-num" : "") + '">' + day + '</div>';
      // show up to 3 events, then "+N more"
      const show = evs.slice(0, 3);
      const more = evs.length - show.length;
      show.forEach(ev => {
        const c = eventColor(ev);
        const label = frappe.utils.escape_html(ev.topic || ev.calendar_type || "Event");
        const time  = ev.start_time ? fmtTime(ev.start_time) + " " : "";
        html += '<div class="aad-cal-event" data-name="' + ev.name + '"'
              + ' style="background:' + c.bg + ';border-left:3px solid ' + c.border + ';color:' + c.text + '">'
              + time + label + '</div>';
      });
      if (more > 0) html += '<div class="aad-cal-more">+' + more + ' more</div>';
      html += '</div>';
    }
    html += '</div>';
    body.innerHTML = html;

    // cell click — open new meeting on empty area, or show event popup on event chip
    body.querySelectorAll(".aad-cal-event").forEach(chip => {
      chip.onclick = e => { e.stopPropagation(); showEventPopup(chip.dataset.name); };
    });
    if (isTrainer || isHead || isEmployee) {
      body.querySelectorAll(".aad-cal-cell:not(.aad-cal-empty)").forEach(cell => {
        cell.onclick = () => {
          // only open new meeting if click is directly on cell, not event chip
          const defaultCalType = isEmployee ? "Employee Training" : (calTypeFilter || "SS Training");
          frappe.new_doc("Meeting", { date: cell.dataset.date, calendar_type: defaultCalType });
        };
      });
    }
  }

  async function showEventPopup(name) {
    const popup = root.querySelector(".aad-cal-popup");
    const body  = root.querySelector(".aad-cal-popup-body");
    popup.classList.remove("aad-cal-type-hidden");
    body.innerHTML = '<div class="aad-spinner"></div>';
    try {
      const ev = await frappe.db.get_doc("Meeting", name);
      const c  = eventColor(ev);
      const trainerName = ev.trainer
        ? (await frappe.db.get_value("Employee", ev.trainer, "employee_name")).message?.employee_name || ev.trainer
        : "-";
      body.innerHTML =
        '<div class="aad-pop-header" style="border-left:4px solid ' + c.border + ';background:' + c.bg + '">'
        + '<div class="aad-pop-topic" style="color:' + c.text + '">' + frappe.utils.escape_html(ev.topic || "-") + '</div>'
        + (ev.calendar_type ? '<span class="aad-badge" style="background:' + c.bg + ';color:' + c.text + ';border:1px solid ' + c.border + '">' + ev.calendar_type + '</span>' : '')
        + '</div>'
        + '<div class="aad-pop-row"><span class="aad-pop-icon">&#128197;</span>' + (ev.date ? frappe.datetime.str_to_user(ev.date) : "-") + '</div>'
        + '<div class="aad-pop-row"><span class="aad-pop-icon">&#128336;</span>' + (ev.start_time ? fmtTime(ev.start_time) : "-") + (ev.end_time ? " – " + fmtTime(ev.end_time) : "") + '</div>'
        + '<div class="aad-pop-row"><span class="aad-pop-icon">&#128205;</span>' + frappe.utils.escape_html(ev.training_location || "-") + '</div>'
        + '<div class="aad-pop-row"><span class="aad-pop-icon">&#128100;</span>' + frappe.utils.escape_html(trainerName) + '</div>'
        + '<div class="aad-pop-row"><span class="aad-pop-icon">&#128101;</span>' + (ev.attandees_table ? ev.attandees_table.length + " attendee(s)" : "0 attendees") + '</div>'
        + '<div class="aad-pop-actions">'
        + '<a class="aad-btn aad-btn-primary" href="/app/meeting/' + encodeURIComponent(name) + '" target="_blank">Open</a>'
        + '</div>';
    } catch(e) {
      body.innerHTML = '<p style="color:red">Could not load event.</p>';
    }
  }

  root.querySelector(".aad-cal-popup-close").onclick = () => {
    root.querySelector(".aad-cal-popup").classList.add("aad-cal-type-hidden");
  };

  root.querySelector(".aad-cal-prev").onclick = async () => {
    calMonth--; if (calMonth < 0) { calMonth=11; calYear--; }
    calEvents = await fetchCalEvents(calYear, calMonth);
    renderCalendar();
  };
  root.querySelector(".aad-cal-next").onclick = async () => {
    calMonth++; if (calMonth > 11) { calMonth=0; calYear++; }
    calEvents = await fetchCalEvents(calYear, calMonth);
    renderCalendar();
  };
  root.querySelector(".aad-cal-new-meeting").onclick = () => {
    const defaultCalType = isEmployee ? "Employee Training" : (calTypeFilter || "SS Training");
    frappe.new_doc("Meeting", { calendar_type: defaultCalType });
  };

  async function initCalendar() {
    calLoaded = true;
    const t = new Date();
    calYear=t.getFullYear(); calMonth=t.getMonth();
    calEvents = await fetchCalEvents(calYear, calMonth);
    renderCalendar();
  }

})();
"""

# ─────────────────────────────────────────────────────────────────────────────
# STYLE
# ─────────────────────────────────────────────────────────────────────────────
DASHBOARD_STYLE = """
* {
  --text-muted:#6c7680; --text-base:#41464b; --text-dark:#1a1a1a;
  --border-subtle:#f0f0f0; --border-default:#d9d9d9;
  --bg-default:#fafbfc; --bg-secondary:#f8f9fa;
  --primary:#3b82f6; --primary-light:#dbeafe;
  --success:#10b981; --danger:#ef4444; --warning:#f59e0b;
  --shadow-sm:0 1px 2px 0 rgba(0,0,0,.05);
}
.aad-dashboard { font-family:"Inter","Segoe UI",Helvetica,Arial,sans-serif; color:var(--text-base); background:#fff; font-size:13px; line-height:1.5; }
.aad-font-mono { font-family:"Monaco","Menlo","Ubuntu Mono",monospace; font-size:12px; }

/* Header */
.aad-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; gap:16px; flex-wrap:wrap; }
.aad-title { margin:0; font-size:20px; font-weight:600; color:var(--text-dark); }
.aad-subtitle { margin:4px 0 0; font-size:12px; color:var(--text-muted); }
.aad-header-actions { display:flex; gap:8px; align-items:center; }

/* Buttons */
.aad-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:6px; border:1px solid var(--border-default); background:#fff; color:var(--text-base); font-size:12px; font-weight:500; cursor:pointer; white-space:nowrap; transition:all .15s; }
.aad-btn:hover:not(:disabled) { background:var(--bg-secondary); border-color:#3b82f6; }
.aad-btn:disabled { opacity:.5; cursor:not-allowed; }
.aad-btn-primary { background:var(--primary); color:#fff; border:none; }
.aad-btn-primary:hover:not(:disabled) { background:#2563eb; border:none; }
.aad-btn-secondary { background:#fff; border:1px solid var(--border-default); }
.aad-btn-secondary:hover:not(:disabled) { background:var(--bg-secondary); border-color:#3b82f6; }

/* Reports dropdown */
.aad-reports-dropdown { position:relative; }
.aad-dropdown-menu { display:none; position:absolute; right:0; top:calc(100% + 4px); background:#fff; border:1px solid var(--border-default); border-radius:6px; box-shadow:0 8px 24px rgba(0,0,0,.12); min-width:220px; z-index:1000; }
.aad-dropdown-menu.show { display:block; }
.aad-dropdown-item { display:block; padding:9px 14px; font-size:13px; color:var(--text-base); cursor:pointer; text-decoration:none; }
.aad-dropdown-item:hover { background:var(--bg-secondary); color:var(--primary); }

/* Tabs */
.aad-tabs { display:flex; gap:4px; border-bottom:2px solid var(--border-default); margin-bottom:20px; }
.aad-tab { background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; padding:8px 16px; font-size:13px; font-weight:500; color:var(--text-muted); cursor:pointer; border-radius:4px 4px 0 0; transition:color .15s; }
.aad-tab:hover { color:var(--primary); background:var(--bg-secondary); }
.aad-tab.active { color:var(--primary); border-bottom-color:var(--primary); background:none; }
.aad-tab-content { display:none; }
.aad-tab-content.active { display:block; }

/* Filters */
.aad-filters-section { margin-bottom:20px; padding:12px; background:var(--bg-secondary); border-radius:6px; border:1px solid var(--border-subtle); }
.aad-filters-container { display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap; }
.aad-filter-group { display:flex; flex-direction:column; gap:4px; }
.aad-label { font-size:12px; font-weight:500; color:var(--text-muted); }
.aad-input { padding:6px 10px; border:1px solid var(--border-default); border-radius:4px; font-size:12px; background:#fff; }
.aad-input:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 2px var(--primary-light); }
.aad-input[type="date"] { width:140px; }

/* Stat cards */
.aad-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:12px; margin-bottom:20px; }
.aad-stat-card { padding:10px 12px; background:var(--bg-secondary); border:1px solid var(--border-subtle); border-radius:6px; cursor:pointer; }
.aad-stat-card:hover { border-color:var(--border-default); box-shadow:var(--shadow-sm); }
.aad-stat-card.active { border-color:var(--primary); box-shadow:0 0 0 2px var(--primary-light); }
.aad-stat-label { font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
.aad-stat-value { font-size:18px; font-weight:600; color:var(--primary); }
.aad-stat-green { color:var(--success); } .aad-stat-red { color:var(--danger); }
.aad-stat-orange { color:var(--warning); } .aad-stat-blue { color:#2563eb; } .aad-stat-gray { color:#6b7280; }

/* Search */
.aad-search-bar { margin-bottom:16px; }
.aad-search { width:100%; padding:8px 12px; border:1px solid var(--border-default); border-radius:6px; font-size:13px; box-sizing:border-box; }

/* Table */
.aad-table-wrapper { border:1px solid var(--border-default); border-radius:6px; overflow:hidden; margin-bottom:16px; }
.aad-table { width:100%; border-collapse:collapse; font-size:13px; }
.aad-table thead { background:var(--bg-secondary); border-bottom:1px solid var(--border-default); }
.aad-table th { padding:10px 12px; text-align:left; font-weight:500; color:var(--text-muted); font-size:12px; text-transform:uppercase; letter-spacing:.5px; }
.aad-col-index { width:50px; text-align:center; }
.aad-tr-center { text-align:center; }
.aad-tr-left { text-align:left; vertical-align:top; padding-top:8px !important; padding-bottom:8px !important; }
.aad-table tbody tr { border-bottom:1px solid var(--border-subtle); }
.aad-table tbody tr:hover { background:var(--bg-default); }
.aad-table td { padding:10px 12px; color:var(--text-base); }
.aad-link { color:var(--primary); text-decoration:none; font-weight:500; }
.aad-link:hover { text-decoration:underline; }
.aad-empty-state { text-align:center; padding:40px 12px; color:var(--text-muted); }

/* Badges */
.aad-badge { display:inline-flex; align-items:center; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:.3px; white-space:nowrap; }
.aad-badge-green  { background:#dcfce7; color:#15803d; border:1px solid #86efac; }
.aad-badge-red    { background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; }
.aad-badge-orange { background:#fef3c7; color:#b45309; border:1px solid #fcd34d; }
.aad-badge-gray   { background:#f3f4f6; color:#4b5563; border:1px solid #d1d5db; }
.aad-badge-blue   { background:#dbeafe; color:#1d4ed8; border:1px solid #93c5fd; }

/* Spinner */
.aad-spinner { display:inline-block; width:16px; height:16px; border:2px solid var(--border-subtle); border-top-color:var(--primary); border-radius:50%; animation:aad-spin .8s linear infinite; }
@keyframes aad-spin { to { transform:rotate(360deg); } }
.aad-loading-row td { text-align:center; padding:20px 12px; }

/* Pagination */
.aad-footer { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; font-size:12px; }
.aad-pagination-info { color:var(--text-muted); }
.aad-pagination-buttons { display:flex; gap:6px; align-items:center; }
.aad-page-numbers { display:flex; gap:4px; }
.aad-page-btn { min-width:32px; padding:4px 8px; border-radius:4px; font-size:12px; }
.aad-page-active { background:var(--primary) !important; color:#fff !important; border-color:var(--primary) !important; }

/* ── CALENDAR ────────────────────────────────────────── */
.aad-cal-type-hidden { display:none !important; }
.aad-cal-type-bar { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
.aad-cal-type-pill { padding:5px 14px; border-radius:20px; border:1px solid var(--border-default); font-size:12px; cursor:pointer; background:#fff; color:var(--text-muted); }
.aad-cal-type-pill:hover { border-color:var(--primary); color:var(--primary); }
.aad-cal-type-pill.active { background:var(--primary); color:#fff; border-color:var(--primary); }
.aad-cal-nav { display:flex; align-items:center; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
.aad-cal-month-label { margin:0; font-size:18px; font-weight:600; color:var(--text-dark); flex:1; }
.aad-cal-legend { display:flex; gap:14px; margin-bottom:14px; flex-wrap:wrap; }
.aad-cal-legend-item { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--text-muted); }
.aad-cal-dot { width:10px; height:10px; border-radius:50%; display:inline-block; }
.cal-dot-meeting    { background:#3b82f6; }
.cal-dot-induction  { background:#22c55e; }
.cal-dot-refreshment{ background:#f59e0b; }
.cal-dot-ss         { background:#8b5cf6; }
.cal-dot-employee   { background:#ec4899; }
.aad-cal-dow-row { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-bottom:4px; }
.aad-cal-dow { text-align:center; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; padding:6px 0; }
.aad-cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
.aad-cal-cell { min-height:100px; border:1px solid var(--border-subtle); border-radius:4px; padding:6px 4px; background:#fff; vertical-align:top; transition:background .1s; }
.aad-cal-cell:hover { background:var(--bg-default); }
.aad-cal-empty { background:var(--bg-secondary) !important; border-color:transparent !important; }
.aad-cal-today { border-color:var(--primary) !important; background:var(--primary-light) !important; }
.aad-cal-day-num { font-size:12px; font-weight:500; color:var(--text-muted); margin-bottom:4px; }
.aad-cal-today-num { background:var(--primary); color:#fff; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:11px; }
.aad-cal-event { font-size:11px; padding:2px 5px; border-radius:3px; margin-bottom:2px; cursor:pointer; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.aad-cal-event:hover { opacity:.85; }
.aad-cal-more { font-size:10px; color:var(--text-muted); padding:1px 4px; }

/* Event popup */
.aad-cal-popup { position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:9999; display:flex; align-items:center; justify-content:center; }
.aad-cal-popup-card { background:#fff; border-radius:10px; box-shadow:0 20px 50px rgba(0,0,0,.2); width:340px; max-width:95vw; padding:20px; position:relative; }
.aad-cal-popup-close { position:absolute; top:10px; right:12px; background:none; border:none; font-size:16px; cursor:pointer; color:var(--text-muted); }
.aad-pop-header { padding:10px 12px; border-radius:6px; margin-bottom:14px; }
.aad-pop-topic { font-size:16px; font-weight:600; margin-bottom:4px; }
.aad-pop-row { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-base); margin-bottom:8px; }
.aad-pop-icon { font-size:15px; width:20px; text-align:center; }
.aad-pop-actions { margin-top:14px; display:flex; gap:8px; }

/* Responsive */
@media(max-width:768px){
  .aad-header { flex-direction:column; }
  .aad-stats { grid-template-columns:repeat(2,1fr); }
  .aad-cal-cell { min-height:70px; }
  .aad-cal-month-label { font-size:15px; }
}
@media(max-width:480px){
  .aad-stats { grid-template-columns:1fr; }
  .aad-cal-dow-row,.aad-cal-grid { gap:1px; }
  .aad-cal-cell { min-height:50px; padding:3px 2px; }
  .aad-cal-event { display:none; }
  .aad-cal-more { display:block; }
}
"""


# ─────────────────────────────────────────────────────────────────────────────
# EXECUTE
# ─────────────────────────────────────────────────────────────────────────────
def execute():
    doc = frappe.get_doc("Custom HTML Block", "Trainer Dashboard")
    doc.html   = DASHBOARD_HTML
    doc.script = DASHBOARD_SCRIPT_P1 + DASHBOARD_SCRIPT_P2 + DASHBOARD_SCRIPT_P3
    doc.style  = DASHBOARD_STYLE
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    print("Done: Trainer Dashboard updated with 3-tab layout (Call Logs, Trainers, Calendar).")
