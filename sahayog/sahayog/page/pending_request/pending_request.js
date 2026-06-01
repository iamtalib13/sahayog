frappe.pages["pending-request"].on_page_load = function (wrapper) {
  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: false,
    single_column: true,
  });

  $(wrapper).find(".layout-main-section").empty().append(`
        <div class="minimal-dashboard">
            <header class="dash-header">
                <div class="brand">
                    <div class="logo-circle">P</div>
                    <div>
                        <h1>Pending Requests</h1>
                        <p>Action items for you</p>
                    </div>
                </div>
                <div class="header-stats">
                    <button class="stat-item home-btn" onclick="frappe.set_route('sahayog-home')">
                        <span class="label">Navigation</span>
                        <span class="value"><i class="fa fa-home"></i> Sahayog Home</span>
                    </button>
                    <div class="stat-item current">
                        <span class="label">Current Cycle</span>
                        <span class="value">2026 Cycle</span>
                    </div>
                    <div class="stat-item pending">
                        <span class="label">Total Pending</span>
                        <span class="value count-pill">0</span>
                    </div>
                </div>
            </header>

            <div class="main-layout">
                <aside class="minimal-sidebar">
                    <div class="sidebar-label">Categories</div>
                    <nav class="category-nav">
                        <a href="#" class="cat-item active" data-category="all">
                            <div class="icon-box"><i class="fa fa-th-large"></i></div>
                            <span>All Notifications</span>
                        </a>
                        <!-- Categories will be injected here -->
                    </nav>
                </aside>

                <section class="content-area">
                    <div class="filter-bar">
                        <div class="status-pills">
                            <button class="pill-btn all active" data-status="all">All</button>
                            <button class="pill-btn pending" data-status="pending">Pending</button>
                            <button class="pill-btn approved" data-status="approved">Approved</button>
                            <button class="pill-btn rejected" data-status="rejected">Rejected</button>
                        </div>
                        <div class="search-wrapper">
                            <i class="fa fa-search"></i>
                            <input type="text" id="searchInput" placeholder="Search anything...">
                        </div>
                    </div>

                    <div class="data-card">
                        <div class="table-responsive">
                            <table class="minimal-table">
                                <thead>
                                    <tr>
                                        <th>Applied Date</th>
                                        <th>Requested By</th>
                                        <th>Request Details</th>
                                        <th>Waiting Since</th>
                                    </tr>
                                </thead>
                                <tbody id="tableBody">
                                    <!-- Rows injected here -->
                                </tbody>
                            </table>
                        </div>
                        <div id="emptyState" class="minimal-empty">
                            <div class="empty-art">✨</div>
                            <p>All caught up!</p>
                        </div>
                    </div>

                    <div class="bottom-bar">
                        <div class="per-page">
                            <span>Show</span>
                            <select id="recordsPerPage">
                                <option value="8">8</option>
                                <option value="16">16</option>
                            </select>
                        </div>
                        <div id="pagination" class="minimal-pagination"></div>
                    </div>
                </section>
            </div>
        </div>
    `);

  init_dashboard(wrapper);
};

