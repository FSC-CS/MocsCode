// Supabase Edge Function: send-password-reset
// Sends password reset emails to users

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetPayload {
  email: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const payload: PasswordResetPayload = await req.json();
    const { email } = payload;

    // Validate email
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the app URL for the redirect
    const appUrl = Deno.env.get("APP_URL") || Deno.env.get("SITE_URL") || "https://mocscode.com";
    const redirectTo = `${appUrl}/reset-password`;

    // Check if user exists (optional - for security, you might want to always return success)
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("id, name")
      .eq("email", email)
      .single();

    // Generate password reset link using Supabase Auth Admin API
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: redirectTo,
      },
    });

    if (resetError) {
      console.error("Password reset link generation error:", resetError);
      // For security, don't reveal if the email exists or not
      return new Response(
        JSON.stringify({
          success: true,
          message: "If an account exists with this email, a password reset link has been sent.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the reset link
    const resetLink = resetData?.properties?.action_link;

    if (!resetLink) {
      console.error("No reset link generated");
      return new Response(
        JSON.stringify({
          success: true,
          message: "If an account exists with this email, a password reset link has been sent.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send email using Resend (or fallback to logging)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendApiKey) {
      try {
        const userName = userData?.name || "there";
        const emailHtml = generatePasswordResetEmailHtml({
          userName,
          resetLink,
          appUrl,
        });

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: Deno.env.get("EMAIL_FROM") || "MocsCode <no-reply@mocscode.com>",
            to: [email],
            subject: "Reset your MocsCode password",
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
          console.log(`Password reset email sent to ${email}`);
        } else {
          const errorData = await emailResponse.text();
          console.error("Resend API error:", errorData);
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError);
      }
    } else {
      // Fallback: Use Supabase's built-in email sending
      console.log("RESEND_API_KEY not configured. Attempting Supabase built-in email...");
      
      // Try using the standard resetPasswordForEmail which uses Supabase's email config
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      
      const { error: builtInError } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
      });

      if (builtInError) {
        console.error("Supabase built-in email error:", builtInError);
      } else {
        emailSent = true;
        console.log(`Password reset email sent via Supabase to ${email}`);
      }
    }

    // Always return success for security (don't reveal if email exists)
    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent.",
        emailSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Email template generator for password reset - matches MocsCode branding
function generatePasswordResetEmailHtml(params: {
  userName: string;
  resetLink: string;
  appUrl: string;
}): string {
  const { userName, resetLink, appUrl } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 16px;">🔗 MocsCode</div>
      <h1 style="font-size: 28px; font-weight: bold; color: #1f2937; margin: 0 0 8px 0;">Reset Your Password</h1>
    </div>
    
    <!-- Content -->
    <div>
      <p>Hi ${userName}!</p>
      <p>We received a request to reset your password for your MocsCode account.</p>
      
      <!-- Info Card -->
      <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0; color: #6b7280;">Click the button below to create a new password. This link will expire in 1 hour.</p>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center;">
        <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0;">Reset Password</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy this link:<br>
        <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
      </p>
      
      <!-- Security Notice -->
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>⚠️ Security Notice:</strong> If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
      <p>This email was sent from MocsCode.</p>
    </div>
    
  </div>
</body>
</html>
  `.trim();
}
