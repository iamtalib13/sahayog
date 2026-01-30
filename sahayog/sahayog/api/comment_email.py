import frappe
from frappe.utils import get_url_to_form


# ==================================================
# BENCH EXECUTE ENTRY POINT
def send_all_pending_ticket_notifications():
    """
    Run manually:
    bench execute sahayog.sahayog.api.comment_email.send_all_pending_ticket_notifications
    """

    # ---- Pending text comments
    comments = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Sahayog Ticket",
            "comment_type": "Comment",
            "email_sent": ["in", [0, None]]
        },
        pluck="name"
    )

    for name in comments:
        comment = frappe.get_doc("Comment", name)
        _send_comment_email(comment)

    # ---- Pending attachments (File based)
    files = frappe.get_all(
        "File",
        filters={"attached_to_doctype": "Sahayog Ticket"},
        fields=["attached_to_name", "file_url", "owner", "creation"]
    )

    for f in files:
        _send_attachment_email(
            reference_name=f.attached_to_name,
            file_url=f.file_url,
            uploaded_by=f.owner
        )


# ==================================================
# EVENT HANDLERS
def handle_comment(comment, method=None):
    if comment.reference_doctype != "Sahayog Ticket":
        return
    if comment.comment_type != "Comment":
        return
    _send_comment_email(comment)


def handle_attachment(file_doc, method=None):
    if file_doc.attached_to_doctype != "Sahayog Ticket":
        return
    _send_attachment_email(
        reference_name=file_doc.attached_to_name,
        file_url=file_doc.file_url,
        uploaded_by=file_doc.owner
    )
# ==================================================
# INTERNAL HELPERS
# ==================================================
def _send_comment_email(comment):
    if getattr(comment, "email_sent", 0):
        return

    _send_email(
        reference_name=comment.reference_name,
        added_by=comment.comment_by,
        body_html=comment.content,
        is_attachment=False
        # ❌ DO NOT pass override_email here
    )

    frappe.db.set_value("Comment", comment.name, "email_sent", 1)
    frappe.db.commit()


def _send_attachment_email(reference_name, file_url, uploaded_by):
    """
    Send attachment email AND mark related Comment.email_sent = 1
    """

    # --------------------------------------------------
    # 1. Send email
    # --------------------------------------------------
    _send_email(
        reference_name=reference_name,
        added_by=uploaded_by,
        body_html=file_url,
        is_attachment=True
    )

    # --------------------------------------------------
    # 2. Find related ATTACHMENT COMMENT
    # --------------------------------------------------
    attachment_comment = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Sahayog Ticket",
            "reference_name": reference_name,
            "comment_type": "Attachment",
            "email_sent": ["in", [0, None]]
        },
        fields=["name"],
        order_by="creation desc",
        limit=1
    )

    # --------------------------------------------------
    # 3. Mark email_sent = 1
    # --------------------------------------------------
    if attachment_comment:
        frappe.db.set_value(
            "Comment",
            attachment_comment[0].name,
            "email_sent",
            1
        )
        frappe.db.commit()


# ==================================================
# CORE EMAIL SENDER (YOUR UI)
# ==================================================
def _send_email(
    reference_name,
    added_by,
    body_html,
    is_attachment=False,
override_email=None,):
    from frappe.utils import get_url_to_form

    # --------------------------------------------------
    # 1. Resolve recipient email
    # --------------------------------------------------
    if override_email:
        recipient_email = override_email
    else:
        ticket_owner = frappe.db.get_value(
            "Sahayog Ticket", reference_name, "owner"
        )
        if not ticket_owner:
            return

        recipient_email = frappe.db.get_value(
            "Employee", {"user_id": ticket_owner}, "company_email"
        )
        if not recipient_email:
            return

    # --------------------------------------------------
    # 2. Email content
    # --------------------------------------------------
    ticket_url = get_url_to_form("Sahayog Ticket", reference_name)

    if is_attachment:
        header_title = "Ticket Attachment Notification"
        success_text = "A new attachment has been added successfully."
        middle_label = "Attachment"
        middle_value = f"""
            <a href="{body_html}" target="_blank"
               style="color:#0d9488;font-weight:600;">
                View Attachment
            </a>
        """
        subject = f"New Attachment on Ticket {reference_name}"
    else:
        header_title = "Ticket Comment Notification"
        success_text = "A new comment has been added successfully."
        middle_label = "Comment"
        middle_value = body_html
        subject = f"Re: Ticket {reference_name}"

    email_html = f"""
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f3f6f9;padding:20px 0;
                  font-family:Arial,Helvetica,sans-serif;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0"
                 style="background:#ffffff;border-radius:8px;
                        box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:#0d9488;color:#fff;
                         padding:14px 20px;
                         font-weight:bold;text-align:center;">
                {header_title}
              </td>
            </tr>
            <tr>
              <td style="padding:14px 20px;background:#ecfdf5;
                         color:#065f46;">
                {success_text}
              </td>
            </tr>
            <tr>
              <td style="padding:20px;">
                <table width="100%" cellpadding="6">
                  <tr>
                    <td width="35%" style="color:#6b7280;">Ticket No</td>
                    <td><b>{reference_name}</b></td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;">Added By</td>
                    <td>{added_by}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;vertical-align:top;">
                      {middle_label}
                    </td>
                    <td style="background:#f9fafb;padding:10px;border-radius:6px;">
                      {middle_value}
                    </td>
                  </tr>
                </table>

                <div style="margin-top:18px;text-align:center;">
                  <a href="{ticket_url}"
                     style="background:#0d9488;color:#fff;
                            padding:10px 18px;border-radius:6px;
                            text-decoration:none;">
                    View Ticket
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    """

    frappe.sendmail(
        recipients=[recipient_email],
        subject=subject,
        message=email_html,
        now=True
    )


@frappe.whitelist()
def send_manual_ticket_notification(reference_name, comment, recipient_emails):
    recipient_emails = frappe.parse_json(recipient_emails)

    for email in recipient_emails:
        _send_email(
            reference_name=reference_name,
            added_by=frappe.session.user,
            body_html=comment,
            override_email=email   # ✅ CORRECT
        )
