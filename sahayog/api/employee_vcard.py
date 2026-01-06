import frappe
import qrcode
import base64
from io import BytesIO


@frappe.whitelist()
def get_employee_vcard_qr():
    """
    Returns:
    {
      vcard: str,
      qr_base64: str
    }
    """

    if frappe.session.user == "Administrator":
        frappe.throw("Administrator has no Employee record")

    employee = frappe.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        [
            "first_name",
            "last_name",
            "designation",
            "department",
            "branch",
            "cell_number",
            "company_email"
        ],
        as_dict=True
    )

    if not employee:
        frappe.throw("Employee record not found")

    full_name = " ".join(filter(None, [
        employee.first_name,
        employee.last_name
    ]))

    # -------------------------
    # vCard Content
    # -------------------------
    vcard = f"""BEGIN:VCARD
VERSION:3.0
FN:{full_name}
TEL;TYPE=CELL:{employee.cell_number or ""}
EMAIL:{employee.company_email or ""}
ORG:Sahayog Multistate
TITLE:{employee.designation or ""}
NOTE:Department - {employee.department or ""}, Branch - {employee.branch or ""}
END:VCARD
"""

    # -------------------------
    # QR Code Generate
    # -------------------------
    qr = qrcode.QRCode(
        version=2,
        box_size=8,
        border=2
    )
    qr.add_data(vcard)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = BytesIO()
    img.save(buffer, format="PNG")

    qr_base64 = base64.b64encode(buffer.getvalue()).decode()

    return {
        "vcard": vcard,
        "qr_base64": qr_base64
    }
