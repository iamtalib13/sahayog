# Sahayog Loan Management System: Enhanced Minimal Design

This document serves as the master blueprint for enhancing the **Sahayog** loan system by integrating the most powerful features of the `frappe_lending` app into a minimal, user-friendly, and **configurable** structure.

---

## 1. System Architecture (Core DocTypes)

To build a professional system with minimal clutter, we will focus on these **5 essential DocTypes**:

### A. Loan Product (The Configuration Master)
*Defines the rules for each type of loan (Gold, DD, Personal, etc.).*
- **Fields:**
    - `product_name`: (e.g., Gold Loan, DD Loan)
    - `loan_type`: Dropdown (Secured / Unsecured)
    - `is_term_loan`: Checkbox (For EMI-based repayment)
    - `rate_of_interest`: Yearly Percentage (e.g., 12%)
    - `interest_type`: Dropdown (Flat vs. Reducing)
    - `repayment_schedule_type`: (Monthly, Bullet, Line of Credit)
    - `maximum_loan_amount`: To limit loan sizes per product.

### B. Loan Security Type (For Secured Loans)
*Configures what can be pledged (Gold, Property, Vehicle).*
- **Fields:**
    - `security_name`: (e.g., Gold 22k, Gold 24k)
    - `loan_to_value_ratio`: (e.g., 75%) -> System will only give 75% of asset value as loan.
    - `valuation_method`: How the price is calculated.

### C. Loan Application (The Entry)
*Captures the user's request and manages the approval journey.*
- **Fields:**
    - `applicant`: Link to **Customer**.
    - `loan_product`: Link to **Loan Product** (auto-fills interest rates).
    - `loan_amount`: Amount requested.
    - `tenure_months`: How long the loan will last.
    - `status`: (Draft, Under Review, Approved, Rejected, Disbursed, Closed).
    - **Security Details (For Gold Loan):**
        - `gross_weight`: Total weight of gold.
        - `net_weight`: Weight excluding stones/other materials.
        - `purity`: (18k, 22k, 24k).
        - `market_price`: Current gold rate per gram.
        - `collateral_value`: (Calculated) Net Weight * Market Price.
        - `eligible_loan_amount`: (Calculated) Collateral Value * LTV Ratio.

### D. Loan Disbursement (The Activation)
*Records when the money is actually given to the borrower.*
- **Fields:**
    - `loan_application`: Link to the approved application.
    - `disbursement_date`: When the money was paid.
    - `disbursed_amount`: Total amount paid out.
    - `mode_of_payment`: (Cash, Bank Transfer, Check).

### E. Loan Repayment (The Collection)
*Records EMI payments and updates the outstanding balance.*
- **Fields:**
    - `loan_application`: Link to the active loan.
    - `payment_date`: When the EMI was received.
    - `total_payment`: Amount paid by the customer.
    - `principal_paid`: (Calculated) Amount reducing the debt.
    - `interest_paid`: (Calculated) Profit for the company.

---

## 2. Configurable Workflow (The Future-Ready Path)

1.  **Gold Loan Path:** Application -> Gold Valuation -> Pledge Asset -> Approval -> Disbursement.
2.  **DD Loan Path:** Application -> Document Verification -> Approval -> Disbursement.
3.  **Personal Loan Path:** Application -> Eligibility Check -> Approval -> Disbursement.

---

## 3. UI/UX Minimal Design Principles

-   **Dashboard First:** Users see "Pending Approvals" and "Todays Collections" immediately.
-   **Header Filters:** Quick-filter cards for each status (Draft, Review, etc.).
-   **Auto-Calculations:** Selecting a "Loan Product" and entering Gold Weight must auto-calculate the **Eligible Loan Amount** instantly.

---

## 4. Enhanced Automation Rules

1.  **Title Case:** `customer_name` fields are auto-formatted.
2.  **LTV Enforcement:** System warns if requested amount exceeds the **Eligible Loan Amount** based on gold value.
3.  **Auto-Accounting:** Every Disbursement and Repayment creates a Journal Entry automatically.

---

## 5. Development Progress Log
-   **2026-03-10:** Initialized `loan_application.html` with Petite-Vue.
-   **2026-03-10:** Implemented modern sidebar and header filters.
-   **2026-03-10:** Researched `frappe_lending` for core logic.
-   **2026-03-10:** Added **Gold Loan** and **Configurable Architecture** to Documentation.
