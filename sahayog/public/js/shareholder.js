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
          "enable_print",
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

    // Attach click handlers
    transfers.message.forEach((t) => {
      let actionHtml = "";

      if (t.enable_print || t.enable_print == 1) {
        // ✅ allow download
        actionHtml = `
    <span>Print certificate</span><br>
    <button class="btn btn-sm btn-success" id="btn_${t.name.replace(
      /[^a-zA-Z0-9]/g,
      ""
    )}">Print</button>
  `;
      } else {
        // ❌ block download, show message instead of button
        actionHtml = `
    <span style="color:red; font-size:12px;">
      You cannot Print certificate without approval.<br>Please contact the operations team.
    </span>
  `;
      }

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
      <td>${actionHtml}</td>
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
          console.log("clicked");
          frappe.dom.freeze(__("Printing..."));
          frappe.call({
            method:
              "sahayog.api.generate_share_certificate.generate_share_certificate",
            args: { transfer_doc_name: t.name },
            callback: function (r) {
              frappe.dom.unfreeze();
              if (r.message) {
                const file_data_base64 = r.message.file_data;
                const file_name = r.message.file_name;

                // Convert base64 to Blob
                const byteCharacters = atob(file_data_base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: "application/pdf" });

                // Open PDF in a new tab for preview
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, "_blank");

                // Optional: trigger download as well
                // const link = document.createElement('a');
                // link.href = blobUrl;
                // link.download = file_name;
                // document.body.appendChild(link);
                // link.click();
                // document.body.removeChild(link);
              } else {
                frappe.msgprint({
                  title: __("Error"),
                  indicator: "red",
                  message: __("Could not generate the certificate."),
                });
              }
            },
          });
        });
      }
    });
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
