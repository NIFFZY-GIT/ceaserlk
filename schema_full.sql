--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-09-18 22:48:27

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
-- TOC entry 5139 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 1006 (class 1247 OID 19404)
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
-- TOC entry 988 (class 1247 OID 19223)
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
-- TOC entry 973 (class 1247 OID 19156)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 352 (class 1255 OID 18844)
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
-- TOC entry 355 (class 1255 OID 18513)
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
-- TOC entry 354 (class 1255 OID 18845)
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
-- TOC entry 351 (class 1255 OID 18840)
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
-- TOC entry 353 (class 1255 OID 18846)
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
-- TOC entry 339 (class 1255 OID 19178)
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
-- TOC entry 5140 (class 0 OID 0)
-- Dependencies: 301
-- Name: COLUMN orders.trading_card_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.trading_card_url IS 'URL path to the generated trading card image for this order';


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
-- TOC entry 5131 (class 0 OID 19278)
-- Dependencies: 300
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_items (id, cart_id, sku_id, quantity, added_at) FROM stdin;
b8b006b8-7347-407d-a5e7-c88bf4ebeab1	bed2fb4f-b00d-4c99-88c0-c3ef77da1f66	b66de110-80b4-4875-9f7f-f3f1cf88de33	2	2025-09-18 22:33:05.902647+05:30
\.


--
-- TOC entry 5130 (class 0 OID 19262)
-- Dependencies: 299
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carts (id, session_id, user_id, created_at, expires_at) FROM stdin;
bed2fb4f-b00d-4c99-88c0-c3ef77da1f66	938ddb9c-dc60-4bac-85c1-988fb32f0e18	\N	2025-09-18 22:17:10.267107+05:30	2025-09-18 23:13:36.352+05:30
\.


