--
-- PostgreSQL database dump
--

\restrict BWcpSlSI0Ff4j5eZ7akA21s3FdkLgS8n2Ujxdc9PWh0Qh9OWgcj9AfyfsszR8OA

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-01-28 03:51:35

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 16689)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5262 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 915 (class 1247 OID 16728)
-- Name: order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status AS ENUM (
    'PENDING',
    'PAID',
    'PROCESSING',
    'PACKED',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED'
);


ALTER TYPE public.order_status OWNER TO postgres;

--
-- TOC entry 918 (class 1247 OID 16746)
-- Name: product_size; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.product_size AS ENUM (
    'XS',
    'S',
    'M',
    'L',
    'XL',
    'XXL',
    'One Size'
);


ALTER TYPE public.product_size OWNER TO postgres;

--
-- TOC entry 921 (class 1247 OID 16762)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 285 (class 1255 OID 16767)
-- Name: apply_promo_code(uuid, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.apply_promo_code(p_new_user_id uuid, p_promo_code character varying) RETURNS json
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


ALTER FUNCTION public.apply_promo_code(p_new_user_id uuid, p_promo_code character varying) OWNER TO postgres;

--
-- TOC entry 286 (class 1255 OID 16768)
-- Name: cleanup_all_reservations(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_all_reservations() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    cleaned_count INTEGER;
    additional_count INTEGER;
BEGIN
    -- Clean up expired reservations
    DELETE FROM "StockReservation" WHERE "expiresAt" <= CURRENT_TIMESTAMP;
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Also clean up any orphaned reservations (where cart item no longer exists)
    DELETE FROM "StockReservation" sr
    WHERE NOT EXISTS (
        SELECT 1 FROM "CartItem" ci 
        WHERE ci."id" = sr."cartItemId"
    ) AND sr."cartItemId" IS NOT NULL;
    
    GET DIAGNOSTICS additional_count = ROW_COUNT;
    
    RETURN cleaned_count + additional_count;
END;
$$;


ALTER FUNCTION public.cleanup_all_reservations() OWNER TO postgres;

--
-- TOC entry 287 (class 1255 OID 16769)
-- Name: cleanup_expired_reservations(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_reservations() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  deleted_reservations_count INTEGER;
BEGIN
  -- We need to count reservations before deleting their parent carts.
  -- A temporary table holds the IDs of cart items linked to expired carts.
  CREATE TEMP TABLE expired_cart_items ON COMMIT DROP AS
  SELECT "cartItemId" FROM public."StockReservation" sr
  JOIN public."CartItem" ci ON sr."cartItemId" = ci.id
  JOIN public."Cart" c ON ci."cartId" = c.id
  WHERE c."expiresAt" < CURRENT_TIMESTAMP;

  SELECT count(*) INTO deleted_reservations_count FROM expired_cart_items;

  -- Deleting expired carts will cascade down to CartItems and then StockReservations.
  DELETE FROM public."Cart" WHERE "expiresAt" < CURRENT_TIMESTAMP;

  RETURN deleted_reservations_count;
END;
$$;


ALTER FUNCTION public.cleanup_expired_reservations() OWNER TO postgres;

--
-- TOC entry 288 (class 1255 OID 16770)
-- Name: fix_over_reservations(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fix_over_reservations() RETURNS TABLE(product_id bigint, size_id bigint, color_id bigint, total_stock integer, reserved_before integer, reserved_after integer, fixed_count integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    rec RECORD;
    excess_qty INTEGER;
    deleted_qty INTEGER;
BEGIN
    -- Find all over-reserved combinations
    FOR rec IN
        SELECT 
            sr."productId",
            sr."sizeId",
            sr."colorId",
            ps."stock",
            SUM(sr."quantity") as total_reserved
        FROM "StockReservation" sr
        JOIN "ProductSize" ps ON (sr."productId" = ps."productId" AND sr."sizeId" = ps."id")
        WHERE sr."expiresAt" > CURRENT_TIMESTAMP
        GROUP BY sr."productId", sr."sizeId", sr."colorId", ps."stock"
        HAVING SUM(sr."quantity") > ps."stock"
    LOOP
        excess_qty := rec.total_reserved - rec."stock";
        deleted_qty := 0;
        
        -- Delete oldest reservations first until we're within limits
        WITH oldest_reservations AS (
            SELECT "id", "quantity"
            FROM "StockReservation"
            WHERE "productId" = rec."productId" 
            AND "sizeId" = rec."sizeId" 
            AND "colorId" = rec."colorId"
            AND "expiresAt" > CURRENT_TIMESTAMP
            ORDER BY "expiresAt" ASC
        ),
        to_delete AS (
            SELECT "id", 
                   "quantity",
                   SUM("quantity") OVER (ORDER BY "expiresAt") as running_total
            FROM "StockReservation"
            WHERE "productId" = rec."productId" 
            AND "sizeId" = rec."sizeId" 
            AND "colorId" = rec."colorId"
            AND "expiresAt" > CURRENT_TIMESTAMP
            ORDER BY "expiresAt" ASC
        )
        DELETE FROM "StockReservation"
        WHERE "id" IN (
            SELECT "id" FROM to_delete 
            WHERE running_total - "quantity" < excess_qty
        );
        
        GET DIAGNOSTICS deleted_qty = ROW_COUNT;
        
        -- Return info about what was fixed
        product_id := rec."productId";
        size_id := rec."sizeId";
        color_id := rec."colorId";
        total_stock := rec."stock";
        reserved_before := rec.total_reserved;
        reserved_after := rec.total_reserved - excess_qty;
        fixed_count := deleted_qty;
        
        RETURN NEXT;
    END LOOP;
END;
$$;


ALTER FUNCTION public.fix_over_reservations() OWNER TO postgres;

--
-- TOC entry 289 (class 1255 OID 16771)
-- Name: generate_promo_code(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_promo_code(p_user_id uuid) RETURNS character varying
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


ALTER FUNCTION public.generate_promo_code(p_user_id uuid) OWNER TO postgres;

--
-- TOC entry 273 (class 1255 OID 16772)
-- Name: has_free_delivery(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_free_delivery(p_user_id uuid) RETURNS boolean
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


ALTER FUNCTION public.has_free_delivery(p_user_id uuid) OWNER TO postgres;

--
-- TOC entry 290 (class 1255 OID 16773)
-- Name: reserve_stock(bigint, bigint, bigint, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reserve_stock(p_product_id bigint, p_color_id bigint, p_size_id bigint, p_quantity integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  physical_stock INTEGER;
  reserved_stock INTEGER;
BEGIN
  -- Step 1: Lock the specific row in the base table to prevent race conditions.
  SELECT stock INTO physical_stock
  FROM public."ProductSize"
  WHERE "productId" = p_product_id AND id = p_size_id
  FOR UPDATE;

  -- If the product size doesn't exist, we can't reserve it.
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Step 2: Calculate the currently reserved stock for this specific variant.
  SELECT COALESCE(SUM(quantity), 0) INTO reserved_stock
  FROM public."StockReservation"
  WHERE "productId" = p_product_id
    AND "colorId" = p_color_id
    AND "sizeId" = p_size_id
    AND "expiresAt" > CURRENT_TIMESTAMP;

  -- Step 3: Check if the available stock (physical - reserved) is sufficient.
  IF (physical_stock - reserved_stock) >= p_quantity THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;


ALTER FUNCTION public.reserve_stock(p_product_id bigint, p_color_id bigint, p_size_id bigint, p_quantity integer) OWNER TO postgres;

--
-- TOC entry 291 (class 1255 OID 16774)
-- Name: reserve_stock(bigint, bigint, bigint, integer, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reserve_stock(p_product_id bigint, p_size_id bigint, p_color_id bigint, p_quantity integer, p_session_id character varying) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
    available_stock INTEGER;
    reservation_result JSON;
BEGIN
    -- Lock the specific product size combination to prevent race conditions
    -- This ensures only one reservation can happen at a time for this specific variant
    PERFORM 1 FROM "ProductSize" 
    WHERE "productId" = p_product_id AND "id" = p_size_id 
    FOR UPDATE;
    
    -- Calculate available stock with the lock held
    SELECT COALESCE(ps."stock", 0) - COALESCE(SUM(sr."quantity"), 0)
    INTO available_stock
    FROM "ProductSize" ps
    LEFT JOIN "StockReservation" sr ON (
        sr."productId" = ps."productId" 
        AND sr."sizeId" = ps."id" 
        AND sr."colorId" = p_color_id
        AND sr."expiresAt" > NOW()
    )
    WHERE ps."productId" = p_product_id 
    AND ps."id" = p_size_id
    GROUP BY ps."stock";
    
    -- Handle null case (product size combination doesn't exist)
    IF available_stock IS NULL THEN
        available_stock := 0;
    END IF;
    
    -- Check if we have enough stock
    IF available_stock >= p_quantity THEN
        -- Create the reservation
        INSERT INTO "StockReservation" (
            "productId", 
            "sizeId", 
            "colorId", 
            "quantity", 
            "expiresAt"
        ) VALUES (
            p_product_id, 
            p_size_id, 
            p_color_id, 
            p_quantity, 
            NOW() + INTERVAL '30 minutes'
        );
        
        reservation_result := json_build_object(
            'reserved', true,
            'available_stock', available_stock - p_quantity,
            'reserved_quantity', p_quantity
        );
    ELSE
        -- Not enough stock available
        reservation_result := json_build_object(
            'reserved', false,
            'available_stock', available_stock,
            'requested_quantity', p_quantity,
            'error', 'Not enough stock available'
        );
    END IF;
    
    RETURN reservation_result;
END;
$$;


ALTER FUNCTION public.reserve_stock(p_product_id bigint, p_size_id bigint, p_color_id bigint, p_quantity integer, p_session_id character varying) OWNER TO postgres;

--
-- TOC entry 292 (class 1255 OID 16775)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- TOC entry 293 (class 1255 OID 16776)
-- Name: use_free_delivery(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.use_free_delivery(p_user_id uuid, p_order_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_reward_id uuid;
BEGIN
    -- Find the oldest unused free delivery reward
    SELECT id INTO v_reward_id
    FROM public.promo_rewards
    WHERE user_id = p_user_id
    AND reward_type = 'free_delivery'
    AND is_used = false
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;
    
    IF v_reward_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Mark the reward as used
    UPDATE public.promo_rewards
    SET is_used = true, order_id = p_order_id, used_at = CURRENT_TIMESTAMP
    WHERE id = v_reward_id;
    
    RETURN true;
END;
$$;


ALTER FUNCTION public.use_free_delivery(p_user_id uuid, p_order_id uuid) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 16777)
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    sku_id uuid NOT NULL,
    quantity integer NOT NULL,
    added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16787)
-- Name: carts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id character varying(255) NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.carts OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16795)
-- Name: download_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.download_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_email character varying(255) NOT NULL,
    product_id uuid NOT NULL,
    order_id uuid NOT NULL,
    download_type character varying(50) NOT NULL,
    download_url character varying(500),
    user_agent text,
    ip_address inet,
    downloaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.download_logs OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16807)
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_name character varying(255) NOT NULL,
    variant_color character varying(100),
    variant_size character varying(50),
    price_paid numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    product_id uuid,
    sku_id uuid
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16816)
-- Name: order_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_number_seq
    START WITH 10000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_number_seq OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16817)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    status public.order_status DEFAULT 'PENDING'::public.order_status NOT NULL,
    customer_email character varying(255) NOT NULL,
    shipping_address_line1 text NOT NULL,
    shipping_address_line2 text,
    shipping_city character varying(100) NOT NULL,
    shipping_postal_code character varying(20) NOT NULL,
    shipping_country character varying(100) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    shipping_cost numeric(10,2) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    payment_intent_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    full_name character varying(255),
    phone_number character varying(50),
    trading_card_url character varying(500),
    payhere_order_id character varying(100),
    payhere_payment_id character varying(100),
    payment_method character varying(50) DEFAULT 'PAYHERE'::character varying,
    order_number integer DEFAULT nextval('public.order_number_seq'::regclass),
    delivery_id character varying(255)
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 5263 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN orders.trading_card_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.trading_card_url IS 'URL path to the generated trading card image for this order';


--
-- TOC entry 5264 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN orders.delivery_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.delivery_id IS 'Tracking/delivery ID from delivery partner (e.g., Koombiya tracking code)';


--
-- TOC entry 226 (class 1259 OID 16837)
-- Name: password_reset_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    code character varying(6) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.password_reset_codes OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16848)
-- Name: pending_payhere_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pending_payhere_orders (
    id integer NOT NULL,
    order_id character varying(100) NOT NULL,
    user_id character varying(100) NOT NULL,
    cart_id character varying(100) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'LKR'::character varying,
    customer_email character varying(255) NOT NULL,
    customer_name character varying(200) NOT NULL,
    phone character varying(50),
    shipping_address text,
    shipping_city character varying(100),
    shipping_postal_code character varying(20),
    subtotal numeric(10,2),
    shipping_cost numeric(10,2),
    hash character varying(64) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    processed_order_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    free_delivery_applied boolean DEFAULT false
);


ALTER TABLE public.pending_payhere_orders OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16866)
-- Name: pending_payhere_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pending_payhere_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pending_payhere_orders_id_seq OWNER TO postgres;

--
-- TOC entry 5265 (class 0 OID 0)
-- Dependencies: 228
-- Name: pending_payhere_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pending_payhere_orders_id_seq OWNED BY public.pending_payhere_orders.id;


--
-- TOC entry 229 (class 1259 OID 16867)
-- Name: product_variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    color_name character varying(50) NOT NULL,
    color_hex_code character varying(7),
    price numeric(10,2) NOT NULL,
    sku character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    thumbnail_url character varying(255),
    compare_at_price numeric(10,2) DEFAULT NULL::numeric
);


ALTER TABLE public.product_variants OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16877)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(100),
    brand character varying(100),
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    audio_url character varying(255),
    shipping_cost numeric(10,2) DEFAULT 0.00 NOT NULL,
    trading_card_image character varying(255)
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16891)
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promo_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.promo_codes OWNER TO postgres;

--
-- TOC entry 5266 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE promo_codes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.promo_codes IS 'Stores unique promo codes for each user';


--
-- TOC entry 232 (class 1259 OID 16901)
-- Name: referrals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid NOT NULL,
    promo_code_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.referrals OWNER TO postgres;

--
-- TOC entry 5267 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE referrals; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.referrals IS 'Tracks referral relationships between users';


--
-- TOC entry 233 (class 1259 OID 16910)
-- Name: stock_keeping_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_keeping_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    size character varying(50) NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.stock_keeping_units OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16919)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    phone_number character varying(20),
    password_hash character varying(255),
    role public.user_role DEFAULT 'USER'::public.user_role NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    free_delivery_for_life boolean DEFAULT false NOT NULL,
    google_id character varying(255)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5268 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN users.free_delivery_for_life; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.free_delivery_for_life IS 'User has earned free delivery for life through successful referral';


--
-- TOC entry 5269 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN users.google_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.google_id IS 'Google OAuth user ID (sub claim from Google)';


--
-- TOC entry 235 (class 1259 OID 16937)
-- Name: variant_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variant_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    image_url character varying(255) NOT NULL,
    alt_text character varying(255),
    display_order integer DEFAULT 0
);


