# import frappe
# from frappe.utils import today, getdate


# def send_daily_trainer_report():
#     report_date = getdate(today())

#     # 1) Trainers who made calls today
#     rows_calls = frappe.db.sql(
#         """
#         SELECT trainer AS trainer_id,
#                COUNT(*) AS total_calls
#         FROM `tabAgent Activation Call Log`
#         WHERE calling_date = %s
#           AND trainer IS NOT NULL AND trainer != ''
#         GROUP BY trainer
#         ORDER BY trainer
#         """,
#         report_date,
#         as_dict=True,
#     )

#     trainer_ids_with_calls = [r.trainer_id for r in rows_calls]

#     # 2) All trainers from log
#     all_trainers = frappe.db.sql(
#         """
#         SELECT DISTINCT trainer AS trainer_id
#         FROM `tabAgent Activation Call Log`
#         WHERE trainer IS NOT NULL AND trainer != ''
#         """,
#         as_dict=True,
#     )

#     # Map trainer → full_name
#     name_map = {
#         t.trainer_id: frappe.db.get_value("User", t.trainer_id, "full_name") or t.trainer_id
#         for t in all_trainers
#     }

#     trainers_with_calls = [
#         {
#             "trainer_id": r.trainer_id,
#             "trainer_name": name_map.get(r.trainer_id, r.trainer_id),
#             "total_calls": int(r.total_calls),
#         }
#         for r in rows_calls
#     ]

#     trainers_no_calls = [
#         {
#             "trainer_id": t.trainer_id,
#             "trainer_name": name_map.get(t.trainer_id, t.trainer_id),
#         }
#         for t in all_trainers
#         if t.trainer_id not in trainer_ids_with_calls
#     ]

#     # Build full HTML here (safe from UI editor)
#     body_html = frappe.render_template(
#         """
# <div style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
#   <div style="max-width:800px;margin:16px auto;padding:16px;">
#     <div style="background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(15,23,42,0.08);padding:20px;">

#       <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;">
#         <div>
#           <h2 style="margin:0;font-size:18px;color:#111827;">Trainer Daily Activity</h2>
#           <p style="margin:4px 0 0 0;font-size:12px;color:#6b7280;">
#             Daily summary of trainer activation calls.
#           </p>
#         </div>
#         <div style="text-align:right;display:flex;flex-direction:row; gap:12px;">
#           <div style="font-size:11px;color:#6b7280;">Date</div>
#           <div style="font-size:13px;font-weight:600;color:#111827;">
#             {{ report_date }}
#           </div>
#         </div>
#       </div>

#       <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px 0;">

#       <h3 style="margin:0 0 8px 0;font-size:14px;color:#111827;">Today Trainer Activity</h3>
#       <p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;">
#         Trainers who made at least one call today.
#       </p>

#       <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:12px;">
#         <thead>
#           <tr style="background:#f9fafb;">
#             <th align="left" style="border:1px solid #e5e7eb;padding:6px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">Trainer ID</th>
#             <th align="left" style="border:1px solid #e5e7eb;padding:6px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">Trainer Name</th>
#             <th align="right" style="border:1px solid #e5e7eb;padding:6px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">Total Calls</th>
#           </tr>
#         </thead>
#         <tbody>
#           {% if trainers_with_calls %}
#             {% for row in trainers_with_calls %}
#               <tr style="background-color:#ffffff;">
#                 <td style="border:1px solid #e5e7eb;padding:6px 8px;color:#111827;">{{ row.trainer_id }}</td>
#                 <td style="border:1px solid #e5e7eb;padding:6px 8px;color:#111827;">{{ row.trainer_name }}</td>
#                 <td align="right" style="border:1px solid #e5e7eb;padding:6px 8px;color:#111827;font-weight:600;">{{ row.total_calls }}</td>
#               </tr>
#             {% endfor %}
#           {% else %}
#             <tr>
#               <td colspan="3" align="center" style="border:1px solid #e5e7eb;padding:10px 8px;color:#6b7280;font-size:12px;">
#                 No trainer made calls today.
#               </td>
#             </tr>
#           {% endif %}
#         </tbody>
#       </table>

#       <div style="height:18px;"></div>

#       <h3 style="margin:0 0 8px 0;font-size:14px;color:#111827;">Trainers With No Calls Today</h3>
#       <p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;">
#         Trainers who did not log any activation call today.
#       </p>

