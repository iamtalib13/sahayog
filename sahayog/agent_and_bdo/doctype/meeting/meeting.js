// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Meeting", {
  refresh(frm) {
    format_time_field(frm, "start_time");
    format_time_field(frm, "end_time");
    console.log("Meeting form refreshed");
  },
  start_time(frm) {
    format_time_field(frm, "start_time");
  },
  end_time(frm) {
    format_time_field(frm, "end_time");
  },
});
frappe.ui.form.on("Attendees", {
  agent_employee(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (row.reference_doctype && row.agent_employee) {
      // Decide which field to fetch based on doctype
      let name_field =
        row.reference_doctype === "Employee" ? "employee_name" : "agent_name";

      frappe.db
        .get_value(row.reference_doctype, row.agent_employee, name_field)
        .then((r) => {
          if (r && r.message) {
            let fetched_name = r.message[name_field];
            if (fetched_name) {
              frappe.model.set_value(cdt, cdn, "full_name", fetched_name);
            }
          }
        });
    }
  },
});

function format_time_field(frm, fieldname) {
  let time_val = frm.doc[fieldname];
  if (!time_val) return;

  let formatted_time = formatTimeToAMPM(time_val);
  console.log(`Formatted ${fieldname}:`, formatted_time);

  frm.set_df_property(
    fieldname,
    "description",
    `<b style='color:darkgreen;'>${formatted_time}</b>`
  );
}

function formatTimeToAMPM(timeStr) {
  if (!timeStr) return "";
  let [hours, minutes] = timeStr.split(":").map(Number);
  let ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}
