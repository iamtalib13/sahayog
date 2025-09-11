frappe.listview_settings['Stock Entry'] = {
  onload(listview) {
    console.log('Customizing Stock Entry List View');
    if (!frappe.user.has_role('Administrator')) {
      let attempts = 0;
      const maxAttempts = 15;
      const interval = setInterval(() => {
        // Change titles
        document.querySelectorAll('.ellipsis.title-text, .page-title .title-text, .list-page .title-text').forEach(el => {
          if (el.innerText.includes('Stock Entry')) {
            el.innerText = el.innerText.replace(/Stock Entry/g, 'Outward');
            el.setAttribute('title', el.innerText);
          }
        });

        // Change Add buttons
        document.querySelectorAll('button, .btn').forEach(btn => {
          if (btn.innerText.trim().includes('Stock Entry')) {
            btn.innerText = btn.innerText.replace(/Stock Entry/g, 'Outward');
          }
          if (btn.getAttribute('data-label') && btn.getAttribute('data-label').includes('Stock Entry')) {
            btn.setAttribute('data-label', btn.getAttribute('data-label').replace(/Stock Entry/g, 'Goods Outward'));
          }
        });

        // Change breadcrumbs
        document.querySelectorAll('.breadcrumb-item.active, #navbar-breadcrumbs a').forEach(bc => {
          if (bc.innerText.includes('Stock Entry')) {
            bc.innerText = bc.innerText.replace(/Stock Entry/g, 'Outward');
          }
        });

        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(interval);
        }
      }, 200);

      // hide the sidebar completely
      $('.list-sidebar').remove();
      $('.layout-main-section-wrapper').css("margin-left", "0");

    // Hide sidebar on list load
    setTimeout(() => {
      // Hide the sidebar section
      document.querySelectorAll('.layout-side-section').forEach(el => el.style.display = 'none');
      // Optionally, adjust main section margin if needed
      document.querySelectorAll('.layout-main-section-wrapper').forEach(el => el.style.marginLeft = '0');
    }, 300);
    }
  }
}
