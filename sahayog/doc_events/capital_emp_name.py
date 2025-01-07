from __future__ import unicode_literals
import frappe
from frappe import _


def capital_emp_name(doc, method):
    try:
        # Extract required fields from the passed 'doc' and convert them to uppercase
        first_name = doc.first_name.upper() if doc.first_name else ''
        middle_name = doc.middle_name.upper() if doc.middle_name else ''
        last_name = doc.last_name.upper() if doc.last_name else ''

        # Update the 'doc' with the uppercase names
        doc.first_name = first_name
        doc.middle_name = middle_name
        doc.last_name = last_name

    except Exception as e:
        # Log the error if any exception occurs
        frappe.log_error(message=str(e), title="Error in capital_emp_name")

        