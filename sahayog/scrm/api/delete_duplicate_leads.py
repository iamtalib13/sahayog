import frappe

def execute():
    try:
        leads = frappe.db.get_all(
            'Lead',
            fields=[
                'name', 'lead_name', 'first_name', 'status',
                'source', 'mobile_no', 'creation'
            ],
            order_by='creation ASC'
        )
    except Exception as e:
        print(f"❌ Error fetching leads: {e}")
        return

    seen = set()
    to_delete = []

    for lead in leads:
        try:
            key = (
                (lead.get("lead_name") or "").strip().lower(),
                (lead.get("first_name") or "").strip().lower(),
                (lead.get("status") or "").strip().lower(),
                (lead.get("source") or "").strip().lower(),
                (lead.get("mobile_no") or "").strip()
            )
            if key in seen:
                to_delete.append(lead.name)
            else:
                seen.add(key)
        except Exception as e:
            print(f"⚠️ Error processing lead {lead.get('name')}: {e}")

    deleted_count = 0
    for lead_name in to_delete:
        try:
            frappe.delete_doc('Lead', lead_name, force=1)
            frappe.db.commit()
            print(f"🗑️ Deleted duplicate lead: {lead_name}")
            deleted_count += 1
        except Exception as e:
            print(f"❌ Error deleting {lead_name}: {e}")

    print(f"\n✅ Deleted {deleted_count} duplicate lead(s).")