frappe.query_reports["Follow-up Report"] = {
  filters: [
    {
      fieldname: "from_date",
      label: "From Date",
      fieldtype: "Date",
      default: frappe.datetime.month_start(),
    },
    {
      fieldname: "to_date",
      label: "To Date",
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
    },
    {
      fieldname: "trainer",
      label: "Trainer",
      fieldtype: "Link",
      options: "User",
    },
    {
      fieldname: "follow_up_date",
      label: "Follow-up Date",
      fieldtype: "Date",
    },
  ],
};
