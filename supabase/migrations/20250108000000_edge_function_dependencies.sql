-- Migration: Edge Function Dependencies
-- Creates database functions required by the Supabase Edge Functions

-- Function to generate secure random tokens for share links
CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a 32-character URL-safe random token
  token := encode(gen_random_bytes(24), 'base64');
  -- Replace URL-unsafe characters
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  RETURN token;
END;
$$;

-- Function to join a project via share token
-- This handles the logic of validating the token and adding the user as a member
CREATE OR REPLACE FUNCTION join_project_via_token(share_token_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_share_link RECORD;
  v_user_id UUID;
  v_existing_member RECORD;
  v_new_member_id UUID;
  v_result JSONB;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Find and validate the share link
  SELECT sp.*, p.name as project_name, p.owner_id
  INTO v_share_link
  FROM sharing_permissions sp
  JOIN projects p ON p.id = sp.project_id
  WHERE sp.share_token = share_token_param
    AND sp.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired share link'
    );
  END IF;

  -- Check if link has expired
  IF v_share_link.expires_at IS NOT NULL AND v_share_link.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This share link has expired'
    );
  END IF;

  -- Check if user is the project owner
  IF v_share_link.owner_id = v_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are the owner of this project'
    );
  END IF;

  -- Check if user is already a member
  SELECT * INTO v_existing_member
  FROM project_members
  WHERE project_id = v_share_link.project_id
    AND user_id = v_user_id;

  IF FOUND THEN
    -- User is already a member - optionally upgrade their role
    IF v_share_link.role = 'editor' AND v_existing_member.role = 'viewer' THEN
      UPDATE project_members
      SET role = 'editor'
      WHERE id = v_existing_member.id;
      
      RETURN jsonb_build_object(
        'success', true,
        'member_id', v_existing_member.id,
        'project_id', v_share_link.project_id,
        'role', 'editor',
        'message', 'Your role has been upgraded to editor'
      );
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'member_id', v_existing_member.id,
      'project_id', v_share_link.project_id,
      'role', v_existing_member.role,
      'message', 'You are already a member of this project'
    );
  END IF;

  -- Add user as a new member
  INSERT INTO project_members (project_id, user_id, role, joined_at)
  VALUES (v_share_link.project_id, v_user_id, v_share_link.role, NOW())
  RETURNING id INTO v_new_member_id;

  -- Update email invitation status if exists
  UPDATE email_invitations
  SET 
    status = 'accepted',
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE share_link_id = v_share_link.id
    AND invited_email = (SELECT email FROM auth.users WHERE id = v_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_new_member_id,
    'project_id', v_share_link.project_id,
    'role', v_share_link.role,
    'message', 'Successfully joined the project'
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are already a member of this project'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'An unexpected error occurred: ' || SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_secure_token() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_secure_token() TO service_role;
GRANT EXECUTE ON FUNCTION join_project_via_token(TEXT) TO authenticated;
