import frappe


def force_public_for_petty_cash_transaction(doc, method=None):
    if doc.attached_to_doctype == "Petty Cash Transaction" and doc.is_private:
        doc.is_private = 0


def force_public_after_save(doc, method=None):
    if doc.attached_to_doctype == "Petty Cash Transaction" and doc.is_private:
        frappe.db.set_value("File", doc.name, "is_private",
                            0, update_modified=False)
        doc.is_private = 0
