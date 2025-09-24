frappe.listview_settings["Share Transfer"] = {
  refresh(listview) {
    set_custom_breadcrumbs();
    const btn = listview.page.btn_primary;
    if (btn) {
      btn.hide(); // completely hides the Add Shareholder button
    }
  },
  onload(listview) {
    set_custom_breadcrumbs();
    // Hide sidebar elements
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();
  },
};

function set_custom_breadcrumbs() {
  const breadcrumbs = document.getElementById("navbar-breadcrumbs");
  if (breadcrumbs) {
    breadcrumbs.innerHTML = ""; // Clear existing

    // Home link
    const homeLi = document.createElement("li");
    const homeA = document.createElement("a");
    homeA.href = "/app/shareholder-management/";
    homeA.innerText = "Home";
    homeLi.appendChild(homeA);

    // Append to breadcrumbs
    breadcrumbs.appendChild(homeLi);
  }
}
