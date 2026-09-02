import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt


class BranchScoreCard(Document):

    def validate(self):
        self.set_title()
        self.validate_one_record_per_branch_per_month()
        self.generate_score()

    # ---------------------------------------------------------
    # BRANCH NAME
    # ---------------------------------------------------------

    def set_title(self):
        if self.branch:
            self.branch_name = self.get_branch_name_safely()

    def get_branch_name_safely(self):
        if not self.branch:
            return ""

        try:
            branch_name = frappe.db.get_value(
                "Sahayog Branch", self.branch, "branch"
            )
            return branch_name or self.branch
        except Exception:
            return self.branch

    # ---------------------------------------------------------
    # DUPLICATE VALIDATION
    # ---------------------------------------------------------

    def validate_one_record_per_branch_per_month(self):
        if not self.branch or not self.month or not self.year:
            return

        filters = {
            "branch": self.branch,
            "month": self.month,
            "year": cint(self.year),
        }

        if not self.is_new():
            filters["name"] = ["!=", self.name]

        if frappe.db.exists("Branch Score Card", filters):
            frappe.throw(
                _(
                    "Branch Score Card already exists for "
                    "Branch <b>{0}</b> - <b>{1} {2}</b>"
                ).format(
                    self.branch,
                    self.month,
                    self.year,
                ),
                title=_("Duplicate Record"),
            )

    # ---------------------------------------------------------
    # MAIN SCORE GENERATION
    # ---------------------------------------------------------

    def generate_score(self):

        # 1. CLEAR OLD CHILD TABLE DATA
        self.set("table_cxyy", [])

        # 2. SET ACTUAL BRANCH NAME
        self.branch_name = self.get_branch_name_safely()

        # 3. GET SCORE CARD SETTINGS
        settings = frappe.get_single("Branch Score Card Settings")

        # 4. GET SOL ID
        sol_id = self.branch
        meta_sb = frappe.get_meta("Sahayog Branch")

        if meta_sb.has_field("sol_id"):
            sol_id = (
                frappe.db.get_value("Sahayog Branch", self.branch, "sol_id")
                or self.branch
            )

        # 5. MONTH NUMBER
        clean_month = (
            str(self.month).strip().capitalize() if self.month else ""
        )

        month_no = {
            "January": "01",
            "February": "02",
            "March": "03",
            "April": "04",
            "May": "05",
            "June": "06",
            "July": "07",
            "August": "08",
            "September": "09",
            "October": "10",
            "November": "11",
            "December": "12",
        }.get(clean_month)

        year_val = cint(self.year)

        # -----------------------------------------------------
        # 6. READ CRL DATA (Updated with Day-wise Cutoff Logic)
        # -----------------------------------------------------
        
        crl_doc = None
        crl_count = 0
        opening_delay_count = 0
        closing_delay_count = 0

        if month_no and year_val and sol_id:
            crl_doc_name = f"{sol_id}-{self.month}-{year_val}"

            if not frappe.db.exists(
                "CRL Monitoring and Branch Opening and Closing", crl_doc_name
            ):
                crl_doc_name = f"{sol_id}-{month_no}-{year_val}"

            if frappe.db.exists(
                "CRL Monitoring and Branch Opening and Closing", crl_doc_name
            ):
                crl_doc = frappe.get_doc(
                    "CRL Monitoring and Branch Opening and Closing",
                    crl_doc_name,
                )
                
                # Directly read pre-calculated actual values from CRL DocType if available
                if getattr(crl_doc, "crl_monitoring_actual_value", None) is not None:
                    crl_count = cint(crl_doc.crl_monitoring_actual_value)
                    opening_delay_count = cint(crl_doc.branch_opening_actual_value)
                    closing_delay_count = cint(crl_doc.branch_closing_actual_value)
                else:
                    # Fallback loop with accurate time & weekday logic
                    crl_rows = getattr(crl_doc, "table_nzzy", []) or []

                    for d in crl_rows:
                        if not d.date or d.sync_status == "No Record in Finacle":
                            continue

                        date_value = getdate(d.date)
                        weekday = date_value.weekday()

                        # Skip Sunday
                        if weekday == 6:
                            continue

                        # 1. CRL Count
                        if (
                            d.cash_above_crl is not None
                            and str(d.cash_above_crl).strip() != ""
                            and flt(d.cash_above_crl) > 0
                        ):
                            crl_count += 1

                        # 2. Opening Delay (> 10:00:00 AM)
                        if d.branch_opening_time:
                            o_time = self.convert_to_time(d.branch_opening_time) if hasattr(self, "convert_to_time") else get_time(d.branch_opening_time)
                            if o_time and o_time > time(10, 0, 0):
                                opening_delay_count += 1

                        # 3. Closing Delay (Sat > 16:30:00, Mon-Fri > 18:00:00)
                        if d.branch_closing_time:
                            c_time = self.convert_to_time(d.branch_closing_time) if hasattr(self, "convert_to_time") else get_time(d.branch_closing_time)
                            if c_time:
                                # Saturday (Weekday 5): > 4:30 PM
                                if weekday == 5 and c_time > time(16, 30, 0):
                                    closing_delay_count += 1
                                # Mon-Fri (Weekday 0-4): > 6:00 PM
                                elif weekday < 5 and c_time > time(18, 0, 0):
                                    closing_delay_count += 1

        # -----------------------------------------------------
        # 7. READ ACCOUNT OPENING DATA (Defaults to 0.0 / 0 if missing)
        # -----------------------------------------------------
        account_opening_doc = None
        ftnr_pct_value = 0.0
        zero_ip_count_value = 0

        if clean_month and year_val and sol_id:
            acc_doc_name = f"{sol_id}-{clean_month}-{year_val}"

            if frappe.db.exists("Account Opening Operations", acc_doc_name):
                account_opening_doc = frappe.get_doc(
                    "Account Opening Operations", acc_doc_name
                )

                raw_ftnr = getattr(
                    account_opening_doc, "ftnr_percentage", None
                )
                if (
                    raw_ftnr is not None
                    and str(raw_ftnr).strip() != ""
                    and str(raw_ftnr).strip().lower() != "none"
                ):
                    ftnr_pct_value = flt(raw_ftnr, 2)

                raw_zero_ip = getattr(
                    account_opening_doc, "zero_ip_funding_count", None
                )
                if (
                    raw_zero_ip is not None
                    and str(raw_zero_ip).strip() != ""
                    and str(raw_zero_ip).strip().lower() != "none"
                ):
                    zero_ip_count_value = cint(raw_zero_ip)

        # Stop execution only if NEITHER source document exists in the system
        if not crl_doc and account_opening_doc is None:
            frappe.throw(
                _(
                    "No data is available for Branch <b>{0}</b> ({1}) for <b>{2} {3}</b>."
                ).format(
                    self.branch_name or self.branch,
                    self.branch,
                    self.month,
                    self.year,
                ),
                title=_("Data Not Found"),
            )
            
        # -----------------------------------------------------
        # 7.5. READ MISCELLANEOUS DATA
        # -----------------------------------------------------
        account_opening_error_count = 0
        reconciliation_discrepancy_count = 0

        if clean_month and year_val and sol_id:
            misc_doc_name = f"{sol_id}-{clean_month}-{year_val}"

            if frappe.db.exists("Miscellaneous", misc_doc_name):
                misc_doc = frappe.get_doc("Miscellaneous", misc_doc_name)
                account_opening_error_count = cint(getattr(misc_doc, "account_opening_error_count", 0))
                reconciliation_discrepancy_count = cint(getattr(misc_doc, "reconciliation_discrepancy_count", 0))
            else:
                misc_data = frappe.get_all(
                    "Miscellaneous",
                    filters={"sol_id": sol_id, "month": clean_month, "year": year_val},
                    fields=["account_opening_error_count", "reconciliation_discrepancy_count"],
                    limit=1
                )
                if misc_data:
                    account_opening_error_count = cint(misc_data[0].account_opening_error_count)
                    reconciliation_discrepancy_count = cint(misc_data[0].reconciliation_discrepancy_count)
                    

        # -----------------------------------------------------
        # 8. UNIVERSAL DYNAMIC SCORING (Evaluates 0 Values directly)
        # -----------------------------------------------------

        for row in settings.get("score_card_settings", []):

            row_weightage = flt(row.weightage)
            score_obtained = 0
            data_source = row.data_source or "System Report"

            if row.scoring_methodology:
                jinja_context = {
                    "doc": self,
                    "row": row,
                    "weight": row_weightage,
                    "weightage": row_weightage,
                    "crl_count": crl_count,
                    "opening_delay_count": opening_delay_count,
                    "closing_delay_count": closing_delay_count,
                    "ftnr_pct": ftnr_pct_value,
                    "ftnr_percentage": ftnr_pct_value,
                    "zero_ip": zero_ip_count_value,
                    "zero_ip_count": zero_ip_count_value,
                    "zero_ip_funding_count": zero_ip_count_value,
                    "account_opening_error_count": account_opening_error_count,
                    "reconciliation_discrepancy_count": reconciliation_discrepancy_count,
                }
                try:
                    rendered = frappe.render_template(
                        row.scoring_methodology, jinja_context
                    )
                    rendered_str = rendered.strip() if rendered else ""

                    if rendered_str != "":
                        score_obtained = cint(flt(rendered_str))

                        # Cap score dynamically to row_weightage
                        if row_weightage > 0 and score_obtained > row_weightage:
                            score_obtained = cint(row_weightage)
                except Exception as e:
                    frappe.log_error(
                        title=f"Rule Execution Error: {row.parameter}",
                        message=str(e),
                    )
                    score_obtained = 0

            # Always populate row into child table
            if row.function and row.parameter:
                self.append(
                    "table_cxyy",
                    {
                        "function": row.function,
                        "parameter": row.parameter,
                        "weightage": row.weightage,
                        "data_source": data_source,
                        "scoring_rule": row.scoring_rule,
                        "scoring_methodology": row.scoring_methodology,
                        "score_obtain": score_obtained,
                    },
                )


