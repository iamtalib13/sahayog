import frappe

def execute():
    """
    Patch to set status to 'Unallocated' for Agents where 
    both auth_id and employee fields are empty.
    """
    frappe.db.sql("""
        UPDATE `tabAgent`
        SET status = 'Unallocated'
        WHERE 
            (auth_id IS NULL OR auth_id = '') 
            AND (employee IS NULL OR employee = '')
            AND status != 'Unallocated'
    """)
    
    # Commit the changes to the database
    frappe.db.commit()
    
    print("Patch applied: Agents with missing Auth ID and Employee have been set to Unallocated.")
