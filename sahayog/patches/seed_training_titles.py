import frappe

# Mirrors the built-in fallback list in sahayog/www/training.html.
# Values are kept verbatim (including casing/spelling) so existing Training
# records with these titles are matched exactly and are not duplicated.
TRAINING_TITLES = (
    ("Audit Training Program", "retail branch banking"),
    ("Branch Business Master Class/ License to Operate", "retail branch banking"),
    ("Branch Manager Business Accumen Program", "retail branch banking"),
    ("CASA Product Training", "retail branch banking"),
    ("CRM Training", "retail branch banking"),
    ("DDS Product Training", "retail branch banking"),
    ("Drishti Training", "retail branch banking"),
    ("Branch Operation Excellence Program", "retail branch banking"),
    ("Insurance Excellence Program", "retail branch banking"),
    ("RO Bootcamp", "retail branch banking"),
    ("S-ONE Program - Orientation for New Employees", "retail branch banking"),
    ("Aarambha Workshop", "retail branch banking"),
    ("Nirman workshop", "retail branch banking"),
    ("Pragati work shop", "retail branch banking"),
    ("FOT Star Induction Program", "jll"),
    ("JLL Process Training", "jll"),
    ("JLL Refresher Training", "jll"),
    ("Retail Asset Master Class/ License to Operate", "jll"),
)


def execute():
    """Seed the existing training programme titles into the master."""
    for title, division in TRAINING_TITLES:
        if frappe.db.exists("Training Title", {"training_title": title}):
            continue
        frappe.get_doc(
            {
                "doctype": "Training Title",
                "training_title": title,
                "division": division,
                "enabled": 1,
            }
        ).insert(ignore_permissions=True)
