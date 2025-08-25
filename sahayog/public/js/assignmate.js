// Create a reusable assignment function
console.log("AssignMate JS loaded");
function setupUserAssignment(frm, doctype, docname) {
  if (!docname || frm.doc.__islocal) return;

  // Preload limited user data when form loads
  let initialUsers = [];
  let userDataLoaded = false;

  // Load initial user data in background (limited set)
  frappe.call({
    method: "sahayog.api.assignmate.get_active_users_list",
    args: {
      exclude_users: JSON.stringify(["Guest", "Administrator"]),
      limit: 100,
    },
    callback: function (r) {
      if (r.message && r.message.length > 0) {
        initialUsers = r.message;
        userDataLoaded = true;
      }
    },
    error: function () {},
  });

  frappe.call({
    method: "sahayog.api.assignmate.is_user_assigned",
    args: {
      doctype: doctype,
      docname: docname,
      user: frappe.session.user,
    },
    callback: function (r) {
      const isAssigned = r.message && r.message.assigned;
      const isAdmin = frappe.session.user === "Administrator";

      if (isAssigned || isAdmin) {
        if (isAssigned) frm.set_intro("Assigned to you", "blue");
        else if (isAdmin)
          frm.set_intro("Administrator can manage assignments", "blue");

        frm.add_custom_button(__("Assign to Users"), () => {
          showAssignmentDialog(doctype, docname, initialUsers, userDataLoaded);
        });
      }
    },
  });
}

