// ==================================================
// STOCKIO – FULL WIDTH + SIDEBAR (PETITE-VUE)
// ==================================================

frappe.pages["stockio"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    single_column: true,
  });

  // ------------------------------------------------
  // REMOVE TITLE & PAGE HEADER COMPLETELY
  // ------------------------------------------------
  page.set_title("");
  page.main.find(".page-head").remove();

  // ------------------------------------------------
  // FULL WIDTH / NO LEFT-RIGHT GAP (CUSTOMER-360 STYLE)
  // ------------------------------------------------
  const $pageContainer = $(wrapper).closest(".page-container");
  const $layoutMain = $(wrapper).closest(".layout-main-section");
  const $pageBody = $(wrapper).closest(".page-body");
  const $pageContent = $(wrapper).find(".page-content");

  $pageContainer.css({
    margin: "0",
    padding: "0",
    width: "100%",
    maxWidth: "100%",
    background: "transparent",
  });

  $layoutMain.css({
    margin: "0",
    padding: "0",
    width: "100%",
    border: "none",
    boxShadow: "none",
    background: "transparent",
  });

  $pageBody.css({
    margin: "0",
    padding: "0",
    width: "100%",
  });

  $pageContent.css({
    margin: "0",
    padding: "0",
    width: "100%",
  });

  $(wrapper).css({
    margin: "0",
    padding: "0",
    width: "100%",
  });

  // ------------------------------------------------
  // LOAD PETITE-VUE
  // ------------------------------------------------
  loadPetiteVue(() => {
    new StockIOPage(wrapper);
  });
};

// --------------------------------------------------
// PETITE-VUE LOADER (ONCE)
// --------------------------------------------------
function loadPetiteVue(callback) {
  if (window.PetiteVue) return callback();

  const script = document.createElement("script");
  script.src = "/assets/sahayog/js/petite-vue.iife.js";
  script.onload = callback;
  document.head.appendChild(script);
}

// ==================================================
// PAGE CLASS
// ==================================================
class StockIOPage {
  constructor(wrapper) {
    this.wrapper = $(wrapper).find(".page-content");
    this.render();
    this.mountVue();
  }

  render() {
    this.wrapper.html(`
    <div class="stockio-app" v-scope="app">

      <!-- SIDEBAR -->
      <aside class="stockio-sidebar" :class="{ collapsed: sidebarCollapsed }">

        <div class="sidebar-top">
          <div class="logo" v-if="!sidebarCollapsed">StockIO</div>

          <!-- TOGGLE BUTTON -->
          <button class="sidebar-toggle" @click="toggleSidebar">
            <span v-if="sidebarCollapsed">☰</span>
            <span v-else>❮</span>
          </button>
        </div>

<nav class="menu">

  <div class="menu-item active">
    <span class="icon">🏠</span>
    <span v-if="!sidebarCollapsed">Requests</span>
  </div>

  <!-- STOCK -->
  <div class="menu-group">
    <div class="menu-item" @click="toggleStock">
      <span class="icon">🛒</span>
      <span v-if="!sidebarCollapsed">Stock</span>
      <span v-if="!sidebarCollapsed" class="chevron">▾</span>
    </div>

    <div v-show="stockOpen && !sidebarCollapsed" class="submenu">
      <div class="submenu-item">Inward</div>
      <div class="submenu-item">Outward</div>
    </div>
  </div>

  <!-- ASSET -->
  <div class="menu-group">
    <div class="menu-item" @click="toggleAsset">
      <span class="icon">📦</span>
      <span v-if="!sidebarCollapsed">Asset</span>
      <span v-if="!sidebarCollapsed" class="chevron">▾</span>
    </div>

    <div v-show="assetOpen && !sidebarCollapsed" class="submenu">
      <div class="submenu-item">Asset Item</div>
      <div class="submenu-item">Asset Movement</div>
    </div>
  </div>

  <div class="menu-item">
    <span class="icon">📊</span>
    <span v-if="!sidebarCollapsed">Reports</span>
  </div>

  <div class="menu-item">
    <span class="icon">⚙️</span>
    <span v-if="!sidebarCollapsed">Settings</span>
  </div>

</nav>

      </aside>

      <!-- MAIN CONTENT -->
      <main class="stockio-main">

        <div class="stockio-header">
          <h2>Material Requests</h2>
          <div class="stockio-actions">
            <button class="btn ghost">Export</button>
            <button class="btn primary">Create</button>
          </div>
        </div>
<div class="stockio-toolbar">

  <!-- LEFT: TABS -->
<div class="stockio-tabs">
  <span class="tab active">
    All <b>{{ counts.all }}</b>
  </span>

  <span class="tab">
    To Day <b class="green">{{ counts.today }}</b>
  </span>
  <span class="tab">
      Draft <b class="grey">{{ counts.draft }}</b>
    </span>

  <span class="tab">
    Pending <b class="orange">{{ counts.pending }}</b>
  </span>

  <span class="tab">
    Approved <b class="purple">{{ counts.approved }}</b>
  </span>
</div>


  <!-- RIGHT: SEARCH + FILTER -->
  <div class="stockio-search">
    <input placeholder="Search orders..." />
    <button class="btn ghost">Filters</button>
  </div>

</div>


<div class="stockio-body">
    <div class="order-toolbar">
      <label><input type="checkbox" /> Select All</label>

      <div class="toolbar-actions">
        <button class="btn ghost">Print</button>
        <button class="btn success">Update Order</button>
      </div>
    </div>
<div class="order-card" v-for="doc in requests" :key="doc.name">

  <div class="order-left">
    <input type="checkbox" />

    <div class="order-info">
      <div class="order-title">
        <strong>{{ doc.name }}</strong>
        <span class="badge paid">{{ doc.status }}</span>
      </div>

      <div class="order-meta">
        {{ formatDate(doc.creation) }} · Created By:
        <b>{{ doc.owner }}</b>
      </div>

      <div
        class="order-product"
        v-for="item in doc.items"
        :key="item.name"
      >
        <img src="https://via.placeholder.com/44" />
        <div>
          <div class="product-name">
            {{ item.item_code }}
          </div>
          <div class="product-meta">
            SKU: {{ item.item_code }} · Qty: {{ item.quantity }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="order-right">
    <button class="btn ghost">View</button>
  </div>

</div>



</div>

      </main>
    </div>
  `);
  }

