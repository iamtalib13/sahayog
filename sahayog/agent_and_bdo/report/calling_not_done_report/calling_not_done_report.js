frappe.query_reports["Calling Not Done Report"] = {
  filters: [
    {
      fieldname: "from_date",
      label: "From Date",
      fieldtype: "Date",
      reqd: 1,
      default: frappe.datetime.month_start(),
    },
    {
      fieldname: "to_date",
      label: "To Date",
      fieldtype: "Date",
      reqd: 1,
      default: frappe.datetime.get_today(),
    },
    {
      fieldname: "trainer",
      label: "Trainer (Employee)",
      fieldtype: "Link",
      options: "Employee",
    },
  ],
};
