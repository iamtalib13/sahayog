// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Meeting", {
  refresh(frm) {
    format_time_field(frm, "start_time");
    format_time_field(frm, "end_time");
  },
  start_time(frm) {
    format_time_field(frm, "start_time");
  },
  end_time(frm) {
    format_time_field(frm, "end_time");
  },
  branch(frm) {
    if (!frm.doc.branch) return;
    frm.set_value("attendee_type", "");
    frm.clear_table("attandees_table");
    frm.refresh_field("attandees_table");
  },
  attendee_type(frm) {
    if (!frm.doc.branch || !frm.doc.attendee_type) return;

    frappe.call({
      method: "sahayog.agent_and_bdo.doctype.meeting.meeting.get_branch_attendees",
      args: {
        branch: frm.doc.branch,
        attendee_type: frm.doc.attendee_type,
      },
      callback: function (r) {
        if (!r.message || !r.message.length) return;

        frm.clear_table("attandees_table");
        r.message.forEach(function (row) {
          let child = frm.add_child("attandees_table");
          child.reference_doctype = row.reference_doctype;
          child.agent_employee = row.agent_employee;
          child.full_name = row.full_name;
        });
        frm.refresh_field("attandees_table");
      },
    });
  },
});
frappe.ui.form.on("Attendees", {
  agent_employee(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (!row.agent_employee) {
      frappe.model.set_value(cdt, cdn, "full_name", "");
      return;
    }

    if (row.reference_doctype && row.agent_employee) {
      frm.call({
        method: "get_agent_full_name",
        args: {
          reference_doctype: row.reference_doctype,
          agent_employee: row.agent_employee,
        },
        callback: function (r) {
          if (r.message) {
            frappe.model.set_value(cdt, cdn, "full_name", r.message);
          }
        },
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
