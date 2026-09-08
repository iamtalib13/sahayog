"""
ZingHR Integration Wrapper.
Imports all core classes, functions, and whitelisted RPC methods from sahayog.integration_zinghr.
"""

from sahayog.integration_zinghr import (
    ZingHRConfig,
    ZingHRClient,
    MasterResolver,
    parse_employee_payload,
    fast_upsert_employees,
    sync_employee_from_zinghr,
    bulk_sync_from_zinghr,
    run_bulk_sync_job,
)

if __name__ == "__main__":
    import frappe
    frappe.init(site="sahayog.com")
    frappe.connect()
    print("Testing refactored ZingHR client...")
    client = ZingHRClient()
    token = client.get_jwt_token()
    print(f"Token obtained: {token[:25]}...")
    emp = client.fetch_single("1")
    if emp:
        print(f"Fetched Employee 1: {emp.get('employeeName')}")
