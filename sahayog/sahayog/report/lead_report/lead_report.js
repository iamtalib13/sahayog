// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Lead Report"] = {
  onload: function (report) {
  // 🔘 Add 'Clear Filters' button on the report action bar                                                                   
        report.page.add_inner_button(__("Clear Filters"), function () {                                                             
          // Reset all custom filter fields to empty                                                                                
          report.set_filter_value("custom_branch", "");                                                                             
          report.set_filter_value("sol_id", "");                                                                                    
          report.set_filter_value("custom_employee_id", "");                                                                        
          report.set_filter_value("custom_employee_name", "");                                                                      
                                                                                                                                    
          // Refresh report data after clearing filters                                                                             
          report.refresh();                                                                                                         
        });     
  },

  filters: [
    {
      fieldname: "custom_branch",
      label: "Branch",
      fieldtype: "Link",
      options: "Branch",
    },
    {
      fieldname: "sol_id",
      label: "SOL ID",
      fieldtype: "Data",
    },
    {
      fieldname: "custom_employee_id",
      label: "Employee ID",
      fieldtype: "Link",
      options: "Employee",
    },
    {
      fieldname: "custom_employee_name",
      label: "Employee Name",
      fieldtype: "Data",
    },
  ],
};


