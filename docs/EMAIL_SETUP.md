# Email System Setup — Devenira

## Supabase Email Templates

Go to **Supabase Dashboard > Authentication > Email Templates** and customize each template:

### 1. Confirm Signup

**Subject**: Welcome to Devenira!

```html
<div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #D97706; font-size: 28px; margin: 0;">Devenira</h1>
    <p style="color: #6B7280; font-size: 14px;">AI-Powered Fitness Tracking</p>
  </div>

  <div style="background: #F9FAFB; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
    <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Confirm your email</h2>
    <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Thanks for signing up! Click the button below to confirm your email address and start your transformation journey.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display: inline-block; background: #D97706; color: white; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
      Confirm Email
    </a>
  </div>

  <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
    If you didn't create an account, you can safely ignore this email.
  </p>
</div>
```

### 2. Reset Password

**Subject**: Reset your Devenira password

```html
<div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #D97706; font-size: 28px; margin: 0;">Devenira</h1>
  </div>

  <div style="background: #F9FAFB; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
    <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Reset your password</h2>
    <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display: inline-block; background: #D97706; color: white; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
      Reset Password
    </a>
  </div>

  <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
    If you didn't request this, you can safely ignore this email. Your password won't be changed.
  </p>
</div>
```

### 3. Magic Link

**Subject**: Sign in to Devenira

```html
<div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #D97706; font-size: 28px; margin: 0;">Devenira</h1>
  </div>

  <div style="background: #F9FAFB; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
    <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Sign in</h2>
    <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Click the button below to sign in to your account.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display: inline-block; background: #D97706; color: white; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
      Sign In
    </a>
  </div>

  <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
    If you didn't request this, you can safely ignore this email.
  </p>
</div>
```

## Supabase Settings

### Authentication > URL Configuration
- **Site URL**: `https://devenira.com`
- **Redirect URLs**: `https://devenira.com/auth/callback`

### Authentication > Email Auth
- Enable "Confirm email" toggle
- Enable "Secure email change" toggle

### Custom SMTP (Optional for better deliverability)
Go to **Project Settings > Auth > SMTP Settings** and configure:
- Use a service like SendGrid, Postmark, or AWS SES
- This improves email deliverability over Supabase's default SMTP

| Provider | Free Tier | Setup |
|----------|-----------|-------|
| SendGrid | 100 emails/day | Dashboard > Settings > API Keys |
| Postmark | 100 emails/month | Create server > Get API token |
| AWS SES | 62,000 emails/month | Verify domain > Get SMTP credentials |

## Environment Variable

Add to Vercel if using custom SMTP:
```
NEXT_PUBLIC_APP_URL=https://devenira.com
```

This is used in Supabase's redirect URLs for email confirmation links.
