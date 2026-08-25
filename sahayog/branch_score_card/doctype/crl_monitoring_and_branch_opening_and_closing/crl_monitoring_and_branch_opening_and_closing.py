import datetime
import time as pytime
from datetime import date, datetime as dt, time, timedelta
import psycopg2
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import date_diff, getdate, now_datetime, flt


class CRLMonitoringandBranchOpeningandClosing(Document):

    # =========================================================
    # AUTONAME
    # =========================================================
    def autoname(self):
        self.name = f"{self.sol_id}-{self.month}-{self.year}"

    # =========================================================
    # VALIDATE (Backend Security Validation & Auto Calculate)
    # =========================================================
    def validate(self):
        self.sort_child_table_by_date()
        self.calculate_actual_values()
        self.validate_backend_date_range()
    def sort_child_table_by_date(self):
        if hasattr(self, "table_nzzy") and self.table_nzzy:
            self.table_nzzy = sorted(
                self.table_nzzy,
                key=lambda x: getdate(x.date) if x.date else getdate("9999-12-31")
            )
            # Re-index row numbers (idx) sequentially (1, 2, 3...)
            for idx, row in enumerate(self.table_nzzy, start=1):
                row.idx = idx
                
    def validate_backend_date_range(self):
        if self.from_date and self.to_date:
            f_date = getdate(self.from_date)
            t_date = getdate(self.to_date)

            if t_date < f_date:
                frappe.throw(_("To Date cannot be earlier than From Date."))

            if date_diff(t_date, f_date) + 1 > 31:
                frappe.throw(_("Date range cannot exceed 31 days."))

    # =========================================================
    # CALCULATE ACTUAL VALUES
    # =========================================================
    def calculate_actual_values(self):
        # 1. CONDITION: Agar child table blank/empty hai, to fields ko None (Blank) rakhein
        table_rows = self.get("table_nzzy", [])
        if not table_rows:
            self.crl_monitoring_actual_value = None
            self.branch_opening_actual_value = None
            self.branch_closing_actual_value = None
            return

        crl_count = 0
        opening_count = 0
        closing_count = 0

        crl = flt(self.br_cash_retention_limit_crl or 0)

        for d in table_rows:
            if not d.date or d.sync_status == "No Record in Finacle":
                continue

            date_value = getdate(d.date)

            # Skip Sunday (Weekday 6)
            if date_value.weekday() == 6:
                continue

            # 1. CRL Violation Count
            if (
                crl > 0
                and d.eod_closing_balance is not None
                and flt(d.eod_closing_balance) > crl
            ):
                crl_count += 1

            # 2. Opening Delay Count (> 10:00:00 AM)
            # 10:00:01 ho ya 1 sec bhi upar -> Delay count hoga
            if d.branch_opening_time:
                opening_time = self.convert_to_time(d.branch_opening_time)
                if opening_time and opening_time > time(10, 0, 0):
                    opening_count += 1

            # 3. Closing Delay Count (Sat > 16:30:00, Mon-Fri > 18:00:00)
            if d.branch_closing_time:
                closing_time = self.convert_to_time(d.branch_closing_time)
                if not closing_time:
                    continue

                weekday = date_value.weekday()
                # Saturday (Weekday 5): 4:30 PM (16:30:00) se 1 sec bhi upar -> Delay
                if weekday == 5 and closing_time > time(16, 30, 0):
                    closing_count += 1
                # Mon-Fri (Weekday 0 to 4): 6:00 PM (18:00:00) se 1 sec bhi upar -> Delay
                elif weekday < 5 and closing_time > time(18, 0, 0):
                    closing_count += 1

        # 2. Child table me data hote hi values assign hongi (chahe count 0 hi kyun na ho)
        self.crl_monitoring_actual_value = int(crl_count)
        self.branch_opening_actual_value = int(opening_count)
        self.branch_closing_actual_value = int(closing_count)

    # =========================================================
    # CONVERT VALUE TO TIME HELPER
    # =========================================================
    def convert_to_time(self, value):
        if not value:
            return None
        if isinstance(value, time):
            return value
        if isinstance(value, dt):
            return value.time()

        value = str(value).strip()
        for fmt in ("%H:%M:%S", "%H:%M", "%Y-%m-%d %H:%M:%S"):
            try:
                return dt.strptime(value, fmt).time()
            except ValueError:
                continue
        return None


