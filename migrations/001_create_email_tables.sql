CREATE TABLE email_templates (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    locale VARCHAR(16) NOT NULL DEFAULT 'en',
    description TEXT,
    subject_template TEXT NOT NULL,
    html_body_template TEXT,
    text_body_template TEXT,
    required_variables JSONB NOT NULL DEFAULT '[]'::JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT email_templates_code_format CHECK (
        code = UPPER(code)
        AND code ~ '^[A-Z0-9]+([._-][A-Z0-9]+)*$'
    ),
    CONSTRAINT email_templates_locale_format CHECK (
        locale ~ '^[a-z]{2}(-[A-Z]{2})?$'
    ),
    CONSTRAINT email_templates_subject_not_blank CHECK (
        LENGTH(BTRIM(subject_template)) > 0
    ),
    CONSTRAINT email_templates_has_body CHECK (
        html_body_template IS NOT NULL OR text_body_template IS NOT NULL
    ),
    CONSTRAINT email_templates_required_variables_array CHECK (
        JSONB_TYPEOF(required_variables) = 'array'
    ),
    CONSTRAINT email_templates_version_positive CHECK (version > 0),
    CONSTRAINT email_templates_code_locale_unique UNIQUE (code, locale)
);

CREATE TABLE email_send_attempts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    template_id BIGINT NOT NULL REFERENCES email_templates(id) ON DELETE RESTRICT,
    template_version INTEGER NOT NULL,
    idempotency_key VARCHAR(128),
    request_hash CHAR(64) NOT NULL,
    recipient_count INTEGER NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    provider_message_id TEXT,
    error_code VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    CONSTRAINT email_send_attempts_recipient_count_positive CHECK (
        recipient_count > 0
    ),
    CONSTRAINT email_send_attempts_status_valid CHECK (
        status IN ('PENDING', 'SENT', 'FAILED')
    )
);

CREATE UNIQUE INDEX email_send_attempts_idempotency_key_unique
    ON email_send_attempts (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX email_send_attempts_template_created_at_idx
    ON email_send_attempts (template_id, created_at DESC);

CREATE INDEX email_send_attempts_status_created_at_idx
    ON email_send_attempts (status, created_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER email_templates_set_updated_at
BEFORE UPDATE ON email_templates
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
