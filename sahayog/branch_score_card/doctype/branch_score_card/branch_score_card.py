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
        """
        Set Branch Name from Sahayog Branch.
        Branch field stores the Sahayog Branch document name,
        which is the SOL ID.
        """
        if self.branch:
            self.branch_name = self.get_branch_name_safely()

    def get_branch_name_safely(self):
        """
        Fetch actual BRANCH field from Sahayog Branch.
        """
        if not self.branch:
            return ""

        try:
            branch_name = frappe.db.get_value(
                "Sahayog Branch",
                self.branch,
                "branch"
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

        # -----------------------------------------------------
        # 1. CLEAR OLD CHILD TABLE DATA
        # -----------------------------------------------------

        self.set("table_cxyy", [])
        
        # -----------------------------------------------------
        # 2. SET ACTUAL BRANCH NAME
        # -----------------------------------------------------

        self.branch_name = self.get_branch_name_safely()

        # -----------------------------------------------------
        # 3. GET SCORE CARD SETTINGS
        # -----------------------------------------------------

        settings = frappe.get_single("Branch Score Card Settings")

        # -----------------------------------------------------
        # 4. GET SOL ID
        # -----------------------------------------------------

        sol_id = self.branch
        meta_sb = frappe.get_meta("Sahayog Branch")

        if meta_sb.has_field("sol_id"):
            sol_id = (
                frappe.db.get_value(
                    "Sahayog Branch",
                    self.branch,
                    "sol_id"
                )
                or self.branch
            )

        # -----------------------------------------------------
        # 5. MONTH NUMBER
        # -----------------------------------------------------

        clean_month = str(self.month).strip().capitalize() if self.month else ""

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
        # 6. FIND CRL DOCUMENT
        # -----------------------------------------------------

        crl_doc = None

        if month_no and year_val and sol_id:
            crl_doc_name = f"{sol_id}-{self.month}-{year_val}"

            if not frappe.db.exists(
                "CRL Monitoring and Branch Opening and Closing",
                crl_doc_name
            ):
                crl_doc_name = f"{sol_id}-{month_no}-{year_val}"

            if frappe.db.exists(
                "CRL Monitoring and Branch Opening and Closing",
                crl_doc_name
            ):
                crl_doc = frappe.get_doc(
                    "CRL Monitoring and Branch Opening and Closing",
                    crl_doc_name
                )
            
        # -----------------------------------------------------
        # 6B. FIND ACCOUNT OPENING OPERATIONS DOCUMENT
        # -----------------------------------------------------

        account_opening_doc = None
        ftnr_pct_value = None
        zero_ip_count_value = None
        
        if clean_month and year_val and sol_id:
            acc_doc_name = f"{sol_id}-{clean_month}-{year_val}"

            if frappe.db.exists("Account Opening Operations", acc_doc_name):
                account_opening_doc = frappe.get_doc(
                    "Account Opening Operations", acc_doc_name
                )
                
                # Check if child table table_dllf has rows
                ftnr_rows = getattr(account_opening_doc, "table_dllf", [])
                raw_ftnr = getattr(account_opening_doc, "ftnr_percentage", None)
                if ftnr_rows and len(ftnr_rows) > 0 and raw_ftnr is not None and str(raw_ftnr).strip() != "" and str(raw_ftnr).strip().lower() != "none":
                    ftnr_pct_value = flt(raw_ftnr, 2)

                # Check if child table table_zero_ip_funding has rows
                zero_ip_rows = getattr(account_opening_doc, "table_zero_ip_funding", [])
                raw_zero_ip = getattr(account_opening_doc, "zero_ip_funding_count", None)
                if zero_ip_rows and len(zero_ip_rows) > 0 and raw_zero_ip is not None and str(raw_zero_ip).strip() != "" and str(raw_zero_ip).strip().lower() != "none":
                    zero_ip_count_value = cint(raw_zero_ip)

        # Throw error only if both datasets are missing
        if not crl_doc and account_opening_doc is None:
            frappe.throw(
                _("No data is available for Branch <b>{0}</b> ({1}) for <b>{2} {3}</b>.").format(
                    self.branch_name or self.branch,
                    self.branch,
                    self.month,
                    self.year,
                ),
                title=_("Data Not Found"),
            )

        # -----------------------------------------------------
        # 7. READ DAILY DATA FOR METRICS CALCULATIONS
        # -----------------------------------------------------

        crl_count = None
        opening_delay_count = None
        closing_delay_count = None

        if crl_doc:
            crl_rows = getattr(crl_doc, "table_nzzy", [])

            if crl_rows is not None and len(crl_rows) > 0:
                crl_count = 0
                opening_delay_count = 0
                closing_delay_count = 0

                for d in crl_rows:
                    if (
                        d.cash_above_crl is not None
                        and str(d.cash_above_crl).strip() != ""
                        and flt(d.cash_above_crl) > 0
                    ):
                        crl_count += 1

                    if d.branch_opening_time:
                        opening_time = str(d.branch_opening_time).strip()
                        if opening_time > "10:00:00":
                            opening_delay_count += 1

                    if d.branch_closing_time:
                        closing_time = str(d.branch_closing_time).strip()
                        if closing_time > "17:30:00":
                            closing_delay_count += 1

        # -----------------------------------------------------
        # 8. CHECK WHETHER DATA IS AVAILABLE FOR A ROW
        # -----------------------------------------------------

        def get_data_available(parameter):
            param = (parameter or "").lower().strip()

            if "crl monitoring" in param:
                return crl_count is not None

            if "opening" in param:
                return opening_delay_count is not None

            if "closing" in param:
                return closing_delay_count is not None

            if "ftnr" in param:
                return ftnr_pct_value is not None

            if "zero" in param or "ip" in param:
                return zero_ip_count_value is not None

            return False

        # -----------------------------------------------------
        # 9. UNIVERSAL SCORING WITH DIRECT PYTHON FALLBACK
        # -----------------------------------------------------

        for row in settings.get("score_card_settings", []):

            row_weightage = flt(row.weightage)
            parameter = row.parameter or ""
            param_lower = parameter.lower().strip()
            data_available = get_data_available(parameter)

            score_obtained = None
            data_source = row.data_source if data_available else ""

            if data_available:
                # 1. First try template rendering with all possible Jinja Variable keys
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
                        "zero_ip_funding_count": zero_ip_count_value
                    }
                    try:
                        rendered = frappe.render_template(row.scoring_methodology, jinja_context)
                        rendered_str = rendered.strip() if rendered else ""
                        if rendered_str != "":
                            val = flt(rendered_str)
                            score_obtained = cint(val)
                            if row_weightage > 0 and score_obtained > row_weightage:
                                score_obtained = cint(row_weightage)
                    except Exception as e:
                        frappe.log_error(title=f"Rule Error: {row.parameter}", message=str(e))
                        score_obtained = None

                # 2. Python Fallback Scoring if Jinja did not return a value
                if score_obtained is None:
                    if "ftnr" in param_lower and ftnr_pct_value is not None:
                        val = flt(ftnr_pct_value)
                        if val <= 20:
                            score_obtained = 15
                        elif val <= 25:
                            score_obtained = 10
                        elif val <= 30:
                            score_obtained = 5
                        else:
                            score_obtained = 0

                    elif ("zero" in param_lower or "ip" in param_lower) and zero_ip_count_value is not None:
                        cnt = cint(zero_ip_count_value)
                        if cnt == 0:
                            score_obtained = 10
                        elif cnt == 1:
                            score_obtained = 5
                        else:
                            score_obtained = 0

            # -------------------------------------------------
            # 10. APPEND SCORE CARD ROW
            # -------------------------------------------------
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
                        "score_obtain": score_obtained if data_available else None,
                    }
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
        "name"
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
        "Branch Score Card", "User", "Role", "File", "Error Log", 
        "Activity Log", "Version", "Communication", "Employee Checkin", 
        "Sessions", "Custom Field", "Property Setter", "DocType"
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

    if not (branch and month and year) and hasattr(doc, "name") and isinstance(doc.name, str) and "-" in doc.name:
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
            branch=clean_branch, 
            month=clean_month, 
            year=clean_year
        )
    except Exception as e:
        frappe.log_error(
            title=f"Auto Score Card Creation Failed [{doc.doctype} : {doc.name}]",
            message=f"Branch: {clean_branch}, Month: {clean_month}, Year: {clean_year}\nError: {str(e)}"
        )
    finally:
        frappe.flags.in_score_card_trigger = False