--
-- TOC entry 5133 (class 0 OID 19328)
-- Dependencies: 302
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_name, variant_color, variant_size, price_paid, quantity, product_id, sku_id) FROM stdin;
1dedf49b-fbae-431e-91b7-d0e6673a48f6	a190746a-6fa8-444c-a885-9897780f8433	test1	blue	M	2500.00	1	224805a2-3904-4547-9422-647f2c6de3ed	7ce6a8a5-bb8d-49c9-b2c8-4073e84258c3
68a70fbe-3f95-4031-a0d9-4637007566eb	a190746a-6fa8-444c-a885-9897780f8433	TEST2	orane	S	15000.00	2	6b76b288-2d2c-4804-b794-636869fa4330	2efad7e8-972d-4634-a732-3aac0ad87385
c8c4d3e6-71ef-4088-bf8f-ff16dd452a18	8049cb55-9241-406e-8ef6-e86cc8a02423	TEST2	orane	S	15000.00	1	6b76b288-2d2c-4804-b794-636869fa4330	2efad7e8-972d-4634-a732-3aac0ad87385
305e995c-3a25-4cbc-90da-b37e74d9a047	63aeaf53-5b26-4bea-83c5-e4529022a49c	TEST2	orane	S	15000.00	1	6b76b288-2d2c-4804-b794-636869fa4330	2efad7e8-972d-4634-a732-3aac0ad87385
471f1bbb-5018-423c-92d6-934f4a9bcde5	caeb4d63-198d-4333-b7b8-c0d750991296	TEST2	orane	S	15000.00	1	6b76b288-2d2c-4804-b794-636869fa4330	2efad7e8-972d-4634-a732-3aac0ad87385
8ab748ce-ee57-4dc5-95c7-8408b82ac3d7	45679d1c-1253-4c69-bafc-21c1d23b3779	test1	blue	L	2500.00	2	224805a2-3904-4547-9422-647f2c6de3ed	2f2bfdb5-ec27-48a4-ae2f-4d750facd564
eb1f62df-96d6-4c10-906e-1d929d2bfcfb	94503062-5ee1-45ec-9dfd-bf93b4083ac9	test1	blue	L	2500.00	1	224805a2-3904-4547-9422-647f2c6de3ed	2f2bfdb5-ec27-48a4-ae2f-4d750facd564
9b2ee8c5-3319-4e9a-b277-7e136aa3a81b	5fd7537c-0f2b-45ef-a5a7-b67e2b82321a	test1	White	XL	1500.00	1	224805a2-3904-4547-9422-647f2c6de3ed	555b6471-4c08-49f2-867d-6927af455139
f1ef5390-e52f-4833-b3cf-7362b130360d	458aca3d-42b9-4d73-b3ff-acd34bb7f2e6	test1	White	XL	1500.00	1	224805a2-3904-4547-9422-647f2c6de3ed	555b6471-4c08-49f2-867d-6927af455139
41c1ef33-e3d7-45da-8cce-dbc1fbfc4280	458aca3d-42b9-4d73-b3ff-acd34bb7f2e6	test1	blue	L	2500.00	2	224805a2-3904-4547-9422-647f2c6de3ed	2f2bfdb5-ec27-48a4-ae2f-4d750facd564
065b71ee-b567-4ae1-89c7-3430b48c0d53	7ad898fd-b614-4b4f-896f-8e4fa920b9bc	test1	blue	L	2500.00	4	224805a2-3904-4547-9422-647f2c6de3ed	2f2bfdb5-ec27-48a4-ae2f-4d750facd564
3778fecf-6839-4d1e-823e-12a9e43ee2b3	88175413-b6ee-40a3-98eb-d45f45e682b8	test1	blue	M	2500.00	1	224805a2-3904-4547-9422-647f2c6de3ed	7ce6a8a5-bb8d-49c9-b2c8-4073e84258c3
e5dd4803-fbc0-40a6-812b-158b9f4dc583	3b235fcd-cbba-454d-91dc-faa9ec30f820	gdfgdf	gdf	S	44.00	1	93f7751e-1bcf-474d-aa81-22c2c7698068	3951f35a-cbb8-46ec-980f-029a106c4d54
9d9987a3-009b-484f-adb6-8cf9d05b2cf3	d5ef3865-ca44-4ef2-be72-967443109466	TEST2cczxczxczxc	Orange	S	15000.00	1	6b76b288-2d2c-4804-b794-636869fa4330	2efad7e8-972d-4634-a732-3aac0ad87385
427053a8-affb-4b2f-931b-cfe0eb778b33	45deb352-ed0e-4378-850c-81fe2cfed5f9	gdfgdf	gdf	S	44.00	1	93f7751e-1bcf-474d-aa81-22c2c7698068	3951f35a-cbb8-46ec-980f-029a106c4d54
564b0bcd-da62-4370-af0a-6d29ac1e36ab	71a1a4d3-638b-4edb-8441-3330b8b3da42	gfddf4	bbb	S	44.00	1	4e0d6482-8d89-4355-b031-06e86f5d8c84	6611596d-c3d2-440d-ad2c-3eb1569ec2dc
67bc5d45-ab03-42b7-b478-113f68b846c8	80026421-6c42-4651-8db0-867af8539ff0	gdfgdf	gdf	S	44.00	1	93f7751e-1bcf-474d-aa81-22c2c7698068	3951f35a-cbb8-46ec-980f-029a106c4d54
35898d18-baf7-435b-a6a4-f059ddd87665	398d9b05-1ad8-48cd-9e93-4763ed7fe47c	gdfgdf	gdf	S	44.00	1	93f7751e-1bcf-474d-aa81-22c2c7698068	3951f35a-cbb8-46ec-980f-029a106c4d54
9b739f52-5d1e-4222-b832-598374d792a3	398d9b05-1ad8-48cd-9e93-4763ed7fe47c	gfddf4	bbb	S	44.00	1	4e0d6482-8d89-4355-b031-06e86f5d8c84	6611596d-c3d2-440d-ad2c-3eb1569ec2dc
9717117f-bf98-4b2c-94aa-0dccb4784311	57552c76-6d0c-454c-848a-caa1e28c2fd9	Orange	Orange	XS	2500.00	1	9c9c57db-3b93-4fa1-b586-d9fd5aae0571	f1d59b95-e79c-4d1d-ad88-cb65ae8d8a97
4b062a6a-6ce8-4cee-956e-4856ea388081	aa9f5d9d-6480-4d37-95e6-3d9f3596ac7e	shirt	Black	M	5000.00	1	be476b13-350a-432f-b374-c40ae407fe9d	770e4a7b-e8af-4397-8bf1-32bd4a8dc7dc
e103882d-263d-4483-9702-ae53c7b61be2	e11cb2db-bfe6-40d5-858e-0fe53efacb18	gfddf4	bbb	S	44.00	1	4e0d6482-8d89-4355-b031-06e86f5d8c84	6611596d-c3d2-440d-ad2c-3eb1569ec2dc
b87c6a09-8a00-4849-a064-3801e8e58e92	777e02ef-4bb4-451e-84f9-e5ed3beb2de9	ietm23	Black	S	23423.00	1	\N	\N
d292e123-fd2b-4cd7-85a8-cc797deb01cb	4234640b-7579-4c93-b988-37461196c955	sdfsd	Black	S	423423.00	1	4dc7fd61-60c2-4731-bb49-6f7a961df48b	774ec0e1-0279-463e-9659-00b62f03eac0
4d29a50d-c5ff-441a-98ab-684dc7dbefd1	04bb9657-59bc-4db1-aca3-c28b7bef4acf	sdfsd	Black	S	423423.00	1	4dc7fd61-60c2-4731-bb49-6f7a961df48b	774ec0e1-0279-463e-9659-00b62f03eac0
0446f2a0-6d88-49f9-8018-cc60f407152a	04bb9657-59bc-4db1-aca3-c28b7bef4acf	shirt	Black	S	5000.00	1	be476b13-350a-432f-b374-c40ae407fe9d	14caec80-329f-4b66-bd0c-f0fee59a02a1
ff4c86be-f0b0-44a9-abd8-30d289653309	00b4ec29-aa24-48d1-ae1f-53d2f5454ead	Product	Black	M	5000.00	1	ebeb8d9f-7932-41bc-986a-02439b6f99df	1afa74c5-d1a8-4b02-9f5d-ff9054632891
cd8fa991-65a4-4e2a-8211-61c0bd4ea58d	00b4ec29-aa24-48d1-ae1f-53d2f5454ead	Product	Blue	S	5000.00	1	ebeb8d9f-7932-41bc-986a-02439b6f99df	5a9b2e7d-84fe-4795-95a3-26e2917f208f
5f4dc03e-1cad-4087-972a-d2c74a341bf4	a9df7bf8-bbdc-4e99-b72e-e41393400a1d	sdfsd	Black	S	423423.00	1	4dc7fd61-60c2-4731-bb49-6f7a961df48b	774ec0e1-0279-463e-9659-00b62f03eac0
18baa1b8-d265-4aac-aba1-40fbc0b5d3f6	1b0fcf4d-93d5-42ef-a4cb-b82ee0f0bbba	asdas	Crimson red	S	324234.00	1	24d38e13-496c-4c2c-b5bd-d3317673bac3	b66de110-80b4-4875-9f7f-f3f1cf88de33
7c225a1b-a37b-4ed7-ab0f-c5b08b774af3	b929996f-71fc-44a5-8b46-0c63ea8703f8	card	asddsa	S	3223.00	1	e780e862-8478-4590-ad80-7a63f6b49fd0	a8d36c34-261f-4582-8be4-2ab948584cc8
a3e29783-0068-4b9b-80e7-b08a9c1dec6f	b929996f-71fc-44a5-8b46-0c63ea8703f8	asdas	Crimson red	S	324234.00	1	24d38e13-496c-4c2c-b5bd-d3317673bac3	b66de110-80b4-4875-9f7f-f3f1cf88de33
\.


