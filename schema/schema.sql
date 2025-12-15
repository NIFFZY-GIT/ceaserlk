--
-- PostgreSQL database dump
--

\restrict gFLTLS6cVlfuiWwj3m80IC6MN5HWOajfhygOCpmowdas6yg415gjGO9FnnaOq6x

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2025-12-15 11:19:09

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
-- TOC entry 2 (class 3079 OID 19072)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5218 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 908 (class 1247 OID 19111)
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
-- TOC entry 911 (class 1247 OID 19128)
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
-- TOC entry 914 (class 1247 OID 19144)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 270 (class 1255 OID 19149)
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
-- TOC entry 271 (class 1255 OID 19150)
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
-- TOC entry 283 (class 1255 OID 19151)
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
-- TOC entry 284 (class 1255 OID 19152)
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
-- TOC entry 285 (class 1255 OID 19153)
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
-- TOC entry 286 (class 1255 OID 19154)
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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 19155)
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
-- TOC entry 221 (class 1259 OID 19165)
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
-- TOC entry 222 (class 1259 OID 19173)
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
-- TOC entry 223 (class 1259 OID 19185)
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
-- TOC entry 224 (class 1259 OID 19194)
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
    payment_method character varying(50) DEFAULT 'PAYHERE'::character varying
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 5219 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN orders.trading_card_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.trading_card_url IS 'URL path to the generated trading card image for this order';


--
-- TOC entry 225 (class 1259 OID 19212)
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
-- TOC entry 232 (class 1259 OID 20012)
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pending_payhere_orders OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 20011)
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
-- TOC entry 5220 (class 0 OID 0)
-- Dependencies: 231
-- Name: pending_payhere_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pending_payhere_orders_id_seq OWNED BY public.pending_payhere_orders.id;


--
-- TOC entry 226 (class 1259 OID 19223)
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
-- TOC entry 227 (class 1259 OID 19233)
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
-- TOC entry 228 (class 1259 OID 19247)
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
-- TOC entry 229 (class 1259 OID 19256)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    phone_number character varying(20),
    password_hash character varying(255) NOT NULL,
    role public.user_role DEFAULT 'USER'::public.user_role NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 19273)
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
-- TOC entry 4984 (class 2604 OID 20015)
-- Name: pending_payhere_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_payhere_orders ALTER COLUMN id SET DEFAULT nextval('public.pending_payhere_orders_id_seq'::regclass);


--
-- TOC entry 4991 (class 2606 OID 19284)
-- Name: cart_items cart_items_cart_id_sku_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_sku_id_key UNIQUE (cart_id, sku_id);


--
-- TOC entry 4993 (class 2606 OID 19286)
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4996 (class 2606 OID 19288)
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- TOC entry 4998 (class 2606 OID 19290)
-- Name: carts carts_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_session_id_key UNIQUE (session_id);


--
-- TOC entry 5002 (class 2606 OID 19292)
-- Name: download_logs download_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5008 (class 2606 OID 19294)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5012 (class 2606 OID 19296)
-- Name: orders orders_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_payment_intent_id_key UNIQUE (payment_intent_id);


--
-- TOC entry 5014 (class 2606 OID 19298)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5018 (class 2606 OID 19300)
-- Name: password_reset_codes password_reset_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_pkey PRIMARY KEY (id);


--
-- TOC entry 5048 (class 2606 OID 20033)
-- Name: pending_payhere_orders pending_payhere_orders_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_payhere_orders
    ADD CONSTRAINT pending_payhere_orders_order_id_key UNIQUE (order_id);


--
-- TOC entry 5050 (class 2606 OID 20031)
-- Name: pending_payhere_orders pending_payhere_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_payhere_orders
    ADD CONSTRAINT pending_payhere_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5023 (class 2606 OID 19302)
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- TOC entry 5025 (class 2606 OID 19304)
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- TOC entry 5028 (class 2606 OID 19306)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 5031 (class 2606 OID 19308)
-- Name: stock_keeping_units stock_keeping_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_keeping_units
    ADD CONSTRAINT stock_keeping_units_pkey PRIMARY KEY (id);


--
-- TOC entry 5033 (class 2606 OID 19310)
-- Name: stock_keeping_units stock_keeping_units_variant_id_size_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_keeping_units
    ADD CONSTRAINT stock_keeping_units_variant_id_size_key UNIQUE (variant_id, size);


--
-- TOC entry 5020 (class 2606 OID 19312)
-- Name: password_reset_codes unique_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT unique_email UNIQUE (email);


--
-- TOC entry 5036 (class 2606 OID 19314)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5038 (class 2606 OID 19316)
-- Name: users users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);


