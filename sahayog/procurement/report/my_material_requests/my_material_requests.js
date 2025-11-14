frappe.query_reports["My Material Requests"] = {
  filters: [
    { fieldname: "from_date", label: __("From Date"), fieldtype: "Date" },
    { fieldname: "to_date", label: __("To Date"), fieldtype: "Date" },
    {
      fieldname: "status",
      label: __("Status"),
      fieldtype: "Select",
      options: [
        "All",
        "Draft",
        "Pending Reporting Person Approval",
        "Pending HO Approval",
        "Approved",
        "In Progress",
        "Partially Completed",
        "Completed",
        "Rejected",
        "Cancelled",
      ],
      default: "All",
    },
    {
      fieldname: "request_type",
      label: __("Request Type"),
      fieldtype: "Select",
      options: ["All", "New", "Return", "Issue"],
      default: "All",
    },
  ],

  get_data: function (filters) {
    let query_filters = [];

    // Clean empty date entries (IMPORTANT)
    if (!filters.from_date) delete filters.from_date;
    if (!filters.to_date) delete filters.to_date;

    // Status
    if (filters.status && filters.status !== "All") {
      query_filters.push([
        "Employee Material Request",
        "status",
        "=",
        filters.status,
      ]);
    }

    // Request Type
    if (filters.request_type && filters.request_type !== "All") {
      query_filters.push([
        "Employee Material Request",
        "request_type",
        "=",
        filters.request_type,
      ]);
    }

    // Date filters
    if (filters.from_date && filters.to_date) {
      query_filters.push([
        "Employee Material Request",
        "request_date",
        "between",
        [filters.from_date, filters.to_date],
      ]);
    } else if (filters.from_date) {
      query_filters.push([
        "Employee Material Request",
        "request_date",
        ">=",
        filters.from_date,
      ]);
    } else if (filters.to_date) {
      query_filters.push([
        "Employee Material Request",
        "request_date",
        "<=",
        filters.to_date,
      ]);
    }

    return frappe.db.get_list("Employee Material Request", {
      fields: [
        "name",
        "employee",
        "request_date",
        "request_type",
        "status",
        "remark",
      ],
      filters: query_filters,
      order_by: "request_date desc",
      limit_page_length: 50,
    });
  },
};
