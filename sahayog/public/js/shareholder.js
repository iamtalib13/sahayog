// =================================================================
// Main Event Handlers for Shareholder Doctype
// =================================================================
frappe.ui.form.on("Shareholder", {
  /**
   * `refresh` event is triggered when the form is loaded or refreshed.
   */
  refresh: function (frm) {
    // --- UI Cleanup ---
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();
    frm.dashboard.links_area.hide();

    // --- Form Field Adjustments ---
    frm.set_df_property("naming_series", "hidden", 1);
    frm.set_df_property("title", "hidden", 1);
    frm.set_df_property("address_contacts", "hidden", 1);
    frm.set_df_property("section_break_2", "hidden", 1);
    frm.set_df_property("share_balance", "hidden", 1);
    frm.set_df_property("title", "reqd", 0);

    // --- Initial Setup ---
    set_custom_breadcrumbs();
    frm.trigger("populate_summary_html");
  },

  /**
   * Main function to orchestrate fetching data and rendering the HTML table.
   */
  async populate_summary_html(frm) {
    if (!frm.doc.name) return;

    // 1. Fetch data from the server
    const transfers = await frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Share Transfer",
        filters: { to_shareholder: frm.doc.name },
        fields: [
          "name",
          "date",
          "account_number",
          "rate",
          "no_of_shares",
          "amount",
          "from_no",
          "to_no",
          "enable_print",
        ],
        order_by: "date desc",
      },
    });

    if (!transfers.message || transfers.message.length === 0) {
      frm.fields_dict.share_transaction_details.$wrapper.html(
        `<div class="text-muted" style="margin-top: 15px;">No share transactions found.</div>`
      );
      return;
    }

    // 2. Generate the HTML for the table
    const html = generate_transactions_table_html(transfers.message);
    frm.fields_dict.share_transaction_details.$wrapper.html(html);

    // 3. Attach click handlers to the 'Print' buttons
    attach_print_handlers(frm, transfers.message);
  },

  /**
   * `onload` is triggered when the form is first loaded.
   */
  onload: function (frm) {
    set_custom_breadcrumbs();
  },
});

// =================================================================
// Helper Functions
// =================================================================

/**
 * Generates the complete HTML structure for the share transactions table.
 * @param {Array} transfers - Array of share transfer documents.
 * @returns {String} - The complete HTML string for the table.
 */
