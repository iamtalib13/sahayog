// ==================================================
// STOCKIO – FULL WIDTH + SIDEBAR (PETITE-VUE)
// ==================================================

// Robust Polyfill for crypto.randomUUID and getRandomValues
// Fixes crashes in insecure (HTTP) contexts for extensions like Grammarly
(function () {
  try {
    var g =
      typeof window !== "undefined"
        ? window
        : typeof self !== "undefined"
          ? self
          : {};
    if (!g.crypto) g.crypto = {};
    if (!g.crypto.getRandomValues) {
      g.crypto.getRandomValues = function (array) {
        for (var i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      };
    }
    if (!g.crypto.randomUUID) {
      g.crypto.randomUUID = function () {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
          /[xy]/g,
          function (c) {
            var r = (Math.random() * 16) | 0,
              v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          },
        );
      };
    }
  } catch (e) {
    console.error("StockIO: Crypto polyfill failed", e);
  }
})();

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
  frappe.utils.set_title("StockIO");
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
  <div class="stockio-app" v-scope>

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

      <!-- ITEMS -->
      <div
      class="menu-item"
      :class="{ active: pageMode === 'item' }"
      @click="setMode('item')"
      title="Items"
      >
      <span class="icon">🏷️</span>
      <span v-if="!sidebarCollapsed">Items</span>
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
  <div class="stockio-tabs" v-if="pageMode !== 'reports' && pageMode !== 'item'">
    <template v-if="pageMode === 'requests'">
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
    </template>
    <template v-else-if="pageMode === 'stock' || pageMode === 'asset'">
      <span
      class="tab"
      :class="{ active: activeTab === 'all' }"
      @click="setTab('all')"
      >
      All <b>{{ counts.all }}</b>
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
      :class="{ active: activeTab === 'submitted' }"
      @click="setTab('submitted')"
      >
      Submitted <b class="green">{{ counts.submitted }}</b>
      </span>

      <span
      class="tab"
      :class="{ active: activeTab === 'other' }"
      @click="setTab('other')"
      >
      Other <b class="orange">{{ counts.other }}</b>
      </span>
    </template>
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
    <div v-if="pageMode === 'requests'" class="stockio-view-container">

      <div class="order-toolbar">
      <label>
        <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
        Select All
      </label>

      <div class="toolbar-actions" v-if="hasSelection">
        <button class="btn ghost">Print</button>
        
        <!-- Draft status -->
        <button class="btn success" v-if="selectionStatus === 'Draft'" @click="handleBulkAction('Submit')">Submit</button>

        <!-- Pending Reporting Person status -->
        <template v-if="selectionStatus === 'Pending Reporting Person' && canActionSelection">
          <button class="btn success" @click="handleBulkAction('Approve')">Approve</button>
          <button class="btn danger" @click="handleBulkAction('Reject')">Reject</button>
          <button class="btn primary" @click="handleBulkAction('Self Approve')">Self Approve</button>
        </template>

        <!-- Pending HO Approval status -->
        <template v-if="selectionStatus === 'Pending HO Approval' && canActionSelection">
          <button class="btn success" @click="handleBulkAction('Approve')">Approve</button>
          <button class="btn danger" @click="handleBulkAction('Reject')">Reject</button>
        </template>

        <!-- Other single status -->
        <button class="btn success"
          v-if="selectionStatus && !['Draft', 'Pending Reporting Person', 'Pending HO Approval', 'mixed'].includes(selectionStatus) && selectionStatus !== 'Approved'"
          @click="handleBulkAction('Approve')">Approve Request</button>
        
        <!-- Display buttons when status is Approved -->
        <template v-if="selectionStatus === 'Approved'">
          <button class="btn primary" 
                  v-show="selectionCategories.some(c => c.toLowerCase().includes('stock'))" 
                  @click="handleInwardAction">Inward</button>
          <button class="btn primary" 
                  v-show="selectionCategories.some(c => c.toLowerCase().includes('stock'))" 
                  @click="handleOutwardAction">Outward</button>
          <button class="btn primary" 
                  v-show="selectionCategories.some(c => c.toLowerCase().includes('asset'))" 
                  @click="handleAssetMovementAction">Asset Movement</button>
        </template>
      </div>
      </div>

      <div class="stockio-body">
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
          <!-- HEADER: SUMMARY, PROGRESS & ITEMS -->
          <div class="order-header-row">
            <!-- 1. SUMMARY -->
            <div class="order-meta-info">
              <div class="order-title">
                <strong>{{ doc.name }}</strong>
                <span class="badge paid">{{ doc.status }}</span>
              </div>
              <div class="order-meta">
                {{ formatDate(doc.creation) }} · By: <b>{{ doc.owner }}</b>
              </div>
            </div>

            <!-- 2. PROGRESS -->
            <div class="approval-progress compact">
              <!-- STEP 1 : Draft / Submitted -->
              <div class="step" :class="getProgressFlow(doc).step1.state">
                <span class="dot"></span>
                <span class="label">{{ getProgressFlow(doc).step1.label }}</span>
              </div>

              <div class="line" v-if="getProgressFlow(doc).step2.visible"></div>

              <!-- STEP 2 : Reporting -->
              <div class="step" v-if="getProgressFlow(doc).step2.visible" :class="getProgressFlow(doc).step2.state">
                <span class="dot"></span>
                <span class="label">Reporting</span>
              </div>

              <div class="line"></div>

              <!-- STEP 3 : HO Approval / Cancelled -->
              <div class="step" :class="getProgressFlow(doc).step3.state">
                <span class="dot"></span>
                <span class="label">{{ getProgressFlow(doc).step3.label }}</span>
              </div>
            </div>

            <!-- 3. ITEMS (When Expanded) -->
            <div class="order-items-horizontal" v-if="doc.showAllItems">
              <div class="item-compact-card" v-for="item in doc.items" :key="item.name">
                <div class="item-name-row">
                  <span>{{ item.item_code }}</span>
                  <span class="badge" 
                        v-if="item.item_category"
                        :class="item.item_category.toLowerCase().includes('asset') ? 'category-asset' : 'category-stock'">
                    {{ item.item_category[0] }}
                  </span>
                </div>
                <div class="item-meta-row">
                  Qty: {{ item.quantity }}
                </div>
              </div>
            </div>
          </div>

          <!-- TOGGLE BUTTON IN NEXT ROW -->
          <div class="order-toggle-row">
                          <button class="order-items-toggle" @click="toggleItems(doc)">
                            {{ doc.showAllItems ? 'Hide Items' : (doc.items && doc.items.length > 0 ? 'Show Items (' + doc.items.length + ')' : 'Show Items') }}
                          </button>          </div>
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

      </div> <!-- end stockio-body -->
    </div> <!-- end stockio-view-container -->

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

    <!-- ================= STOCK VIEWS ================= -->
    <div v-if="pageMode === 'stock' && subMode === 'inward'" class="stockio-view-container">
      <div class="stockio-body">
        <div class="order-card" v-for="doc in inwardVisible" :key="doc.name">
          <div class="order-left">
            <input type="checkbox" v-model="selectedInward" :value="doc.name" @change="syncSelectAllInward" />
            <div class="order-info">
              <div class="order-title">
                <strong>{{ doc.name }}</strong>
                <span class="badge paid">{{ doc.status }}</span>
              </div>
              <div class="order-meta">
                {{ formatDate(doc.posting_date) }} · Supplier:
                <b>{{ doc.supplier }}</b>
              </div>

              <!-- ITEMS -->
              <div class="order-product" v-if="doc.items && doc.items.length > 0">
                <div>
                  <div class="product-name">{{ doc.items?.[0]?.item_code || "" }}</div>
                  <div class="product-meta">
                    Qty: {{ doc.items?.[0]?.qty || 0 }} {{ doc.items?.[0]?.uom || "" }}
                  </div>
                </div>
              </div>
              <div v-if="doc.showAllItems">
                <div class="order-product" v-for="item in doc.items.slice(1)" :key="item.name">
                  <div>
                    <div class="product-name">{{ item.item_code }}</div>
                    <div class="product-meta">
                      Qty: {{ item.qty }} {{ item.uom }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="more-items" v-if="doc.items.length > 1" @click="toggleItems(doc)">
                {{ doc.showAllItems ? 'Hide items' : '+' + (doc.items.length - 1) + ' more items' }}
              </div>
            </div>
          </div>
          <div class="order-right">
            <button class="btn ghost" @click="openPurchaseReceipt(doc.name)">
              View
            </button>
          </div>
        </div>
        <div v-if="canLoadMoreInward" style="text-align:center;margin:16px">
          <button class="btn ghost" @click="loadMoreInward">Load More</button>
        </div>
      </div>
    </div>

    <div v-if="pageMode === 'stock' && subMode === 'outward'" class="stockio-view-container">
      <div class="stockio-body">
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

              <!-- ITEMS -->
              <div class="order-product" v-if="doc.items && doc.items.length > 0">
                <div>
                  <div class="product-name">{{ doc.items?.[0]?.item_code || "" }}</div>
                  <div class="product-meta">
                    Qty: {{ doc.items?.[0]?.qty || 0 }} {{ doc.items?.[0]?.uom || "" }}
                  </div>
                </div>
              </div>
              <div v-if="doc.showAllItems">
                <div class="order-product" v-for="item in doc.items.slice(1)" :key="item.name">
                  <div>
                    <div class="product-name">{{ item.item_code }}</div>
                    <div class="product-meta">
                      Qty: {{ item.qty }} {{ item.uom }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="more-items" v-if="doc.items.length > 1" @click="toggleItems(doc)">
                {{ doc.showAllItems ? 'Hide items' : '+' + (doc.items.length - 1) + ' more items' }}
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
          <button class="btn ghost" @click="loadMoreOutward">Load More</button>
        </div>
      </div>
    </div>

    <!-- ================= ASSET VIEWS ================= -->
    <div v-if="pageMode === 'asset' && subMode === 'movement'" class="stockio-view-container">
      <div class="stockio-body">
        <div class="order-card" v-for="doc in assetMovementsVisible" :key="doc.name">
          <div class="order-left">
            <input type="checkbox" v-model="selectedAssetMovements" :value="doc.name" @change="syncSelectAllAssetMovements" />
            <div class="order-info">
              <div class="order-title">
                <strong>{{ doc.name }}</strong>
                <span class="badge paid">{{ doc.status }}</span>
              </div>
              <div class="order-meta">
                {{ formatDate(doc.transaction_date) }} · Purpose:
                <b>{{ doc.purpose }}</b><br>
                Ref: <b>{{ doc.custom_reference_name }}</b>
              </div>

              <!-- ITEMS (ASSETS) -->
              <div class="order-product" v-if="doc.items && doc.items.length > 0">
                <div>
                  <div class="product-name">{{ doc.items?.[0]?.asset || "" }}</div>
                  <div class="product-meta">
                    {{ doc.items?.[0]?.asset_name || "" }}
                  </div>
                </div>
              </div>
              <div v-if="doc.showAllItems">
                <div class="order-product" v-for="item in doc.items.slice(1)" :key="item.name">
                  <div>
                    <div class="product-name">{{ item.asset }}</div>
                    <div class="product-meta">
                      {{ item.asset_name }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="more-items" v-if="doc.items.length > 1" @click="toggleItems(doc)">
                {{ doc.showAllItems ? 'Hide items' : '+' + (doc.items.length - 1) + ' more items' }}
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
          <button class="btn ghost" @click="loadMoreAssetMovements">Load More</button>
        </div>
      </div>
    </div>

    <div v-if="pageMode === 'asset' && subMode === 'item'" class="stockio-view-container">
      <div class="stockio-body">
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
          <button class="btn ghost" @click="loadMoreAssets">Load More</button>
        </div>
      </div>
    </div>

    <!-- ================= ITEMS VIEW ================= -->
    <div v-if="pageMode === 'item'" class="stockio-view-container">
      <div class="stockio-body">
        <div class="order-card" v-for="doc in itemsVisible" :key="doc.name">
          <div class="order-left">
            <div class="order-info">
              <div class="order-title">
                <strong>{{ doc.item_name }}</strong>
                <span class="badge grey">{{ doc.item_group }}</span>
              </div>
              <div class="order-meta">
                Code: <b>{{ doc.item_code }}</b> · UOM: <b>{{ doc.stock_uom }}</b>
              </div>
            </div>
          </div>
          <div class="order-right">
            <button class="btn ghost" @click="frappe.set_route('Form', 'Item', doc.name)">
              View
            </button>
          </div>
        </div>
        <div v-if="canLoadMoreItems" style="text-align:center;margin:16px">
          <button class="btn ghost" @click="loadMoreItems">Load More</button>
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

      itemsList: [],
      itemsVisible: [],
      itemsOffset: 0,
      itemsPageSize: 10,

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
        submitted: 0,
        other: 0,
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
        if (this.pageMode === "item") return "Items";
        return "StockIO";
      },

      get activeList() {
        if (this.pageMode === "stock" && this.subMode === "inward")
          return this.inward;
        if (this.pageMode === "stock" && this.subMode === "outward")
          return this.outward;
        if (this.pageMode === "asset" && this.subMode === "movement")
          return this.assetMovements;
        if (this.pageMode === "asset" && this.subMode === "item")
          return this.assets;
        if (this.pageMode === "item") return this.itemsList;
        return this.requests;
      },

      get hasSelection() {
        return this.selectedDocs.length > 0;
      },
      get selectionStatus() {
        if (this.selectedDocs.length === 0) return null;
        const selectedStatuses = this.requests
          .filter((d) => this.selectedDocs.includes(d.name))
          .map((d) => d.status);
        const uniqueStatuses = [...new Set(selectedStatuses)];
        return uniqueStatuses.length === 1 ? uniqueStatuses[0] : "mixed";
      },
      get selectionCategories() {
        if (!this.selectedDocs || this.selectedDocs.length === 0) return [];
        const cats = new Set();

        if (!this.requests || !Array.isArray(this.requests)) return [];

        const selectedDocsList = this.requests.filter((d) =>
          this.selectedDocs.includes(d.name),
        );

        selectedDocsList.forEach((d) => {
          if (d && d.items && Array.isArray(d.items)) {
            d.items.forEach((i) => {
              if (i && i.item_category) {
                cats.add(String(i.item_category));
              }
            });
          }
        });

        const result = Array.from(cats);
        return result;
      },
      get canActionSelection() {
        if (!this.selectedDocs.length) return false;

        if (
          frappe.session.user === "Administrator" ||
          frappe.user.has_role("Store Manager")
        ) {
          return true;
        }

        const selectedDocsData = this.requests.filter((d) =>
          this.selectedDocs.includes(d.name),
        );

        if (this.selectionStatus === "Pending Reporting Person") {
          return selectedDocsData.every(
            (d) => d.reporting_person === frappe.session.user,
          );
        }

        if (this.selectionStatus === "Pending HO Approval") {
          return (
            selectedDocsData.every(
              (d) => d.head_office_officer === frappe.session.user,
            ) || frappe.user.has_role("Head Office Officer")
          );
        }

        return false;
      },
      get canBulkApprove() {
        return this.selectionStatus && this.selectionStatus !== "mixed";
      },
      get hasInwardSelection() {
        return this.selectedInward.length > 0;
      },
      get canBulkPostInward() {
        if (this.selectedInward.length === 0) return false;
        const statuses = this.inward
          .filter((d) => this.selectedInward.includes(d.name))
          .map((d) => d.status);
        return [...new Set(statuses)].length === 1;
      },
      get hasOutwardSelection() {
        return this.selectedOutward.length > 0;
      },
      get canBulkSubmitOutward() {
        if (this.selectedOutward.length === 0) return false;
        const statuses = this.outward
          .filter((d) => this.selectedOutward.includes(d.name))
          .map((d) => d.status);
        return [...new Set(statuses)].length === 1;
      },
      get hasAssetSelection() {
        return this.selectedAssets.length > 0;
      },
      get canBulkTransferAsset() {
        if (this.selectedAssets.length === 0) return false;
        const statuses = this.assets
          .filter((d) => this.selectedAssets.includes(d.name))
          .map((d) => d.status);
        return [...new Set(statuses)].length === 1;
      },
      get hasAssetMovementSelection() {
        return this.selectedAssetMovements.length > 0;
      },
      get canBulkSubmitAssetMovement() {
        if (this.selectedAssetMovements.length === 0) return false;
        const statuses = this.assetMovements
          .filter((d) => this.selectedAssetMovements.includes(d.name))
          .map((d) => d.status);
        return [...new Set(statuses)].length === 1;
      },

      get canLoadMore() {
        return this.visibleRequests.length < this.getFilteredList().length;
      },
      get canLoadMoreInward() {
        return this.inwardVisible.length < this.getFilteredList().length;
      },
      get canLoadMoreOutward() {
        return this.outwardVisible.length < this.getFilteredList().length;
      },
      get canLoadMoreAssets() {
        return this.assetsVisible.length < this.getFilteredList().length;
      },
      get canLoadMoreAssetMovements() {
        return (
          this.assetMovementsVisible.length < this.getFilteredList().length
        );
      },
      get canLoadMoreItems() {
        return this.itemsVisible.length < this.getFilteredList().length;
      },

      // ===== METHODS =====
      setMode(mode, sub = null) {
        if (mode === "stock" && !["inward", "outward"].includes(sub)) {
          sub =
            this.subMode && ["inward", "outward"].includes(this.subMode)
              ? this.subMode
              : "inward";
        }
        if (mode === "asset" && !["item", "movement"].includes(sub)) {
          sub =
            this.subMode && ["item", "movement"].includes(this.subMode)
              ? this.subMode
              : "item";
        }

        this.pageMode = mode;
        this.subMode = sub;
        localStorage.setItem("stockio_page_mode", mode);
        localStorage.setItem("stockio_sub_mode", sub || "");

        if (mode === "stock") this.stockOpen = true;
        if (mode === "asset") this.assetOpen = true;

        this.searchText = "";
        this.activeTab = "all";
        this.computeCounts();

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
        } else if (mode === "item") {
          if (!this.itemsList.length) this.loadItemsList();
          else {
            this.itemsOffset = 0;
            this.itemsVisible = [];
            this.loadMoreItems();
          }
        }
      },

      toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
      },
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
      setTab(tab) {
        this.activeTab = tab;
        this.performSearch();
      },

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
        this.itemsOffset = 0;
        this.itemsVisible = [];

        if (this.pageMode === "requests") this.loadMore();
        else if (this.pageMode === "stock" && this.subMode === "inward")
          this.loadMoreInward();
        else if (this.pageMode === "stock" && this.subMode === "outward")
          this.loadMoreOutward();
        else if (this.pageMode === "asset" && this.subMode === "item")
          this.loadMoreAssets();
        else if (this.pageMode === "asset" && this.subMode === "movement")
          this.loadMoreAssetMovements();
        else if (this.pageMode === "item") this.loadMoreItems();
      },

      getFilteredList() {
        const q = this.searchText.toLowerCase();

        if (this.pageMode === "requests") {
          const today = frappe.datetime.get_today();
          let list = this.requests;
          if (this.activeTab === "today")
            list = list.filter((d) => d.creation?.split(" ")[0] === today);
          else if (this.activeTab === "draft")
            list = list.filter((d) => d.status === "Draft");
          else if (this.activeTab === "pending")
            list = list.filter((d) =>
              [
                "Pending HO Approval",
                "Pending Reporting Person",
                "To Receive",
              ].includes(d.status),
            );
          else if (this.activeTab === "approved")
            list = list.filter((d) =>
              ["Approved", "Submitted"].includes(d.status),
            );
          else if (this.activeTab === "cancelled")
            list = list.filter((d) => d.status === "Cancelled");

          if (q) {
            list = list.filter(
              (d) =>
                d.name?.toLowerCase().includes(q) ||
                d.owner?.toLowerCase().includes(q) ||
                d.status?.toLowerCase().includes(q) ||
                d.items?.some((i) => i.item_code?.toLowerCase().includes(q)),
            );
          }
          return list;
        }

        if (this.pageMode === "stock" || this.pageMode === "asset") {
          let list = this.activeList;
          if (this.activeTab === "draft")
            list = list.filter((d) => d.status === "Draft");
          else if (this.activeTab === "submitted")
            list = list.filter((d) => d.status === "Submitted");
          else if (this.activeTab === "other")
            list = list.filter(
              (d) => d.status !== "Draft" && d.status !== "Submitted",
            );

          if (q) {
            list = list.filter(
              (d) =>
                d.name?.toLowerCase().includes(q) ||
                d.supplier?.toLowerCase().includes(q) ||
                d.asset_name?.toLowerCase().includes(q) ||
                d.custom_reference_name?.toLowerCase().includes(q) ||
                d.purpose?.toLowerCase().includes(q) ||
                d.status?.toLowerCase().includes(q) ||
                d.items?.some((i) =>
                  (i.item_code || i.asset || i.asset_name)
                    ?.toLowerCase()
                    .includes(q),
                ),
            );
          }
          return list;
        }

        if (this.pageMode === "item") {
          let list = this.itemsList;
          if (q) {
            list = list.filter(
              (d) =>
                d.item_code?.toLowerCase().includes(q) ||
                d.item_name?.toLowerCase().includes(q) ||
                d.item_group?.toLowerCase().includes(q),
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
        const next = source.slice(
          this.inwardOffset,
          this.inwardOffset + this.inwardPageSize,
        );
        this.inwardVisible.push(...next);
        this.inwardOffset += this.inwardPageSize;
      },

      loadMoreOutward() {
        const source = this.getFilteredList();
        const next = source.slice(
          this.outwardOffset,
          this.outwardOffset + this.outwardPageSize,
        );
        this.outwardVisible.push(...next);
        this.outwardOffset += this.outwardPageSize;
      },

      loadMoreAssets() {
        const source = this.getFilteredList();
        const next = source.slice(
          this.assetsOffset,
          this.assetsOffset + this.assetsPageSize,
        );
        this.assetsVisible.push(...next);
        this.assetsOffset += this.assetsPageSize;
      },

      loadMoreAssetMovements() {
        const source = this.getFilteredList();
        const next = source.slice(
          this.assetMovementsOffset,
          this.assetMovementsOffset + this.assetMovementsPageSize,
        );
        this.assetMovementsVisible.push(...next);
        this.assetMovementsOffset += this.assetMovementsPageSize;
      },

      loadMoreItems() {
        const source = this.getFilteredList();
        const next = source.slice(
          this.itemsOffset,
          this.itemsOffset + this.itemsPageSize,
        );
        this.itemsVisible.push(...next);
        this.itemsOffset += this.itemsPageSize;
      },

      // COUNTS
      computeCounts() {
        if (this.pageMode === "requests") {
          const today = frappe.datetime.get_today();
          this.counts = {
            all: this.requests.length,
            today: 0,
            draft: 0,
            pending: 0,
            approved: 0,
            cancelled: 0,
            submitted: 0,
            other: 0,
          };
          this.requests.forEach((doc) => {
            const docDate = doc.creation?.split(" ")[0];
            if (docDate === today) this.counts.today++;

            const status = (doc.status || "").trim();

            if (status === "Draft") this.counts.draft++;
            else if (
              [
                "Pending HO Approval",
                "Pending Reporting Person",
                "To Receive",
              ].includes(status)
            )
              this.counts.pending++;
            else if (["Approved", "Submitted", "Completed"].includes(status))
              this.counts.approved++;
            else if (status === "Cancelled") this.counts.cancelled++;
          });
        } else if (this.pageMode === "item") {
          this.counts = { all: this.itemsList.length };
        } else {
          const list = this.activeList;
          this.counts = {
            all: list.length,
            today: 0,
            draft: 0,
            pending: 0,
            approved: 0,
            cancelled: 0,
            submitted: 0,
            other: 0,
          };
          list.forEach((doc) => {
            if (doc.status === "Draft") this.counts.draft++;
            else if (doc.status === "Submitted") this.counts.submitted++;
            else this.counts.other++;
          });
        }
      },

      // REQUESTS
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
              "reporting_person",
              "head_office_officer",
              "reporting_person_status",
              "ho_officer_status",
            ],
            order_by: "creation desc",
            limit_page_length: 1000,
          },
          callback: (r) => {
            if (!r.message) return;
            this.requests = r.message.map((d) => ({
              ...d,
              items: [],
              showAllItems: false,
            }));
            this.computeCounts();
            this.offset = 0;
            this.visibleRequests = [];
            this.loadMore();
            // Removed automatic items loading
          },
        });
      },
      loadItems(doc, callback) {
        frappe.call({
          method: "frappe.client.get",
          args: { doctype: "Employee Material Request", name: doc.name },
          callback: (r) => {
            if (r.message) {
              doc.items = r.message.items || [];
              if (callback) callback();
            }
          },
        });
      },

      // INWARD
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
            this.inward = r.message.map((d) => {
              let status = d.status === "Completed" ? "Submitted" : d.status;
              return { ...d, status, items: [], showAllItems: false };
            });
            this.computeCounts();
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
          args: { doctype: "Purchase Receipt", name: doc.name },
          callback: (r) => {
            if (r.message) doc.items = r.message.items || [];
          },
        });
      },

      // OUTWARD
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
              let status =
                d.docstatus === 0
                  ? "Draft"
                  : d.docstatus === 1
                    ? "Submitted"
                    : "Cancelled";
              return { ...d, status, items: [], showAllItems: false };
            });
            this.computeCounts();
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
          args: { doctype: "Stock Entry", name: doc.name },
          callback: (r) => {
            if (r.message) doc.items = r.message.items || [];
          },
        });
      },

      // ASSETS
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
              let status =
                d.docstatus === 0
                  ? "Draft"
                  : d.docstatus === 1
                    ? "Submitted"
                    : "Cancelled";
              return { ...d, status, items: [], showAllItems: false };
            });
            this.computeCounts();
            this.assetsOffset = 0;
            this.assetsVisible = [];
            this.loadMoreAssets();
          },
        });
      },

      // ASSET MOVEMENTS
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
              let status =
                d.docstatus === 0
                  ? "Draft"
                  : d.docstatus === 1
                    ? "Submitted"
                    : "Cancelled";
              return { ...d, status, items: [], showAllItems: false };
            });
            this.computeCounts();
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
          args: { doctype: "Asset Movement", name: doc.name },
          callback: (r) => {
            if (r.message) doc.items = r.message.assets || [];
          },
        });
      },

      // ITEMS LIST
      loadItemsList() {
        frappe.call({
          method: "frappe.client.get_list",
          args: {
            doctype: "Item",
            fields: ["name", "item_code", "item_name", "item_group", "stock_uom"],
            order_by: "item_name asc",
            limit_page_length: 1000,
          },
          callback: (r) => {
            if (!r.message) return;
            this.itemsList = r.message;
            this.computeCounts();
            this.itemsOffset = 0;
            this.itemsVisible = [];
            this.loadMoreItems();
          },
        });
      },

      // HELPERS
      formatDate(date) {
        return frappe.datetime.str_to_user(date);
      },
      toggleItems(doc) {
        if (!doc.showAllItems && (!doc.items || doc.items.length === 0)) {
          this.loadItems(doc, () => {
            doc.showAllItems = true;
          });
        } else {
          doc.showAllItems = !doc.showAllItems;
        }
      },
      createRequest() {
        if (this.pageMode === "item") {
          const dialog = new frappe.ui.Dialog({
            title: __("Create New Item"),
            fields: [
              {
                label: "Item Code",
                fieldname: "item_code",
                fieldtype: "Data",
                reqd: 1,
              },
              {
                label: "Item Name",
                fieldname: "item_name",
                fieldtype: "Data",
                reqd: 1,
              },
              {
                label: "Default Unit of Measure",
                fieldname: "stock_uom",
                fieldtype: "Link",
                options: "UOM",
                reqd: 1,
              },
              {
                label: "Item Department",
                fieldname: "custom_item_department",
                fieldtype: "Link",
                options: "Item Department",
                reqd: 1,
              },
              {
                label: "Item Group",
                fieldname: "item_group",
                fieldtype: "Link",
                options: "Item Group",
                reqd: 1,
              },
              {
                label: "HSN/SAC",
                fieldname: "gst_hsn_code",
                fieldtype: "Link",
                options: "GST HSN Code",
              },
              {
                label: "Is Stock Item",
                fieldname: "is_stock_item",
                fieldtype: "Check",
                default: 1,
              },
              {
                label: "Opening Stock",
                fieldname: "opening_stock",
                fieldtype: "Float",
                depends_on: "eval:doc.is_stock_item == 1",
              },
              {
                label: "Valuation Rate",
                fieldname: "valuation_rate",
                fieldtype: "Currency",
                depends_on: "eval:doc.is_stock_item == 1",
              },
              {
                label: "Standard Rate",
                fieldname: "standard_rate",
                fieldtype: "Currency",
                depends_on: "eval:doc.is_stock_item == 1",
              },
              {
                label: "Is Fixed Asset",
                fieldname: "is_fixed_asset",
                fieldtype: "Check",
                default: 0,
              },
              {
                label: "Asset Category",
                fieldname: "asset_category",
                fieldtype: "Link",
                options: "Asset Category",
                depends_on: "eval:doc.is_fixed_asset == 1",
              },
            ],
            primary_action_label: __("Create"),
            primary_action: (values) => {
              frappe.call({
                method: "frappe.client.insert",
                args: {
                  doc: {
                    doctype: "Item",
                    ...values,
                  },
                },
                callback: (r) => {
                  if (!r.exc) {
                    frappe.show_alert({
                      message: __("Item {0} created", [r.message.name || r.message.item_code]),
                      indicator: "green",
                    });
                    dialog.hide();
                    this.loadItemsList(); // Refresh the list
                    frappe.set_route("Form", "Item", r.message.name);
                  }
                },
              });
            },
          });

          if (dialog.fields_dict.gst_hsn_code) {
            dialog.fields_dict.gst_hsn_code.get_query = () => {
              return {
                filters: {},
              };
            };
          }

          dialog.show();
          return;
        }
        if (this.pageMode === "stock") {
          if (this.subMode === "inward")
            return frappe.set_route(
              "Form",
              "Purchase Receipt",
              "new-purchase-receipt-1",
            );
          if (this.subMode === "outward")
            return frappe.set_route("Form", "Stock Entry", "new-stock-entry-1");
        }
        if (this.pageMode === "asset") {
          if (this.subMode === "item")
            return frappe.set_route("Form", "Asset", "new-asset-1");
          if (this.subMode === "movement")
            return frappe.set_route(
              "Form",
              "Asset Movement",
              "new-asset-movement-1",
            );
        }
        frappe.set_route(
          "Form",
          "Employee Material Request",
          "new-employee-material-request",
        );
      },
      openRequest(name) {
        frappe.set_route("Form", "Employee Material Request", name);
      },
      openPurchaseReceipt(name) {
        frappe.set_route("Form", "Purchase Receipt", name);
      },
      openStockEntry(name) {
        frappe.set_route("Form", "Stock Entry", name);
      },
      openAsset(name) {
        frappe.set_route("Form", "Asset", name);
      },
      openAssetMovement(name) {
        frappe.set_route("Form", "Asset Movement", name);
      },
      openReports() {
        this.pageMode = "reports";
      },
      openRequests() {
        this.pageMode = "requests";
      },
      openReport(route) {
        this.setMode("reports");
        frappe.set_route(route);
      },

      handleBulkAction(action) {
        if (!this.selectedDocs.length) return;

        const actionLabel = action;

        const executeWithRemark = (remark = "") => {
          if (action === "Submit") {
            frappe.call({
              method:
                "sahayog.procurement.page.stockio.stockio.bulk_submit_requests",
              args: { docnames: this.selectedDocs },
              freeze: true,
              callback: (r) => {
                const { completed, errors } = r.message;
                if (errors && errors.length) {
                  frappe.msgprint({
                    title: "Bulk Submission Completed with Errors",
                    indicator: "orange",
                    message: `Successfully submitted ${completed} requests. ${errors.length} failed.`,
                  });
                } else {
                  frappe.show_alert({
                    message: `Successfully submitted ${completed} requests`,
                    indicator: "green",
                  });
                }
                this.selectedDocs = [];
                this.selectAll = false;
                this.loadRequests();
              },
            });
          } else {
            frappe.show_progress(
              `${actionLabel}ing Requests`,
              0,
              this.selectedDocs.length,
            );
            let completed = 0;
            let errors = [];

            const processNext = (index) => {
              if (index >= this.selectedDocs.length) {
                frappe.hide_progress();
                if (errors.length) {
                  frappe.msgprint({
                    title: "Bulk Action Completed with Errors",
                    indicator: "orange",
                    message: `Successfully processed ${completed} requests. ${errors.length} failed.`,
                  });
                } else {
                  frappe.show_alert({
                    message: `Successfully ${actionLabel}ed ${completed} requests`,
                    indicator: "green",
                  });
                }
                this.selectedDocs = [];
                this.selectAll = false;
                this.loadRequests();
                return;
              }

              const docname = this.selectedDocs[index];

              if (action === "Self Approve") {
                frappe.call({
                  method:
                    "sahayog.procurement.doctype.employee_material_request.employee_material_request.self_approve_request",
                  args: { docname: docname },
                  callback: (r) => {
                    if (r.message && r.message.success) completed++;
                    else errors.push(docname);
                    frappe.show_progress(
                      `${actionLabel}ing Requests`,
                      index + 1,
                      this.selectedDocs.length,
                    );
                    processNext(index + 1);
                  },
                  error: () => {
                    errors.push(docname);
                    frappe.show_progress(
                      `${actionLabel}ing Requests`,
                      index + 1,
                      this.selectedDocs.length,
                    );
                    processNext(index + 1);
                  },
                });
              } else {
                frappe.call({
                  method:
                    "sahayog.procurement.doctype.employee_material_request.employee_material_request.workflow_action_update_status",
                  args: { docname: docname, action: action, remark: remark },
                  callback: (r) => {
                    completed++;
                    frappe.show_progress(
                      `${actionLabel}ing Requests`,
                      index + 1,
                      this.selectedDocs.length,
                    );
                    processNext(index + 1);
                  },
                  error: () => {
                    errors.push(docname);
                    frappe.show_progress(
                      `${actionLabel}ing Requests`,
                      index + 1,
                      this.selectedDocs.length,
                    );
                    processNext(index + 1);
                  },
                });
              }
            };
            processNext(0);
          }
        };

        if (["Approve", "Reject", "Self Approve"].includes(action)) {
          const dialog = frappe.prompt(
            [
              {
                label: "Remark",
                fieldname: "remark",
                fieldtype: "Small Text",
                reqd: 1,
                description: `Enter reason for bulk ${action.toLowerCase()}ing`,
              },
            ],
            (values) => {
              executeWithRemark(values.remark);
            },
            `Enter Remark for Bulk ${action}`,
            "Submit",
          );

          if (dialog && dialog.fields_dict.remark) {
            const $input = $(dialog.fields_dict.remark.input);
            $input.attr("data-gramm", "false");
            $input.attr("data-gramm_editor", "false");
            $input.attr("spellcheck", "false");
          }
        } else {
          frappe.confirm(
            `Are you sure you want to bulk ${actionLabel} ${this.selectedDocs.length} requests?`,
            () => {
              executeWithRemark();
            },
          );
        }
      },

      toggleSelectAll() {
        this.selectedDocs = this.selectAll
          ? this.requests.map((d) => d.name)
          : [];
      },
      syncSelectAll() {
        this.selectAll = this.selectedDocs.length === this.requests.length;
      },
      toggleSelectAllInward() {
        this.selectedInward = this.selectAllInward
          ? this.inward.map((d) => d.name)
          : [];
      },
      syncSelectAllInward() {
        this.selectAllInward =
          this.selectedInward.length === this.inward.length;
      },
      toggleSelectAllOutward() {
        this.selectedOutward = this.selectAllOutward
          ? this.outward.map((d) => d.name)
          : [];
      },
      syncSelectAllOutward() {
        this.selectAllOutward =
          this.selectedOutward.length === this.outward.length;
      },
      toggleSelectAllAssets() {
        this.selectedAssets = this.selectAllAssets
          ? this.assets.map((d) => d.name)
          : [];
      },
      syncSelectAllAssets() {
        this.selectAllAssets =
          this.selectedAssets.length === this.assets.length;
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

      handleInwardAction() {
        if (!this.selectedDocs.length) return;
        const docname = this.selectedDocs[0];
        
        frappe.dom.freeze("Loading Request Data...");

        frappe.call({
          method: "frappe.client.get",
          args: { doctype: "Employee Material Request", name: docname },
          callback: (r) => {
            frappe.dom.unfreeze();
            const doc = r.message;
            if (!doc) return;

            const stock_items = (doc.items || []).filter(i => i.item_category === "Stock Item");
            if (!stock_items.length) {
              frappe.msgprint("No stock items found in this request.");
              return;
            }

            const fields = [
              {
                fieldtype: "Link",
                fieldname: "supplier",
                label: "Supplier",
                options: "Supplier",
                reqd: 1,
              },
              {
                fieldtype: "Link",
                fieldname: "target_warehouse",
                label: "Target Warehouse",
                options: "Warehouse",
                reqd: 1,
                get_query: () => ({
                  filters: { custom_warehouse_category: ["like", "Store%"] },
                }),
              },
              { fieldtype: "Section Break" }
            ];

            stock_items.forEach((item) => {
              fields.push({
                fieldtype: "Float",
                fieldname: `qty_${item.name}`,
                label: `Qty for ${item.item_code}`,
                reqd: 1,
                default: item.quantity,
              });
            });

            frappe.prompt(
              fields,
              (values) => {
                const pr_doc = {
                  doctype: "Purchase Receipt",
                  supplier: values.supplier,
                  posting_date: frappe.datetime.nowdate(),
                  posting_time: frappe.datetime.now_time(),
                  items: stock_items.map((item) => ({
                    item_code: item.item_code,
                    item_name: item.item_name,
                    description: item.description || item.item_code,
                    qty: values[`qty_${item.name}`],
                    stock_uom: item.stock_uom || "Nos",
                    warehouse: values.target_warehouse,
                    rate: 0,
                    amount: 0,
                  })),
                };

                frappe.call({
                  method: "frappe.client.insert",
                  args: { doc: pr_doc },
                  callback: (r2) => {
                    if (!r2.exc && r2.message) {
                      const pr_name = r2.message.name;
                      frappe.msgprint({
                        title: "Purchase Receipt Created!",
                        message: `PR <b>${pr_name}</b> saved successfully!<br><br>
                          <button class="btn btn-primary btn-sm" onclick="window.submit_pr('${pr_name}')">
                            <i class="fa fa-check"></i> Submit Now
                          </button>`,
                        indicator: "green",
                        wide: true,
                      });
                      this.selectedDocs = [];
                      this.selectAll = false;
                      this.loadRequests();
                    }
                  },
                });
              },
              "Enter Details for Inward",
              "Create"
            );
          }
        });
      },

      handleOutwardAction() {
        if (!this.selectedDocs.length) return;
        const docname = this.selectedDocs[0];

        frappe.dom.freeze("Loading Request Data...");

        frappe.call({
          method: "frappe.client.get",
          args: { doctype: "Employee Material Request", name: docname },
          callback: (r) => {
            frappe.dom.unfreeze();
            const doc = r.message;
            if (!doc) return;

            const stock_items = (doc.items || []).filter(i => i.item_category === "Stock Item");
            if (!stock_items.length) {
              frappe.msgprint("No stock items found in this request.");
              return;
            }

            const fields = [];
            stock_items.forEach((item) => {
              fields.push({
                fieldtype: "Float",
                fieldname: `qty_${item.name}`,
                label: `Qty for ${item.item_code}`,
                reqd: 1,
                default: item.quantity,
              });
            });

            frappe.prompt(
              fields,
              (values) => {
                const purpose = doc.target_warehouse ? "Material Transfer" : "Material Issue";
                
                const se_doc = {
                  doctype: "Stock Entry",
                  stock_entry_type: purpose,
                  company: doc.company || frappe.defaults.get_user_default("company"),
                  custom_material_request: doc.name,
                  custom_material_request_doctype: "Employee Material Request",
                  from_warehouse: doc.source_warehouse,
                  to_warehouse: doc.target_warehouse,
                  items: stock_items.map((item) => ({
                    item_code: item.item_code,
                    qty: values[`qty_${item.name}`],
                    uom: item.stock_uom || "Nos",
                    stock_uom: item.stock_uom || "Nos",
                    conversion_factor: 1,
                    transfer_qty: values[`qty_${item.name}`],
                    s_warehouse: doc.source_warehouse,
                    t_warehouse: purpose === "Material Transfer" ? doc.target_warehouse : "",
                  })),
                };

                frappe.call({
                  method: "frappe.client.insert",
                  args: { doc: se_doc },
                  callback: (r2) => {
                    if (!r2.exc && r2.message) {
                      const se_name = r2.message.name;
                      frappe.msgprint({
                        title: "Stock Entry Created!",
                        message: `Stock Entry <b>${se_name}</b> saved successfully!<br><br>
                          <button class="btn btn-primary btn-sm" onclick="window.submit_se('${se_name}')">
                            <i class="fa fa-check"></i> Submit Now
                          </button>`,
                        indicator: "green",
                        wide: true,
                      });
                      this.selectedDocs = [];
                      this.selectAll = false;
                      this.loadRequests();
                    }
                  },
                });
              },
              "Enter Quantities for Outward",
              "Create"
            );
          }
        });
      },

      async handleAssetMovementAction() {
        if (!this.selectedDocs.length) return;
        const docname = this.selectedDocs[0];
        frappe.dom.freeze("Loading Asset Data...");

        try {
          const res_doc = await frappe.call({
            method: "frappe.client.get",
            args: { doctype: "Employee Material Request", name: docname },
          });

          const doc = res_doc.message;
          if (!doc) {
            frappe.dom.unfreeze();
            return;
          }

          let asset_list = {};
          const res_assets = await frappe.call({
            method:
              "sahayog.procurement.api.stock_balance_ledger.get_asset_combine_data",
            args: {},
          });

          if (res_assets.message?.assets) {
            res_assets.message.assets.forEach((a) => {
              if (!asset_list[a.item_code]) asset_list[a.item_code] = [];
              asset_list[a.item_code].push({
                asset: a.name,
                asset_name: a.asset_name,
                location: a.location,
                custodian: a.custodian,
              });
            });
          }

          frappe.dom.unfreeze();

          let html = `
            <style>
              .emmr-table { font-size: 13px; border-collapse: collapse; width: 100%; }
              .emmr-table thead th { position: sticky; top: 0; background: #4a6fa5; border-bottom: 2px solid #e5e7eb; padding: 10px 8px; font-weight: 600; color: #ffffff; }
              .emmr-table tbody tr { border-bottom: 1px solid #e5e7eb; }
              .emmr-table tbody tr:hover { background: #f9fafb; }
              .emmr-table td { padding: 10px 8px; vertical-align: middle; }
              .emmr-asset-code { font-weight: 500; }
              .emmr-muted { font-size: 12px; color: #6b7280; margin-top: 2px; }
              .emmr-checkbox { cursor: pointer; }
            </style>

            <table class="table emmr-table">
              <thead>
                <tr>
                  <th style="width:50px">#</th>
                  <th style="width:60px">Select</th>
                  <th>Item</th>
                  <th>Asset</th>
                  <th style="width:280px">Employee</th>
                </tr>
              </thead>
              <tbody>
          `;

          let sr = 1;
          let has_assets = false;

          (doc.items || []).forEach((row) => {
            if (row.item_category !== "Asset") return;
            has_assets = true;
            let assets = asset_list[row.item_code] || [];
            for (let i = 0; i < row.quantity; i++) {
              let a = assets[i];
              if (!a) continue;
              html += `
                <tr>
                  <td>${sr++}</td>
                  <td>
                    <input type="checkbox" class="emmr-checkbox emmr-asset"
                      data-asset="${a.asset}"
                      data-location="${a.location || ""}"
                      data-custodian="${a.custodian || ""}">
                  </td>
                  <td>
                    <div class="emmr-asset-code">${row.item_code}</div>
                    <div class="emmr-muted">${row.description || ""}</div>
                  </td>
                  <td>
                    <div class="emmr-asset-code">${a.asset}</div>
                    <div class="emmr-muted">${a.asset_name}</div>
                  </td>
                  <td>
                    <div class="emmr-employee-link"></div>
                  </td>
                </tr>
              `;
            }
          });

          if (!has_assets) {
            frappe.msgprint("No asset items found in this request.");
            return;
          }

          html += "</tbody></table>";
          const row_controls = [];

          let d = new frappe.ui.Dialog({
            title: __("Select Assets & Employee - {0}", [docname]),
            size: "large",
            fields: [{ fieldname: "html", fieldtype: "HTML" }],
            primary_action_label: "Create Asset Movement",
            primary_action() {
              let selected = [];
              d.$wrapper.find("tbody tr").each(function (idx) {
                let checkbox = $(this).find(".emmr-asset");
                if (!checkbox.is(":checked")) return;
                let employee = row_controls[idx] ? row_controls[idx].get_value() : null;
                if (!employee) {
                  frappe.msgprint("Employee is mandatory for row " + (idx + 1));
                  selected = [];
                  return false;
                }
                selected.push({
                  asset: checkbox.data("asset"),
                  employee: employee,
                  location: checkbox.data("location"),
                  custodian: checkbox.data("custodian"),
                });
              });

              if (!selected.length) return;
              frappe.call({
                method: "sahayog.procurement.api.stock_balance_ledger.create_asset_movement_from_emmr",
                args: { emmr: docname, assets: selected },
                freeze: true,
                freeze_message: "Creating Asset Movement...",
                callback: (r) => {
                  if (r.message) {
                    frappe.set_route("Form", "Asset Movement", r.message);
                    d.hide();
                  }
                },
              });
            },
          });

          d.fields_dict.html.$wrapper.html(html);
          d.show();

          d.$wrapper.find("tbody tr").each(function (idx) {
            const row = this;
            const wrapper = $(row).find(".emmr-employee-link")[0];
            const control = frappe.ui.form.make_control({
              parent: wrapper,
              df: {
                fieldtype: "Link",
                fieldname: "employee",
                options: "Employee",
                placeholder: "Search Employee",
                reqd: 1,
                get_query() {
                  return {
                    filters: {
                      company: "Sahayog Multistate Credit Co-op Society Ltd",
                      status: "Active",
                    },
                  };
                },
              },
              render_input: true,
            });
            control.make();
            row_controls[idx] = control;
          });
        } catch (e) {
          frappe.dom.unfreeze();
          console.error(e);
          frappe.msgprint("An error occurred while loading asset data.");
        }
      },

      reports: [
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
        { label: "Branch Stock", route: "/app/query-report/Branch%20Stock" },
        { label: "My Assets", route: "/app/query-report/My%20Assets" },
      ],

      getProgressFlow(doc) {
        const status = doc.status;
        let step1 = {
          state: status === "Draft" ? "pending" : "done",
          label: status === "Draft" ? "Draft" : "Submitted",
        };

        let step2State = "disabled";
        let step2Label = "Reporting";
        if (status === "Pending Reporting Person") step2State = "pending";
        else if (["Pending HO Approval", "Approved", "Self Approved"].includes(status)) step2State = "done";
        else if (status === "Rejected") {
          if (doc.reporting_person_status === "Rejected") {
            step2State = "rejected";
            step2Label = "Rejected";
          } else step2State = "done";
        }
        let step2 = { visible: true, state: step2State, label: step2Label };

        let step3State = "disabled";
        let step3Label = "HO Approval";
        let step3Visible = status !== "Self Approved";
        if (status === "Pending HO Approval") step3State = "pending";
        else if (status === "Approved") step3State = "done";
        else if (status === "Cancelled") {
          step3State = "cancelled";
          step3Label = "Cancelled";
        } else if (status === "Rejected") {
          if (doc.ho_officer_status === "Rejected") {
            step3State = "rejected";
            step3Label = "Rejected";
          }
        } else if (status === "Self Approved") step3Visible = false;

        let step3 = { visible: step3Visible, state: step3State, label: step3Label };
        return { step1, step2, step3 };
      },
    };

    PetiteVue.createApp(app).mount(this.wrapper[0]);
    setTimeout(() => {
      app.setMode(app.pageMode, app.subMode);
    }, 100);
  }
}

