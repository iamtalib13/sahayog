import frappe
import re
from frappe.model.document import Document
from frappe import _
from psycopg2.extras import RealDictCursor
import psycopg2

# Indian State Code Map
STATE_MAP = {
    "AP": "ANDHRA PRADESH",
    "AR": "ARUNACHAL PRADESH",
    "AS": "ASSAM",
    "BR": "BIHAR",
    "CG": "CHHATTISGARH",
    "GA": "GOA",
    "GJ": "GUJARAT",
    "HR": "HARYANA",
    "HP": "HIMACHAL PRADESH",
    "JH": "JHARKHAND",
    "KA": "KARNATAKA",
    "KL": "KERALA",
    "MP": "MADHYA PRADESH",
    "MH": "MAHARASHTRA",
    "MN": "MANIPUR",
    "ML": "MEGHALAYA",
    "MZ": "MIZORAM",
    "NL": "NAGALAND",
    "OR": "ODISHA",
    "PB": "PUNJAB",
    "RJ": "RAJASTHAN",
    "SK": "SIKKIM",
    "TN": "TAMIL NADU",
    "TS": "TELANGANA",
    "TR": "TRIPURA",
    "UP": "UTTAR PRADESH",
    "UK": "UTTARAKHAND",
    "UA": "UTTARAKHAND",
    "WB": "WEST BENGAL",
    "DL": "DELHI",
    "JK": "JAMMU AND KASHMIR",
    "LA": "LADAKH",
    "AN": "ANDAMAN AND NICOBAR ISLANDS",
    "CH": "CHANDIGARH",
    "DN": "DADRA AND NAGAR HAVELI AND DAMAN AND DIU",
    "LD": "LAKSHADWEEP",
    "PY": "PUDUCHERRY"
}

def db_connection():
    """
    Connect to external PostgreSQL (Finacle) using Finacle Settings single doctype in Frappe.
    """
    try:
        creds = frappe.get_single("Finacle Settings")
        conn = psycopg2.connect(
            host=creds.host,
            port=creds.port,
            user=creds.user,
            password=creds.get_password("password"),
            database=creds.database_name
        )
        return conn
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PostgreSQL Connection Failed")
        frappe.throw(_("Database Connection Error: {0}").format(str(e)))
        
class SahayogBranch(Document):
    # All methods as before, EXCEPT auto_create_from_finacle

    def before_save(self):
        fields_to_uppercase = [
            "branch", "district", "region", "zone", "state", "state_code"
        ]
        for fieldname in fields_to_uppercase:
            value = self.get(fieldname)
            if value:
                value = value.strip()
                if fieldname in ["region", "zone"]:
                    value = re.sub(r'\s*-\s*', '-', value)
                    value = re.sub(r'\s+', '', value)
                self.set(fieldname, value.upper())
        if self.state_code:
            self.state_code = self.state_code.upper()
            self.state = STATE_MAP.get(self.state_code, self.state)
        self.ensure_district_exists()

    def on_update(self):
        self.ensure_district_exists()

    def after_insert(self):
        self.ensure_district_exists()

    def ensure_district_exists(self):
        if self.district:
            d_name = self.district.strip().upper()
            if d_name and frappe.db.exists("DocType", "District") and not frappe.db.exists("District", d_name):
                try:
                    frappe.get_doc({"doctype": "District", "district": d_name}).insert(ignore_permissions=True)
                except Exception:
                    pass

    def is_complete(self):
        required_fields = [
            "branch", "district", "region", "zone", "state_code", "sol_id"
        ]
        missing = [field for field in required_fields if not self.get(field)]
        return len(missing) == 0

    @staticmethod
    def _normalize_field(value):
        value = value.strip().upper()
        value = re.sub(r'\s*-\s*', '-', value)
        value = re.sub(r'\s+', '', value)
        return value