--
-- TOC entry 5132 (class 0 OID 19311)
-- Dependencies: 301
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, user_id, status, customer_email, shipping_address_line1, shipping_address_line2, shipping_city, shipping_postal_code, shipping_country, subtotal, shipping_cost, total_amount, payment_intent_id, created_at, full_name, phone_number, trading_card_url) FROM stdin;
a190746a-6fa8-444c-a885-9897780f8433	\N	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	32500.00	32000.00	64500.00	pi_3S6k7OPg7NaxGrmp05Qq7g8S	2025-09-13 09:02:21.495162+05:30	Kotalawalage Dasun	0766604984	\N
8049cb55-9241-406e-8ef6-e86cc8a02423	\N	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	15000.00	15000.00	30000.00	pi_3S6kDOPg7NaxGrmp0FIwcXcV	2025-09-13 09:03:32.424037+05:30	Kotalawalage Dasun	0766604984	\N
63aeaf53-5b26-4bea-83c5-e4529022a49c	\N	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	15000.00	15000.00	30000.00	pi_3S6k9cPg7NaxGrmp1r7W255Y	2025-09-13 09:04:40.161836+05:30	Kotalawalage Dasun	0766604984	\N
caeb4d63-198d-4333-b7b8-c0d750991296	\N	SHIPPED	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	15000.00	15000.00	30000.00	pi_3S6kQ5Pg7NaxGrmp1DY4P5Gy	2025-09-13 09:16:38.656349+05:30	Kotalawalage Dasun	0766604984	\N
80026421-6c42-4651-8db0-867af8539ff0	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	44.00	434.00	478.00	pi_3S76aiPg7NaxGrmp1inbs7rg	2025-09-14 08:57:09.841737+05:30	Kotalawalage Dasun	0766604984	\N
398d9b05-1ad8-48cd-9e93-4763ed7fe47c	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	88.00	1086.00	1174.00	pi_3S774RPg7NaxGrmp0KvEnvSk	2025-09-14 09:27:52.840129+05:30	Kotalawalage Dasun	0766604984	\N
45679d1c-1253-4c69-bafc-21c1d23b3779	\N	PACKED	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	5000.00	4000.00	9000.00	pi_3S6lU0Pg7NaxGrmp02hcKyRE	2025-09-13 10:24:46.017199+05:30	Kotalawalage Dasun	0766604984	\N
57552c76-6d0c-454c-848a-caa1e28c2fd9	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	2500.00	1400.00	3900.00	pi_3S7aXzPg7NaxGrmp0YFxZmuQ	2025-09-15 16:56:21.184299+05:30	Kotalawalage Dasun	0766604984	\N
aa9f5d9d-6480-4d37-95e6-3d9f3596ac7e	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	5000.00	1500.00	6500.00	pi_3S8GZQPg7NaxGrmp06ouUi8V	2025-09-17 13:48:38.460382+05:30	Kotalawalage Dasun	0766604984	\N
e11cb2db-bfe6-40d5-858e-0fe53efacb18	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	44.00	652.00	696.00	pi_3S8N0BPg7NaxGrmp1Mpcsyqa	2025-09-17 20:40:42.280761+05:30	Kotalawalage Dasun	0766604984	\N
94503062-5ee1-45ec-9dfd-bf93b4083ac9	\N	PACKED	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	2500.00	2000.00	4500.00	pi_3S6pHsPg7NaxGrmp0V0HgeGb	2025-09-13 14:28:32.311865+05:30	Kotalawalage Dasun	0766604984	\N
777e02ef-4bb4-451e-84f9-e5ed3beb2de9	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	23423.00	3455.00	26878.00	pi_3S8N4wPg7NaxGrmp0iWdbKzb	2025-09-17 20:45:35.596284+05:30	Kotalawalage Dasun	0766604984	\N
4234640b-7579-4c93-b988-37461196c955	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	2333	Sri Lanka	423423.00	234234.00	657657.00	pi_3S8NBuPg7NaxGrmp0ohP2THb	2025-09-17 20:52:46.358795+05:30	Kotalawalage Dasun	0766604984	\N
5fd7537c-0f2b-45ef-a5a7-b67e2b82321a	\N	SHIPPED	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	1500.00	2000.00	3500.00	pi_3S6pSFPg7NaxGrmp19z7dmt9	2025-09-13 14:39:14.184881+05:30	Kotalawalage Dasun	0766604984	\N
04bb9657-59bc-4db1-aca3-c28b7bef4acf	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PACKED	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	428423.00	235734.00	664157.00	pi_3S8NppPg7NaxGrmp0tWH1yNW	2025-09-17 21:34:03.245182+05:30	Kotalawalage Dasun	0766604984	\N
458aca3d-42b9-4d73-b3ff-acd34bb7f2e6	\N	PACKED	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	6500.00	6000.00	12500.00	pi_3S6pWmPg7NaxGrmp0fRwycOP	2025-09-13 14:43:55.624425+05:30	Kotalawalage Dasun	0766604984	\N
7ad898fd-b614-4b4f-896f-8e4fa920b9bc	\N	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	10000.00	8000.00	18000.00	pi_3S6uu1Pg7NaxGrmp0h0nIKDY	2025-09-13 20:28:16.703783+05:30	Kotalawalage Dasun	0766604984	\N
00b4ec29-aa24-48d1-ae1f-53d2f5454ead	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	10000.00	3000.00	13000.00	pi_3S8O6lPg7NaxGrmp1LaGY0cc	2025-09-17 21:51:31.663266+05:30	Kotalawalage Dasun	0766604984	\N
a9df7bf8-bbdc-4e99-b72e-e41393400a1d	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	423423.00	234234.00	657657.00	pi_3S8OKZPg7NaxGrmp1NxU6VFF	2025-09-17 22:05:47.89125+05:30	Kotalawalage Dasun	0766604984	\N
1b0fcf4d-93d5-42ef-a4cb-b82ee0f0bbba	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	324234.00	23.00	324257.00	pi_3S8koNPg7NaxGrmp1iXklLlf	2025-09-18 22:06:06.205824+05:30	Kotalawalage Dasun	0766604984	\N
88175413-b6ee-40a3-98eb-d45f45e682b8	\N	DELIVERED	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	2500.00	2000.00	4500.00	pi_3S6vHxPg7NaxGrmp1rmbCYw1	2025-09-13 20:53:02.665129+05:30	Kotalawalage Dasun	0766604984	\N
3b235fcd-cbba-454d-91dc-faa9ec30f820	9e91947c-eb75-4829-bcf1-8a575c9f69fa	PAID	nipuna@zevarone.com	asd	\N	asdasd	10200	Sri Lanka	44.00	434.00	478.00	pi_3S6zEKPg7NaxGrmp0mgYgnQX	2025-09-14 01:05:31.274813+05:30	admin@gmail.com admin@gmail.com	0766604984	\N
d5ef3865-ca44-4ef2-be72-967443109466	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	15000.00	15000.00	30000.00	pi_3S6zLMPg7NaxGrmp0PTuW2dW	2025-09-14 01:12:48.718304+05:30	Kotalawalage Dasun	0766604984	\N
45deb352-ed0e-4378-850c-81fe2cfed5f9	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	44.00	434.00	478.00	pi_3S6zm2Pg7NaxGrmp0iD8x4s7	2025-09-14 01:40:23.079474+05:30	Kotalawalage Dasun	0766604984	\N
71a1a4d3-638b-4edb-8441-3330b8b3da42	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	44.00	652.00	696.00	pi_3S70FoPg7NaxGrmp0y1DmGtQ	2025-09-14 02:11:09.775127+05:30	Kotalawalage Dasun	0766604984	\N
b929996f-71fc-44a5-8b46-0c63ea8703f8	722e9dc0-5b31-41b5-a791-2a8b46a2f062	PAID	k.nipuna.dasun@gmail.com	1 377 1/A, Magammana, Homagama	\N	Homagama	10200	Sri Lanka	327457.00	543.00	328000.00	pi_3S8kz6Pg7NaxGrmp0WgKwy1o	2025-09-18 22:17:09.528544+05:30	Kotalawalage Dasun	0766604984	\N
\.


