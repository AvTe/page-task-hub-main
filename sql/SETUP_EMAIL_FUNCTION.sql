-- ============================================
-- CREATE EMAIL SENDING FUNCTION IN SUPABASE
-- Run this in your Supabase SQL Editor
-- ============================================

-- This function will call Resend API from the server side
-- avoiding CORS issues

-- First, you need to set your Resend API key as a secret in Supabase
-- Go to: Project Settings > Edge Functions > Secrets
-- Add: RESEND_API_KEY = your_resend_api_key

-- Create the email sending function
CREATE OR REPLACE FUNCTION send_email(
    p_to TEXT,
    p_subject TEXT,
    p_html TEXT,
    p_from_email TEXT DEFAULT 'onboarding@resend.dev',
    p_from_name TEXT DEFAULT 'EasTask Team'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_api_key TEXT;
BEGIN
    -- Get the Resend API key from vault/secrets
    -- Note: You need to store this in Supabase secrets
    SELECT decrypted_secret INTO v_api_key
    FROM vault.decrypted_secrets
    WHERE name = 'RESEND_API_KEY'
    LIMIT 1;
    
    IF v_api_key IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'RESEND_API_KEY not found in secrets'
        );
    END IF;
    
    -- Call Resend API using pg_net extension
    SELECT net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || v_api_key,
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'from', p_from_name || ' <' || p_from_email || '>',
            'to', ARRAY[p_to],
            'subject', p_subject,
            'html', p_html
        )
    ) INTO v_result;
    
    RETURN jsonb_build_object(
        'success', true,
        'result', v_result
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION send_email TO authenticated;