  mountVue() {
    const app = {
      sidebarCollapsed: false,
      stockOpen: false,
      assetOpen: false,

      requests: [],

      counts: {
        all: 0,
        today: 0,
        pending: 0,
        approved: 0,
      },

      toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
      },

      toggleStock() {
        if (this.sidebarCollapsed) return;
        this.stockOpen = !this.stockOpen;
        this.assetOpen = false;
      },

      toggleAsset() {
        if (this.sidebarCollapsed) return;
        this.assetOpen = !this.assetOpen;
        this.stockOpen = false;
      },

      // ------------------------------------
      // LOAD REQUESTS
      // ------------------------------------
      loadRequests() {
        frappe.call({
          method: "frappe.client.get_list",
          args: {
            doctype: "Employee Material Request",
            fields: ["name", "status", "creation", "owner"],
            limit_page_length: 1000,
          },
          callback: (r) => {
            if (!r.message) return;

            this.requests = r.message.map((d) => ({
              ...d,
              items: [],
            }));

            this.computeCounts();
            this.requests.forEach((doc) => this.loadItems(doc));
          },
        });
      },

      // ------------------------------------
      // COUNT LOGIC
      // ------------------------------------
      computeCounts() {
        const today = frappe.datetime.get_today();

        this.counts.all = this.requests.length;
        this.counts.today = 0;
        this.counts.draft = 0;
        this.counts.pending = 0;
        this.counts.approved = 0;

        this.requests.forEach((doc) => {
          const docDate = doc.creation.split(" ")[0];

          // Today
          if (docDate === today) {
            this.counts.today++;
          }
          // Draft
          if (doc.status === "Draft") {
            this.counts.draft++;
          }

          // Pending (two types)
          if (
            doc.status === "Pending HO Approval" ||
            doc.status === "Pending Reporting Person"
          ) {
            this.counts.pending++;
          }

          // Approved
          if (doc.status === "Approved") {
            this.counts.approved++;
          }
        });
      },

      // ------------------------------------
      // LOAD CHILD ITEMS
      // ------------------------------------
      loadItems(doc) {
        frappe.call({
          method: "frappe.client.get",
          args: {
            doctype: "Employee Material Request",
            name: doc.name,
          },
          callback: (r) => {
            if (r.message) {
              doc.items = r.message.items || [];
            }
          },
        });
      },

      formatDate(date) {
        return frappe.datetime.str_to_user(date);
      },
    };

    PetiteVue.createApp(app).mount(this.wrapper[0]);

    setTimeout(() => {
      app.loadRequests();
    }, 100);
  }
}
