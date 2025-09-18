frappe.pages['inventory-movement'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Inventory Movement ',
		single_column: true
	});
    // Live stock tracking: { item_name: { qty, rate } }

  $(page.body).html(`
    <div class="row" style="min-height: 600px;">
      <div class="col-md-2">
        <div class="list-group" id="sidebar">
          <a class="list-group-item list-group-item-action active" data-view="dashboard">Stock Blance</a>
          <a class="list-group-item list-group-item-action" data-view="inward">stock ledger</a>
  
        </div>
      </div>
      <div class="col-md-10">
        <div id="content" class="p-3 bg-white shadow-sm border rounded" >
          <!-- View will be loaded here -->
        </div>
      </div>
    </div>
  `);

  load_view("dashboard");

  $('#sidebar a').on('click', function () {
    $('#sidebar a').removeClass('active');
    $(this).addClass('active');
    load_view(this.getAttribute("data-view"));
  });

  function load_view(view) {
    if (view === "dashboard") {
      render_dashboard();
    } else if (view === "inward") {
      render_inward();
    } else if (view === "outward") {
      render_outward();
    }else if (view === "asset") {
      asset_movements();
    }
  }

}