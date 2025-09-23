frappe.ui.form.on("Shareholder", {
  refresh: function (frm) {
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
          "amount",
          "from_no",
          "to_no",
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
      if (otherNumbers != "") {
        lastThree = "," + lastThree;
      }
      let formatted =
        otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") +
        lastThree +
        decPart;
      return formatted;
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
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Date</th>
                        <th>Account Number</th>
                        <th>Rate</th>
                        <th>Amount</th>
                        <th>From No</th>
                        <th>To No</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

    transfers.message.forEach((t) => {
      html += `
                <tr>
                    <td><a href="/app/share-transfer/${
                      t.name
                    }" target="_blank">${t.name}</a></td>
                    <td>${formatDate(t.date)}</td>
                    <td>${t.account_number || ""}</td>
                    <td>${t.rate || ""}</td>
                    <td>${formatAmountIndian(t.amount)}</td>
                    <td>${t.from_no || ""}</td>
                    <td>${t.to_no || ""}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" id="btn_${t.name.replace(
                          /[^a-zA-Z0-9]/g,
                          ""
                        )}">
                            Certificate
                        </button>
                    </td>
                </tr>
            `;
    });

    html += `</tbody></table>`;

    frm.set_df_property("share_transaction_details", "options", html);

    // Attach click handlers for Certificate buttons
    transfers.message.forEach((t) => {
      const btn = document.getElementById(
        `btn_${t.name.replace(/[^a-zA-Z0-9]/g, "")}`
      );
      if (btn) {
        btn.addEventListener("click", () => {
          frappe.msgprint({
            title: __("Certificate"),
            message: `Share Transfer Name: <strong>${t.name}</strong>`,
          });
        });
      }
    });
  },
});