#       <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:12px;">
#         <thead>
#           <tr style="background:#f9fafb;">
#             <th align="left" style="border:1px solid #e5e7eb;padding:6px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">Trainer ID</th>
#             <th align="left" style="border:1px solid #e5e7eb;padding:6px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">Trainer Name</th>
#           </tr>
#         </thead>
#         <tbody>
#           {% if trainers_no_calls %}
#             {% for row in trainers_no_calls %}
#               <tr style="background-color:#ffffff;">
#                 <td style="border:1px solid #e5e7eb;padding:6px 8px;color:#111827;">{{ row.trainer_id }}</td>
#                 <td style="border:1px solid #e5e7eb;padding:6px 8px;color:#111827;">{{ row.trainer_name }}</td>
#               </tr>
#             {% endfor %}
#           {% else %}
#             <tr>
#               <td colspan="2" align="center" style="border:1px solid #e5e7eb;padding:10px 8px;color:#6b7280;font-size:12px;">
#                 All trainers made at least one call today.
#               </td>
#             </tr>
#           {% endif %}
#         </tbody>
#       </table>

#       <div style="margin-top:18px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
#         This email was generated automatically by SS Trainer Dashboard.
#       </div>

#     </div>
#   </div>
# </div>
#         """,
#         {
#             "report_date": report_date.strftime("%d-%m-%Y"),
#             "trainers_with_calls": trainers_with_calls,
#             "trainers_no_calls": trainers_no_calls,
#         },
#     )

#     # Use Email Template just as a wrapper: {{ body }}
#     frappe.sendmail(
#         recipients=[
#             "frappeone59@gmail.com",
#             "iamfaijankq@gmail.com",
#         ],
#         subject=f"Trainer Daily Activity - {report_date.strftime('%d-%m-%Y')}",
#         message=body_html,   # <-- use rendered HTML directly
#     )







import frappe
from frappe.utils import today, getdate