ALTER TABLE public.variant_images OWNER TO postgres;

--
-- TOC entry 4981 (class 2604 OID 16947)
-- Name: pending_payhere_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_payhere_orders ALTER COLUMN id SET DEFAULT nextval('public.pending_payhere_orders_id_seq'::regclass);


--
-- TOC entry 5012 (class 2606 OID 16949)
-- Name: cart_items cart_items_cart_id_sku_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_sku_id_key UNIQUE (cart_id, sku_id);


--
-- TOC entry 5014 (class 2606 OID 16951)
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5017 (class 2606 OID 16953)
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- TOC entry 5019 (class 2606 OID 16955)
-- Name: carts carts_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_session_id_key UNIQUE (session_id);


--
-- TOC entry 5023 (class 2606 OID 16957)
-- Name: download_logs download_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5029 (class 2606 OID 16959)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5033 (class 2606 OID 16961)
-- Name: orders orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);


--
-- TOC entry 5035 (class 2606 OID 16963)
-- Name: orders orders_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_payment_intent_id_key UNIQUE (payment_intent_id);


--
-- TOC entry 5037 (class 2606 OID 16965)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5041 (class 2606 OID 16967)
-- Name: password_reset_codes password_reset_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_pkey PRIMARY KEY (id);


--
-- TOC entry 5048 (class 2606 OID 16969)
-- Name: pending_payhere_orders pending_payhere_orders_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_payhere_orders
    ADD CONSTRAINT pending_payhere_orders_order_id_key UNIQUE (order_id);


