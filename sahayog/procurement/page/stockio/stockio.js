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
  // script.src = "/assets/sahayog/js/petite-vue.iife.js";
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
      >
      <span class="icon">🏠</span>
      <span v-if="!sidebarCollapsed">Requests</span>
      </div>

      <!-- STOCK -->
      <div class="menu-group">
      <div class="menu-item"
         @click="toggleStock(); setMode('stock')">
        <span class="icon">🛒</span>
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
         @click="toggleAsset(); setMode('asset')">
        <span class="icon">📦</span>
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
      <h2>Material Requests</h2>
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
        <div class="approval-progress">

          <!-- STEP 1 -->
          <div class="step" :class="stepClass('request', doc)">
            <span class="dot"></span>
            <span class="label">
              {{ doc.status === 'Draft' ? 'Draft' : 'Submitted' }}
            </span>
          </div>

          <div class="line"></div>

          <!-- STEP 2 -->
          <div class="step" :class="stepClass('reporting', doc)">
            <span class="dot"></span>
            <span class="label">
              Reporting
            </span>
          </div>

          <div class="line"></div>

          <!-- STEP 3 -->
          <div class="step" :class="stepClass('ho', doc)">
            <span class="dot"></span>
            <span class="label">
              HO Approval
            </span>
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

    <div v-if="subMode === 'item'">
    <!-- ASSET ITEM CONTENT -->
    </div>

    <div v-if="subMode === 'movement'" class="stockio-body">
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
    <div v-if="pageMode === 'asset' && subMode === 'item'" class="stockio-body">
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
      // ASSET MOVEMENTS STATE
      assetMovements: [],
      assetMovementsVisible: [],
      assetMovementsOffset: 0,
      assetMovementsPageSize: 2,

      selectAllAssetMovements: false,
      selectedAssetMovements: [],

      // ===== INITIALIZE ALL DATA LISTS =====
      requests: [],
      inward: [],
      outward: [],
      assets: [],
      assetMovements: [],
      // ===== ASSET MOVEMENTS =====
      assetMovements: [],
      assetMovementsVisible: [],
      assetMovementsOffset: 0,
      assetMovementsPageSize: 2,

      selectAllAssetMovements: false,
      selectedAssetMovements: [],

      get hasAssetMovementSelection() {
        return this.selectedAssetMovements.length > 0;
      },

      get canLoadMoreAssetMovements() {
        return this.assetMovementsVisible.length < this.assetMovements.length;
      },

      // shared pagination
      visibleRequests: [],
      offset: 0,
      pageSize: 2,
      pageMode: "requests", // 'requests' | 'reports'
      sidebarCollapsed: false,
      stockOpen: false,
      assetOpen: false,

      requests: [],
      activeTab: "all", // all | today | draft | pending | approved | cancelled
      pageMode: localStorage.getItem("stockio_page_mode") || "requests",
      subMode: localStorage.getItem("stockio_sub_mode") || null,

      counts: {
        all: 0,
        today: 0,
        pending: 0,
        approved: 0,
      },
      setMode(mode, sub = null) {
        this.pageMode = mode;
        this.subMode = sub;

        localStorage.setItem("stockio_page_mode", mode);
        localStorage.setItem("stockio_sub_mode", sub || "");

        this.offset = 0;
        this.visibleRequests = [];
        this.searchText = "";
        this.activeTab = "all";

        if (mode === "stock" && sub === "inward") {
          if (!this.inward.length) this.loadInward();
          else this.loadMoreInward();
        }

        if (mode === "stock" && sub === "outward") {
          if (!this.outward.length) this.loadOutward();
          else this.loadMoreOutward();
        }

        if (mode === "asset" && sub === "item") {
          if (!this.assets.length) this.loadAssets();
          else this.loadMoreAssets();
        }

        if (mode === "asset" && sub === "movement") {
          if (!this.assetMovements.length) this.loadAssetMovements();
          else this.loadMoreAssetMovements();
          this.assetMovements.forEach((doc) =>
            this.loadAssetMovementItems(doc),
          );
        }

        if (mode === "requests") {
          this.loadMore();
        }
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
            fields: [
              "name",
              "status",
              "creation",
              "owner",
              "reporting_person_status",
              "ho_officer_status",
            ],
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

        const list = this.activeList;

        this.counts = {
          all: list.length,
          today: 0,
          draft: 0,
          pending: 0,
          approved: 0,
          cancelled: 0,
        };

        list.forEach((doc) => {
          const docDate =
            this.pageMode === "stock" && this.subMode === "inward"
              ? doc.posting_date
              : this.pageMode === "stock" && this.subMode === "outward"
                ? doc.posting_date
                : doc.creation?.split(" ")[0];

          if (docDate === today) this.counts.today++;

          if (doc.status === "Draft") this.counts.draft++;

          if (
            doc.status === "Pending HO Approval" ||
            doc.status === "Pending Reporting Person" ||
            doc.status === "To Receive"
          ) {
            this.counts.pending++;
          }

          if (doc.status === "Approved" || doc.status === "Submitted") {
            this.counts.approved++;
          }

          if (doc.status === "Cancelled") this.counts.cancelled++;
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
        const source = this.getFilteredList();
        const next = source.slice(this.offset, this.offset + this.pageSize);

        this.visibleRequests.push(...next);
        this.offset += this.pageSize;
      },

      // ---------------------------
      // FILTER (HELPER, NOT PAGINATION)
      // ---------------------------
      getFilteredList() {
        const today = frappe.datetime.get_today();
        let list = this.activeList;

        // TAB FILTER
        if (this.activeTab === "today") {
          list = list.filter((d) => d.creation?.split(" ")[0] === today);
        }

        if (this.activeTab === "draft") {
          list = list.filter((d) => d.status === "Draft");
        }

        if (this.activeTab === "pending") {
          list = list.filter((d) =>
            [
              "Pending HO Approval",
              "Pending Reporting Person",
              "To Receive",
            ].includes(d.status),
          );
        }

        if (this.activeTab === "approved") {
          list = list.filter((d) =>
            ["Approved", "Submitted"].includes(d.status),
          );
        }

        if (this.activeTab === "cancelled") {
          list = list.filter((d) => d.status === "Cancelled");
        }

        // SEARCH
        if (!this.searchText) return list;

        const q = this.searchText.toLowerCase();

        return list.filter(
          (d) =>
            d.name?.toLowerCase().includes(q) ||
            d.owner?.toLowerCase().includes(q) ||
            d.status?.toLowerCase().includes(q) ||
            d.items?.some((i) => i.item_code?.toLowerCase().includes(q)),
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
        return this.visibleRequests.length < this.getFilteredList().length;
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
      stepClass(step, doc) {
        if (step === "request") {
          return doc.status === "Draft" ? "pending" : "done";
        }

        if (step === "reporting") {
          if (!doc.reporting_person_status) return "disabled";
          if (doc.reporting_person_status === "Approved") return "done";
          if (doc.reporting_person_status === "Rejected") return "rejected";
          return "pending";
        }

        if (step === "ho") {
          if (!doc.ho_officer_status) return "disabled";
          if (doc.ho_officer_status === "Approved") return "done";
          if (doc.ho_officer_status === "Rejected") return "rejected";
          return "pending";
        }

        return "disabled";
      },
      setTab(tab) {
        this.activeTab = tab;
        this.offset = 0;
        this.visibleRequests = [];
        this.loadMore();
      },
      openRequests() {
        this.pageMode = "requests";
      },

      openReports() {
        this.pageMode = "reports";
      },
      reports: [
        {
          label: "Stock and Asset Reports",
          route: "/app/query-report/My%20Material%20Requests",
        },
        {
          label: "My Material Requests",
          route: "/app/query-report/My%20Material%20Requests",
        },
        {
          label: "Store Asset Master",
          route: "/app/query-report/Store%20Asset%20Master",
        },
        {
          label: "Store Material Request",
          route: "/app/query-report/Store%20material%20request",
        },
        {
          label: "My Pending Approvals",
          route: "/app/query-report/My%20Pending%20Approvals",
        },
        {
          label: "Asset Transfer",
          route: "/app/query-report/Asset%20Transfer",
        },
        {
          label: "Consumed Items",
          route: "/app/query-report/Consumed%20Items",
        },
        {
          label: "Branch Stock",
          route: "/app/query-report/Branch%20Stock",
        },
        {
          label: "My Assets",
          route: "/app/query-report/My%20Assets",
        },
      ],
      openReport(route) {
        window.location.href = route;
      },
      openReport(route) {
        this.setMode("reports");
        frappe.set_route(route);
      },

      inward: [],
      inwardVisible: [],
      inwardOffset: 0,
      inwardPageSize: 2,
      loadInward() {
        frappe.call({
          method: "frappe.client.get_list",
          args: {
            doctype: "Purchase Receipt",
            fields: ["name", "posting_date", "supplier", "status"],
            order_by: "posting_date desc",
            limit_page_length: 1000,
          },
          callback: (r) => {
            if (!r.message) return;

            this.inward = r.message.map((d) => ({
              ...d,
              items: [],
              showAllItems: false,
            }));

            this.inwardOffset = 0;
            this.inwardVisible = [];
            this.loadMoreInward();

            this.inward.forEach((doc) => this.loadInwardItems(doc));
          },
        });
      },
      loadInwardItems(doc) {
        frappe.call({
          method: "frappe.client.get",
          args: {
            doctype: "Purchase Receipt",
            name: doc.name,
          },
          callback: (r) => {
            if (r.message) {
              doc.items = r.message.items || [];
            }
          },
        });
      },
      loadMoreInward() {
        const next = this.inward.slice(
          this.inwardOffset,
          this.inwardOffset + this.inwardPageSize,
        );

        this.inwardVisible.push(...next);
        this.inwardOffset += this.inwardPageSize;
      },

      get canLoadMoreInward() {
        return this.inwardVisible.length < this.inward.length;
      },
      openPurchaseReceipt(name) {
        frappe.set_route("Form", "Purchase Receipt", name);
      },

      // INWARD SELECTION
      selectAllInward: false,
      selectedInward: [],

      get hasInwardSelection() {
        return this.selectedInward.length > 0;
      },

      toggleSelectAllInward() {
        if (this.selectAllInward) {
          this.selectedInward = this.inward.map((doc) => doc.name);
        } else {
          this.selectedInward = [];
        }
      },

      syncSelectAllInward() {
        this.selectAllInward =
          this.selectedInward.length === this.inward.length;
      },

      // OUTWARD
      outward: [],
      outwardVisible: [],
      outwardOffset: 0,
      outwardPageSize: 2,
      loadOutward() {
        frappe.call({
          method: "frappe.client.get_list",
          args: {
            doctype: "Stock Entry",
            fields: ["name", "posting_date", "purpose", "docstatus"],
            filters: {
              purpose: ["in", ["Material Issue", "Material Transfer"]],
            },
            order_by: "posting_date desc",
            limit_page_length: 1000,
          },
          callback: (r) => {
            if (!r.message) return;

            this.outward = r.message.map((d) => {
              let status = "";
              if (d.docstatus === 0) status = "Draft";
              if (d.docstatus === 1) status = "Submitted";
              if (d.docstatus === 2) status = "Cancelled";
              return { ...d, status, items: [], showAllItems: false };
            });

            this.outwardOffset = 0;
            this.outwardVisible = [];
            this.loadMoreOutward();

            this.outward.forEach((doc) => this.loadOutwardItems(doc));
          },
        });
      },
      loadOutwardItems(doc) {
        frappe.call({
          method: "frappe.client.get",
          args: {
            doctype: "Stock Entry",
            name: doc.name,
          },
          callback: (r) => {
            if (r.message) {
              doc.items = r.message.items || [];
            }
          },
        });
      },
      loadMoreOutward() {
        const next = this.outward.slice(
          this.outwardOffset,
          this.outwardOffset + this.outwardPageSize,
        );

        this.outwardVisible.push(...next);
        this.outwardOffset += this.outwardPageSize;
      },

      get canLoadMoreOutward() {
        return this.outwardVisible.length < this.outward.length;
      },
      openStockEntry(name) {
        frappe.set_route("Form", "Stock Entry", name);
      },

      // OUTWARD SELECTION
      selectAllOutward: false,
      selectedOutward: [],

      get hasOutwardSelection() {
        return this.selectedOutward.length > 0;
      },

      toggleSelectAllOutward() {
        if (this.selectAllOutward) {
          this.selectedOutward = this.outward.map((doc) => doc.name);
        } else {
          this.selectedOutward = [];
        }
      },

      syncSelectAllOutward() {
        this.selectAllOutward =
          this.selectedOutward.length === this.outward.length;
      },

      // ASSETS
      assets: [],
      assetsVisible: [],
      assetsOffset: 0,
      assetsPageSize: 2,
      loadAssets() {
        frappe.call({
          method: "frappe.client.get_list",
          args: {
            doctype: "Asset",
            fields: ["name", "asset_name", "docstatus", "owner"],
            order_by: "creation desc",
            limit_page_length: 1000,
          },
          callback: (r) => {
            if (!r.message) return;

            this.assets = r.message.map((d) => {
              let status = "";
              if (d.docstatus === 0) status = "Draft";
              if (d.docstatus === 1) status = "Submitted";
              if (d.docstatus === 2) status = "Cancelled";
              return { ...d, status, items: [], showAllItems: false };
            });

            this.assetsOffset = 0;
            this.assetsVisible = [];
            this.loadMoreAssets();
          },
        });
      },
      loadMoreAssets() {
        const next = this.assets.slice(
          this.assetsOffset,
          this.assetsOffset + this.assetsPageSize,
        );
        this.assetsVisible.push(...next);
        this.assetsOffset += this.assetsPageSize;
      },
      get canLoadMoreAssets() {
        return this.assetsVisible.length < this.assets.length;
      },
      openAsset(name) {
        frappe.set_route("Form", "Asset", name);
      },
      selectAllAssets: false,
      selectedAssets: [],
      get hasAssetSelection() {
        return this.selectedAssets.length > 0;
      },
      toggleSelectAllAssets() {
        if (this.selectAllAssets) {
          this.selectedAssets = this.assets.map((doc) => doc.name);
        } else {
          this.selectedAssets = [];
        }
      },
      syncSelectAllAssets() {
        this.selectAllAssets =
          this.selectedAssets.length === this.assets.length;
      },

      get activeList() {
        if (this.pageMode === "stock" && this.subMode === "inward") {
          return this.inward;
        }
        if (this.pageMode === "stock" && this.subMode === "outward") {
          return this.outward;
        }
        if (this.pageMode === "asset" && this.subMode === "movement") {
          return this.assetMovements;
        }
        if (this.pageMode === "asset" && this.subMode === "item") {
          return this.assets;
        }
        return this.requests;
      },

      loadAssetMovements() {
        frappe.call({
          method: "frappe.client.get_list",
          args: {
            doctype: "Asset Movement",
            fields: [
              "name",
              "custom_reference_name",
              "purpose",
              "transaction_date",
              "docstatus",
            ],
            order_by: "transaction_date desc",
            limit_page_length: 1000,
          },
          callback: (r) => {
            if (!r.message) return;

            this.assetMovements = r.message.map((d) => {
              let status = "Draft";
              if (d.docstatus === 1) status = "Submitted";
              if (d.docstatus === 2) status = "Cancelled";

              return {
                ...d,
                status,
                items: [],
                showAllItems: false,
              };
            });

            this.assetMovementsOffset = 0;
            this.assetMovementsVisible = [];
            this.loadMoreAssetMovements();

            this.assetMovements.forEach((doc) =>
              this.loadAssetMovementItems(doc),
            );
          },
        });
      },
      loadAssetMovementItems(doc) {
        frappe.call({
          method: "frappe.client.get",
          args: {
            doctype: "Asset Movement",
            name: doc.name,
          },
          callback: (r) => {
            if (r.message) {
              doc.items = r.message.assets || [];
            }
          },
        });
      },
      loadMoreAssetMovements() {
        const next = this.assetMovements.slice(
          this.assetMovementsOffset,
          this.assetMovementsOffset + this.assetMovementsPageSize,
        );
        this.assetMovementsVisible.push(...next);
        this.assetMovementsOffset += this.assetMovementsPageSize;
      },

      toggleSelectAllAssetMovements() {
        this.selectedAssetMovements = this.selectAllAssetMovements
          ? this.assetMovements.map((d) => d.name)
          : [];
      },

      syncSelectAllAssetMovements() {
        this.selectAllAssetMovements =
          this.selectedAssetMovements.length === this.assetMovements.length;
      },

      openAssetMovement(name) {
        frappe.set_route("Form", "Asset Movement", name);
      },
      get hasAssetMovementSelection() {
        return this.selectedAssetMovements.length > 0;
      },

      get canLoadMoreAssetMovements() {
        return this.assetMovementsVisible.length < this.assetMovements.length;
      },
      get hasAssetMovementSelection() {
        return this.selectedAssetMovements.length > 0;
      },

      get canLoadMoreAssetMovements() {
        return this.assetMovementsVisible.length < this.assetMovements.length;
      },
      loadMoreAssetMovements() {
        const next = this.assetMovements.slice(
          this.assetMovementsOffset,
          this.assetMovementsOffset + this.assetMovementsPageSize,
        );
        this.assetMovementsVisible.push(...next);
        this.assetMovementsOffset += this.assetMovementsPageSize;
      },

      toggleSelectAllAssetMovements() {
        if (this.selectAllAssetMovements) {
          this.selectedAssetMovements = this.assetMovements.map((d) => d.name);
        } else {
          this.selectedAssetMovements = [];
        }
      },

      syncSelectAllAssetMovements() {
        this.selectAllAssetMovements =
          this.selectedAssetMovements.length === this.assetMovements.length;
      },
    };

    PetiteVue.createApp(app).mount(this.wrapper[0]);

    setTimeout(() => {
      app.loadRequests();
    }, 100);
  }
}
