"""
Patch: link_loan_applications_to_loan_requests
-----------------------------------------------
Backfills the link between existing Loan Applications and Loan Requests
for records created before the linking feature was introduced.

Matching logic:
  - mobile_number (exact) + loan_type (exact)
  - Only links when exactly ONE Loan Request matches a Loan Application
    (ambiguous / duplicate matches are skipped and logged as warnings)
  - Sets:
      tabLoan Application.loan_request  → matched Loan Request name
      tabLoan Request.loan_application  → matched Loan Application name
  - Skips records that are already linked on either side

Run:  bench --site <site> migrate
      OR: bench --site <site> run-patch sahayog.patches.link_loan_applications_to_loan_requests
"""

import frappe


def execute():
	frappe.logger("patch").info(
		"[link_loan_applications_to_loan_requests] Starting backfill..."
	)

	# ── 1. Fetch unlinked Loan Applications ──────────────────────────────────
	unlinked_apps = frappe.db.sql(
		"""
		SELECT name, mobile_number, loan_type, customer_name
		FROM `tabLoan Application`
		WHERE (loan_request IS NULL OR loan_request = '')
		  AND docstatus != 2
		  AND mobile_number IS NOT NULL
		  AND mobile_number != ''
		  AND loan_type IS NOT NULL
		  AND loan_type != ''
		""",
		as_dict=True,
	)

	if not unlinked_apps:
		frappe.logger("patch").info(
			"[link_loan_applications_to_loan_requests] No unlinked Loan Applications found. Skipping."
		)
		return

	frappe.logger("patch").info(
		f"[link_loan_applications_to_loan_requests] Found {len(unlinked_apps)} unlinked Loan Application(s)."
	)

	# ── 2. Build a lookup map of all unlinked Loan Requests ──────────────────
	#    key: (mobile_number, loan_type) → list of loan request names
	unlinked_requests = frappe.db.sql(
		"""
		SELECT name, mobile_number, loan_type, customer
		FROM `tabLoan Request`
		WHERE (loan_application IS NULL OR loan_application = '')
		  AND mobile_number IS NOT NULL
		  AND mobile_number != ''
		  AND loan_type IS NOT NULL
		  AND loan_type != ''
		""",
		as_dict=True,
	)

	request_map = {}
	for req in unlinked_requests:
		key = (str(req.mobile_number).strip(), str(req.loan_type).strip())
		request_map.setdefault(key, []).append(req.name)

	# ── 3. Match and link ────────────────────────────────────────────────────
	linked_count = 0
	skipped_ambiguous = []
	skipped_no_match = []

	for app in unlinked_apps:
		key = (str(app.mobile_number).strip(), str(app.loan_type).strip())
		matches = request_map.get(key, [])

		if len(matches) == 0:
			skipped_no_match.append(app.name)
			continue

		if len(matches) > 1:
			skipped_ambiguous.append({
				"loan_application": app.name,
				"customer": app.customer_name,
				"mobile": app.mobile_number,
				"loan_type": app.loan_type,
				"matching_requests": matches,
			})
			continue

		# Exactly one match — safe to link
		loan_request_name = matches[0]

		frappe.db.set_value(
			"Loan Application",
			app.name,
			"loan_request",
			loan_request_name,
			update_modified=False,
		)
		frappe.db.set_value(
			"Loan Request",
			loan_request_name,
			"loan_application",
			app.name,
			update_modified=False,
		)

		# Remove from map so this request isn't matched again
		del request_map[key]

		linked_count += 1
		frappe.logger("patch").info(
			f"[link_loan_applications_to_loan_requests] Linked: "
			f"Loan Application {app.name} ↔ Loan Request {loan_request_name} "
			f"(mobile={app.mobile_number}, loan_type={app.loan_type})"
		)

	# ── 4. Summary ───────────────────────────────────────────────────────────
	frappe.logger("patch").info(
		f"[link_loan_applications_to_loan_requests] Done. "
		f"Linked={linked_count}, "
		f"No match={len(skipped_no_match)}, "
		f"Ambiguous={len(skipped_ambiguous)}"
	)

	if skipped_no_match:
		frappe.logger("patch").warning(
			f"[link_loan_applications_to_loan_requests] No matching Loan Request found for "
			f"{len(skipped_no_match)} application(s): {skipped_no_match}"
		)

	if skipped_ambiguous:
		frappe.logger("patch").warning(
			"[link_loan_applications_to_loan_requests] Ambiguous matches skipped "
			f"({len(skipped_ambiguous)} application(s)) — link manually:\n"
			+ "\n".join(
				f"  - {a['loan_application']} | {a['customer']} | {a['mobile']} | {a['loan_type']} → {a['matching_requests']}"
				for a in skipped_ambiguous
			)
		)

	# Print summary to console as well
	print(f"\n{'='*60}")
	print(f"Patch: link_loan_applications_to_loan_requests")
	print(f"{'='*60}")
	print(f"  ✅  Linked:       {linked_count}")
	print(f"  ⚠️   No match:     {len(skipped_no_match)}")
	print(f"  ⚠️   Ambiguous:    {len(skipped_ambiguous)}")
	if skipped_no_match:
		print(f"\n  No match loan applications:")
		for name in skipped_no_match:
			print(f"    - {name}")
	if skipped_ambiguous:
		print(f"\n  Ambiguous (link manually):")
		for a in skipped_ambiguous:
			print(f"    - {a['loan_application']} → possible requests: {a['matching_requests']}")
	print(f"{'='*60}\n")
