import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # Comprehensive cleanup to rebuild the layout from scratch
    fields_to_cleanup = [
        "custom_asset_location_type", "custom_zone", "custom_state", "custom_state_code",
        "custom_division", "custom_sub_department", "custom_brand",
        "naming_controls_section", "naming_col_1", "naming_col_2", "asset_configuration_section",
        "asset_naming_section", "naming_column_1", "naming_column_2", "asset_config_section",
        "naming_details_section", "col_break_1", "col_break_2", "config_section"
    ]
    for fieldname in fields_to_cleanup:
        if frappe.db.exists("Custom Field", {"dt": "Asset", "fieldname": fieldname}):
            frappe.db.delete("Custom Field", {"dt": "Asset", "fieldname": fieldname})

    fields = [
        # --- Section 1: Asset Naming & Identification (TOP) ---
        {
            "fieldname": "naming_details_section",
            "label": "Asset Identification & Naming",
            "fieldtype": "Section Break",
            "depends_on": "eval:doc.__islocal",
            "insert_after": None # Very top
        },
        {
            "fieldname": "col_break_1",
            "fieldtype": "Column Break",
            "insert_after": "naming_details_section"
        },
        {
            "fieldname": "asset_location_type",
            "label": "Location Type",
            "fieldtype": "Select",
            "options": "\nBranch\nHO\nRO\nZO",
            "default": "Branch",
            "reqd": 1,
            "insert_after": "col_break_1"
        },
        {
            "fieldname": "zone",
            "label": "Zone",
            "fieldtype": "Link",
            "options": "Zone",
            "reqd": 1,
            "insert_after": "asset_location_type"
        },
        {
            "fieldname": "state",
            "label": "State",
            "fieldtype": "Select",
            "options": "\nAndaman and Nicobar Islands\nAndhra Pradesh\nArunachal Pradesh\nAssam\nBihar\nChandigarh\nChhattisgarh\nDadra and Nagar Haveli and Daman and Diu\nDelhi\nGoa\nGujarat\nHaryana\nHimachal Pradesh\nJammu and Kashmir\nJharkhand\nKarnataka\nKerala\nLadakh\nLakshadweep\nMadhya Pradesh\nMaharashtra\nManipur\nMeghalaya\nMizoram\nNagaland\nOdisha\nPuducherry\nPunjab\nRajasthan\nSikkim\nTamil Nadu\nTelangana\nTripura\nUttar Pradesh\nUttarakhand\nWest Bengal",
            "reqd": 1,
            "insert_after": "zone"
        },
        {
            "fieldname": "col_break_2",
            "fieldtype": "Column Break",
            "insert_after": "state"
        },
        {
            "fieldname": "division",
            "label": "Division",
            "fieldtype": "Link",
            "options": "Division",
            "reqd": 1,
            "insert_after": "col_break_2"
        },
        {
            "fieldname": "brand",
            "label": "Brand",
            "fieldtype": "Link",
            "options": "Brand",
            "reqd": 1,
            "insert_after": "division"
        },
        # --- Section 2: Technical Configuration (Table) ---
        {
            "fieldname": "config_details_section",
            "label": "Asset Configuration Details",
            "fieldtype": "Section Break",
            "insert_after": "department"
        },
        {
            "fieldname": "asset_configuration",
            "label": "Configuration Table",
            "fieldtype": "Table",
            "options": "Asset Configuration",
            "allow_on_submit": 1,
            "insert_after": "config_details_section"
        }
    ]

    for df in fields:
        if not frappe.db.exists("Custom Field", {"dt": "Asset", "fieldname": df["fieldname"]}):
            create_custom_field("Asset", df, ignore_validate=True)
        else:
            # Force update for UI/UX alignment
            cf = frappe.get_doc("Custom Field", {"dt": "Asset", "fieldname": df["fieldname"]})
            cf.update(df)
            cf.save()
    
    frappe.db.commit()