# =============================================================
# POSTGRESQL DB CONNECTION HELPER (3-Times Retry Logic)
# =============================================================
def db_connection(retries=3, delay=2):
    """Connect to external PostgreSQL / Finacle database with Retry logic."""
    for attempt in range(retries):
        try:
            creds = frappe.get_single("Finacle DB Credentials")
            return psycopg2.connect(
                host=creds.db_host,
                port=int(creds.db_port),
                user=creds.db_user,
                password=creds.get_password("db_password"),
                database=creds.db_name,
                connect_timeout=5
            )
        except Exception as e:
            if attempt == retries - 1:
                frappe.log_error(frappe.get_traceback(), f"PostgreSQL Connection Failed after {retries} retries")
                frappe.throw(_("Database Connection Error: Could not connect to Finacle."))
            pytime.sleep(delay)


# =============================================================
# GET BRANCH OPENING / CLOSING FROM FINACLE
# =============================================================
def get_branch_opening_closing(conn, transaction_date):
    """Fetch Branch Opening and Closing Time from Finacle."""
    cursor = conn.cursor()
    try:
        query = """
            SELECT
                g.sol_id,
                MIN(h.entry_date) AS opening_time,
                MAX(h.pstd_date) AS closing_time
            FROM tbaadm.htd h
            LEFT JOIN tbaadm.gam g ON h.acid = g.acid
            LEFT JOIN tbaadm.sol s ON g.sol_id = s.sol_id
            WHERE h.tran_date = %s
              AND h.tran_sub_type = 'CT'
              AND h.gl_sub_head_code = '11001'
              AND h.del_flg = 'N'
            GROUP BY g.sol_id
            ORDER BY g.sol_id
        """
        cursor.execute(query, (transaction_date,))
        rows = cursor.fetchall()
    finally:
        cursor.close()

    data = {}
    for row in rows:
        sol_id = str(row[0]).strip()
        data[sol_id] = {"opening_time": row[1], "closing_time": row[2]}
    return data


# =============================================================
# GET EOD BALANCE FROM FINACLE
# =============================================================
def get_eod_balance(conn, transaction_date):
    """Fetch EOD Closing Balance from Finacle."""
    cursor = conn.cursor()
    try:
        query = """
            SELECT
                g.sol_id,
                SUM(h.tran_amt) AS eod_closing_balance
            FROM tbaadm.htd h
            JOIN tbaadm.gam g ON h.acid = g.acid
            JOIN tbaadm.sol s ON g.sol_id = s.sol_id
            WHERE g.acct_name ILIKE %s
              AND h.part_tran_type = 'D'
              AND h.tran_date = %s
              AND g.schm_type IN ('OAP', 'OAB')
              AND h.pstd_flg = 'Y'
              AND h.del_flg = 'N'
              AND g.entity_cre_flg = 'Y'
            GROUP BY g.sol_id
            ORDER BY g.sol_id
        """
        cursor.execute(query, ("%CASH IN HAND%", transaction_date))
        rows = cursor.fetchall()
    finally:
        cursor.close()

    data = {}
    for row in rows:
        sol_id = str(row[0]).strip()
        data[sol_id] = flt(row[1] or 0)
    return data


def parse_time_val(val):
    if not val:
        return None
    if isinstance(val, time):
        return val.strftime("%H:%M:%S")
    if isinstance(val, dt):
        return val.time().strftime("%H:%M:%S")
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ["none", "null"]:
        return None
    for fmt in ("%H:%M:%S", "%H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f"):
        try:
            return dt.strptime(val_str, fmt).strftime("%H:%M:%S")
        except ValueError:
            continue
    return None