window.submit_pr = function (pr_name) {
  // Hide the button to prevent multiple clicks
  $(event.target).hide();

  frappe.call({
    method: "frappe.client.get",
    args: { doctype: "Purchase Receipt", name: pr_name },
    callback: (r) => {
      if (!r.exc) {
        frappe.call({
          method: "frappe.client.submit",
          args: { doc: r.message },
          callback: (r2) => {
            if (!r2.exc) {
              if (cur_dialog) cur_dialog.hide();
              frappe.show_alert({
                message: `Purchase Receipt ${pr_name} submitted successfully`,
                indicator: "green",
              });
            }
          },
        });
      }
    },
  });
};

window.submit_se = function (se_name) {
  // Hide the button to prevent multiple clicks
  $(event.target).hide();

  frappe.call({
    method: "frappe.client.get",
    args: { doctype: "Stock Entry", name: se_name },
    callback: (r) => {
      if (!r.exc) {
        frappe.call({
          method: "frappe.client.submit",
          args: { doc: r.message },
          callback: (r2) => {
            if (!r2.exc) {
              if (cur_dialog) cur_dialog.hide();
              frappe.show_alert({
                message: `Stock Entry ${se_name} submitted successfully`,
                indicator: "green",
              });
            }
          },
        });
      }
    },
  });
};