--
-- TOC entry 5127 (class 0 OID 19192)
-- Dependencies: 296
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variants (id, product_id, color_name, color_hex_code, price, sku, created_at, thumbnail_url, compare_at_price) FROM stdin;
f46b0428-8759-4199-ab38-ef85affe2e41	24d38e13-496c-4c2c-b5bd-d3317673bac3	Crimson red	#990000	324234.00	ewdsf	2025-09-18 21:59:38.45773+05:30	/uploads/products/1758212978463-attachment_68225769.jpg	\N
dd29df2c-488e-4553-9868-80cdfb9d6782	6b76b288-2d2c-4804-b794-636869fa4330	Orange	#ff8000	15000.00	sdfafsd	2025-09-13 02:38:41.261865+05:30	/uploads/products/1757711321265-attachment_68225769.jpg	1000.00
d6938d6b-2e79-4d79-a23a-47c630b6d685	4e0d6482-8d89-4355-b031-06e86f5d8c84	bbb	#000000	44.00	fgfd	2025-09-14 00:06:58.043068+05:30	/uploads/products/1757788618045-bs.webp	\N
cdf463cf-8cc4-4c3c-9600-e7041ab947a3	9c9c57db-3b93-4fa1-b586-d9fd5aae0571	Orange	#ff8000	2500.00	dsfsfdf	2025-09-15 16:51:44.356833+05:30	/uploads/products/1757935304367-attachment_68225769.jpg	2000.00
39df8589-9777-4ef2-b82c-55cfcc62783f	9c9c57db-3b93-4fa1-b586-d9fd5aae0571	Black	#000000	15200.00	sfdf	2025-09-15 16:52:53.815027+05:30	blob:http://localhost:3000/3eeeda18-5e3c-44f6-bfb4-49b3904031b4	1000.00
f464f332-df4d-4a8c-9a12-b766e421996d	be476b13-350a-432f-b374-c40ae407fe9d	Black	#000000	5000.00	asdfsd	2025-09-17 13:06:20.767274+05:30	/uploads/products/1758094580773-WhatsApp-Image-2025-09-17-at-12.05.27-PM.jpeg	\N
3fdec1d0-497f-4166-a105-b738c56dd622	224805a2-3904-4547-9422-647f2c6de3ed	blue	#0000a0	2500.00	asdasd	2025-09-13 00:08:30.178058+05:30	/uploads/products/1757702310180-blue.jpeg	2000.00
13b5e053-3166-40f0-9403-7d3a03734f87	224805a2-3904-4547-9422-647f2c6de3ed	White	#ffffff	1500.00	dsffsdf	2025-09-13 00:08:30.178058+05:30	/uploads/products/1757702310186-bs.jpg	\N
2bd93401-5234-4550-9642-c7a6494563d1	93f7751e-1bcf-474d-aa81-22c2c7698068	Blue	#0000a0	44.00	\N	2025-09-14 00:37:04.169079+05:30	/uploads/products/1757790424184-blue.jpeg	\N
32d5badf-92b1-4cdc-89a5-d0b33bbb615b	4dc7fd61-60c2-4731-bb49-6f7a961df48b	Black	#000000	423423.00	dsfsdf	2025-09-17 20:52:20.345543+05:30	/uploads/products/1758122540354-WhatsApp-Image-2025-09-17-at-8.50.12-PM.jpeg	\N
a8a174f9-7968-4b0c-a181-497054a9beb3	45883543-411d-4062-b904-2d32b86c18ff	Orange	#ff8000	56654.00	dfgdfg	2025-09-15 09:34:59.919934+05:30	/uploads/products/1757909099923-attachment_68225769.jpg	556.00
ba35d673-1710-4c3d-8d1e-9ce36885aef4	ebeb8d9f-7932-41bc-986a-02439b6f99df	Blue	#0000ff	5000.00	dsfdfasdfadf	2025-09-17 21:43:32.707479+05:30	/uploads/products/1758125612711-blue.jpeg	2500.00
5ae6ccc5-334f-43ed-9846-a62b73c0d95f	4e6818c1-89a5-41e2-a3dc-9c28281f8666	Orange	#ff8000	344.00	rewfds	2025-09-15 09:29:14.531689+05:30	/uploads/products/1757908754537-attachment_68225769.jpg	3444.00
8b0af6d4-50b5-480a-af9a-ba1c56e43aa3	ebeb8d9f-7932-41bc-986a-02439b6f99df	Black	#000000	5000.00	asdasdas	2025-09-17 21:43:32.707479+05:30	/uploads/products/1758125612721-bs.webp	2000.00
4a7c9b8f-418f-44a4-8ee7-191f464875bf	e780e862-8478-4590-ad80-7a63f6b49fd0	asddsa	#000000	3223.00	sdfsdf	2025-09-18 21:52:37.590954+05:30	/uploads/products/1758212557597-blue.jpeg	\N
\.