# -------------------------------------------------------------
# AUTO-GET OR CREATE & UPDATE LOGIC
# -------------------------------------------------------------


def get_or_create_score_card(branch, month, year):
    year = cint(year)
    clean_month = str(month).strip().capitalize()

    existing_name = frappe.db.get_value(
        "Branch Score Card",
        {"branch": branch, "month": clean_month, "year": year},
        "name",
    )

    if existing_name:
        doc = frappe.get_doc("Branch Score Card", existing_name)
    else:
        doc = frappe.new_doc("Branch Score Card")
        doc.branch = branch
        doc.month = clean_month
        doc.year = year

    return doc


@frappe.whitelist()
def fetch_score_card_data(branch, month, year):
    if not branch or not month or not year:
        return None

    doc = get_or_create_score_card(branch, month, year)
    doc.generate_score()

    doc.flags.ignore_permissions = True
    doc.save()
    frappe.db.commit()

    return doc


# =============================================================================
# AUTO TRIGGER HOOK
# =============================================================================


def trigger_score_card_creation(doc, method=None):
    if getattr(frappe.flags, "in_score_card_trigger", False):
        return

    ignored_doctypes = {
        "Branch Score Card",
        "User",
        "Role",
        "File",
        "Error Log",
        "Activity Log",
        "Version",
        "Communication",
        "Employee Checkin",
        "Sessions",
        "Custom Field",
        "Property Setter",
        "DocType",
    }

    if not doc or getattr(doc, "doctype", None) in ignored_doctypes:
        return

    branch = (
        getattr(doc, "branch", None)
        or getattr(doc, "sol_id", None)
        or getattr(doc, "sahayog_branch", None)
        or getattr(doc, "branch_code", None)
    )
    month = getattr(doc, "month", None)
    year = getattr(doc, "year", None)

    if (
        not (branch and month and year)
        and hasattr(doc, "name")
        and isinstance(doc.name, str)
        and "-" in doc.name
    ):
        parts = doc.name.split("-")
        if len(parts) >= 3:
            branch = branch or parts[0]
            month = month or parts[1]
            year = year or parts[2]

    if not (branch and month and year):
        return

    clean_branch = str(branch).strip()
    clean_month = str(month).strip().capitalize()
    try:
        clean_year = int(year)
    except (ValueError, TypeError):
        clean_year = str(year).strip()

    if not clean_branch or not clean_month or not clean_year:
        return

    try:
        frappe.flags.in_score_card_trigger = True

        fetch_score_card_data(
            branch=clean_branch, month=clean_month, year=clean_year
        )
    except Exception as e:
        frappe.log_error(
            title=f"Auto Score Card Creation Failed [{doc.doctype} : {doc.name}]",
            message=f"Branch: {clean_branch}, Month: {clean_month}, Year: {clean_year}\nError: {str(e)}",
        )
    finally:
        frappe.flags.in_score_card_trigger = False