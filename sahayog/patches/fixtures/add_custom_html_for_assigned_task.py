import frappe

def execute():
    html_content = """
<h2 id="assigned-task-heading" style="
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', 'Helvetica Neue', Arial, sans-serif;
    font-size: 18px; 
    font-weight: bold; 
    margin-bottom: 10px;
">My Assigned Task Overview</h2>

<!-- Status Tabs -->
<div id="task-status-tabs" style="margin-bottom: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
  <button class="status-tab active" data-status="All">All</button>
  <button class="status-tab" data-status="Open">Open</button>
  <button class="status-tab" data-status="Working">Working</button>
  <button class="status-tab" data-status="Pending Review">Pending Review</button>
  <button class="status-tab" data-status="Overdue">Overdue</button>
  <button class="status-tab" data-status="Completed">Completed</button>
  <button class="status-tab" data-status="Cancelled">Cancelled</button>
</div>

<div id="assigned-task-container"></div>
"""

    css_content = """
#assigned-task-heading {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

#task-status-tabs {
  margin-bottom: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status-tab {
  padding: 6px 12px;
  background: #f1f1f1;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.status-tab.active {
  background: #007bff;
  color: white;
  font-weight: bold;
  border-color: #007bff;
}

#assigned-task-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}
"""

    js_content = """const statusColors = {
  "Open": "#007bff",
  "Working": "#17a2b8",
  "Pending Review": "#ffc107",
  "Overdue": "#dc3545",
  "Template": "#6c757d",
  "Completed": "#28a745",
  "Cancelled": "#343a40"
};

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
}

function renderAssignedTasks(statusFilter = "All") {
  const container = root_element.querySelector("#assigned-task-container");
  container.innerHTML = `<div style="color:#888;">Loading tasks...</div>`;

  let filters = {
    _assign: ["like", `%${frappe.session.user}%`]
  };

  if (statusFilter !== "All") {
    filters["status"] = statusFilter;
  }

  frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "Task",
      fields: ["name", "subject", "status", "project", "exp_end_date", "modified"],
      filters: filters,
      limit_page_length: 100
    },
    callback: function (response) {
      container.innerHTML = "";
      let tasks = response.message || [];

      tasks.sort((a, b) => {
        const dateA = new Date(a.exp_end_date || '9999-12-31');
        const dateB = new Date(b.exp_end_date || '9999-12-31');
        return dateA - dateB;
      });

      if (tasks.length === 0) {
        container.innerHTML = `<div style="color:#888;">No tasks found for "${statusFilter}".</div>`;
        return;
      }

      tasks.forEach(task => {
        frappe.call({
          method: "frappe.client.get_value",
          args: {
            doctype: "Project",
            filters: { name: task.project },
            fieldname: ["project_name"]
          },
          callback: function (project_res) {
            const projectName = project_res.message?.project_name || "N/A";

            frappe.call({
              method: "frappe.client.get_value",
              args: {
                doctype: "ToDo",
                filters: {
                  reference_type: "Task",
                  reference_name: task.name,
                  allocated_to: frappe.session.user
                },
                fieldname: ["assigned_by_full_name", "priority"]
              },
              callback: function (todo_res) {
                const todo = todo_res.message || {};
                const assignedBy = todo.assigned_by_full_name || "Unknown";
                const priority = todo.priority || "Normal";

                let dueMessage = "";
                if (task.exp_end_date) {
                  const dueDate = new Date(task.exp_end_date);
                  const today = new Date();
                  const diff = dueDate - today;
                  const days = Math.ceil(diff / (1000 * 3600 * 24));

                  if (days > 0) dueMessage = `${days} day${days > 1 ? 's' : ''} left`;
                  else if (days === 0) dueMessage = "Due today";
                  else dueMessage = `Overdue by ${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''}`;
                }

                const row = document.createElement("div");
                Object.assign(row.style, {
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  border: "1px solid #ccc",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  cursor: "pointer",
                  backgroundColor: "#ffffff",
                  transition: "all 0.25s ease",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro', 'Helvetica Neue', Arial, sans-serif",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
                });

                row.addEventListener("mouseenter", () => {
                  row.style.transform = "scale(1.02)";
                  row.style.boxShadow = "0 4px 12px rgba(0, 123, 255, 0.15)";
                  row.style.backgroundColor = "#f5faff";
                });

                row.addEventListener("mouseleave", () => {
                  row.style.transform = "scale(1)";
                  row.style.boxShadow = "0 2px 6px rgba(0,0,0,0.04)";
                  row.style.backgroundColor = "#ffffff";
                });

                const statusColor = statusColors[task.status] || "#555";
                const prettyModified = frappe.datetime.prettyDate(task.modified);

                row.innerHTML = `
                  <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 15px; color: #2a2a2a;">
                      ${task.subject} • ${projectName}
                    </div>
                    <div style="font-size: 13px; color: #555; margin-top: 4px;">
                      <span>Status: <b style="color:${statusColor}">${task.status}</b></span> |
                      <span>Priority: ${priority}</span>
                    </div>
                    <div style="font-size: 12px; color: #777; margin-top: 4px;">
                      Assigned by: <b>${assignedBy}</b>
                    </div>
                    <div style="font-size: 12px; color: #555; margin-top: 4px;">
                      Due Date: <b>${task.exp_end_date ? formatDate(task.exp_end_date) : "N/A"}</b>
                      <span style="color: #d9534f; margin-left: 10px;">(${dueMessage})</span>
                    </div>
                  </div>
                  <div style="min-width: 90px; text-align: right; font-size: 14px; color: #888;" title="${task.modified}">
                    ${prettyModified}
                  </div>
                `;

                row.onclick = () => {
                  window.location.href = `/app/task/${task.name}`;
                };

                container.appendChild(row);
              }
            });
          }
        });
      });
    }
  });
}

const statusButtons = root_element.querySelectorAll(".status-tab");
statusButtons.forEach(btn => {
  btn.addEventListener("click", function () {
    statusButtons.forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    renderAssignedTasks(this.dataset.status);
  });
});

renderAssignedTasks("All");
"""

    custom_block = frappe.db.exists('Custom HTML Block', 'Task Assigned')
    if custom_block:
        doc = frappe.get_doc('Custom HTML Block', 'Task Assigned')
        doc.html = html_content
        doc.style = css_content
        doc.script = js_content
        doc.save()
        
        print("✅ Updated Custom HTML Block: Task Assigned")
    else:
        frappe.get_doc({
            'doctype': 'Custom HTML Block',
            'name': 'Task Assigned',
            'html': html_content,
            'style': css_content,
            'script': js_content
        }).insert()
        print("✅ Created Custom HTML Block: Task Assigned")

    frappe.db.commit()
