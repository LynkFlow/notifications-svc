UPDATE email_templates
SET
    html_body_template = '<h1>Welcome to LynkFlow</h1><p>Hello {{fullName}},</p><p>Your account for {{organizationName}} is almost ready. Click the button below to activate it:</p><p><a href="http://localhost:3001/auth-static/activate-account?token={{token}}">Activate your account</a></p><p>This activation link expires at {{expiresAt}}.</p><p>If you did not create this account, you can safely ignore this email.</p>',
    text_body_template = E'Welcome to LynkFlow\n\nHello {{fullName}},\n\nYour account for {{organizationName}} is almost ready. Open this link to activate it:\n\nhttp://localhost:3001/auth-static/activate-account?token={{token}}\n\nThis activation link expires at {{expiresAt}}.\n\nIf you did not create this account, you can safely ignore this email.',
    version = version + 1
WHERE code = 'account.activation.requested'
  AND locale = 'en';

UPDATE email_templates
SET
    html_body_template = '<h1>Reset your password</h1><p>We received a request to reset your LynkFlow password.</p><p>Click the button below to choose a new password:</p><p><a href="http://localhost:3001/auth-static/reset-password?token={{token}}">Reset your password</a></p><p>This password reset link expires at {{expiresAt}}.</p><p>If you did not request a password reset, ignore this email and your password will remain unchanged.</p>',
    text_body_template = E'Reset your password\n\nWe received a request to reset your LynkFlow password. Open this link to choose a new password:\n\nhttp://localhost:3001/auth-static/reset-password?token={{token}}\n\nThis password reset link expires at {{expiresAt}}.\n\nIf you did not request a password reset, ignore this email and your password will remain unchanged.',
    version = version + 1
WHERE code = 'password.reset.requested'
  AND locale = 'en';