--
-- TOC entry 5040 (class 2606 OID 19318)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5043 (class 2606 OID 19320)
-- Name: variant_images variant_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_images
    ADD CONSTRAINT variant_images_pkey PRIMARY KEY (id);


--
-- TOC entry 4994 (class 1259 OID 19321)
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- TOC entry 4999 (class 1259 OID 19322)
-- Name: idx_carts_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_carts_session_id ON public.carts USING btree (session_id);


--
-- TOC entry 5000 (class 1259 OID 19323)
-- Name: idx_carts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_carts_user_id ON public.carts USING btree (user_id);


--
-- TOC entry 5003 (class 1259 OID 19324)
-- Name: idx_download_logs_downloaded_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_download_logs_downloaded_at ON public.download_logs USING btree (downloaded_at);


--
-- TOC entry 5004 (class 1259 OID 19325)
-- Name: idx_download_logs_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_download_logs_order_id ON public.download_logs USING btree (order_id);


--
-- TOC entry 5005 (class 1259 OID 19326)
-- Name: idx_download_logs_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_download_logs_product_id ON public.download_logs USING btree (product_id);


--
-- TOC entry 5006 (class 1259 OID 19327)
-- Name: idx_download_logs_user_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_download_logs_user_email ON public.download_logs USING btree (user_email);


--
-- TOC entry 5009 (class 1259 OID 20010)
-- Name: idx_orders_payhere_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_payhere_order_id ON public.orders USING btree (payhere_order_id);


--
-- TOC entry 5010 (class 1259 OID 19328)
-- Name: idx_orders_trading_card_url; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_trading_card_url ON public.orders USING btree (trading_card_url) WHERE (trading_card_url IS NOT NULL);


--
-- TOC entry 5015 (class 1259 OID 19329)
-- Name: idx_password_reset_codes_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes USING btree (email);


--
-- TOC entry 5016 (class 1259 OID 19330)
-- Name: idx_password_reset_codes_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_codes_expires_at ON public.password_reset_codes USING btree (expires_at);


--
-- TOC entry 5044 (class 1259 OID 20034)
-- Name: idx_pending_payhere_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pending_payhere_order_id ON public.pending_payhere_orders USING btree (order_id);


--
-- TOC entry 5045 (class 1259 OID 20036)
-- Name: idx_pending_payhere_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pending_payhere_status ON public.pending_payhere_orders USING btree (status);


--
-- TOC entry 5046 (class 1259 OID 20035)
-- Name: idx_pending_payhere_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pending_payhere_user_id ON public.pending_payhere_orders USING btree (user_id);


--
-- TOC entry 5021 (class 1259 OID 19331)
-- Name: idx_product_variants_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);


--
-- TOC entry 5026 (class 1259 OID 19332)
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- TOC entry 5029 (class 1259 OID 19333)
-- Name: idx_stock_keeping_units_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_keeping_units_variant_id ON public.stock_keeping_units USING btree (variant_id);


--
-- TOC entry 5034 (class 1259 OID 19334)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 5041 (class 1259 OID 19335)
-- Name: idx_variant_images_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variant_images_variant_id ON public.variant_images USING btree (variant_id);


--
-- TOC entry 5064 (class 2620 OID 19336)
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5065 (class 2620 OID 19337)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5051 (class 2606 OID 19338)
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- TOC entry 5052 (class 2606 OID 19343)
-- Name: cart_items cart_items_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.stock_keeping_units(id) ON DELETE CASCADE;


--
-- TOC entry 5053 (class 2606 OID 19348)
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5054 (class 2606 OID 19353)
-- Name: download_logs download_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 5055 (class 2606 OID 19358)
-- Name: download_logs download_logs_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5056 (class 2606 OID 19363)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 5057 (class 2606 OID 19368)
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- TOC entry 5058 (class 2606 OID 19373)
-- Name: order_items order_items_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.stock_keeping_units(id) ON DELETE SET NULL;


--
-- TOC entry 5059 (class 2606 OID 19378)
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5060 (class 2606 OID 19383)
-- Name: password_reset_codes password_reset_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5061 (class 2606 OID 19388)
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5062 (class 2606 OID 19393)
-- Name: stock_keeping_units stock_keeping_units_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_keeping_units
    ADD CONSTRAINT stock_keeping_units_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- TOC entry 5063 (class 2606 OID 19398)
-- Name: variant_images variant_images_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_images
    ADD CONSTRAINT variant_images_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


-- Completed on 2025-12-15 11:19:09

--
-- PostgreSQL database dump complete
--

\unrestrict gFLTLS6cVlfuiWwj3m80IC6MN5HWOajfhygOCpmowdas6yg415gjGO9FnnaOq6x