--
-- TOC entry 5050 (class 2606 OID 16971)
-- Name: pending_payhere_orders pending_payhere_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_payhere_orders
    ADD CONSTRAINT pending_payhere_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5053 (class 2606 OID 16973)
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- TOC entry 5055 (class 2606 OID 16975)
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- TOC entry 5058 (class 2606 OID 16977)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 5062 (class 2606 OID 16979)
-- Name: promo_codes promo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_key UNIQUE (code);


--
-- TOC entry 5064 (class 2606 OID 16981)
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- TOC entry 5070 (class 2606 OID 16983)
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- TOC entry 5075 (class 2606 OID 16985)
-- Name: stock_keeping_units stock_keeping_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_keeping_units
    ADD CONSTRAINT stock_keeping_units_pkey PRIMARY KEY (id);


--
-- TOC entry 5077 (class 2606 OID 16987)
-- Name: stock_keeping_units stock_keeping_units_variant_id_size_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_keeping_units
    ADD CONSTRAINT stock_keeping_units_variant_id_size_key UNIQUE (variant_id, size);


--
-- TOC entry 5043 (class 2606 OID 16989)
-- Name: password_reset_codes unique_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT unique_email UNIQUE (email);


--
-- TOC entry 5072 (class 2606 OID 16991)
-- Name: referrals unique_referred_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT unique_referred_user UNIQUE (referred_id);


