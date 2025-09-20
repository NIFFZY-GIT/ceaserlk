--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-09-20 00:23:05

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
-- TOC entry 2 (class 3079 OID 18274)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5169 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 1014 (class 1247 OID 19404)
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
-- TOC entry 990 (class 1247 OID 19223)
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
-- TOC entry 975 (class 1247 OID 19156)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 354 (class 1255 OID 18844)
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
-- TOC entry 357 (class 1255 OID 18513)
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
-- TOC entry 356 (class 1255 OID 18845)
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
-- TOC entry 353 (class 1255 OID 18840)
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
-- TOC entry 355 (class 1255 OID 18846)
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
-- TOC entry 341 (class 1255 OID 19178)
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
-- TOC entry 300 (class 1259 OID 19278)
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
-- TOC entry 299 (class 1259 OID 19262)
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
-- TOC entry 303 (class 1259 OID 19430)
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
-- TOC entry 302 (class 1259 OID 19328)
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
-- TOC entry 301 (class 1259 OID 19311)
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
    trading_card_url character varying(500)
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 5170 (class 0 OID 0)
-- Dependencies: 301
-- Name: COLUMN orders.trading_card_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.trading_card_url IS 'URL path to the generated trading card image for this order';


--
-- TOC entry 304 (class 1259 OID 19453)
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
-- TOC entry 296 (class 1259 OID 19192)
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
-- TOC entry 295 (class 1259 OID 19180)
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
-- TOC entry 298 (class 1259 OID 19237)
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
-- TOC entry 294 (class 1259 OID 19161)
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
-- TOC entry 297 (class 1259 OID 19207)
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
-- TOC entry 5159 (class 0 OID 19278)
-- Dependencies: 300
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_items (id, cart_id, sku_id, quantity, added_at) FROM stdin;
\.


--
-- TOC entry 5158 (class 0 OID 19262)
-- Dependencies: 299
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carts (id, session_id, user_id, created_at, expires_at) FROM stdin;
9eb392d6-0ddc-4e4d-8a3f-ae15da063e5a	938ddb9c-dc60-4bac-85c1-988fb32f0e18	\N	2025-09-19 23:49:07.440129+05:30	2025-09-20 00:43:12.096+05:30
895d0497-875e-4986-8c28-a705f4071b81	9b1900d0-0c73-4acd-a816-68d72fa1e809	\N	2025-09-19 23:02:04.523517+05:30	2025-09-20 00:45:13.198+05:30
\.


--
-- TOC entry 5162 (class 0 OID 19430)
-- Dependencies: 303
-- Data for Name: download_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.download_logs (id, user_email, product_id, order_id, download_type, download_url, user_agent, ip_address, downloaded_at) FROM stdin;
\.


--
-- TOC entry 5161 (class 0 OID 19328)
-- Dependencies: 302
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_name, variant_color, variant_size, price_paid, quantity, product_id, sku_id) FROM stdin;
\.


--
-- TOC entry 5160 (class 0 OID 19311)
-- Dependencies: 301
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, user_id, status, customer_email, shipping_address_line1, shipping_address_line2, shipping_city, shipping_postal_code, shipping_country, subtotal, shipping_cost, total_amount, payment_intent_id, created_at, full_name, phone_number, trading_card_url) FROM stdin;
\.


--
-- TOC entry 5163 (class 0 OID 19453)
-- Dependencies: 304
-- Data for Name: password_reset_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_codes (id, user_id, email, code, expires_at, used, used_at, created_at) FROM stdin;
232ba70c-3515-401f-907a-14b9cdbce77a	722e9dc0-5b31-41b5-a791-2a8b46a2f062	k.nipuna.dasun@gmail.com	947178	2025-09-19 03:11:37.399+05:30	t	2025-09-19 03:02:12.470252+05:30	2025-09-19 03:01:37.399996+05:30
\.


