import { Resend } from 'resend';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { InvitationEmail } from '../components/emails/InvitationEmail';

// Initialize Resend with API key from environment variables
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Validates an email address format
 */
const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { 
      isValid: false, 
      message: 'Please enter a valid email address (e.g., user@example.com)' 
    };
  }

  return { isValid: true };
};

export interface InvitationEmailProps {
  to: string[];
  inviterName: string;
  projectName: string;
  invitationLink: string;
}

export const sendInvitationEmail = async ({
  to,
  inviterName,
  projectName,
  invitationLink,
}: InvitationEmailProps) => {
  // Validate recipient emails
  for (const email of to) {
    const validation = validateEmail(email);
    if (!validation.isValid) {
      throw new Error(validation.message || `Invalid email address: ${email}`);
    }
  }
  try {
    // Create React element with props
    const emailElement = React.createElement(InvitationEmail, {
      inviterName: inviterName,
      projectName: projectName,
      invitationLink: invitationLink,
    });
    
    // Render to HTML string
    const emailHtml = renderToStaticMarkup(emailElement);

    const { data, error } = await resend.emails.send({
      from: 'MocsCode <onboarding@resend.dev>', // Update this with your verified domain later
      to,
      subject: `You've been invited to collaborate on ${projectName}`,
      html: `<!DOCTYPE html>${emailHtml}`,
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      throw new Error('Failed to send invitation email');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendInvitationEmail:', error);
    throw error;
  }
};
