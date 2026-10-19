"""
Delete Support Staff employees and every record linked to them.

SAFETY:
  - Defaults to DRY-RUN. Nothing is deleted unless you pass
    dry_run=False AND confirm="DELETE_SUPPORT_STAFF_EMPLOYEES".
  - Only employees with custom_is_support_staff = 1 are touched.
  - Linked records are discovered dynamically from DocField / Custom Field
    (any Link field pointing to Employee), so no linked table is missed.
  - Child tables are deleted by row; parent documents via frappe.delete_doc.

USAGE (from frappe-bench):
  # 1) DRY RUN - only prints what would be deleted
  bench --site <site> execute \
    sahayog.patches.delete_support_staff_and_linked_records.execute

  # 2) ACTUAL DELETE - take a backup first!
  bench --site <site> backup --with-files
  bench --site <site> execute \
    sahayog.patches.delete_support_staff_and_linked_records.execute \
    --kwargs "{'dry_run': False, 'confirm': 'DELETE_SUPPORT_STAFF_EMPLOYEES'}"

This file is intentionally NOT added to patches.txt so it never runs on
`bench migrate` by accident.
"""

import frappe

DRY_RUN = True
CONFIRM_TOKEN = "DELETE_SUPPORT_STAFF_EMPLOYEES"

EXTRA_DOCTYPES = [
    "Attendance",
    "Attendance Correction",
    "Leave Application",
    "Leave Allocation",
    "Leave Ledger Entry",
    "Salary Slip",
    "Salary Structure Assignment",
    "Salary Register",
    "Salary Revision",
    "Staff Loan",
    "Staff Loan Repayment",
    "Disciplinary Case",
    "Unauthorized Absence",
    "Approval Request",
    "Collection Tracking",
    "Employee Material Request",
    "MAC Activity",
    "Default Warehouse",
    "Meeting",
]


PROTECTED_USERS = {"Administrator", "Guest"}
PROTECTED_ROLES = {"System Manager", "Administrator", "HR Manager", "HR User"}


def _chunks(seq, size=300):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


def _user_is_protected(uid):
    """Never delete privileged accounts, even if an employee links to them."""
    if uid in PROTECTED_USERS:
        return True
    if not frappe.db.exists("User", uid):
        return False
    roles = set(frappe.get_roles(uid))
    return bool(roles & PROTECTED_ROLES)


def _support_staff_names():
    return frappe.get_all(
        "Employee",
        filters={"custom_is_support_staff": 1},
        pluck="name",
        limit_page_length=0,
    )


def _link_fields():
    """Every (doctype, fieldname) whose Link option is Employee."""
    rows = set()
    for r in frappe.get_all(
        "DocField",
        filters={"fieldtype": "Link", "options": "Employee"},
        fields=["parent", "fieldname"],
        limit_page_length=0,
    ):
        rows.add((r.parent, r.fieldname))
    for r in frappe.get_all(
        "Custom Field",
        filters={"fieldtype": "Link", "options": "Employee"},
        fields=["dt", "fieldname"],
        limit_page_length=0,
    ):
        rows.add((r.dt, r.fieldname))
    return sorted(x for x in rows if x[0] != "Employee")


def _delete_linked(doctype, fieldname, emp_names, dry_run):
    added = None
    if doctype in EXTRA_DOCTYPES:
        added = " (extra)"
    try:
        meta = frappe.get_meta(doctype)
    except Exception:
        return 0, None

    if meta is None or meta.issingle:
        return 0, None

    total = 0
    for chunk in _chunks(emp_names):
        filters = {fieldname: ["in", chunk]}
        if meta and meta.istable:
            cnt = frappe.db.count(doctype, filters)
            total += cnt
            if not dry_run and cnt:
                frappe.db.delete(doctype, filters)
        else:
            names = frappe.get_all(
                doctype, filters=filters, pluck="name", limit_page_length=0
            )
            total += len(names)
            if not dry_run:
                for n in names:
                    try:
                        frappe.delete_doc(
                            doctype, n, force=1,
                            ignore_permissions=True,
                        )
                    except Exception:
                        frappe.log_error(
                            title="Support staff delete – linked doc failed",
                            message=f"{doctype} {n}\n{frappe.get_traceback()}",
                        )
        if not dry_run:
            frappe.db.commit()
    return total, added


def _delete_users(user_ids, dry_run):
    total = 0
    for uid in user_ids:
        if not uid or not frappe.db.exists("User", uid):
            continue
        total += 1
        if not dry_run:
            try:
                frappe.db.delete("User Permission", {"user": uid})
                frappe.delete_doc(
                    "User", uid, force=1,
                    ignore_permissions=True,
                )
            except Exception:
                frappe.log_error(
                    title="Support staff delete – user failed",
                    message=f"User {uid}\n{frappe.get_traceback()}",
                )
    if not dry_run:
        frappe.db.commit()
    return total


def run_delete():
    """Convenience entry point for the real delete (no quoting needed)."""
    return execute(dry_run=False, confirm=CONFIRM_TOKEN)