# =============================================================
# AUTOMATED SCHEDULER SYNC (Runs via Cron / Console)
# =============================================================
def sync_daily_crl(target_date=None, force_resync=False, filter_sol_id=None):
    """Daily Cron Function for Automated Tracking (Runs for T-1 / Yesterday)"""
    if target_date:
        sync_date = getdate(target_date)
    else:
        sync_date = date.today() - timedelta(days=1)

    if sync_date.weekday() == 6:  # Skip Sunday
        return 0

    month_name = sync_date.strftime("%B")
    year = sync_date.year

    try:
        conn = db_connection()
        try:
            oc_map = get_branch_opening_closing(conn, sync_date)
            eod_map = get_eod_balance(conn, sync_date)
        finally:
            conn.close()
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Cron Sync Connection Failed - {sync_date}")
        return 0

    # Extract only SOLs that returned active Finacle data
    finacle_active_sols = set(oc_map.keys()).union(set(eod_map.keys()))

    if filter_sol_id:
        filter_sol_str = str(filter_sol_id).strip()
        target_sols = [filter_sol_str]
    else:
        # Filters to process only active Finacle SOLs
        target_sols = list(finacle_active_sols)

    processed_count = 0

    for sol_id in target_sols:
        sol_id = str(sol_id).strip()
        parent_docname = f"{sol_id}-{month_name}-{year}"

        doc_exists = frappe.db.exists("CRL Monitoring and Branch Opening and Closing", parent_docname)

        # Skip creation if no Finacle record exists and document is not pre-existing
        if not doc_exists and sol_id not in finacle_active_sols:
            continue

        crl_limit = flt(frappe.db.get_value("Sahayog Branch", {"sol_id": sol_id}, "br_cash_retention_limit_crl") or 0)

        if doc_exists:
            doc = frappe.get_doc("CRL Monitoring and Branch Opening and Closing", parent_docname)
        else:
            doc = frappe.new_doc("CRL Monitoring and Branch Opening and Closing")
            doc.name = parent_docname
            doc.sol_id = sol_id
            doc.month = month_name
            doc.year = year

        doc.br_cash_retention_limit_crl = crl_limit

        existing_row = None
        for row in doc.table_nzzy:
            if row.date and getdate(row.date) == getdate(sync_date):
                existing_row = row
                break

        has_record = (sol_id in oc_map) or (sol_id in eod_map)

        if not has_record:
            open_time_str = None
            close_time_str = None
            eod_val = None
            eod_exists = False
        else:
            oc_info = oc_map.get(sol_id, {})
            open_time_str = parse_time_val(oc_info.get("opening_time"))
            close_time_str = parse_time_val(oc_info.get("closing_time"))
            eod_exists = sol_id in eod_map
            eod_val = eod_map.get(sol_id, None)

        cash_above_crl = None
        if eod_exists and eod_val is not None:
            cash_above_crl = max(flt(eod_val) - crl_limit, 0.0) if crl_limit > 0 else 0.0

        missing = []
        if not open_time_str:
            missing.append("Opening time missing")
        if not close_time_str:
            missing.append("Closing time missing")
        if not eod_exists:
            missing.append("EOD balance missing")

        if not has_record or len(missing) == 3:
            status = "No Record in Finacle"
            log = "No transaction record found in Finacle DB for this date."
            open_time_str = None
            close_time_str = None
            eod_val = None
            cash_above_crl = None
        elif not missing:
            status = "Manually Success" if force_resync else "Success"
            log = "Data received successfully from Finacle."
        else:
            status = "Partially Success"
            log = f"Missing: {', '.join(missing)}"

        row_payload = {
            "date": sync_date,
            "branch_opening_time": open_time_str,
            "branch_closing_time": close_time_str,
            "eod_closing_balance": eod_val,
            "cash_above_crl": cash_above_crl,
            "sync_status": status,
            "sync_log": log,
        }

        if existing_row:
            existing_row.update(row_payload)
        else:
            doc.append("table_nzzy", row_payload)

        for r in doc.table_nzzy:
            if r.sync_status == "No Record in Finacle":
                r.branch_opening_time = None
                r.branch_closing_time = None
                r.eod_closing_balance = None
                r.cash_above_crl = None

        doc.sort_child_table_by_date()
        doc.save(ignore_permissions=True)
        processed_count += 1

    frappe.db.commit()
    return processed_count

