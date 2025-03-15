// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Issue Register", {
  refresh: function (frm) {
    make_form_readonly_if_closed(frm);
  },

  assigned_date: function (frm) {
    validate_assigned_date(frm);
  },
  solved_date: function (frm) {
    validate_solved_date(frm);
  },
  testing_date: function (frm) {
    validate_testing_date(frm);
  },

  after_save: function (frm) {
    make_form_readonly_if_closed(frm);
  },

  onload: function (frm) {
    set_module_query(frm);
  },

  team: function (frm) {
    set_module_query(frm); // Update query when team field changes
  },
});

function set_module_query(frm) {
  frm.set_query("module", function () {
    return {
      filters: {
        team: frm.doc.team || "", // Dynamically filter by the team field
      },
    };
  });
}

// Make form read only after save and issue is closed
function make_form_readonly_if_closed(frm) {
  if (frm.doc.status === "Closed") {
    frm.disable_form();
    frm.set_intro(__("This issue is closed and cannot be modified."), "red");
    // frappe.msgprint(__("This issue is closed and cannot be edited."));
  } else {
    frm.enable_form();
    frm.set_intro(""); // Remove intro if status is not closed
  }
}

// ✅ Assigned Date Validation
function validate_assigned_date(frm) {
  let assigned_date = frm.doc.assigned_date;
  let solved_date = frm.doc.solved_date;
  let today = frappe.datetime.get_today();

  if (assigned_date) {
    if (assigned_date > today) {
      frappe.msgprint(__("Assigned Date cannot be a future date."));
      frm.set_value("assigned_date", "");
    }

    if (solved_date && assigned_date > solved_date) {
      frappe.msgprint(
        __("Assigned Date must be before or the same as Solved Date.")
      );
      frm.set_value("assigned_date", "");
    }
  }
}

// ✅ Solved Date Validation
function validate_solved_date(frm) {
  let assigned_date = frm.doc.assigned_date;
  let solved_date = frm.doc.solved_date;
  let today = frappe.datetime.get_today();

  if (solved_date) {
    if (!assigned_date) {
      frappe.msgprint(__("Please set the Assigned Date before Solved Date."));
      frm.set_value("solved_date", "");
      return;
    }

    if (solved_date < assigned_date) {
      frappe.msgprint(
        __("Solved Date must be after or the same as Assigned Date.")
      );
      frm.set_value("solved_date", "");
    }

    if (solved_date > today) {
      frappe.msgprint(__("Solved Date cannot be in the future."));
      frm.set_value("solved_date", "");
    }
  }
}

// ✅ Testing Date Validation
function validate_testing_date(frm) {
  let assigned_date = frm.doc.assigned_date;
  let solved_date = frm.doc.solved_date;
  let testing_date = frm.doc.testing_date;
  let today = frappe.datetime.get_today();

  if (testing_date) {
    if (!assigned_date) {
      frappe.msgprint(__("Please set the Assigned Date before Testing Date."));
      frm.set_value("testing_date", "");
      return;
    }

    if (solved_date && testing_date > solved_date) {
      frappe.msgprint(__("Testing Date cannot be after Solved Date."));
      frm.set_value("testing_date", "");
    }

    if (testing_date > today) {
      frappe.msgprint(__("Testing Date cannot be in the future."));
      frm.set_value("testing_date", "");
    }
  }
}
