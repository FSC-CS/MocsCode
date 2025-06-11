import React from 'react';

interface InvitationEmailProps {
  inviterName: string;
  projectName: string;
  invitationLink: string;
}

export const InvitationEmail: React.FC<InvitationEmailProps> = ({
  inviterName,
  projectName,
  invitationLink,
}) => {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Join {projectName} on MocsCode</h1>
      <p style={styles.paragraph}>Hello,</p>
      <p style={styles.paragraph}>
        {inviterName} has invited you to collaborate on the project <strong>{projectName}</strong> on MocsCode.
      </p>
      <p style={styles.paragraph}>Click the button below to accept the invitation and get started:</p>
      <div style={styles.buttonContainer}>
        <a 
          href={invitationLink} 
          style={styles.button}
        >
          Accept Invitation
        </a>
      </div>
      <p style={styles.paragraph}>Or copy and paste this link into your browser:</p>
      <p style={{ ...styles.paragraph, wordBreak: 'break-all' }}>{invitationLink}</p>
      <p style={styles.paragraph}>If you didn't expect to receive this invitation, you can safely ignore this email.</p>
      <p style={styles.paragraph}>
        Best regards,<br />
        The MocsCode Team
      </p>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    color: '#333',
    lineHeight: 1.6,
  },
  heading: {
    color: '#1a1a1a',
    fontSize: '24px',
    marginBottom: '20px',
  },
  paragraph: {
    margin: '10px 0',
    fontSize: '16px',
  },
  buttonContainer: {
    margin: '32px 0',
    textAlign: 'center' as const,
  },
  button: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '16px',
  },
};
