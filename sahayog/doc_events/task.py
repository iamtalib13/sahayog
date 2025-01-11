from __future__ import unicode_literals
import frappe
from frappe import _


def create_letter_of_intent(doc, method):
    project = doc.project
    subject = doc.subject
    task = doc.name

    if subject == 'Task 2: Letter of Intent' and project:
        # Create a new Letter of Intent document
        letter_of_intent = frappe.new_doc('Letter of Intent')
        letter_of_intent.project = project
        letter_of_intent.task = task
        letter_of_intent.docstatus = 0  # Draft status

        # Save the new document to the database
        letter_of_intent.insert(ignore_permissions=True)

        # Optionally, show a message to confirm the creation
        frappe.msgprint(f"Letter of Intent created for project: {project}")

# Make sure to hook this function to the relevant event in hooks.py

