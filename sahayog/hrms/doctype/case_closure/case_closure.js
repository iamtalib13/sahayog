frappe.ui.form.on("Case Closure", {
  onload(frm) {
    if (!frm.doc.case_id) return;

    const workflow_fields = [
      "status_of_response",
      "domestic_enquiry",
      "place_of_enquiry",
      "date_of_enquiry",
      "date_of_2nd_enquiry",
      "enquiry_officer_name",
      "enquiry_status",
    ];

    // Hide all workflow fields initially
    workflow_fields.forEach((f) => frm.set_df_property(f, "hidden", 1));

    // Fetch the latest linked enquiry for this case
    frappe.call({
      method:
        "sahayog.hrms.doctype.case_closure.case_closure.get_latest_linked_enquiry",
      args: { case_id: frm.doc.case_id },
      callback: function (r) {
        if (!r.message) return;

        const { linked_enquiry_type, linked_enquiry, data } = r.message;
        if (!linked_enquiry_type || !linked_enquiry) return;

        // Store reference silently
        frm.set_value("linked_enquiry_type", linked_enquiry_type);
        frm.set_value("linked_enquiry", linked_enquiry);

        // Define visible fields by linked doctype
        const visible_fields_by_doctype = {
          "Response to SCN": ["status_of_response", "domestic_enquiry"],
          "Domestic Enquiry": [
            "status_of_response",
            "domestic_enquiry",
            "place_of_enquiry",
            "date_of_enquiry",
            "enquiry_officer_name",
          ],
          "Enquiry Reminder": [
            "status_of_response",
            "domestic_enquiry",
            "place_of_enquiry",
            "date_of_enquiry",
            "date_of_2nd_enquiry",
            "enquiry_officer_name",
            "enquiry_status",
          ],
        };

        // Initialize fields_to_show before logging
        const fields_to_show =
          visible_fields_by_doctype[linked_enquiry_type] || [];

        console.group("Case Closure Fetch Debug");
        console.log("Linked Doctype:", linked_enquiry_type);
        console.log("Linked Record:", linked_enquiry);
        console.log("Fields requested:", fields_to_show);
        console.log("Fetched data:", data);
        console.groupEnd();

        // Unhide & populate relevant fields
        fields_to_show.forEach((f) => {
          frm.set_df_property(f, "hidden", 0);

          // Make fields read-only, except enquiry_status if source is Enquiry Reminder
          if (
            !(
              linked_enquiry_type === "Enquiry Reminder" &&
              f === "enquiry_status"
            )
          ) {
            frm.set_df_property(f, "read_only", 1);
          }

          // Populate value from fetched data
          if (data && data[f] !== undefined && data[f] !== null) {
            frm.set_value(f, data[f]);
          }
        });

        frappe.show_alert({
          message: `Fetched details from <b>${linked_enquiry_type}</b> (${linked_enquiry})`,
          indicator: "green",
        });
      },
    });
  },

  before_save(frm) {
    if (frm.doc.case_id) {
      frappe.call({
        method:
          "sahayog.hrms.doctype.case_closure.case_closure.close_linked_case",
        args: { case_id: frm.doc.case_id },
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

  show_print_button(frm) {
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
            @page { size: A4; margin: 0 !important; }
            html, body { margin:0 !important; padding:0 !important; width:210mm !important; height:297mm !important; overflow:hidden !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .print-page { position:relative; width:210mm; height:297mm; overflow:hidden; }
            .print-body { padding: 145px 30px 40px 30px; height:100%; box-sizing:border-box; page-break-inside: avoid; }
          `;
            doc.head.appendChild(style);

            const original = doc.body.innerHTML;
            doc.body.innerHTML = `<div class="print-page">${original}</div>`;

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
