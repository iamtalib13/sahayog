frappe.listview_settings['Purchase Receipt'] = {
  onload(listview) {
    console.log('Customizing Purchase Receipt List View to Inward');
    if (!frappe.user.has_role('Administrator')) {
      let attempts = 0;
      const maxAttempts = 15;
      const interval = setInterval(() => {
        // Change titles
        document.querySelectorAll('.ellipsis.title-text, .page-title .title-text, .list-page .title-text').forEach(el => {
          if (el.innerText.includes('Purchase Receipt')) {
            el.innerText = el.innerText.replace(/Purchase Receipt/g, 'Inward');
            el.setAttribute('title', el.innerText);
          }
        });
        // Change Add buttons
        document.querySelectorAll('button, .btn').forEach(btn => {
          if (btn.innerText.trim().includes('Purchase Receipt')) {
            btn.innerText = btn.innerText.replace(/Purchase Receipt/g, 'Inward');
          }
          if (btn.getAttribute('data-label') && btn.getAttribute('data-label').includes('Purchase Receipt')) {
            btn.setAttribute('data-label', btn.getAttribute('data-label').replace(/Purchase Receipt/g, 'Goods Inward'));
          }
        });
        // Change breadcrumbs
        document.querySelectorAll('.breadcrumb-item.active, #navbar-breadcrumbs a').forEach(bc => {
          if (bc.innerText.includes('Purchase Receipt')) {
            bc.innerText = bc.innerText.replace(/Purchase Receipt/g, 'Inward');
          }
        });
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(interval);
        }
      }, 200);
    }
  }
}