--
-- TOC entry 5126 (class 0 OID 19180)
-- Dependencies: 295
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, description, category, brand, is_published, created_at, updated_at, audio_url, shipping_cost, trading_card_image) FROM stdin;
6b76b288-2d2c-4804-b794-636869fa4330	TEST2cczxczxczxc	sdfsdfasdfasfs	\N	\N	t	2025-09-13 02:38:41.261865+05:30	2025-09-13 23:54:27.524574+05:30	\N	15000.00	\N
4e0d6482-8d89-4355-b031-06e86f5d8c84	gfddf4	dfgasdfgdgdfg	\N	\N	t	2025-09-14 00:06:58.043068+05:30	2025-09-14 00:06:58.043068+05:30	/uploads/audio/1757788618038-epic1.mp3	652.00	\N
224805a2-3904-4547-9422-647f2c6de3ed	test1	sdasafds	\N	\N	t	2025-09-13 00:08:30.178058+05:30	2025-09-14 10:46:36.296917+05:30	\N	2000.00	\N
93f7751e-1bcf-474d-aa81-22c2c7698068	gdfgdf	sdfsfsdf	\N	\N	t	2025-09-14 00:37:04.169079+05:30	2025-09-15 00:53:40.35189+05:30	/uploads/audio/1757790424164-epic1.mp3	434.00	\N
45883543-411d-4062-b904-2d32b86c18ff	fgfdrg	hvcb	\N	\N	t	2025-09-15 09:34:59.919934+05:30	2025-09-15 16:50:12.532746+05:30	\N	566.00	\N
4e6818c1-89a5-41e2-a3dc-9c28281f8666	oragmge	edfdsfsdfsdf	\N	\N	t	2025-09-15 09:29:14.531689+05:30	2025-09-15 16:50:24.060187+05:30	/uploads/audio/1757908754527-epic1.mp3	234.00	\N
9c9c57db-3b93-4fa1-b586-d9fd5aae0571	Orange	sdfsdafasdfsd	\N	\N	t	2025-09-15 16:51:44.356833+05:30	2025-09-15 17:02:32.334693+05:30	/uploads/audio/1757935304345-epic1.mp3	1400.00	\N
be476b13-350a-432f-b374-c40ae407fe9d	shirt	sdasdasdasdasd	\N	\N	t	2025-09-17 13:06:20.767274+05:30	2025-09-17 13:06:20.767274+05:30	/uploads/audio/1758094580755-epic1.mp3	1500.00	\N
4dc7fd61-60c2-4731-bb49-6f7a961df48b	sdfsd	234234	\N	\N	t	2025-09-17 20:52:20.345543+05:30	2025-09-17 20:52:20.345543+05:30	\N	234234.00	\N
ebeb8d9f-7932-41bc-986a-02439b6f99df	Product	hello hello kohomada	\N	\N	t	2025-09-17 21:43:32.707479+05:30	2025-09-17 21:43:32.707479+05:30	/uploads/audio/1758125612691-epic1.mp3	1500.00	\N
e780e862-8478-4590-ad80-7a63f6b49fd0	card	sadasdas	\N	\N	t	2025-09-18 21:52:37.590954+05:30	2025-09-18 21:52:37.590954+05:30	/uploads/audio/1758212557585-epic1.mp3	520.00	\N
24d38e13-496c-4c2c-b5bd-d3317673bac3	asdas	wefdsfdfsdfsdfsd	\N	\N	t	2025-09-18 21:59:38.45773+05:30	2025-09-18 22:04:25.785397+05:30	/uploads/audio/1758212978451-epic1.mp3	23.00	\N
\.


