# Account Panel Subscription Tier — Design

**Date:** 2026-08-22
**Status:** Approved
**Repo:** lesstoken-landing (`web/` — Flask backend on Railway, Postgres)
**Scope:** the legacy account-based web panel only (`web/app.py`, `pages/app/*`)

## Why

LessToken has three product surfaces today, all free: the browser extension
and the no-account web tools (`/text`, `/image`, `/file`) are BYOK — the
user's own API key, no server round-trip for the AI call, zero marginal cost
to LessToken. The one exception is the older, account-based panel
(`POST /api/v1/optimize` in `web/app.py`), which already calls OpenAI/Claude/
Gemini with LessToken's own keys and caps free usage at `DAILY_OPTIMIZE_LIMIT`
requests/day, logged in the `optimization_history` table.

This is therefore the one surface where LessToken already pays real,
metered API cost — and the only one where charging money doesn't require
touching the "no servers in this path, your key stays yours" trust promise
that the BYOK surfaces are built and marketed on. That promise is explicitly
out of scope for monetization; this spec never proposes a login system,
usage cap, or paywall on the extension or web tools.

## Decisions made during design

1. **Scope: account panel only.** No login/account system is added to the
   extension or web tools. They stay BYOK, free, no account, unchanged.
2. **Price: $6.99/month, unlimited usage.** Chosen to sit comfortably above
   LessToken's real per-call cost at this model mix while staying below what
   a user would spend on the mental overhead of managing their own low-volume
   API key — the whole point of paying is convenience, not cost avoidance.
   A single USD price, localized automatically by the payment platform,
   rather than a separate TRY price.
3. **Payment platform: Lemon Squeezy (Merchant of Record), Paddle as
   fallback.** Stripe was ruled out — confirmed it does not support
   Turkey-based merchant accounts directly. iyzico supports Turkey but
   requires a registered business entity, which the billing entity (see
   below) does not currently have. Lemon Squeezy and Paddle act as merchant
   of record, handle VAT/tax compliance themselves, and pay out to
   individuals (via bank transfer or Payoneer — not PayPal, which no longer
   sends money to Turkish banks) without requiring the seller to have a
   registered company.
4. **Billing entity: the same individual already registered as the Chrome
   Web Store trader** (the account the extension listing was transferred to
   earlier this project). Consistent identity across the extension listing
   and the payment platform account.
5. **Open dependency, blocking implementation start:** the billing entity
   needs to personally verify, with their own Lemon Squeezy signup attempt,
   that Turkey is accepted as a payout country. This could not be confirmed
   with certainty from documentation alone (the relevant Lemon Squeezy pages
   returned 403 to automated fetches). If Lemon Squeezy rejects Turkey, the
   same architecture below applies to Paddle instead — only the specific
   SDK/webhook payload shapes would change, not the design.

## Data model

New table in `web/database.py`, one-to-one with `users`:

