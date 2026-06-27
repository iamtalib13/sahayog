import frappe


def execute():
    doc = frappe.get_doc("Custom HTML Block", "Trainer Dashboard")

    # 1. HTML: add "Want to Exit" stat card after Exited card
    old_exited_card = """    <div class="aad-stat-card" data-filter="exited">
      <div class="aad-stat-label">Exited</div>
      <div class="aad-stat-value aad-stat-red aad-exited-count">0</div>
    </div>"""

    new_exited_card = """    <div class="aad-stat-card" data-filter="want_to_exit">
      <div class="aad-stat-label">Want to Exit</div>
      <div class="aad-stat-value aad-stat-red aad-want-to-exit-count">0</div>
    </div>
    <div class="aad-stat-card" data-filter="exited">
      <div class="aad-stat-label">Exited</div>
      <div class="aad-stat-value aad-stat-red aad-exited-count">0</div>
    </div>"""

    if 'aad-want-to-exit-count' not in doc.html:
        doc.html = doc.html.replace(old_exited_card, new_exited_card)

    # 2. Script: add want_to_exit to fetchAnalytics
    doc.script = doc.script.replace(
        "fetchCount({ ...base, exited: 1 }),\n      fetchCount({ ...base, reply_type: [\"in\", [\"Follow-up Required\", \"Call Back Later\"]] }),",
        "fetchCount({ ...base, exited: 1 }),\n      fetchCount({ ...base, want_to_exit: 1 }),\n      fetchCount({ ...base, reply_type: \"Follow-up Required\" }),"
    )

    # Update destructuring to include want_to_exit
    doc.script = doc.script.replace(
        "const [total, stay, exited, followup, notreachable] = await Promise.all([",
        "const [total, stay, exited, want_to_exit, followup, notreachable] = await Promise.all(["
    )

    # Update the count assignment
    doc.script = doc.script.replace(
        "root.querySelector(\".aad-exited-count\").textContent = exited;\n    root.querySelector(\".aad-followup-count\").textContent = followup;",
        "root.querySelector(\".aad-exited-count\").textContent = exited;\n    root.querySelector(\".aad-want-to-exit-count\").textContent = want_to_exit;\n    root.querySelector(\".aad-followup-count\").textContent = followup;"
    )

    # 3. Script: add want_to_exit filter in getFilters
    doc.script = doc.script.replace(
        'else if (statusFilter === "exited")   filters["exited"] = 1;',
        'else if (statusFilter === "exited")   filters["exited"] = 1;\n    else if (statusFilter === "want_to_exit") filters["want_to_exit"] = 1;'
    )

    # 4. Script: fix followup filter (remove Call Back Later)
    doc.script = doc.script.replace(
        'filters["reply_type"] = ["in", ["Follow-up Required", "Call Back Later"]];',
        'filters["reply_type"] = "Follow-up Required";'
    )

    # 5. Script: fix getStatusInfo to handle want_to_exit and remove Call Back Later
    doc.script = doc.script.replace(
        'if (log.exited)        return { label: "Exited",        cls: "red" };\n    if (log.wants_to_stay) return { label: "Wants to Stay", cls: "green" };\n    if (log.reply_type === "Follow-up Required" || log.reply_type === "Call Back Later")',
        'if (log.exited)        return { label: "Exited",        cls: "red" };\n    if (log.want_to_exit)  return { label: "Want to Exit",   cls: "red" };\n    if (log.wants_to_stay) return { label: "Wants to Stay", cls: "green" };\n    if (log.reply_type === "Follow-up Required")'
    )

    # 6. Script: add want_to_exit to fetchLogs fields
    doc.script = doc.script.replace(
        'fields: ["name","agent","calling_date","modified","wants_to_stay","exited","reply_type","follow_up_date"]',
        'fields: ["name","agent","calling_date","modified","wants_to_stay","want_to_exit","exited","reply_type","follow_up_date"]'
    )

    doc.save()
    frappe.db.commit()
    print("Done: Want to Exit card added to Trainer Dashboard")
