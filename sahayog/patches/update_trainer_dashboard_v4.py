import frappe

def execute():
    doc = frappe.get_doc("Custom HTML Block", "Trainer Dashboard")

    doc.html = doc.html.replace("<th>Doc Status</th>", "<th>Last Modified</th>")

    doc.script = doc.script.replace(
        '"name","agent","calling_date","modified","wants_to_stay","exited","reply_type","follow_up_date","docstatus"',
        '"name","agent","calling_date","modified","wants_to_stay","exited","reply_type","follow_up_date"'
    ).replace(
        '<td><span class="aad-badge aad-badge-${ds.cls}">${ds.label}</span></td>',
        '<td>${log.modified ? frappe.datetime.prettyDate(log.modified) : "-"}</td>'
    ).replace(
        "      const ds = getDocStatusInfo(log.docstatus);\n", ""
    )

    doc.save()
    frappe.db.commit()
    print("Done")
