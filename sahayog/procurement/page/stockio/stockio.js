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
      <div class="item-filter-wrapper" v-if="pageMode === 'item'">
        <select v-model="itemSort" 
                @change="loadItemsList()" 
                class="btn ghost item-sort-btn">
          <option value="creation desc">🕒 Latest</option>
          <option value="item_name asc">🔤 Name</option>
        </select>
      </div>
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

    <!-- ================= CUSTOM MODALS ================= -->
    <div class="stockio-modal-overlay" v-if="showCreateItemModal" @click.self="closeCreateItemModal">
      <div class="stockio-modal">
        <div class="modal-header">
          <h3>Create New Item</h3>
          <button class="close-btn" @click="closeCreateItemModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Item Code *</label>
              <input type="text" v-model="newItem.item_code" placeholder="Enter Item Code" />
            </div>
            <div class="form-group">
              <label>Item Name *</label>
              <input type="text" v-model="newItem.item_name" placeholder="Enter Item Name" />
            </div>
            <div class="form-group">
              <label>Default UOM *</label>
              <div class="searchable-select">
                <input type="text" 
                       v-model="search.uom" 
                       @focus="activeDropdown = 'uom'; $event.target.select()" 
                       @click="activeDropdown = 'uom'"
                       @blur="setTimeout(() => { if(activeDropdown === 'uom') activeDropdown = null }, 300)"
                       placeholder="Select UOM..." />
                <div class="dropdown-list" v-show="activeDropdown === 'uom'">
                  <div class="dropdown-item" 
                       v-for="u in masterData.uoms.filter(x => !search.uom || x.name.toLowerCase().includes(search.uom.toLowerCase()))" 
                       @click="newItem.stock_uom = u.name; search.uom = u.name; activeDropdown = null">
                    {{ u.name }}
                  </div>
                  <div class="no-result" v-if="masterData.uoms.filter(x => !search.uom || x.name.toLowerCase().includes(search.uom.toLowerCase())).length === 0">
                    No results
                  </div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>Item Department *</label>
              <div class="searchable-select">
                <input type="text" 
                       v-model="search.dept" 
                       @focus="activeDropdown = 'dept'; $event.target.select()" 
                       @click="activeDropdown = 'dept'"
                       @blur="setTimeout(() => { if(activeDropdown === 'dept') activeDropdown = null }, 300)"
                       placeholder="Select Department..." />
                <div class="dropdown-list" v-show="activeDropdown === 'dept'">
                  <div class="dropdown-item" 
                       v-for="d in masterData.departments.filter(x => !search.dept || x.name.toLowerCase().includes(search.dept.toLowerCase()))" 
                       @click="newItem.custom_item_department = d.name; search.dept = d.name; activeDropdown = null">
                    {{ d.name }}
                  </div>
                  <div class="no-result" v-if="masterData.departments.filter(x => !search.dept || x.name.toLowerCase().includes(search.dept.toLowerCase())).length === 0">
                    No results
                  </div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>Item Group *</label>
              <div class="searchable-select">
                <input type="text" 
                       v-model="search.group" 
                       @focus="activeDropdown = 'group'; $event.target.select()" 
                       @click="activeDropdown = 'group'"
                       @blur="setTimeout(() => { if(activeDropdown === 'group') activeDropdown = null }, 300)"
                       placeholder="Select Group..." />
                <div class="dropdown-list" v-show="activeDropdown === 'group'">
                  <div class="dropdown-item" 
                       v-for="g in masterData.item_groups.filter(x => !search.group || x.name.toLowerCase().includes(search.group.toLowerCase()))" 
                       @click="newItem.item_group = g.name; search.group = g.name; activeDropdown = null">
                    {{ g.name }}
                  </div>
                  <div class="no-result" v-if="masterData.item_groups.filter(x => !search.group || x.name.toLowerCase().includes(search.group.toLowerCase())).length === 0">
                    No results
                  </div>
                </div>
              </div>
                            <div class="form-group" v-if="newItem.is_fixed_asset">
              <label>Asset Category *</label>
              <div class="searchable-select">
                <input type="text" 
                       v-model="search.asset" 
                       @focus="activeDropdown = 'asset'; $event.target.select()" 
                       @click="activeDropdown = 'asset'"
                       @blur="setTimeout(() => { if(activeDropdown === 'asset') activeDropdown = null }, 300)"
                       placeholder="Select Asset Category..." />
                <div class="dropdown-list" v-show="activeDropdown === 'asset'">
                  <div class="dropdown-item" 
                       v-for="c in masterData.asset_categories.filter(x => !search.asset || x.name.toLowerCase().includes(search.asset.toLowerCase()))" 
                       @click="newItem.asset_category = c.name; search.asset = c.name; activeDropdown = null">
                    {{ c.name }}
                  </div>
                  <div class="no-result" v-if="masterData.asset_categories.filter(x => !search.asset || x.name.toLowerCase().includes(search.asset.toLowerCase())).length === 0">
                    No results
                  </div>
                </div>
              </div>
            </div>
            </div>
            <div class="form-group">
              <label>HSN/SAC</label>
              <div class="searchable-select">
                <input type="text" 
                       v-model="search.hsn" 
                       @focus="activeDropdown = 'hsn'; $event.target.select()" 
                       @click="activeDropdown = 'hsn'"
                       @blur="setTimeout(() => { if(activeDropdown === 'hsn') activeDropdown = null }, 300)"
                       placeholder="Select HSN Code..." />
                <div class="dropdown-list" v-show="activeDropdown === 'hsn'">
                  <div class="dropdown-item" 
                       v-for="h in masterData.hsn_codes.filter(x => !search.hsn || (x.name + ' ' + (x.description || '')).toLowerCase().includes(search.hsn.toLowerCase()))" 
                       @click="newItem.gst_hsn_code = h.name; search.hsn = h.name; activeDropdown = null">
                    {{ h.name }} - {{ h.description }}
                  </div>
                  <div class="no-result" v-if="masterData.hsn_codes.filter(x => !search.hsn || (x.name + ' ' + (x.description || '')).toLowerCase().includes(search.hsn.toLowerCase())).length === 0">
                    No results
                  </div>
                </div>
              </div>

            </div>
            <div class="form-group full-width checkbox-group">
              <label>
                <input type="checkbox" v-model="newItem.is_stock_item" @change="if(newItem.is_stock_item) newItem.is_fixed_asset = false" />
                Is Stock Item
              </label>
              <label>
                <input type="checkbox" v-model="newItem.is_fixed_asset" @change="if(newItem.is_fixed_asset) newItem.is_stock_item = false" />
                Is Fixed Asset
              </label>
            </div>
                          

          </div>
        </div>
        <div class="modal-footer">
          <button class="btn ghost" @click="closeCreateItemModal">Cancel</button>
          <button class="btn primary" @click="submitCreateItem" :disabled="isSubmitting">
            {{ isSubmitting ? 'Creating...' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

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
      itemSort: "creation desc",

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

      // MODALS & FORM STATE
      showCreateItemModal: false,
      isSubmitting: false,
      activeDropdown: null,
      search: {
        uom: "",
        dept: "",
        group: "",
        hsn: "",
        asset: "",
      },
      newItem: {
        item_code: "",
        item_name: "",
        stock_uom: "",
        custom_item_department: "",
        item_group: "",
        gst_hsn_code: "",
        is_stock_item: true,
        is_fixed_asset: false,
        asset_category: "",
      },
      masterData: {
        uoms: [],
        departments: [],
        item_groups: [],
        hsn_codes: [],
        asset_categories: [],
      },

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
            fields: [
              "name",
              "item_code",
              "item_name",
              "item_group",
              "stock_uom",
            ],
            order_by: this.itemSort,
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

      // CUSTOM ITEM MODAL METHODS
      fetchMasterData() {
        const doctypes = [
          "UOM",
          "Item Department",
          "Item Group",
          "GST HSN Code",
          "Asset Category",
        ];
        const field_map = {
          UOM: "uoms",
          "Item Department": "departments",
          "Item Group": "item_groups",
          "GST HSN Code": "hsn_codes",
          "Asset Category": "asset_categories",
        };

        doctypes.forEach((dt) => {
          frappe.call({
            method: "frappe.client.get_list",
            args: {
              doctype: dt,
              fields: ["name", dt === "GST HSN Code" ? "description" : "name"],
              limit_page_length: 5000,
              order_by: "name asc",
            },
            callback: (r) => {
              if (r.message) {
                this.masterData[field_map[dt]] = r.message;
              }
            },
          });
        });
      },

      closeCreateItemModal() {
        this.showCreateItemModal = false;
        this.activeDropdown = null;
        this.search = {
          uom: "",
          dept: "",
          group: "",
          hsn: "",
          asset: "",
        };
        // Reset form
        this.newItem = {
          item_code: "",
          item_name: "",
          stock_uom: "",
          custom_item_department: "",
          item_group: "",
          gst_hsn_code: "",
          is_stock_item: true,
          is_fixed_asset: false,
          asset_category: "",
        };
      },

      submitCreateItem() {
        // Validation
        const required = [
          "item_code",
          "item_name",
          "stock_uom",
          "custom_item_department",
          "item_group",
        ];
        if (this.newItem.is_fixed_asset) required.push("asset_category");

        for (let field of required) {
          if (!this.newItem[field]) {
            frappe.msgprint({
              message: __("Please fill all mandatory fields: {0}", [
                frappe.model.unhide_column(field),
              ]),
              indicator: "orange",
            });
            return;
          }
        }

        this.isSubmitting = true;
        frappe.call({
          method: "frappe.client.insert",
          args: {
            doc: {
              doctype: "Item",
              ...this.newItem,
            },
          },
          callback: (r) => {
            this.isSubmitting = false;
            if (!r.exc) {
              frappe.show_alert({
                message: __("Item {0} created", [
                  r.message.name || r.message.item_code,
                ]),
                indicator: "green",
              });
              this.closeCreateItemModal();
              this.loadItemsList();
              frappe.set_route("Form", "Item", r.message.name);
            }
          },
          error: () => {
            this.isSubmitting = false;
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
          this.fetchMasterData();
          this.showCreateItemModal = true;
          return;
        }
        if (this.pageMode === "stock") {
          if (this.subMode === "inward") {
            const dialog = new frappe.ui.Dialog({
              title: __("Create Purchase Receipt (Inward)"),
              fields: [
                {
                  label: "Supplier",
                  fieldname: "supplier",
                  fieldtype: "Link",
                  options: "Supplier",
                  reqd: 1,
                },
                {
                  label: "Set Warehouse",
                  fieldname: "set_warehouse",
                  fieldtype: "Link",
                  options: "Warehouse",
                  reqd: 1,
                },
                {
                  label: "Items",
                  fieldname: "items",
                  fieldtype: "Table",
                  fields: [
                    {
                      label: "Item Code",
                      fieldname: "item_code",
                      fieldtype: "Link",
                      options: "Item",
                      in_list_view: 1,
                      reqd: 1,
                      onchange: function () {
                        const row = this.grid_row;
                        if (this.value) {
                          frappe.db.get_value(
                            "Item",
                            this.value,
                            "stock_uom",
                            (r) => {
                              if (r && r.stock_uom) {
                                frappe.model.set_value(
                                  row.doc.doctype,
                                  row.doc.name,
                                  "uom",
                                  r.stock_uom,
                                );
                                frappe.model.set_value(
                                  row.doc.doctype,
                                  row.doc.name,
                                  "stock_uom",
                                  r.stock_uom,
                                );
                              }
                            },
                          );
                        }
                      },
                    },
                    {
                      label: "Quantity",
                      fieldname: "qty",
                      fieldtype: "Float",
                      in_list_view: 1,
                      reqd: 1,
                      default: 1,
                    },
                    {
                      label: "UOM",
                      fieldname: "uom",
                      fieldtype: "Data",
                      in_list_view: 1,
                      read_only: 1,
                    },
                  ],
                  reqd: 1,
                },
              ],
              primary_action_label: __("Create"),
              primary_action: (values) => {
                const doc = {
                  doctype: "Purchase Receipt",
                  supplier: values.supplier,
                  set_warehouse: values.set_warehouse,
                  posting_date: frappe.datetime.now_date(),
                  posting_time: frappe.datetime.now_time(),
                  items: values.items,
                };

                frappe.call({
                  method: "frappe.client.insert",
                  args: { doc: doc },
                  callback: (r) => {
                    if (!r.exc && r.message) {
                      const pr_name = r.message.name;
                      frappe.msgprint({
                        title: "Purchase Receipt Created!",
                        message: `PR <b>${pr_name}</b> saved successfully!<br><br>
                          <button class="btn btn-primary btn-sm" onclick="window.submit_pr('${pr_name}')">
                            <i class="fa fa-check"></i> Submit Now
                          </button>`,
                        indicator: "green",
                        wide: true,
                      });
                      dialog.hide();
                      this.loadInward();
                    }
                  },
                });
              },
            });

            // Fetch default warehouse
            frappe.call({
              method:
                "sahayog.procurement.api.stock_entry_report.get_user_warehouse",
              callback: (r) => {
                if (r.message && r.message.warehouse) {
                  dialog.set_value("set_warehouse", r.message.warehouse);
                }
              },
            });

            dialog.show();
            return;
          }
          if (this.subMode === "outward") {
            const dialog = new frappe.ui.Dialog({
              title: __("Create Stock Entry (Outward)"),
              fields: [
                {
                  label: "Stock Entry Type",
                  fieldname: "stock_entry_type",
                  fieldtype: "Select",
                  options: "Material Transfer\nMaterial Issue",
                  default: "Material Transfer",
                  reqd: 1,
                  onchange: function () {
                    const type = this.get_value();
                    dialog.set_df_property(
                      "to_warehouse",
                      "reqd",
                      type === "Material Transfer" ? 1 : 0,
                    );
                    dialog.set_df_property(
                      "to_warehouse",
                      "hidden",
                      type === "Material Transfer" ? 0 : 1,
                    );
                  },
                },
                {
                  label: "From Warehouse",
                  fieldname: "from_warehouse",
                  fieldtype: "Link",
                  options: "Warehouse",
                  reqd: 1,
                },
                {
                  label: "To Warehouse",
                  fieldname: "to_warehouse",
                  fieldtype: "Link",
                  options: "Warehouse",
                  reqd: 1,
                },
                {
                  label: "Items",
                  fieldname: "items",
                  fieldtype: "Table",
                  fields: [
                    {
                      label: "Item Code",
                      fieldname: "item_code",
                      fieldtype: "Link",
                      options: "Item",
                      in_list_view: 1,
                      reqd: 1,
                      onchange: function () {
                        const row = this.grid_row;
                        if (this.value) {
                          frappe.db.get_value(
                            "Item",
                            this.value,
                            "stock_uom",
                            (r) => {
                              if (r && r.stock_uom) {
                                frappe.model.set_value(
                                  row.doc.doctype,
                                  row.doc.name,
                                  "uom",
                                  r.stock_uom,
                                );
                                frappe.model.set_value(
                                  row.doc.doctype,
                                  row.doc.name,
                                  "stock_uom",
                                  r.stock_uom,
                                );
                                frappe.model.set_value(
                                  row.doc.doctype,
                                  row.doc.name,
                                  "conversion_factor",
                                  1,
                                );
                              }
                            },
                          );
                        }
                      },
                    },
                    {
                      label: "Quantity",
                      fieldname: "qty",
                      fieldtype: "Float",
                      in_list_view: 1,
                      reqd: 1,
                      default: 1,
                    },
                    {
                      label: "UOM",
                      fieldname: "uom",
                      fieldtype: "Data",
                      in_list_view: 1,
                      read_only: 1,
                    },
                  ],
                  reqd: 1,
                },
              ],
              primary_action_label: __("Create"),
              primary_action: (values) => {
                const doc = {
                  doctype: "Stock Entry",
                  stock_entry_type: values.stock_entry_type,
                  from_warehouse: values.from_warehouse,
                  to_warehouse:
                    values.stock_entry_type === "Material Transfer"
                      ? values.to_warehouse
                      : "",
                  posting_date: frappe.datetime.now_date(),
                  posting_time: frappe.datetime.now_time(),
                  items: values.items.map((item) => ({
                    ...item,
                    s_warehouse: values.from_warehouse,
                    t_warehouse:
                      values.stock_entry_type === "Material Transfer"
                        ? values.to_warehouse
                        : "",
                  })),
                };

                frappe.call({
                  method: "frappe.client.insert",
                  args: { doc: doc },
                  callback: (r) => {
                    if (!r.exc && r.message) {
                      const se_name = r.message.name;
                      frappe.msgprint({
                        title: "Stock Entry Created!",
                        message: `Stock Entry <b>${se_name}</b> saved successfully!<br><br>
                          <button class="btn btn-primary btn-sm" onclick="window.submit_se('${se_name}')">
                            <i class="fa fa-check"></i> Submit Now
                          </button>`,
                        indicator: "green",
                        wide: true,
                      });
                      dialog.hide();
                      this.loadOutward();
                    }
                  },
                });
              },
            });

            // Fetch default warehouse
            frappe.call({
              method:
                "sahayog.procurement.api.stock_entry_report.get_user_warehouse",
              callback: (r) => {
                if (r.message && r.message.warehouse) {
                  dialog.set_value("from_warehouse", r.message.warehouse);
                }
              },
            });

            dialog.show();
            return;
          }
        }
        if (this.pageMode === "asset") {
          if (this.subMode === "item") {
            const dialog = new frappe.ui.Dialog({
              title: __("Create New Asset"),
              fields: [
                {
                  label: "Item Code",
                  fieldname: "item_code",
                  fieldtype: "Link",
                  options: "Item",
                  get_query: () => ({
                    filters: { is_fixed_asset: 1 },
                  }),
                  reqd: 1,
                  onchange: function () {
                    if (this.value) {
                      frappe.db.get_value(
                        "Item",
                        this.value,
                        ["item_name", "asset_category"],
                        (r) => {
                          if (r) {
                            dialog.set_value("asset_name", r.item_name);
                            dialog.set_value(
                              "asset_category",
                              r.asset_category,
                            );
                          }
                        },
                      );
                    }
                  },
                },
                {
                  label: "Asset Name",
                  fieldname: "asset_name",
                  fieldtype: "Data",
                  read_only: 1,
                },
                {
                  label: "Asset Category",
                  fieldname: "asset_category",
                  fieldtype: "Link",
                  options: "Asset Category",
                  read_only: 1,
                  reqd: 1,
                },
                {
                  label: "Company",
                  fieldname: "company",
                  fieldtype: "Link",
                  options: "Company",
                  default: frappe.defaults.get_user_default("company"),
                  reqd: 1,
                },
                {
                  label: "Location",
                  fieldname: "location",
                  fieldtype: "Link",
                  options: "Location",
                  reqd: 1,
                },
                {
                  label: "Custodian",
                  fieldname: "custodian",
                  fieldtype: "Link",
                  options: "Employee",
                },
                {
                  label: "Asset Owner",
                  fieldname: "asset_owner",
                  fieldtype: "Select",
                  options: "Company\nSupplier\nCustomer",
                  default: "Company",
                },
                {
                  label: "Department",
                  fieldname: "department",
                  fieldtype: "Link",
                  options: "Department",
                },
                {
                  label: "Serial No",
                  fieldname: "serial_no",
                  fieldtype: "Link",
                  options: "Serial No",
                },
                {
                  label: "Windows Key",
                  fieldname: "windows_key",
                  fieldtype: "Data",
                },
                {
                  label: "Office Key",
                  fieldname: "office_key",
                  fieldtype: "Data",
                },
                {
                  label: "Gross Purchase Amount",
                  fieldname: "gross_purchase_amount",
                  fieldtype: "Currency",
                  options: "company:default_currency",
                  reqd: 1,
                },
                {
                  label: "Purchase Date",
                  fieldname: "purchase_date",
                  fieldtype: "Date",
                  default: frappe.datetime.get_today(),
                  reqd: 1,
                },
                {
                  label: "Available-for-use Date",
                  fieldname: "available_for_use_date",
                  fieldtype: "Date",
                  default: frappe.datetime.get_today(),
                  reqd: 1,
                },
              ],
              primary_action_label: __("Create"),
              primary_action: (values) => {
                frappe.call({
                  method: "frappe.client.insert",
                  args: {
                    doc: {
                      doctype: "Asset",
                      is_existing_asset: 1,
                      ...values,
                    },
                  },
                  callback: (r) => {
                    if (!r.exc && r.message) {
                      const asset_name = r.message.name;
                      frappe.msgprint({
                        title: "Asset Created!",
                        message: `Asset <b>${asset_name}</b> created successfully!<br><br>
                          <button class="btn btn-primary btn-sm" onclick="window.submit_asset('${asset_name}')">
                            <i class="fa fa-check"></i> Submit Now
                          </button>`,
                        indicator: "green",
                        wide: true,
                      });
                      dialog.hide();
                      this.loadAssets();
                    }
                  },
                });
              },
            });
            dialog.show();
            return;
          }
          if (this.subMode === "movement") {
            const dialog = new frappe.ui.Dialog({
              title: __("Create Asset Movement"),
              fields: [
                {
                  label: "Purpose",
                  fieldname: "purpose",
                  fieldtype: "Select",
                  options: "Issue\nReceipt\nTransfer",
                  default: "Issue",
                  reqd: 1,
                },
                {
                  label: "Company",
                  fieldname: "company",
                  fieldtype: "Link",
                  options: "Company",
                  default: frappe.defaults.get_user_default("company"),
                  reqd: 1,
                },
                {
                  label: "Transaction Date",
                  fieldname: "transaction_date",
                  fieldtype: "Date",
                  default: frappe.datetime.get_today(),
                  reqd: 1,
                },
                {
                  label: "Assets",
                  fieldname: "assets",
                  fieldtype: "Table",
                  fields: [
                    {
                      label: "Asset",
                      fieldname: "asset",
                      fieldtype: "Link",
                      options: "Asset",
                      in_list_view: 1,
                      reqd: 1,
                      onchange: function () {
                        const row = this.grid_row;
                        if (this.value) {
                          frappe.db.get_value(
                            "Asset",
                            this.value,
                            ["asset_name", "location", "custodian"],
                            (r) => {
                              if (r) {
                                frappe.model.set_value(
                                  row.doc.doctype,
                                  row.doc.name,
                                  "asset_name",
                                  r.asset_name || "",
                                );
                                frappe.model.set_value(
                                  row.doc.doctype,
                                  row.doc.name,
                                  "source_location",
                                  r.location || "",
                                );
                                frappe.model.set_value(
                                  row.doc.doctype,
                                  row.doc.name,
                                  "from_employee",
                                  r.custodian || "",
                                );
                              }
                            },
                          );
                        } else {
                          frappe.model.set_value(
                            row.doc.doctype,
                            row.doc.name,
                            "asset_name",
                            "",
                          );
                          frappe.model.set_value(
                            row.doc.doctype,
                            row.doc.name,
                            "source_location",
                            "",
                          );
                          frappe.model.set_value(
                            row.doc.doctype,
                            row.doc.name,
                            "from_employee",
                            "",
                          );
                        }
                      },
                    },
                    {
                      label: "Asset Name",
                      fieldname: "asset_name",
                      fieldtype: "Data",
                      read_only: 1,
                      in_list_view: 1,
                    },
                    {
                      label: "Target Location",
                      fieldname: "target_location",
                      fieldtype: "Link",
                      options: "Location",
                      in_list_view: 1,
                    },
                    {
                      label: "To Employee",
                      fieldname: "to_employee",
                      fieldtype: "Link",
                      options: "Employee",
                      in_list_view: 1,
                    },
                    {
                      label: "Source Location",
                      fieldname: "source_location",
                      fieldtype: "Link",
                      options: "Location",
                      read_only: 1,
                    },
                    {
                      label: "From Employee",
                      fieldname: "from_employee",
                      fieldtype: "Link",
                      options: "Employee",
                      read_only: 1,
                    },
                  ],
                  reqd: 1,
                },
              ],
              primary_action_label: __("Create"),
              primary_action: (values) => {
                frappe.call({
                  method: "frappe.client.insert",
                  args: {
                    doc: {
                      doctype: "Asset Movement",
                      ...values,
                    },
                  },
                  callback: (r) => {
                    if (!r.exc && r.message) {
                      const am_name = r.message.name;
                      frappe.msgprint({
                        title: "Asset Movement Created!",
                        message: `Asset Movement <b>${am_name}</b> saved successfully!`,
                        indicator: "green",
                      });
                      dialog.hide();
                      this.loadAssetMovements();
                    }
                  },
                });
              },
            });
            dialog.show();
            return;
          }
        }

        const dialog = new frappe.ui.Dialog({
          title: __("Create Employee Material Request"),
          fields: [
            {
              label: "Series",
              fieldname: "naming_series",
              fieldtype: "Select",
              options: "EMR-.YYYY.-",
              reqd: 1,
              default: "EMR-.YYYY.-",
            },
            {
              label: "Employee",
              fieldname: "employee",
              fieldtype: "Link",
              options: "Employee",
              reqd: 1,
              onchange: function () {
                const val = this.get_value();
                if (val) {
                  frappe.call({
                    method: "frappe.client.get",
                    args: { doctype: "Employee", name: val },
                    callback: (res) => {
                      if (res.message) {
                        const emp = res.message;
                        // Set Target Warehouse/Location from sol_id
                        if (emp.sol_id) {
                          dialog.set_value("target_warehouse", emp.sol_id);
                          dialog.set_value("target_location", emp.sol_id);
                        }

                        // Fetch Reporting Person User ID from reports_to Employee
                        if (emp.reports_to) {
                          frappe.db.get_value(
                            "Employee",
                            emp.reports_to,
                            "user_id",
                            (r) => {
                              if (r && r.user_id) {
                                dialog.set_value("reporting_person", r.user_id);
                              }
                            },
                          );
                        }
                      }
                    },
                  });
                }
              },
            },
            {
              label: "Reporting Person",
              fieldname: "reporting_person",
              fieldtype: "Link",
              options: "User",
              read_only: 1,
              reqd: 1,
            },
            {
              label: "Target Warehouse",
              fieldname: "target_warehouse",
              fieldtype: "Link",
              options: "Warehouse",
              read_only: 1,
              reqd: 1,
            },
            {
              fieldname: "target_location",
              fieldtype: "Data",
              hidden: 1,
              reqd: 1,
            },
            {
              label: "Source Warehouse",
              fieldname: "source_warehouse",
              fieldtype: "Link",
              options: "Warehouse",
              get_query: () => ({
                filters: { custom_warehouse_category: "Store" },
              }),
              reqd: 1,
            },
            {
              label: "Required By Date",
              fieldname: "required_by_date",
              fieldtype: "Date",
              default: frappe.datetime.get_today(),
              reqd: 1,
            },
            {
              label: "Request Type",
              fieldname: "request_type",
              fieldtype: "Select",
              options: "New\nReturn\nIssue",
              default: "New",
              reqd: 1,
            },
            {
              label: "Items",
              fieldname: "items",
              fieldtype: "Table",
              fields: [
                {
                  fieldname: "item_code",
                  fieldtype: "Link",
                  options: "Item",
                  label: "Item Code",
                  in_list_view: 1,
                  reqd: 1,
                  onchange: function () {
                    const row = this.grid_row;
                    if (this.value) {
                      frappe.db.get_value(
                        "Item",
                        this.value,
                        ["is_fixed_asset", "stock_uom"],
                        (r) => {
                          if (r) {
                            const is_fixed_asset =
                              r.is_fixed_asset === 1 ||
                              r.is_fixed_asset === "1";
                            const category = is_fixed_asset
                              ? "Asset"
                              : "Stock Item";
                            frappe.model.set_value(
                              row.doc.doctype,
                              row.doc.name,
                              "item_category",
                              category,
                            );
                            frappe.model.set_value(
                              row.doc.doctype,
                              row.doc.name,
                              "uom",
                              r.stock_uom,
                            );
                          }
                        },
                      );
                    }
                  },
                },
                {
                  fieldname: "quantity",
                  fieldtype: "Float",
                  label: "Quantity",
                  default: 1,
                  in_list_view: 1,
                  reqd: 1,
                },
                {
                  fieldname: "item_category",
                  fieldtype: "Data",
                  label: "Category",
                  in_list_view: 1,
                  read_only: 1,
                },
                {
                  fieldname: "uom",
                  fieldtype: "Data",
                  label: "UOM",
                  in_list_view: 1,
                  read_only: 1,
                },
              ],
              reqd: 1,
            },
            {
              label: "Remark",
              fieldname: "remark",
              fieldtype: "Long Text",
              reqd: 1,
            },
          ],
          primary_action: async (values) => {
            // Re-verify item categories to ensure they match Item master
            if (values.items && values.items.length) {
              for (let item of values.items) {
                item.employee = values.employee;

                const res = await frappe.db.get_value("Item", item.item_code, [
                  "is_fixed_asset",
                  "stock_uom",
                ]);
                if (res && res.message) {
                  const is_fixed_asset =
                    res.message.is_fixed_asset === 1 ||
                    res.message.is_fixed_asset === "1";
                  item.item_category = is_fixed_asset ? "Asset" : "Stock Item";
                  item.uom = res.message.stock_uom;
                }
              }
            }

            frappe.call({
              method: "frappe.client.insert",
              args: {
                doc: {
                  doctype: "Employee Material Request",
                  requested_by: frappe.session.user,
                  ...values,
                },
              },
              callback: (r) => {
                if (!r.exc) {
                  frappe.show_alert({
                    message: __("Material Request {0} created", [
                      r.message.name,
                    ]),
                    indicator: "green",
                  });
                  dialog.hide();
                  this.loadRequests();
                }
              },
            });
          },
        });

        dialog.show();
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

            const stock_items = (doc.items || []).filter(
              (i) => i.item_category === "Stock Item",
            );
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
              { fieldtype: "Section Break" },
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
                  custom_type: "Employee",
                  custom_request_for: doc.employee,
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
              "Create",
            );
          },
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

            const stock_items = (doc.items || []).filter(
              (i) => i.item_category === "Stock Item",
            );
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
                const purpose = doc.target_warehouse
                  ? "Material Transfer"
                  : "Material Issue";

                const se_doc = {
                  doctype: "Stock Entry",
                  stock_entry_type: purpose,
                  company:
                    doc.company || frappe.defaults.get_user_default("company"),
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
                    t_warehouse:
                      purpose === "Material Transfer"
                        ? doc.target_warehouse
                        : "",
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
              "Create",
            );
          },
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
                let employee = row_controls[idx]
                  ? row_controls[idx].get_value()
                  : null;
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
                method:
                  "sahayog.procurement.api.stock_balance_ledger.create_asset_movement_from_emmr",
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
        else if (
          ["Pending HO Approval", "Approved", "Self Approved"].includes(status)
        )
          step2State = "done";
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

        let step3 = {
          visible: step3Visible,
          state: step3State,
          label: step3Label,
        };
        return { step1, step2, step3 };
      },
    };

    window.cur_stockio_app = app;
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

window.submit_asset = function (asset_name) {
  // Hide the button to prevent multiple clicks
  $(event.target).hide();

  frappe.call({
    method: "frappe.client.get",
    args: { doctype: "Asset", name: asset_name },
    callback: (r) => {
      if (!r.exc) {
        frappe.call({
          method: "frappe.client.submit",
          args: { doc: r.message },
          callback: (r2) => {
            if (!r2.exc) {
              frappe.show_alert({
                message: `Asset ${asset_name} submitted successfully`,
                indicator: "green",
              });
              // Refresh StockIO lists if needed
              if (window.cur_stockio_app) {
                window.cur_stockio_app.loadAssets();
              }
            }
          },
        });
      }
    },
  });
};