```python
class Subscription(db.Model):
    """Mirrors the payment platform's subscription state. LessToken never
    stores card details -- this table only tracks status, synced entirely
    from Lemon Squeezy webhooks."""
    __tablename__ = 'subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True, index=True)
    status = db.Column(db.String(20), nullable=False)  # active, cancelled, past_due, expired
    provider_customer_id = db.Column(db.String(255))
    provider_subscription_id = db.Column(db.String(255), unique=True, index=True)
    current_period_end = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

Added via a new Alembic migration (`flask db migrate` / `flask db upgrade`),
matching how every other schema change in this repo has been made since the
email-verification work introduced Flask-Migrate.

Only `status == 'active'` grants unlimited usage. `past_due` (a failed
renewal charge, still in the platform's dunning/retry window) does **not**
grant unlimited usage — it falls back to the free daily limit rather than
either cutting the user off entirely or silently keeping them unlimited
during a billing problem neither side has resolved yet.

## Payment flow

1. User clicks "Upgrade" in `pages/app/dashboard.jsx`. The frontend requests
   a checkout URL from a new endpoint, `POST /api/v1/subscription/checkout`,
   which calls the Lemon Squeezy API to create a checkout session carrying
   `custom_data: { user_id }` and the logged-in user's email pre-filled, and
   returns the resulting hosted checkout URL.
2. User is redirected to Lemon Squeezy's hosted checkout page. Card entry
   happens entirely on Lemon Squeezy's domain — no card data ever reaches
   LessToken's server, so PCI compliance is Lemon Squeezy's problem, not
   ours.
3. On successful payment, Lemon Squeezy calls
   `POST /api/v1/webhooks/lemonsqueezy` with a `subscription_created` event.
   The handler verifies the request's HMAC-SHA256 signature against
   `LEMONSQUEEZY_WEBHOOK_SECRET` (reject with 401 if it doesn't match --
   this is the only thing standing between "anyone on the internet" and
   granting themselves unlimited access), reads `custom_data.user_id`, and
   upserts a `Subscription` row with `status='active'`.
4. Later lifecycle events (`subscription_updated`, `subscription_cancelled`,
   `subscription_expired`, `subscription_payment_failed`) update the same
   row's `status` and `current_period_end` via the same webhook endpoint.
5. To cancel or update a card, the user is sent to Lemon Squeezy's own
   hosted customer portal (a URL Lemon Squeezy provides per customer) --
   LessToken does not build any billing-management UI of its own.

## Endpoint changes

| Endpoint | Change |
|---|---|
| `POST /api/v1/optimize` | Before the existing `DAILY_OPTIMIZE_LIMIT` check, query `Subscription` for the current user. If `status == 'active'`, skip the daily-limit check entirely. Otherwise, existing behavior is unchanged. |
| `GET /api/v1/subscription` | **New.** Returns the current user's subscription status and `current_period_end`, so the dashboard can render "Upgrade" vs. "Manage subscription — renews {date}". |
| `POST /api/v1/subscription/checkout` | **New.** Creates a Lemon Squeezy checkout session for the current user, returns the checkout URL. |
| `POST /api/v1/webhooks/lemonsqueezy` | **New.** Unauthenticated (no user JWT — this is called by Lemon Squeezy's servers), but signature-verified as described above. |

## Frontend

`pages/app/dashboard.jsx` gains a subscription card:
- **Free tier:** "Unlimited usage — $6.99/mo" with an Upgrade button that
  calls the checkout endpoint and redirects to the returned URL.
- **Active subscriber:** current period end date, and a "Manage subscription"
  link to the Lemon Squeezy customer portal URL (fetched alongside the
  status from `GET /api/v1/subscription`).

## Configuration

New Railway environment variables: `LEMONSQUEEZY_API_KEY`,
`LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_STORE_ID`,
`LEMONSQUEEZY_VARIANT_ID` (the $6.99/mo product's variant ID).

## Testing

`web/tests/` already uses pytest with a Flask `test_client` fixture, an
in-memory SQLite database (`db.drop_all()`/`db.create_all()` per test), and
a JWT-token helper (see `test_optimize_limits.py`, which already covers
`DAILY_OPTIMIZE_LIMIT`). This work follows the same pattern:

- Extend `test_optimize_limits.py` with a case proving a user with an
  `active` Subscription row bypasses the daily limit entirely, and a case
  proving `past_due` does not.
- New `test_subscription_webhook.py`: a request with a valid signature over
  a `subscription_created` payload creates the `Subscription` row with the
  right `user_id`; an invalid/missing signature is rejected with 401 and
  writes nothing; a `subscription_cancelled` event on an existing row
  updates its `status` rather than creating a duplicate.
- No live Lemon Squeezy account or network call is needed for any of this --
  webhook payloads are just JSON fixtures signed with a known test secret.

## Out of scope

- Any change to the extension or the no-account web tools.
- A dedicated billing-management UI (Lemon Squeezy's hosted customer portal
  covers cancellation and payment method updates).
- Annual billing, discount codes, or any price point other than the single
  $6.99/mo tier.
- The team/B2B tier and the desktop app "Pro" tier discussed as later,
  separate pieces of the broader monetization idea -- each gets its own
  design when picked up.