function generate_transactions_table_html(transfers) {
  // --- Helper functions for formatting ---
  const formatAmountIndian = (x) => {
    if (!x) return "";
    let [intPart, decPart] = x.toString().split(".");
    let lastThree = intPart.slice(-3);
    let otherNumbers = intPart.slice(0, -3);
    if (otherNumbers) lastThree = "," + lastThree;
    return (
      otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") +
      lastThree +
      (decPart ? "." + decPart : "")
    );
  };

  const formatDate = (d) => {
    if (!d) return "";
    const date = frappe.datetime.str_to_obj(d);
    return [
      String(date.getDate()).padStart(2, "0"),
      String(date.getMonth() + 1).padStart(2, "0"),
      date.getFullYear(),
    ].join("/");
  };

  // --- Generate table rows with Sr. No ---
  const rows = transfers
    .map((t, index) => {
      const btn_id = `btn_print_${t.name.replace(/[^a-zA-Z0-9]/g, "")}`;
      const actionHtml = t.enable_print
        ? `<button class="btn btn-sm btn-success" id="${btn_id}">Print Share Certificate</button>`
        : `<div class="print-disabled-msg">Needs approval from <br>the Operations team to <br>print the certificate again.</div>`;

      return `
        <tr>
          <td>${index + 1}</td>
          <td><a href="/app/share-transfer/${t.name}" target="_blank">${
        t.name
      }</a></td>
          <td>${formatDate(t.date)}</td>
          <td>${t.account_number || ""}</td>
          <td>${t.rate || ""}</td>
          <td>${t.no_of_shares || ""}</td>
          <td>${formatAmountIndian(t.amount)}</td>
          <td>${t.from_no || ""}</td>
          <td>${t.to_no || ""}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
    })
    .join("");

  // --- Assemble the final HTML with embedded CSS ---
  return `
  <style>
    .simple-share-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 15px; 
      font-size: 13px; 
    }
    .simple-share-table th, .simple-share-table td {
      padding: 12px 8px;
      text-align: left; 
      vertical-align: middle; 
      border-bottom: 1px solid #e9ecef;
    }
    /* Center only Action column */
    .simple-share-table th:last-child,
    .simple-share-table td:last-child {
      text-align: center;
    }
    /* Override disabled msg inside Action column to left */
    .simple-share-table .print-disabled-msg {
      text-align: left;
      color: var(--red-600);
      font-size: 12px;
      line-height: 1.4;
      display: inline-block; /* keeps it neat */
    }
    .simple-share-table thead th { 
      background-color: #f8f9fa; 
      font-weight: 600; 
      color: #495057; 
      border-bottom-width: 2px; 
    }
    .simple-share-table tbody tr:hover { 
      background-color: #f1f3f5; 
    }
    .simple-share-table td a { 
      color: var(--primary-color); 
      font-weight: 500; 
    }
    .simple-share-table .btn { 
      font-size: 12px; 
      padding: 4px 10px; 
    }
  </style>

  <p style="font-size: 13.5px; line-height: 1.5;">
    <strong>Note: The Share Investment Certificate can be printed only once via the MYSAHAYOG portal. 
    For printing issues, contact the central team at 
    <a href="mailto:supportdesk@sahayogmultistate.com" style="color: #1a73e8; text-decoration: none;">
      supportdesk@sahayogmultistate.com
    </a>.</strong>
  </p>

  <table class="simple-share-table">
    <thead>
      <tr>
        <th>Sr. No</th>
        <th>Share Certificate No</th>
        <th>Date</th>
        <th>Account</th>
        <th>Rate</th>
        <th>No. of Shares</th>
        <th>Amount</th>
        <th>From No</th>
        <th>To No</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
`;
}

/**
 * Attaches click event handlers to the 'Print' buttons in the table.
 * @param {Object} frm - The form object.
 * @param {Array} transfers - Array of share transfer documents.
 */
function attach_print_handlers(frm, transfers) {
  const wrapper = frm.fields_dict.share_transaction_details.$wrapper;

  transfers.forEach((t) => {
    if (!t.enable_print) return;

    const btn_id = `btn_print_${t.name.replace(/[^a-zA-Z0-9]/g, "")}`;
    wrapper.find(`#${btn_id}`).on("click", () => {
      frappe.dom.freeze(__("Generating Certificate..."));
      frappe.call({
        method:
          "sahayog.api.generate_share_certificate.generate_share_certificate",
        args: { transfer_doc_name: t.name },
        callback: function (r) {
          frappe.dom.unfreeze();
          if (r.message && r.message.file_data) {
            const { file_data } = r.message;
            const byteCharacters = atob(file_data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/pdf" });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, "_blank");

            frm.trigger("populate_summary_html");
          } else {
            frappe.msgprint({
              title: __("Error"),
              indicator: "red",
              message: __(
                "Could not generate the certificate. Please contact support."
              ),
            });
          }
        },
      });
    });
  });
}

/**
 * Sets custom breadcrumbs for the form view.
 */
function set_custom_breadcrumbs(frm) {
  const breadcrumbs = document.getElementById("navbar-breadcrumbs");
  if (breadcrumbs) {
    breadcrumbs.innerHTML = ""; // Clear existing

    // Home link
    const homeLi = document.createElement("li");
    const homeA = document.createElement("a");
    homeA.href = "/app/shareholder-management/";
    homeA.innerText = "Home";
    homeLi.appendChild(homeA);

    // Shareholder List link
    const listLi = document.createElement("li");
    const listA = document.createElement("a");
    listA.href = "/app/shareholder/view/list";
    listA.innerText = "Shareholder List";
    listLi.appendChild(listA);

    // Append to breadcrumbs
    breadcrumbs.appendChild(homeLi);
    breadcrumbs.appendChild(listLi);
  }
}
