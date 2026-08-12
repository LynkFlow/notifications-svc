ALTER TABLE email_templates
    DROP CONSTRAINT email_templates_code_format;

ALTER TABLE email_templates
    ADD CONSTRAINT email_templates_code_format CHECK (
        code ~ '^[A-Za-z0-9]+([._-][A-Za-z0-9]+)*$'
    );

INSERT INTO email_templates (
    code,
    locale,
    description,
    subject_template,
    html_body_template,
    text_body_template,
    required_variables,
    is_active,
    version
) VALUES
(
    'account.activation.requested',
    'en',
    'Sent when a user needs to activate a newly created account.',
    'Activate your LynkFlow account',
    '<h1>Welcome to LynkFlow</h1><p>Hello {{fullName}},</p><p>Your account for {{organizationName}} is almost ready. Use the activation token below to activate it:</p><p><strong>{{token}}</strong></p><p>This token expires at {{expiresAt}}.</p><p>If you did not create this account, you can safely ignore this email.</p>',
    E'Welcome to LynkFlow\n\nHello {{fullName}},\n\nYour account for {{organizationName}} is almost ready. Use this activation token to activate it:\n\n{{token}}\n\nThis token expires at {{expiresAt}}.\n\nIf you did not create this account, you can safely ignore this email.',
    '["fullName", "organizationName", "token", "expiresAt"]'::JSONB,
    TRUE,
    1
),
(
    'account.activated',
    'en',
    'Sent after a user account has been activated successfully.',
    'Your LynkFlow account is active',
    '<h1>Your account is active</h1><p>Hello {{fullName}},</p><p>Your LynkFlow account has been activated successfully. You can now sign in and start using LynkFlow.</p><p>If you did not perform this action, please contact support immediately.</p>',
    E'Your account is active\n\nHello {{fullName}},\n\nYour LynkFlow account has been activated successfully. You can now sign in and start using LynkFlow.\n\nIf you did not perform this action, please contact support immediately.',
    '["fullName"]'::JSONB,
    TRUE,
    1
),
(
    'password.reset.requested',
    'en',
    'Sent when a user requests a password reset.',
    'Reset your LynkFlow password',
    '<h1>Reset your password</h1><p>We received a request to reset your LynkFlow password.</p><p>Use the reset token below to continue:</p><p><strong>{{token}}</strong></p><p>This token expires at {{expiresAt}}.</p><p>If you did not request a password reset, ignore this email and your password will remain unchanged.</p>',
    E'Reset your password\n\nWe received a request to reset your LynkFlow password.\n\nUse this reset token to continue:\n\n{{token}}\n\nThis token expires at {{expiresAt}}.\n\nIf you did not request a password reset, ignore this email and your password will remain unchanged.',
    '["token", "expiresAt"]'::JSONB,
    TRUE,
    1
),
(
    'password.reset.completed',
    'en',
    'Sent after a password reset has completed successfully.',
    'Your LynkFlow password has been reset',
    '<h1>Password reset complete</h1><p>Your LynkFlow password has been reset successfully.</p><p>You can now sign in using your new password.</p><p>If you did not reset your password, contact support immediately and secure your account.</p>',
    E'Password reset complete\n\nYour LynkFlow password has been reset successfully. You can now sign in using your new password.\n\nIf you did not reset your password, contact support immediately and secure your account.',
    '[]'::JSONB,
    TRUE,
    1
),
(
    'password.changed',
    'en',
    'Sent after an authenticated user changes their password.',
    'Your LynkFlow password was changed',
    '<h1>Password changed</h1><p>Your LynkFlow password was changed successfully.</p><p>If you made this change, no further action is required.</p><p>If you did not change your password, contact support immediately and secure your account.</p>',
    E'Password changed\n\nYour LynkFlow password was changed successfully.\n\nIf you made this change, no further action is required.\n\nIf you did not change your password, contact support immediately and secure your account.',
    '[]'::JSONB,
    TRUE,
    1
)
ON CONFLICT (code, locale) DO UPDATE
SET
    description = EXCLUDED.description,
    subject_template = EXCLUDED.subject_template,
    html_body_template = EXCLUDED.html_body_template,
    text_body_template = EXCLUDED.text_body_template,
    required_variables = EXCLUDED.required_variables,
    is_active = TRUE,
    version = email_templates.version + 1;
