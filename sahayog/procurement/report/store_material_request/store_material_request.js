frappe.query_reports["Store material request"] = {
  formatter: function (value, row, column, data, default_formatter) {
    value = default_formatter(value, row, column, data);

    // 🔵 Clickable Request ID Link
    if (column.fieldname == "request_id" && data.request_id) {
      value = `<a href="/app/employee-material-request/${data.request_id}"
                style="
                    color: #2196F3;
                    font-weight: 600;
                    padding: 4px 10px;
                    border-radius: 4px;
                    background: #E3F2FD;
                    text-decoration: none;
                    display: inline-block;
                    border: 1px solid #BBDEFB;
                "
                onmouseover="this.style.background='#2196F3'; this.style.color='#fff';"
                onmouseout="this.style.background='#E3F2FD'; this.style.color='#2196F3';"
            >${data.request_id}</a>`;
    }

    // 🌈 STATUS BADGE (ALL 7 STATUSES)
    if (column.fieldname == "status") {
      let s = data.status;

      if (s == "Draft") value = badge("📝 Draft", "#546E7A", "#ECEFF1");
      else if (s == "Pending Reporting Person")
        value = badge("👤 Pending Reporting", "#FB8C00", "#FFF3E0");
      else if (s == "Pending HO Approval")
        value = badge("🏢 Pending HO Approval", "#039BE5", "#E1F5FE");
      else if (s == "Approved")
        value = badge("✔ Approved", "#2E7D32", "#E8F5E9");
      else if (s == "Completed")
        value = badge("🎉 Completed", "#6A1B9A", "#F3E5F5");
      else if (s == "Rejected")
        value = badge("✖ Rejected", "#C62828", "#FFEBEE");
      else if (s == "Cancelled")
        value = badge("⚠ Cancelled", "#616161", "#F5F5F5");
      else value = badge(s, "#1565C0", "#E3F2FD"); // fallback
    }

    // 🟢 Reporting Person Status badges
    if (column.fieldname == "reporting_person_status") {
      let s = data.reporting_person_status;

      if (s == "Approved") value = badge("✓ Approved", "#4CAF50", "#E8F5E9");
      else if (s == "Rejected")
        value = badge("✗ Rejected", "#F44336", "#FFEBEE");
      else if (s == "Pending") value = badge("⏱ Pending", "#FF9800", "#FFF3E0");
      else if (s == "Skip") value = badge("⤭ Skip", "#2196F3", "#E3F2FD");
    }

    // 🔵 HO Officer Status badges
    if (column.fieldname == "ho_officer_status") {
      let s = data.ho_officer_status;

      if (s == "Approved") value = badge("✓ Approved", "#4CAF50", "#E8F5E9");
      else if (s == "Rejected")
        value = badge("✗ Rejected", "#F44336", "#FFEBEE");
      else if (s == "Pending") value = badge("⏱ Pending", "#FF9800", "#FFF3E0");
    }

    // 🟡 Request Age Highlight
    if (column.fieldname == "request_age") {
      let days = parseInt(data.request_age);

      if (days > 7) value = badge(days + " days", "#C62828", "#FFEBEE");
      else if (days > 3) value = badge(days + " days", "#EF6C00", "#FFF3E0");
      else value = badge(days + " days", "#2E7D32", "#E8F5E9");
    }

    return value;
  },
};

// ⭐ Badge Generator Function
function badge(text, color, bg) {
  return `<span style="
        color: ${color};
        font-weight: bold;
        padding: 4px 10px;
        border-radius: 6px;
        background: ${bg};
        display: inline-block;
    ">${text}</span>`;
}