# =============================================================
# 1. LIST VIEW GLOBAL MANUAL SYNC
# =============================================================
@frappe.whitelist()
def manual_sync_failed_partial(from_date=None, to_date=None):
    if not from_date or not to_date:
        frappe.throw(_("From Date and To Date are required"))

    from_dt = getdate(from_date)
    to_dt = getdate(to_date)
    today_dt = date.today()

    if from_dt >= today_dt or to_dt >= today_dt:
        frappe.throw(_("Manual Sync is only allowed up to yesterday. Today or future dates cannot be synced before daily scheduler execution."))

    if from_dt > to_dt:
        frappe.throw(_("From Date cannot be greater than To Date"))

    if date_diff(to_dt, from_dt) + 1 > 31:
        frappe.throw(_("Maximum 31 days range allowed"))

    working_days = []
    curr_dt = from_dt
    while curr_dt <= to_dt:
        if curr_dt.weekday() != 6:  # Skip Sunday
            working_days.append(curr_dt)
        curr_dt += timedelta(days=1)

    total_days = len(working_days)
    if total_days == 0:
        return {
            "status": "Warning",
            "message": "Selected date range contains only Sundays.",
            "indicator": "orange"
        }

    failed_days = 0
    error_logs = []

    for idx, day in enumerate(working_days, start=1):
        try:
            sync_daily_crl(target_date=day, force_resync=True)
        except Exception as e:
            failed_days += 1
            error_logs.append(f"Date {day}: {str(e)}")

        percent = int((idx / total_days) * 100)
        frappe.publish_realtime(
            event="bulk_sync_progress",
            message={
                "current": idx,
                "total": total_days,
                "percent": percent,
                "current_date": str(day)
            },
            user=frappe.session.user
        )

    if failed_days > 0:
        send_admin_failure_alert(total_days, total_days - failed_days, failed_days, error_logs, from_date, to_date)

    return {
        "status": "Success",
        "message": f"Global Sync completed successfully for date range {from_date} to {to_date}.",
        "indicator": "green" if failed_days == 0 else "orange"
    }


# =============================================================
# HELPER: AUTOMATED ADMIN EMAIL FAILURE ALERT
# =============================================================
def send_admin_failure_alert(total, success, failed, errors, from_date, to_date):
    """Sends Email Alert to System Managers on Sync Failures."""
    try:
        admin_emails = frappe.get_all(
            "Has Role",
            filters={"role": "System Manager", "parenttype": "User"},
            fields=["parent"]
        )
        recipients = list(set([u.parent for u in admin_emails if u.parent]))

        if not recipients:
            return

        subject = f"⚠️ [ALERT] CRL & Branch Sync Failure Report ({from_date} to {to_date})"
        error_summary_html = "".join([f"<li>{err}</li>" for err in errors[:10]])
        if len(errors) > 10:
            error_summary_html += f"<li>... and {len(errors) - 10} more errors.</li>"

        message = f"""
        <h3>CRL Monitoring & Branch Opening/Closing Sync Alert</h3>
        <p>Bulk Sync process encountered critical errors or network failures.</p>
        <ul>
            <li><b>Date Range:</b> {from_date} to {to_date}</li>
            <li><b>Total Days Processed:</b> {total}</li>
            <li><b>Successful:</b> {success}</li>
            <li><b>Failed:</b> <span style="color:red;">{failed}</span></li>
        </ul>
        <h4>Top Failure Details:</h4>
        <ul>{error_summary_html}</ul>
        <p>Please check Frappe Error Logs for complete traceback details.</p>
        """

        frappe.sendmail(
            recipients=recipients,
            subject=subject,
            message=message,
            now=True
        )
    except Exception as e:
        frappe.log_error(title="Failed to Send Sync Failure Alert Email", message=str(e))


