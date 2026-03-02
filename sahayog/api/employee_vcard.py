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
        "company_email",
        "current_address"   # 👈 ADD ONLY THIS
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
#     vcard = f"""BEGIN:VCARD
# VERSION:3.0
# FN:{full_name}
# TEL;TYPE=CELL:{employee.cell_number or ""}
# EMAIL:{employee.company_email or ""}
# URL:https://www.sahayogmultistate.com/
# ORG:Sahayog Multistate
# TITLE:{employee.designation or ""}
# NOTE:Department - {employee.department or ""}, Branch - {employee.branch or ""}
# ADR;TYPE=WORK:;;{employee.current_address or ""};;;
# END:VCARD
# """
    vcard = (
        "BEGIN:VCARD\r\n"
        "VERSION:3.0\r\n"
        f"N:{employee.last_name or ''};{employee.first_name or ''};;;\r\n"
        f"FN:{full_name}\r\n"
        "ORG:Sahayog Multistate\r\n"
        f"TITLE:{employee.designation or ''}\r\n"
        f"TEL;TYPE=CELL:{employee.cell_number or ''}\r\n"
        f"EMAIL;TYPE=WORK:{employee.company_email or ''}\r\n"
        "URL:https://www.sahayogmultistate.com/\r\n"
        f"ADR;TYPE=WORK:;;{employee.current_address or ''};;;;\r\n"
        f"NOTE:Department - {employee.department or ''}, Branch - {employee.branch or ''}\r\n"
        "END:VCARD\r\n"
    )
    # -------------------------
    # QR Code Generate
    # -------------------------
    qr = qrcode.QRCode(
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=10,
    border=4,
)
    qr.add_data(vcard.encode("utf-8"))
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = BytesIO()
    img.save(buffer, format="PNG")

    qr_base64 = base64.b64encode(buffer.getvalue()).decode()

    return {
        "vcard": vcard,
        "qr_base64": qr_base64
    }
