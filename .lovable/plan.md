# Rebuild the fee system around fee rules and termly bills

Today every charge is a flat row in one fee list, tied only to a class. There is no way to say "new students only", "boarders only", or "this one is optional", and a student's balance is recalculated from today's prices, so editing a price silently changes past balances. The 121 fee items currently set up for 2026/2027 all sit in that single list.

This replaces it with one fee configuration driven by rules, plus a proper termly bill per student.

## How it will work

**One fee list, rules decide who pays**

Each fee (Tuition, Registration, Boarding, Feeding, Uniform, Textbook, Bus...) gets a rule with:

- Session and term(s) it applies to
- Amount
- Applies to: New / Returning / Both
- Applies to: Day / Boarding / Both
- Class: one class, several classes, or all
- Compulsory or Optional
- How often: one-time, once a session, or each term
- Active or inactive

So "Registration — new students only — all classes — compulsory" is a single rule, and returning students never see it. No more keeping two separate fee lists.

**Who counts as new / boarder**

- New = admitted during the current session; everyone else is Returning. Worked out automatically, no manual switch.
- Boarder = the Day/Boarding switch already on each student record.

**Termly bills**

For a chosen session + term, finance staff generate bills. Each student gets a bill with its own number listing every compulsory item they qualify for, at the price on the day it was issued. Later price edits do not change a bill already issued. Re-running generation never double-charges: one-time fees appear once ever, annual fees once per session, termly fees once per term.

**Optional extras**

Optional items appear as a separate tick list. Parents can tick them in the portal, and finance staff can also add them for a student. Only ticked items are added to the bill and to what's owed.

**Payments**

Payments attach to a bill, so the bill shows Paid / Part paid / Unpaid and a running balance. Overpayment becomes credit on the student's account that is used against the next bill. Cash entry, Paystack, receipts and installment plans keep working as they do now, just pointed at bills.

**Preview before publishing**

A Preview Bill screen: pick a sample profile (class, new/returning, day/boarding, term) and see exactly what will be billed before generating anything.

**Discounts and waivers**

Finance staff can apply a discount, scholarship percentage or full waiver on a bill line, each with a reason and who approved it, recorded in the audit log.

## Screens

Finance → Fees & Income gets reorganised:

- **Fee Rules** (replaces Fee Structures) — create/edit rules with the options above, warning when two active rules target the same students for the same fee.
- **Generate Bills** — pick session + term, preview counts, generate.
- **Bills** — all bills with status, filters by class/term/status, open one to see lines, discounts, payments, receipt.
- **Student Balances** — reads from bills instead of recalculating; unchanged look.
- **Payments, Receipts, Reminders, Reconciliation, Installment Plans** — kept, re-pointed at bills.
- **Parent/Student portal** — required items, total, optional tick list, pay button, receipts and history.

## Existing data

The 121 current fee items are converted into rules automatically: same class, amount, term, session; `is_mandatory` becomes Compulsory/Optional; all set to Both for new/returning and Day/Boarding so nothing changes in meaning until you refine them. The 2 recorded payments are preserved and attached to the first generated bill for their student. Nothing is deleted.

## Technical notes

New tables: `fee_categories`, `fees`, `fee_rules` (session, term, amount, student_type, student_category, class scope, requirement_type, frequency, effective dates, status), `student_invoices`, `invoice_items` (with `original_amount`, `discount`, `final_amount`, `fee_rule_id` snapshot), `invoice_optional_selections`, `student_credits`, `invoice_adjustments`. All with GRANTs, RLS (admin full, parent/student read for own records) and updated_at triggers.

`fee_payments` gains `invoice_id`; existing columns kept for backward compatibility. Sessions come from `admission_sessions` (`is_current`).

Server-side functions: `preview_student_bill(student, session, term)`, `generate_invoices(session, term, class_filter)` (idempotent via unique key on student+session+term+fee+frequency period), `apply_optional_selection`, `apply_invoice_discount`, `get_student_fee_summary` rewritten over invoices. Payment verification (`verify-fee-payment`, `paystack-webhook`, cash entry) updated to post against invoices and create credit on overpayment. All fee-rule, invoice, payment and adjustment changes written to `audit_logs`.

`fee_structures` is left in place read-only during migration and retired once bills are generated.
