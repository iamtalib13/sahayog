import frappe

def execute():
    doc = frappe.get_doc("Custom HTML Block", "Trainer Dashboard")
    script = doc.script or ""

    # Show what we're fixing
    count = script.count("want_to_exit")
    print(f"Found {count} occurrences of want_to_exit in Trainer Dashboard script")

    if not count:
        print("Nothing to fix.")
        return

    # Fix 1: Remove want_to_exit from fields array in get_list calls
    # e.g. "wants_to_stay","want_to_exit","exited" -> "wants_to_stay","exited"
    import re

    # Remove ,"want_to_exit" or "want_to_exit", from fields arrays
    script = re.sub(r',\s*["\']want_to_exit["\']', '', script)
    script = re.sub(r'["\']want_to_exit["\'],\s*', '', script)

    # Fix 2: Remove any display/logic referencing want_to_exit
    # Remove full lines that only reference want_to_exit
    lines = script.split('\n')
    clean_lines = []
    for line in lines:
        if 'want_to_exit' in line:
            print(f"  REMOVING line: {line.strip()}")
            continue
        clean_lines.append(line)
    script = '\n'.join(clean_lines)

    doc.script = script
    doc.save()
    frappe.db.commit()
    print("Fixed and saved.")
