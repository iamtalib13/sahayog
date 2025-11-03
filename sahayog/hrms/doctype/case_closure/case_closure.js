// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Case Closure", {
  onload(frm) {
    if (!frm.doc.case_id) return;

    // 1️⃣ Try fetching from Domestic Enquiry
    frappe.db
      .get_value("Domestic Enquiry", { case_id: frm.doc.case_id }, [
        "domestic_enquiry",
        "place_of_enquiry",
        "status_of_response",
        "date_of_enquiry",
        "enquiry_officer_name",
      ])
      .then((de_res) => {
        console.log("🟡 Domestic Enquiry fetched data:", de_res.message);
        if (de_res.message && Object.keys(de_res.message).length > 0) {
          const de = de_res.message;
          frm.set_value("domestic_enquiry", de.domestic_enquiry);
          frm.set_value("place_of_enquiry", de.place_of_enquiry);
          frm.set_value("status_of_response", de.status_of_response);
          frm.set_value("date_of_enquiry", de.date_of_enquiry);
          frm.set_value("enquiry_officer_name", de.enquiry_officer_name);
        } else {
          // 2️⃣ If no Domestic Enquiry found, fetch from Enquiry Reminder
          frappe.db
            .get_value("Enquiry Reminder", { case_id: frm.doc.case_id }, [
              "domestic_enquiry",
              "place_of_enquiry",
              "status_of_response",
              "date_of_enquiry",
              "enquiry_officer_name",
              "enquiry_status",
            ])
            .then((r) => {
              console.log("🔍 Enquiry Reminder fetched data:", r.message);
              if (r.message) {
                const data = r.message;
                frm.set_value("domestic_enquiry", data.domestic_enquiry);
                frm.set_value("place_of_enquiry", data.place_of_enquiry);
                frm.set_value("status_of_response", data.status_of_response);
                frm.set_value("date_of_enquiry", data.date_of_enquiry);
                frm.set_value(
                  "enquiry_officer_name",
                  data.enquiry_officer_name
                );
                frm.set_value("enquiry_status", data.enquiry_status);
              }
            });
        }
      });
  },

  before_save(frm) {
    if (frm.doc.case_id) {
      frappe.call({
        method:
          "sahayog.hrms.doctype.case_closure.case_closure.close_linked_case",
        args: { case_id: frm.doc.case_id },
        async: false,
      });
    }
  },

  after_save(frm) {
    frappe.msgprint({
      title: __("Success"),
      message: __("The case has been closed successfully."),
      indicator: "green",
    });
  },
  refresh(frm) {
    frm.trigger("show_print_button");
  },
  show_print_button: function (frm) {
    if (!frm.is_new()) {
      const allowed_roles = ["System Manager", "Share Admin"];
      if (!frappe.user_roles.some((role) => allowed_roles.includes(role)))
        return;

      frm
        .add_custom_button(__("Print"), function () {
          const overlay = document.createElement("div");
          overlay.style = `
                position: fixed; top:0; left:0;
                width:100%; height:100%;
                background: rgba(255,255,255,0.65);
                display:flex; align-items:center; justify-content:center;
                font-size:18px; z-index:99999;
            `;
          overlay.innerHTML = "Preparing print...";
          document.body.appendChild(overlay);

          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = frappe.urllib.get_full_url(
            `/printview?doctype=${encodeURIComponent(frm.doc.doctype)}` +
              `&name=${encodeURIComponent(frm.doc.name)}` +
              `&format=${encodeURIComponent("Case Closure Reports")}`
          );
          document.body.appendChild(iframe);

          iframe.onload = () => {
            const doc = iframe.contentWindow.document;

            const style = doc.createElement("style");
            style.innerHTML = `
                    @page {
                        size: A4;
                        margin: 0 !important;
                    }

                    html, body {
                        margin:0 !important;
                        padding:0 !important;
                        width:210mm !important;
                        height:297mm !important;
                        overflow:hidden !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .print-page {
                        position:relative;
                        width:210mm; height:297mm;
                        overflow:hidden;
                    }

                    .print-body {
                        padding: 145px 30px 40px 30px;
                        height:100%;
                        box-sizing:border-box;
                        page-break-inside: avoid;
                    }
                `;
            doc.head.appendChild(style);

            const original = doc.body.innerHTML;

            doc.body.innerHTML = `
                    <div class="print-page">
                        ${original}
                    </div>
                `;

            setTimeout(() => {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }, 500);

            const cleanup = () => {
              overlay.remove();
              iframe.remove();
            };
            iframe.contentWindow.addEventListener("afterprint", cleanup);
            setTimeout(cleanup, 5000);
          };

          iframe.onerror = () => {
            frappe.msgprint("Error loading print preview");
            overlay.remove();
            iframe.remove();
          };
        })
        .addClass("btn-primary");
    }
  },
});
