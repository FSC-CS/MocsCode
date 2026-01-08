// Supabase Edge Function: send-invitation-email
// Sends project invitation emails to users

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationPayload {
  projectId: string;
  email: string;
  permissions: "viewer" | "editor";
  message?: string;
  expiresAt?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: { message: "Missing authorization header" } }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client for user authentication verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: { message: "Invalid or expired token" } }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const payload: InvitationPayload = await req.json();
    const { projectId, email, permissions, message, expiresAt } = payload;

    // Validate required fields
    if (!projectId || !email || !permissions) {
      return new Response(
        JSON.stringify({
          error: { message: "Missing required fields: projectId, email, permissions" },
        }),
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
        JSON.stringify({ error: { message: "Invalid email format" } }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, name, owner_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: { message: "Project not found" } }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has permission to invite (owner or editor)
    const { data: membership } = await supabaseAdmin
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    const isOwner = project.owner_id === user.id;
    const isEditor = membership?.role === "editor" || membership?.role === "owner";

    if (!isOwner && !isEditor) {
      return new Response(
        JSON.stringify({
          error: { message: "You do not have permission to invite users to this project" },
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get inviter's name
    const { data: inviterData } = await supabaseAdmin
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .single();

    const inviterName = inviterData?.name || inviterData?.email || "A team member";

    // Generate secure share token
    const { data: shareToken, error: tokenError } = await supabaseAdmin.rpc(
      "generate_secure_token"
    );

    if (tokenError || !shareToken) {
      console.error("Token generation error:", tokenError);
      return new Response(
        JSON.stringify({ error: { message: "Failed to generate share token" } }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create sharing_permissions record
    const { data: shareLink, error: shareLinkError } = await supabaseAdmin
      .from("sharing_permissions")
      .insert({
        project_id: projectId,
        share_token: shareToken,
        role: permissions,
        expires_at: expiresAt || null,
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (shareLinkError || !shareLink) {
      console.error("Share link creation error:", shareLinkError);
      return new Response(
        JSON.stringify({ error: { message: "Failed to create share link" } }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create email_invitations record
    const { error: invitationError } = await supabaseAdmin
      .from("email_invitations")
      .insert({
        project_id: projectId,
        share_link_id: shareLink.id,
        invited_email: email,
        invited_by: user.id,
        invitation_message: message || null,
        status: "pending",
        sent_at: new Date().toISOString(),
      });

    if (invitationError) {
      console.error("Email invitation record error:", invitationError);
      // Continue anyway - the share link was created
    }

    // Build the invitation URL
    const appUrl = Deno.env.get("APP_URL") || Deno.env.get("SITE_URL") || "https://mocscode.com";
    const inviteUrl = `${appUrl}/join/${shareToken}`;

    // Send email using Resend (or fallback to logging)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendApiKey) {
      try {
        const emailHtml = generateInvitationEmailHtml({
          inviterName,
          projectName: project.name,
          permissions,
          message,
          inviteUrl,
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
            subject: `${inviterName} invited you to collaborate on "${project.name}"`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
          console.log(`Invitation email sent to ${email}`);

          // Update the invitation record
          await supabaseAdmin
            .from("email_invitations")
            .update({ status: "sent" })
            .eq("share_link_id", shareLink.id);
        } else {
          const errorData = await emailResponse.text();
          console.error("Resend API error:", errorData);
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError);
      }
    } else {
      console.log("RESEND_API_KEY not configured. Email not sent.");
      console.log(`Invitation URL for ${email}: ${inviteUrl}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        shareLink: {
          id: shareLink.id,
          project_id: shareLink.project_id,
          share_token: shareLink.share_token,
          role: shareLink.role,
          expires_at: shareLink.expires_at,
          created_by: shareLink.created_by,
          created_at: shareLink.created_at,
          is_active: shareLink.is_active,
          share_type: "email",
        },
        emailSent,
        inviteUrl,
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
        error: { message: error.message || "An unexpected error occurred" },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Email template generator - matches original MocsCode design
function generateInvitationEmailHtml(params: {
  inviterName: string;
  projectName: string;
  permissions: string;
  message?: string;
  inviteUrl: string;
}): string {
  const { inviterName, projectName, permissions, message, inviteUrl } = params;
  const isEditor = permissions === "editor";
  const accessIcon = isEditor ? "✏️" : "👁️";
  const accessText = isEditor 
    ? "Editor Access - You'll be able to edit and collaborate on this project."
    : "Viewer Access - You'll be able to view this project.";

  const personalMessageHtml = message ? `
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">Personal Message:</h3>
      <p style="margin: 0; color: #92400e; font-style: italic;">"${message}"</p>
    </div>
  ` : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 16px;">🔗 MocsCode</div>
      <h1 style="font-size: 28px; font-weight: bold; color: #1f2937; margin: 0 0 8px 0;">You're Invited to Collaborate!</h1>
    </div>
    
    <!-- Content -->
    <div>
      <p>Hi there!</p>
      <p><strong>${inviterName}</strong> has invited you to collaborate on a project.</p>
      
      <!-- Project Card -->
      <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #2563eb;">
        <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #1f2937;">${projectName}</h2>
        <p style="margin: 0; color: #6b7280;">${accessIcon} ${accessText}</p>
      </div>
      
      ${personalMessageHtml}
      
      <!-- CTA Button -->
      <div style="text-align: center;">
        <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0;">Join Project</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;"><strong>New to MocsCode?</strong> No worries! Click the button above and you'll be guided through creating your account.</p>
      
      <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy this link:<br>
        <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
      <p>This invitation was sent by ${inviterName} via MocsCode.</p>
    </div>
    
  </div>
</body>
</html>
  `.trim();
}
