# MocsCode Supabase Edge Functions

This directory contains the Supabase Edge Functions for MocsCode.

## Functions

### 1. `send-invitation-email`
Sends project invitation emails to users.

**Endpoint:** `POST /functions/v1/send-invitation-email`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "projectId": "uuid",
  "email": "user@example.com",
  "permissions": "viewer" | "editor",
  "message": "Optional personal message",
  "expiresAt": "2024-12-31T23:59:59Z" // Optional ISO date string
}
```

**Response:**
```json
{
  "success": true,
  "shareLink": {
    "id": "uuid",
    "project_id": "uuid",
    "share_token": "string",
    "role": "viewer" | "editor",
    "expires_at": "ISO date string or null",
    "created_by": "uuid",
    "created_at": "ISO date string",
    "is_active": true,
    "share_type": "email"
  },
  "emailSent": true,
  "inviteUrl": "https://your-app.com/join/token"
}
```

### 2. `send-password-reset`
Sends password reset emails to users.

**Endpoint:** `POST /functions/v1/send-password-reset`

**Authentication:** Not required (public)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent.",
  "emailSent": true
}
```

## Environment Variables

The following environment variables need to be configured in your Supabase project:

### Required (automatically available)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### Optional (for custom email sending)
- `RESEND_API_KEY` - API key from [Resend](https://resend.com) for sending emails
- `EMAIL_FROM` - From address for emails (e.g., "MocsCode <noreply@mocscode.com>")
- `APP_URL` or `SITE_URL` - Your application URL (e.g., "https://mocscode.com")

## Deployment

### Deploy all functions:
```bash
supabase functions deploy
```

### Deploy a specific function:
```bash
supabase functions deploy send-invitation-email
supabase functions deploy send-password-reset
```

### Set environment variables:
```bash
# Set Resend API key for email sending
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

# Set the app URL
supabase secrets set APP_URL=https://your-app-domain.com

# Set custom from email
supabase secrets set EMAIL_FROM="MocsCode <noreply@your-domain.com>"
```

## Local Development

### Start local Supabase:
```bash
supabase start
```

### Serve functions locally:
```bash
supabase functions serve
```

### Test locally with curl:
```bash
# Test send-invitation-email
curl -X POST http://localhost:54321/functions/v1/send-invitation-email \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "...", "email": "test@example.com", "permissions": "viewer"}'

# Test send-password-reset
curl -X POST http://localhost:54321/functions/v1/send-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Email Provider Setup

### Option 1: Resend (Recommended)
1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Verify your domain (for custom from addresses)
4. Set the `RESEND_API_KEY` secret in Supabase

### Option 2: Supabase Built-in SMTP
If `RESEND_API_KEY` is not set, the password reset function will fall back to Supabase's built-in email sending. Configure SMTP in your Supabase project settings under Authentication > SMTP Settings.

## Database Requirements

These functions depend on the following database tables:
- `users` - User profiles
- `projects` - Project information
- `project_members` - Project membership
- `sharing_permissions` - Share links
- `email_invitations` - Email invitation records

And the following database function:
- `generate_secure_token()` - RPC function to generate secure share tokens

## Troubleshooting

### Emails not being sent
1. Check if `RESEND_API_KEY` is set correctly
2. Verify your domain in Resend dashboard
3. Check function logs: `supabase functions logs send-invitation-email`

### Permission errors
1. Ensure the user has editor/owner role on the project
2. Check if the authorization token is valid and not expired

### Token generation errors
1. Ensure `generate_secure_token` RPC function exists in your database
2. Check RLS policies on `sharing_permissions` table