# =============================================================
# 2. FORM VIEW SINGLE BRANCH MANUAL RE-SYNC
# =============================================================
@frappe.whitelist()
def manual_resync_branch(docname, from_date=None, to_date=None):
    if not docname or not from_date or not to_date:
        frappe.throw(_("Required parameters missing."))

    from_date = getdate(from_date)
    to_date = getdate(to_date)
    today_dt = date.today()

    if from_date >= today_dt or to_date >= today_dt:
        frappe.throw(_("Manual Re-Sync is only allowed for past dates (up to yesterday). Today or future dates cannot be synced before daily scheduler execution."))

    if from_date > to_date:
        frappe.throw(_("From Date cannot be greater than To Date"))

    doc = frappe.get_doc("CRL Monitoring and Branch Opening and Closing", docname)
    sol_id = str(doc.sol_id or "").strip()

    try:
        doc_month_idx = dt.strptime(str(doc.month).strip(), "%B").month
        doc_year = int(doc.year)
    except Exception:
        frappe.throw(_("Invalid Month or Year in Document."))

    if from_date.month != doc_month_idx or from_date.year != doc_year:
        frappe.throw(_(f"From Date must belong to {doc.month} {doc_year} only!"))

    if to_date.month != doc_month_idx or to_date.year != doc_year:
        frappe.throw(_(f"To Date must belong to {doc.month} {doc_year} only!"))

    changed_records = 0
    total_working_days = 0

    curr_dt = from_date
    while curr_dt <= to_date:
        if curr_dt.weekday() == 6:  # Skip Sunday
            curr_dt += timedelta(days=1)
            continue

        total_working_days += 1
        timestamp = now_datetime().strftime("%d-%m-%Y %H:%M:%S")
        user_stamp = frappe.session.user

        try:
            conn = db_connection()
            try:
                opening_data = get_branch_opening_closing(conn, curr_dt)
                eod_data = get_eod_balance(conn, curr_dt)
            finally:
                conn.close()
        except Exception as e:
            existing_row = next((r for r in doc.table_nzzy if r.date and getdate(r.date) == getdate(curr_dt)), None)
            if not existing_row:
                existing_row = doc.append("table_nzzy", {"date": curr_dt})

            old_log = str(existing_row.sync_log or "").strip()
            existing_row.sync_status = "Fail"
            existing_row.sync_log = f"[NETWORK/DB FAIL] Connection Error: {str(e)} | Triggered by {user_stamp} at {timestamp}"
            
            if old_log:
                existing_row.sync_log += f" | Prior Log: ({old_log})"

            changed_records += 1
            curr_dt += timedelta(days=1)
            continue

        opening = opening_data.get(sol_id, {})
        has_finacle_record = (sol_id in opening_data) or (sol_id in eod_data)

        if not has_finacle_record:
            open_time = None
            close_time = None
            eod_exists = False
            eod_balance = None
        else:
            open_time = parse_time_val(opening.get("opening_time"))
            close_time = parse_time_val(opening.get("closing_time"))
            eod_exists = sol_id in eod_data
            eod_balance = flt(eod_data.get(sol_id, 0) or 0) if eod_exists else None

        crl = flt(frappe.db.get_value("Sahayog Branch", {"sol_id": int(sol_id) if sol_id.isdigit() else sol_id}, "br_cash_retention_limit_crl") or 0)
        cash_above_crl = max(flt(eod_balance) - crl, 0.0) if (eod_exists and eod_balance is not None and crl > 0) else 0.0

        missing = []
        if not open_time: missing.append("Opening time missing")
        if not close_time: missing.append("Closing time missing")
        if not eod_exists: missing.append("EOD balance missing")

        existing_row = next((r for r in doc.table_nzzy if r.date and getdate(r.date) == getdate(curr_dt)), None)

        if not has_finacle_record or len(missing) == 3:
            new_status = "No Record in Finacle"
            new_log_prefix = "No transaction record found in Finacle DB for this date."
            open_time = None
            close_time = None
            eod_balance = None
            cash_above_crl = None
        elif not missing:
            new_status = "Success" if (existing_row and existing_row.sync_status == "Success") else "Manually Success"
            new_log_prefix = "Data received successfully from Finacle."
        else:
            new_status = "Manually Partially Success"
            new_log_prefix = f"Partial Data Received. Missing: {', '.join(missing)}"

        def fmt_time(t):
            if not t: return ""
            if isinstance(t, timedelta):
                tot_sec = int(t.total_seconds())
                return f"{tot_sec // 3600:02d}:{(tot_sec % 3600) // 60:02d}:{tot_sec % 60:02d}"
            return str(t).strip()

        if existing_row:
            old_open = fmt_time(existing_row.branch_opening_time)
            old_close = fmt_time(existing_row.branch_closing_time)
            old_eod = round(flt(existing_row.eod_closing_balance or 0.0), 2) if existing_row.eod_closing_balance is not None else None
            old_crl = round(flt(existing_row.cash_above_crl or 0.0), 2) if existing_row.cash_above_crl is not None else None
            old_status = str(existing_row.sync_status or "").strip()

            new_open = fmt_time(open_time)
            new_close = fmt_time(close_time)
            new_eod = round(flt(eod_balance or 0.0), 2) if eod_balance is not None else None
            new_crl = round(flt(cash_above_crl or 0.0), 2) if cash_above_crl is not None else None

            valid_success_statuses = ["Success", "Manually Success"]
            status_is_equivalent = (
                (old_status in valid_success_statuses and new_status in valid_success_statuses) or
                (old_status == new_status)
            )

            is_identical = (
                old_open == new_open and
                old_close == new_close and
                old_eod == new_eod and
                old_crl == new_crl and
                status_is_equivalent
            )

            if not is_identical:
                diffs = []
                if old_status != new_status: diffs.append(f"Status: '{old_status or 'Blank'}' ➔ '{new_status}'")
                if old_open != new_open: diffs.append(f"Opening: '{old_open or 'Blank'}' ➔ '{new_open or 'Blank'}'")
                if old_close != new_close: diffs.append(f"Closing: '{old_close or 'Blank'}' ➔ '{new_close or 'Blank'}'")
                if old_eod != new_eod: diffs.append(f"EOD Bal: '{old_eod}' ➔ '{new_eod}'")
                if old_crl != new_crl: diffs.append(f"Cash > CRL: '{old_crl}' ➔ '{new_crl}'")

                was_failed = old_status in ["Fail", "No Record in Finacle"] or "Error" in str(existing_row.sync_log or "")

                existing_row.branch_opening_time = open_time
                existing_row.branch_closing_time = close_time
                existing_row.eod_closing_balance = eod_balance
                existing_row.cash_above_crl = cash_above_crl
                existing_row.sync_status = new_status

                changes_summary = " | ".join(diffs)
                scenario_tag = "[NETWORK/RECOVERY SUCCESS]" if (was_failed and new_status in valid_success_statuses) else "[DATA UPDATED]"

                existing_row.sync_log = f"{scenario_tag} {new_log_prefix} (Synced by {user_stamp} at {timestamp}) | Changes: [{changes_summary}]"
                changed_records += 1
        else:
            doc.append("table_nzzy", {
                "date": curr_dt,
                "branch_opening_time": open_time,
                "branch_closing_time": close_time,
                "eod_closing_balance": eod_balance,
                "cash_above_crl": cash_above_crl,
                "sync_status": new_status,
                "sync_log": f"[NEW RECORD CREATED] {new_log_prefix} (Synced by {user_stamp} at {timestamp})"
            })
            changed_records += 1

        curr_dt += timedelta(days=1)

    if changed_records > 0:
        for r in doc.table_nzzy:
            if r.sync_status == "No Record in Finacle":
                r.branch_opening_time = None
                r.branch_closing_time = None
                r.eod_closing_balance = None
                r.cash_above_crl = None
                
        doc.sort_child_table_by_date()
        doc.save(ignore_permissions=True)
        frappe.db.commit()

    if total_working_days == 0:
        return {
            "status": "Sunday / Invalid Selection",
            "message": "Selected dates fall on Sundays or contain no actionable records.",
            "indicator": "orange"
        }

    if changed_records == 0:
        return {
            "status": "No Updates Required",
            "message": f"No updates required for SOL {sol_id}. All records in range {from_date} to {to_date} are verified and up to date.",
            "indicator": "blue"
        }

    return {
        "status": "Sync Success",
        "message": f"Data synchronized successfully for SOL {sol_id} for selected date range ({changed_records} record(s) processed).",
        "indicator": "green"
    }
    