// Reusable dialog function
function showAssignmentDialog(doctype, docname, initialUsers, userDataLoaded) {
  const dialog = new frappe.ui.Dialog({
    title: __("Assign Users to {0}", [doctype]),
    fields: [
      {
        fieldname: "selected_users_section",
        fieldtype: "HTML",
        options:
          '<div id="selected-users-container" style="min-height:50px;max-height:150px;overflow-y:auto;padding:10px;border:1px solid #d1d8dd;border-radius:3px;margin-bottom:15px;display:flex;flex-wrap:wrap;gap:5px;"></div>',
      },
      {
        fieldname: "search_user",
        fieldtype: "Data",
        label: __("Search User"),
        placeholder: __("Search by full name or user ID"),
      },
      {
        fieldname: "users_list_section",
        fieldtype: "HTML",
        options:
          '<div id="users-list-container" style="max-height:300px;overflow-y:auto;padding:10px;"></div>',
      },
    ],
    primary_action_label: __("Assign Users"),
    primary_action: function () {
      if (!selectedUsers.length) {
        frappe.msgprint({
          title: __("Warning"),
          indicator: "orange",
          message: __("Please select at least one user"),
        });
        return;
      }

      frappe.call({
        method: "sahayog.api.assignmate.assign_doc_to_users",
        args: {
          doctype: doctype,
          docname: docname,
          users: selectedUsers,
        },
        callback: function () {
          frappe.msgprint({
            title: __("Success"),
            indicator: "green",
            message: __("Document assigned successfully"),
          });
          dialog.hide();
          frappe.ui.form.refresh();
        },
        error: function () {
          frappe.msgprint({
            title: __("Error"),
            indicator: "red",
            message: __("Failed to assign document"),
          });
        },
      });
    },
  });

  dialog.show();

  // Show loading state
  const selectedContainer = $(
    dialog.fields_dict.selected_users_section.wrapper
  ).find("#selected-users-container");
  const listContainer = $(dialog.fields_dict.users_list_section.wrapper).find(
    "#users-list-container"
  );
  selectedContainer.html(
    '<div class="text-muted" style="padding:10px;">Loading...</div>'
  );
  listContainer.html(
    '<div class="text-muted" style="padding:10px;">Loading users...</div>'
  );

  let selectedUsers = [];
  let currentDisplayedUsers = [];

  // Function to render selected users as chips
  function renderSelectedUsers() {
    let html = "";
    if (selectedUsers.length === 0) {
      html =
        '<div class="text-muted" style="padding:10px;">No users selected</div>';
    } else {
      selectedUsers.forEach((userId) => {
        const user =
          currentDisplayedUsers.find((u) => u.name === userId) ||
          initialUsers.find((u) => u.name === userId);
        const displayName = user ? user.full_name || user.name : userId;
        html += `
          <div class="selected-user-chip" data-user="${userId}"
               style="background:#f0f4f7; padding:4px 8px; border-radius:12px;
                      display:flex; align-items:center; gap:5px;">
            <span>${displayName}</span>
            <span class="remove-selected-user"
                  style="cursor:pointer; color:#74808b;">✕</span>
          </div>
        `;
      });
    }
    selectedContainer.html(html);

    // Bind remove events
    selectedContainer.find(".remove-selected-user").on("click", function () {
      const chip = $(this).closest(".selected-user-chip");
      const userId = chip.data("user");

      // Remove from backend
      frappe.call({
        method: "sahayog.api.assignmate.remove_doc_assigned_user",
        args: {
          doctype: doctype,
          docname: docname,
          users: [userId],
        },
        callback: function () {
          selectedUsers = selectedUsers.filter((u) => u !== userId);
          renderSelectedUsers();
          renderUsersList(currentDisplayedUsers);
          updateSelectAllCheckbox();

          frappe.show_alert({
            message: __("User removed"),
            indicator: "red",
          });
        },
      });
    });
  }

  // Function to render users list
  function renderUsersList(users) {
    currentDisplayedUsers = users;
    let html = "";
    users.forEach((u) => {
      const isSelected = selectedUsers.includes(u.name);
      html += `
        <div class="user-list-item ${isSelected ? "selected" : ""}"
             data-user="${u.name}"
             style="padding:8px; border-bottom:1px solid #f0f4f7;
                    cursor:pointer; display:flex; align-items:center;">
          <input type="checkbox" class="user-checkbox"
                 value="${u.name}" ${isSelected ? "checked" : ""}
                 style="margin-right:8px;">
          <div>
            <div>${u.full_name || u.name}</div>
            <div class="text-muted small">${u.name}</div>
          </div>
        </div>
      `;
    });

    if (users.length === 0) {
      html = `<div class="text-muted" style="padding:10px;">No users found</div>`;
    }

    listContainer.html(html);

    // Bind checkbox change
    listContainer.find("input.user-checkbox").on("change", function () {
      const userId = $(this).val();
      const isChecked = $(this).is(":checked");

      if (isChecked && !selectedUsers.includes(userId)) {
        selectedUsers.push(userId);
      } else if (!isChecked) {
        selectedUsers = selectedUsers.filter((u) => u !== userId);
      }

      renderSelectedUsers();
      updateSelectAllCheckbox();
    });

    // Also make the entire row clickable
    listContainer.find(".user-list-item").on("click", function (e) {
      if (!$(e.target).is('input[type="checkbox"]')) {
        const checkbox = $(this).find("input.user-checkbox");
        checkbox.prop("checked", !checkbox.is(":checked"));
        checkbox.trigger("change");
      }
    });
  }

  function updateSelectAllCheckbox() {
    // Implementation remains the same
  }

  // Get initial data
  const fetchData = () => {
    if (userDataLoaded) {
      frappe.call({
        method: "sahayog.api.assignmate.is_user_assigned",
        args: {
          doctype: doctype,
          docname: docname,
          user: frappe.session.user,
        },
        callback: function (res) {
          if (res.message && res.message.all_assigned) {
            selectedUsers = res.message.all_assigned.slice();
          }
          renderSelectedUsers();
          renderUsersList(initialUsers);
          updateSelectAllCheckbox();
        },
      });
    } else {
      frappe.call({
        method: "sahayog.api.assignmate.get_active_users_list",
        args: {
          exclude_users: JSON.stringify(["Guest", "Administrator"]),
          limit: 100,
        },
        callback: function (r) {
          if (r.message) {
            initialUsers = r.message;
            userDataLoaded = true;

            frappe.call({
              method: "sahayog.api.assignmate.is_user_assigned",
              args: {
                doctype: doctype,
                docname: docname,
                user: frappe.session.user,
              },
              callback: function (res) {
                if (res.message && res.message.all_assigned) {
                  selectedUsers = res.message.all_assigned.slice();
                }
                renderSelectedUsers();
                renderUsersList(initialUsers);
                updateSelectAllCheckbox();
              },
            });
          }
        },
      });
    }
  };

  // Fetch data when dialog opens
  fetchData();

  // Search filter with server-side search
  let searchTimeout;
  dialog.fields_dict.search_user.$input.on("input", function () {
    clearTimeout(searchTimeout);
    const searchText = $(this).val().trim();

    if (searchText.length === 0) {
      renderUsersList(initialUsers);
      return;
    }

    searchTimeout = setTimeout(() => {
      listContainer.html(
        '<div class="text-muted" style="padding:10px;">Searching...</div>'
      );

      frappe.call({
        method: "sahayog.api.assignmate.get_active_users_list",
        args: {
          search_text: searchText,
          exclude_users: JSON.stringify(["Guest", "Administrator"]),
          limit: 50,
        },
        callback: function (r) {
          if (r.message) {
            renderUsersList(r.message);
          } else {
            renderUsersList([]);
          }
        },
      });
    }, 500);
  });
}