--
-- TOC entry 5066 (class 2606 OID 16993)
-- Name: promo_codes unique_user_promo_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT unique_user_promo_code UNIQUE (user_id);


--
-- TOC entry 5081 (class 2606 OID 16995)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5083 (class 2606 OID 16997)
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- TOC entry 5085 (class 2606 OID 16999)
-- Name: users users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);


--
-- TOC entry 5087 (class 2606 OID 17001)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5090 (class 2606 OID 17003)
-- Name: variant_images variant_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_images
    ADD CONSTRAINT variant_images_pkey PRIMARY KEY (id);


--
-- TOC entry 5015 (class 1259 OID 17004)
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- TOC entry 5020 (class 1259 OID 17005)
-- Name: idx_carts_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_carts_session_id ON public.carts USING btree (session_id);


--
-- TOC entry 5021 (class 1259 OID 17006)
-- Name: idx_carts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_carts_user_id ON public.carts USING btree (user_id);


--
-- TOC entry 5024 (class 1259 OID 17007)
-- Name: idx_download_logs_downloaded_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_download_logs_downloaded_at ON public.download_logs USING btree (downloaded_at);


--
-- TOC entry 5025 (class 1259 OID 17008)
-- Name: idx_download_logs_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_download_logs_order_id ON public.download_logs USING btree (order_id);


