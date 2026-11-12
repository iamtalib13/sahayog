# Travel Request (Sahayog)

Sahayog travel flow is built on the stock Frappe HR **Travel Request** doctype.
There is only one travel request doctype — do not create a second one.

## Flow

```
Draft
  → Pending Reporting Manager
      → Pending F&A Approval → Approved
      → Pending COO Approval (only when Deviation Requested = Yes)
                              → Pending F&A Approval → Approved
      → Rejected
Rejected → Draft (Resubmit)
```

- **Reporting Manager** is the first approver. It is auto-fetched from
  `Employee.reports_to`; if that is blank the employee selects it manually.
- **F&A** approves with the `Accounts Manager` role and submits the request.
- **Deviation** goes to the `Travel Policy Approver` role. Policy 3.13 asks
  for two CXOs + COO; for v1 a single sign-off is captured in the system and
  the second CXO sign-off stays offline.
- `HR Manager` has `HR Approve` / `HR Reject` only at the Reporting Manager
  stage, so a request never gets stuck when `reports_to` is missing. Finance
  and COO decisions are **not** overridable by HR.
- Nobody can approve their own request, including Administrator-level roles.
  The owner simply does not see the approval buttons.
- `Approved` is read only (only `System Manager` can edit).

## Roles used

| Role | Purpose | Who to assign |
|---|---|---|
| `Employee` | Raise a request; also acts as Reporting Manager via `reports_to` check | Everyone (already assigned) |
| `Accounts Manager` | F&A approval | F&A / Finance team |
| `Travel Policy Approver` | Deviation (COO/CXO) approval | COO + CXO users |
| `HR Manager` | Fallback approval at the manager stage | HR team |

> `Travel Policy Approver` is created by this app. It has **no users on a
> fresh site / production** until someone assigns it. Assign it to the COO and
> the CXOs who sign off deviations, otherwise deviation requests will wait at
> `Pending COO Approval`.

## Custom fields added

Travel Details: From City, To City, Departure Date, Return Date, Mode of
Travel, Estimated Travel Cost, Reporting Manager.

Advance Details: Advance Required, Advance Amount, Advance Justification.

Policy Deviation: Deviation Requested, Deviation Reason.

Approval Details: Approver Remarks.

Stock HRMS fields that are not needed (passport, sponsor, costings, itinerary,
accounting dimensions, event details) are hidden with Property Setters.

## Data prerequisites

1. `Purpose of Travel` master is seeded by
   `sahayog.patches.travel.seed_purpose_of_travel`.
2. `Employee.reports_to` should be populated by HR for automatic manager
   routing. Where it is blank the employee picks the manager manually and the
   request still moves.
3. Assign `Travel Policy Approver` to COO / CXO users.
4. `Employee Grade` is intentionally not used yet — the master has no records.

## Not in v1

- Grade/band based eligibility automation
- City A/B/C based DA / lodging calculation
- Booking integrations
- Separate Travel Expense Claim doctype (use stock `Expense Claim` and
  `Employee Advance` in phase 2)
- Cancel path after approval (Admin/System Manager can cancel manually)