--
-- TOC entry 5155 (class 0 OID 19192)
-- Dependencies: 296
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variants (id, product_id, color_name, color_hex_code, price, sku, created_at, thumbnail_url, compare_at_price) FROM stdin;
ddf6aac9-fc26-49bc-8da9-b72a39cd9c70	0a756d3f-f08d-4f57-a32f-a95d1548c505	Black	#000000	2500.00	asdffsd	2025-09-20 00:21:23.922684+05:30	\N	3000.00
\.


--
-- TOC entry 5154 (class 0 OID 19180)
-- Dependencies: 295
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, description, category, brand, is_published, created_at, updated_at, audio_url, shipping_cost, trading_card_image) FROM stdin;
0a756d3f-f08d-4f57-a32f-a95d1548c505	Ronaldo	sdfsdfsdf	\N	\N	t	2025-09-20 00:21:23.922684+05:30	2025-09-20 00:21:23.922684+05:30	/uploads/audio/1758307883917-epic1.mp3	500.00	/uploads/trading-cards/1758307883920-WhatsApp-Image-2025-09-17-at-8.44.49-PM.jpeg
\.


--
-- TOC entry 5157 (class 0 OID 19237)
-- Dependencies: 298
-- Data for Name: stock_keeping_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_keeping_units (id, variant_id, size, stock_quantity) FROM stdin;
4d63878e-5bcf-46df-bd33-758de83c1876	ddf6aac9-fc26-49bc-8da9-b72a39cd9c70	S	8
\.


--
-- TOC entry 5153 (class 0 OID 19161)
-- Dependencies: 294
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, first_name, last_name, email, phone_number, password_hash, role, is_verified, created_at, updated_at) FROM stdin;
9e91947c-eb75-4829-bcf1-8a575c9f69fa	admin	test	admin@gmail.com	0112753029	$2b$10$9XFwSJOUf2cyrkgNPXU4wOGcRFc1e2jVlj8iadllldYVmC9cts9wK	ADMIN	f	2025-09-12 16:43:30.016663+05:30	2025-09-12 16:45:50.481676+05:30
722e9dc0-5b31-41b5-a791-2a8b46a2f062	Kotalawalage	Dasun	k.nipuna.dasun@gmail.com	0766604984	$2b$10$Hyk5eb7C2PAJbsXV/KsGouBC.b/WtxQGpKFVRAuU2cHiSkCA4i0rq	USER	f	2025-09-12 16:40:54.536048+05:30	2025-09-19 03:02:12.470252+05:30
\.


--
-- TOC entry 5156 (class 0 OID 19207)
-- Dependencies: 297
-- Data for Name: variant_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variant_images (id, variant_id, image_url, alt_text, display_order) FROM stdin;
\.


--
-- TOC entry 4970 (class 2606 OID 19287)
-- Name: cart_items cart_items_cart_id_sku_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_sku_id_key UNIQUE (cart_id, sku_id);


--
-- TOC entry 4972 (class 2606 OID 19285)
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4964 (class 2606 OID 19268)
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- TOC entry 4966 (class 2606 OID 19270)
-- Name: carts carts_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_session_id_key UNIQUE (session_id);


--
-- TOC entry 4982 (class 2606 OID 19438)
-- Name: download_logs download_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4980 (class 2606 OID 19333)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4976 (class 2606 OID 19322)
-- Name: orders orders_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_payment_intent_id_key UNIQUE (payment_intent_id);


--
-- TOC entry 4978 (class 2606 OID 19320)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4990 (class 2606 OID 19460)
-- Name: password_reset_codes password_reset_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_pkey PRIMARY KEY (id);


--
-- TOC entry 4952 (class 2606 OID 19198)
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- TOC entry 4954 (class 2606 OID 19200)
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- TOC entry 4949 (class 2606 OID 19190)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 4960 (class 2606 OID 19243)
-- Name: stock_keeping_units stock_keeping_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_keeping_units
    ADD CONSTRAINT stock_keeping_units_pkey PRIMARY KEY (id);


--
-- TOC entry 4962 (class 2606 OID 19254)
-- Name: stock_keeping_units stock_keeping_units_variant_id_size_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_keeping_units
    ADD CONSTRAINT stock_keeping_units_variant_id_size_key UNIQUE (variant_id, size);