--
-- TOC entry 5026 (class 1259 OID 17009)
-- Name: idx_download_logs_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_download_logs_product_id ON public.download_logs USING btree (product_id);


--
-- TOC entry 5027 (class 1259 OID 17010)
-- Name: idx_download_logs_user_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_download_logs_user_email ON public.download_logs USING btree (user_email);


--
-- TOC entry 5030 (class 1259 OID 17011)
-- Name: idx_orders_payhere_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_payhere_order_id ON public.orders USING btree (payhere_order_id);


--
-- TOC entry 5031 (class 1259 OID 17012)
-- Name: idx_orders_trading_card_url; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_trading_card_url ON public.orders USING btree (trading_card_url) WHERE (trading_card_url IS NOT NULL);


--
-- TOC entry 5038 (class 1259 OID 17013)
-- Name: idx_password_reset_codes_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes USING btree (email);


--
-- TOC entry 5039 (class 1259 OID 17014)
-- Name: idx_password_reset_codes_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_codes_expires_at ON public.password_reset_codes USING btree (expires_at);


--
-- TOC entry 5044 (class 1259 OID 17015)
-- Name: idx_pending_payhere_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pending_payhere_order_id ON public.pending_payhere_orders USING btree (order_id);


--
-- TOC entry 5045 (class 1259 OID 17016)
-- Name: idx_pending_payhere_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pending_payhere_status ON public.pending_payhere_orders USING btree (status);


--
-- TOC entry 5046 (class 1259 OID 17017)
-- Name: idx_pending_payhere_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pending_payhere_user_id ON public.pending_payhere_orders USING btree (user_id);


--
-- TOC entry 5051 (class 1259 OID 17018)
-- Name: idx_product_variants_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);


--
-- TOC entry 5056 (class 1259 OID 17019)
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- TOC entry 5059 (class 1259 OID 17020)
-- Name: idx_promo_codes_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_promo_codes_code ON public.promo_codes USING btree (code);


--
-- TOC entry 5060 (class 1259 OID 17021)
-- Name: idx_promo_codes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_promo_codes_user_id ON public.promo_codes USING btree (user_id);