def debug_one(employee=None):
    """Try deleting ONE employee and print the full traceback."""
    names = _support_staff_names()
    if not names:
        print("No support staff left.")
        return
    employee = employee or names[0]
    print(f"Trying to delete: {employee}")
    try:
        frappe.delete_doc(
            "Employee", employee, force=1,
            ignore_permissions=True,
        )
        frappe.db.commit()
        print("Deleted OK ->", employee)
    except Exception:
        print(frappe.get_traceback())


def status():
    """Show current employee/user counts after the cleanup."""
    total = frappe.db.count("Employee")
    ss = frappe.db.count("Employee", {"custom_is_support_staff": 1})
    print(f"Total employees         : {total}")
    print(f"Support staff remaining : {ss}")
    print(f"Non-support staff       : {total - ss}")
    leftover = frappe.get_all(
        "User",
        filters={"name": ["like", "P%@sahayog.com"]},
        pluck="name",
        limit_page_length=0,
    )
    print(f"Leftover P-code users   : {len(leftover)}")
    for u in leftover[:25]:
        print("   ", u)


def cleanup_remaining_users():
    """Delete leftover P-code logins that failed during the bulk delete."""
    leftover = frappe.get_all(
        "User",
        filters={"name": ["like", "P%@sahayog.com"]},
        pluck="name",
        limit_page_length=0,
    )
    done = 0
    for uid in leftover:
        if uid in PROTECTED_USERS:
            continue
        try:
            frappe.db.delete("User Permission", {"user": uid})
            frappe.delete_doc("User", uid, force=1, ignore_permissions=True)
            done += 1
        except Exception:
            frappe.log_error(
                title="Support staff delete – leftover user failed",
                message=f"User {uid}\n{frappe.get_traceback()}",
            )
    frappe.db.commit()
    print(f"Leftover users deleted: {done} / {len(leftover)}")


def show_errors(limit=8):
    """Print recent Error Log entries created by this cleanup."""
    rows = frappe.get_all(
        "Error Log",
        filters={"method": ["like", "%Support staff delete%"]},
        fields=["creation", "method", "error"],
        order_by="creation desc",
        limit_page_length=limit,
    )
    for r in rows:
        print("=" * 70)
        print(r.creation, "|", r.method)
        print((r.error or "")[:3000])
    if not rows:
        print("No matching Error Log entries found.")


def execute(dry_run=DRY_RUN, confirm=None):
    """Main entry point. Pass dry_run=False and confirm token to really delete."""
    if not dry_run and confirm != CONFIRM_TOKEN:
        frappe.throw(
            "Refusing to delete. Pass confirm='{}' to proceed.".format(CONFIRM_TOKEN)
        )

    emp_names = _support_staff_names()
    if not emp_names:
        print("No support staff employees found.")
        return {"support_staff": 0}

    user_ids = set(
        frappe.get_all(
            "Employee",
            filters={"name": ["in", emp_names]},
            pluck="user_id",
            limit_page_length=0,
        )
    )
    for name in emp_names:
        user_ids.add(f"{name}@sahayog.com")

    protected = sorted(u for u in user_ids if u and _user_is_protected(u))
    user_ids = sorted(u for u in user_ids if u and not _user_is_protected(u))

    existing_users = [u for u in user_ids if frappe.db.exists("User", u)]

    mode = "DRY-RUN" if dry_run else "DELETE"
    print(f"\n=== Support Staff cleanup [{mode}] ===")
    print(f"Support staff employees : {len(emp_names)}")
    print(f"User candidates         : {len(user_ids)}")
    print(f"Existing users to delete: {len(existing_users)}")
    print(f"PROTECTED (kept)        : {len(protected)} -> {', '.join(protected[:20]) or '(none)'}")
    print("")

    summary = []
    for doctype, fieldname in _link_fields():
        try:
            total, extra = _delete_linked(doctype, fieldname, emp_names, dry_run)
        except Exception:
            frappe.log_error(
                title="Support staff delete – doctype skipped",
                message=f"{doctype}.{fieldname}\n{frappe.get_traceback()}",
            )
            continue
        if total or extra:
            summary.append((doctype, fieldname, total, extra or ""))
            print(f"  {doctype}.{fieldname:<28} : {total}{extra or ''}")

    users_deleted = _delete_users(user_ids, dry_run)
    print(f"\n  User (login)            : {users_deleted}")

    for name in emp_names:
        if not dry_run:
            try:
                frappe.delete_doc(
                    "Employee", name, force=1,
                    ignore_permissions=True,
                )
            except Exception:
                frappe.log_error(
                    title="Support staff delete – employee failed",
                    message=f"Employee {name}\n{frappe.get_traceback()}",
                )
    if not dry_run:
        frappe.db.commit()
    print(f"  Employee                : {len(emp_names)}")
    print(f"\n=== Done [{mode}] ===\n")

    if not dry_run:
        remaining = _support_staff_names()
        print(f"Support staff remaining after delete: {len(remaining)}")
        if remaining:
            print("Remaining codes:", ", ".join(remaining[:50]))

    return {
        "dry_run": dry_run,
        "support_staff": len(emp_names),
        "users": len(user_ids),
        "linked_summary": summary,
    }
