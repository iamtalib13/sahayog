# import frappe
# from frappe import _
# import psycopg2
# from psycopg2.extras import RealDictCursor

# def db_connection():
#     try:
#         creds = frappe.get_single("Finacle Settings")
#         return psycopg2.connect(
#             host=creds.host, port=creds.port, user=creds.user,
#             password=creds.get_password("password"), database=creds.database_name
#         )
#     except Exception as e:
#         print(f"DB Connection Failed: {e}")
#         return None

# @frappe.whitelist()
# def sync_all_branches():
#     """Called automatically by the Scheduler."""
#     branches = frappe.get_all("Branch Petty Cash Account", filters={"status": "Active"}, pluck="branch")
#     print(f"--- Starting Bulk Sync for {len(branches)} Branches ---")
#     for branch in branches:
#         fetch_finacle_balance(branch)
#     print("--- Bulk Sync Completed ---")

# @frappe.whitelist()
# def fetch_finacle_balance(branch=None):
#     # If called without argument (e.g. from bench execute), run all
#     if not branch:
#         return sync_all_branches()

#     try:
#         # 1. Get Wallet Info
#         wallet = frappe.db.get_value("Branch Petty Cash Account", {"branch": branch}, ["name", "gl_sub_code"], as_dict=True)
#         if not wallet or not wallet.gl_sub_code:
#             print(f"Skipping {branch}: No Wallet or GL Code found.")
#             return

#         # 2. Connect & Fetch
#         conn = db_connection()
#         if not conn: return

#         with conn.cursor(cursor_factory=RealDictCursor) as cursor:
#             sql = "SELECT clr_bal_amt FROM tbaadm.gam WHERE del_flg = 'N' AND foracid = %s"
#             cursor.execute(sql, (wallet.gl_sub_code,))
#             result = cursor.fetchone()

#         conn.close()

#         # 3. Update Database
#         if result:
#             balance = float(result.get('clr_bal_amt', 0.0))

#             # FORCE UPDATE via SQL + COMMIT
#             frappe.db.sql("""
#                 UPDATE `tabBranch Petty Cash Account`
#                 SET current_balance = %s
#                 WHERE name = %s
#             """, (balance, wallet.name))

#             frappe.db.commit() # <--- CRITICAL: Ensures data is written to disk

#             print(f"✅ Synced {branch}: New Balance ₹{balance}")
#             return balance
#         else:
#             print(f"⚠️ Account {wallet.gl_sub_code} not found in Finacle.")

#     except Exception as e:
#         print(f"❌ Error syncing {branch}: {str(e)}")
#         if frappe.request: frappe.throw(str(e))


# ###########################################################################################################
# new code with real-time progress updates and better error handling

from frappe.utils import cint
import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor


def db_connection():
    try:
        creds = frappe.get_single("Finacle Settings")
        return psycopg2.connect(
            host=creds.host,
            port=creds.port,
            user=creds.user,
            password=creds.get_password("password"),
            database=creds.database_name
        )
    except Exception as e:
        frappe.log_error(
            f"Finacle DB Connect Error: {str(e)}", "Petty Cash Sync")
        return None


def _ensure_admin():
    if frappe.session.user != "Administrator":
        frappe.throw(_("Only Administrator can perform this action."),
                     frappe.PermissionError)


def _ensure_admin_and_ho_manager():
    user_roles = frappe.get_roles()
    if not set(["HO Petty Cash Manager"]).intersection(user_roles) and frappe.session.user != "Administrator":
        frappe.throw(
            _("Only HO Petty Cash Manager or Approver can approve."), frappe.PermissionError)


@frappe.whitelist()
def start_bulk_finacle_balance_sync():
    _ensure_admin()

    frappe.enqueue(
        "sahayog.petty_cash_management.api.branch_petty_cash_account_balance_fetch.sync_all_branches_realtime",
        queue="long",
        timeout=60 * 60,
        user=frappe.session.user
    )

    return {"status": "queued", "message": "Bulk Finacle Balance Sync started."}


def sync_all_branches_realtime(user=None):
    user = user or frappe.session.user

    branches = frappe.get_all(
        "Branch Petty Cash Account",
        filters={"status": "Active"},
        pluck="branch"
    )

    total = len(branches)

    frappe.publish_realtime(
        event="bulk_finacle_balance_sync",
        message={
            "status": "start",
            "total": total,
            "current": 0,
            "branch": None,
            "message": f"Starting bulk sync for {total} branches"
        },
        user=user
    )

    for idx, branch in enumerate(branches, start=1):
        try:
            balance = fetch_finacle_balance(branch=branch, from_bulk=True)

            frappe.publish_realtime(
                event="bulk_finacle_balance_sync",
                message={
                    "status": "progress",
                    "total": total,
                    "current": idx,
                    "branch": branch,
                    "balance": balance,
                    "message": f"{branch} synced successfully"
                },
                user=user
            )

        except Exception as e:
            frappe.log_error(
                f"Bulk Sync Error for {branch}: {str(e)}", "Petty Cash Bulk Sync")

            frappe.publish_realtime(
                event="bulk_finacle_balance_sync",
                message={
                    "status": "error",
                    "total": total,
                    "current": idx,
                    "branch": branch,
                    "message": str(e)
                },
                user=user
            )

    frappe.publish_realtime(
        event="bulk_finacle_balance_sync",
        message={
            "status": "complete",
            "total": total,
            "current": total,
            "branch": None,
            "message": "Bulk Finacle Balance Sync completed"
        },
        user=user
    )


