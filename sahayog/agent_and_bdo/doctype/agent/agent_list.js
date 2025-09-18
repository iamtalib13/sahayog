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

    // Download Report button - downloads complete Agent data
    listview.page.add_inner_button(__("Download Report"), () => {
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
          ],
          limit_page_length: 0, // Get all records
          order_by: "creation desc",
        },
        freeze: true,
        freeze_message: __("Preparing download..."),
        callback: function (r) {
          if (r.message && r.message.length) {
            // Convert data to CSV format
            const csvData = convertToCSV(r.message);

            // Create filename with current date
            const today = new Date().toISOString().split("T")[0];
            const filename = `Agent_Report_${today}.csv`;

            // Download the CSV file
            downloadCSV(csvData, filename);

            frappe.show_alert({
              message: __("Report downloaded successfully with {0} records", [
                r.message.length,
              ]),
              indicator: "green",
            });
          } else {
            frappe.msgprint(__("No data found to export"));
          }
        },
      });
    });

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
