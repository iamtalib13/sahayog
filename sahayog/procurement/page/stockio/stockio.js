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
        <aside class="stockio-sidebar">
          <div class="logo">StockIO</div>

          <nav class="menu">
            <div class="menu-item">Dashboard</div>
            <div class="menu-item active">Sales</div>
            <div class="menu-item">Products</div>
            <div class="menu-item">Reports</div>
            <div class="menu-item">Settings</div>
          </nav>
        </aside>

        <!-- MAIN CONTENT -->
        <main class="stockio-main">

          <div class="stockio-header">
            <h2>Orders</h2>
            <div class="stockio-actions">
              <button class="btn ghost">Export</button>
              <button class="btn primary">Create</button>
            </div>
          </div>

          <div class="stockio-tabs">
            <span class="tab active">All <b>410</b></span>
            <span class="tab">New <b class="green">36</b></span>
            <span class="tab">Pending <b class="orange">40</b></span>
            <span class="tab">Delivered <b class="purple">334</b></span>
          </div>

          <div class="stockio-search">
            <input placeholder="Search orders..." />
            <button class="btn ghost">Filters</button>
          </div>

          <div class="stockio-content">
            <!-- Order cards will come here -->
          </div>

        </main>
      </div>
    `);
  }

  mountVue() {
    PetiteVue.createApp({}).mount(this.wrapper[0]);
  }
}
