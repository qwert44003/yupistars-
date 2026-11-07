# Yupistars Telegram Mini App — UI prototype

This is the first frontend prototype for `@Yupistars_bot`.

## Included
- Mobile-first dark UI with welcome modal
- Balance display (demo only)
- Three sections: Cases, Eggs, Slots
- Catalog cards and demo item dialogs
- Withdrawal button opens a private Telegram chat with `@sexhashuro` and prefills a message
- Telegram WebApp SDK initialization

## Run locally
Serve this folder over HTTPS (Telegram Mini Apps require a secure HTTPS URL for production):
```bash
python3 -m http.server 8080
```
For local browser testing open `http://localhost:8080`. For Telegram testing, deploy the folder to an HTTPS host and set that URL as the bot's Mini App URL using BotFather.

## Important status
This is a UI prototype only. It does **not** process payments, maintain a real balance, award gifts, or perform withdrawals. The displayed balance is a placeholder. Do not accept deposits based on this prototype.

## Production work still required
1. Backend with Telegram `initData` signature validation (never trust `initDataUnsafe` alone).
2. Database and ledger for balances and transactions.
3. Telegram Stars invoice flow with server-side successful-payment verification and refund/support handling.
4. Admin authentication and audit trail.
5. Legal/platform review before enabling paid random rewards, slots, or prize withdrawals.
6. Configure the bot's Mini App launch button and HTTPS domain.
