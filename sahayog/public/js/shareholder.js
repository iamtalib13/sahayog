frappe.ui.form.on("Shareholder", {
  refresh: function (frm) {
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();
    frm.dashboard.links_area.hide();
    set_custom_breadcrumbs(frm);
    frm.set_df_property("naming_series", "hidden", 1);
    frm.set_df_property("title", "hidden", 1);
    frm.set_df_property("address_contacts", "hidden", 1);
    frm.set_df_property("section_break_2", "hidden", 1);
    frm.set_df_property("share_balance", "hidden", 1);
    frm.set_df_property("title", "reqd", 0);

    frm.trigger("populate_summary_html");
  },

  async populate_summary_html(frm) {
    if (!frm.doc.name) return;

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
          "download_counter",
        ],
        order_by: "date desc",
      },
    });

    function formatAmountIndian(x) {
      if (!x) return "";
      x = x.toString().split(".");
      let intPart = x[0];
      let decPart = x.length > 1 ? "." + x[1] : "";
      let lastThree = intPart.slice(-3);
      let otherNumbers = intPart.slice(0, -3);
      if (otherNumbers != "") lastThree = "," + lastThree;
      return (
        otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + decPart
      );
    }

    function formatDate(d) {
      if (!d) return "";
      const dateObj = new Date(d);
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    }

    let html = `
      <h3>Share Transaction Details</h3>
      <table class="table table-bordered">
        <thead>
          <tr>
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
        <tbody>
    `;

    transfers.message.forEach((t) => {
      const isPrinted = t.download_counter && t.download_counter > 0;
      const buttonText = isPrinted ? "Already Printed" : "Print";
      const buttonClass = isPrinted
        ? "btn btn-sm btn-secondary"
        : "btn btn-sm btn-primary";

      html += `
        <tr>
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
          <td>
            <button class="${buttonClass}" 
                    id="btn_${t.name.replace(/[^a-zA-Z0-9]/g, "")}" 
                    data-download-counter="${t.download_counter || 0}">
              ${buttonText}
            </button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;

    frm.set_df_property("share_transaction_details", "options", html);

    // Attach click handlers
    transfers.message.forEach((t) => {
      const btn = document.getElementById(
        `btn_${t.name.replace(/[^a-zA-Z0-9]/g, "")}`
      );

      if (btn) {
        btn.addEventListener("click", () => {
          const downloadCounter =
            parseInt(btn.getAttribute("data-download-counter")) || 0;

          // If already printed → just show alert
          if (downloadCounter > 0) {
            frappe.show_alert(
              {
                message: __("Please contact to Operation Department"),
                indicator: "red",
              },
              10
            );
            return;
          }

          // Otherwise → normal download
          frappe.dom.freeze(__("Downloading..."));

          frappe.call({
            method:
              "sahayog.api.generate_share_certificate.generate_share_certificate",
            args: { transfer_doc_name: cur_frm.doc.name },
            callback: function (r) {
              if (r.message) {
                let fileData = "data:image/png;base64," + r.message.file_data;

                // Naya window kholke image inject karo
                let printWindow = window.open("", "_blank");
                printWindow.document.write(
                  "<img src='" + fileData + "' style='width:100%'>"
                );
                printWindow.document.close();
                printWindow.focus();

                // Direct print dialog trigger
                if (r.message.auto_print) {
                  printWindow.print();
                }
              }
            },
          });
        });
      }
    });

    // Download helper
    function trigger_download(file_data_base64, file_name) {
      const link = document.createElement("a");
      link.href = `data:image/png;base64,${file_data_base64}`;
      link.download = file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  onload: function (frm) {
    set_custom_breadcrumbs(frm);
  },
});

// Function to replace breadcrumbs
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
