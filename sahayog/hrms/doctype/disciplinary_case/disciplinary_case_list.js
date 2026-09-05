// Disciplinary Case List View — wider Employee Name column (~220px)
// Root cause: Frappe List View columns are .list-row-col with flex:1 (sahayog/www/training.html:189)
// and rows have no [data-fieldname]; previous selector [data-fieldname="employee_name"] never matched.
// Correct target is the 6th child of .level-left (Subject flex:2 + Tag hide + Status + case_type + employee_id + employee_name)
frappe.listview_settings["Disciplinary Case"] = {
  refresh(listview) {
    const styleId = "disciplinary-case-employee-name-width";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      /* Header + rows: 6th child of .level-left is Employee Name (after Subject, Tag[hide], Status, Case Type, Employee ID) */
      .frappe-list .list-row-head .level-left > div:nth-child(6),
      .frappe-list .list-row-container .level-left > div:nth-child(6) {
        flex: 0 0 220px !important;
        max-width: 220px !important;
        min-width: 220px !important;
      }
      /* Override default .list-row-col flex:1 and .ellipsis truncation for this column only */
      .frappe-list .level-left > div:nth-child(6) .ellipsis,
      .frappe-list .level-left > div:nth-child(6) span.ellipsis,
      .frappe-list .level-left > div:nth-child(6) a.ellipsis {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        word-break: break-word !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        line-height: 1.3 !important;
        max-height: 2.6em !important; /* 2 lines */
      }
      /* Keep other columns (Employee ID, Case Type, Status) at flex:1 with ellipsis */
      /* Responsive: on mobile hidden-xs hides this column, so no extra rule needed */
      @media (max-width: 768px) {
        .frappe-list .list-row-head .level-left > div:nth-child(6),
        .frappe-list .list-row-container .level-left > div:nth-child(6) {
          flex: 1 1 auto !important;
          max-width: none !important;
          min-width: 0 !important;
        }
        .frappe-list .level-left > div:nth-child(6) .ellipsis {
          white-space: nowrap !important;
          -webkit-line-clamp: unset !important;
          display: block !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
      }
    `;
    document.head.appendChild(style);
  },
};
