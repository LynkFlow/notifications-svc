# LynkFlow Notification Service

Transactional email microservice built from the LynkFlow TypeScript, Express,
PostgreSQL, and Zod service template. Email content is selected by template code,
rendered with caller-provided variables, and delivered through a configurable
SMTP relay such as Brevo.

## Endpoints

- `POST /api/v1/emails/send` renders and sends one templated email request.
- `GET /` identifies the service.
- `GET /health/live` checks the Node.js process.
- `GET /health/ready` checks PostgreSQL connectivity.

### Send an email

```http
POST /api/v1/emails/send
Content-Type: application/json
Idempotency-Key: password-reset-request-123
```

```json
{
  "templateCode": "PASSWORD_RESET",
  "locale": "en",
  "to": [
    {
      "email": "user@example.com",
      "name": "Ahmed"
    }
  ],
  "variables": {
    "firstName": "Ahmed",
    "resetUrl": "https://app.example.com/reset/example-token"
  }
}
```

`cc`, `bcc`, and `replyTo` are optional. A request may contain at most 50 total
recipients. Template variables may be strings, finite numbers, or booleans.

A newly accepted SMTP send returns `202`. Replaying an already completed request
with the same `Idempotency-Key` and identical body returns `200` without sending
again. Reusing the key with a different body returns `409`.

The response confirms acceptance by the SMTP relay; it does not guarantee inbox
delivery.

## Email templates

Templates live in `email_templates`. Each `(code, locale)` pair is unique. Codes
may be uppercase identifiers such as `PASSWORD_RESET` or exact outbox event types
such as `account.activation.requested`; templates can be disabled without deletion
by setting `is_active` to `FALSE`.

Migration `002_seed_auth_event_email_templates.sql` adds the English templates
for `account.activation.requested`, `account.activated`,
`password.reset.requested`, `password.reset.completed`, and `password.changed`.
Their codes intentionally match `auth_outbox_events.event_type` exactly.

Supported placeholders use the restricted form `{{variableName}}`. Expressions,
conditionals, nested paths, and arbitrary code are not supported. Substitutions
are HTML-escaped in the HTML body. Missing variables and malformed placeholders
cause the request to fail before SMTP is contacted.

Example template:

```sql
INSERT INTO email_templates (
    code,
    locale,
    description,
    subject_template,
    html_body_template,
    text_body_template,
    required_variables
) VALUES (
    'PASSWORD_RESET',
    'en',
    'Password reset message',
    'Reset your password, {{firstName}}',
    '<p>Hello {{firstName}},</p><p><a href="{{resetUrl}}">Reset your password</a></p>',
    E'Hello {{firstName}},\n\nReset your password: {{resetUrl}}',
    '["firstName", "resetUrl"]'::JSONB
);
```

Template changes should increment `version`. The service stores the version used
for each attempt.

`email_send_attempts` records delivery state, template version, recipient count,
provider message ID, and a sanitized error code. It intentionally does not store
rendered content, variables, or recipient addresses.

## Configuration

Copy `.env.example` to `.env` and fill in the database and SMTP values. Reserved
characters in PostgreSQL URL credentials must be percent-encoded.

For Brevo:

```dotenv
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=the SMTP login shown by Brevo
SMTP_PASSWORD=the generated Brevo SMTP key
SMTP_FROM_EMAIL=your verified sender address
SMTP_FROM_NAME=LynkFlow
```

Generate an SMTP key under Brevo **Settings → SMTP & API → SMTP**. Use the SMTP
login shown there as the username; do not use an API key or your account password.

For implicit TLS on port 465, set `SMTP_PORT=465` and `SMTP_SECURE=true`.
Credentials belong in the deployment platform's secret manager and must never be
committed or logged.

## Setup

```bash
npm install
npm run db:migrate
npm run dev
```

The migration runner applies immutable SQL files in lexical order and validates
their SHA-256 checksums. Do not edit an applied migration; add a new sequential
migration.

## Commands

- `npm run typecheck` checks application and test TypeScript.
- `npm run build` emits production JavaScript to `dist/`.
- `npm start` runs the production build.
- `npm test` compiles and runs database-independent tests.
- `npm run check` runs type checking and tests.
- `npm run db:migrate` builds and applies pending migrations.

## Operational notes

- Restrict this endpoint to trusted internal callers at the gateway or service
  mesh. The application currently does not define its own authentication scheme.
- Rate-limit callers upstream as a second safeguard against abuse.
- Use a least-privilege PostgreSQL application role.
- Monitor failed attempts and the provider's bounce/suppression dashboard.
- Do not retry a failed request with the same idempotency key. A queued outbox and
  worker should replace synchronous delivery if durable automatic retries become
  a requirement.
