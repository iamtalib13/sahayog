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
    """
    Frappe DocType class for Sahayog Branch, with auto normalization on save.
    """

    def before_save(self):
        # Normalize/uppercase all fields and format region/zone (no extra spaces)
        fields_to_uppercase = [
            "branch", "district", "region", "zone", "state", "state_code"
        ]
        for fieldname in fields_to_uppercase:
            value = self.get(fieldname)
            if value:
                value = value.strip()
                if fieldname in ["region", "zone"]:
                    value = re.sub(r'\s*-\s*', '-', value)  # Remove spaces around dash
                    value = re.sub(r'\s+', '', value)       # Remove any extra spaces
                self.set(fieldname, value.upper())
        # Map state name from state_code if available
        if self.state_code:
            self.state_code = self.state_code.upper()
            self.state = STATE_MAP.get(self.state_code, self.state)

    def is_complete(self):
        """
        Checks if all required fields except state are filled.
        """
        required_fields = [
            "branch",
            "district",
            "region",
            "zone",
            "state_code",
            "sol_id"
        ]
        missing = [field for field in required_fields if not self.get(field)]
        return len(missing) == 0

    @classmethod
    @frappe.whitelist()
    def auto_create_from_finacle(cls):
        """
        Whitelisted method for scheduler/API/manual: 
        Bulk create Sahayog Branch from external Finacle DB.
        Duplicates (sol_id) and incomplete records are skipped.
        Returns stats.
        """
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        # Ensure you have state_code field in SQL!
        sql = """
        SELECT sol_id, sol_desc, division_name, region_name, circle_office_name, state_code 
        FROM tbaadm.sol
        """
        cursor.execute(sql)
        data = cursor.fetchall()
        created, skipped, existed = 0, 0, 0

        for row in data:
            sol_id = str(row.get("sol_id") or "").strip()
            branch = (row.get("sol_desc") or "").strip().upper()
            district = (row.get("division_name") or "").strip().upper()
            region = cls._normalize_field(row.get("region_name") or "")
            zone = cls._normalize_field(row.get("circle_office_name") or "")
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
            # Completeness check and duplicate check
            if all(doc_data.get(f) for f in ["sol_id", "branch", "district", "region", "zone", "state_code"]):
                if not frappe.db.exists("Sahayog Branch", {"sol_id": sol_id}):
                    try:
                        frappe.get_doc({"doctype": "Sahayog Branch", **doc_data}).insert(ignore_permissions=True)
                        created += 1
                    except Exception as e:
                        frappe.log_error(frappe.get_traceback(), "Auto Create Sahayog Branch Failed")
                        skipped += 1
                else:
                    existed += 1
            else:
                skipped += 1

        conn.close()
        frappe.db.commit()
        return {
            "inserted": created,
            "skipped_missing_detail": skipped,
            "already_exists": existed,
            "read_from_source": len(data)
        }

    @staticmethod
    def _normalize_field(value):
        """
        Removes all spaces, applies uppercase, and formats dashes.
        Specially for region/zone type fields.
        """
        value = value.strip().upper()
        value = re.sub(r'\s*-\s*', '-', value)
        value = re.sub(r'\s+', '', value)
        return value
