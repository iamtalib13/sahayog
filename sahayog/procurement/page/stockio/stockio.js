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
<button
  class="btn primary"
  @click="createRequest"
>
  Create
</button>
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
  <span class="tab">
    Cancelled <b class="red">{{counts.cancelled}}</b>
  </span>
</div>


  <!-- RIGHT: SEARCH + FILTER -->
  <div class="stockio-search">
<input
  placeholder="Search requests..."
  v-model="searchText"
  @input="
    offset = 0;
    visibleRequests = [];
    loadMore();
  "
/>

  </div>

</div>
    <div class="order-toolbar">
      <label>
        <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
        Select All
      </label>
      <div class="toolbar-actions" v-if="hasSelection">
        <button class="btn ghost">Print</button>
        <button class="btn success">Approved Request</button>
      </div>

    </div>

<div class="stockio-body">
<div
  class="order-card"
  v-for="doc in visibleRequests"
  :key="doc.name"
>
  <!-- LEFT -->
  <div class="order-left">
    <input
      type="checkbox"
      v-model="selectedDocs"
      :value="doc.name"
      @change="syncSelectAll"
    />

    <div class="order-info">
      <div class="order-title">
        <strong>{{ doc.name }}</strong>
        <span class="badge paid">{{ doc.status }}</span>
      </div>

      <div class="order-meta">
        {{ formatDate(doc.creation) }} · Created By:
        <b>{{ doc.owner }}</b>
      </div>

      <!-- FIRST ITEM -->
      <div class="order-product" v-if="doc.items.length">
        <img src="https://via.placeholder.com/44" />
        <div>
          <div class="product-name">
            {{ doc.items[0].item_code }}
          </div>
          <div class="product-meta">
            SKU: {{ doc.items[0].item_code }} · Qty: {{ doc.items[0].quantity }}
          </div>
        </div>
      </div>

      <!-- MORE ITEMS -->
      <div v-if="doc.showAllItems">
        <div
          class="order-product"
          v-for="item in doc.items.slice(1)"
          :key="item.name"
        >
          <img src="https://via.placeholder.com/44" />
          <div>
            <div class="product-name">{{ item.item_code }}</div>
            <div class="product-meta">
              SKU: {{ item.item_code }} · Qty: {{ item.quantity }}
            </div>
          </div>
        </div>
      </div>

      <!-- TOGGLE -->
      <div
        v-if="doc.items.length > 1"
        class="more-items"
        @click="toggleItems(doc)"
      >
        {{ doc.showAllItems
          ? 'Hide items'
          : '+' + (doc.items.length - 1) + ' more items'
        }}
      </div>
    </div>
  </div>

  <!-- RIGHT (FIXED POSITION) -->
  <div class="order-right">
    <button class="btn ghost" @click="openRequest(doc.name)">
      View
    </button>
  </div>
</div>


    <div style="text-align:center; margin:16px 0" v-if="canLoadMore">
      <button class="btn ghost" @click="loadMore">
        Load More
      </button>
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
              showAllItems: false,
            }));
            this.selectedDocs = [];
            this.selectAll = false;

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
        this.counts.cancelled = 0;

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

          // Cancelled
          if (doc.status === "Cancelled") {
            this.counts.cancelled++;
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
      // ---------------------------
      // SELECTION STATE
      // ---------------------------
      selectAll: false,
      selectedDocs: [],

      // ---------------------------
      // DERIVED STATE
      // ---------------------------
      get hasSelection() {
        return this.selectedDocs.length > 0;
      },

      // ---------------------------
      // METHODS
      // ---------------------------
      toggleSelectAll() {
        if (this.selectAll) {
          this.selectedDocs = this.requests.map((doc) => doc.name);
        } else {
          this.selectedDocs = [];
        }
      },

      syncSelectAll() {
        this.selectAll = this.selectedDocs.length === this.requests.length;
      },
      openRequest(name) {
        frappe.set_route("Form", "Employee Material Request", name);
      },
      searchText: "",
      get filteredRequests() {
        if (!this.searchText) return this.requests;

        const q = this.searchText.toLowerCase();

        return this.requests.filter((doc) => {
          // match request name
          if (doc.name.toLowerCase().includes(q)) return true;

          // match owner
          if (doc.owner && doc.owner.toLowerCase().includes(q)) return true;

          // match status
          if (doc.status && doc.status.toLowerCase().includes(q)) return true;

          // match item codes
          if (
            doc.items &&
            doc.items.some(
              (i) => i.item_code && i.item_code.toLowerCase().includes(q),
            )
          )
            return true;

          return false;
        });
      },
      // ---------------------------
      // STATE
      // ---------------------------
      requests: [],
      visibleRequests: [],
      searchText: "",
      pageSize: 2,
      offset: 0,

      // ---------------------------
      // ONE FUNCTION ONLY
      // ---------------------------
      loadMore() {
        const source = this.getFilteredRequests();

        const next = source.slice(this.offset, this.offset + this.pageSize);

        this.visibleRequests.push(...next);
        this.offset += this.pageSize;
      },

      // ---------------------------
      // FILTER (HELPER, NOT PAGINATION)
      // ---------------------------
      getFilteredRequests() {
        if (!this.searchText) return this.requests;

        const q = this.searchText.toLowerCase();

        return this.requests.filter(
          (doc) =>
            doc.name.toLowerCase().includes(q) ||
            doc.owner?.toLowerCase().includes(q) ||
            doc.status?.toLowerCase().includes(q) ||
            doc.items?.some((i) => i.item_code?.toLowerCase().includes(q)),
        );
      },

      // ---------------------------
      // LOAD REQUESTS
      // ---------------------------
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
              showAllItems: false,
            }));

            // RESET PAGINATION
            this.offset = 0;
            this.visibleRequests = [];

            this.computeCounts();
            this.loadMore();

            this.requests.forEach((doc) => this.loadItems(doc));
          },
        });
      },
      get canLoadMore() {
        return this.visibleRequests.length < this.getFilteredRequests().length;
      },
      createRequest() {
        frappe.set_route(
          "Form",
          "Employee Material Request",
          "new-employee-material-request",
        );
      },
      toggleItems(doc) {
        doc.showAllItems = !doc.showAllItems;
      },
    };

    PetiteVue.createApp(app).mount(this.wrapper[0]);

    setTimeout(() => {
      app.loadRequests();
    }, 100);
  }
}