--
-- TOC entry 5129 (class 0 OID 19237)
-- Dependencies: 298
-- Data for Name: stock_keeping_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_keeping_units (id, variant_id, size, stock_quantity) FROM stdin;
b9118a22-1229-4cfc-9f89-daff9f5ba330	cdf463cf-8cc4-4c3c-9600-e7041ab947a3	S	4
f1d59b95-e79c-4d1d-ad88-cb65ae8d8a97	cdf463cf-8cc4-4c3c-9600-e7041ab947a3	XS	5
c50735c5-ec89-46e8-9431-323334a7ac16	39df8589-9777-4ef2-b82c-55cfcc62783f	S	4
ad0c845c-6159-4920-adfa-eb0e2879f2b1	39df8589-9777-4ef2-b82c-55cfcc62783f	M	6
476c81cb-ca1f-4db7-b1ae-ef3ecaf97952	cdf463cf-8cc4-4c3c-9600-e7041ab947a3	M	8
0a978e41-7e6b-4724-9e42-5c5677629174	f464f332-df4d-4a8c-9a12-b766e421996d	L	6
770e4a7b-e8af-4397-8bf1-32bd4a8dc7dc	f464f332-df4d-4a8c-9a12-b766e421996d	M	4
6611596d-c3d2-440d-ad2c-3eb1569ec2dc	d6938d6b-2e79-4d79-a23a-47c630b6d685	S	1
2efad7e8-972d-4634-a732-3aac0ad87385	dd29df2c-488e-4553-9868-80cdfb9d6782	S	4
14caec80-329f-4b66-bd0c-f0fee59a02a1	f464f332-df4d-4a8c-9a12-b766e421996d	S	6
3425848d-e807-4460-a59a-f40c4c66c938	ba35d673-1710-4c3d-8d1e-9ce36885aef4	L	7
b4b37742-a369-42ef-8659-fc8035cd8900	8b0af6d4-50b5-480a-af9a-ba1c56e43aa3	S	6
2f2bfdb5-ec27-48a4-ae2f-4d750facd564	3fdec1d0-497f-4166-a105-b738c56dd622	L	0
7ce6a8a5-bb8d-49c9-b2c8-4073e84258c3	3fdec1d0-497f-4166-a105-b738c56dd622	M	4
563ba47a-831b-4013-8781-47baeb380351	3fdec1d0-497f-4166-a105-b738c56dd622	S	7
555b6471-4c08-49f2-867d-6927af455139	13b5e053-3166-40f0-9403-7d3a03734f87	XL	6
1afa74c5-d1a8-4b02-9f5d-ff9054632891	8b0af6d4-50b5-480a-af9a-ba1c56e43aa3	M	6
5a9b2e7d-84fe-4795-95a3-26e2917f208f	ba35d673-1710-4c3d-8d1e-9ce36885aef4	S	5
6c7332c9-ce97-4d21-961b-6f9198eb0e50	13b5e053-3166-40f0-9403-7d3a03734f87	S	7
774ec0e1-0279-463e-9659-00b62f03eac0	32d5badf-92b1-4cdc-89a5-d0b33bbb615b	S	31
3951f35a-cbb8-46ec-980f-029a106c4d54	2bd93401-5234-4550-9642-c7a6494563d1	S	50
acefbff3-20b5-4463-b408-eeaee073974e	a8a174f9-7968-4b0c-a181-497054a9beb3	S	6
1a3b35e7-f25d-46ab-84c6-e7af95a8a4a5	5ae6ccc5-334f-43ed-9846-a62b73c0d95f	S	9
a8d36c34-261f-4582-8be4-2ab948584cc8	4a7c9b8f-418f-44a4-8ee7-191f464875bf	S	2
b66de110-80b4-4875-9f7f-f3f1cf88de33	f46b0428-8759-4199-ab38-ef85affe2e41	S	0
\.


