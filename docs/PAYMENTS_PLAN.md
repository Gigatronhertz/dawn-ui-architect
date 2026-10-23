# Payments plan: moving Karije to Pandascrow escrow

Status: steps 1, 2, 5 and 6 are built and tested against a stand-in for the
Pandascrow sandbox. They switch on when `PANDASCROW_API_KEY` and
`PANDASCROW_UUID` are set (see `backend/.env.example`); until then Paystack
works exactly as before.

## Principles

- **Each traveller pays for their own place.** There is no shared pool. Every
  traveller gets their own escrow, and it is released or refunded on its own.
- **Pandascrow holds the money.** Karije never holds travellers' money in its
  own wallet.
- **Karije takes no cut of trip money.** It earns from the Pro subscription,
  AI plan packs and the friend-trip fees below.
- Amounts in the Pandascrow API are in naira, not kobo.

## Who pays what

| Who | What they get | Price |
|---|---|---|
| Pro agency | Unlimited trips, escrow collection, reminders, branding, listing, bookkeeping | ₦10,000/month |
| Friend trip: free | Plan, share link, who's-in list. The organiser chases friends themselves. | Free |
| Friend trip: notifications | Karije sends the reminders to friends by email/WhatsApp | ₦1,000 per trip |
| Friend trip: escrow | Karije collects each friend's share into escrow and holds it, reminders included | ₦3,000 per trip |
| Karije's own trips (curated) | Karije runs them; travellers pay the listed price, nothing on top | n/a |
| AI plans | First plan free, then 3 plans | ₦500 |

The organiser pays the friend-trip fee once per trip, before reminders or
collection switch on. Escrow includes notifications; you can't collect without
chasing. While the beta is free (`PREMIUM_LOCKED`), all of these stay free.

## How each trip collects

| Trip | Seller (where escrow pays out) | Who confirms release |
|---|---|---|
| Pro agency trip | The agency's verified bank account | Agency, after the trip (see open question 2) |
| Friend trip with escrow | The organiser's verified bank account | Organiser, after the trip |
| Karije's own trip | Karije's account | Karije |

### Pay in full
One-time escrow per traveller with `payment_gateway: "virtual_account"`. The
traveller transfers the exact amount to a 9PSB account number valid for 1–24
hours. A fresh account is issued if it expires. Card is the fallback
(`payment_link`).

### Pay monthly (Premium)
Milestone escrow per traveller with `deposit_option: "milestone"`, one
milestone per month. Each month is paid through `/escrow/next-payment` or
`/escrow/regenerate-milestone-payment`. The plan is complete when every
milestone is funded. Depends on open question 1.

### Webhook
One signed endpoint (`X-Pandascrow-Signature`, HMAC-SHA256 of the raw body,
timestamp within 5 minutes, idempotent). Events:
- `escrow.paid`: the traveller is marked paid and their place confirmed.
- `escrow.dispute.opened`: the trip is flagged for the seller and admin.
- `escrow.completed` and `escrow.payout.completed`: the release is recorded.

A reconciliation job and a "Check payment" button call `fetch-single-escrow`
for any webhook that goes missing.

## Build sections

1. **Pandascrow client.** Done: `backend/services/pandascrow.js` (escrow,
   banks, account check, fee accounts, webhook signature) and
   `backend/routes/payments.js` (traveller escrow, status check, friend-trip
   options, organiser payout, `POST /pandascrow/webhook`).
2. **Seller bank details.** Done: `BankAccountForm` — bank dropdown from
   Pandascrow, account checked with the bank, name filled in from the bank.
   Used in Pro settings and in the friend-trip organiser panel.
3. **Agency verification.** NIN, CAC and BVN lookups through Pandascrow KYC
   feed the admin review.
4. **Trip pricing.** Done: agency trips carry a price per person set by the
   agency (`trips.price_per_person`), a "what's included" list and a "pay by"
   date. Stop costs are the agency's own notes and are hidden from travellers.
   The price locks once anyone has paid.
5. **Friend-trip fees.** Done: the organiser picks Free, Reminders (₦1,000)
   or Escrow (₦3,000) on their plan page; an upgrade from Reminders pays the
   ₦2,000 difference. The fee is a transfer to a one-off account into Karije's
   wallet, confirmed by `wallet.deposit.success`. Free while the beta lock is
   on. Once Pandascrow is live, a friend trip only collects on Escrow and is
   only chased on Reminders or Escrow.
6. **Traveller pay screen.** Done: `EscrowPay` — account number, bank,
   exact amount (with the escrow fee shown), 24-hour countdown, "I've sent
   it" check, "new account number", and card. Reminder emails' Pay now link
   opens it directly.
7. **Database.** Per traveller: `escrow_id`, `escrow_status` (awaiting / paid /
   released / refunded / disputed), virtual account number and expiry. Per
   trip: the friend-trip tier and fee payment reference. A webhook event log.
   `paystack_ref` and `paystack_url` retired.
8. **Seller and admin views.** Per-traveller escrow status, "Confirm traveller"
   (release) and "Refund" actions, and admin's all-escrows view. Replaces the
   manual "record payout" form.
9. **Karije billing.** Pro subscription and AI packs move to Pandascrow
   invoices or payment links later; they are Premium-locked meanwhile.

## Still to confirm with the real sandbox

- The exact field names for `/dva/create` beyond `order.amount` and
  `customer.account.name` (amount type and expiry are sent inside `order`).
- Which escrow statuses `/escrow/single` reports once funded (we treat
  funded, paid, in_progress, delivered, completed and released as paid).
- Who pays Pandascrow's fee: `PANDASCROW_FEES_PAID_BY` defaults to `buyer`,
  so travellers see the fee added to their transfer.
- Pandascrow requires a phone number for buyer and seller; travellers who
  didn't give a WhatsApp number are sent with it blank.

## Open questions for Pandascrow

1. Can milestone instalments be paid via a dynamic virtual account, or only via
   the payment link?
2. Can the release OTP go to the platform (Karije, as broker) or the seller
   instead of the buyer? Is there automatic release after the dispute window?
3. How do we cancel unpaid milestones and refund all or part of the paid ones
   when a traveller drops out? Is there a refund/cancel endpoint?
4. Is there an endpoint to deactivate a static virtual account, or to fund an
   escrow from wallet balance?

## Already done (cleanup, Oct 2026)

- Removed unauthenticated routes that leaked or overwrote agency data
  (`POST /api/agents`, `GET /api/agents/:phone`, `GET /api/dashboard/:phone`),
  the public log dump (`/api/logs`) and the scraper debug routes. The bus
  search moved from `/api/gigm-test` to `/api/buses`.
- Removed the retired WhatsApp group bot's payment branch, its `members` and
  `conversations` helpers, and the unused `/payment/confirm` redirect.
- Removed the 10% margin on curated trips from the ledger, revenue report,
  admin panel, Pricing page and Terms.
- Stopped writing the unused agency `plan_type` and `service_fee` columns.
- Deleted unused frontend components and the agency-leads endpoint whose form
  was no longer rendered.
