import frappe
import re

def custom_asset_autoname(doc, method):
    # Prefix 1: Hardcoded
    company_prefix = "SMCCSL"

    # Prefix 2: Zone (Z1, Z2, etc.)
    zone_code = ""
    if doc.zone:
        # Extract number from zone name (e.g., "Zone 3" -> "3")
        zone_digits = re.findall(r'\d+', doc.zone)
        if zone_digits:
            zone_code = f"Z{zone_digits[0]}"
        else:
            zone_code = doc.zone.upper()[:2]
    
    # Prefix 3: State Code (Mapping full name to code)
    state_mapping = {
        "Andaman and Nicobar Islands": "AN",
        "Andhra Pradesh": "AP",
        "Arunachal Pradesh": "AR",
        "Assam": "AS",
        "Bihar": "BR",
        "Chandigarh": "CH",
        "Chhattisgarh": "CT",
        "Dadra and Nagar Haveli and Daman and Diu": "DN",
        "Delhi": "DL",
        "Goa": "GA",
        "Gujarat": "GJ",
        "Haryana": "HR",
        "Himachal Pradesh": "HP",
        "Jammu and Kashmir": "JK",
        "Jharkhand": "JH",
        "Karnataka": "KA",
        "Kerala": "KL",
        "Ladakh": "LA",
        "Lakshadweep": "LD",
        "Madhya Pradesh": "MP",
        "Maharashtra": "MH",
        "Manipur": "MN",
        "Meghalaya": "ML",
        "Mizoram": "MZ",
        "Nagaland": "NL",
        "Odisha": "OR",
        "Puducherry": "PY",
        "Punjab": "PB",
        "Rajasthan": "RJ",
        "Sikkim": "SK",
        "Tamil Nadu": "TN",
        "Telangana": "TG",
        "Tripura": "TR",
        "Uttar Pradesh": "UP",
        "Uttarakhand": "UT",
        "West Bengal": "WB"
    }
    state_code = state_mapping.get(doc.state, (doc.state or "").upper()[:2])

    # Prefix 4: Sahayog Branch Name (Complete)
    location_part = (doc.location or "").strip().upper()

    # Prefix 5: Division (First 3 letters)
    division_code = (doc.division or "").strip().upper()[:3]

    # Prefix 6: Asset Name (First 3 letters)
    asset_name_code = (doc.item_name or doc.item_code or "").strip().upper()[:3]

    # Prefix 7: Brand (Full Brand Name)
    brand_code = (doc.brand or "").strip().upper()

    # Construct the base prefix for serial number
    # Syntax: SMCCSL/ZONE/STATE/LOCATION/DIVISION/ASSET/BRAND/
    parts = [
        company_prefix,
        zone_code,
        state_code,
        location_part,
        division_code,
        asset_name_code,
        brand_code
    ]
    
    # Filter out empty parts and join with /
    naming_prefix = "/".join([p for p in parts if p]) + "/"

    # Get last asset with the same prefix to determine serial number
    last = frappe.db.sql(
        """SELECT name FROM `tabAsset`
           WHERE name LIKE %s
           ORDER BY name DESC LIMIT 1""",
        (naming_prefix + "%",),
    )

    if last:
        try:
            # Extract serial number from the end
            last_number = int(last[0][0].split("/")[-1])
        except (ValueError, IndexError):
            last_number = 0
    else:
        last_number = 0

    next_number = str(last_number + 1).zfill(3)
    doc.name = f"{naming_prefix}{next_number}"
