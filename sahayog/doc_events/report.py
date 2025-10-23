import frappe

def prevent_prepared_report(doc, method):
    if doc.prepared_report:
        doc.prepared_report = 0