# MOVE THIS FUNCTION OUTSIDE THE CLASS:
@frappe.whitelist()
def auto_create_sahayog_branches_from_finacle():
    """
    Bulk create/update Sahayog Branches from Finacle.
    Normalizes Zone and Region to:
        ZONE-<number>
        REGION-<number>
    Creates Warehouse and Location if missing.
    Returns summary stats.
    """
    import re

    # --- NORMALIZATION FUNCTIONS ---
    def normalize_zone(value):
        """Normalize zone into ZONE-<number> format."""
        if not value:
            return ""

        v = value.upper().strip()

        match = re.search(r'(\d+)', v)
        number = match.group(1) if match else ""

        if number:
            return f"ZONE-{int(number)}"

        return v.replace("  ", " ").strip()

    def normalize_region(value):
        """Normalize region into REGION-<number> format."""
        if not value:
            return ""

        v = value.upper().strip()

        match = re.search(r'(\d+)', v)
        number = match.group(1) if match else ""

        if number:
            return f"REGION-{int(number)}"

        return v.replace("  ", " ").strip()

    # --- FETCH FROM FINACLE ---
    conn = db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    sql = """
    SELECT sol_id, sol_desc, division_name, region_name, circle_office_name, state_code
    FROM tbaadm.sol
    """
    cursor.execute(sql)
    data = cursor.fetchall()

    created = skipped = existed = updated = 0
    warehouses_created = locations_created = 0

    for row in data:
        sol_id = str(row.get("sol_id") or "").strip()
        branch = (row.get("sol_desc") or "").strip().upper()
        district = (row.get("division_name") or "").strip().upper()

        # --- APPLY NEW NORMALIZATION ---
        region = normalize_region(row.get("region_name") or "")
        zone = normalize_zone(row.get("circle_office_name") or "")

        state_code = (row.get("state_code") or "").strip().upper()
        state = STATE_MAP.get(state_code, "")

        doc_data = {
            "sol_id": sol_id,
            "branch": branch,
            "district": district,
            "region": region,
            "zone": zone,
            "state_code": state_code,
            "state": state
        }

        # Skip if missing required fields
        if not all(doc_data.get(f) for f in ["sol_id", "branch", "district", "region", "zone", "state_code"]):
            skipped += 1
            continue

        # -------------------------------------
        #   CREATE OR UPDATE SAHAYOG BRANCH
        # -------------------------------------
        existing_branch = frappe.get_all(
            "Sahayog Branch",
            filters={"sol_id": sol_id},
            limit=1
        )

        if existing_branch:
            try:
                doc = frappe.get_doc("Sahayog Branch", existing_branch[0].name)
                for field, value in doc_data.items():
                    doc.set(field, value)
                doc.save(ignore_permissions=True)
                frappe.db.commit()
                updated += 1
            except Exception:
                skipped += 1
                frappe.log_error(frappe.get_traceback(), "Auto Update Sahayog Branch Failed")

        else:
            try:
                frappe.get_doc({"doctype": "Sahayog Branch", **doc_data}).insert(ignore_permissions=True)
                created += 1
            except Exception:
                skipped += 1
                frappe.log_error(frappe.get_traceback(), "Auto Create Sahayog Branch Failed")

        # -------------------------
        #   WAREHOUSE CREATION
        # -------------------------
        if not frappe.db.exists("Warehouse", sol_id):
            try:
                frappe.get_doc({
                    "doctype": "Warehouse",
                    "warehouse_name": sol_id,
                    "custom_warehouse_category": "Branch"
                }).insert(ignore_permissions=True)
                frappe.db.commit()
                warehouses_created += 1
            except Exception:
                skipped += 1
                frappe.log_error(frappe.get_traceback(), f"Warehouse creation failed for {sol_id}")

        # -------------------------
        #   DISTRICT CREATION
        # -------------------------
        if district:
            d_name = district.strip().upper()
            if d_name and frappe.db.exists("DocType", "District") and not frappe.db.exists("District", d_name):
                try:
                    frappe.get_doc({
                        "doctype": "District",
                        "district": d_name
                    }).insert(ignore_permissions=True)
                    frappe.db.commit()
                except Exception:
                    frappe.log_error(frappe.get_traceback(), f"District creation failed for {d_name}")

        # -------------------------
        #   LOCATION CREATION
        # -------------------------
        if not frappe.db.exists("Location", sol_id):
            try:
                frappe.get_doc({
                    "doctype": "Location",
                    "location_name": sol_id
                }).insert(ignore_permissions=True)
                frappe.db.commit()
                locations_created += 1
            except Exception:
                skipped += 1
                frappe.log_error(frappe.get_traceback(), f"Location creation failed for {sol_id}")

    conn.close()
    frappe.db.commit()

    return {
        "inserted": created,
        "updated": updated,
        "skipped": skipped,
        "warehouses_created": warehouses_created,
        "locations_created": locations_created,
        "read_from_source": len(data)
    }

@frappe.whitelist()
def ping():
    print("pong")
    return "pong"