--
-- TOC entry 5067 (class 1259 OID 17022)
-- Name: idx_referrals_referred_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_referred_id ON public.referrals USING btree (referred_id);


--
-- TOC entry 5068 (class 1259 OID 17023)
-- Name: idx_referrals_referrer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_referrer_id ON public.referrals USING btree (referrer_id);


--
-- TOC entry 5073 (class 1259 OID 17024)
-- Name: idx_stock_keeping_units_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_keeping_units_variant_id ON public.stock_keeping_units USING btree (variant_id);


--
-- TOC entry 5078 (class 1259 OID 17025)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 5079 (class 1259 OID 17026)
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_google_id ON public.users USING btree (google_id) WHERE (google_id IS NOT NULL);


--
-- TOC entry 5088 (class 1259 OID 17027)
-- Name: idx_variant_images_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variant_images_variant_id ON public.variant_images USING btree (variant_id);


--
-- TOC entry 5108 (class 2620 OID 17028)
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5109 (class 2620 OID 17029)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5091 (class 2606 OID 17030)
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- TOC entry 5092 (class 2606 OID 17035)
-- Name: cart_items cart_items_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.stock_keeping_units(id) ON DELETE CASCADE;


--
-- TOC entry 5093 (class 2606 OID 17040)
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5094 (class 2606 OID 17045)
-- Name: download_logs download_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 5095 (class 2606 OID 17050)
-- Name: download_logs download_logs_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5096 (class 2606 OID 17055)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 5097 (class 2606 OID 17060)
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- TOC entry 5098 (class 2606 OID 17065)
-- Name: order_items order_items_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.stock_keeping_units(id) ON DELETE SET NULL;


--
-- TOC entry 5099 (class 2606 OID 17070)
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5100 (class 2606 OID 17075)
-- Name: password_reset_codes password_reset_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5101 (class 2606 OID 17080)
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5102 (class 2606 OID 17085)
-- Name: promo_codes promo_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5103 (class 2606 OID 17090)
-- Name: referrals referrals_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE CASCADE;


--
-- TOC entry 5104 (class 2606 OID 17095)
-- Name: referrals referrals_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5105 (class 2606 OID 17100)
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5106 (class 2606 OID 17105)
-- Name: stock_keeping_units stock_keeping_units_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_keeping_units
    ADD CONSTRAINT stock_keeping_units_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- TOC entry 5107 (class 2606 OID 17110)
-- Name: variant_images variant_images_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_images
    ADD CONSTRAINT variant_images_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


-- Completed on 2026-01-28 03:51:35

--
-- PostgreSQL database dump complete
--

\unrestrict BWcpSlSI0Ff4j5eZ7akA21s3FdkLgS8n2Ujxdc9PWh0Qh9OWgcj9AfyfsszR8OA

--
-- Upcoming launch waiting list additions
--

CREATE TABLE IF NOT EXISTS public.waiting_list_entries (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    phone_number character varying(20) NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public.launch_settings (
    id smallint PRIMARY KEY DEFAULT 1,
    upcoming_enabled boolean DEFAULT true NOT NULL,
    base_count integer DEFAULT 0 NOT NULL,
    tshirt_release_at timestamp with time zone NOT NULL,
    movie_release_at timestamp with time zone NOT NULL,
    logo_image_url character varying(500) DEFAULT '/images/michale copy2.png' NOT NULL,
    background_mode character varying(16) DEFAULT 'slider' NOT NULL,
    background_video_url character varying(500),
    background_audio_url character varying(500),
    background_slider_images jsonb DEFAULT '["/images/h123.JPG"]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT launch_settings_singleton CHECK (id = 1),
    CONSTRAINT launch_settings_base_count_non_negative CHECK (base_count >= 0),
    CONSTRAINT launch_settings_background_mode_valid CHECK (background_mode IN ('video', 'slider'))
);

INSERT INTO public.launch_settings (
    id,
    upcoming_enabled,
    base_count,
    tshirt_release_at,
    movie_release_at,
    logo_image_url,
    background_mode,
    background_audio_url,
    background_slider_images
)
VALUES (
    1,
    true,
    0,
    NOW() + INTERVAL '30 days',
    NOW() + INTERVAL '60 days',
    '/images/michale copy2.png',
    'slider',
    NULL,
    '["/images/h123.JPG"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