--
-- TOC entry 5125 (class 0 OID 19161)
-- Dependencies: 294
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, first_name, last_name, email, phone_number, password_hash, role, is_verified, created_at, updated_at) FROM stdin;
9e91947c-eb75-4829-bcf1-8a575c9f69fa	admin	test	admin@gmail.com	0112753029	$2b$10$9XFwSJOUf2cyrkgNPXU4wOGcRFc1e2jVlj8iadllldYVmC9cts9wK	ADMIN	f	2025-09-12 16:43:30.016663+05:30	2025-09-12 16:45:50.481676+05:30
722e9dc0-5b31-41b5-a791-2a8b46a2f062	Kotalawalage	Dasunvxccv	k.nipuna.dasun@gmail.com	0766604984	$2b$10$5oVY10cu1LXplN3u5IdN9etfbxu62MSZmXzb/vfO6pTXIEWHdbumC	USER	f	2025-09-12 16:40:54.536048+05:30	2025-09-17 21:48:31.369013+05:30
\.


--
-- TOC entry 5128 (class 0 OID 19207)
-- Dependencies: 297
-- Data for Name: variant_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variant_images (id, variant_id, image_url, alt_text, display_order) FROM stdin;
a79e5454-7692-4d90-99f3-447e77f09b03	3fdec1d0-497f-4166-a105-b738c56dd622	/uploads/products/1757702310180-blue.jpeg	test1 - blue	0
97b40209-4d85-4ef3-898a-f2538c8f5c6b	13b5e053-3166-40f0-9403-7d3a03734f87	/uploads/products/1757702310186-bs.jpg	test1 - White	0
1b2496e6-b08f-4fae-a958-41d6aa71b093	3fdec1d0-497f-4166-a105-b738c56dd622	/uploads/products/1757702385659-attachment_68225769.jpg	test1	0
732920ad-4cd0-4d15-8172-64a6991862d3	13b5e053-3166-40f0-9403-7d3a03734f87	/uploads/products/1757702385665-bs.webp	test1	0
1db3207c-ea72-4139-9cb3-af3f809b6124	dd29df2c-488e-4553-9868-80cdfb9d6782	/uploads/products/1757711321265-attachment_68225769.jpg	TEST2 - orane	0
84ce1380-2ec3-44ab-b81f-102e50840aa2	d6938d6b-2e79-4d79-a23a-47c630b6d685	/uploads/products/1757788618045-bs.webp	gfddf4 - bbb	0
d58e13d5-97c4-4b69-a025-2799161ff260	2bd93401-5234-4550-9642-c7a6494563d1	/uploads/products/1757790424184-blue.jpeg	gdfgdf - gdf	0
4b7389bf-e964-45b6-aeb9-aefeec849173	5ae6ccc5-334f-43ed-9846-a62b73c0d95f	/uploads/products/1757908754537-attachment_68225769.jpg	oragmge - 	0
fefc9084-6e36-49b5-b340-3e35cbb39175	a8a174f9-7968-4b0c-a181-497054a9beb3	/uploads/products/1757909099923-attachment_68225769.jpg	fgfdrg - 	0
bc819d6e-d86a-4886-92b6-37330e81f31e	cdf463cf-8cc4-4c3c-9600-e7041ab947a3	/uploads/products/1757935304367-attachment_68225769.jpg	Orange - Orange	0
b36001bb-b416-4a45-bc8f-bab85fe546a7	39df8589-9777-4ef2-b82c-55cfcc62783f	/uploads/products/1757935373826-bs.webp	Orange	0
6c41e6ae-dd90-4176-9c1f-20340a3e91e9	cdf463cf-8cc4-4c3c-9600-e7041ab947a3	/uploads/products/1757935517626-photo-1521572267360-ee0c2909d518.webp	Orange	0
1becc95a-81b9-4607-826f-530c50b110e6	39df8589-9777-4ef2-b82c-55cfcc62783f	/uploads/products/1757935517632-istockphoto-1393137501-612x612.jpg	Orange	0
1887716f-dac8-41d5-8d2d-b77f36402365	f464f332-df4d-4a8c-9a12-b766e421996d	/uploads/products/1758094580773-WhatsApp-Image-2025-09-17-at-12.05.27-PM.jpeg	shirt - Black	0
05326dd8-b02b-405a-80a7-424cc6e1f7a9	32d5badf-92b1-4cdc-89a5-d0b33bbb615b	/uploads/products/1758122540354-WhatsApp-Image-2025-09-17-at-8.50.12-PM.jpeg	sdfsd - Black	0
df0a06eb-ce8d-4805-be0b-d51d29ec82ce	ba35d673-1710-4c3d-8d1e-9ce36885aef4	/uploads/products/1758125612711-blue.jpeg	Product - Blue	0
c5d4ddfb-80bb-45a2-bf92-087cd283eb06	ba35d673-1710-4c3d-8d1e-9ce36885aef4	/uploads/products/1758125612716-WhatsApp-Image-2025-09-17-at-8.44.49-PM.jpeg	Product - Blue	0
d72ff439-1515-48fc-bedb-56aae5c17baf	8b0af6d4-50b5-480a-af9a-ba1c56e43aa3	/uploads/products/1758125612721-bs.webp	Product - Black	0
35157fba-c563-4047-8953-b6fee1403f9d	8b0af6d4-50b5-480a-af9a-ba1c56e43aa3	/uploads/products/1758125612724-WhatsApp-Image-2025-09-17-at-8.50.12-PM.jpeg	Product - Black	0
2f987f4e-3213-46fd-b4f9-34e9ce2d0c6c	4a7c9b8f-418f-44a4-8ee7-191f464875bf	/uploads/products/1758212557597-blue.jpeg	card - asddsa	0
4eb1d34d-1aa0-4f49-9378-6fd11cd5d4a7	f46b0428-8759-4199-ab38-ef85affe2e41	/uploads/products/1758212978463-attachment_68225769.jpg	asdas - Red	0
\.


