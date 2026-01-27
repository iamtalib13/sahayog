// =================================================================
// Main Event Handlers for Shareholder Doctype
// =================================================================
frappe.ui.form.on("Shareholder", {
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
          "serial_number",
        ],
        order_by: "date desc",
      },
    });

    const data = transfers.message || [];
    if (data.length === 0) {
      frm.fields_dict.share_transaction_details.$wrapper.html(
        `<div class="text-muted" style="margin-top: 15px;">No share transactions found.</div>`
      );
      return;
    }

    const html = generate_transactions_table_html(data);
    frm.fields_dict.share_transaction_details.$wrapper.html(html);
    attach_print_handlers(frm, data);
  },

  onload: function (frm) {
    set_custom_breadcrumbs();
  },
});

// =================================================================
// Helper Functions
// =================================================================
function generate_transactions_table_html(transfers) {
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

  const rows = transfers
    .map((t, index) => {
      const btn_id = `btn_print_${t.name.replace(/[^a-zA-Z0-9]/g, "")}`;

      const actionHtml =
        t.enable_print === 1
          ? `<button class="btn btn-sm btn-success" id="${btn_id}">🖨️ Print Share Certificate</button>`
          : `<div class="print-disabled-msg">
              Needs approval from <br>the Operations team to <br>print the certificate again.
            </div>`;

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
        </tr>`;
    })
    .join("");

  return `
  <style>
    .simple-share-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
    .simple-share-table th, .simple-share-table td {
      padding: 12px 8px;
      text-align: left;
      vertical-align: middle;
      border-bottom: 1px solid #e9ecef;
    }
    .simple-share-table th:last-child, .simple-share-table td:last-child { text-align: center; }
    .simple-share-table .print-disabled-msg {
      text-align: left; color: var(--red-600);
      font-size: 12px; line-height: 1.4; display: inline-block;
    }
    .simple-share-table thead th {
      background-color: #f8f9fa; font-weight: 600; color: #495057; border-bottom-width: 2px;
    }
    .simple-share-table tbody tr:hover { background-color: #f1f3f5; }
    .simple-share-table td a { color: var(--primary-color); font-weight: 500; }
    .simple-share-table .btn { font-size: 12px; padding: 4px 10px; }
  </style>

  <p style="font-size: 13.5px; line-height: 1.5;">
    <strong>Note:</strong> The Share Investment Certificate can be printed only once via the MYSAHAYOG portal.
    For reprint or issues, contact the central team at
    <a href="mailto:supportdesk@sahayogmultistate.com" style="color:#1a73e8;text-decoration:none;">
      supportdesk@sahayogmultistate.com
    </a>.
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

  <div style="margin-top: 18px; padding: 12px 16px; background: linear-gradient(135deg, #fee2e2, #fecaca); border-left: 4px solid #dc2626; border-radius: 6px; font-size: 13.5px; line-height: 1.6; color: #7f1d1d; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.15);">
    🖨️ <b>Print Guideline:</b> When printing the certificate, please ensure that you select 
    <span style="background: #fca5a5; padding: 2px 5px; border-radius: 3px; font-weight: 700; color: #991b1b;">Margins: None</span> 
    in the Print Settings.
    <br><br>
    <b>हिंदी:</b> प्रमाणपत्र प्रिंट करते समय, कृपया सुनिश्चित करें कि आप प्रिंट सेटिंग्स में 
    <span style="background: #fca5a5; padding: 2px 5px; border-radius: 3px; font-weight: 700; color: #991b1b;">Margins: None</span> 
    का चयन करें।
    <br><br>
    <b>मराठी:</b> प्रमाणपत्र प्रिंट करताना, कृपया खात्री करा की तुम्ही प्रिंट सेटिंग्जमध्ये 
    <span style="background: #fca5a5; padding: 2px 5px; border-radius: 3px; font-weight: 700; color: #991b1b;">Margins: None</span> 
    निवडले आहे.
  </div>`;
}

/**
 * Handles print button logic with serial number dialog + print.
 */
function attach_print_handlers(frm, transfers) {
  const wrapper = frm.fields_dict.share_transaction_details.$wrapper;

  transfers.forEach((t) => {
    if (t.enable_print !== 1) return;

    const btn_id = `btn_print_${t.name.replace(/[^a-zA-Z0-9]/g, "")}`;

    wrapper.find(`#${btn_id}`).on("click", () => {
      const fields = [];

      if (t.serial_number) {
        // 🟢 Serial number already exists → show info card
        fields.push({
          fieldtype: "HTML",
          options: `
            <div style="
              text-align:center;
              padding: 18px;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              background: linear-gradient(135deg, #f8fafc, #f1f5f9);
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            ">
              <img src="https://cdn-icons-gif.flaticon.com/17569/17569512.gif" 
                   width="70" height="70" 
                   style="margin-bottom: 10px; mix-blend-mode: multiply;" 
                   alt="printer-icon" />
              <h4 style="margin: 0; color: #0f172a; font-weight: 600;">
                Certificate Ready for Print
              </h4>
              <div style="margin-top: 8px; font-size: 14px; color: #334155;">
                <b>Serial Number:</b> 
                <span style="color:#2563eb;">${t.serial_number}</span>
              </div>
              <p style="margin-top: 12px; font-size: 13.5px; color:#1e293b; line-height:1.6;">
                🖨️ Please insert the certificate with this serial number into the printer.<br>
                <span style="color:#0284c7;">Use only this certificate for printing.</span>
              </p>
              <div style="margin-top:12px; border-top:1px dashed #cbd5e1; padding-top:10px; font-size:12.5px; color:#475569;">
                <b>हिंदी:</b> कृपया इस सीरियल नंबर वाले प्रमाणपत्र को प्रिंटर में डालें।<br>
                <b>मराठी:</b> कृपया या क्रमांकाचा प्रमाणपत्र प्रिंटरमध्ये ठेवा.
              </div>
            </div>
          `,
        });
      } else {
        // 🟡 Serial number not yet entered → show input + info
        fields.push({
          fieldtype: "HTML",
          options: `
            <div style="
              background: linear-gradient(135deg, #ecfeff, #f0f9ff);
              border-left: 4px solid #0ea5e9;
              padding: 10px 12px;
              border-radius: 8px;
              margin-bottom: 12px;
              color: #0c4a6e;
              font-size: 13.5px;
              line-height: 1.6;
              animation: fadeIn 0.5s ease;
            ">
              <b>📋 Please enter the new certificate serial number below:</b><br>
              <b>हिंदी:</b> कृपया नीचे नए प्रमाणपत्र का सीरियल नंबर दर्ज करें।<br>
              <b>मराठी:</b> कृपया खाली नवीन प्रमाणपत्राचा क्रमांक प्रविष्ट करा.
            </div>
            <style>
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
              }
            </style>
          `,
        });

        fields.push({
          fieldname: "serial_number",
          fieldtype: "Data",
          label: "Serial Number",
          reqd: 1,
          description:
            "Enter the new certificate serial number before printing.",
        });
      }

      const d = new frappe.ui.Dialog({
        title: __("Certificate Print Confirmation"),
        fields: fields,
        primary_action_label: __("🖨️ Submit & Print"),
        async primary_action(values) {
          d.hide();

          const serial_to_save = t.serial_number || values.serial_number;

          if (!serial_to_save) {
            frappe.msgprint("Please enter the serial number.");
            return;
          }

          frappe.dom.freeze("Validating serial number...");

          // ✅ Step 1: Check duplicate before saving
          const existing = await frappe.db.get_list("Share Transfer", {
            filters: { serial_number: serial_to_save },
            fields: ["name"],
            limit: 1,
          });

          if (existing.length > 0 && existing[0].name !== t.name) {
            frappe.dom.unfreeze();
            frappe.msgprint({
              title: "Duplicate Serial Number",
              message: `
                <div style="font-size:14px;line-height:1.6;color:#334155;">
                  🚫 <b>Serial Number already exists!</b><br>
                  Please use a unique serial number for this certificate.<br><br>
                  <b>हिंदी:</b> यह सीरियल नंबर पहले से मौजूद है। कृपया नया नंबर डालें।<br>
                  <b>मराठी:</b> हा क्रमांक आधीपासून अस्तित्वात आहे. कृपया नवीन क्रमांक द्या.
                </div>
              `,
              indicator: "red",
            });
            return;
          }

          frappe.dom.freeze("Processing...");

          // ✅ Step 2: Save and print
          frappe.call({
            method: "frappe.client.set_value",
            args: {
              doctype: "Share Transfer",
              name: t.name,
              fieldname: {
                serial_number: serial_to_save,
                enable_print: 0,
              },
            },
            callback: function (r) {
              frappe.dom.unfreeze();

              if (!r.exc) {
                const print_url = frappe.urllib.get_full_url(
                  `/printview?doctype=Share%20Transfer&name=${encodeURIComponent(
                    t.name
                  )}&format=Share%20Certificate&no_letterhead=0&letterhead=${encodeURIComponent(
                    "Sahayog Letter Head"
                  )}&_lang=en`
                );

                const iframe = document.createElement("iframe");
                iframe.style.display = "none";
                iframe.src = print_url;
                document.body.appendChild(iframe);

                iframe.onload = () => {
                  setTimeout(() => {
                    iframe.contentWindow.print();
                    setTimeout(() => iframe.remove(), 5000);
                  }, 800);
                };

                frm.trigger("populate_summary_html");
              } else {
                frappe.msgprint("Failed to save serial number.");
              }
            },
          });
        },
      });

      // 💫 Smooth animation when dialog opens
      setTimeout(() => {
        d.$wrapper.find(".modal-content").css({
          transition: "transform 0.3s ease",
          transform: "scale(1.02)",
        });
        setTimeout(() => {
          d.$wrapper.find(".modal-content").css("transform", "scale(1)");
        }, 250);
      }, 100);

      d.show();
    });
  });
}

/**
 * Custom breadcrumbs.
 */
function set_custom_breadcrumbs(frm) {
  const breadcrumbs = document.getElementById("navbar-breadcrumbs");
  if (!breadcrumbs) return;
  breadcrumbs.innerHTML = "";

  const homeLi = document.createElement("li");
  const homeA = document.createElement("a");
  homeA.href = "/app/shareholder-management/";
  homeA.innerText = "Home";
  homeLi.appendChild(homeA);

  const listLi = document.createElement("li");
  const listA = document.createElement("a");
  listA.href = "/app/shareholder/view/list";
  listA.innerText = "Shareholder List";
  listLi.appendChild(listA);

  breadcrumbs.appendChild(homeLi);
  breadcrumbs.appendChild(listLi);
}