--
-- TOC entry 4992 (class 2606 OID 19469)
-- Name: password_reset_codes unique_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT unique_email UNIQUE (email);


--
-- TOC entry 4942 (class 2606 OID 19174)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4944 (class 2606 OID 19176)
-- Name: users users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);


--
-- TOC entry 4946 (class 2606 OID 19172)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4957 (class 2606 OID 19215)
-- Name: variant_images variant_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_images
    ADD CONSTRAINT variant_images_pkey PRIMARY KEY (id);


--
-- TOC entry 4973 (class 1259 OID 19298)
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- TOC entry 4967 (class 1259 OID 19276)
-- Name: idx_carts_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_carts_session_id ON public.carts USING btree (session_id);


--
-- TOC entry 4968 (class 1259 OID 19277)
-- Name: idx_carts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_carts_user_id ON public.carts USING btree (user_id);


--
-- TOC entry 4983 (class 1259 OID 19452)
-- Name: idx_download_logs_downloaded_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_download_logs_downloaded_at ON public.download_logs USING btree (downloaded_at);


--
-- TOC entry 4984 (class 1259 OID 19451)
-- Name: idx_download_logs_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_download_logs_order_id ON public.download_logs USING btree (order_id);


--
-- TOC entry 4985 (class 1259 OID 19450)
-- Name: idx_download_logs_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_download_logs_product_id ON public.download_logs USING btree (product_id);


--
-- TOC entry 4986 (class 1259 OID 19449)
-- Name: idx_download_logs_user_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_download_logs_user_email ON public.download_logs USING btree (user_email);


--
-- TOC entry 4974 (class 1259 OID 19429)
-- Name: idx_orders_trading_card_url; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_trading_card_url ON public.orders USING btree (trading_card_url) WHERE (trading_card_url IS NOT NULL);


--
-- TOC entry 4987 (class 1259 OID 19466)
-- Name: idx_password_reset_codes_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes USING btree (email);


--
-- TOC entry 4988 (class 1259 OID 19467)
-- Name: idx_password_reset_codes_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_codes_expires_at ON public.password_reset_codes USING btree (expires_at);


--
-- TOC entry 4950 (class 1259 OID 19206)
-- Name: idx_product_variants_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);


--
-- TOC entry 4947 (class 1259 OID 19191)
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- TOC entry 4958 (class 1259 OID 19251)
-- Name: idx_stock_keeping_units_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_keeping_units_variant_id ON public.stock_keeping_units USING btree (variant_id);


--
-- TOC entry 4940 (class 1259 OID 19177)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4955 (class 1259 OID 19221)
-- Name: idx_variant_images_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variant_images_variant_id ON public.variant_images USING btree (variant_id);


--
-- TOC entry 5007 (class 2620 OID 19252)
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5006 (class 2620 OID 19179)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4997 (class 2606 OID 19288)
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- TOC entry 4998 (class 2606 OID 19293)
-- Name: cart_items cart_items_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.stock_keeping_units(id) ON DELETE CASCADE;


--
-- TOC entry 4996 (class 2606 OID 19271)
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5003 (class 2606 OID 19444)
-- Name: download_logs download_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 5004 (class 2606 OID 19439)
-- Name: download_logs download_logs_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5000 (class 2606 OID 19334)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 5001 (class 2606 OID 19339)
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- TOC entry 5002 (class 2606 OID 19344)
-- Name: order_items order_items_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.stock_keeping_units(id) ON DELETE SET NULL;


--
-- TOC entry 4999 (class 2606 OID 19323)
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5005 (class 2606 OID 19461)
-- Name: password_reset_codes password_reset_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4993 (class 2606 OID 19201)
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4995 (class 2606 OID 19246)
-- Name: stock_keeping_units stock_keeping_units_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_keeping_units
    ADD CONSTRAINT stock_keeping_units_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- TOC entry 4994 (class 2606 OID 19216)
-- Name: variant_images variant_images_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_images
    ADD CONSTRAINT variant_images_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


-- Completed on 2025-09-20 00:23:05

--
-- PostgreSQL database dump complete
--