def send_daily_trainer_report():
    report_date = getdate(today())

    # 1) Trainers who made calls today
    rows_calls = frappe.db.sql(
        """
        SELECT trainer AS trainer_id,
               COUNT(*) AS total_calls
        FROM `tabAgent Activation Call Log`
        WHERE calling_date = %s
          AND trainer IS NOT NULL AND trainer != ''
        GROUP BY trainer
        ORDER BY trainer
        """,
        report_date,
        as_dict=True,
    )

    trainer_ids_with_calls = [r.trainer_id for r in rows_calls]

    # 2) All trainers from log
    all_trainers = frappe.db.sql(
        """
        SELECT DISTINCT trainer AS trainer_id
        FROM `tabAgent Activation Call Log`
        WHERE trainer IS NOT NULL AND trainer != ''
        """,
        as_dict=True,
    )

    # Map trainer → full_name
    name_map = {
        t.trainer_id: frappe.db.get_value("User", t.trainer_id, "full_name") or t.trainer_id
        for t in all_trainers
    }

    trainers_with_calls = [
        {
            "trainer_id": r.trainer_id,
            "trainer_name": name_map.get(r.trainer_id, r.trainer_id),
            "total_calls": int(r.total_calls),
        }
        for r in rows_calls
    ]

    trainers_no_calls = [
        {
            "trainer_id": t.trainer_id,
            "trainer_name": name_map.get(t.trainer_id, t.trainer_id),
        }
        for t in all_trainers
        if t.trainer_id not in trainer_ids_with_calls
    ]

    total_calls_today = sum(r["total_calls"] for r in trainers_with_calls)

    body_html = frappe.render_template(
        """
<div style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:800px;margin:20px auto;padding:0 12px;">
    <div style="background:#ffffff;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 8px 20px rgba(15,23,42,0.08);padding:20px 22px;">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;">
        <div>
          <div style="display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">
            SS Trainer Dashboard
          </div>
          <h2 style="margin:6px 0 0 0;font-size:19px;color:#111827;">Trainer Daily Activity</h2>
          <p style="margin:4px 0 0 0;font-size:12px;color:#6b7280;">
            Daily summary of trainer activation calls and engagement.
          </p>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Report Date</div>
          <div style="font-size:13px;font-weight:600;color:#111827;">
            {{ report_date }}
          </div>
          <div style="margin-top:6px;font-size:11px;color:#6b7280;">
            Total Calls Today:
            <span style="font-weight:600;color:#2563eb;">{{ total_calls_today }}</span>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:linear-gradient(to right,#e5e7eb,#f9fafb,#e5e7eb);margin:10px 0 18px 0;"></div>

      <!-- Today Trainer Activity -->
      <h3 style="margin:0 0 6px 0;font-size:14px;color:#111827;">Today Trainer Activity</h3>
      <p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;">
        Trainers who completed at least one activation call today.
      </p>

      <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:12px;border-radius:6px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th align="left" style="border:1px solid #e5e7eb;padding:7px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">
              Trainer ID
            </th>
            <th align="left" style="border:1px solid #e5e7eb;padding:7px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">
              Trainer Name
            </th>
            <th align="right" style="border:1px solid #e5e7eb;padding:7px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">
              Total Calls
            </th>
          </tr>
        </thead>
        <tbody>
          {% if trainers_with_calls %}
            {% for row in trainers_with_calls %}
              <tr style="background-color:{% if loop.index0 % 2 == 0 %}#ffffff{% else %}#f9fafb{% endif %};">
                <td style="border:1px solid #e5e7eb;padding:6px 8px;color:#111827;">{{ row.trainer_id }}</td>
                <td style="border:1px solid #e5e7eb;padding:6px 8px;color:#111827;">{{ row.trainer_name }}</td>
                <td align="right" style="border:1px solid #e5e7eb;padding:6px 8px;color:#111827;font-weight:600;">
                  {{ row.total_calls }}
                </td>
              </tr>
            {% endfor %}
            <!-- Summary row -->
            <tr style="background:#eff6ff;">
              <td colspan="2" align="right" style="border:1px solid #e5e7eb;padding:7px 8px;color:#1d4ed8;font-size:11px;font-weight:600;text-transform:uppercase;">
                Total
              </td>
              <td align="right" style="border:1px solid #e5e7eb;padding:7px 8px;color:#1d4ed8;font-weight:700;">
                {{ total_calls_today }}
              </td>
            </tr>
          {% else %}
            <tr>
              <td colspan="3" align="center" style="border:1px solid #e5e7eb;padding:10px 8px;color:#6b7280;font-size:12px;">
                No trainer made calls today.
              </td>
            </tr>
          {% endif %}
        </tbody>
      </table>

      <!-- Spacer -->
      <div style="height:18px;"></div>

      <!-- Trainers with no calls -->
      <h3 style="margin:0 0 6px 0;font-size:14px;color:#111827;">Trainers With No Calls Today</h3>
      <p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;">
        Trainers who did not log any activation call today.
      </p>

      <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:12px;border-radius:6px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th align="left" style="border:1px solid #e5e7eb;padding:7px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">
              Trainer ID
            </th>
            <th align="left" style="border:1px solid #e5e7eb;padding:7px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">
              Trainer Name
            </th>
          </tr>
        </thead>
        <tbody>
          {% if trainers_no_calls %}
            {% for row in trainers_no_calls %}
              <tr style="background-color:{% if loop.index0 % 2 == 0 %}#ffffff{% else %}#f9fafb{% endif %};">
                <td style="border:1px solid #e5e7eb;padding:6px 8px;color:#111827;">{{ row.trainer_id }}</td>
                <td style="border:1px solid #e5e7eb;padding:6px 8px;color:#111827;">{{ row.trainer_name }}</td>
              </tr>
            {% endfor %}
          {% else %}
            <tr>
              <td colspan="2" align="center" style="border:1px solid #e5e7eb;padding:10px 8px;color:#6b7280;font-size:12px;">
                All trainers made at least one call today.
              </td>
            </tr>
          {% endif %}
        </tbody>
      </table>

      <!-- Footer -->
      <div style="margin-top:18px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
        This email was generated automatically by SS Trainer Dashboard.
      </div>

    </div>
  </div>
</div>
        """,
        {
            "report_date": report_date.strftime("%d-%m-%Y"),
            "trainers_with_calls": trainers_with_calls,
            "trainers_no_calls": trainers_no_calls,
            "total_calls_today": total_calls_today,
        },
    )

    frappe.sendmail(
        recipients=[
            "sstrainingmanager.rongp@sahayogmultistate.com",
            "Jitendra.pachlongia@sahayogmultistate.com",
            "samresh.c@sahayogmultistate.com",
            # "frappeone59@gmail.com",
            # "iamfaijankq@gmail.com",
        ],
        subject=f"Trainer Daily Activity - {report_date.strftime('%d-%m-%Y')}",
        message=body_html,
    )