# =============================================================
# DYNAMIC DOCUMENT SYNC & INTEGRITY VALIDATION
# =============================================================
@frappe.whitelist()
def check_document_sync_issues(docname):
    if not docname:
        return {"has_issue": False}

    doc = frappe.get_doc("CRL Monitoring and Branch Opening and Closing", docname)
    issues = []
    
    # Child table rows
    rows = doc.get("table_nzzy") or []
    
    if not rows:
        return {
            "has_issue": True,
            "error_text": "No records found in the child table."
        }

    existing_dates = []

    # 1. REAL-TIME ROW LEVEL VALIDATION
    for idx, row in enumerate(rows, start=1):
        if not row.date:
            continue
            
        row_dt = getdate(row.date)
        existing_dates.append(row_dt)
        date_str = row_dt.strftime("%d-%m-%Y")
        
        status = str(row.sync_status or "").strip()
        status_lower = status.lower()

        # Check Sync Status Issues (Failed or Partial)
        if status_lower in ["fail", "failed", "partially success", "manually partially success", "error"]:
            log_detail = f" ({row.sync_log})" if row.sync_log else ""
            issues.append(f"<b>{date_str}:</b> Data sync issue detected [Status: <b>{status}</b>]{log_detail}.")

        # Real-time Data Anomaly Checks
        elif status != "No Record in Finacle":
            if row.branch_opening_time and not row.branch_closing_time:
                issues.append(f"<b>{date_str}:</b> Branch Opening Time is recorded, but Closing Time is missing.")
            elif not row.branch_opening_time and row.branch_closing_time:
                issues.append(f"<b>{date_str}:</b> Branch Closing Time is recorded, but Opening Time is missing.")

    # 2. DYNAMIC MISSING WORKING DAY CHECK
    if existing_dates:
        existing_dates.sort()
        start_date = existing_dates[0]
        end_date = existing_dates[-1]
        
        today = date.today()
        max_check_date = min(end_date, today - timedelta(days=1))
        
        # Safe Holiday List Fetch
        holiday_list_name = frappe.db.get_single_value("Company", "default_holiday_list")
        if not holiday_list_name and frappe.db.has_column("Sahayog Branch", "holiday_list"):
            holiday_list_name = frappe.db.get_value("Sahayog Branch", {"sol_id": doc.sol_id}, "holiday_list")

        holidays = []
        if holiday_list_name:
            holidays = frappe.get_all("Holiday", filters={"parent": holiday_list_name}, pluck="holiday_date")
            holidays = [getdate(h) for h in holidays]

        # Map existing child rows in-memory (No direct SQL table dependency)
        row_map = {getdate(r.date): r for r in rows if r.date}

        current_dt = start_date
        while current_dt <= max_check_date:
            is_sunday = (current_dt.weekday() == 6)
            is_holiday = current_dt in holidays

            if not is_sunday and not is_holiday:
                if current_dt not in existing_dates:
                    formatted_date = current_dt.strftime('%d-%m-%Y')
                    
                    matched_row = row_map.get(current_dt)
                    if matched_row and getattr(matched_row, "sync_log", None):
                        issue_msg = f"<b>{formatted_date}:</b> Sync Failure — {matched_row.sync_log}"
                    elif matched_row and getattr(matched_row, "sync_status", None):
                        issue_msg = f"<b>{formatted_date}:</b> Status: <b>{matched_row.sync_status}</b>"
                    else:
                        issue_msg = f"<b>{formatted_date}:</b> Data missing for working day (Scheduled Cron execution or data retrieval failed)."

                    issues.append(issue_msg)

            current_dt += timedelta(days=1)

    # 3. RESPONSE STRUCTURE
    if issues:
        return {
            "has_issue": True,
            "error_text": "• " + "<br>• ".join(issues)
        }
    
    return {"has_issue": False}

