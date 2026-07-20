# AGENTS.md — Bespoke API

## Environment Variables

* The real `.env` file is confidential.
* Never read or print the complete contents of the `.env` file.
* Never return environment variables through API endpoints.
* Never include real values in error messages or logs.
* Use `.env.example` only with variable names and placeholder values.
* Validate environment variables when the API starts.
* Stop the application startup when a required variable is missing.
* Do not create default values for secrets.
* Keep development and production credentials separate.

## Back-End-Only Secrets

These variables must never be sent to the front end:

* `DATABASE_URL`
* `SESSION_SECRET`
* `MERCADO_PAGO_ACCESS_TOKEN`
* `MERCADO_PAGO_WEBHOOK_SECRET`
* email service credentials;
* storage service credentials;
* private keys.

## Database

* Use parameterized queries only.
* Never concatenate external input into SQL queries.
* Never connect the application using the root database user.
* Use versioned migrations.
* Do not edit migrations that have already been applied.
* Use transactions for orders, inventory, and payments.

## API

* Validate route parameters, query parameters, and request bodies using strict schemas.
* Never pass `req.body` directly to the database or ORM.
* Implement authentication and authorization separately.
* Verify resource ownership for orders, addresses, and personal data.
* Do not return stack traces in production.
* Do not log tokens, cookies, passwords, or credentials.