@frappe.whitelist()
def sync_all_branches():
    _ensure_admin()
    return start_bulk_finacle_balance_sync()


# @frappe.whitelist()
# def fetch_finacle_balance(branch=None, from_bulk=False):
#     if not from_bulk:
#         _ensure_admin()

#     if not branch:
#         if from_bulk:
#             return
#         return start_bulk_finacle_balance_sync()

#     conn = None

#     try:
#         wallet = frappe.db.get_value(
#             "Branch Petty Cash Account",
#             {"branch": branch},
#             ["name", "gl_sub_code"],
#             as_dict=True
#         )

#         if not wallet or not wallet.gl_sub_code:
#             msg = f"Skipping {branch}: No Wallet or GL Code found."
#             frappe.log_error(msg, "Petty Cash Sync Skip")
#             return None

#         conn = db_connection()
#         if not conn:
#             raise Exception("Unable to connect to Finacle database")

#         with conn.cursor(cursor_factory=RealDictCursor) as cursor:
#             sql = """
#                 SELECT clr_bal_amt
#                 FROM tbaadm.gam
#                 WHERE del_flg = 'N' AND foracid = %s
#             """
#             cursor.execute(sql, (wallet.gl_sub_code,))
#             result = cursor.fetchone()

#         if result:
#             balance = float(result.get("clr_bal_amt", 0.0))

#             frappe.db.sql("""
#                 UPDATE `tabBranch Petty Cash Account`
#                 SET current_balance = %s
#                 WHERE name = %s
#             """, (balance, wallet.name))

#             frappe.db.commit()
#             return balance

#         return None

#     except Exception as e:
#         frappe.db.rollback()
#         frappe.log_error(
#             f"Error syncing {branch}: {str(e)}", "Petty Cash Sync")

#         if not from_bulk and getattr(frappe, "request", None):
#             frappe.throw(str(e))

#         raise

#     finally:
#         if conn:
#             conn.close()


@frappe.whitelist()
def fetch_finacle_balance(branch=None, from_bulk=False):
    if not from_bulk:
        # _ensure_admin()
        _ensure_admin_and_ho_manager()

    if not branch:
        if from_bulk:
            return
        return start_bulk_finacle_balance_sync()

    conn = None

    try:
        wallet = frappe.db.get_value(
            "Branch Petty Cash Account",
            {"branch": branch},
            ["name", "gl_sub_code", "finacle_opening_balance_fetched"],
            as_dict=True
        )

        if not wallet or not wallet.gl_sub_code:
            msg = f"Skipping {branch}: No Wallet or GL Code found."
            frappe.log_error(msg, "Petty Cash Sync Skip")
            return None

        legacy_flow = cint(
            frappe.db.get_single_value(
                "Sahayog Settings", "enable_unsettled_cash_flow") or 0
        )

        # if not legacy_flow and cint(wallet.finacle_opening_balance_fetched):
        #     frappe.throw(
        #         _("Opening balance has already been fetched once for this branch."))

        conn = db_connection()
        if not conn:
            raise Exception("Unable to connect to Finacle database")

        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            sql = """
                SELECT clr_bal_amt
                FROM tbaadm.gam
                WHERE del_flg = 'N' AND foracid = %s
            """
            cursor.execute(sql, (wallet.gl_sub_code,))
            result = cursor.fetchone()

        if result:
            balance = float(result.get("clr_bal_amt", 0.0))

            update_values = {
                "current_balance": balance,
                "last_synced_fund_date": frappe.utils.nowdate()
            }

            # if not legacy_flow:
            # update_values["finacle_opening_balance_fetched"] = 1

            frappe.db.set_value(
                "Branch Petty Cash Account",
                wallet.name,
                update_values,
                update_modified=False
            )

            frappe.db.commit()
            return balance

        return None

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(
            f"Error syncing {branch}: {str(e)}",
            "Petty Cash Sync"
        )

        if not from_bulk and getattr(frappe, "request", None):
            frappe.throw(str(e))

        raise

    finally:
        if conn:
            conn.close()