function init_dashboard(wrapper) {
  const root = wrapper;
  let state = {
    data: [],
    configs: [],
    activeCategory: "all",
    activeStatus: "pending",
    search: "",
    page: 1,
    perPage: 8,
  };

  const tableBody = root.querySelector("#tableBody");
  const emptyState = root.querySelector("#emptyState");
  const searchInput = root.querySelector("#searchInput");
  const recordsPerPage = root.querySelector("#recordsPerPage");
  const pagination = root.querySelector("#pagination");
  const navList = root.querySelector(".category-nav");

  async function fetchSettingsAndData() {
    console.log(
      "Calling server method: sahayog.sahayog.page.pending_request.pending_request.get_pending_requests",
    );

    const response = await frappe.call({
      method:
        "sahayog.sahayog.page.pending_request.pending_request.get_pending_requests",
    });

    if (response.message) {
      const { data, debug, configs } = response.message;
      state.data = data || [];
      state.configs = configs || [];

      console.log("Server Debug Info:", debug);
      console.log(`Total unique records found (Server): ${state.data.length}`);
      console.log("Final data objects:", state.data);
    }

    updateCounts();
  }

  function renderCategories() {
    if (!navList) return;
    
    // Get unique categories based on display_category
    const categoryMap = {};
    state.data.forEach(item => {
        if (!categoryMap[item.category]) {
            categoryMap[item.category] = item.display_category;
        }
    });

    // Also add from configs if data is empty for those categories
    state.configs.forEach(config => {
        if (!categoryMap[config.doctype_name]) {
            categoryMap[config.doctype_name] = config.display_title || config.doctype_name;
        }
    });

    let html = `
            <a href="#" class="cat-item active" data-category="all">
                <div class="icon-box"><i class="fa fa-th-large"></i></div>
                <span>All Notifications</span>
            </a>
        `;
    
    Object.keys(categoryMap).forEach(cat => {
      html += `
                <a href="#" class="cat-item" data-category="${cat}">
                    <div class="icon-box"><i class="fa fa-folder"></i></div>
                    <span>${categoryMap[cat]}</span>
                </a>
            `;
    });
    navList.innerHTML = html;

    $(navList)
      .find(".cat-item")
      .on("click", function (e) {
        e.preventDefault();
        $(navList).find(".cat-item").removeClass("active");
        $(this).addClass("active");
        state.activeCategory = $(this).data("category");
        state.page = 1;
        render();
      });
  }

  function updateCounts() {
    const count = state.data.length;
    $(root).find(".count-pill").text(count);
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }

  function timeAgo(iso) {
    if (!iso) return "0d";
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    return days + "d";
  }

  function getFiltered() {
    return state.data.filter((row) => {
      const catMatch =
        state.activeCategory === "all" || row.category === state.activeCategory;
      const statusMatch =
        state.activeStatus === "all" || row.status === state.activeStatus;
      const q = state.search.trim().toLowerCase();
      const searchMatch =
        !q ||
        row.requestedBy.toLowerCase().includes(q) ||
        row.details.toLowerCase().includes(q);
      return catMatch && statusMatch && searchMatch;
    });
  }

  function render() {
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.perPage));
    const start = (state.page - 1) * state.perPage;
    const pageData = filtered.slice(start, start + state.perPage);

    if (filtered.length === 0) {
      $(tableBody).empty();
      $(emptyState).show();
    } else {
      $(emptyState).hide();
      let html = pageData
        .map(
          (row) => `
                <tr class="clickable-row" data-doctype="${row.category}" data-name="${row.id}">
                    <td><span class="date-pill">${formatDate(row.appliedDate)}</span></td>
                    <td>
                        <div class="req-name">${row.requestedBy}</div>
                        <div class="req-dept">${row.display_category}</div>
                    </td>
                    <td style="font-weight: 500;">${row.details}</td>
                    <td><span class="waiting-time">${timeAgo(row.pendingSince)}</span></td>
                </tr>
            `,
        )
        .join("");
      $(tableBody).html(html);

      $(tableBody)
        .find(".clickable-row")
        .on("click", function () {
          frappe.set_route(
            "Form",
            $(this).data("doctype"),
            $(this).data("name"),
          );
        });
    }

    renderPagination(totalPages);
  }

  function renderPagination(total) {
    if (!pagination) return;
    $(pagination).empty();
    if (total <= 1) return;

    for (let i = 1; i <= total; i++) {
      const btn = $(
        `<button class="page-btn ${i === state.page ? "active" : ""}">${i}</button>`,
      );
      btn.on("click", () => {
        state.page = i;
        render();
      });
      $(pagination).append(btn);
    }
  }

  function bindEvents() {
    $(searchInput).on("input", function () {
      state.search = $(this).val();
      state.page = 1;
      render();
    });

    $(recordsPerPage).on("change", function () {
      state.perPage = parseInt($(this).val());
      state.page = 1;
      render();
    });

    $(root)
      .find(".pill-btn")
      .on("click", function () {
        $(root).find(".pill-btn").removeClass("active");
        $(this).addClass("active");
        state.activeStatus = $(this).data("status");
        state.page = 1;
        render();
      });
  }

  fetchSettingsAndData().then(() => {
    renderCategories();
    render();
    bindEvents();
  });
}
