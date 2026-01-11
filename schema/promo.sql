-- Promo/Referral System Schema
-- Run this migration to add promo code and referral tracking capabilities

-- Add free_delivery_for_life column to users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'free_delivery_for_life'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN free_delivery_for_life boolean DEFAULT false NOT NULL;
    END IF;
END $$;

-- Table to store user promo codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    code character varying(10) NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT unique_user_promo_code UNIQUE (user_id)
);

-- Table to track referrals and promo usage
CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    referrer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_referred_user UNIQUE (referred_id) -- A user can only be referred once
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_user_id ON public.promo_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);

-- Function to generate a unique promo code
CREATE OR REPLACE FUNCTION public.generate_promo_code(p_user_id uuid)
RETURNS character varying(10)
LANGUAGE plpgsql
AS $$
DECLARE
    new_code character varying(10);
    code_exists boolean;
BEGIN
    -- Check if user already has a promo code
    SELECT code INTO new_code 
    FROM public.promo_codes 
    WHERE user_id = p_user_id;
    
    IF new_code IS NOT NULL THEN
        RETURN new_code;
    END IF;
    
    -- Generate unique code
    LOOP
        -- Generate random 6-character alphanumeric code
        new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.promo_codes WHERE code = new_code) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    -- Insert the new promo code
    INSERT INTO public.promo_codes (user_id, code)
    VALUES (p_user_id, new_code);
    
    RETURN new_code;
END;
$$;

-- Function to apply a promo code during registration
-- ONLY the referrer gets free delivery for life, NOT the new user
CREATE OR REPLACE FUNCTION public.apply_promo_code(
    p_new_user_id uuid,
    p_promo_code character varying
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    v_promo_record record;
    v_referral_id uuid;
BEGIN
    -- Validate promo code exists and is active
    SELECT pc.id, pc.user_id, pc.code
    INTO v_promo_record
    FROM public.promo_codes pc
    WHERE pc.code = upper(trim(p_promo_code))
    AND pc.is_active = true;
    
    IF v_promo_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid or inactive promo code'
        );
    END IF;
    
    -- Prevent self-referral
    IF v_promo_record.user_id = p_new_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot use your own promo code'
        );
    END IF;
    
    -- Check if user was already referred
    IF EXISTS(SELECT 1 FROM public.referrals WHERE referred_id = p_new_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User has already been referred'
        );
    END IF;
    
    -- Create referral record
    INSERT INTO public.referrals (referrer_id, referred_id, promo_code_id)
    VALUES (v_promo_record.user_id, p_new_user_id, v_promo_record.id)
    RETURNING id INTO v_referral_id;
    
    -- Grant FREE DELIVERY FOR LIFE to the referrer (the person who shared the code)
    UPDATE public.users
    SET free_delivery_for_life = true
    WHERE id = v_promo_record.user_id;
    
    -- Note: The new user (referred) does NOT get free delivery
    -- They need to refer someone else to earn it
    
    RETURN json_build_object(
        'success', true,
        'message', 'Promo code applied! Your friend now has free delivery for life.',
        'referral_id', v_referral_id
    );
END;
$$;

-- Function to check if user has free delivery for life
CREATE OR REPLACE FUNCTION public.has_free_delivery(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_has_free_delivery boolean;
BEGIN
    SELECT free_delivery_for_life INTO v_has_free_delivery
    FROM public.users
    WHERE id = p_user_id;
    
    RETURN COALESCE(v_has_free_delivery, false);
END;
$$;

COMMENT ON TABLE public.promo_codes IS 'Stores unique promo codes for each user';
COMMENT ON TABLE public.referrals IS 'Tracks referral relationships between users';
COMMENT ON COLUMN public.users.free_delivery_for_life IS 'User has earned free delivery for life through successful referral';

-- Add free_delivery_applied column to pending_payhere_orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pending_payhere_orders' 
        AND column_name = 'free_delivery_applied'
    ) THEN
        ALTER TABLE public.pending_payhere_orders 
        ADD COLUMN free_delivery_applied boolean DEFAULT false;
    END IF;
END $$;

-- Drop old promo_rewards table if it exists (no longer needed)
DROP TABLE IF EXISTS public.promo_rewards;
