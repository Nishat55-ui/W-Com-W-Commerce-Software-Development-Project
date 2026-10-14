# W-COM — Wahan Commerce

A JavaScript web application for exploring a parts catalogue, submitting quotation requests, and managing quotation statuses. The customer interface uses React, Vite, and Tailwind CSS; the API uses Express and SQLite through the WebAssembly-based `sql.js` package.

## Requirements

- Node.js 20.19 or newer
- npm

Tailwind CSS 4 and the SQLite driver do not require native C++ build tools.

## Run locally

Create a local environment file and set an admin password that is not used anywhere else:

```powershell
Copy-Item .env.example .env
notepad .env
```

Change `WCOM_ADMIN_EMAIL` and `WCOM_ADMIN_PASSWORD` in `.env`. Use a unique password with at least 12 characters. **Never commit or share `.env`; it is excluded from Git.** The `.env.example` file contains placeholders only.

```powershell
npm install
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). Vite proxies `/api` requests to the Express API on port `3001`. The first API startup creates `server/wcom.sqlite` and seeds it with clearly labelled sample catalogue data.

### Sign in

- **Customer:** Open the app, select **Create an account**, and register with the customer’s company, GST number, email, phone, and a password of at least 8 characters. The first customer account is created through this sign-up flow. There is no shared default customer password.
- **Administrator:** Select the small **Administrator access** link at the bottom of the sign-in screen. Sign in with the email and password configured in your local `.env`. The admin account is configured by the site operator; there is no public admin registration.
- Customer and administrator credentials are not included in this repository or README. The SQLite database contains account and session data and is excluded from Git.

To create a production client build and serve it from Express:

```powershell
npm run build
npm start
```

The server listens on port `3001` by default. Set `PORT` in `.env` to change it.

### Seed the test customer account

Run `npm run seed` in a local development environment to apply the repeatable SQLite seed in `server/seed.sql`. It creates the test customer account if it does not exist; running it again is safe and does not create duplicates. The seeded customer email is `wcom.test.customer.1791960612667@example.com`. Do not run the test seed in production or deploy a database containing this test account.

Admin sign-in is configured separately using the local `WCOM_ADMIN_EMAIL` and `WCOM_ADMIN_PASSWORD` in `.env`; admin accounts are not stored in SQLite. Keep test credentials local and change them before any non-demo use.

## Demo scope

- Catalogue, search, category filtering, and sample stock are stored locally in SQLite.
- Submitting a quotation request collects the registered company name, GST number, email, phone, and requested payment terms (immediate or a customer-entered number of days). The server validates the details and part quantities, calculates prices from the database, and stores the request.
- The Sales team workspace lets an administrator add or delete representatives and assign a representative to a customer account identified by GST number. New requests from an existing customer retain that customer’s assigned representative.
- The quotations workspace can update request status. Marking a request as `Paid` makes it available in Invoices; `Invoiced` records the conversion status.
- Customers can register and sign in with email and password. Passwords are stored as salted scrypt hashes; server-side sessions use HTTP-only cookies and customer requests are restricted to the signed-in account.
- Customers can review their own quotation history and edit their company name, GST number, email, and phone number. Customer details are saved in SQLite and snapshotted on submitted requests.
- Configure admin access with `WCOM_ADMIN_EMAIL` and a strong `WCOM_ADMIN_PASSWORD` of at least 12 characters in your local `.env` before starting the server. The Sales team and quotation management APIs require an admin session.
- The sign-in screen is customer-only by default. The small `Administrator access` link at the bottom opens the single configured admin sign-in; there is no public admin registration or role selector on customer sign-in.
- The OTP screen is a preview only: registration currently opens the customer dashboard without email verification. Google sign-in is displayed as coming soon; neither OTP nor Google OAuth is connected.
- Product records and prices are sample data, not live Wahan inventory or customer pricing.
- Odoo, Google Sheets, Google Apps Script, email, WhatsApp, payment processing, and PDF generation are external integrations and are **not connected** by this demo. Their credentials, endpoints, and reconciliation rules must be provided before implementing those connections.

## Before production

This is a local project/demo, not a complete production deployment. Configure admin credentials before using the admin workspace. Add login rate limiting, account recovery, email/OTP verification, audit logging, backups, and operational monitoring before exposing it to real customer or business data. Use HTTPS in production so secure session cookies are enabled.
