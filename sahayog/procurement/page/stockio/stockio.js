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
  // LOAD PETITE-VUE
  // ------------------------------------------------
  loadPetiteVue(() => {
    new StockIOPage(wrapper);
  });
};

frappe.pages["stockio"].on_page_show = function (wrapper) {
  $("body").addClass("stockio-active");
  frappe.set_title("StockIO");
};

// Clean up when leaving the page via any navigation
$(document).on("page-change", function () {
  if (frappe.get_route_str() !== "stockio") {
    $("body").removeClass("stockio-active");
  }
});

// --------------------------------------------------
// PETITE-VUE LOADER (ONCE)
// --------------------------------------------------
function loadPetiteVue(callback) {
  if (window.PetiteVue) return callback();

  const script = document.createElement("script");
  script.src = "https://unpkg.com/petite-vue";
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

    <!-- ================= SIDEBAR ================= -->
    <aside class="stockio-sidebar" :class="{ collapsed: sidebarCollapsed }">

    <div class="sidebar-top">
      <div class="logo" v-if="!sidebarCollapsed">StockIO</div>
      <button class="sidebar-toggle" @click="toggleSidebar">
      <span v-if="sidebarCollapsed">☰</span>
      <span v-else>❮</span>
      </button>
    </div>

    <nav class="menu">

      <!-- REQUESTS -->
      <div
      class="menu-item"
      :class="{ active: pageMode === 'requests' }"
      @click="openRequests(); setMode('requests')"
      title="Requests"
      >
      <span class="icon">🏠</span>
      <span v-if="!sidebarCollapsed">Requests</span>
      </div>

      <!-- STOCK -->
      <div class="menu-group">
      <div class="menu-item"
         :class="{ active: pageMode === 'stock' }"
         @click="toggleStock(); setMode('stock')"
         :title="pageMode === 'stock' ? (subMode === 'inward' ? 'Stock Inward' : 'Stock Outward') : 'Stock'"
         >
        <span class="icon">
          {{ pageMode === 'stock' ? (subMode === 'outward' ? '📤' : '📥') : '🛒' }}
        </span>
        <span v-if="!sidebarCollapsed">Stock</span>
        <span v-if="!sidebarCollapsed" class="chevron">▾</span>
      </div>

      <div v-show="stockOpen && !sidebarCollapsed" class="submenu">
        <div class="submenu-item"
           :class="{ active: subMode === 'inward' }"
           @click="setMode('stock', 'inward')"
        >Inward
        </div>
        <div class="submenu-item"
           :class="{ active: subMode === 'outward' }"
           @click="setMode('stock', 'outward')"
        >Outward
        </div>
      </div>
      </div>

      <!-- ASSET -->
      <div class="menu-group">
      <div class="menu-item"
         :class="{ active: pageMode === 'asset' }"
         @click="toggleAsset(); setMode('asset')"
         :title="pageMode === 'asset' ? (subMode === 'item' ? 'Asset Items' : 'Asset Movements') : 'Asset'"
         >
        <span class="icon">
          {{ pageMode === 'asset' ? (subMode === 'movement' ? '🚛' : '🏷️') : '📦' }}
        </span>
        <span v-if="!sidebarCollapsed">Asset</span>
        <span v-if="!sidebarCollapsed" class="chevron">▾</span>
      </div>

      <div v-show="assetOpen && !sidebarCollapsed" class="submenu">
        <div class="submenu-item"
           :class="{ active: subMode === 'item' }"
           @click="setMode('asset', 'item')"
        >Asset Item
        </div>
        <div class="submenu-item"
           :class="{ active: subMode === 'movement' }"
           @click="setMode('asset', 'movement')"
        >Asset Movement
        </div>
      </div>
      </div>

      <!-- REPORTS -->
      <div
      class="menu-item"
      :class="{ active: pageMode === 'reports' }"
      @click="openReports(); setMode('reports')"
      title="Reports"
      >
      <span class="icon">📊</span>
      <span v-if="!sidebarCollapsed">Reports</span>
      </div>

      <div class="menu-item">
      <span class="icon">⚙️</span>
      <span v-if="!sidebarCollapsed">Settings</span>
      </div>

    </nav>
    </aside>

    <!-- ================= MAIN ================= -->
    <main class="stockio-main">

    <!-- HEADER -->
    <div class="stockio-header">
      <h2>{{ pageTitle }}</h2>
      <div class="stockio-actions">
      <button class="btn ghost">Export</button>
      <button class="btn primary" @click="createRequest">Create</button>
      </div>
    </div>

    <!-- TOOLBAR -->
    <div class="stockio-toolbar">

    <!-- LEFT: TABS -->
  <div class="stockio-tabs">
    <span
    class="tab"
    :class="{ active: activeTab === 'all' }"
    @click="setTab('all')"
    >
    All <b>{{ counts.all }}</b>
    </span>

    <span
    class="tab"
    :class="{ active: activeTab === 'today' }"
    @click="setTab('today')"
    >
    To Day <b class="green">{{ counts.today }}</b>
    </span>

    <span
    class="tab"
    :class="{ active: activeTab === 'draft' }"
    @click="setTab('draft')"
    >
    Draft <b class="grey">{{ counts.draft }}</b>
    </span>

    <span
    class="tab"
    :class="{ active: activeTab === 'pending' }"
    @click="setTab('pending')"
    >
    Pending <b class="orange">{{ counts.pending }}</b>
    </span>

    <span
    class="tab"
    :class="{ active: activeTab === 'approved' }"
    @click="setTab('approved')"
    >
    Approved <b class="purple">{{ counts.approved }}</b>
    </span>

    <span
    class="tab"
    :class="{ active: activeTab === 'cancelled' }"
    @click="setTab('cancelled')"
    >
    Cancelled <b class="red">{{ counts.cancelled }}</b>
    </span>
  </div>

      <div class="stockio-search">
      <input
        :placeholder="'Search ' + pageTitle.toLowerCase() + '...'"
        v-model="searchText"
        @input="performSearch()"
      />
      </div>

    </div>

    <!-- ================= REQUESTS VIEW ================= -->
    <div class="stockio-body" v-if="pageMode === 'requests'">

      <div class="order-toolbar">
      <label>
        <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
        Select All
      </label>

      <div class="toolbar-actions" v-if="hasSelection">
        <button class="btn ghost">Print</button>
        <button class="btn success">Approve Request</button>
      </div>
      </div>

      <div
      class="order-card"
      v-for="doc in visibleRequests"
      :key="doc.name"
      >
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
                 <!-- APPROVAL PROGRESS -->
<div class="approval-progress compact">

  <!-- STEP 1 : Draft / Submitted -->
<div class="step" :class="getProgressFlow(doc).step1.state">
    <span class="dot"></span>
    <span class="label">{{ getProgressFlow(doc).step1.label }}</span>
  </div>

  <div class="line" v-if="getProgressFlow(doc).step2.visible"></div>

  <!-- STEP 2 : Reporting -->
<div
  class="step"
  v-if="getProgressFlow(doc).step2.visible"
  :class="getProgressFlow(doc).step2.state"
>
    <span class="dot"></span>
    <span class="label">Reporting</span>
  </div>

  <div class="line"></div>

  <!-- STEP 3 : HO Approval / Cancelled -->
<div
  class="step"
  :class="getProgressFlow(doc).step3.state"
>

    <span class="dot"></span>
    <span class="label">{{ getProgressFlow(doc).step3.label }}</span>
  </div>

</div>

        </div>
 


        <!-- FIRST ITEM -->
        <div class="order-product" v-if="doc.items.length">
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
          <div>
            <div class="product-name">{{ item.item_code }}</div>
            <div class="product-meta">
            SKU: {{ item.item_code }} · Qty: {{ item.quantity }}
            </div>
          </div>
          </div>
        </div>

        <div
          class="more-items"
          v-if="doc.items.length > 1"
          @click="toggleItems(doc)"
        >
          {{ doc.showAllItems
          ? 'Hide items'
          : '+' + (doc.items.length - 1) + ' more items' }}
        </div>

        </div>
      </div>

      <div class="order-right">
        <button class="btn ghost" @click="openRequest(doc.name)">
        View
        </button>
      </div>
      </div>

      <div v-if="canLoadMore" style="text-align:center;margin:16px">
      <button class="btn ghost" @click="loadMore">Load More</button>
      </div>

    </div>

    <!-- ================= REPORTS VIEW ================= -->
    <div class="stockio-body" v-if="pageMode === 'reports'">

      <div class="report-grid">
      <div
        class="report-card"
        v-for="r in reports"
        :key="r.label"
        @click="openReport(r.route)"
      >
        <div class="report-icon">📄</div>
        <div class="report-title">{{ r.label }}</div>
      </div>
      </div>

    </div>
    <div v-if="pageMode === 'stock'" class="stockio-body">
 


  <div v-if="subMode === 'inward'" class="stockio-body">
     <div class="order-toolbar">
      <label>
        <input
          type="checkbox"
          v-model="selectAllInward"
          @change="toggleSelectAllInward"
        />
        Select All
      </label>

      <div class="toolbar-actions" v-if="hasInwardSelection">
        <button class="btn ghost">Print</button>
        <button class="btn success">Post Receipt</button>
      </div>
  </div>

  <div class="order-card"
       v-for="doc in inwardVisible"
       :key="doc.name">

       <div class="order-left">

      <input
        type="checkbox"
        v-model="selectedInward"
        :value="doc.name"
        @change="syncSelectAllInward"
      />



      <div class="order-info">
        <div class="order-title">
          <strong>{{ doc.name }}</strong>
          <span class="badge paid">{{ doc.status }}</span>
        </div>

        <div class="order-meta">
          {{ formatDate(doc.posting_date) }} · Supplier:
          <b>{{ doc.supplier }}</b>
        </div>

        <!-- FIRST ITEM -->
        <div class="order-product" v-if="doc.items.length">
          <div>
            <div class="product-name">
              {{ doc.items[0].item_code }}
            </div>
            <div class="product-meta">
              Qty: {{ doc.items[0].qty }}
            </div>
          </div>
        </div>

        <!-- MORE ITEMS -->
        <div v-if="doc.showAllItems">
          <div class="order-product"
               v-for="item in doc.items.slice(1)"
               :key="item.name">
            <div>
              <div class="product-name">{{ item.item_code }}</div>
              <div class="product-meta">Qty: {{ item.qty }}</div>
            </div>
          </div>
        </div>

        <div class="more-items"
             v-if="doc.items.length > 1"
             @click="doc.showAllItems = !doc.showAllItems">
          {{ doc.showAllItems
            ? 'Hide items'
            : '+' + (doc.items.length - 1) + ' more items' }}
        </div>

      </div>
    </div>

    <div class="order-right">
      <button class="btn ghost"
              @click="openPurchaseReceipt(doc.name)">
        View
      </button>
    </div>

  </div>

  <div v-if="canLoadMoreInward"
       style="text-align:center;margin:16px">
    <button class="btn ghost" @click="loadMoreInward">
      Load More
    </button>
  </div>

</div>


    <div v-if="subMode === 'outward'" class="stockio-body">
    <div class="order-toolbar">
      <label>
        <input type="checkbox" v-model="selectAllOutward" @change="toggleSelectAllOutward" />
        Select All
      </label>

      <div class="toolbar-actions" v-if="hasOutwardSelection">
        <button class="btn ghost">Print</button>
        <button class="btn success">Submit</button>
      </div>
    </div>

    <div class="order-card" v-for="doc in outwardVisible" :key="doc.name">
      <div class="order-left">
        <input type="checkbox" v-model="selectedOutward" :value="doc.name" @change="syncSelectAllOutward" />

        <div class="order-info">
          <div class="order-title">
            <strong>{{ doc.name }}</strong>
            <span class="badge paid">{{ doc.status }}</span>
          </div>

          <div class="order-meta">
            {{ formatDate(doc.posting_date) }} · Purpose:
            <b>{{ doc.purpose }}</b>
          </div>

          <!-- FIRST ITEM -->
          <div class="order-product" v-if="doc.items.length">
            <div>
              <div class="product-name">
                {{ doc.items[0].item_code }}
              </div>
              <div class="product-meta">
                Qty: {{ doc.items[0].qty }}
              </div>
            </div>
          </div>

          <!-- MORE ITEMS -->
          <div v-if="doc.showAllItems">
            <div class="order-product" v-for="item in doc.items.slice(1)" :key="item.name">
              <div>
                <div class="product-name">{{ item.item_code }}</div>
                <div class="product-meta">Qty: {{ item.qty }}</div>
              </div>
            </div>
          </div>

          <div class="more-items" v-if="doc.items.length > 1" @click="doc.showAllItems = !doc.showAllItems">
            {{ doc.showAllItems
              ? 'Hide items'
              : '+' + (doc.items.length - 1) + ' more items' }}
          </div>
        </div>
      </div>

      <div class="order-right">
        <button class="btn ghost" @click="openStockEntry(doc.name)">
          View
        </button>
      </div>
    </div>

    <div v-if="canLoadMoreOutward" style="text-align:center;margin:16px">
      <button class="btn ghost" @click="loadMoreOutward">
        Load More
      </button>
    </div>
  </div>

  </div>
    <div v-if="pageMode === 'asset'" class="stockio-body">

    <div v-if="subMode === 'movement'">
    <div class="order-toolbar">
      <label>
        <input type="checkbox" v-model="selectAllAssetMovements" @change="toggleSelectAllAssetMovements" />
        Select All
      </label>

      <div class="toolbar-actions" v-if="hasAssetMovementSelection">
        <button class="btn ghost">Print</button>
        <button class="btn success">Submit</button>
      </div>
    </div>

<div class="order-card" v-for="doc in assetMovementsVisible" :key="doc.name">

  <div class="order-left">
    <input
      type="checkbox"
      v-model="selectedAssetMovements"
      :value="doc.name"
      @change="syncSelectAllAssetMovements"
    />

    <div class="order-info">
      <div class="order-title">
        <strong>{{ doc.name }}</strong>
    </div>
      <div class="order-title">
        <strong>Reference Name:</strong>
        <strong>{{doc.custom_reference_name}}</strong>
        <span class="badge paid">{{ doc.status }}</span>
      </div>

      <div class="order-meta">
        {{ formatDate(doc.transaction_date) }} · Purpose:
        <b>{{ doc.purpose }}</b>
      </div>

      <!-- FIRST ASSET -->
      <div class="order-product" v-if="doc.items.length">
        <div>
          <div class="product-name">
            {{ doc.items[0].asset_name || doc.items[0].asset }}
          </div>
          <div class="product-meta">
            From: {{ doc.items[0].source_location }}
            <span v-if="doc.items[0].to_employee">
              · To: {{ doc.items[0].to_employee }}
            </span>
          </div>
        </div>
      </div>

      <!-- MORE ASSETS -->
      <div v-if="doc.showAllItems">
        <div
          class="order-product"
          v-for="item in doc.items.slice(1)"
          :key="item.asset"
        >
          <div>
            <div class="product-name">
              {{ item.asset_name || item.asset }}
            </div>
            <div class="product-meta">
              From: {{ item.source_location }}
              <span v-if="item.to_employee">
                · To: {{ item.to_employee }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        class="more-items"
        v-if="doc.items.length > 1"
        @click="doc.showAllItems = !doc.showAllItems"
      >
        {{ doc.showAllItems
          ? 'Hide assets'
          : '+' + (doc.items.length - 1) + ' more assets' }}
      </div>

    </div>
  </div>

  <div class="order-right">
    <button class="btn ghost" @click="openAssetMovement(doc.name)">
      View
    </button>
  </div>

</div>


    <div v-if="canLoadMoreAssetMovements" style="text-align:center;margin:16px">
      <button class="btn ghost" @click="loadMoreAssetMovements">
        Load More
      </button>
    </div>
    </div>

    <div v-if="subMode === 'item'">
    <div class="order-toolbar">
      <label>
        <input type="checkbox" v-model="selectAllAssets" @change="toggleSelectAllAssets" />
        Select All
      </label>

      <div class="toolbar-actions" v-if="hasAssetSelection">
        <button class="btn ghost">Print</button>
        <button class="btn success">Transfer</button>
      </div>
    </div>

    <div class="order-card" v-for="doc in assetsVisible" :key="doc.name">
      <div class="order-left">
        <input type="checkbox" v-model="selectedAssets" :value="doc.name" @change="syncSelectAllAssets" />

        <div class="order-info">
          <div class="order-title">
            <strong>{{ doc.asset_name }}</strong>
            <span class="badge paid">{{ doc.status }}</span>
          </div>

          <div class="order-meta">
            {{ doc.name }} · Owner:
            <b>{{ doc.owner }}</b>
          </div>

        </div>
      </div>

      <div class="order-right">
        <button class="btn ghost" @click="openAsset(doc.name)">
          View
        </button>
      </div>
    </div>

    <div v-if="canLoadMoreAssets" style="text-align:center;margin:16px">
      <button class="btn ghost" @click="loadMoreAssets">
        Load More
      </button>
    </div>
  </div>

  </div>


    </main>
  </div>

    `);
  }

  mountVue() {
    const app = {
      // ===== STATE =====
      pageMode: localStorage.getItem("stockio_page_mode") || "requests",
      subMode: localStorage.getItem("stockio_sub_mode") || null,
      sidebarCollapsed: false,
      stockOpen: false,
      assetOpen: false,
      activeTab: "all",
      searchText: "",

      // DATA LISTS
      requests: [],
      visibleRequests: [],
      offset: 0,
      pageSize: 5,

      inward: [],
      inwardVisible: [],
      inwardOffset: 0,
      inwardPageSize: 5,

      outward: [],
      outwardVisible: [],
      outwardOffset: 0,
      outwardPageSize: 5,

      assets: [],
      assetsVisible: [],
      assetsOffset: 0,
      assetsPageSize: 5,

      assetMovements: [],
      assetMovementsVisible: [],
      assetMovementsOffset: 0,
      assetMovementsPageSize: 5,

      // SELECTION
      selectAll: false,
      selectedDocs: [],
      selectAllInward: false,
      selectedInward: [],
      selectAllOutward: false,
      selectedOutward: [],
      selectAllAssets: false,
      selectedAssets: [],
      selectAllAssetMovements: false,
      selectedAssetMovements: [],

      counts: {
        all: 0,
        today: 0,
        draft: 0,
        pending: 0,
        approved: 0,
        cancelled: 0,
      },

      // ===== GETTERS =====
      get pageTitle() {
        if (this.pageMode === "requests") return "Material Requests";
        if (this.pageMode === "stock") {
          return this.subMode === "inward" ? "Stock-Inward" : "Stock-Outward";
        }
        if (this.pageMode === "asset") {
          return this.subMode === "item" ? "Asset-Item" : "Asset-Movement";
        }
        if (this.pageMode === "reports") return "Reports";
        return "StockIO";
      },

      get activeList() {
        if (this.pageMode === "stock" && this.subMode === "inward") return this.inward;
        if (this.pageMode === "stock" && this.subMode === "outward") return this.outward;
        if (this.pageMode === "asset" && this.subMode === "movement") return this.assetMovements;
        if (this.pageMode === "asset" && this.subMode === "item") return this.assets;
        return this.requests;
      },

      get hasSelection() { return this.selectedDocs.length > 0; },
      get hasInwardSelection() { return this.selectedInward.length > 0; },
      get hasOutwardSelection() { return this.selectedOutward.length > 0; },
      get hasAssetSelection() { return this.selectedAssets.length > 0; },
      get hasAssetMovementSelection() { return this.selectedAssetMovements.length > 0; },

      get canLoadMore() { return this.visibleRequests.length < this.getFilteredList().length; },
      get canLoadMoreInward() { return this.inwardVisible.length < this.inward.length; },
      get canLoadMoreOutward() { return this.outwardVisible.length < this.outward.length; },
      get canLoadMoreAssets() { return this.assetsVisible.length < this.assets.length; },
      get canLoadMoreAssetMovements() { return this.assetMovementsVisible.length < this.assetMovements.length; },

      // ===== METHODS =====
      setMode(mode, sub = null) {
        // Validate sub-mode for the category
        if (mode === "stock" && !["inward", "outward"].includes(sub)) {
          sub = this.subMode && ["inward", "outward"].includes(this.subMode) ? this.subMode : "inward";
        }
        if (mode === "asset" && !["item", "movement"].includes(sub)) {
          sub = this.subMode && ["item", "movement"].includes(this.subMode) ? this.subMode : "item";
        }

        this.pageMode = mode;
        this.subMode = sub;
        localStorage.setItem("stockio_page_mode", mode);
        localStorage.setItem("stockio_sub_mode", sub || "");

        // Auto-expand submenus
        if (mode === "stock") this.stockOpen = true;
        if (mode === "asset") this.assetOpen = true;

        this.searchText = "";
        this.activeTab = "all";

        if (mode === "requests") {
          if (!this.requests.length) this.loadRequests();
          else {
            this.offset = 0;
            this.visibleRequests = [];
            this.loadMore();
          }
        } else if (mode === "stock" && sub === "inward") {
          if (!this.inward.length) this.loadInward();
          else {
            this.inwardOffset = 0;
            this.inwardVisible = [];
            this.loadMoreInward();
          }
        } else if (mode === "stock" && sub === "outward") {
          if (!this.outward.length) this.loadOutward();
          else {
            this.outwardOffset = 0;
            this.outwardVisible = [];
            this.loadMoreOutward();
          }
        } else if (mode === "asset" && sub === "item") {
          if (!this.assets.length) this.loadAssets();
          else {
            this.assetsOffset = 0;
            this.assetsVisible = [];
            this.loadMoreAssets();
          }
        } else if (mode === "asset" && sub === "movement") {
          if (!this.assetMovements.length) this.loadAssetMovements();
          else {
            this.assetMovementsOffset = 0;
            this.assetMovementsVisible = [];
            this.loadMoreAssetMovements();
          }
        }
      },

      toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; },
      toggleStock() {
        this.stockOpen = !this.stockOpen;
        if (this.stockOpen) {
          this.assetOpen = false;
          if (this.sidebarCollapsed) this.sidebarCollapsed = false;
        }
      },
      toggleAsset() {
        this.assetOpen = !this.assetOpen;
        if (this.assetOpen) {
          this.stockOpen = false;
          if (this.sidebarCollapsed) this.sidebarCollapsed = false;
        }
      },
      setTab(tab) { this.activeTab = tab; this.offset = 0; this.visibleRequests = []; this.loadMore(); },

      // REQUESTS
      loadRequests() {
        frappe.call({
          method: "frappe.client.get_list",
          args: {
            doctype: "Employee Material Request",
            fields: ["name", "status", "creation", "owner", "reporting_person_status", "ho_officer_status"],
            limit_page_length: 1000,
          },
          callback: (r) => {
            if (!r.message) return;
            this.requests = r.message.map(d => ({ ...d, items: [], showAllItems: false }));
            this.offset = 0;
            this.visibleRequests = [];
            this.computeCounts();
            this.loadMore();
            this.requests.forEach(doc => this.loadItems(doc));
          }
        });
      },
      loadItems(doc) {
        frappe.call({
          method: "frappe.client.get",
          args: { doctype: "Employee Material Request", name: doc.name },
          callback: (r) => { if (r.message) doc.items = r.message.items || []; }
        });
      },
      // SEARCH & FILTERING
      performSearch() {
        this.offset = 0;
        this.visibleRequests = [];
        this.inwardOffset = 0;
        this.inwardVisible = [];
        this.outwardOffset = 0;
        this.outwardVisible = [];
        this.assetsOffset = 0;
        this.assetsVisible = [];
        this.assetMovementsOffset = 0;
        this.assetMovementsVisible = [];

        if (this.pageMode === "requests") this.loadMore();
        else if (this.pageMode === "stock" && this.subMode === "inward") this.loadMoreInward();
        else if (this.pageMode === "stock" && this.subMode === "outward") this.loadMoreOutward();
        else if (this.pageMode === "asset" && this.subMode === "item") this.loadMoreAssets();
        else if (this.pageMode === "asset" && this.subMode === "movement") this.loadMoreAssetMovements();
      },

      getFilteredList() {
        const q = this.searchText.toLowerCase();
        
        if (this.pageMode === "requests") {
          const today = frappe.datetime.get_today();
          let list = this.requests;
          if (this.activeTab === "today") list = list.filter(d => d.creation?.split(" ")[0] === today);
          else if (this.activeTab === "draft") list = list.filter(d => d.status === "Draft");
          else if (this.activeTab === "pending") list = list.filter(d => ["Pending HO Approval", "Pending Reporting Person", "To Receive"].includes(d.status));
          else if (this.activeTab === "approved") list = list.filter(d => ["Approved", "Submitted"].includes(d.status));
          else if (this.activeTab === "cancelled") list = list.filter(d => d.status === "Cancelled");

          if (q) {
            list = list.filter(d => 
              d.name?.toLowerCase().includes(q) || 
              d.owner?.toLowerCase().includes(q) || 
              d.status?.toLowerCase().includes(q) || 
              d.items?.some(i => i.item_code?.toLowerCase().includes(q))
            );
          }
          return list;
        }

        if (this.pageMode === "stock") {
          let list = this.subMode === "inward" ? this.inward : this.outward;
          if (q) {
            list = list.filter(d => 
              d.name?.toLowerCase().includes(q) || 
              (d.supplier?.toLowerCase().includes(q)) || 
              (d.purpose?.toLowerCase().includes(q)) ||
              d.status?.toLowerCase().includes(q) ||
              d.items?.some(i => i.item_code?.toLowerCase().includes(q))
            );
          }
          return list;
        }

        if (this.pageMode === "asset") {
          let list = this.subMode === "item" ? this.assets : this.assetMovements;
          if (q) {
            list = list.filter(d => 
              d.name?.toLowerCase().includes(q) || 
              (d.asset_name?.toLowerCase().includes(q)) || 
              (d.custom_reference_name?.toLowerCase().includes(q)) ||
              (d.purpose?.toLowerCase().includes(q)) ||
              d.status?.toLowerCase().includes(q)
            );
          }
          return list;
        }

        return [];
      },

      loadMore() {
        const source = this.getFilteredList();
        const next = source.slice(this.offset, this.offset + this.pageSize);
        this.visibleRequests.push(...next);
        this.offset += this.pageSize;
      },

      loadMoreInward() {
        const source = this.getFilteredList();
        const next = source.slice(this.inwardOffset, this.inwardOffset + this.inwardPageSize);
        this.inwardVisible.push(...next);
        this.inwardOffset += this.inwardPageSize;
      },

      loadMoreOutward() {
        const source = this.getFilteredList();
        const next = source.slice(this.outwardOffset, this.outwardOffset + this.outwardPageSize);
        this.outwardVisible.push(...next);
        this.outwardOffset += this.outwardPageSize;
      },

      loadMoreAssets() {
        const source = this.getFilteredList();
        const next = source.slice(this.assetsOffset, this.assetsOffset + this.assetsPageSize);
        this.assetsVisible.push(...next);
        this.assetsOffset += this.assetsPageSize;
      },

      loadMoreAssetMovements() {
        const source = this.getFilteredList();
        const next = source.slice(this.assetMovementsOffset, this.assetMovementsOffset + this.assetMovementsPageSize);
        this.assetMovementsVisible.push(...next);
        this.assetMovementsOffset += this.assetMovementsPageSize;
      },

      // COUNTS
      computeCounts() {
        const today = frappe.datetime.get_today();
        this.counts = { all: this.requests.length, today: 0, draft: 0, pending: 0, approved: 0, cancelled: 0 };
        this.requests.forEach(doc => {
          const docDate = doc.creation?.split(" ")[0];
          if (docDate === today) this.counts.today++;
          if (doc.status === "Draft") this.counts.draft++;
          else if (["Pending HO Approval", "Pending Reporting Person", "To Receive"].includes(doc.status)) this.counts.pending++;
          else if (["Approved", "Submitted"].includes(doc.status)) this.counts.approved++;
          else if (doc.status === "Cancelled") this.counts.cancelled++;
        });
      },

      // REQUESTS
      loadRequests() {
        frappe.call({
          method: "frappe.client.get_list",
          args: {
            doctype: "Employee Material Request",
            fields: ["name", "status", "creation", "owner", "reporting_person_status", "ho_officer_status"],
            limit_page_length: 1000,
          },
          callback: (r) => {
            if (!r.message) return;
            this.requests = r.message.map(d => ({ ...d, items: [], showAllItems: false }));
            this.offset = 0;
            this.visibleRequests = [];
            this.computeCounts();
            this.loadMore();
            this.requests.forEach(doc => this.loadItems(doc));
          }
        });
      },
      loadItems(doc) {
        frappe.call({
          method: "frappe.client.get",
          args: { doctype: "Employee Material Request", name: doc.name },
          callback: (r) => { if (r.message) doc.items = r.message.items || []; }
        });
      },

      // INWARD
      loadInward() {
        frappe.call({
          method: "frappe.client.get_list",
          args: { doctype: "Purchase Receipt", fields: ["name", "posting_date", "supplier", "status"], order_by: "posting_date desc", limit_page_length: 1000 },
          callback: (r) => {
            if (!r.message) return;
            this.inward = r.message.map(d => ({ ...d, items: [], showAllItems: false }));
            this.inwardOffset = 0;
            this.inwardVisible = [];
            this.loadMoreInward();
            this.inward.forEach(doc => this.loadInwardItems(doc));
          }
        });
      },
      loadInwardItems(doc) {
        frappe.call({
          method: "frappe.client.get",
          args: { doctype: "Purchase Receipt", name: doc.name },
          callback: (r) => { if (r.message) doc.items = r.message.items || []; }
        });
      },

      // OUTWARD
      loadOutward() {
        frappe.call({
          method: "frappe.client.get_list",
          args: { doctype: "Stock Entry", fields: ["name", "posting_date", "purpose", "docstatus"], filters: { purpose: ["in", ["Material Issue", "Material Transfer"]] }, order_by: "posting_date desc", limit_page_length: 1000 },
          callback: (r) => {
            if (!r.message) return;
            this.outward = r.message.map(d => {
              let status = d.docstatus === 0 ? "Draft" : d.docstatus === 1 ? "Submitted" : "Cancelled";
              return { ...d, status, items: [], showAllItems: false };
            });
            this.outwardOffset = 0;
            this.outwardVisible = [];
            this.loadMoreOutward();
            this.outward.forEach(doc => this.loadOutwardItems(doc));
          }
        });
      },
      loadOutwardItems(doc) {
        frappe.call({
          method: "frappe.client.get",
          args: { doctype: "Stock Entry", name: doc.name },
          callback: (r) => { if (r.message) doc.items = r.message.items || []; }
        });
      },

      // ASSETS
      loadAssets() {
        frappe.call({
          method: "frappe.client.get_list",
          args: { doctype: "Asset", fields: ["name", "asset_name", "docstatus", "owner"], order_by: "creation desc", limit_page_length: 1000 },
          callback: (r) => {
            if (!r.message) return;
            this.assets = r.message.map(d => {
              let status = d.docstatus === 0 ? "Draft" : d.docstatus === 1 ? "Submitted" : "Cancelled";
              return { ...d, status, items: [], showAllItems: false };
            });
            this.assetsOffset = 0;
            this.assetsVisible = [];
            this.loadMoreAssets();
          }
        });
      },

      // ASSET MOVEMENTS
      loadAssetMovements() {
        frappe.call({
          method: "frappe.client.get_list",
          args: { doctype: "Asset Movement", fields: ["name", "custom_reference_name", "purpose", "transaction_date", "docstatus"], order_by: "transaction_date desc", limit_page_length: 1000 },
          callback: (r) => {
            if (!r.message) return;
            this.assetMovements = r.message.map(d => {
              let status = d.docstatus === 0 ? "Draft" : d.docstatus === 1 ? "Submitted" : "Cancelled";
              return { ...d, status, items: [], showAllItems: false };
            });
            this.assetMovementsOffset = 0;
            this.assetMovementsVisible = [];
            this.loadMoreAssetMovements();
            this.assetMovements.forEach(doc => this.loadAssetMovementItems(doc));
          }
        });
      },
      loadAssetMovementItems(doc) {
        frappe.call({
          method: "frappe.client.get",
          args: { doctype: "Asset Movement", name: doc.name },
          callback: (r) => { if (r.message) doc.items = r.message.assets || []; }
        });
      },

      // HELPERS
      formatDate(date) { return frappe.datetime.str_to_user(date); },
      toggleItems(doc) { doc.showAllItems = !doc.showAllItems; },
      createRequest() {
        if (this.pageMode === "stock") {
          if (this.subMode === "inward") return frappe.set_route("Form", "Purchase Receipt", "new-purchase-receipt-1");
          if (this.subMode === "outward") return frappe.set_route("Form", "Stock Entry", "new-stock-entry-1");
        }
        if (this.pageMode === "asset") {
          if (this.subMode === "item") return frappe.set_route("Form", "Asset", "new-asset-1");
          if (this.subMode === "movement") return frappe.set_route("Form", "Asset Movement", "new-asset-movement-1");
        }
        frappe.set_route("Form", "Employee Material Request", "new-employee-material-request");
      },
      openRequest(name) { frappe.set_route("Form", "Employee Material Request", name); },
      openPurchaseReceipt(name) { frappe.set_route("Form", "Purchase Receipt", name); },
      openStockEntry(name) { frappe.set_route("Form", "Stock Entry", name); },
      openAsset(name) { frappe.set_route("Form", "Asset", name); },
      openAssetMovement(name) { frappe.set_route("Form", "Asset Movement", name); },
      openReports() { this.pageMode = "reports"; },
      openRequests() { this.pageMode = "requests"; },
      openReport(route) { this.setMode("reports"); frappe.set_route(route); },

      // SELECTION HANDLERS
      toggleSelectAll() { this.selectedDocs = this.selectAll ? this.requests.map(d => d.name) : []; },
      syncSelectAll() { this.selectAll = this.selectedDocs.length === this.requests.length; },
      toggleSelectAllInward() { this.selectedInward = this.selectAllInward ? this.inward.map(d => d.name) : []; },
      syncSelectAllInward() { this.selectAllInward = this.selectedInward.length === this.inward.length; },
      toggleSelectAllOutward() { this.selectedOutward = this.selectAllOutward ? this.outward.map(d => d.name) : []; },
      syncSelectAllOutward() { this.selectAllOutward = this.selectedOutward.length === this.outward.length; },
      toggleSelectAllAssets() { this.selectedAssets = this.selectAllAssets ? this.assets.map(d => d.name) : []; },
      syncSelectAllAssets() { this.selectAllAssets = this.selectedAssets.length === this.assets.length; },
      toggleSelectAllAssetMovements() { this.selectedAssetMovements = this.selectAllAssetMovements ? this.assetMovements.map(d => d.name) : []; },
      syncSelectAllAssetMovements() { this.selectAllAssetMovements = this.selectedAssetMovements.length === this.assetMovements.length; },

      reports: [
        { label: "Stock and Asset Reports", route: "/app/query-report/My%20Material%20Requests" },
        { label: "My Material Requests", route: "/app/query-report/My%20Material%20Requests" },
        { label: "Store Asset Master", route: "/app/query-report/Store%20Asset%20Master" },
        { label: "Store Material Request", route: "/app/query-report/Store%20material%20request" },
        { label: "My Pending Approvals", route: "/app/query-report/My%20Pending%20Approvals" },
        { label: "Asset Transfer", route: "/app/query-report/Asset%20Transfer" },
        { label: "Consumed Items", route: "/app/query-report/Consumed%20Items" },
        { label: "Branch Stock", route: "/app/query-report/Branch%20Stock" },
        { label: "My Assets", route: "/app/query-report/My%20Assets" },
      ],

      getProgressFlow(doc) {
        const status = doc.status;
        let step1 = { state: status === "Draft" ? "pending" : "done", label: status === "Draft" ? "Draft" : "Submitted" };
        let step2 = { visible: status !== "Cancelled", state: status === "Pending Reporting Person" ? "pending" : (["Pending HO Approval", "Approved"].includes(status) ? "done" : "disabled") };
        let step3 = { state: status === "Pending HO Approval" ? "pending" : (status === "Approved" ? "done" : (status === "Cancelled" ? "cancelled" : "disabled")), label: status === "Cancelled" ? "Cancelled" : "HO Approval" };
        return { step1, step2, step3 };
      },
    };

    PetiteVue.createApp(app).mount(this.wrapper[0]);
    setTimeout(() => { app.setMode(app.pageMode, app.subMode); }, 100);
  }
}