--
-- TOC entry 4957 (class 2606 OID 19287)
-- Name: cart_items cart_items_cart_id_sku_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_sku_id_key UNIQUE (cart_id, sku_id);


--
-- TOC entry 4959 (class 2606 OID 19285)
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4951 (class 2606 OID 19268)
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- TOC entry 4953 (class 2606 OID 19270)
-- Name: carts carts_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_session_id_key UNIQUE (session_id);


--
-- TOC entry 4967 (class 2606 OID 19333)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4963 (class 2606 OID 19322)
-- Name: orders orders_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_payment_intent_id_key UNIQUE (payment_intent_id);


--
-- TOC entry 4965 (class 2606 OID 19320)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4939 (class 2606 OID 19198)
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- TOC entry 4941 (class 2606 OID 19200)
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- TOC entry 4936 (class 2606 OID 19190)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 4947 (class 2606 OID 19243)
-- Name: stock_keeping_units stock_keeping_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_keeping_units
    ADD CONSTRAINT stock_keeping_units_pkey PRIMARY KEY (id);


--
-- TOC entry 4949 (class 2606 OID 19254)
-- Name: stock_keeping_units stock_keeping_units_variant_id_size_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_keeping_units
    ADD CONSTRAINT stock_keeping_units_variant_id_size_key UNIQUE (variant_id, size);


--
-- TOC entry 4929 (class 2606 OID 19174)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4931 (class 2606 OID 19176)
-- Name: users users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);


--
-- TOC entry 4933 (class 2606 OID 19172)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4944 (class 2606 OID 19215)
-- Name: variant_images variant_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_images
    ADD CONSTRAINT variant_images_pkey PRIMARY KEY (id);


--
-- TOC entry 4960 (class 1259 OID 19298)
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- TOC entry 4954 (class 1259 OID 19276)
-- Name: idx_carts_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_carts_session_id ON public.carts USING btree (session_id);


--
-- TOC entry 4955 (class 1259 OID 19277)
-- Name: idx_carts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_carts_user_id ON public.carts USING btree (user_id);


--
-- TOC entry 4961 (class 1259 OID 19429)
-- Name: idx_orders_trading_card_url; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_trading_card_url ON public.orders USING btree (trading_card_url) WHERE (trading_card_url IS NOT NULL);


--
-- TOC entry 4937 (class 1259 OID 19206)
-- Name: idx_product_variants_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);


--
-- TOC entry 4934 (class 1259 OID 19191)
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- TOC entry 4945 (class 1259 OID 19251)
-- Name: idx_stock_keeping_units_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_keeping_units_variant_id ON public.stock_keeping_units USING btree (variant_id);


--
-- TOC entry 4927 (class 1259 OID 19177)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4942 (class 1259 OID 19221)
-- Name: idx_variant_images_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variant_images_variant_id ON public.variant_images USING btree (variant_id);


--
-- TOC entry 4979 (class 2620 OID 19252)
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4978 (class 2620 OID 19179)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4972 (class 2606 OID 19288)
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- TOC entry 4973 (class 2606 OID 19293)
-- Name: cart_items cart_items_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.stock_keeping_units(id) ON DELETE CASCADE;


--
-- TOC entry 4971 (class 2606 OID 19271)
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4975 (class 2606 OID 19334)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4976 (class 2606 OID 19339)
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- TOC entry 4977 (class 2606 OID 19344)
-- Name: order_items order_items_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.stock_keeping_units(id) ON DELETE SET NULL;


--
-- TOC entry 4974 (class 2606 OID 19323)
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4968 (class 2606 OID 19201)
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4970 (class 2606 OID 19246)
-- Name: stock_keeping_units stock_keeping_units_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_keeping_units
    ADD CONSTRAINT stock_keeping_units_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- TOC entry 4969 (class 2606 OID 19216)
-- Name: variant_images variant_images_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_images
    ADD CONSTRAINT variant_images_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


-- Completed on 2025-09-18 22:48:28

--
-- PostgreSQL database dump complete
--

