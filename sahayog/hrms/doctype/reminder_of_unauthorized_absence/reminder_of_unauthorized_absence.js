frappe.ui.form.on("Reminder Of Unauthorized Absence", {
  onload: function (frm) {
    if (frm.doc.__islocal && frm.doc.case_id) {
      frappe.db
        .get_list("Unauthorized Absence", {
          filters: { case_id: frm.doc.case_id },
          order_by: "creation desc",
          limit_page_length: 1,
          fields: ["date_of_1st_letter"],
        })
        .then((list) => {
          if (list.length) {
            const firstLetterDate = list[0].date_of_1st_letter; // YYYY-MM-DD
            const formattedDate = frappe.datetime.str_to_user(firstLetterDate); // DD-MM-YYYY

            // Show formatted date in field
            frm.set_value("date_of_1st_letter", formattedDate);

            // Convert to JS Date object
            const firstDateObj = frappe.datetime.str_to_obj(firstLetterDate);

            // Restrict date picker (only dates after this)
            setTimeout(() => {
              const picker =
                frm.fields_dict["date_of_reminder_letter"].datepicker;
              if (picker) {
                // Add +1 day to allow only after the first letter date
                const minAllowed = frappe.datetime.add_days(firstLetterDate, 1);
                picker.update({
                  minDate: frappe.datetime.str_to_obj(minAllowed),
                });
              }
            }, 500);

            // Validation backup — ensures user can’t type invalid date manually
            frm.fields_dict.date_of_reminder_letter.df.onchange = function () {
              if (frm.doc.date_of_reminder_letter) {
                const reminderDateObj = frappe.datetime.str_to_obj(
                  frm.doc.date_of_reminder_letter
                );
                if (reminderDateObj <= firstDateObj) {
                  frappe.msgprint({
                    title: __("Invalid Date"),
                    message: __(
                      "Date of Reminder Unauthorized Absence must be **after** the Date of 1st Unauthorized Absence."
                    ),
                    indicator: "red",
                  });
                  frm.set_value("date_of_reminder_letter", null);
                }
              }
            };
          }
        });
    }
    if (frm.doc.case_id) {
      frappe.db
        .get_list("Unauthorized Absence", {
          filters: { case_id: frm.doc.case_id },
          order_by: "creation desc",
          limit_page_length: 1,
          fields: ["amount_of_fraud"],
        })
        .then((list) => {
          if (list.length && list[0].amount_of_fraud) {
            frm.set_value("amount_of_fraud", list[0].amount_of_fraud);
            frm.set_df_property("amount_of_fraud", "hidden", 0);
          } else {
            frm.set_value("amount_of_fraud", "");
            frm.set_df_property("amount_of_fraud", "hidden", 1);
          }
        });
    } else {
      frm.set_df_property("amount_of_fraud", "hidden", 1);
    }
  },
});
