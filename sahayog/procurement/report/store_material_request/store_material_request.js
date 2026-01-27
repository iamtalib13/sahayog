frappe.query_reports["Store material request"] = {
  // -------------------- FILTERS --------------------
  filters: [
    {
      fieldname: "employee",
      label: __("Employee"),
      fieldtype: "Link",
      options: "Employee",
    },
    {
      fieldname: "branch",
      label: __("Branch"),
      fieldtype: "Link",
      options: "Sahayog Branch",
    },
  ],

  onload: function (report) {
    // clear filters button
    report.page.add_inner_button(__("Clear Filters"), function () {
      report.filters.forEach((f) => f.set_value(""));
      report.refresh();
    });

    // -------------------- INTRO LOAD --------------------
    frappe.call({
      method: "frappe.desk.query_report.run",
      args: { report_name: "Store material request", filters: {} },
      callback: function (r) {
        const summary = (r && r.message && r.message.chart) || {};
        $(report.page.wrapper).find(".report-custom-intro").remove();
        $(report.page.wrapper).find(".page-form").before(renderIntro(summary));
      },
    });
  },

  // -------------------- FORMATTER --------------------
  formatter: function (value, row, column, data, default_formatter) {
    value = default_formatter(value, row, column, data);
    const field = column.fieldname;

    if (field === "request_id" && data.request_id) {
      return createRequestLink(data.request_id);
    }

    if (field === "status") {
      return (
        badgeForStatus(data.status) || badge(data.status, "#1565C0", "#E3F2FD")
      );
    }

    if (field === "reporting_person_status") {
      return badgeForReportingPerson(data.reporting_person_status) || value;
    }

    if (field === "ho_officer_status") {
      return badgeForHoOfficer(data.ho_officer_status) || value;
    }

    if (field === "request_age") {
      const days = parseInt(data.request_age, 10);
      return isFinite(days) ? badgeForAge(days) : value;
    }

    return value;
  },
};

// -------------------- INTRO RENDER --------------------
function renderIntro(summary = {}) {
  const approvedBadge = badge(
    `✔ Approved: ${summary.approved || 0}`,
    "#2E7D32",
    "#E8F5E9"
  );
  const pendingBadge = badge(
    `⏳ Pending: ${summary.pending || 0}`,
    "#EF6C00",
    "#FFF3E0"
  );

  return `
		<div class="report-custom-intro" style="${INTRO_STYLE}">
			<b>User:</b> ${summary.user || "-"} <br>
			<b>Warehouse:</b> ${summary.warehouse || "-"} <br><br>
			${approvedBadge}&nbsp;&nbsp;${pendingBadge}
		</div>
	`;
}

// -------------------- CONSTANTS --------------------
const INTRO_STYLE =
  [
    "background:#f7f9fc",
    "border-left:4px solid #2196F3",
    "padding:15px",
    "margin-bottom:15px",
    "border-radius:6px",
    "font-size:14px",
  ].join(";") + ";";

// -------------------- STATUS MAPS --------------------
const STATUS_MAP = {
  Draft: { label: "📝 Draft", color: "#546E7A", bg: "#ECEFF1" },
  "Pending Reporting Person": {
    label: "👤 Pending Reporting",
    color: "#FB8C00",
    bg: "#FFF3E0",
  },
  "Pending HO Approval": {
    label: "🏢 Pending HO Approval",
    color: "#039BE5",
    bg: "#E1F5FE",
  },
  Approved: { label: "✔ Approved", color: "#2E7D32", bg: "#E8F5E9" },
  Completed: { label: "🎉 Completed", color: "#6A1B9A", bg: "#F3E5F5" },
  Rejected: { label: "✖ Rejected", color: "#C62828", bg: "#FFEBEE" },
  Cancelled: { label: "⚠ Cancelled", color: "#616161", bg: "#F5F5F5" },
};

const REPORTING_PERSON_MAP = {
  Approved: { label: "✓ Approved", color: "#4CAF50", bg: "#E8F5E9" },
  Rejected: { label: "✗ Rejected", color: "#F44336", bg: "#FFEBEE" },
  Pending: { label: "⏱ Pending", color: "#FF9800", bg: "#FFF3E0" },
  Skip: { label: "⤭ Skip", color: "#2196F3", bg: "#E3F2FD" },
};

const HO_OFFICER_MAP = {
  Approved: { label: "✓ Approved", color: "#4CAF50", bg: "#E8F5E9" },
  Rejected: { label: "✗ Rejected", color: "#F44336", bg: "#FFEBEE" },
  Pending: { label: "⏱ Pending", color: "#FF9800", bg: "#FFF3E0" },
};

// -------------------- BADGE HELPERS --------------------
function badge(text, color, bg) {
  return `<span style="color: ${color}; font-weight: bold; padding: 4px 10px; border-radius: 6px; background: ${bg}; display: inline-block;">${escapeHtml(
    text
  )}</span>`;
}

function getBadgeFromMap(map, key) {
  const m = map && map[key];
  return m ? badge(m.label, m.color, m.bg) : null;
}

function badgeForStatus(status) {
  return getBadgeFromMap(STATUS_MAP, status);
}
function badgeForReportingPerson(status) {
  return getBadgeFromMap(REPORTING_PERSON_MAP, status);
}
function badgeForHoOfficer(status) {
  return getBadgeFromMap(HO_OFFICER_MAP, status);
}
function badgeForAge(days) {
  if (days > 7) return badge(`${days} days`, "#C62828", "#FFEBEE");
  if (days > 3) return badge(`${days} days`, "#EF6C00", "#FFF3E0");
  return badge(`${days} days`, "#2E7D32", "#E8F5E9");
}

function createRequestLink(requestId) {
  const url = "/app/employee-material-request/" + encodeURIComponent(requestId);
  return `<a href="${url}" style="color:#2196F3;font-weight:600;padding:4px 10px;border-radius:4px;background:#E3F2FD;text-decoration:none;border:1px solid #BBDEFB;"
      onmouseover="this.style.background='#2196F3'; this.style.color='#fff';"
      onmouseout="this.style.background='#E3F2FD'; this.style.color='#2196F3';">
      ${escapeHtml(requestId)}
    </a>`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
//  back to orginal#