# =============================================================
# LIST VIEW SYNC WARNING SUPPORT METHOD
# =============================================================
@frappe.whitelist()
def get_list_view_sync_warnings():
    """
    Dynamically identifies documents with data integrity or sync issues
    from child table entries and returns detailed messages for List View Alert.
    """
    try:
        issue_docs = set()
        details = []

        # 1. Fetch flagged records directly from parent
        try:
            flagged_docs = frappe.get_all(
                "CRL Monitoring and Branch Opening and Closing",
                filters={"has_sync_issue": 1},
                pluck="name"
            )
            for d in flagged_docs:
                issue_docs.add(d)
        except Exception:
            pass

        # 2. Query Child Table directly using verified logic
        child_table_name = "tabCRL Monitoring Operation Tracker"

        failed_child_rows = frappe.db.sql(f"""
            SELECT 
                parent,
                date,
                sync_status,
                sync_log
            FROM `{child_table_name}`
            WHERE parenttype = 'CRL Monitoring and Branch Opening and Closing'
              AND (
                  sync_status IS NULL
                  OR sync_status = ''
                  OR LOWER(TRIM(sync_status)) NOT IN ('success', 'manually success')
              )
            ORDER BY date DESC
        """, as_dict=True)

        # 3. Process records safely
        for row in failed_child_rows:
            p = row.get("parent")
            if not p:
                continue

            issue_docs.add(p)

            # Database Row se dynamic date extract karein
            raw_date = row.get("date")
            if hasattr(raw_date, "strftime"):
                formatted_date = raw_date.strftime("%d-%m-%Y")
            elif raw_date:
                formatted_date = str(raw_date)
            else:
                formatted_date = "N/A"

            log_reason = row.get("sync_log") or "No transaction record found in Finacle DB for this date."

            details.append({
                "docname": p,
                "sol_id": p.split("-")[0] if "-" in p else p,
                "date": formatted_date,  # <-- Ye hardcode nahi hona chahiye
                "status": row.get("sync_status") or "Missing Entry",
                "log": log_reason
            })

        issue_docs_list = list(issue_docs)

        return {
            "has_issue": len(issue_docs_list) > 0,
            "issue_docs": issue_docs_list,
            "details": details,
            "total_count": len(issue_docs_list)
        }

    except Exception as e:
        frappe.log_error("get_list_view_sync_warnings Exception", frappe.get_traceback())
        return {
            "has_issue": False,
            "issue_docs": [],
            "details": [],
            "total_count": 0
        }