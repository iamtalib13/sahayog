frappe.pages["disciplinary-cases"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Disciplinary Management",
    single_column: true,
  });

  // Main root for dashboard
  const root = $('<div class="dm-dashboard"></div>').appendTo(page.body);

  // Render basic HTML structure inside root
  root.html(`
    <header class="dm-header" role="banner">
      <div>
        <h2>Disciplinary Management</h2>
        <span>HR dashboard for cases & enquiries</span>
      </div>
      <button class="btn btn-primary dm-btn-new" title="Create New Disciplinary Case">+ New Case</button>
    </header>
    <section class="dm-widgets" role="region" aria-label="Dashboard Summary Widgets">
      <div class="dm-widget" id="widget-total" tabindex="0" role="button" aria-pressed="false" aria-label="Total Cases">
        <div class="label">Total Cases</div>
        <div class="value">0</div>
      </div>
      <div class="dm-widget" id="widget-open" tabindex="0" role="button" aria-pressed="false" aria-label="Open Cases">
        <div class="label">Open Cases</div>
        <div class="value">0</div>
      </div>
      <div class="dm-widget" id="widget-pending" tabindex="0" role="button" aria-pressed="false" aria-label="Pending Enquiries">
        <div class="label">Pending Enquiries</div>
        <div class="value">0</div>
      </div>
    </section>
    <section class="dm-main-lists" role="region" aria-label="Main Lists" tabindex="0">
      <h3>Recent Disciplinary Cases</h3>
      <article id="cases-list" aria-label="Recent Disciplinary Cases" tabindex="0"><div class="loading">Loading...</div></article>
      <h3>Pending Cases by HR</h3>
      <aside id="hr-pending-summary" aria-label="Pending Cases by HR" tabindex="0"><div class="loading">Loading...</div></aside>
    </section>

    <!-- Modal -->
    <div id="dm-modal" class="dm-modal" role="dialog" aria-modal="true" aria-hidden="true" tabindex="-1">
      <div class="dm-modal-content" tabindex="0">
        <button class="dm-modal-close" aria-label="Close popup" type="button">&times;</button>
        <h4 id="dm-modal-title"></h4>
        <div id="dm-modal-body" tabindex="0"></div>
      </div>
    </div>
  `);

  // Cache data
  let cachedCases = [];
  let cachedData = {};

  // Utility: pretty date formatter
  function formatPrettyDate(date) {
    if (!date) return "-";
    try {
      return frappe.datetime.str_to_user(date, true);
    } catch {
      return new Date(date).toLocaleDateString();
    }
  }

  // Modal handlers
  const modal = root.find("#dm-modal");
  const blurWrapperClass = "dm-blur-wrapper";

  function createBlurWrapper() {
    if (wrapper.find("." + blurWrapperClass).length) return;
    const blurWrapper = $("<div>").addClass(blurWrapperClass);
    root.wrap(blurWrapper);
  }

  function openModal(title, contentHTML) {
    createBlurWrapper();
    const blurWrapper = wrapper.find("." + blurWrapperClass);
    modal.find("#dm-modal-title").text(title);
    modal.find("#dm-modal-body").html(contentHTML);

    blurWrapper.addClass("blurred");
    modal.addClass("active").attr("aria-hidden", "false");
    modal.find(".dm-modal-content").focus();
  }

  function closeModal() {
    const blurWrapper = wrapper.find("." + blurWrapperClass);
    modal.removeClass("active").attr("aria-hidden", "true");
    blurWrapper.removeClass("blurred");
  }

  modal.find(".dm-modal-close").on("click", closeModal);
  modal.on("click", (e) => {
    if (e.target === modal[0]) closeModal();
  });
  $(document).on("keydown", (e) => {
    if (e.key === "Escape" && modal.hasClass("active")) closeModal();
  });

  // Render Popup Table
  function renderPopupTable(records, columns, doctype) {
    if (!records.length)
      return '<p style="color:#666; font-style:italic; margin:1rem 0;">No records found.</p>';

    let headers = columns.map((c) => `<th>${c.label}</th>`).join("");
    let rows = records
      .map((r) => {
        let cells = columns
          .map((col) => {
            let val = r[col.field] || "-";
            if (col.format) val = col.format(val, r);
            return `<td>${val}</td>`;
          })
          .join("");
        return `<tr tabindex="0" role="button" data-name="${r.name}" style="cursor:pointer;">${cells}</tr>`;
      })
      .join("");

    return `<table role="grid" aria-readonly="true" style="width:100%; border-collapse:collapse;">
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // Show Popup List
  function showPopupList(title, records, columns, doctype) {
    openModal(title, renderPopupTable(records, columns, doctype));
    modal.find('tr[tabindex="0"]').each((i, el) => {
      el = $(el);
      el.on("click", () => {
        let name = el.attr("data-name");
        if (name) frappe.set_route("Form", doctype, name);
      });
      el.on("keypress", (e) => {
        if (e.key === "Enter") el.click();
      });
    });
  }

  // Render Cases List
  function renderCases(cases) {
    const container = root.find("#cases-list");
    if (!cases.length) {
      container.html("<p>No cases found.</p>");
      return;
    }
    container.empty();
    cases.forEach((dc) => {
      const remarksSnippet =
        dc.remarks && dc.remarks.length > 120
          ? dc.remarks.substring(0, 120) + "..."
          : dc.remarks || "";
      const enquiryCount = dc.enquiries ? dc.enquiries.length : 0;

      const caseItem = $(`
      <div class="case-item">
        <div class="case-details">
          <div class="case-title" tabindex="0" role="link" aria-label="Open Case ${
            dc.case_id || dc.name
          }">${dc.case_id || dc.name}</div>
          <div class="case-meta">Type: ${dc.case_type || "-"} | Status: ${
        dc.status || "-"
      } | Date: ${formatPrettyDate(dc.issue_occurrence_date)} | HR: ${
        dc.hr_name || "-"
      }</div>
          <div class="case-remarks">${remarksSnippet}</div>
          <button class="dm-enquiry-btn" aria-label="Show ${enquiryCount} linked enquiries" style="background:#016868;color:#fff;border:none;padding:6px 14px;border-radius:8px;cursor:pointer;">${enquiryCount} Enquiry${
        enquiryCount !== 1 ? "ies" : ""
      }</button>
        </div>
        <button class="btn-view" aria-label="View Case ${
          dc.case_id || dc.name
        }">View</button>
      </div>`);

      container.append(caseItem);

      caseItem
        .find(".case-title")
        .on("click", () =>
          frappe.set_route("Form", "Disciplinary Case", dc.name)
        );
      caseItem.find(".case-title").on("keypress", (e) => {
        if (e.key === "Enter") caseItem.find(".case-title").click();
      });
      caseItem
        .find(".btn-view")
        .on("click", () =>
          frappe.set_route("Form", "Disciplinary Case", dc.name)
        );
      caseItem
        .find(".dm-enquiry-btn")
        .on("click", () => showEnquiryPopup(dc.enquiries || []));
    });
  }

  // Render HR Pending Summary
  function renderHRPendingSummary(hrSummary) {
    const container = root.find("#hr-pending-summary");
    if (!hrSummary.length) {
      container.html("<p>No pending cases found.</p>");
      return;
    }
    container.empty();
    hrSummary.forEach((r) => {
      const hrElem = $(
        `<div class="hr-summary-item" tabindex="0" role="button">${
          r.hr_name || "Unknown HR"
        }: <strong>${r.count}</strong></div>`
      );
      hrElem.data("hr-employee-id", r.hr_employee_id);
      container.append(hrElem);

      hrElem.on("click", () => {
        const hrId = hrElem.data("hr-employee-id");
        const filteredCases = cachedCases.filter(
          (c) =>
            (c.hr_employee_id || "") === hrId &&
            ["Open", "In Progress"].includes(c.status)
        );
        showPopupList(
          `Pending Cases for ${r.hr_name}`,
          filteredCases,
          [
            { label: "Case ID", field: "case_id" },
            { label: "Type", field: "case_type" },
            { label: "Status", field: "status" },
            {
              label: "Date",
              field: "issue_occurrence_date",
              format: formatPrettyDate,
            },
          ],
          "Disciplinary Case"
        );
      });
      hrElem.on("keypress", (e) => {
        if (e.key === "Enter") hrElem.click();
      });
    });
  }

  // Show Enquiry Popup
  function createEnquiryPopup() {
    let popup = wrapper.find("#enquiry-popup");
    if (popup.length) return popup;

    const modalHTML = `
      <div id="enquiry-popup" class="dm-modal" role="dialog" aria-modal="true" aria-hidden="true" tabindex="-1" style="display:none;">
        <div class="dm-modal-content" tabindex="0">
          <button class="dm-modal-close" aria-label="Close enquiry popup" type="button">&times;</button>
          <h4>Enquiry Details</h4>
          <div id="enquiry-popup-list" tabindex="0"></div>
        </div>
      </div>`;

    wrapper.append(modalHTML);
    popup = wrapper.find("#enquiry-popup");

    popup.find(".dm-modal-close").on("click", () => hideModal(popup));
    popup.on("click", (e) => {
      if (e.target === popup[0]) hideModal(popup);
    });
    $(document).on("keydown", (e) => {
      if (e.key === "Escape" && popup.attr("aria-hidden") === "false")
        hideModal(popup);
    });

    return popup;
  }

  function showEnquiryPopup(enquiries) {
    const popup = createEnquiryPopup();
    const listCont = popup.find("#enquiry-popup-list");
    if (!enquiries.length) {
      listCont.html("<p>No linked enquiries found.</p>");
    } else {
      listCont.html(
        enquiries
          .map(
            (eq) => `
        <div style="margin-bottom:12px;border-bottom:1px solid #ccc;padding-bottom:8px;">
          <strong>Notice Date:</strong> ${formatPrettyDate(eq.notice_date)}<br>
          <strong>Status:</strong> ${eq.status}<br>
          <strong>Suspension Required:</strong> ${
            eq.suspension_required || "-"
          }<br>
          <strong>Attendance:</strong> ${eq.attendance || "-"}<br>
          <button style="margin-top:8px;background:#016868;color:#fff;padding:8px 14px;border:none;border-radius:8px;cursor:pointer;" onclick="frappe.set_route('Form','Enquiry','${
            eq.name
          }')">Open Enquiry</button>
        </div>`
          )
          .join("")
      );
    }
    popup.css("display", "flex").attr("aria-hidden", "false");
    popup.find(".dm-modal-content").focus();
  }

  function hideModal(popup) {
    popup.css("display", "none").attr("aria-hidden", "true");
  }

  // Update widgets
  function updateWidgets(counts, cachedData) {
    const widgets = [
      {
        id: "#widget-total",
        label: "All Disciplinary Cases",
        list: cachedData.cases,
        columns: [
          { label: "Case ID", field: "case_id" },
          { label: "Type", field: "case_type" },
          { label: "Status", field: "status" },
          {
            label: "Date",
            field: "issue_occurrence_date",
            format: formatPrettyDate,
          },
          { label: "HR", field: "hr_name" },
        ],
        doctype: "Disciplinary Case",
        count: counts.total,
      },
      {
        id: "#widget-open",
        label: "Open Disciplinary Cases",
        list: cachedData.cases.filter((c) =>
          ["Open", "In Progress"].includes(c.status)
        ),
        columns: [
          { label: "Case ID", field: "case_id" },
          { label: "Type", field: "case_type" },
          { label: "Status", field: "status" },
          {
            label: "Date",
            field: "issue_occurrence_date",
            format: formatPrettyDate,
          },
          { label: "HR", field: "hr_name" },
        ],
        doctype: "Disciplinary Case",
        count: counts.open,
      },
      {
        id: "#widget-pending",
        label: "Pending Enquiries",
        list: cachedData.pending_enquiries,
        columns: [
          {
            label: "Notice Date",
            field: "notice_date",
            format: formatPrettyDate,
          },
          { label: "Status", field: "status" },
          { label: "Suspension", field: "suspension_required" },
          { label: "Attendance", field: "attendance" },
        ],
        doctype: "Enquiry",
        count: counts.pending,
      },
    ];

    widgets.forEach((w) => {
      const el = root.find(w.id);
      if (!el.length) return;

      el.find(".value").text(w.count);
      el.attr("tabindex", "0").css("cursor", "pointer");
      el.off("click keypress"); // remove previous handlers
      el.on("click", () =>
        showPopupList(w.label, w.list, w.columns, w.doctype)
      );
      el.on("keypress", (e) => {
        if (e.key === "Enter") el.click();
      });
    });
  }

  // Fetch dashboard data from server
  function fetchDashboardData() {
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Disciplinary Case",
        fields: [
          "name",
          "case_id",
          "case_type",
          "status",
          "issue_occurrence_date",
          "hr_name",
          "remarks",
          "hr_employee_id",
        ],
        limit_page_length: 50,
        order_by: "modified desc",
      },
      callback: (res) => {
        cachedCases = res.message || [];
        const total = cachedCases.length;
        const open = cachedCases.filter((c) =>
          ["Open", "In Progress"].includes(c.status)
        ).length;
        let pendingEnquiriesCount = 0;
        const hrPendingMap = {};

        // fetch enquiries for each case
        const enquiryPromises = cachedCases.map((dc) =>
          frappe
            .call({
              method: "frappe.client.get_list",
              args: {
                doctype: "Enquiry",
                filters: { disciplinary_case: dc.name },
                fields: [
                  "name",
                  "notice_date",
                  "status",
                  "suspension_required",
                  "attendance",
                ],
                limit_page_length: 50,
                order_by: "notice_date desc",
              },
            })
            .then((res) => {
              dc.enquiries = res.message || [];
              pendingEnquiriesCount += dc.enquiries.filter(
                (e) => e.status !== "Closed"
              ).length;
              if (["Open", "In Progress"].includes(dc.status)) {
                const hrNameKey = dc.hr_name || "Unknown HR";
                if (!hrPendingMap[hrNameKey])
                  hrPendingMap[hrNameKey] = {
                    count: 0,
                    hr_employee_id: dc.hr_employee_id,
                  };
                hrPendingMap[hrNameKey].count++;
              }
              return dc;
            })
        );

        Promise.all(enquiryPromises).then((fullCases) => {
          cachedData = {
            cases: fullCases,
            pending_enquiries: fullCases.flatMap((dc) =>
              dc.enquiries.filter((e) => e.status !== "Closed")
            ),
          };
          updateWidgets(
            { total, open, pending: pendingEnquiriesCount },
            cachedData
          );
          renderCases(fullCases);
          renderHRPendingSummary(
            Object.entries(hrPendingMap).map(([name, obj]) => ({
              hr_name: name,
              count: obj.count,
              hr_employee_id: obj.hr_employee_id,
            }))
          );
        });
      },
    });
  }

  // Attach click to new case button
  root
    .find(".dm-btn-new")
    .on("click", () => frappe.set_route("Form", "Disciplinary Case", "new"));

  // Initialize dashboard data fetch
  fetchDashboardData();
};
