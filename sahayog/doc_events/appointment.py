import frappe

def link_appointment_to_lead(doc, method=None):
    if doc.appointment_with == "Lead" and doc.party:
        try:
            lead_doc = frappe.get_doc("Lead", doc.party)
            # Avoid duplicate linking
            already_linked = any(row.appointment == doc.name for row in lead_doc.custom_lead_appointments)

            if not already_linked:
                lead_doc.append("custom_lead_appointments", {
                    "appointment": doc.name
                })
                lead_doc.save(ignore_permissions=True)
                frappe.db.commit()

        except Exception as e:
            frappe.log_error(frappe.get_traceback(), "Failed to link Appointment to Lead")
