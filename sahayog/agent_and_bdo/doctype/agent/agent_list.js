frappe.listview_settings["Agent"] = {
  onload(listview) {
    // Hide sidebar elements
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();

    // Check if user has the required roles
    const hasRequiredRole =
      frappe.user.has_role("System Manager") ||
      frappe.user.has_role("MIS Admin");

    if (!hasRequiredRole) {
      return; // Exit early if user doesn't have required roles
    }

    // Bulk Unallocate button - only visible to System Manager and MIS Admin
    listview.page.add_inner_button(__("Bulk Unallocate by Employee"), () => {
      let d = new frappe.ui.Dialog({
        title: __("Select Employee to Unallocate Agents"),
        size: "large",
        fields: [
          {
            label: "Employee",
            fieldname: "employee",
            fieldtype: "Link",
            options: "Employee",
            reqd: 1,
            change: function () {
              let employee = d.get_value("employee");
              if (employee) {
                frappe.call({
                  method: "frappe.client.get_list",
                  args: {
                    doctype: "Agent",
                    filters: {
                      employee: employee,
                      status: "Allocated",
                    },
                    fields: ["name", "agent_name"],
                  },
                  callback: function (r) {
                    let html = "";
                    if (r.message && r.message.length) {
                      html += `
                        <div style="margin-bottom: 10px;">
                          <button class="btn btn-xs btn-default" id="select_all">Select All</button>
                          <button class="btn btn-xs btn-default" id="unselect_all">Unselect All</button>
                        </div>
                        <div style="max-height: 250px; overflow-y: auto; border: 1px solid #d1d8dd; padding: 8px; border-radius: 4px;">
                      `;

                      html += r.message
                        .map(
                          (row) =>
                            `<div>
                              <label>
                                <input type="checkbox" class="agent-checkbox" value="${row.name}" checked>
                                <b>${row.agent_name}</b> (${row.name})
                              </label>
                            </div>`
                        )
                        .join("");

                      html += "</div>";
                    } else {
                      html = "<p>No allocated agents found.</p>";
                    }
                    d.set_df_property("agent_list_html", "options", html);

                    // Re-bind buttons after rendering
                    setTimeout(() => {
                      d.$wrapper.find("#select_all").on("click", () => {
                        d.$wrapper
                          .find(".agent-checkbox")
                          .prop("checked", true);
                      });
                      d.$wrapper.find("#unselect_all").on("click", () => {
                        d.$wrapper
                          .find(".agent-checkbox")
                          .prop("checked", false);
                      });
                    }, 200);
                  },
                });
              }
            },
          },
          {
            fieldtype: "HTML",
            fieldname: "agent_list_html",
            label: "Agents",
          },
        ],
        primary_action_label: __("Unallocate Selected"),
        primary_action(values) {
          let selected = [];
          d.$wrapper.find(".agent-checkbox:checked").each(function () {
            selected.push($(this).val());
          });

          if (!selected.length) {
            frappe.msgprint(
              __("Please select at least one agent to unallocate.")
            );
            return;
          }

          frappe.confirm(
            __("Are you sure you want to unallocate {0} agent(s)?", [
              selected.length,
            ]),
            () => {
              frappe.call({
                method:
                  "sahayog.agent_and_bdo.doctype.agent.agent.bulk_unallocate",
                args: { agent_names: JSON.stringify(selected) },
                freeze: true,
                freeze_message: __("Unallocating Agents..."),
                callback: function (r) {
                  if (r.message?.success) {
                    frappe.show_alert({
                      message: r.message.message,
                      indicator: "red",
                    });
                    d.hide();
                    listview.refresh();
                  } else {
                    frappe.msgprint(r.message.message);
                  }
                },
              });
            }
          );
        },
      });
      d.show();
    });

    // Bulk Transfer button - only visible to System Manager and MIS Admin
    listview.page.add_inner_button(__("Bulk Transfer by Employee"), () => {
      let d = new frappe.ui.Dialog({
        title: __("Bulk Transfer Agents"),
        size: "large",
        fields: [
          {
            label: "From Employee",
            fieldname: "from_employee",
            fieldtype: "Link",
            options: "Employee",
            reqd: 1,
            change: function () {
              let from_emp = d.get_value("from_employee");
              if (from_emp) {
                frappe.call({
                  method: "frappe.client.get_list",
                  args: {
                    doctype: "Agent",
                    filters: {
                      employee: from_emp,
                      status: "Allocated",
                    },
                    fields: ["name", "agent_name"],
                  },
                  callback: function (r) {
                    let html = "";
                    if (r.message && r.message.length) {
                      html += `
                        <div style="margin-bottom: 10px;">
                          <button class="btn btn-xs btn-default" id="select_all">Select All</button>
                          <button class="btn btn-xs btn-default" id="unselect_all">Unselect All</button>
                        </div>
                        <div style="max-height: 250px; overflow-y: auto; border: 1px solid #d1d8dd; padding: 8px; border-radius: 4px;">
                      `;

                      html += r.message
                        .map(
                          (row) =>
                            `<div>
                              <label>
                                <input type="checkbox" class="agent-checkbox" value="${row.name}" checked>
                                <b>${row.agent_name}</b> (${row.name})
                              </label>
                            </div>`
                        )
                        .join("");

                      html += "</div>";
                    } else {
                      html = "<p>No allocated agents found.</p>";
                    }
                    d.set_df_property("agent_list_html", "options", html);

                    // Re-bind buttons
                    setTimeout(() => {
                      d.$wrapper.find("#select_all").on("click", () => {
                        d.$wrapper
                          .find(".agent-checkbox")
                          .prop("checked", true);
                      });
                      d.$wrapper.find("#unselect_all").on("click", () => {
                        d.$wrapper
                          .find(".agent-checkbox")
                          .prop("checked", false);
                      });
                    }, 200);
                  },
                });
              }
            },
          },
          {
            label: "To Employee",
            fieldname: "to_employee",
            fieldtype: "Link",
            options: "Employee",
            reqd: 1,
          },
          {
            fieldtype: "HTML",
            fieldname: "agent_list_html",
            label: "Agents",
          },
        ],
        primary_action_label: __("Transfer Selected"),
        primary_action(values) {
          let selected = [];
          d.$wrapper.find(".agent-checkbox:checked").each(function () {
            selected.push($(this).val());
          });

          if (!selected.length) {
            frappe.msgprint(
              __("Please select at least one agent to transfer.")
            );
            return;
          }
          if (!values.to_employee) {
            frappe.msgprint(__("Please select the target employee."));
            return;
          }

          frappe.confirm(
            __("Are you sure you want to transfer {0} agent(s) to {1}?", [
              selected.length,
              values.to_employee,
            ]),
            () => {
              frappe.call({
                method:
                  "sahayog.agent_and_bdo.doctype.agent.agent.bulk_transfer",
                args: {
                  agent_names: JSON.stringify(selected),
                  to_employee: values.to_employee,
                },
                freeze: true,
                freeze_message: __("Transferring Agents..."),
                callback: function (r) {
                  if (r.message?.success) {
                    frappe.show_alert({
                      message: r.message.message,
                      indicator: "green",
                    });
                    d.hide();
                    listview.refresh();
                  } else {
                    frappe.msgprint(r.message.message);
                  }
                },
              });
            }
          );
        },
      });
      d.show();
    });

    // Download Report button - downloads complete Agent data with Employee details
    listview.page.add_inner_button(__("Download Report"), () => {
      // Step 1: Get all Agent data
      frappe.call({
        method: "frappe.client.get_list",
        args: {
          doctype: "Agent",
          fields: [
            "name",
            "status",
            "agent_code",
            "agent_name",
            "agent_status",
            "branch_code",
            "branch_name",
            "role",
            "employee",
            "creation",
          ],
          limit_page_length: 0,
          order_by: "creation desc",
        },
        freeze: true,
        freeze_message: __("Fetching Agent data..."),
        callback: function (r) {
          if (r.message && r.message.length) {
            // Step 2: Get unique employee IDs
            const employeeIds = [
              ...new Set(
                r.message
                  .filter((agent) => agent.employee)
                  .map((agent) => agent.employee)
              ),
            ];

            if (employeeIds.length > 0) {
              // Step 3: Fetch Employee data for all employees
              frappe.call({
                method: "frappe.client.get_list",
                args: {
                  doctype: "Employee",
                  fields: [
                    "name",
                    "employee_name",
                    "custom_region",
                    "custom_zone",
                    "custom_district",
                  ],
                  filters: [["name", "in", employeeIds]],
                  limit_page_length: 0,
                },
                freeze_message: __("Fetching Employee data..."),
                callback: function (emp_response) {
                  // Step 4: Create employee lookup map
                  const employeeMap = {};
                  if (emp_response.message) {
                    emp_response.message.forEach((emp) => {
                      employeeMap[emp.name] = emp;
                    });
                  }

                  // Step 5: Merge Agent and Employee data
                  const enrichedData = r.message.map((agent) => ({
                    ...agent,
                    employee_name: agent.employee
                      ? employeeMap[agent.employee]?.employee_name || ""
                      : "",
                    custom_region: agent.employee
                      ? employeeMap[agent.employee]?.custom_region || ""
                      : "",
                    custom_zone: agent.employee
                      ? employeeMap[agent.employee]?.custom_zone || ""
                      : "",
                    custom_district: agent.employee
                      ? employeeMap[agent.employee]?.custom_district || ""
                      : "",
                  }));

                  // Step 6: Generate and download CSV
                  generateAndDownloadCSV(enrichedData);
                },
              });
            } else {
              // No employees found, download with Agent data only
              const enrichedData = r.message.map((agent) => ({
                ...agent,
                employee_name: "",
                custom_region: "",
                custom_zone: "",
                custom_district: "",
              }));
              generateAndDownloadCSV(enrichedData);
            }
          } else {
            frappe.msgprint(__("No data found to export"));
          }
        },
      });
    });

    // Function to generate and download CSV
    function generateAndDownloadCSV(data) {
      // Convert data to CSV with proper headers
      const csvData = convertToCSVWithEmployeeData(data);

      // Create filename with current date
      const today = new Date().toISOString().split("T")[0];
      const filename = `Agent_Report_${today}.csv`;

      // Download the CSV file
      downloadCSV(csvData, filename);

      frappe.show_alert({
        message: __("Report downloaded successfully with {0} records", [
          data.length,
        ]),
        indicator: "green",
      });
    }

    // Updated CSV converter function with Employee fields
    function convertToCSVWithEmployeeData(data) {
      if (!data || data.length === 0) return "";

      // Define headers in desired order
      const headers = [
        "name",
        "status",
        "agent_code",
        "agent_name",
        "agent_status",
        "branch_code",
        "branch_name",
        "role",
        "employee",
        "employee_name",
        "custom_region",
        "custom_zone",
        "custom_district",
        "creation",
      ];

      const headerLabels = [
        "Agent ID",
        "Status",
        "Agent Code",
        "Agent Name",
        "Agent Status",
        "Branch Code",
        "Branch Name",
        "Role",
        "Employee ID",
        "Employee Name",
        "Region",
        "Zone",
        "District",
        "Created Date",
      ];

      // Create CSV content
      let csvContent = headerLabels.join(",") + "\n";

      data.forEach((row) => {
        const values = headers.map((header) => {
          let value = row[header] || "";

          // Format creation date
          if (header === "creation" && value) {
            try {
              const date = new Date(value);
              value = date.toLocaleString();
            } catch (e) {
              // Keep original value if date parsing fails
            }
          }

          // Escape commas and quotes in values
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"') || value.includes("\n"))
          ) {
            value = '"' + value.replace(/"/g, '""') + '"';
          }
          return value;
        });
        csvContent += values.join(",") + "\n";
      });

      return csvContent;
    }

    // Helper function to download CSV file (same as before)
    function downloadCSV(csvData, filename) {
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });

      if (navigator.msSaveBlob) {
        // IE 10+
        navigator.msSaveBlob(blob, filename);
      } else {
        // Modern browsers
        const link = document.createElement("a");
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", filename);
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
    }

    // Helper function to convert data to CSV
    function convertToCSV(data) {
      if (!data || data.length === 0) return "";

      // Get headers from the first object
      const headers = Object.keys(data[0]);

      // Create CSV content
      let csvContent = headers.join(",") + "\n";

      data.forEach((row) => {
        const values = headers.map((header) => {
          let value = row[header] || "";
          // Escape commas and quotes in values
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"') || value.includes("\n"))
          ) {
            value = '"' + value.replace(/"/g, '""') + '"';
          }
          return value;
        });
        csvContent += values.join(",") + "\n";
      });

      return csvContent;
    }

    // Helper function to download CSV file
    function downloadCSV(csvData, filename) {
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });

      if (navigator.msSaveBlob) {
        // IE 10+
        navigator.msSaveBlob(blob, filename);
      } else {
        // Modern browsers
        const link = document.createElement("a");
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", filename);
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
    }
  },
};
