import frappe
from frappe.utils import getdate, add_days, today

def send_weekly_trainer_report():
    # End of week = today (you will schedule this on Saturday)
    week_end = getdate(today())
    # Start of week = Monday (6 days window: Mon–Sat)
    # If your week_end is always Saturday, this gives Monday
    week_start = add_days(week_end, -5)

    # 1) Calls in this week (Mon–Sat) by trainer
    rows_calls = frappe.db.sql(
        """
        SELECT trainer AS trainer_id,
               COUNT(*) AS total_calls
        FROM `tabAgent Activation Call Log`
        WHERE calling_date BETWEEN %s AND %s
          AND trainer IS NOT NULL AND trainer != ''
        GROUP BY trainer
        ORDER BY trainer
        """,
        (week_start, week_end),
        as_dict=True,
    )

    # --- same helpers as daily ---

    def get_user_from_trainer(trainer_id):
        if not trainer_id:
            return None
        user = frappe.db.get_value("User", {"email": trainer_id}, "name")
        if not user:
            user = frappe.db.exists("User", trainer_id)
            if user:
                user = trainer_id
        return user

    def is_trainer_role(trainer_id):
        user = get_user_from_trainer(trainer_id)
        if not user:
            return False
        try:
            roles = frappe.get_roles(user)
            if "Trainer" not in roles:
                return False
            if "Administrator" in roles or "Trainer Head" in roles:
                return False
            return True
        except Exception:
            return False

    # Filter rows to only pure Trainer users
    filtered_rows_calls = [r for r in rows_calls if is_trainer_role(r.trainer_id)]
    trainer_ids_with_calls = [r.trainer_id for r in filtered_rows_calls]

    # All Trainer users (same logic as daily)
    all_trainer_users = frappe.db.sql(
        """
        SELECT DISTINCT parent AS trainer_id
        FROM `tabHas Role`
        WHERE role = 'Trainer'
        """,
        as_dict=True,
    )

    all_trainers = []
    for trainer_user in all_trainer_users:
        trainer_id = trainer_user["trainer_id"]
        if frappe.db.exists("User", trainer_id):
            try:
                user_roles = frappe.get_roles(trainer_id)
                if (
                    "Trainer" in user_roles
                    and "Administrator" not in user_roles
                    and "Trainer Head" not in user_roles
                ):
                    all_trainers.append({"trainer_id": trainer_id})
            except Exception:
                continue

    # Map trainer → full_name
    name_map = {}
    for t in all_trainers:
        try:
            trainer_id = t["trainer_id"]
            full_name = (
                frappe.db.get_value("User", trainer_id, "full_name") or trainer_id
            )
            name_map[trainer_id] = full_name
        except Exception:
            name_map[t["trainer_id"]] = t["trainer_id"]

    trainers_with_calls = [
        {
            "trainer_id": r.trainer_id,
            "trainer_name": name_map.get(r.trainer_id, r.trainer_id),
            "total_calls": int(r.total_calls),
        }
        for r in filtered_rows_calls
    ]

    trainers_no_calls = [
        {
            "trainer_id": t["trainer_id"],
            "trainer_name": name_map.get(t["trainer_id"], t["trainer_id"]),
        }
        for t in all_trainers
        if t["trainer_id"] not in trainer_ids_with_calls
    ]

    total_calls_week = sum(r["total_calls"] for r in trainers_with_calls)

    # Reuse same design, but change texts & show date range + total_calls_week
    body_html = frappe.render_template(
        """
<div style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:800px;margin:20px auto;padding:0 12px;">

    <style>
      @media only screen and (max-width: 600px) {
        .ss-wrapper {
          padding: 14px 14px !important;
          border-radius: 0 !important;
        }
        .ss-header-row {
          display: block !important;
        }
        .ss-header-left,
        .ss-header-right {
          width: 100% !important;
          text-align: left !important;
          margin-bottom: 8px !important;
        }
        .ss-header-badge {
          font-size: 10px !important;
        }
        .ss-title {
          font-size: 17px !important;
        }
        .ss-report-date-label {
          font-size: 11px !important;
        }
        .ss-report-date-value {
          font-size: 12px !important;
        }
        .ss-total-calls-label {
          font-size: 11px !important;
        }
        .ss-total-calls-value {
          font-size: 12px !important;
        }
        .ss-table {
          font-size: 11px !important;
        }
        .ss-table th,
        .ss-table td {
          padding: 6px 6px !important;
        }
        .ss-footer {
          font-size: 10px !important;
        }
      }
    </style>

    <div class="ss-wrapper" style="background:#ffffff;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 8px 20px rgba(15,23,42,0.08);padding:20px 22px;">

      <!-- Header -->
      <div class="ss-header-row" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;">
        <div class="ss-header-left" style="display:block;">
          <div class="ss-header-badge" style="display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">
            SS Trainer Dashboard
          </div>
          <h2 class="ss-title" style="margin:6px 0 0 0;font-size:19px;color:#111827;">Trainer Weekly Activity</h2>
          <p style="margin:4px 0 0 0;font-size:12px;color:#6b7280;">
            Weekly summary of trainer activation calls and engagement (Monday to Saturday).
          </p>
        </div>
        <div class="ss-header-right" style="text-align:right;">
          <div class="ss-report-date-label" style="font-size:11px;color:#6b7280;margin-bottom:4px;">Week Range</div>
          <div class="ss-report-date-value" style="font-size:13px;font-weight:600;color:#111827;">
            {{ week_start }} to {{ week_end }}
          </div>
          <div style="margin-top:6px;font-size:11px;color:#6b7280;">
            <span class="ss-total-calls-label">Total Calls (Week):</span>
            <span class="ss-total-calls-value" style="font-weight:600;color:#2563eb;">{{ total_calls_week }}</span>
          </div>
        </div>
      </div>

      <div style="height:1px;background:linear-gradient(to right,#e5e7eb,#f9fafb,#e5e7eb);margin:10px 0 18px 0;"></div>

      <!-- Weekly Trainer Activity -->
      <h3 style="margin:0 0 6px 0;font-size:14px;color:#111827;">Weekly Trainer Activity</h3>
      <p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;">
        Trainers who completed at least one activation call this week.
      </p>

      <table class="ss-table" width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:12px;border-radius:6px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th align="left" style="border:1px solid #e5e7eb;padding:7px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">
              Trainer ID
            </th>
            <th align="left" style="border:1px solid #e5e7eb;padding:7px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">
              Trainer Name
            </th>
            <th align="right" style="border:1px solid #e5e7eb;padding:7px 8px;color:#6b7280;font-weight:600;text-transform:uppercase;font-size:11px;">
              Total Calls (Week)
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
            <tr style="background:#eff6ff;">
              <td colspan="2" align="right" style="border:1px solid #e5e7eb;padding:7px 8px;color:#1d4ed8;font-size:11px;font-weight:600;text-transform:uppercase;">
                Total
              </td>
              <td align="right" style="border:1px solid #e5e7eb;padding:7px 8px;color:#1d4ed8;font-weight:700;">
                {{ total_calls_week }}
              </td>
            </tr>
          {% else %}
            <tr>
              <td colspan="3" align="center" style="border:1px solid #e5e7eb;padding:10px 8px;color:#6b7280;font-size:12px;">
                No trainer made calls this week.
              </td>
            </tr>
          {% endif %}
        </tbody>
      </table>

      <div style="height:18px;"></div>

      <!-- Trainers with no calls in week -->
      <h3 style="margin:0 0 6px 0;font-size:14px;color:#111827;">Trainers With No Calls This Week</h3>
      <p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;">
        Trainers who did not log any activation call between Monday and Saturday.
      </p>

      <table class="ss-table" width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:12px;border-radius:6px;overflow:hidden;">
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
                All trainers made at least one call this week.
              </td>
            </tr>
          {% endif %}
        </tbody>
      </table>

      <div class="ss-footer" style="margin-top:18px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
        This email was generated automatically by SS Trainer Dashboard (Weekly Summary).
      </div>

    </div>
  </div>
</div>
        """,
        {
            "week_start": week_start.strftime("%d-%m-%Y"),
            "week_end": week_end.strftime("%d-%m-%Y"),
            "trainers_with_calls": trainers_with_calls,
            "trainers_no_calls": trainers_no_calls,
            "total_calls_week": total_calls_week,
        },
    )

    frappe.sendmail(
        recipients=[
            "sstrainingmanager.rongp@sahayogmultistate.com",
            "Jitendra.pachlongia@sahayogmultistate.com",
            "samresh.c@sahayogmultistate.com",
            "talib.s@sahayogmultistate.com",
            "frappeone59@gmail.com",
            # "frappeone59@gmail.com",
            # "iamfaijankq@gmail.com",
            # "rarishab893@gmail.com",
        ],
        subject=f"Trainer Weekly Activity (Mon–Sat) - {week_start.strftime('%d-%m-%Y')} to {week_end.strftime('%d-%m-%Y')}",
        message=body_html,
    )
 