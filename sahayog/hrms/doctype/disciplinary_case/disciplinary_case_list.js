// Disciplinary Case List View — wider Employee Name column (~220px)
// Fix: dynamic column index by header text (not hardcoded nth-child)
// Reason: production vs local has different in_list_view order => nth-child(6) was brittle
// and caused case_type grey / text invisible on prod where employee_name is 4th not 6th.
// Now we detect header "Employee Name" index at runtime and inject style for that index only.
frappe.listview_settings["Disciplinary Case"] = {
  refresh(listview) {
    const apply = () => {
      const head = document.querySelector(".frappe-list .list-row-head .level-left");
      if (!head) return false;
      const headers = Array.from(head.children);
      let idx = -1;
      headers.forEach((el, i) => {
        const txt = (el.textContent || "").trim().toLowerCase();
        if (txt === "employee name") idx = i + 1; // nth-child is 1-based
      });
      if (idx === -1) return false; // header not rendered yet

      const styleId = "disciplinary-case-employee-name-width";
      let style = document.getElementById(styleId);
      if (style && style.dataset.idx == String(idx)) return true; // already correct
      if (style) style.remove();

      style = document.createElement("style");
      style.id = styleId;
      style.dataset.idx = String(idx);
      style.textContent = `
        .frappe-list .list-row-head .level-left > div:nth-child(${idx}),
        .frappe-list .list-row-container .level-left > div:nth-child(${idx}) {
          flex: 0 0 220px !important;
          max-width: 220px !important;
          min-width: 220px !important;
        }
        .frappe-list .level-left > div:nth-child(${idx}) .ellipsis,
        .frappe-list .level-left > div:nth-child(${idx}) span.ellipsis,
        .frappe-list .level-left > div:nth-child(${idx}) a.ellipsis {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          word-break: break-word !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          line-height: 1.3 !important;
          max-height: 2.6em !important;
        }
        @media (max-width: 768px) {
          .frappe-list .list-row-head .level-left > div:nth-child(${idx}),
          .frappe-list .list-row-container .level-left > div:nth-child(${idx}) {
            flex: 1 1 auto !important;
            max-width: none !important;
            min-width: 0 !important;
          }
          .frappe-list .level-left > div:nth-child(${idx}) .ellipsis {
            white-space: nowrap !important;
            -webkit-line-clamp: unset !important;
            display: block !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
        }
      `;
      document.head.appendChild(style);
      return true;
    };

    // try immediately, else retry until header renders (frappe list is async)
    if (!apply()) {
      let tries = 0;
      const iv = setInterval(() => {
        if (apply() || ++tries > 20) clearInterval(iv);
      }, 300);
    }
  },
};
