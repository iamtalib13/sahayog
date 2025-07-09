frappe.ui.form.on("Branch Proposal", {
  refresh: function (frm) {
    // Only set intro if form is not new, and intro hasn't been shown yet
    if (!frm.is_new() && !frm.__intro_shown) {
      frm.trigger("progress_status");
      frm.__intro_shown = true;
    } else {
      // Reset the flag on new form or on reload
      frm.__intro_shown = false;
    }
  },
  progress_status: function (frm) {
    console.log("📊 Updating progress status...");
    const state = (frm.doc.workflow_state || "").toLowerCase();

    // Color definitions
    const colors = {
      default: "#e0e0e0", // light gray
      completed: "#00a65a", // green
      current: "#3c8dbc", // blue
      rejected: "#dd4b39", // red
      text: {
        active: "#333333",
        inactive: "#777777",
      },
    };

    // Determine status of each stage
    const stages = {
      stage1: {
        label: "Proposal Submission",
        color: colors.default,
        textColor: colors.text.inactive,
        icon: "1",
        status: "Draft",
      },
      stage2: {
        label: "CFO Approval",
        color: colors.default,
        textColor: colors.text.inactive,
        icon: "2",
        status: "Pending",
      },
      line: {
        color: colors.default,
      },
    };

    // Update stages based on workflow state
    switch (state) {
      case "draft":
        stages.stage1.color = colors.current;
        stages.stage1.textColor = colors.text.active;
        stages.stage1.status = "Draft";
        stages.stage2.status = "Pending";
        break;

      case "submitted":
      case "pending from cfo":
        stages.stage1.color = colors.completed;
        stages.stage1.textColor = colors.text.active;
        stages.stage1.icon = "✓";
        stages.stage1.status = "Submitted";

        stages.stage2.color = colors.current;
        stages.stage2.textColor = colors.text.active;
        stages.stage2.status = "Pending";
        break;

      case "not-received":
        stages.stage1.color = colors.completed;
        stages.stage1.textColor = colors.text.active;
        stages.stage1.icon = "✓";
        stages.stage1.status = "Submitted";

        stages.stage2.color = colors.current;
        stages.stage2.textColor = colors.text.active;
        stages.stage2.status = "Not-Received";
        break;

      case "approved":
        stages.stage1.color = colors.completed;
        stages.stage1.textColor = colors.text.active;
        stages.stage1.icon = "✓";
        stages.stage1.status = "Submitted";

        stages.stage2.color = colors.completed;
        stages.stage2.textColor = colors.text.active;
        stages.stage2.icon = "✓";
        stages.stage2.status = "Approved";

        stages.line.color = colors.completed;
        break;

      case "rejected":
        stages.stage1.color = colors.completed;
        stages.stage1.textColor = colors.text.active;
        stages.stage1.icon = "✓";
        stages.stage1.status = "Submitted";

        stages.stage2.color = colors.rejected;
        stages.stage2.textColor = colors.text.active;
        stages.stage2.icon = "✕";
        stages.stage2.status = "Rejected";

        stages.line.color = colors.rejected;
        break;
    }

    // HTML Output
    const progress_html = `
        <div style="background: transparent; padding: 15px 0; margin: 0 0 20px 0;">
            <div style="display: flex; justify-content: center;">
                <div style="position: relative; width: 100%; max-width: 400px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2;">
                        <!-- Stage 1 -->
                        <div style="flex: 1; text-align: center; position: relative;">
                            <div style="
                                width: 30px;
                                height: 30px;
                                border-radius: 50%;
                                background: ${stages.stage1.color};
                                color: white;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                margin: 0 auto 6px;
                                font-weight: bold;
                                font-size: 14px;
                                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                            ">${stages.stage1.icon}</div>
                            <div style="font-size: 12px; font-weight: 500; color: ${stages.stage1.textColor}">
                                ${stages.stage1.label}
                            </div>
                            <div style="font-size: 11px; color: ${stages.stage1.textColor}; margin-top: 2px;">
                                ${stages.stage1.status}
                            </div>
                        </div>

                        <!-- Stage 2 -->
                        <div style="flex: 1; text-align: center; position: relative;">
                            <div style="
                                width: 30px;
                                height: 30px;
                                border-radius: 50%;
                                background: ${stages.stage2.color};
                                color: white;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                margin: 0 auto 6px;
                                font-weight: bold;
                                font-size: 14px;
                                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                            ">${stages.stage2.icon}</div>
                            <div style="font-size: 12px; font-weight: 500; color: ${stages.stage2.textColor}">
                                ${stages.stage2.label}
                            </div>
                            <div style="font-size: 11px; color: ${stages.stage2.textColor}; margin-top: 2px;">
                                ${stages.stage2.status}
                            </div>
                        </div>
                    </div>

                    <!-- Connector Line -->
                    <div style="
                        position: absolute;
                        top: 15px;
                        left: calc(25% + 15px);
                        width: calc(50% - 30px);
                        height: 2px;
                        background: ${stages.line.color};
                        z-index: 1;
                    "></div>
                </div>
            </div>
        </div>
    `;

    frm.set_intro(progress_html);
  },
  number_of_branches: function (frm) {
    const count = frm.doc.number_of_branches;

    console.log("🔢 Number of branches changed:", count);

    if (!count || count < 1) {
      console.log("⛔ Invalid number — skipping");
      return;
    }

    const rows = frm.doc.planned_branches || [];

    // Case 1: Table is empty
    if (rows.length === 0) {
      console.log("📭 Table is empty. Adding fresh rows.");
      for (let i = 0; i < count; i++) {
        frm.add_child("planned_branches");
      }
    }
    // Case 2: Table has blank rows (no values)
    else if (
      rows.every(
        (row) => !row.branch_name && !row.zone && !row.region && !row.division
      )
    ) {
      console.log(
        "🧾 Table has blank rows only. Clearing and adding fresh rows."
      );
      frm.clear_table("planned_branches");
      for (let i = 0; i < count; i++) {
        frm.add_child("planned_branches");
      }
    }
    // Case 3: Table has some data → only add if count > existing
    else if (rows.length < count) {
      const to_add = count - rows.length;
      console.log(`➕ Table has data. Adding ${to_add} more row(s).`);
      for (let i = 0; i < to_add; i++) {
        frm.add_child("planned_branches");
      }
    } else {
      console.log("✅ Table already has enough rows. No action needed.");
    }

    frm.refresh_field("planned_branches");
  },
});
