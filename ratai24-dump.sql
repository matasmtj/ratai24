--
-- PostgreSQL database dump
--

\restrict 0GdXtRyEegjbIj4tTMVSsXih7eexpeeMQvdiQT7Nrz7UCG0310TIF3r5SlB3KX6

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- CREATE SCHEMA public; (commented out for Supabase)


--
-- Name: BodyType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BodyType" AS ENUM (
    'SEDAN',
    'HATCHBACK',
    'SUV',
    'WAGON',
    'COUPE',
    'CONVERTIBLE',
    'VAN',
    'PICKUP',
    'MINIBUS_PASSENGER',
    'MINIBUS_CARGO'
);


--
-- Name: CarState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CarState" AS ENUM (
    'AVAILABLE',
    'LEASED',
    'MAINTENANCE'
);


--
-- Name: ContractState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContractState" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: FuelType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FuelType" AS ENUM (
    'PETROL',
    'DIESEL',
    'ELECTRIC',
    'HYBRID_HEV',
    'HYBRID_PHEV',
    'PETROL_LPG'
);


--
-- Name: Gearbox; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Gearbox" AS ENUM (
    'MANUAL',
    'AUTOMATIC'
);


--
-- Name: PartCondition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PartCondition" AS ENUM (
    'NEW',
    'USED',
    'DAMAGED'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'GUEST',
    'USER',
    'ADMIN'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Car; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Car" (
    id integer NOT NULL,
    vin text NOT NULL,
    "numberPlate" text NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    year integer NOT NULL,
    "pricePerDay" double precision NOT NULL,
    "cityId" integer NOT NULL,
    "seatCount" integer DEFAULT 5 NOT NULL,
    "fuelType" public."FuelType" NOT NULL,
    "powerKW" integer NOT NULL,
    "engineCapacityL" double precision,
    "bodyType" public."BodyType" NOT NULL,
    gearbox public."Gearbox" NOT NULL,
    state public."CarState" DEFAULT 'AVAILABLE'::public."CarState" NOT NULL,
    "odometerKm" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "availableForLease" boolean DEFAULT true NOT NULL,
    "availableForSale" boolean DEFAULT false NOT NULL,
    colour text,
    "salePrice" numeric(10,2),
    "saleDescription" text,
    "averageRevenuePerDay" double precision,
    "basePricePerDay" double precision,
    "dailyOperatingCost" double precision,
    "lastMaintenanceDate" timestamp(3) without time zone,
    "lastUtilizationUpdate" timestamp(3) without time zone,
    "maintenanceScore" double precision DEFAULT 100,
    "maxPricePerDay" double precision,
    "minPricePerDay" double precision,
    "monthlyFinancingCost" double precision,
    "nextMaintenanceKm" integer,
    "purchasePrice" double precision,
    "useDynamicPricing" boolean DEFAULT true NOT NULL,
    "utilizationRate" double precision DEFAULT 0,
    "applyUtilizationPricing" boolean DEFAULT true NOT NULL,
    "utilizationMultiplierOverride" double precision
);


--
-- Name: CarImage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CarImage" (
    id integer NOT NULL,
    "carId" integer NOT NULL,
    filename text NOT NULL,
    url text NOT NULL,
    "isMain" boolean DEFAULT false NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CarImage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CarImage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CarImage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CarImage_id_seq" OWNED BY public."CarImage".id;


--
-- Name: CarPrepBlock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CarPrepBlock" (
    id integer NOT NULL,
    "carId" integer NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CarPrepBlock_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CarPrepBlock_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CarPrepBlock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CarPrepBlock_id_seq" OWNED BY public."CarPrepBlock".id;


--
-- Name: Car_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Car_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Car_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Car_id_seq" OWNED BY public."Car".id;


--
-- Name: City; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."City" (
    id integer NOT NULL,
    name text NOT NULL,
    country text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CityDemandMetrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CityDemandMetrics" (
    id integer NOT NULL,
    "cityId" integer NOT NULL,
    "totalCars" integer NOT NULL,
    "availableCars" integer NOT NULL,
    "activeContracts" integer NOT NULL,
    "utilizationRate" double precision NOT NULL,
    "demandScore" double precision NOT NULL,
    "avgUtilization30d" double precision,
    "avgUtilization90d" double precision,
    "avgPriceMultiplier" double precision,
    "lastCalculated" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CityDemandMetrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CityDemandMetrics_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CityDemandMetrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CityDemandMetrics_id_seq" OWNED BY public."CityDemandMetrics".id;


--
-- Name: City_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."City_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: City_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."City_id_seq" OWNED BY public."City".id;


--
-- Name: Contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Contact" (
    id integer NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "businessHoursWeekdays" text DEFAULT '8:00 - 18:00'::text NOT NULL,
    "businessHoursWeekend" text DEFAULT '9:00 - 15:00'::text NOT NULL,
    "bankAccount" text,
    "companyCode" text,
    "companyEmail" text,
    "companyName" text,
    "mainAddress" text,
    "heroImageUrl" text
);


--
-- Name: ContactOperationArea; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContactOperationArea" (
    id integer NOT NULL,
    "contactId" integer NOT NULL,
    "cityId" integer NOT NULL,
    address text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ContactOperationArea_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ContactOperationArea_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ContactOperationArea_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ContactOperationArea_id_seq" OWNED BY public."ContactOperationArea".id;


--
-- Name: Contact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Contact_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Contact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Contact_id_seq" OWNED BY public."Contact".id;


--
-- Name: Contract; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Contract" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "carId" integer NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "totalPrice" double precision NOT NULL,
    state public."ContractState" DEFAULT 'ACTIVE'::public."ContractState" NOT NULL,
    "mileageStartKm" integer NOT NULL,
    "mileageEndKm" integer,
    "fuelLevelStartPct" integer NOT NULL,
    "fuelLevelEndPct" integer,
    "extraFees" double precision DEFAULT 0 NOT NULL,
    notes text,
    "appliedDiscount" double precision DEFAULT 0,
    "basePrice" double precision,
    "demandMultiplier" double precision,
    "durationDiscount" double precision,
    "dynamicPrice" double precision,
    "finalPrice" double precision,
    "pricingSnapshotId" integer,
    "seasonalMultiplier" double precision,
    "editLockedAt" timestamp(3) without time zone,
    "editLockedByUserId" integer,
    "depositConfirmed" boolean DEFAULT false NOT NULL
);


--
-- Name: Contract_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Contract_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Contract_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Contract_id_seq" OWNED BY public."Contract".id;


--
-- Name: LegalPageContent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LegalPageContent" (
    id integer NOT NULL,
    "pageKey" text NOT NULL,
    language text NOT NULL,
    content jsonb NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: LegalPageContent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."LegalPageContent_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: LegalPageContent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."LegalPageContent_id_seq" OWNED BY public."LegalPageContent".id;


--
-- Name: Part; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Part" (
    id integer NOT NULL,
    "partName" text NOT NULL,
    "oemNumber" text,
    make text NOT NULL,
    model text NOT NULL,
    year integer NOT NULL,
    colour text,
    "engineCapacityL" double precision,
    "powerKW" integer,
    "fuelType" public."FuelType",
    gearbox public."Gearbox",
    "bodyType" public."BodyType",
    description text,
    condition public."PartCondition" DEFAULT 'USED'::public."PartCondition" NOT NULL,
    price numeric(10,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PartImage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PartImage" (
    id integer NOT NULL,
    "partId" integer NOT NULL,
    filename text NOT NULL,
    url text NOT NULL,
    "isMain" boolean DEFAULT false NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PartImage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PartImage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PartImage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PartImage_id_seq" OWNED BY public."PartImage".id;


--
-- Name: Part_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Part_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Part_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Part_id_seq" OWNED BY public."Part".id;


--
-- Name: PasswordResetToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasswordResetToken" (
    id integer NOT NULL,
    "tokenHash" text NOT NULL,
    "userId" integer NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PasswordResetToken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PasswordResetToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PasswordResetToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PasswordResetToken_id_seq" OWNED BY public."PasswordResetToken".id;


--
-- Name: PricingRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PricingRule" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    "carId" integer,
    "cityId" integer,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "fixedPrice" double precision,
    multiplier double precision,
    "minPrice" double precision,
    "maxPrice" double precision,
    priority integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PricingRuleCar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PricingRuleCar" (
    "pricingRuleId" integer NOT NULL,
    "carId" integer NOT NULL
);


--
-- Name: PricingRule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PricingRule_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PricingRule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PricingRule_id_seq" OWNED BY public."PricingRule".id;


--
-- Name: PricingSnapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PricingSnapshot" (
    id integer NOT NULL,
    "carId" integer NOT NULL,
    "cityId" integer NOT NULL,
    "calculatedPrice" double precision NOT NULL,
    "basePrice" double precision NOT NULL,
    "demandMultiplier" double precision NOT NULL,
    "seasonalMultiplier" double precision NOT NULL,
    "utilizationMultiplier" double precision NOT NULL,
    "durationMultiplier" double precision NOT NULL,
    "customerMultiplier" double precision DEFAULT 1.0 NOT NULL,
    "finalPrice" double precision NOT NULL,
    "availableCars" integer NOT NULL,
    "activeContracts" integer NOT NULL,
    "requestDate" timestamp(3) without time zone NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    duration integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PricingSnapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PricingSnapshot_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PricingSnapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PricingSnapshot_id_seq" OWNED BY public."PricingSnapshot".id;


--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RefreshToken" (
    id integer NOT NULL,
    token text NOT NULL,
    "userId" integer NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RefreshToken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RefreshToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: RefreshToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RefreshToken_id_seq" OWNED BY public."RefreshToken".id;


--
-- Name: SeasonalFactor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SeasonalFactor" (
    id integer NOT NULL,
    name text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    multiplier double precision NOT NULL,
    "cityId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SeasonalFactor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."SeasonalFactor_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SeasonalFactor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."SeasonalFactor_id_seq" OWNED BY public."SeasonalFactor".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    "firstName" text,
    "lastName" text,
    "phoneNumber" text,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: Car id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Car" ALTER COLUMN id SET DEFAULT nextval('public."Car_id_seq"'::regclass);


--
-- Name: CarImage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CarImage" ALTER COLUMN id SET DEFAULT nextval('public."CarImage_id_seq"'::regclass);


--
-- Name: CarPrepBlock id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CarPrepBlock" ALTER COLUMN id SET DEFAULT nextval('public."CarPrepBlock_id_seq"'::regclass);


--
-- Name: City id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."City" ALTER COLUMN id SET DEFAULT nextval('public."City_id_seq"'::regclass);


--
-- Name: CityDemandMetrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CityDemandMetrics" ALTER COLUMN id SET DEFAULT nextval('public."CityDemandMetrics_id_seq"'::regclass);


--
-- Name: Contact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contact" ALTER COLUMN id SET DEFAULT nextval('public."Contact_id_seq"'::regclass);


--
-- Name: ContactOperationArea id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactOperationArea" ALTER COLUMN id SET DEFAULT nextval('public."ContactOperationArea_id_seq"'::regclass);


--
-- Name: Contract id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contract" ALTER COLUMN id SET DEFAULT nextval('public."Contract_id_seq"'::regclass);


--
-- Name: LegalPageContent id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LegalPageContent" ALTER COLUMN id SET DEFAULT nextval('public."LegalPageContent_id_seq"'::regclass);


--
-- Name: Part id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Part" ALTER COLUMN id SET DEFAULT nextval('public."Part_id_seq"'::regclass);


--
-- Name: PartImage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PartImage" ALTER COLUMN id SET DEFAULT nextval('public."PartImage_id_seq"'::regclass);


--
-- Name: PasswordResetToken id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken" ALTER COLUMN id SET DEFAULT nextval('public."PasswordResetToken_id_seq"'::regclass);


--
-- Name: PricingRule id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingRule" ALTER COLUMN id SET DEFAULT nextval('public."PricingRule_id_seq"'::regclass);


--
-- Name: PricingSnapshot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingSnapshot" ALTER COLUMN id SET DEFAULT nextval('public."PricingSnapshot_id_seq"'::regclass);


--
-- Name: RefreshToken id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RefreshToken" ALTER COLUMN id SET DEFAULT nextval('public."RefreshToken_id_seq"'::regclass);


--
-- Name: SeasonalFactor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SeasonalFactor" ALTER COLUMN id SET DEFAULT nextval('public."SeasonalFactor_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Data for Name: Car; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Car" (id, vin, "numberPlate", make, model, year, "pricePerDay", "cityId", "seatCount", "fuelType", "powerKW", "engineCapacityL", "bodyType", gearbox, state, "odometerKm", "createdAt", "updatedAt", "availableForLease", "availableForSale", colour, "salePrice", "saleDescription", "averageRevenuePerDay", "basePricePerDay", "dailyOperatingCost", "lastMaintenanceDate", "lastUtilizationUpdate", "maintenanceScore", "maxPricePerDay", "minPricePerDay", "monthlyFinancingCost", "nextMaintenanceKm", "purchasePrice", "useDynamicPricing", "utilizationRate", "applyUtilizationPricing", "utilizationMultiplierOverride") FROM stdin;
26	FTSZ8Z1KZ6W000999	GOL426	Ford	Tourneo Sport	2026	50	2	5	DIESEL	140	2.2	MINIBUS_PASSENGER	MANUAL	AVAILABLE	164000	2026-05-03 20:49:47.957	2026-05-03 20:49:47.957	t	t	\N	8950.00	SPORT komplektacija.	\N	\N	\N	\N	\N	100	\N	\N	\N	\N	\N	f	0	t	\N
12	WBADT43452G000888	BMW-320	BMW	320d	2019	35	1	5	DIESEL	140	2	SEDAN	AUTOMATIC	AVAILABLE	95000	2026-02-05 21:24:48.133	2026-04-14 19:08:14.853	f	t	Black	18500.00	BMW 320d in excellent mechanical condition. Efficient diesel engine, automatic transmission. Perfect for highway driving.	\N	\N	\N	\N	\N	100	\N	\N	\N	\N	\N	f	0	t	\N
23	PGJKR32E920123456	NGY875	Toyota	C-HR	2023	50	2	5	HYBRID_HEV	100	1.8	SEDAN	AUTOMATIC	AVAILABLE	29950	2026-04-25 11:45:56.007	2026-06-01 06:03:52.468	t	f	\N	\N	\N	\N	25	\N	\N	\N	100	45	20	\N	\N	\N	t	0	t	1.2
25	VWS786JK6BBJ35986	NGC589	Å koda	Superb	2016	50	1	5	PETROL	88	1.6	WAGON	AUTOMATIC	AVAILABLE	348399	2026-05-03 19:26:33.776	2026-06-01 06:04:13.999	t	t	\N	8750.00	Geras, puikiai tinkantis kasdieniniam naudojimui, automobilis. DefektÅ³ nÄ—ra, motoras dirba tvarkingai, automatas taip pat sklandÅ¾iai mÄ—to bÄ—gius. Nauja TA.	\N	43	\N	\N	\N	100	70	30	\N	\N	\N	t	0	f	\N
8	PGDBR32E920123459	LLE135	Audi	A6	2008	40	2	5	DIESEL	165	3	WAGON	AUTOMATIC	LEASED	222555	2026-01-06 08:00:16.852	2026-06-01 06:04:30.079	t	t	\N	3900.00	Gero stovio, kuriasi ir vaÅ¾iuoja.	\N	40	\N	\N	2026-04-20 18:24:18.318	100	100	24	\N	\N	\N	t	0.08888888888888889	f	\N
24	TSJ3E1EA7KF317444	EV1589	Tesla	Model S	2021	50	1	5	ELECTRIC	120	\N	SEDAN	AUTOMATIC	LEASED	58250	2026-04-25 14:32:03.889	2026-06-01 06:53:30.455	t	t	\N	18500.00	\N	\N	50	\N	\N	\N	100	125	30	\N	\N	\N	t	0	f	\N
22	5YJ3E1EA7KF317123	JKH206	Ford	Kuga	2015	50	3	5	PETROL	84	1.4	HATCHBACK	AUTOMATIC	AVAILABLE	238400	2026-04-13 16:03:59.247	2026-06-01 06:54:00.741	t	f	\N	\N	\N	\N	\N	\N	\N	2026-04-20 18:24:18.365	100	\N	\N	\N	\N	\N	t	0	t	\N
3	WVWZZZ1KZ6W000999	KKK-001	VW	Golf	2018	30	2	5	PETROL	75	1.4	HATCHBACK	MANUAL	AVAILABLE	82000	2025-12-28 22:37:07.842	2026-04-25 14:18:39.363	t	f	Blue	\N	\N	\N	\N	\N	\N	2026-04-20 18:24:18.272	100	\N	\N	\N	\N	\N	f	0.03333333333333333	f	\N
1	JTDBR32E920123456	ABC123	Toyota	Corolla	2020	35	1	5	PETROL	97	1.6	SEDAN	MANUAL	AVAILABLE	60100	2025-12-28 22:37:07.674	2026-04-25 14:18:45.235	t	f	Silver	16420.00	gud car	\N	\N	\N	\N	2026-04-20 18:24:18.201	100	\N	\N	\N	\N	\N	t	0.05555555555555555	t	\N
7	5YJ3E1EA7KF317001	AMGC63	Mercedes-Benz	C-Class	2011	115	2	5	PETROL	560	6.3	SEDAN	MANUAL	AVAILABLE	63100	2026-01-05 21:23:53.618	2026-04-25 14:19:03.125	t	f	\N	42000.00	\N	\N	100	\N	\N	2026-04-20 18:24:18.412	100	150	76	\N	\N	\N	t	0.1222222222222222	t	\N
\.


--
-- Data for Name: CarImage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CarImage" (id, "carId", filename, url, "isMain", "order", "createdAt") FROM stdin;
10	12	car-lease-images/bmw_320d_2019_12/pppcho3zfnxlkpmevqzw	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1770396846/car-lease-images/bmw_320d_2019_12/pppcho3zfnxlkpmevqzw.jpg	t	0	2026-02-06 16:54:07.82
20	24	car-lease-images/tesla_model-s_2021_24/ngbngf7q23ujx0pnlwam	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777127683/car-lease-images/tesla_model-s_2021_24/ngbngf7q23ujx0pnlwam.jpg	t	0	2026-04-25 14:34:44.686
29	26	car-lease-images/ford_tourneo-sport_2026_26/lcqfsj81guwlzcs2b8h4	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777841400/car-lease-images/ford_tourneo-sport_2026_26/lcqfsj81guwlzcs2b8h4.jpg	t	0	2026-05-03 20:50:01.166
16	23	car-lease-images/toyota_c-hr_2023_23/tpiikiuk4ela4ilrru2v	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777117581/car-lease-images/toyota_c-hr_2023_23/tpiikiuk4ela4ilrru2v.jpg	f	0	2026-04-25 11:46:22.364
18	23	car-lease-images/toyota_c-hr_2023_23/qbxuqt98xx5i6j7znzsi	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777117577/car-lease-images/toyota_c-hr_2023_23/qbxuqt98xx5i6j7znzsi.webp	f	0	2026-04-25 11:46:22.364
17	23	car-lease-images/toyota_c-hr_2023_23/fexejjqrssmgwagx0dpx	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777117582/car-lease-images/toyota_c-hr_2023_23/fexejjqrssmgwagx0dpx.jpg	t	0	2026-04-25 11:46:22.364
3	1	car-lease-images/toyota_corolla_2021_1/h358fmujdzgo8lbrpgnd	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1767534205/car-lease-images/toyota_corolla_2021_1/h358fmujdzgo8lbrpgnd.jpg	f	0	2026-01-04 13:43:26.429
1	1	car-lease-images/toyota_corolla_2021_1/n544wcyll7eie60utkjp	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1767513348/car-lease-images/toyota_corolla_2021_1/n544wcyll7eie60utkjp.jpg	t	1	2026-01-04 07:55:49.314
6	7	car-lease-images/mercedes-benz_c-class_2026_7/uhqrbgbzh08l8atvjpsh	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1767648242/car-lease-images/mercedes-benz_c-class_2026_7/uhqrbgbzh08l8atvjpsh.jpg	t	0	2026-01-05 21:24:03.051
7	7	car-lease-images/mercedes-benz_c-class_2026_7/qtcseoidj9lcaxugpmfh	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1767648242/car-lease-images/mercedes-benz_c-class_2026_7/qtcseoidj9lcaxugpmfh.jpg	f	0	2026-01-05 21:24:03.052
8	8	car-lease-images/audi_a6_2008_8/puw8wkowpnnuls7zm9qs	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1767686427/car-lease-images/audi_a6_2008_8/puw8wkowpnnuls7zm9qs.jpg	t	0	2026-01-06 08:00:28.168
9	8	car-lease-images/audi_a6_2008_8/xs53twb65wrsmbkegia7	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1767686427/car-lease-images/audi_a6_2008_8/xs53twb65wrsmbkegia7.jpg	f	0	2026-01-06 08:00:28.168
12	12	car-lease-images/bmw_320d_2019_12/grbjprgxbduvyeqm4ndi	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1770396846/car-lease-images/bmw_320d_2019_12/grbjprgxbduvyeqm4ndi.jpg	f	1	2026-02-06 16:54:07.821
5	3	car-lease-images/vw_golf_2018_3/oc1k3lm7qptjjj5tl8ms	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1767648090/car-lease-images/vw_golf_2018_3/oc1k3lm7qptjjj5tl8ms.jpg	f	0	2026-01-05 21:21:31.635
4	3	car-lease-images/vw_golf_2018_3/yod49vd5zvpjcf3dxxbc	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1767648083/car-lease-images/vw_golf_2018_3/yod49vd5zvpjcf3dxxbc.jpg	t	0	2026-01-05 21:21:24.49
22	24	car-lease-images/tesla_model-s_2021_24/c5weba9lizlwwjhicuuf	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777127683/car-lease-images/tesla_model-s_2021_24/c5weba9lizlwwjhicuuf.jpg	f	1	2026-04-25 14:34:44.686
25	25	car-lease-images/koda_superb_2016_25/truhh54hkoaoy70vrouk	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777836411/car-lease-images/koda_superb_2016_25/truhh54hkoaoy70vrouk.jpg	f	1	2026-05-03 19:26:52.471
28	26	car-lease-images/ford_tourneo-sport_2026_26/kz1umit2exen9f7jxv04	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777841400/car-lease-images/ford_tourneo-sport_2026_26/kz1umit2exen9f7jxv04.jpg	f	1	2026-05-03 20:50:01.165
24	25	car-lease-images/koda_superb_2016_25/nku86m7j6om6l4gcyop0	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777836411/car-lease-images/koda_superb_2016_25/nku86m7j6om6l4gcyop0.jpg	f	2	2026-05-03 19:26:52.47
26	25	car-lease-images/koda_superb_2016_25/oae3tn02mdrajjsibm4q	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777836411/car-lease-images/koda_superb_2016_25/oae3tn02mdrajjsibm4q.jpg	f	3	2026-05-03 19:26:52.471
19	24	car-lease-images/tesla_model-s_2021_24/sinakm9mi8jd3l9zekl2	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777127625/car-lease-images/tesla_model-s_2021_24/sinakm9mi8jd3l9zekl2.jpg	f	2	2026-04-25 14:33:46.151
21	24	car-lease-images/tesla_model-s_2021_24/vfxaqgrjpwkf36dsnsvy	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777127684/car-lease-images/tesla_model-s_2021_24/vfxaqgrjpwkf36dsnsvy.jpg	f	3	2026-04-25 14:34:44.686
23	25	car-lease-images/koda_superb_2016_25/vgzf5iu0cnrixxdfz5ji	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777836411/car-lease-images/koda_superb_2016_25/vgzf5iu0cnrixxdfz5ji.jpg	t	0	2026-05-03 19:26:52.47
15	22	car-lease-images/ford_kuga_2015_22/o0mhyv0m88ktj3mnbxgp	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1776098611/car-lease-images/ford_kuga_2015_22/o0mhyv0m88ktj3mnbxgp.jpg	f	0	2026-04-13 16:43:32.443
27	26	car-lease-images/ford_tourneo-sport_2026_26/pau41deim0cfta1tswn6	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777841400/car-lease-images/ford_tourneo-sport_2026_26/pau41deim0cfta1tswn6.jpg	f	2	2026-05-03 20:50:01.165
30	26	car-lease-images/ford_tourneo-sport_2026_26/i1h7t7fbqiar7nh0accq	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1777841400/car-lease-images/ford_tourneo-sport_2026_26/i1h7t7fbqiar7nh0accq.jpg	f	3	2026-05-03 20:50:01.166
11	12	car-lease-images/bmw_320d_2019_12/v6vzyk9wt85yhvnqzrgb	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1770396846/car-lease-images/bmw_320d_2019_12/v6vzyk9wt85yhvnqzrgb.jpg	f	2	2026-02-06 16:54:07.821
13	22	car-lease-images/ford_kuga_2015_22/r9drxswyuvcj02yrg5jw	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1776098611/car-lease-images/ford_kuga_2015_22/r9drxswyuvcj02yrg5jw.jpg	t	1	2026-04-13 16:43:32.443
\.


--
-- Data for Name: CarPrepBlock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CarPrepBlock" (id, "carId", "startDate", "endDate", "createdAt") FROM stdin;
1	25	2026-05-07 21:00:00	2026-05-08 21:00:00	2026-05-08 07:14:02.371
2	22	2026-05-22 21:00:00	2026-05-23 21:00:00	2026-06-01 06:04:04.256
\.


--
-- Data for Name: City; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."City" (id, name, country, "createdAt", "updatedAt") FROM stdin;
1	Vilnius	LT	2025-12-28 22:37:06.996	2025-12-28 22:37:06.996
2	Kaunas	LT	2025-12-28 22:37:07.422	2025-12-28 22:37:07.422
3	KlaipÄ—da	LT	2025-12-31 11:20:22.482	2025-12-31 11:20:22.482
4	Alytus	LT	2025-12-31 11:20:37.27	2025-12-31 11:20:37.27
\.


--
-- Data for Name: CityDemandMetrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CityDemandMetrics" (id, "cityId", "totalCars", "availableCars", "activeContracts", "utilizationRate", "demandScore", "avgUtilization30d", "avgUtilization90d", "avgPriceMultiplier", "lastCalculated", "updatedAt") FROM stdin;
2	1	3	2	1	0.3333333333333333	1.066666666666667	\N	\N	\N	2026-06-05 05:26:44.22	2026-06-05 05:26:44.221
1	2	5	5	0	0	0.8999999999999999	\N	\N	\N	2026-06-24 20:26:05.232	2026-06-24 20:26:05.233
4	4	0	0	0	0	0.8999999999999999	\N	\N	\N	2026-04-20 19:32:14.813	2026-04-20 19:32:14.814
3	3	1	1	0	0	0.8999999999999999	\N	\N	\N	2026-05-31 15:39:39.228	2026-05-31 15:39:39.228
\.


--
-- Data for Name: Contact; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Contact" (id, email, phone, "createdAt", "updatedAt", "businessHoursWeekdays", "businessHoursWeekend", "bankAccount", "companyCode", "companyEmail", "companyName", "mainAddress", "heroImageUrl") FROM stdin;
1	info@ratai24.com	+370 612 36767	2025-12-28 22:38:36.389	2026-06-10 14:58:44.856	8:00 - 18:00	9:00 - 15:30	LT1233456678999877	189562435	\N	UAB "Ratai"	RatÅ³ g. 20, Kaunas, Lietuva	\N
\.


--
-- Data for Name: ContactOperationArea; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ContactOperationArea" (id, "contactId", "cityId", address, "createdAt", "updatedAt") FROM stdin;
56	1	1	Konstitucijos pr. 201	2026-06-10 14:58:44.856	2026-06-10 14:58:44.856
57	1	2	BrukniÅ³ takas 18	2026-06-10 14:58:44.856	2026-06-10 14:58:44.856
58	1	3	Nemuno g. 52A	2026-06-10 14:58:44.856	2026-06-10 14:58:44.856
\.


--
-- Data for Name: Contract; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Contract" (id, "userId", "carId", "startDate", "endDate", "totalPrice", state, "mileageStartKm", "mileageEndKm", "fuelLevelStartPct", "fuelLevelEndPct", "extraFees", notes, "appliedDiscount", "basePrice", "demandMultiplier", "durationDiscount", "dynamicPrice", "finalPrice", "pricingSnapshotId", "seasonalMultiplier", "editLockedAt", "editLockedByUserId", "depositConfirmed") FROM stdin;
3	4	1	2026-02-11 03:00:00	2026-02-20 15:00:00	400	CANCELLED	61000	\N	100	\N	0	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
8	3	1	2026-02-03 07:00:00	2026-02-03 13:00:00	40	COMPLETED	61000	61010	100	90	15	.	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
7	4	3	2026-01-31 07:00:00	2026-01-31 08:00:00	30	COMPLETED	82000	82000	100	100	0	.	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
4	4	3	2026-01-30 07:00:00	2026-01-30 08:00:00	30	COMPLETED	82000	82000	100	100	1400	Front gg	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
2	3	3	2026-01-15 07:00:00	2026-01-29 07:00:00	420	COMPLETED	82000	82000	100	100	0	+	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
6	4	1	2026-01-27 07:00:00	2026-01-28 06:00:00	40	COMPLETED	61000	61000	100	100	0	+	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
1	2	1	2025-09-01 00:00:00	2025-09-05 00:00:00	140	COMPLETED	60000	60000	80	100	0	seed contract	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
5	4	1	2026-01-26 07:00:00	2026-01-26 08:00:00	40	CANCELLED	61000	\N	100	\N	0	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
10	4	7	2026-02-16 07:00:00	2026-02-16 10:00:00	115	COMPLETED	63000	63000	100	100	0	good	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
12	3	1	2026-02-15 07:00:00	2026-02-15 12:00:00	35	COMPLETED	60000	60000	100	100	0	+	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
14	4	1	2026-02-18 07:00:00	2026-02-19 07:00:00	35	COMPLETED	60000	60000	100	100	0	+	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
11	4	12	2026-02-15 03:00:00	2026-02-15 07:00:00	65	COMPLETED	95000	95000	100	100	0	oky	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
9	4	7	2026-02-14 07:00:00	2026-02-16 02:00:00	230	COMPLETED	63000	63000	100	100	0	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
26	7	1	2026-04-22 06:00:00	2026-04-24 06:00:00	69.46	CANCELLED	60100	\N	100	\N	0	\N	0.77	35	1.05	1	34.73	34.73	\N	1	\N	\N	f
18	4	3	2026-04-08 06:00:00	2026-04-10 06:00:00	60	CANCELLED	82000	\N	100	\N	0	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
17	4	1	2026-04-04 06:00:00	2026-04-04 09:00:00	35	COMPLETED	60000	60100	100	90	10	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
19	4	8	2026-04-10 06:00:00	2026-04-11 06:00:00	40	COMPLETED	222555	222555	100	100	0	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
16	7	8	2026-04-03 06:00:00	2026-04-09 06:00:00	240	COMPLETED	222555	222555	100	100	0	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
15	3	7	2026-04-02 06:00:00	2026-04-09 06:00:00	805	COMPLETED	63000	63000	100	100	0	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
42	8	24	2026-06-04 06:00:00	2026-06-12 06:00:00	688.96	ACTIVE	58250	\N	100	\N	0	\N	-72.24	50	1.05	0.95	78.29	86.12	\N	1.495	\N	\N	f
20	4	22	2026-04-14 06:00:00	2026-05-21 08:00:00	1900	COMPLETED	238400	238400	100	90	10	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
28	7	3	2026-04-18 06:00:00	2026-04-19 06:00:00	30	COMPLETED	82000	82000	100	100	0	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
22	4	3	2026-04-14 00:00:00	2026-04-14 16:00:00	30	CANCELLED	82000	\N	100	\N	0	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
21	4	8	2026-04-14 06:00:00	2026-04-14 09:00:00	40	COMPLETED	222555	222555	100	100	0	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
31	4	23	2026-05-01 06:00:00	2026-05-05 06:00:00	166.96	COMPLETED	29900	29900	100	100	0	\N	-66.96	25	1.05	0.98	36.06	41.74	\N	1.25	\N	\N	f
23	6	8	2026-04-15 07:00:00	2026-04-17 08:00:00	120	CANCELLED	222555	\N	100	\N	0	\N	12.48	40	1.05	0.98	35.01	35.01	\N	0.9	\N	\N	f
29	7	3	2026-04-20 06:00:00	2026-04-21 06:00:00	30	COMPLETED	82000	82000	100	100	30	Dirty car	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
27	7	7	2026-04-17 06:00:00	2026-04-17 10:00:00	131.23	COMPLETED	63000	63100	100	9	106	\N	-31.23	100	1.05	1	131.23	131.23	\N	1.3225	\N	\N	f
25	4	1	2026-04-17 06:00:00	2026-04-21 03:00:00	139.32	CANCELLED	60100	\N	100	\N	0	\N	0.49	35	1.05	0.98	34.83	34.83	\N	1.15	\N	\N	f
35	3	25	2026-05-05 06:00:00	2026-05-07 18:00:00	142.77	COMPLETED	348200	348860	100	100	6	\N	-10.67	43	1.016666666666667	0.98	47.59	47.59	\N	1.15	\N	\N	f
30	7	7	2026-04-22 06:00:00	2026-04-24 06:00:00	209.96	COMPLETED	63100	63100	100	100	0	\N	-4.98	100	1.05	1	104.98	104.98	\N	1.15	\N	\N	f
32	7	25	2026-05-03 20:00:00	2026-05-04 05:00:00	50.16	COMPLETED	348200	348200	100	50	50	Gerai	-16.65	43	1.05	1	50.16	50.16	\N	1.15	\N	\N	f
36	7	24	2026-05-07 06:00:00	2026-05-28 06:00:00	1032.57	CANCELLED	58250	\N	100	\N	0	\N	1.66	50	1.016666666666667	0.9	49.17	49.17	\N	1.15	\N	\N	f
33	8	25	2026-05-04 09:00:00	2026-05-05 06:00:00	51.79	CANCELLED	348200	\N	100	\N	0	\N	-20.44	43	1.05	1	51.79	51.79	\N	1.0925	\N	\N	f
44	4	23	2026-06-15 06:00:00	2026-06-15 11:00:00	37.4	DRAFT	29950	\N	100	\N	0	\N	-49.6	25	0.9500000000000001	1	37.4	37.4	\N	1.42025	\N	\N	f
41	8	22	2026-05-31 06:00:00	2026-06-03 06:00:00	167.73	DRAFT	238400	\N	100	\N	0	\N	-11.82	50	1.05	0.98	55.91	55.91	\N	1.15	\N	\N	f
34	8	3	2026-06-05 06:00:00	2026-06-27 06:00:00	660	CANCELLED	82000	\N	100	\N	0	Pavyzdin4 at6aukimui rezervacija	0	30	\N	\N	30	30	\N	\N	\N	\N	f
37	3	24	2026-05-29 09:00:00	2026-05-31 06:00:00	112.94	COMPLETED	58250	58250	100	90	10	\N	-12.94	50	1.016666666666667	1	56.47	56.47	\N	1.15	\N	\N	f
39	6	23	2026-05-13 06:00:00	2026-05-13 09:00:00	38.04	COMPLETED	29900	29950	100	50	50	\N	-52.16	25	1.05	1	38.04	38.04	\N	1.15	\N	\N	f
24	3	22	2026-05-22 06:00:00	2026-05-22 12:00:00	49.87	COMPLETED	238400	238400	100	100	0	\N	0.26	50	1.05	1	49.87	49.87	\N	1.0925	\N	\N	f
38	7	25	2026-05-08 06:00:00	2026-05-15 04:00:00	312.41	COMPLETED	348200	348399	100	100	0	\N	-3.79	43	1.016666666666667	0.95	44.63	44.63	\N	1.15	\N	\N	f
40	7	8	2026-05-28 06:00:00	2026-06-18 06:00:00	771.75	ACTIVE	222555	\N	100	\N	0	\N	8.13	40	0.9500000000000001	0.9	36.75	36.75	\N	1.15	\N	\N	f
43	4	23	2026-06-10 06:00:00	2026-06-11 06:00:00	39.37	CANCELLED	29950	\N	100	\N	0	\N	-57.48	25	0.9500000000000001	1	39.37	39.37	\N	1.495	\N	\N	f
\.


--
-- Data for Name: LegalPageContent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LegalPageContent" (id, "pageKey", language, content, "updatedAt") FROM stdin;
1	privacy-policy	lt	{"intro": "Å i privatumo politika paaiÅ¡kina, kaip \\"Ratai24\\" renka, naudoja ir saugo jÅ«sÅ³ asmens duomenis, kai naudojatÄ—s mÅ«sÅ³ svetaine, paskyra ir paslaugomis.", "sections": [{"title": "1. DuomenÅ³ valdytojas", "paragraphs": ["DuomenÅ³ valdytojas: Ratai24 (juridinio asmens rekvizitai gali bÅ«ti pateikti sutartyje). NorÄ—dami Ä¯gyvendinti savo teises, kreipkitÄ—s el. paÅ¡tu {email}."]}, {"title": "2. Renkami duomenys", "bullets": ["Paskyros duomenys: el. paÅ¡tas, slaptaÅ¾odis (uÅ¾Å¡ifruotas), vardas, pavardÄ—, telefono numeris.", "RezervacijÅ³ ir sutarÄiÅ³ duomenys: pasirinktas automobilis, nuomos laikotarpis, kainos, mokÄ—jimai, grÄ…Å¾inimo informacija.", "NarÅ¡ymo duomenys: IP adresas, narÅ¡yklÄ—s informacija, veiklos Å¾urnalai, slapukai ar panaÅ¡ios technologijos, reikalingos funkcionalumui ir analitikai.", "Komunikacijos duomenys: uÅ¾klausos, susiraÅ¡inÄ—jimas el. paÅ¡tu ar telefonu."]}, {"title": "3. DuomenÅ³ naudojimo tikslai", "bullets": ["Paskyros kÅ«rimui ir autentifikavimui.", "RezervacijÅ³ administravimui, sutarÄiÅ³ vykdymui ir klientÅ³ aptarnavimui.", "MokÄ—jimÅ³ administravimui, apskaitai ir teisiniÅ³ Ä¯sipareigojimÅ³ vykdymui.", "Saugumo uÅ¾tikrinimui, sukÄiavimo prevencijai ir paslaugÅ³ kokybei gerinti.", "Su jÅ«sÅ³ sutikimu - naujienlaiÅ¡kiams ar pasiÅ«lymams (galite bet kada atsisakyti)."]}, {"title": "4. Teisiniai pagrindai", "paragraphs": ["Duomenis tvarkome pagal BDAR 6 str.: sutarties vykdymas (nuoma, rezervacijos), teisinÄ— prievolÄ— (apskaita), teisÄ—tas interesas (svetainÄ—s saugumas, paslaugÅ³ tobulinimas), sutikimas (rinkodara, neprivalomi slapukai)."]}, {"title": "5. DuomenÅ³ saugojimas", "paragraphs": ["Duomenis saugome tik tiek, kiek reikia tikslams pasiekti: sutartiniai ir apskaitos duomenys - pagal teisÄ—s aktÅ³ reikalavimus; paskyros duomenys - kol naudojatÄ—s paslauga; slapukÅ³ duomenys - pagal jÅ³ galiojimo laikÄ…."]}, {"title": "6. DuomenÅ³ gavÄ—jai", "paragraphs": ["Duomenys gali bÅ«ti perduodami paslaugÅ³ teikÄ—jams (IT infrastruktÅ«ra, el. paÅ¡to paslaugos, mokÄ—jimÅ³ paslaugos), laikantis duomenÅ³ apsaugos reikalavimÅ³ ir tik tiek, kiek bÅ«tina funkcionalumui uÅ¾tikrinti. DuomenÅ³ neperduodame uÅ¾ ES/EEE ribÅ³, iÅ¡skyrus atvejus, kai taikomos BDAR numatytos apsaugos priemonÄ—s."]}, {"title": "7. JÅ«sÅ³ teisÄ—s", "bullets": ["Gauti informacijÄ… apie duomenÅ³ tvarkymÄ….", "SusipaÅ¾inti su savo duomenimis ir gauti jÅ³ kopijÄ….", "Reikalauti iÅ¡taisyti netikslius duomenis.", "Reikalauti iÅ¡trinti duomenis, kai jie nebereikalingi ar tvarkomi neteisÄ—tai.", "Apriboti duomenÅ³ tvarkymÄ… arba nesutikti su juo, kai tvarkoma teisÄ—tu interesu.", "Perkelti duomenis, kai tvarkoma automatizuotai pagal sutikimÄ… ar sutartÄ¯.", "Bet kada atÅ¡aukti sutikimÄ…, kai duomenys tvarkomi sutikimo pagrindu."], "paragraphs": ["Teises galite Ä¯gyvendinti susisiekÄ™ el. paÅ¡tu {email}. Jei manote, kad jÅ«sÅ³ teisÄ—s paÅ¾eistos, turite teisÄ™ kreiptis Ä¯ ValstybinÄ™ duomenÅ³ apsaugos inspekcijÄ…."]}, {"title": "8. Slapukai", "paragraphs": ["Naudojame bÅ«tinus slapukus svetainÄ—s veikimui ir analitinius slapukus paslaugÅ³ kokybei gerinti. Galite valdyti neprivalomus slapukus narÅ¡yklÄ—s nustatymuose. BÅ«tinÅ³ slapukÅ³ iÅ¡jungimas gali apriboti svetainÄ—s veikimÄ…."]}, {"title": "9. Saugumas", "paragraphs": ["Taikome technines ir organizacines priemones (Å¡ifravimas, prieigos kontrolÄ—, Å¾urnalai), siekdami apsaugoti duomenis nuo neteisÄ—tos prieigos, praradimo ar atskleidimo. Visada naudokite stiprÅ³ slaptaÅ¾odÄ¯ ir nesidalinkite prisijungimo duomenimis."]}, {"title": "10. Kontaktai ir atnaujinimai", "paragraphs": ["Kilus klausimÅ³ dÄ—l privatumo politikos ar duomenÅ³ tvarkymo, raÅ¡ykite el. paÅ¡tu {email}. Å i politika gali bÅ«ti atnaujinama; naujausia versija skelbiama Å¡iame puslapyje."]}]}	2026-06-10 13:27:24.532
2	privacy-policy	en	{"intro": "This Privacy Policy explains how \\"Ratai24\\" collects, uses, and protects your personal data when you use our website, account, and services.", "sections": [{"title": "1. Data controller", "paragraphs": ["Data controller: Ratai24 (legal entity details may be provided in the rental agreement). To exercise your rights, contact us at {email}."]}, {"title": "2. Data we collect", "bullets": ["Account data: email address, password (encrypted), first name, last name, phone number.", "Reservation and contract data: selected vehicle, rental period, prices, payments, return information.", "Browsing data: IP address, browser information, activity logs, cookies or similar technologies required for functionality and analytics.", "Communication data: inquiries and correspondence by email or phone."]}, {"title": "3. Purposes of data use", "bullets": ["Account creation and authentication.", "Reservation administration, contract performance, and customer support.", "Payment administration, accounting, and compliance with legal obligations.", "Security, fraud prevention, and service quality improvement.", "With your consent - newsletters or offers (you may opt out at any time)."]}, {"title": "4. Legal basis", "paragraphs": ["We process data under GDPR Article 6: contract performance (rental, reservations), legal obligation (accounting), legitimate interest (website security, service improvement), consent (marketing, non-essential cookies)."]}, {"title": "5. Data retention", "paragraphs": ["We retain personal data only as long as needed to achieve the purposes: contractual and accounting data - in accordance with legal requirements; account data - while you use the service; cookie data - according to cookie retention periods."]}, {"title": "6. Data recipients", "paragraphs": ["Data may be shared with service providers (IT infrastructure, email services, payment services) in compliance with data protection requirements and only to the extent necessary to provide functionality. We do not transfer data outside the EU/EEA unless GDPR safeguards are applied."]}, {"title": "7. Your rights", "bullets": ["To receive information about data processing.", "To access your personal data and obtain a copy.", "To request correction of inaccurate data.", "To request deletion where data is no longer needed or processed unlawfully.", "To restrict processing or object when processing is based on legitimate interest.", "To data portability where processing is automated based on consent or contract.", "To withdraw consent at any time where processing is based on consent."], "paragraphs": ["You can exercise these rights by contacting us at {email}. If you believe your rights are violated, you have the right to lodge a complaint with the State Data Protection Inspectorate."]}, {"title": "8. Cookies", "paragraphs": ["We use essential cookies for website operation and analytical cookies to improve service quality. You can manage non-essential cookies in your browser settings. Disabling essential cookies may limit website functionality."]}, {"title": "9. Security", "paragraphs": ["We apply technical and organizational measures (encryption, access control, logging) to protect data from unauthorized access, loss, or disclosure. Always use a strong password and do not share your login credentials."]}, {"title": "10. Contacts and updates", "paragraphs": ["If you have questions about this Privacy Policy or data processing, contact us at {email}. This policy may be updated; the latest version is published on this page."]}]}	2026-06-10 13:27:24.72
3	privacy-policy	ru	{"intro": "ÐÐ°ÑÑ‚Ð¾ÑÑ‰Ð°Ñ Ð¿Ð¾Ð»Ð¸Ñ‚Ð¸ÐºÐ° ÐºÐ¾Ð½Ñ„Ð¸Ð´ÐµÐ½Ñ†Ð¸Ð°Ð»ÑŒÐ½Ð¾ÑÑ‚Ð¸ Ð¾Ð±ÑŠÑÑÐ½ÑÐµÑ‚, ÐºÐ°Ðº \\"Ratai24\\" ÑÐ¾Ð±Ð¸Ñ€Ð°ÐµÑ‚, Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐµÑ‚ Ð¸ Ð·Ð°Ñ‰Ð¸Ñ‰Ð°ÐµÑ‚ Ð²Ð°ÑˆÐ¸ Ð¿ÐµÑ€ÑÐ¾Ð½Ð°Ð»ÑŒÐ½Ñ‹Ðµ Ð´Ð°Ð½Ð½Ñ‹Ðµ Ð¿Ñ€Ð¸ Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ð½Ð¸Ð¸ ÑÐ°Ð¹Ñ‚Ð°, Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚Ð° Ð¸ ÑƒÑÐ»ÑƒÐ³.", "sections": [{"title": "1. ÐžÐ¿ÐµÑ€Ð°Ñ‚Ð¾Ñ€ Ð´Ð°Ð½Ð½Ñ‹Ñ…", "paragraphs": ["ÐžÐ¿ÐµÑ€Ð°Ñ‚Ð¾Ñ€ Ð¿ÐµÑ€ÑÐ¾Ð½Ð°Ð»ÑŒÐ½Ñ‹Ñ… Ð´Ð°Ð½Ð½Ñ‹Ñ…: Ratai24 (Ñ€ÐµÐºÐ²Ð¸Ð·Ð¸Ñ‚Ñ‹ ÑŽÑ€Ð¸Ð´Ð¸Ñ‡ÐµÑÐºÐ¾Ð³Ð¾ Ð»Ð¸Ñ†Ð° Ð¼Ð¾Ð³ÑƒÑ‚ Ð±Ñ‹Ñ‚ÑŒ ÑƒÐºÐ°Ð·Ð°Ð½Ñ‹ Ð² Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ðµ Ð°Ñ€ÐµÐ½Ð´Ñ‹). Ð”Ð»Ñ Ñ€ÐµÐ°Ð»Ð¸Ð·Ð°Ñ†Ð¸Ð¸ Ð²Ð°ÑˆÐ¸Ñ… Ð¿Ñ€Ð°Ð² ÑÐ²ÑÐ¶Ð¸Ñ‚ÐµÑÑŒ Ñ Ð½Ð°Ð¼Ð¸ Ð¿Ð¾ Ð°Ð´Ñ€ÐµÑÑƒ {email}."]}, {"title": "2. ÐšÐ°ÐºÐ¸Ðµ Ð´Ð°Ð½Ð½Ñ‹Ðµ Ð¼Ñ‹ ÑÐ¾Ð±Ð¸Ñ€Ð°ÐµÐ¼", "bullets": ["Ð”Ð°Ð½Ð½Ñ‹Ðµ Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚Ð°: email, Ð¿Ð°Ñ€Ð¾Ð»ÑŒ (Ð² Ð·Ð°ÑˆÐ¸Ñ„Ñ€Ð¾Ð²Ð°Ð½Ð½Ð¾Ð¼ Ð²Ð¸Ð´Ðµ), Ð¸Ð¼Ñ, Ñ„Ð°Ð¼Ð¸Ð»Ð¸Ñ, Ð½Ð¾Ð¼ÐµÑ€ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ð°.", "Ð”Ð°Ð½Ð½Ñ‹Ðµ Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ñ Ð¸ Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ð°: Ð²Ñ‹Ð±Ñ€Ð°Ð½Ð½Ñ‹Ð¹ Ð°Ð²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»ÑŒ, Ð¿ÐµÑ€Ð¸Ð¾Ð´ Ð°Ñ€ÐµÐ½Ð´Ñ‹, ÑÑ‚Ð¾Ð¸Ð¼Ð¾ÑÑ‚ÑŒ, Ð¿Ð»Ð°Ñ‚ÐµÐ¶Ð¸, Ð¸Ð½Ñ„Ð¾Ñ€Ð¼Ð°Ñ†Ð¸Ñ Ð¾ Ð²Ð¾Ð·Ð²Ñ€Ð°Ñ‚Ðµ.", "Ð”Ð°Ð½Ð½Ñ‹Ðµ Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ð½Ð¸Ñ ÑÐ°Ð¹Ñ‚Ð°: IP-Ð°Ð´Ñ€ÐµÑ, Ð´Ð°Ð½Ð½Ñ‹Ðµ Ð±Ñ€Ð°ÑƒÐ·ÐµÑ€Ð°, Ð¶ÑƒÑ€Ð½Ð°Ð»Ñ‹ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ð¸, cookie Ð¸ Ð¿Ð¾Ñ…Ð¾Ð¶Ð¸Ðµ Ñ‚ÐµÑ…Ð½Ð¾Ð»Ð¾Ð³Ð¸Ð¸ Ð´Ð»Ñ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹ Ð¸ Ð°Ð½Ð°Ð»Ð¸Ñ‚Ð¸ÐºÐ¸.", "ÐšÐ¾Ð¼Ð¼ÑƒÐ½Ð¸ÐºÐ°Ñ†Ð¸Ð¾Ð½Ð½Ñ‹Ðµ Ð´Ð°Ð½Ð½Ñ‹Ðµ: Ð·Ð°Ð¿Ñ€Ð¾ÑÑ‹ Ð¸ Ð¿ÐµÑ€ÐµÐ¿Ð¸ÑÐºÐ° Ð¿Ð¾ email Ð¸Ð»Ð¸ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ñƒ."]}, {"title": "3. Ð¦ÐµÐ»Ð¸ Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ¸ Ð´Ð°Ð½Ð½Ñ‹Ñ…", "bullets": ["Ð¡Ð¾Ð·Ð´Ð°Ð½Ð¸Ðµ Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚Ð° Ð¸ Ð°ÑƒÑ‚ÐµÐ½Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ†Ð¸Ñ.", "ÐÐ´Ð¼Ð¸Ð½Ð¸ÑÑ‚Ñ€Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ðµ Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ð¹, Ð¸ÑÐ¿Ð¾Ð»Ð½ÐµÐ½Ð¸Ðµ Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ð° Ð¸ Ð¿Ð¾Ð´Ð´ÐµÑ€Ð¶ÐºÐ° ÐºÐ»Ð¸ÐµÐ½Ñ‚Ð¾Ð².", "ÐÐ´Ð¼Ð¸Ð½Ð¸ÑÑ‚Ñ€Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ðµ Ð¿Ð»Ð°Ñ‚ÐµÐ¶ÐµÐ¹, Ð±ÑƒÑ…Ð³Ð°Ð»Ñ‚ÐµÑ€ÑÐºÐ¸Ð¹ ÑƒÑ‡ÐµÑ‚ Ð¸ Ð¸ÑÐ¿Ð¾Ð»Ð½ÐµÐ½Ð¸Ðµ Ð¿Ñ€Ð°Ð²Ð¾Ð²Ñ‹Ñ… Ð¾Ð±ÑÐ·Ð°Ñ‚ÐµÐ»ÑŒÑÑ‚Ð².", "ÐžÐ±ÐµÑÐ¿ÐµÑ‡ÐµÐ½Ð¸Ðµ Ð±ÐµÐ·Ð¾Ð¿Ð°ÑÐ½Ð¾ÑÑ‚Ð¸, Ð¿Ñ€ÐµÐ´Ð¾Ñ‚Ð²Ñ€Ð°Ñ‰ÐµÐ½Ð¸Ðµ Ð¼Ð¾ÑˆÐµÐ½Ð½Ð¸Ñ‡ÐµÑÑ‚Ð²Ð° Ð¸ ÑƒÐ»ÑƒÑ‡ÑˆÐµÐ½Ð¸Ðµ ÐºÐ°Ñ‡ÐµÑÑ‚Ð²Ð° ÑƒÑÐ»ÑƒÐ³.", "ÐŸÐ¾ Ð²Ð°ÑˆÐµÐ¼Ñƒ ÑÐ¾Ð³Ð»Ð°ÑÐ¸ÑŽ - Ñ€Ð°ÑÑÑ‹Ð»ÐºÐ¸ Ð¸ Ð¿Ñ€ÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ (Ð¾Ñ‚Ð¿Ð¸ÑÐ°Ñ‚ÑŒÑÑ Ð¼Ð¾Ð¶Ð½Ð¾ Ð² Ð»ÑŽÐ±Ð¾Ðµ Ð²Ñ€ÐµÐ¼Ñ)."]}, {"title": "4. ÐŸÑ€Ð°Ð²Ð¾Ð²Ñ‹Ðµ Ð¾ÑÐ½Ð¾Ð²Ð°Ð½Ð¸Ñ", "paragraphs": ["ÐœÑ‹ Ð¾Ð±Ñ€Ð°Ð±Ð°Ñ‚Ñ‹Ð²Ð°ÐµÐ¼ Ð´Ð°Ð½Ð½Ñ‹Ðµ Ð² ÑÐ¾Ð¾Ñ‚Ð²ÐµÑ‚ÑÑ‚Ð²Ð¸Ð¸ ÑÐ¾ ÑÑ‚. 6 GDPR: Ð¸ÑÐ¿Ð¾Ð»Ð½ÐµÐ½Ð¸Ðµ Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ð° (Ð°Ñ€ÐµÐ½Ð´Ð°, Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ñ), Ð¿Ñ€Ð°Ð²Ð¾Ð²Ð°Ñ Ð¾Ð±ÑÐ·Ð°Ð½Ð½Ð¾ÑÑ‚ÑŒ (Ð±ÑƒÑ…Ð³Ð°Ð»Ñ‚ÐµÑ€Ð¸Ñ), Ð·Ð°ÐºÐ¾Ð½Ð½Ñ‹Ð¹ Ð¸Ð½Ñ‚ÐµÑ€ÐµÑ (Ð±ÐµÐ·Ð¾Ð¿Ð°ÑÐ½Ð¾ÑÑ‚ÑŒ ÑÐ°Ð¹Ñ‚Ð°, ÑƒÐ»ÑƒÑ‡ÑˆÐµÐ½Ð¸Ðµ ÑÐµÑ€Ð²Ð¸ÑÐ°), ÑÐ¾Ð³Ð»Ð°ÑÐ¸Ðµ (Ð¼Ð°Ñ€ÐºÐµÑ‚Ð¸Ð½Ð³, Ð½ÐµÐ¾Ð±ÑÐ·Ð°Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ðµ cookie)."]}, {"title": "5. Ð¡Ñ€Ð¾ÐºÐ¸ Ñ…Ñ€Ð°Ð½ÐµÐ½Ð¸Ñ Ð´Ð°Ð½Ð½Ñ‹Ñ…", "paragraphs": ["ÐœÑ‹ Ñ…Ñ€Ð°Ð½Ð¸Ð¼ Ð´Ð°Ð½Ð½Ñ‹Ðµ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ ÑÑ‚Ð¾Ð»ÑŒÐºÐ¾, ÑÐºÐ¾Ð»ÑŒÐºÐ¾ Ð½ÐµÐ¾Ð±Ñ…Ð¾Ð´Ð¸Ð¼Ð¾ Ð´Ð»Ñ Ð´Ð¾ÑÑ‚Ð¸Ð¶ÐµÐ½Ð¸Ñ Ñ†ÐµÐ»ÐµÐ¹: Ð´Ð°Ð½Ð½Ñ‹Ðµ Ð¿Ð¾ Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ð°Ð¼ Ð¸ Ð±ÑƒÑ…Ð³Ð°Ð»Ñ‚ÐµÑ€Ð¸Ð¸ - ÑÐ¾Ð³Ð»Ð°ÑÐ½Ð¾ Ñ‚Ñ€ÐµÐ±Ð¾Ð²Ð°Ð½Ð¸ÑÐ¼ Ð·Ð°ÐºÐ¾Ð½Ð¾Ð´Ð°Ñ‚ÐµÐ»ÑŒÑÑ‚Ð²Ð°; Ð´Ð°Ð½Ð½Ñ‹Ðµ Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚Ð° - Ð¿Ð¾ÐºÐ° Ð²Ñ‹ Ð¿Ð¾Ð»ÑŒÐ·ÑƒÐµÑ‚ÐµÑÑŒ ÑÐµÑ€Ð²Ð¸ÑÐ¾Ð¼; Ð´Ð°Ð½Ð½Ñ‹Ðµ cookie - Ð² Ñ€Ð°Ð¼ÐºÐ°Ñ… ÑÑ€Ð¾ÐºÐ° Ð¸Ñ… Ð´ÐµÐ¹ÑÑ‚Ð²Ð¸Ñ."]}, {"title": "6. ÐŸÐ¾Ð»ÑƒÑ‡Ð°Ñ‚ÐµÐ»Ð¸ Ð´Ð°Ð½Ð½Ñ‹Ñ…", "paragraphs": ["Ð”Ð°Ð½Ð½Ñ‹Ðµ Ð¼Ð¾Ð³ÑƒÑ‚ Ð¿ÐµÑ€ÐµÐ´Ð°Ð²Ð°Ñ‚ÑŒÑÑ Ð¿Ð¾ÑÑ‚Ð°Ð²Ñ‰Ð¸ÐºÐ°Ð¼ ÑƒÑÐ»ÑƒÐ³ (IT-Ð¸Ð½Ñ„Ñ€Ð°ÑÑ‚Ñ€ÑƒÐºÑ‚ÑƒÑ€Ð°, email-ÑÐµÑ€Ð²Ð¸ÑÑ‹, Ð¿Ð»Ð°Ñ‚ÐµÐ¶Ð½Ñ‹Ðµ ÑÐµÑ€Ð²Ð¸ÑÑ‹) Ð¿Ñ€Ð¸ ÑÐ¾Ð±Ð»ÑŽÐ´ÐµÐ½Ð¸Ð¸ Ñ‚Ñ€ÐµÐ±Ð¾Ð²Ð°Ð½Ð¸Ð¹ Ð¿Ð¾ Ð·Ð°Ñ‰Ð¸Ñ‚Ðµ Ð´Ð°Ð½Ð½Ñ‹Ñ… Ð¸ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð² Ð½ÐµÐ¾Ð±Ñ…Ð¾Ð´Ð¸Ð¼Ð¾Ð¼ Ð´Ð»Ñ Ñ„ÑƒÐ½ÐºÑ†Ð¸Ð¾Ð½Ð°Ð»ÑŒÐ½Ð¾ÑÑ‚Ð¸ Ð¾Ð±ÑŠÐµÐ¼Ðµ. ÐœÑ‹ Ð½Ðµ Ð¿ÐµÑ€ÐµÐ´Ð°ÐµÐ¼ Ð´Ð°Ð½Ð½Ñ‹Ðµ Ð·Ð° Ð¿Ñ€ÐµÐ´ÐµÐ»Ñ‹ Ð•Ð¡/Ð•Ð­Ð—, ÐµÑÐ»Ð¸ Ð½Ðµ Ð¿Ñ€Ð¸Ð¼ÐµÐ½ÑÑŽÑ‚ÑÑ Ð¿Ñ€ÐµÐ´ÑƒÑÐ¼Ð¾Ñ‚Ñ€ÐµÐ½Ð½Ñ‹Ðµ GDPR Ð¼ÐµÑ€Ñ‹ Ð·Ð°Ñ‰Ð¸Ñ‚Ñ‹."]}, {"title": "7. Ð’Ð°ÑˆÐ¸ Ð¿Ñ€Ð°Ð²Ð°", "bullets": ["ÐŸÐ¾Ð»ÑƒÑ‡Ð°Ñ‚ÑŒ Ð¸Ð½Ñ„Ð¾Ñ€Ð¼Ð°Ñ†Ð¸ÑŽ Ð¾Ð± Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐµ Ð´Ð°Ð½Ð½Ñ‹Ñ….", "ÐŸÐ¾Ð»ÑƒÑ‡Ð¸Ñ‚ÑŒ Ð´Ð¾ÑÑ‚ÑƒÐ¿ Ðº ÑÐ²Ð¾Ð¸Ð¼ Ð´Ð°Ð½Ð½Ñ‹Ð¼ Ð¸ ÐºÐ¾Ð¿Ð¸ÑŽ Ð´Ð°Ð½Ð½Ñ‹Ñ….", "Ð¢Ñ€ÐµÐ±Ð¾Ð²Ð°Ñ‚ÑŒ Ð¸ÑÐ¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¸Ñ Ð½ÐµÑ‚Ð¾Ñ‡Ð½Ñ‹Ñ… Ð´Ð°Ð½Ð½Ñ‹Ñ….", "Ð¢Ñ€ÐµÐ±Ð¾Ð²Ð°Ñ‚ÑŒ ÑƒÐ´Ð°Ð»ÐµÐ½Ð¸Ñ Ð´Ð°Ð½Ð½Ñ‹Ñ…, ÐµÑÐ»Ð¸ Ð¾Ð½Ð¸ Ð±Ð¾Ð»ÑŒÑˆÐµ Ð½Ðµ Ð½ÑƒÐ¶Ð½Ñ‹ Ð¸Ð»Ð¸ Ð¾Ð±Ñ€Ð°Ð±Ð°Ñ‚Ñ‹Ð²Ð°ÑŽÑ‚ÑÑ Ð½ÐµÐ·Ð°ÐºÐ¾Ð½Ð½Ð¾.", "ÐžÐ³Ñ€Ð°Ð½Ð¸Ñ‡Ð¸Ñ‚ÑŒ Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÑƒ Ð¸Ð»Ð¸ Ð²Ð¾Ð·Ñ€Ð°Ð·Ð¸Ñ‚ÑŒ Ð¿Ñ€Ð¾Ñ‚Ð¸Ð² Ð½ÐµÐµ, ÐºÐ¾Ð³Ð´Ð° Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ° Ð¾ÑÐ½Ð¾Ð²Ð°Ð½Ð° Ð½Ð° Ð·Ð°ÐºÐ¾Ð½Ð½Ñ‹Ñ… Ð¸Ð½Ñ‚ÐµÑ€ÐµÑÐ°Ñ….", "ÐŸÐ¾Ð»ÑƒÑ‡Ð¸Ñ‚ÑŒ Ð´Ð°Ð½Ð½Ñ‹Ðµ Ð´Ð»Ñ Ð¿ÐµÑ€ÐµÐ½Ð¾ÑÐ°, ÐºÐ¾Ð³Ð´Ð° Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ° Ð²ÐµÐ´ÐµÑ‚ÑÑ Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ð·Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð½Ð¾ Ð½Ð° Ð¾ÑÐ½Ð¾Ð²Ðµ ÑÐ¾Ð³Ð»Ð°ÑÐ¸Ñ Ð¸Ð»Ð¸ Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ð°.", "ÐžÑ‚Ð¾Ð·Ð²Ð°Ñ‚ÑŒ ÑÐ¾Ð³Ð»Ð°ÑÐ¸Ðµ Ð² Ð»ÑŽÐ±Ð¾Ðµ Ð²Ñ€ÐµÐ¼Ñ, ÐµÑÐ»Ð¸ Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ° Ð¾ÑÐ½Ð¾Ð²Ð°Ð½Ð° Ð½Ð° ÑÐ¾Ð³Ð»Ð°ÑÐ¸Ð¸."], "paragraphs": ["Ð’Ñ‹ Ð¼Ð¾Ð¶ÐµÑ‚Ðµ Ñ€ÐµÐ°Ð»Ð¸Ð·Ð¾Ð²Ð°Ñ‚ÑŒ ÑÑ‚Ð¸ Ð¿Ñ€Ð°Ð²Ð°, Ð½Ð°Ð¿Ð¸ÑÐ°Ð² Ð½Ð°Ð¼ Ð½Ð° {email}. Ð•ÑÐ»Ð¸ Ð²Ñ‹ ÑÑ‡Ð¸Ñ‚Ð°ÐµÑ‚Ðµ, Ñ‡Ñ‚Ð¾ Ð²Ð°ÑˆÐ¸ Ð¿Ñ€Ð°Ð²Ð° Ð½Ð°Ñ€ÑƒÑˆÐµÐ½Ñ‹, Ð²Ñ‹ Ð²Ð¿Ñ€Ð°Ð²Ðµ Ð¾Ð±Ñ€Ð°Ñ‚Ð¸Ñ‚ÑŒÑÑ Ð² Ð“Ð¾ÑÑƒÐ´Ð°Ñ€ÑÑ‚Ð²ÐµÐ½Ð½ÑƒÑŽ Ð¸Ð½ÑÐ¿ÐµÐºÑ†Ð¸ÑŽ Ð¿Ð¾ Ð·Ð°Ñ‰Ð¸Ñ‚Ðµ Ð´Ð°Ð½Ð½Ñ‹Ñ…."]}, {"title": "8. Cookie", "paragraphs": ["ÐœÑ‹ Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐµÐ¼ Ð¾Ð±ÑÐ·Ð°Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ðµ cookie Ð´Ð»Ñ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹ ÑÐ°Ð¹Ñ‚Ð° Ð¸ Ð°Ð½Ð°Ð»Ð¸Ñ‚Ð¸Ñ‡ÐµÑÐºÐ¸Ðµ cookie Ð´Ð»Ñ ÑƒÐ»ÑƒÑ‡ÑˆÐµÐ½Ð¸Ñ ÐºÐ°Ñ‡ÐµÑÑ‚Ð²Ð° ÑÐµÑ€Ð²Ð¸ÑÐ°. ÐÐµÐ¾Ð±ÑÐ·Ð°Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ðµ cookie Ð¼Ð¾Ð¶Ð½Ð¾ Ð½Ð°ÑÑ‚Ñ€Ð¾Ð¸Ñ‚ÑŒ Ð² Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð°Ñ… Ð±Ñ€Ð°ÑƒÐ·ÐµÑ€Ð°. ÐžÑ‚ÐºÐ»ÑŽÑ‡ÐµÐ½Ð¸Ðµ Ð¾Ð±ÑÐ·Ð°Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ñ… cookie Ð¼Ð¾Ð¶ÐµÑ‚ Ð¾Ð³Ñ€Ð°Ð½Ð¸Ñ‡Ð¸Ñ‚ÑŒ Ñ€Ð°Ð±Ð¾Ñ‚Ñƒ ÑÐ°Ð¹Ñ‚Ð°."]}, {"title": "9. Ð‘ÐµÐ·Ð¾Ð¿Ð°ÑÐ½Ð¾ÑÑ‚ÑŒ", "paragraphs": ["ÐœÑ‹ Ð¿Ñ€Ð¸Ð¼ÐµÐ½ÑÐµÐ¼ Ñ‚ÐµÑ…Ð½Ð¸Ñ‡ÐµÑÐºÐ¸Ðµ Ð¸ Ð¾Ñ€Ð³Ð°Ð½Ð¸Ð·Ð°Ñ†Ð¸Ð¾Ð½Ð½Ñ‹Ðµ Ð¼ÐµÑ€Ñ‹ (ÑˆÐ¸Ñ„Ñ€Ð¾Ð²Ð°Ð½Ð¸Ðµ, ÐºÐ¾Ð½Ñ‚Ñ€Ð¾Ð»ÑŒ Ð´Ð¾ÑÑ‚ÑƒÐ¿Ð°, Ð¶ÑƒÑ€Ð½Ð°Ð»Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ðµ), Ñ‡Ñ‚Ð¾Ð±Ñ‹ Ð·Ð°Ñ‰Ð¸Ñ‚Ð¸Ñ‚ÑŒ Ð´Ð°Ð½Ð½Ñ‹Ðµ Ð¾Ñ‚ Ð½ÐµÑÐ°Ð½ÐºÑ†Ð¸Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð½Ð¾Ð³Ð¾ Ð´Ð¾ÑÑ‚ÑƒÐ¿Ð°, ÑƒÑ‚Ñ€Ð°Ñ‚Ñ‹ Ð¸Ð»Ð¸ Ñ€Ð°Ð·Ð³Ð»Ð°ÑˆÐµÐ½Ð¸Ñ. Ð˜ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐ¹Ñ‚Ðµ Ð½Ð°Ð´ÐµÐ¶Ð½Ñ‹Ð¹ Ð¿Ð°Ñ€Ð¾Ð»ÑŒ Ð¸ Ð½Ðµ Ð¿ÐµÑ€ÐµÐ´Ð°Ð²Ð°Ð¹Ñ‚Ðµ Ð´Ð°Ð½Ð½Ñ‹Ðµ Ð´Ð»Ñ Ð²Ñ…Ð¾Ð´Ð° Ñ‚Ñ€ÐµÑ‚ÑŒÐ¸Ð¼ Ð»Ð¸Ñ†Ð°Ð¼."]}, {"title": "10. ÐšÐ¾Ð½Ñ‚Ð°ÐºÑ‚Ñ‹ Ð¸ Ð¾Ð±Ð½Ð¾Ð²Ð»ÐµÐ½Ð¸Ñ", "paragraphs": ["ÐŸÐ¾ Ð²Ð¾Ð¿Ñ€Ð¾ÑÐ°Ð¼ Ð¿Ð¾Ð»Ð¸Ñ‚Ð¸ÐºÐ¸ ÐºÐ¾Ð½Ñ„Ð¸Ð´ÐµÐ½Ñ†Ð¸Ð°Ð»ÑŒÐ½Ð¾ÑÑ‚Ð¸ Ð¸ Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ¸ Ð´Ð°Ð½Ð½Ñ‹Ñ… ÑÐ²ÑÐ¶Ð¸Ñ‚ÐµÑÑŒ Ñ Ð½Ð°Ð¼Ð¸: {email}. ÐŸÐ¾Ð»Ð¸Ñ‚Ð¸ÐºÐ° Ð¼Ð¾Ð¶ÐµÑ‚ Ð¾Ð±Ð½Ð¾Ð²Ð»ÑÑ‚ÑŒÑÑ; Ð°ÐºÑ‚ÑƒÐ°Ð»ÑŒÐ½Ð°Ñ Ð²ÐµÑ€ÑÐ¸Ñ Ð¿ÑƒÐ±Ð»Ð¸ÐºÑƒÐµÑ‚ÑÑ Ð½Ð° ÑÑ‚Ð¾Ð¹ ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ðµ."]}]}	2026-06-10 13:27:24.838
4	rental-terms	lt	{"note": "Pastaba: konkreÄios kainos, nuolaidos ir papildomos paslaugos gali bÅ«ti nustatomos individualioje sutartyje ar uÅ¾sakyme.", "intro": "Å ios sÄ…lygos taikomos rezervuojant ir nuomojant automobilius per Ratai24.", "sections": [{"title": "1. Rezervacija", "bullets": ["AutomobilÄ¯ galite rezervuoti internetu, telefonu ar el. paÅ¡tu.", "Rezervacijai patvirtinti gali bÅ«ti imamas 50 Eur avansas; jis Ä¯skaiÄiuojamas Ä¯ nuomos kainÄ… ir negrÄ…Å¾inamas, jei neatvykstama ar atÅ¡aukiama po patvirtinimo.", "Galutinis uÅ¾sakymo patvirtinimas laikomas sudaryta nuomos sutartimi."]}, {"title": "2. Dokumentai", "bullets": ["Privalomi: galiojantis vairuotojo paÅ¾ymÄ—jimas ir asmens tapatybÄ—s dokumentas (pasas arba asmens tapatybÄ—s kortelÄ—).", "Minimalus vairavimo staÅ¾as â€“ 2 metai. Jaunesni ar maÅ¾esnÄ¯ staÅ¾Ä… turintys vairuotojai gali bÅ«ti nepriimami arba taikomas papildomas mokestis."]}, {"title": "3. ApmokÄ—jimas ir uÅ¾statas", "bullets": ["Nuoma apmokama pavedimu iki automobilio pasiÄ—mimo arba kortele atsiimant.", "UÅ¾statas: 800 Eur (standartinÄ— atsakomybÄ—), 400 Eur arba 0 Eur â€“ priklausomai nuo pasirinkto draudimo paketo.", "Pasirinkus 0 Eur franÅ¡izÄ™, uÅ¾statas gali bÅ«ti nerenkamas; paketo kaina apskaiÄiuojama rezervacijos metu."]}, {"title": "4. Papildomas vairuotojas", "bullets": ["AutomobilÄ¯ gali vairuoti tik sutartyje nurodyti vairuotojai.", "Papildomas vairuotojas: 5 Eur/parai. BÅ«tina iÅ¡ anksto registruoti ir pateikti dokumentus."]}, {"title": "5. Draudimas", "bullets": ["Automobiliai apdrausti KASKO ir TPVCA. StandartinÄ— franÅ¡izÄ— â€“ 800 Eur; galima rinktis 400 Eur arba 0 Eur atsakomybÄ—s paketÄ….", "Apie bet kokÄ¯ eismo Ä¯vykÄ¯, Å¾alÄ… ar incidentÄ… praneÅ¡kite per 1 kalendorinÄ™ dienÄ…; nepraneÅ¡us draudimas gali negalioti.", "Praradus raktus ar dokumentus taikomas 200 Eur mokestis. Raktai ir dokumentai nedraudÅ¾iami.", "Draudimas negalioja vaÅ¾iuojant bekelÄ—je, sporto renginiuose, mokant vairuoti ar paÅ¾eidÅ¾iant sutartÄ¯."]}, {"title": "6. AtsakomybÄ— vagystÄ—s ar avarijos atveju", "bullets": ["Nuomininko atsakomybÄ— ribojama pasirinkto paketo franÅ¡ize (800 / 400 / 0 Eur), jei laikomasi sutarties ir praneÅ¡imo tvarkos.", "VagystÄ—s atveju bÅ«tina grÄ…Å¾inti raktus ir dokumentus; jÅ³ negrÄ…Å¾inus atsakomybÄ— gali bÅ«ti neribojama."]}, {"title": "7. Rida ir kelionÄ—s", "bullets": ["Lietuvoje rida neribojama.", "KelionÄ—ms Ä¯ uÅ¾sienÄ¯: 300 km/parÄ… (keleiviniams mikroautobusams â€“ 500 km/parÄ…), skaiÄiuojama per visÄ… nuomos laikotarpÄ¯ (pvz., 10 parÅ³ = 3000 km).", "VirÅ¡ijus limitÄ…: 0,15 Eur/km naujiems automobiliams, 0,10 Eur/km kitiems.", "KelionÄ—s uÅ¾ LT ribÅ³ galimos tik su iÅ¡ anksto suderintu automobiliu, kuriam galioja gamintojo garantija; senesniems automobiliams gali bÅ«ti taikomos papildomos sÄ…lygos."]}, {"title": "8. TechninÄ— pagalba", "paragraphs": ["Teikiama 24/7 techninÄ— pagalba kelyje visoje Europoje pagal draudimo sÄ…lygas."]}, {"title": "9. Kuras", "bullets": ["Automobilis iÅ¡duodamas su pilnu baku ir turi bÅ«ti grÄ…Å¾intas su pilnu baku.", "UÅ¾ trÅ«kstamÄ… kurÄ… taikomas sutartyje nurodytas tarifas, gali bÅ«ti taikomas aptarnavimo mokestis."]}, {"title": "10. Neatvykimas ir atÅ¡aukimas", "paragraphs": ["Neatvykus ar atÅ¡aukus po patvirtinimo rezervacijos mokestis (50 Eur) negrÄ…Å¾inamas."]}, {"title": "11. GrÄ…Å¾inimas ir vÄ—lavimas", "bullets": ["VÄ—luojant grÄ…Å¾inti ir nesuderinus iÅ¡ anksto, taikomas 10 Eur/val. mokestis.", "VÄ—luojant daugiau kaip 3 val., skaiÄiuojamas papildomos paros mokestis.", "Automobilio paÄ—mimas ar grÄ…Å¾inimas nedarbo valandomis galimas tik iÅ¡ anksto suderinus; taikomas papildomas mokestis."]}, {"title": "12. Nenumatytos aplinkybÄ—s", "paragraphs": ["Esant force majeure (pvz., techninis gedimas, autoÄ¯vykis), pasiliekame teisÄ™ atÅ¡aukti ar pakeisti rezervacijÄ…, apie tai iÅ¡ anksto informavÄ™ klientÄ… ir pasiÅ«lÄ™ galimus sprendimus."]}, {"title": "13. Kiti Ä¯sipareigojimai", "bullets": ["LaikykitÄ—s keliÅ³ eismo taisykliÅ³ ir gamintojo rekomendacijÅ³.", "Nenaudokite automobilio bekelÄ—je, varÅ¾ybose, mokant vairuoti ar kitais neleistinais tikslais.", "Apie gedimus ar Ä¯vykius informuokite nedelsdami â€“ tai padeda iÅ¡vengti papildomÅ³ nuostoliÅ³."]}]}	2026-06-10 13:27:24.964
5	rental-terms	en	{"note": "Note: specific prices, discounts, and additional services may be defined in an individual agreement or booking.", "intro": "These terms apply when reserving and renting vehicles through Ratai24.", "sections": [{"title": "1. Reservation", "bullets": ["You may reserve a vehicle online, by phone, or by email.", "A EUR 50 advance payment may be required to confirm a reservation; it is included in the rental price and is non-refundable in case of no-show or cancellation after confirmation.", "Final reservation confirmation is treated as conclusion of the rental agreement."]}, {"title": "2. Documents", "bullets": ["Required: valid driving licence and valid identity document (passport or ID card).", "Minimum driving experience is 2 years. Drivers who are younger or have less experience may be refused or subject to an additional fee."]}, {"title": "3. Payment and deposit", "bullets": ["Rental is paid by bank transfer before pickup or by card at pickup.", "Deposit: EUR 800 (standard liability), EUR 400, or EUR 0 - depending on the selected insurance package.", "If a EUR 0 excess package is selected, the deposit may be waived; package price is calculated during reservation."]}, {"title": "4. Additional driver", "bullets": ["Only drivers listed in the agreement may drive the vehicle.", "Additional driver fee: EUR 5/day. Registration and document submission are required in advance."]}, {"title": "5. Insurance", "bullets": ["Vehicles are covered by CASCO and third-party liability insurance. Standard excess is EUR 800; EUR 400 or EUR 0 liability packages may be selected.", "Any accident, damage, or incident must be reported within 1 calendar day; otherwise insurance coverage may be invalid.", "Loss of keys or documents is subject to a EUR 200 fee. Keys and documents are not insured.", "Insurance does not apply in off-road use, sports events, driving instruction, or other breach-of-contract situations."]}, {"title": "6. Liability in case of theft or accident", "bullets": ["Renter liability is limited to the selected package excess (EUR 800 / 400 / 0), provided contractual and reporting obligations are met.", "In case of theft, keys and documents must be returned; failure to return them may remove liability limits."]}, {"title": "7. Mileage and cross-border travel", "bullets": ["Mileage is unlimited within Lithuania.", "For travel abroad: 300 km/day (500 km/day for passenger vans), calculated over the entire rental period (e.g. 10 days = 3000 km).", "Excess mileage fee: EUR 0.15/km for newer vehicles, EUR 0.10/km for others.", "Trips outside Lithuania are allowed only with a vehicle approved in advance and covered by manufacturer warranty; additional conditions may apply to older vehicles."]}, {"title": "8. Roadside assistance", "paragraphs": ["24/7 roadside assistance is available across Europe under the insurance terms."]}, {"title": "9. Fuel", "bullets": ["The vehicle is handed over with a full tank and must be returned with a full tank.", "Missing fuel is charged at the rate defined in the agreement; a service fee may apply."]}, {"title": "10. No-show and cancellation", "paragraphs": ["If you do not arrive or cancel after confirmation, the reservation fee (EUR 50) is not refunded."]}, {"title": "11. Return and delay", "bullets": ["For delayed return without prior agreement, a fee of EUR 10/hour applies.", "If delay exceeds 3 hours, an additional full-day charge applies.", "Pickup or return outside business hours is possible only by prior agreement and may incur an additional fee."]}, {"title": "12. Force majeure", "paragraphs": ["In case of force majeure (e.g. technical failure, traffic accident), we reserve the right to cancel or change a reservation after informing the client in advance and proposing available solutions."]}, {"title": "13. Other obligations", "bullets": ["Follow road traffic rules and manufacturer recommendations.", "Do not use the vehicle off-road, in competitions, for driving instruction, or for other prohibited purposes.", "Report malfunctions or incidents immediately to help prevent additional losses."]}]}	2026-06-10 13:27:25.087
6	rental-terms	ru	{"note": "ÐŸÑ€Ð¸Ð¼ÐµÑ‡Ð°Ð½Ð¸Ðµ: ÐºÐ¾Ð½ÐºÑ€ÐµÑ‚Ð½Ñ‹Ðµ Ñ†ÐµÐ½Ñ‹, ÑÐºÐ¸Ð´ÐºÐ¸ Ð¸ Ð´Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ðµ ÑƒÑÐ»ÑƒÐ³Ð¸ Ð¼Ð¾Ð³ÑƒÑ‚ Ð¾Ð¿Ñ€ÐµÐ´ÐµÐ»ÑÑ‚ÑŒÑÑ Ð² Ð¸Ð½Ð´Ð¸Ð²Ð¸Ð´ÑƒÐ°Ð»ÑŒÐ½Ð¾Ð¼ Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ðµ Ð¸Ð»Ð¸ Ð·Ð°ÐºÐ°Ð·Ðµ.", "intro": "ÐÐ°ÑÑ‚Ð¾ÑÑ‰Ð¸Ðµ ÑƒÑÐ»Ð¾Ð²Ð¸Ñ Ð¿Ñ€Ð¸Ð¼ÐµÐ½ÑÑŽÑ‚ÑÑ Ð¿Ñ€Ð¸ Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ð¸ Ð¸ Ð°Ñ€ÐµÐ½Ð´Ðµ Ð°Ð²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»ÐµÐ¹ Ñ‡ÐµÑ€ÐµÐ· Ratai24.", "sections": [{"title": "1. Ð‘Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ðµ", "bullets": ["ÐÐ²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»ÑŒ Ð¼Ð¾Ð¶Ð½Ð¾ Ð·Ð°Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ Ð¾Ð½Ð»Ð°Ð¹Ð½, Ð¿Ð¾ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ñƒ Ð¸Ð»Ð¸ Ð¿Ð¾ email.", "Ð”Ð»Ñ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ñ Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ñ Ð¼Ð¾Ð¶ÐµÑ‚ Ð²Ð·Ð¸Ð¼Ð°Ñ‚ÑŒÑÑ Ð°Ð²Ð°Ð½Ñ 50 EUR; Ð¾Ð½ Ð²ÐºÐ»ÑŽÑ‡Ð°ÐµÑ‚ÑÑ Ð² ÑÑ‚Ð¾Ð¸Ð¼Ð¾ÑÑ‚ÑŒ Ð°Ñ€ÐµÐ½Ð´Ñ‹ Ð¸ Ð½Ðµ Ð²Ð¾Ð·Ð²Ñ€Ð°Ñ‰Ð°ÐµÑ‚ÑÑ Ð¿Ñ€Ð¸ Ð½ÐµÑÐ²ÐºÐµ Ð¸Ð»Ð¸ Ð¾Ñ‚Ð¼ÐµÐ½Ðµ Ð¿Ð¾ÑÐ»Ðµ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ñ.", "ÐžÐºÐ¾Ð½Ñ‡Ð°Ñ‚ÐµÐ»ÑŒÐ½Ð¾Ðµ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ðµ Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ñ ÑÑ‡Ð¸Ñ‚Ð°ÐµÑ‚ÑÑ Ð·Ð°ÐºÐ»ÑŽÑ‡ÐµÐ½Ð¸ÐµÐ¼ Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ð° Ð°Ñ€ÐµÐ½Ð´Ñ‹."]}, {"title": "2. Ð”Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ñ‹", "bullets": ["ÐžÐ±ÑÐ·Ð°Ñ‚ÐµÐ»ÑŒÐ½Ð¾: Ð´ÐµÐ¹ÑÑ‚Ð²ÑƒÑŽÑ‰ÐµÐµ Ð²Ð¾Ð´Ð¸Ñ‚ÐµÐ»ÑŒÑÐºÐ¾Ðµ ÑƒÐ´Ð¾ÑÑ‚Ð¾Ð²ÐµÑ€ÐµÐ½Ð¸Ðµ Ð¸ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚, ÑƒÐ´Ð¾ÑÑ‚Ð¾Ð²ÐµÑ€ÑÑŽÑ‰Ð¸Ð¹ Ð»Ð¸Ñ‡Ð½Ð¾ÑÑ‚ÑŒ (Ð¿Ð°ÑÐ¿Ð¾Ñ€Ñ‚ Ð¸Ð»Ð¸ ID-ÐºÐ°Ñ€Ñ‚Ð°).", "ÐœÐ¸Ð½Ð¸Ð¼Ð°Ð»ÑŒÐ½Ñ‹Ð¹ ÑÑ‚Ð°Ð¶ Ð²Ð¾Ð¶Ð´ÐµÐ½Ð¸Ñ - 2 Ð³Ð¾Ð´Ð°. Ð‘Ð¾Ð»ÐµÐµ Ð¼Ð¾Ð»Ð¾Ð´Ñ‹Ðµ Ð²Ð¾Ð´Ð¸Ñ‚ÐµÐ»Ð¸ Ð¸Ð»Ð¸ Ð²Ð¾Ð´Ð¸Ñ‚ÐµÐ»Ð¸ Ñ Ð¼ÐµÐ½ÑŒÑˆÐ¸Ð¼ ÑÑ‚Ð°Ð¶ÐµÐ¼ Ð¼Ð¾Ð³ÑƒÑ‚ Ð±Ñ‹Ñ‚ÑŒ Ð½Ðµ Ð¿Ñ€Ð¸Ð½ÑÑ‚Ñ‹ Ð»Ð¸Ð±Ð¾ Ð´Ð»Ñ Ð½Ð¸Ñ… Ð¼Ð¾Ð¶ÐµÑ‚ Ð¿Ñ€Ð¸Ð¼ÐµÐ½ÑÑ‚ÑŒÑÑ Ð´Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð°Ñ Ð¿Ð»Ð°Ñ‚Ð°."]}, {"title": "3. ÐžÐ¿Ð»Ð°Ñ‚Ð° Ð¸ Ð´ÐµÐ¿Ð¾Ð·Ð¸Ñ‚", "bullets": ["ÐžÐ¿Ð»Ð°Ñ‚Ð° Ð°Ñ€ÐµÐ½Ð´Ñ‹ Ð¿Ñ€Ð¾Ð¸Ð·Ð²Ð¾Ð´Ð¸Ñ‚ÑÑ Ð±Ð°Ð½ÐºÐ¾Ð²ÑÐºÐ¸Ð¼ Ð¿ÐµÑ€ÐµÐ²Ð¾Ð´Ð¾Ð¼ Ð´Ð¾ Ð¿Ð¾Ð»ÑƒÑ‡ÐµÐ½Ð¸Ñ Ð°Ð²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»Ñ Ð»Ð¸Ð±Ð¾ ÐºÐ°Ñ€Ñ‚Ð¾Ð¹ Ð¿Ñ€Ð¸ Ð¿Ð¾Ð»ÑƒÑ‡ÐµÐ½Ð¸Ð¸.", "Ð”ÐµÐ¿Ð¾Ð·Ð¸Ñ‚: 800 EUR (ÑÑ‚Ð°Ð½Ð´Ð°Ñ€Ñ‚Ð½Ð°Ñ Ð¾Ñ‚Ð²ÐµÑ‚ÑÑ‚Ð²ÐµÐ½Ð½Ð¾ÑÑ‚ÑŒ), 400 EUR Ð¸Ð»Ð¸ 0 EUR - Ð² Ð·Ð°Ð²Ð¸ÑÐ¸Ð¼Ð¾ÑÑ‚Ð¸ Ð¾Ñ‚ Ð²Ñ‹Ð±Ñ€Ð°Ð½Ð½Ð¾Ð³Ð¾ ÑÑ‚Ñ€Ð°Ñ…Ð¾Ð²Ð¾Ð³Ð¾ Ð¿Ð°ÐºÐµÑ‚Ð°.", "ÐŸÑ€Ð¸ Ð²Ñ‹Ð±Ð¾Ñ€Ðµ Ð¿Ð°ÐºÐµÑ‚Ð° Ñ Ñ„Ñ€Ð°Ð½ÑˆÐ¸Ð·Ð¾Ð¹ 0 EUR Ð´ÐµÐ¿Ð¾Ð·Ð¸Ñ‚ Ð¼Ð¾Ð¶ÐµÑ‚ Ð½Ðµ Ð²Ð·Ð¸Ð¼Ð°Ñ‚ÑŒÑÑ; ÑÑ‚Ð¾Ð¸Ð¼Ð¾ÑÑ‚ÑŒ Ð¿Ð°ÐºÐµÑ‚Ð° Ñ€Ð°ÑÑÑ‡Ð¸Ñ‚Ñ‹Ð²Ð°ÐµÑ‚ÑÑ Ð¿Ñ€Ð¸ Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ð¸."]}, {"title": "4. Ð”Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ð¹ Ð²Ð¾Ð´Ð¸Ñ‚ÐµÐ»ÑŒ", "bullets": ["Ð£Ð¿Ñ€Ð°Ð²Ð»ÑÑ‚ÑŒ Ð°Ð²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»ÐµÐ¼ Ð¼Ð¾Ð³ÑƒÑ‚ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð²Ð¾Ð´Ð¸Ñ‚ÐµÐ»Ð¸, ÑƒÐºÐ°Ð·Ð°Ð½Ð½Ñ‹Ðµ Ð² Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ðµ.", "Ð”Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ð¹ Ð²Ð¾Ð´Ð¸Ñ‚ÐµÐ»ÑŒ: 5 EUR/ÑÑƒÑ‚ÐºÐ¸. Ð¢Ñ€ÐµÐ±ÑƒÐµÑ‚ÑÑ Ð¿Ñ€ÐµÐ´Ð²Ð°Ñ€Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð°Ñ Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð°Ñ†Ð¸Ñ Ð¸ Ð¿Ñ€ÐµÐ´Ð¾ÑÑ‚Ð°Ð²Ð»ÐµÐ½Ð¸Ðµ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ð¾Ð²."]}, {"title": "5. Ð¡Ñ‚Ñ€Ð°Ñ…Ð¾Ð²Ð°Ð½Ð¸Ðµ", "bullets": ["ÐÐ²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»Ð¸ Ð·Ð°ÑÑ‚Ñ€Ð°Ñ…Ð¾Ð²Ð°Ð½Ñ‹ Ð¿Ð¾ ÐšÐÐ¡ÐšÐž Ð¸ ÐžÐ¡ÐÐ“Ðž. Ð¡Ñ‚Ð°Ð½Ð´Ð°Ñ€Ñ‚Ð½Ð°Ñ Ñ„Ñ€Ð°Ð½ÑˆÐ¸Ð·Ð° - 800 EUR; Ð¼Ð¾Ð¶Ð½Ð¾ Ð²Ñ‹Ð±Ñ€Ð°Ñ‚ÑŒ Ð¿Ð°ÐºÐµÑ‚Ñ‹ Ð¾Ñ‚Ð²ÐµÑ‚ÑÑ‚Ð²ÐµÐ½Ð½Ð¾ÑÑ‚Ð¸ 400 EUR Ð¸Ð»Ð¸ 0 EUR.", "Ðž Ð»ÑŽÐ±Ð¾Ð¼ Ð”Ð¢ÐŸ, Ð¿Ð¾Ð²Ñ€ÐµÐ¶Ð´ÐµÐ½Ð¸Ð¸ Ð¸Ð»Ð¸ Ð¸Ð½Ñ†Ð¸Ð´ÐµÐ½Ñ‚Ðµ Ð½ÐµÐ¾Ð±Ñ…Ð¾Ð´Ð¸Ð¼Ð¾ ÑÐ¾Ð¾Ð±Ñ‰Ð¸Ñ‚ÑŒ Ð² Ñ‚ÐµÑ‡ÐµÐ½Ð¸Ðµ 1 ÐºÐ°Ð»ÐµÐ½Ð´Ð°Ñ€Ð½Ð¾Ð³Ð¾ Ð´Ð½Ñ; Ð¿Ñ€Ð¸ Ð½ÐµÑÐ¾Ð¾Ð±Ñ‰ÐµÐ½Ð¸Ð¸ ÑÑ‚Ñ€Ð°Ñ…Ð¾Ð²Ð°Ð½Ð¸Ðµ Ð¼Ð¾Ð¶ÐµÑ‚ Ð½Ðµ Ð´ÐµÐ¹ÑÑ‚Ð²Ð¾Ð²Ð°Ñ‚ÑŒ.", "Ð—Ð° ÑƒÑ‚ÐµÑ€ÑŽ ÐºÐ»ÑŽÑ‡ÐµÐ¹ Ð¸Ð»Ð¸ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ð¾Ð² Ð²Ð·Ð¸Ð¼Ð°ÐµÑ‚ÑÑ Ð¿Ð»Ð°Ñ‚Ð° 200 EUR. ÐšÐ»ÑŽÑ‡Ð¸ Ð¸ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ñ‹ Ð½Ðµ ÑÑ‚Ñ€Ð°Ñ…ÑƒÑŽÑ‚ÑÑ.", "Ð¡Ñ‚Ñ€Ð°Ñ…Ð¾Ð²Ð°Ð½Ð¸Ðµ Ð½Ðµ Ð´ÐµÐ¹ÑÑ‚Ð²ÑƒÐµÑ‚ Ð¿Ñ€Ð¸ ÐµÐ·Ð´Ðµ Ð²Ð½Ðµ Ð´Ð¾Ñ€Ð¾Ð³, ÑƒÑ‡Ð°ÑÑ‚Ð¸Ð¸ Ð² ÑÐ¿Ð¾Ñ€Ñ‚Ð¸Ð²Ð½Ñ‹Ñ… Ð¼ÐµÑ€Ð¾Ð¿Ñ€Ð¸ÑÑ‚Ð¸ÑÑ…, Ð¾Ð±ÑƒÑ‡ÐµÐ½Ð¸Ð¸ Ð²Ð¾Ð¶Ð´ÐµÐ½Ð¸ÑŽ Ð¸Ð»Ð¸ Ð½Ð°Ñ€ÑƒÑˆÐµÐ½Ð¸Ð¸ ÑƒÑÐ»Ð¾Ð²Ð¸Ð¹ Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ð°."]}, {"title": "6. ÐžÑ‚Ð²ÐµÑ‚ÑÑ‚Ð²ÐµÐ½Ð½Ð¾ÑÑ‚ÑŒ Ð¿Ñ€Ð¸ ÑƒÐ³Ð¾Ð½Ðµ Ð¸Ð»Ð¸ Ð”Ð¢ÐŸ", "bullets": ["ÐžÑ‚Ð²ÐµÑ‚ÑÑ‚Ð²ÐµÐ½Ð½Ð¾ÑÑ‚ÑŒ Ð°Ñ€ÐµÐ½Ð´Ð°Ñ‚Ð¾Ñ€Ð° Ð¾Ð³Ñ€Ð°Ð½Ð¸Ñ‡ÐµÐ½Ð° Ñ„Ñ€Ð°Ð½ÑˆÐ¸Ð·Ð¾Ð¹ Ð²Ñ‹Ð±Ñ€Ð°Ð½Ð½Ð¾Ð³Ð¾ Ð¿Ð°ÐºÐµÑ‚Ð° (800 / 400 / 0 EUR) Ð¿Ñ€Ð¸ ÑÐ¾Ð±Ð»ÑŽÐ´ÐµÐ½Ð¸Ð¸ ÑƒÑÐ»Ð¾Ð²Ð¸Ð¹ Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ð° Ð¸ Ð¿Ð¾Ñ€ÑÐ´ÐºÐ° ÑƒÐ²ÐµÐ´Ð¾Ð¼Ð»ÐµÐ½Ð¸Ñ.", "ÐŸÑ€Ð¸ ÑƒÐ³Ð¾Ð½Ðµ Ð½ÐµÐ¾Ð±Ñ…Ð¾Ð´Ð¸Ð¼Ð¾ Ð²ÐµÑ€Ð½ÑƒÑ‚ÑŒ ÐºÐ»ÑŽÑ‡Ð¸ Ð¸ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ñ‹; Ð¿Ñ€Ð¸ Ð¸Ñ… Ð½ÐµÐ²Ð¾Ð·Ð²Ñ€Ð°Ñ‚Ðµ Ð¾Ñ‚Ð²ÐµÑ‚ÑÑ‚Ð²ÐµÐ½Ð½Ð¾ÑÑ‚ÑŒ Ð¼Ð¾Ð¶ÐµÑ‚ ÑÑ‚Ð°Ñ‚ÑŒ Ð½ÐµÐ¾Ð³Ñ€Ð°Ð½Ð¸Ñ‡ÐµÐ½Ð½Ð¾Ð¹."]}, {"title": "7. ÐŸÑ€Ð¾Ð±ÐµÐ³ Ð¸ Ð¿Ð¾ÐµÐ·Ð´ÐºÐ¸", "bullets": ["ÐŸÐ¾ Ð›Ð¸Ñ‚Ð²Ðµ Ð¿Ñ€Ð¾Ð±ÐµÐ³ Ð½Ðµ Ð¾Ð³Ñ€Ð°Ð½Ð¸Ñ‡ÐµÐ½.", "Ð”Ð»Ñ Ð¿Ð¾ÐµÐ·Ð´Ð¾Ðº Ð·Ð° Ð³Ñ€Ð°Ð½Ð¸Ñ†Ñƒ: 300 ÐºÐ¼/ÑÑƒÑ‚ÐºÐ¸ (500 ÐºÐ¼/ÑÑƒÑ‚ÐºÐ¸ Ð´Ð»Ñ Ð¿Ð°ÑÑÐ°Ð¶Ð¸Ñ€ÑÐºÐ¸Ñ… Ð¼Ð¸ÐºÑ€Ð¾Ð°Ð²Ñ‚Ð¾Ð±ÑƒÑÐ¾Ð²), Ñ€Ð°ÑÑ‡ÐµÑ‚ Ð¿Ð¾ Ð²ÑÐµÐ¼Ñƒ ÑÑ€Ð¾ÐºÑƒ Ð°Ñ€ÐµÐ½Ð´Ñ‹ (Ð½Ð°Ð¿Ñ€Ð¸Ð¼ÐµÑ€, 10 ÑÑƒÑ‚Ð¾Ðº = 3000 ÐºÐ¼).", "ÐŸÑ€Ð¸ Ð¿Ñ€ÐµÐ²Ñ‹ÑˆÐµÐ½Ð¸Ð¸ Ð»Ð¸Ð¼Ð¸Ñ‚Ð°: 0,15 EUR/ÐºÐ¼ Ð´Ð»Ñ Ð½Ð¾Ð²Ñ‹Ñ… Ð°Ð²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»ÐµÐ¹, 0,10 EUR/ÐºÐ¼ Ð´Ð»Ñ Ð¾ÑÑ‚Ð°Ð»ÑŒÐ½Ñ‹Ñ….", "ÐŸÐ¾ÐµÐ·Ð´ÐºÐ¸ Ð·Ð° Ð¿Ñ€ÐµÐ´ÐµÐ»Ñ‹ Ð›Ð¸Ñ‚Ð²Ñ‹ Ð²Ð¾Ð·Ð¼Ð¾Ð¶Ð½Ñ‹ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð½Ð° Ð·Ð°Ñ€Ð°Ð½ÐµÐµ ÑÐ¾Ð³Ð»Ð°ÑÐ¾Ð²Ð°Ð½Ð½Ð¾Ð¼ Ð°Ð²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»Ðµ Ñ Ð´ÐµÐ¹ÑÑ‚Ð²ÑƒÑŽÑ‰ÐµÐ¹ Ð³Ð°Ñ€Ð°Ð½Ñ‚Ð¸ÐµÐ¹ Ð¿Ñ€Ð¾Ð¸Ð·Ð²Ð¾Ð´Ð¸Ñ‚ÐµÐ»Ñ; Ð´Ð»Ñ Ð±Ð¾Ð»ÐµÐµ ÑÑ‚Ð°Ñ€Ñ‹Ñ… Ð°Ð²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»ÐµÐ¹ Ð¼Ð¾Ð³ÑƒÑ‚ Ð¿Ñ€Ð¸Ð¼ÐµÐ½ÑÑ‚ÑŒÑÑ Ð´Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ðµ ÑƒÑÐ»Ð¾Ð²Ð¸Ñ."]}, {"title": "8. Ð¢ÐµÑ…Ð½Ð¸Ñ‡ÐµÑÐºÐ°Ñ Ð¿Ð¾Ð¼Ð¾Ñ‰ÑŒ", "paragraphs": ["ÐšÑ€ÑƒÐ³Ð»Ð¾ÑÑƒÑ‚Ð¾Ñ‡Ð½Ð°Ñ Ñ‚ÐµÑ…Ð½Ð¸Ñ‡ÐµÑÐºÐ°Ñ Ð¿Ð¾Ð¼Ð¾Ñ‰ÑŒ 24/7 Ð¿Ñ€ÐµÐ´Ð¾ÑÑ‚Ð°Ð²Ð»ÑÐµÑ‚ÑÑ Ð¿Ð¾ Ð²ÑÐµÐ¹ Ð•Ð²Ñ€Ð¾Ð¿Ðµ Ð² ÑÐ¾Ð¾Ñ‚Ð²ÐµÑ‚ÑÑ‚Ð²Ð¸Ð¸ Ñ ÑƒÑÐ»Ð¾Ð²Ð¸ÑÐ¼Ð¸ ÑÑ‚Ñ€Ð°Ñ…Ð¾Ð²Ð°Ð½Ð¸Ñ."]}, {"title": "9. Ð¢Ð¾Ð¿Ð»Ð¸Ð²Ð¾", "bullets": ["ÐÐ²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»ÑŒ Ð²Ñ‹Ð´Ð°ÐµÑ‚ÑÑ Ñ Ð¿Ð¾Ð»Ð½Ñ‹Ð¼ Ð±Ð°ÐºÐ¾Ð¼ Ð¸ Ð´Ð¾Ð»Ð¶ÐµÐ½ Ð±Ñ‹Ñ‚ÑŒ Ð²Ð¾Ð·Ð²Ñ€Ð°Ñ‰ÐµÐ½ Ñ Ð¿Ð¾Ð»Ð½Ñ‹Ð¼ Ð±Ð°ÐºÐ¾Ð¼.", "ÐÐµÐ´Ð¾ÑÑ‚Ð°ÑŽÑ‰ÐµÐµ Ñ‚Ð¾Ð¿Ð»Ð¸Ð²Ð¾ Ð¾Ð¿Ð»Ð°Ñ‡Ð¸Ð²Ð°ÐµÑ‚ÑÑ Ð¿Ð¾ Ñ‚Ð°Ñ€Ð¸Ñ„Ñƒ, ÑƒÐºÐ°Ð·Ð°Ð½Ð½Ð¾Ð¼Ñƒ Ð² Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ðµ; Ð¼Ð¾Ð¶ÐµÑ‚ Ð²Ð·Ð¸Ð¼Ð°Ñ‚ÑŒÑÑ ÑÐµÑ€Ð²Ð¸ÑÐ½Ñ‹Ð¹ ÑÐ±Ð¾Ñ€."]}, {"title": "10. ÐÐµÑÐ²ÐºÐ° Ð¸ Ð¾Ñ‚Ð¼ÐµÐ½Ð°", "paragraphs": ["ÐŸÑ€Ð¸ Ð½ÐµÑÐ²ÐºÐµ Ð¸Ð»Ð¸ Ð¾Ñ‚Ð¼ÐµÐ½Ðµ Ð¿Ð¾ÑÐ»Ðµ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ñ ÑÐ±Ð¾Ñ€ Ð·Ð° Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ðµ (50 EUR) Ð½Ðµ Ð²Ð¾Ð·Ð²Ñ€Ð°Ñ‰Ð°ÐµÑ‚ÑÑ."]}, {"title": "11. Ð’Ð¾Ð·Ð²Ñ€Ð°Ñ‚ Ð¸ Ð¾Ð¿Ð¾Ð·Ð´Ð°Ð½Ð¸Ðµ", "bullets": ["ÐŸÑ€Ð¸ Ð·Ð°Ð´ÐµÑ€Ð¶ÐºÐµ Ð²Ð¾Ð·Ð²Ñ€Ð°Ñ‚Ð° Ð±ÐµÐ· Ð¿Ñ€ÐµÐ´Ð²Ð°Ñ€Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð¾Ð³Ð¾ ÑÐ¾Ð³Ð»Ð°ÑÐ¾Ð²Ð°Ð½Ð¸Ñ Ð¿Ñ€Ð¸Ð¼ÐµÐ½ÑÐµÑ‚ÑÑ Ð¿Ð»Ð°Ñ‚Ð° 10 EUR/Ñ‡Ð°Ñ.", "ÐŸÑ€Ð¸ Ð·Ð°Ð´ÐµÑ€Ð¶ÐºÐµ Ð±Ð¾Ð»ÐµÐµ 3 Ñ‡Ð°ÑÐ¾Ð² Ð½Ð°Ñ‡Ð¸ÑÐ»ÑÐµÑ‚ÑÑ ÑÑ‚Ð¾Ð¸Ð¼Ð¾ÑÑ‚ÑŒ Ð´Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ñ… ÑÑƒÑ‚Ð¾Ðº.", "ÐŸÐ¾Ð»ÑƒÑ‡ÐµÐ½Ð¸Ðµ Ð¸Ð»Ð¸ Ð²Ð¾Ð·Ð²Ñ€Ð°Ñ‚ Ð°Ð²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»Ñ Ð²Ð½Ðµ Ñ€Ð°Ð±Ð¾Ñ‡ÐµÐ³Ð¾ Ð²Ñ€ÐµÐ¼ÐµÐ½Ð¸ Ð²Ð¾Ð·Ð¼Ð¾Ð¶Ð½Ñ‹ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð¿Ð¾ Ð¿Ñ€ÐµÐ´Ð²Ð°Ñ€Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð¾Ð¼Ñƒ ÑÐ¾Ð³Ð»Ð°ÑÐ¾Ð²Ð°Ð½Ð¸ÑŽ; Ð¿Ñ€Ð¸Ð¼ÐµÐ½ÑÐµÑ‚ÑÑ Ð´Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð°Ñ Ð¿Ð»Ð°Ñ‚Ð°."]}, {"title": "12. ÐÐµÐ¿Ñ€ÐµÐ´Ð²Ð¸Ð´ÐµÐ½Ð½Ñ‹Ðµ Ð¾Ð±ÑÑ‚Ð¾ÑÑ‚ÐµÐ»ÑŒÑÑ‚Ð²Ð°", "paragraphs": ["ÐŸÑ€Ð¸ Ñ„Ð¾Ñ€Ñ-Ð¼Ð°Ð¶Ð¾Ñ€Ðµ (Ð½Ð°Ð¿Ñ€Ð¸Ð¼ÐµÑ€, Ñ‚ÐµÑ…Ð½Ð¸Ñ‡ÐµÑÐºÐ°Ñ Ð½ÐµÐ¸ÑÐ¿Ñ€Ð°Ð²Ð½Ð¾ÑÑ‚ÑŒ, Ð”Ð¢ÐŸ) Ð¼Ñ‹ Ð¾ÑÑ‚Ð°Ð²Ð»ÑÐµÐ¼ Ð·Ð° ÑÐ¾Ð±Ð¾Ð¹ Ð¿Ñ€Ð°Ð²Ð¾ Ð¾Ñ‚Ð¼ÐµÐ½Ð¸Ñ‚ÑŒ Ð¸Ð»Ð¸ Ð¸Ð·Ð¼ÐµÐ½Ð¸Ñ‚ÑŒ Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ðµ, Ð¿Ñ€ÐµÐ´Ð²Ð°Ñ€Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð¾ ÑƒÐ²ÐµÐ´Ð¾Ð¼Ð¸Ð² ÐºÐ»Ð¸ÐµÐ½Ñ‚Ð° Ð¸ Ð¿Ñ€ÐµÐ´Ð»Ð¾Ð¶Ð¸Ð² Ð²Ð¾Ð·Ð¼Ð¾Ð¶Ð½Ñ‹Ðµ Ñ€ÐµÑˆÐµÐ½Ð¸Ñ."]}, {"title": "13. ÐŸÑ€Ð¾Ñ‡Ð¸Ðµ Ð¾Ð±ÑÐ·Ð°Ñ‚ÐµÐ»ÑŒÑÑ‚Ð²Ð°", "bullets": ["Ð¡Ð¾Ð±Ð»ÑŽÐ´Ð°Ð¹Ñ‚Ðµ Ð¿Ñ€Ð°Ð²Ð¸Ð»Ð° Ð´Ð¾Ñ€Ð¾Ð¶Ð½Ð¾Ð³Ð¾ Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸Ñ Ð¸ Ñ€ÐµÐºÐ¾Ð¼ÐµÐ½Ð´Ð°Ñ†Ð¸Ð¸ Ð¿Ñ€Ð¾Ð¸Ð·Ð²Ð¾Ð´Ð¸Ñ‚ÐµÐ»Ñ.", "ÐÐµ Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐ¹Ñ‚Ðµ Ð°Ð²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»ÑŒ Ð²Ð½Ðµ Ð´Ð¾Ñ€Ð¾Ð³, Ð² ÑÐ¾Ñ€ÐµÐ²Ð½Ð¾Ð²Ð°Ð½Ð¸ÑÑ…, Ð´Ð»Ñ Ð¾Ð±ÑƒÑ‡ÐµÐ½Ð¸Ñ Ð²Ð¾Ð¶Ð´ÐµÐ½Ð¸ÑŽ Ð¸Ð»Ð¸ Ð² Ð¸Ð½Ñ‹Ñ… Ð·Ð°Ð¿Ñ€ÐµÑ‰ÐµÐ½Ð½Ñ‹Ñ… Ñ†ÐµÐ»ÑÑ….", "ÐÐµÐ¼ÐµÐ´Ð»ÐµÐ½Ð½Ð¾ ÑÐ¾Ð¾Ð±Ñ‰Ð°Ð¹Ñ‚Ðµ Ð¾ Ð½ÐµÐ¸ÑÐ¿Ñ€Ð°Ð²Ð½Ð¾ÑÑ‚ÑÑ… Ð¸Ð»Ð¸ Ð¿Ñ€Ð¾Ð¸ÑÑˆÐµÑÑ‚Ð²Ð¸ÑÑ… - ÑÑ‚Ð¾ Ð¿Ð¾Ð¼Ð¾Ð³Ð°ÐµÑ‚ Ð¸Ð·Ð±ÐµÐ¶Ð°Ñ‚ÑŒ Ð´Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ñ… ÑƒÐ±Ñ‹Ñ‚ÐºÐ¾Ð²."]}]}	2026-06-10 13:27:25.204
\.


--
-- Data for Name: Part; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Part" (id, "partName", "oemNumber", make, model, year, colour, "engineCapacityL", "powerKW", "fuelType", gearbox, "bodyType", description, condition, price, "createdAt", "updatedAt") FROM stdin;
1	sad	asd	Audi	A6	2026	\N	\N	\N	\N	\N	\N	\N	USED	0.01	2026-06-10 14:51:33.596	2026-06-10 14:51:33.596
\.


--
-- Data for Name: PartImage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PartImage" (id, "partId", filename, url, "isMain", "order", "createdAt") FROM stdin;
1	1	car-parts-images/audi_a6_1/cn3gwr2t0wb3bc1ohi0p	https://res.cloudinary.com/dg1yvhrvg/image/upload/v1781103113/car-parts-images/audi_a6_1/cn3gwr2t0wb3bc1ohi0p.jpg	t	0	2026-06-10 14:51:54.607
\.


--
-- Data for Name: PasswordResetToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PasswordResetToken" (id, "tokenHash", "userId", "expiresAt", "createdAt") FROM stdin;
6	a476020c3f04fef9443d26fe5efffcfde013bc63c1ad1cb8363904ce0214f7f2	6	2026-04-03 21:03:18.864	2026-04-03 20:03:18.867
\.


--
-- Data for Name: PricingRule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PricingRule" (id, name, description, "carId", "cityId", "startDate", "endDate", "fixedPrice", multiplier, "minPrice", "maxPrice", priority, "isActive", "createdAt") FROM stdin;
2	King Mindaugas day	\N	\N	\N	2026-06-28 00:00:00	2026-07-12 00:00:00	\N	0.95	\N	\N	8	t	2026-04-25 14:20:30.419
1	Vasaros pikas Vilnius 2026	Vasaros pabrangimas 10%	\N	1	2026-06-01 00:00:00	2026-08-31 00:00:00	\N	1.1	\N	\N	5	t	2026-04-16 13:32:28.836
5	Popular cars	\N	23	\N	2026-04-01 00:00:00	2026-05-06 00:00:00	\N	1.05	\N	\N	9	t	2026-04-25 14:21:38.723
7	Multiple cars Discount	\N	\N	\N	2026-05-25 00:00:00	2026-05-31 00:00:00	\N	1.07	\N	\N	4	t	2026-05-25 20:03:20.18
\.


--
-- Data for Name: PricingRuleCar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PricingRuleCar" ("pricingRuleId", "carId") FROM stdin;
7	26
7	12
7	24
\.


--
-- Data for Name: PricingSnapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PricingSnapshot" (id, "carId", "cityId", "calculatedPrice", "basePrice", "demandMultiplier", "seasonalMultiplier", "utilizationMultiplier", "durationMultiplier", "customerMultiplier", "finalPrice", "availableCars", "activeContracts", "requestDate", "startDate", duration, "createdAt") FROM stdin;
1	7	2	69	115	0.7899999999999999	1.15	0.75	0.88	0.92	69	2	1	2026-04-02 16:04:47.051	2026-04-02 06:00:00	7	2026-04-02 16:04:47.052
2	8	2	31.74	40	0.9223333333333333	1.15	0.75	0.95	1	31.74	1	2	2026-04-03 20:44:16.643	2026-04-03 06:00:00	6	2026-04-03 20:44:16.644
3	3	2	40.57	30	1.366666666666667	1.3225	0.75	0.95	1	40.57	0	3	2026-04-03 20:44:48.908	2026-04-03 06:00:00	3	2026-04-03 20:44:48.909
4	3	2	34.2	30	1.366666666666667	1.19025	0.75	1	0.89	34.2	0	3	2026-04-03 21:47:40.7	2026-04-04 06:00:00	2	2026-04-03 21:47:40.701
5	3	2	34.2	30	1.366666666666667	1.19025	0.75	1	0.89	34.2	0	3	2026-04-03 21:49:13.536	2026-04-04 06:00:00	2	2026-04-03 21:49:13.537
6	3	2	34.2	30	1.366666666666667	1.19025	0.75	1	0.89	34.2	0	3	2026-04-03 21:49:38.457	2026-04-04 06:00:00	2	2026-04-03 21:49:38.458
7	1	1	23.07	35	0.7899999999999999	1.19025	0.75	1	0.89	23.07	2	0	2026-04-03 21:52:21.036	2026-04-04 06:00:00	1	2026-04-03 21:52:21.037
8	3	2	48.9	30	2.5	0.9	0.75	1	0.92	48.9	1	2	2026-04-04 07:18:15.439	2026-04-04 06:00:00	2	2026-04-04 07:18:15.44
9	3	2	48.9	30	2.5	0.9	0.75	1	0.92	48.9	1	2	2026-04-04 07:19:25.219	2026-04-04 06:00:00	2	2026-04-04 07:19:25.22
10	3	2	48.9	30	2.5	0.9	0.75	1	0.92	48.9	1	2	2026-04-04 07:20:24.132	2026-04-08 06:00:00	2	2026-04-04 07:20:24.133
11	8	2	24	40	0.7899999999999999	0.9	0.75	1	0.89	24	1	2	2026-04-04 18:21:37.365	2026-04-10 06:00:00	1	2026-04-04 18:21:37.366
12	1	1	21	35	0.7899999999999999	0.9	0.75	1	1	21	2	0	2026-04-05 14:10:12.438	2026-04-05 06:00:00	1	2026-04-05 14:10:12.439
13	22	3	30	50	0.7899999999999999	0.9	0.75	1	0.89	30	1	0	2026-04-14 18:54:11.906	2026-04-14 06:00:00	1	2026-04-14 18:54:11.907
14	22	3	30	50	0.7899999999999999	0.9	0.75	0.88	0.89	30	1	0	2026-04-14 18:55:09.804	2026-04-14 06:00:00	9	2026-04-14 18:55:09.804
15	22	3	30	50	0.7899999999999999	0.9	0.75	0.95	0.89	30	1	0	2026-04-14 18:55:15.308	2026-04-14 06:00:00	4	2026-04-14 18:55:15.309
16	22	3	30	50	0.7899999999999999	0.9	0.75	0.88	0.89	30	1	0	2026-04-14 18:55:18.889	2026-04-14 06:00:00	7	2026-04-14 18:55:18.89
17	22	3	30	50	0.7899999999999999	0.9	0.75	0.65	0.89	30	1	0	2026-04-14 18:55:23.712	2026-04-14 06:00:00	38	2026-04-14 18:55:23.713
18	8	2	24	40	0.7899999999999999	0.9	0.75	1	0.89	24	3	0	2026-04-14 18:55:53.484	2026-04-14 06:00:00	1	2026-04-14 18:55:53.485
19	1	1	21	35	0.7899999999999999	0.9	0.75	1	0.89	21	1	0	2026-04-14 18:56:38.937	2026-04-14 10:00:00	2	2026-04-14 18:56:38.938
20	22	3	30	50	0.7899999999999999	0.95	0.75	1	0.92	30	1	0	2026-04-14 19:03:41.934	2026-05-21 23:00:00	2	2026-04-14 19:03:41.936
21	8	2	35.72	40	1.05	0.9	0.9	1	1	35.72	2	1	2026-04-15 10:01:39.763	2026-04-15 06:00:00	2	2026-04-15 10:01:39.764
22	8	2	35.01	40	1.05	0.9	0.9	0.98	1	35.01	2	1	2026-04-15 10:01:40.016	2026-04-15 06:00:00	3	2026-04-15 10:01:40.017
23	8	2	35.01	40	1.05	0.9	0.9	0.98	1	35.01	2	1	2026-04-15 10:01:51.715	2026-04-15 06:00:00	3	2026-04-15 10:01:51.716
24	22	3	49.87	50	1.05	1.0925	0.9	1	0.92	49.87	1	0	2026-04-16 10:13:57.032	2026-05-22 06:00:00	1	2026-04-16 10:13:57.033
25	22	3	49.87	50	1.05	1.0925	0.9	1	0.92	49.87	1	0	2026-04-16 10:14:24.628	2026-05-22 06:00:00	1	2026-04-16 10:14:24.629
26	1	1	34.83	35	1.05	1.15	0.9	0.98	0.89	34.83	1	0	2026-04-17 09:59:42.14	2026-04-17 06:00:00	4	2026-04-17 09:59:42.141
27	1	1	34.83	35	1.05	1.15	0.9	0.98	0.89	34.83	1	0	2026-04-17 09:59:42.567	2026-04-17 06:00:00	4	2026-04-17 09:59:42.568
28	1	1	34.83	35	1.05	1.15	0.9	0.98	0.89	34.83	1	0	2026-04-17 09:59:57.109	2026-04-17 06:00:00	4	2026-04-17 09:59:57.11
29	1	1	30.91	35	1.05	1	0.9	1	0.89	30.91	1	0	2026-04-17 10:01:58.96	2026-04-22 06:00:00	1	2026-04-17 10:01:58.961
30	1	1	30.91	35	1.05	1	0.9	1	0.89	30.91	1	0	2026-04-17 10:02:28.285	2026-04-22 06:00:00	2	2026-04-17 10:02:28.286
31	1	1	34.73	35	1.05	1	0.9	1	1	34.73	1	0	2026-04-17 10:02:30.171	2026-04-22 06:00:00	2	2026-04-17 10:02:30.172
32	7	2	128.6	100	1.05	1.3225	0.9	0.98	1	128.6	2	1	2026-04-17 20:33:22.073	2026-04-17 06:00:00	3	2026-04-17 20:33:22.074
33	7	2	128.6	100	1.05	1.3225	0.9	0.98	1	128.6	2	1	2026-04-17 20:33:24.172	2026-04-17 06:00:00	3	2026-04-17 20:33:24.173
34	7	2	131.23	100	1.05	1.3225	0.9	1	1	131.23	2	1	2026-04-17 20:33:35.357	2026-04-17 06:00:00	1	2026-04-17 20:33:35.359
35	7	2	131.23	100	1.05	1.3225	0.9	1	1	131.23	2	1	2026-04-17 20:33:56.188	2026-04-17 06:00:00	1	2026-04-17 20:33:56.189
36	1	1	36.74	35	1.05	1.15	0.9	1	0.92	36.74	1	0	2026-04-18 06:48:10.135	2026-04-21 06:00:00	1	2026-04-18 06:48:10.135
37	22	3	38.16	50	1.05	0.95	0.9	0.88	0.92	45	0	1	2026-04-18 07:12:51.15	2026-05-23 06:00:00	314	2026-04-18 07:12:51.151
38	22	3	49.87	50	1.05	1.0925	0.9	1	0.92	49.87	0	1	2026-04-18 07:13:15.266	2026-05-23 06:00:00	1	2026-04-18 07:13:15.267
39	7	2	104.98	100	1.05	1.15	0.9	1	0.92	104.98	2	1	2026-04-20 18:09:50.356	2026-04-24 06:00:00	1	2026-04-20 18:09:50.357
40	7	2	104.98	100	1.05	1.15	0.9	1	0.92	104.98	2	1	2026-04-20 18:09:50.496	2026-04-24 06:00:00	1	2026-04-20 18:09:50.497
41	7	2	108.67	100	1	1.15	0.9	1	1	108.67	0	3	2026-04-20 19:08:41.986	2026-04-23 06:00:00	1	2026-04-20 19:08:41.987
42	7	2	114.11	100	1.05	1.15	0.9	1	1	114.11	0	3	2026-04-20 19:08:59.318	2026-04-22 06:00:00	2	2026-04-20 19:08:59.319
43	7	2	104.98	100	1.05	1.15	0.9	1	0.92	104.98	0	3	2026-04-20 19:29:42.555	2026-04-22 06:00:00	2	2026-04-20 19:29:42.556
44	7	2	104.98	100	1.05	1.15	0.9	1	0.92	104.98	0	3	2026-04-20 19:29:46.607	2026-04-22 06:00:00	2	2026-04-20 19:29:46.607
45	23	2	36.06	25	1.05	1.25	1.2	0.98	0.89	41.74	4	0	2026-04-25 14:26:08.582	2026-05-01 06:00:00	4	2026-04-25 14:26:08.583
46	23	2	36.06	25	1.05	1.25	1.2	0.98	0.89	41.74	4	0	2026-04-25 14:26:08.637	2026-05-01 06:00:00	4	2026-04-25 14:26:08.639
47	23	2	36.06	25	1.05	1.25	1.2	0.98	0.89	41.74	4	0	2026-04-25 14:26:21.756	2026-05-01 06:00:00	4	2026-04-25 14:26:21.757
48	25	1	50.16	43	1.05	1.15	1	1	0.92	50.16	3	0	2026-05-03 19:37:15.439	2026-05-03 20:00:00	1	2026-05-03 19:37:15.44
49	25	1	51.79	43	1.05	1.0925	1	1	1	51.79	2	1	2026-05-03 19:39:05.612	2026-05-04 09:00:00	1	2026-05-03 19:39:05.613
50	25	1	51.79	43	1.05	1.0925	1	1	1	51.79	2	1	2026-05-03 19:39:23.93	2026-05-04 09:00:00	1	2026-05-03 19:39:23.931
51	22	3	43.36	50	1.05	0.95	0.9	1	0.92	43.36	-1	2	2026-05-03 21:27:33.412	2026-05-25 06:00:00	2	2026-05-03 21:27:33.412
52	25	1	44.68	43	1.016666666666667	1.15	1	0.92	0.92	44.68	2	1	2026-05-04 08:03:45.584	2026-05-05 06:00:00	17	2026-05-04 08:03:45.585
53	25	1	48.56	43	1.016666666666667	1.15	1	1	0.92	48.56	2	1	2026-05-04 08:19:28.331	2026-05-05 06:00:00	2	2026-05-04 08:19:28.332
54	25	1	47.59	43	1.016666666666667	1.15	1	0.98	0.92	47.59	2	1	2026-05-04 08:19:30.691	2026-05-05 06:00:00	3	2026-05-04 08:19:30.691
55	25	1	47.59	43	1.016666666666667	1.15	1	0.98	0.92	47.59	2	1	2026-05-04 08:20:18.746	2026-05-05 06:00:00	3	2026-05-04 08:20:18.747
56	24	1	54.63	50	1.016666666666667	1.15	1	1	0.89	54.63	2	1	2026-05-05 18:01:53.129	2026-05-07 06:00:00	1	2026-05-05 18:01:53.13
57	24	1	49.17	50	1.016666666666667	1.15	1	0.9	0.89	49.17	2	1	2026-05-05 18:02:22.552	2026-05-07 06:00:00	21	2026-05-05 18:02:22.553
58	24	1	49.17	50	1.016666666666667	1.15	1	0.9	0.89	49.17	2	1	2026-05-05 18:02:30.872	2026-05-07 06:00:00	21	2026-05-05 18:02:30.873
59	24	1	58.32	50	1.05	1.15	1	1	0.92	58.32	2	1	2026-05-06 10:19:43.692	2026-05-29 06:00:00	2	2026-05-06 10:19:43.693
60	24	1	58.32	50	1.05	1.15	1	1	0.92	58.32	2	1	2026-05-06 10:20:12.814	2026-05-29 06:00:00	2	2026-05-06 10:20:12.815
61	25	1	44.63	43	1.016666666666667	1.15	1	0.95	0.89	44.63	2	1	2026-05-08 06:37:09.598	2026-05-08 06:00:00	7	2026-05-08 06:37:09.599
62	25	1	44.63	43	1.016666666666667	1.15	1	0.95	0.89	44.63	2	1	2026-05-08 06:37:12.799	2026-05-08 06:00:00	7	2026-05-08 06:37:12.8
63	25	1	44.63	43	1.016666666666667	1.15	1	0.95	0.89	44.63	2	1	2026-05-08 06:37:23.053	2026-05-08 06:00:00	7	2026-05-08 06:37:23.054
64	25	1	44.63	43	1.016666666666667	1.15	1	0.95	0.89	44.63	2	1	2026-05-08 06:37:32.151	2026-05-08 06:00:00	7	2026-05-08 06:37:32.152
65	25	1	44.63	43	1.016666666666667	1.15	1	0.95	0.89	44.63	2	1	2026-05-08 07:09:59.996	2026-05-08 06:00:00	7	2026-05-08 07:09:59.997
66	24	1	56.47	50	1.016666666666667	1.15	1	1	0.92	56.47	1	2	2026-05-08 07:13:30.098	2026-05-29 09:00:00	2	2026-05-08 07:13:30.099
67	23	2	38.04	25	1.05	1.15	1.2	1	1	38.04	5	0	2026-05-13 12:16:10.419	2026-05-13 06:00:00	1	2026-05-13 12:16:10.42
68	23	2	38.04	25	1.05	1.15	1.2	1	1	38.04	5	0	2026-05-13 12:16:14.221	2026-05-13 06:00:00	1	2026-05-13 12:16:14.222
69	23	2	38.04	25	1.05	1.15	1.2	1	1	38.04	5	0	2026-05-13 12:16:33.643	2026-05-13 06:00:00	1	2026-05-13 12:16:33.644
70	8	2	36.75	40	0.9500000000000001	1.15	1	0.9	0.89	36.75	4	1	2026-05-26 06:25:33.541	2026-05-28 06:00:00	21	2026-05-26 06:25:33.542
71	8	2	36.75	40	0.9500000000000001	1.15	1	0.9	0.89	36.75	4	1	2026-05-26 06:25:56.618	2026-05-28 06:00:00	21	2026-05-26 06:25:56.619
72	22	3	55.91	50	1.05	1.15	0.9	0.98	1	55.91	-1	2	2026-05-31 15:40:47.953	2026-05-31 06:00:00	3	2026-05-31 15:40:47.954
73	22	3	55.91	50	1.05	1.15	0.9	0.98	1	55.91	-1	2	2026-05-31 15:41:07.534	2026-05-31 06:00:00	3	2026-05-31 15:41:07.535
74	24	1	78.29	50	1.05	1.495	1	0.95	1	86.12	3	0	2026-06-01 06:52:26.029	2026-06-04 06:00:00	8	2026-06-01 06:52:26.03
75	24	1	78.29	50	1.05	1.495	1	0.95	1	86.12	3	0	2026-06-01 06:52:54.852	2026-06-04 06:00:00	8	2026-06-01 06:52:54.853
76	23	2	39.37	25	0.9500000000000001	1.495	1.2	1	0.88	39.37	4	1	2026-06-10 19:01:46.816	2026-06-10 06:00:00	1	2026-06-10 19:01:46.817
77	23	2	39.37	25	0.9500000000000001	1.495	1.2	1	0.88	39.37	4	1	2026-06-10 19:01:46.87	2026-06-10 06:00:00	1	2026-06-10 19:01:46.872
78	23	2	39.37	25	0.9500000000000001	1.495	1.2	1	0.88	39.37	4	1	2026-06-10 19:01:49.949	2026-06-10 06:00:00	1	2026-06-10 19:01:49.95
79	23	2	37.4	25	0.9500000000000001	1.42025	1.2	1	0.88	37.4	4	1	2026-06-14 14:36:33.606	2026-06-15 06:00:00	1	2026-06-14 14:36:33.607
80	23	2	37.4	25	0.9500000000000001	1.42025	1.2	1	0.88	37.4	4	1	2026-06-14 14:36:35.825	2026-06-15 06:00:00	1	2026-06-14 14:36:35.826
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RefreshToken" (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
1	47ba0265a85354cf7a86880988a2706ed17fdec26e3ef563488252361c1e3789482e22562c048c3265e8bf8cdd3ac588	1	2026-01-04 22:38:20.32	2025-12-28 22:38:20.321
95	fc15936b5947e61efb1af86e66cef60e8b86d9e83d0176d562f8097bb727f405acc316f1de4dce47c999bda2ca907537	1	2026-02-21 21:19:49.319	2026-02-14 21:19:49.32
311	5e5cc365025bdc11ebb605728441dff105130ff02d9ae3bf54e254ae249b4e158ffbe105c9f02bfb89f793eb5066d37d	1	2026-05-11 12:00:10.498	2026-05-04 12:00:10.499
97	8314131cdf7ef863fb5fab5b99e936acbd21f706d61f7d8da06d41c35b60cda2783fc1884c5b74eb52ebd6c0326e58c5	1	2026-02-22 07:33:12.41	2026-02-15 07:33:12.411
102	7e96967d11846bf18c30bb47374c0050da10cb50362fb5fa09c0d393473bddfbed813e05c3dfaaf7bb25970389eb62fd	1	2026-02-22 08:02:00.482	2026-02-15 08:02:00.483
103	d99fdb77c3deb08f51745a753a610f6300ad9aa2f3eb9f8db9dbd432a04e59978ede3ba6001c504bc678a6c83cb47627	1	2026-02-22 08:02:23.869	2026-02-15 08:02:23.87
104	f89ece70cdf8f9106d19e258922002a6bc730ad6ba0b999a1ebbae1362524e6949fd89993ea10df10286e1af5b7af566	1	2026-02-22 08:02:37.764	2026-02-15 08:02:37.765
105	38fab8c57d88c372d06582b600d10fee19c987379c9fe0439bcec0983779343cc0ed71668909e7e95a0b157e85bf7574	1	2026-02-22 08:02:46.061	2026-02-15 08:02:46.062
106	0ca1b0610bf8b6a4be663edeae56ff43ea4f35fde72eab6ed86c041eb74c8c0cc6448091a4b4ede35babf2bd4ae42fc6	1	2026-02-22 08:03:02.976	2026-02-15 08:03:02.978
107	01218518ae1fdabb164cdc0e07dbff9bd179ea2c969e277984f177f8a4f582a1075a2d1b2faf904aa47ea78cd1a98952	1	2026-02-22 08:03:10.915	2026-02-15 08:03:10.917
108	582b4413eb46dd290ad60ed7728e5079cc514ee8bb7c031e4c7e8f716fbcc29cd6bdefc7d9df1e3503f4d2be36086668	1	2026-02-22 08:07:27.169	2026-02-15 08:07:27.17
113	2df7579aa4b15b11f798a6db9c722f169a572de1581b392e1a9bb4fededdf7b43a6e8b0e16e9513da8c508d96493799c	1	2026-02-22 09:49:13.711	2026-02-15 09:49:13.712
333	2099d4bb8dc6678429d6c15a5317e37b851c0c85edb6381077c30d5f2999506bce8a67120769ce66681c99cdae61dbe0	9	2026-06-01 20:02:40.822	2026-05-25 20:02:40.823
30	c97b1885b332e5d6aac3101fbe27beed3865dc333e79cdc0157a07e3ad7f003d5a43709871a23b42262400e59a8bf64b	1	2026-01-10 20:49:48.84	2026-01-03 20:49:48.841
118	a23044cee344798b27107a1b1ae5be31cc95fdf1285d9af094f1e283ea05dcb2600eb74bf65bae794822f98b9225d3ed	3	2026-02-22 10:15:25.191	2026-02-15 10:15:25.192
33	6bbb44ac4e407ebfa97af5be335ddbf56e972a82e2abf671ea8d0d03425743fa32126a9271ee3353971cbb5bd3697172	1	2026-01-10 22:56:21.851	2026-01-03 22:56:21.853
186	5ec41c8f2bd93bf5f1ddadb4f3b89af896999e3299b873c2088c40cc55375af4e4f666e62a8dc49f9df2d39c146ad02b	1	2026-04-21 15:56:03.463	2026-04-14 15:56:03.464
341	01c66859449556345f6903b4a73749ee4a6d68bb4a978c7e82bce8c0911674bf4d8a2f0dcba3de2ea356e2a625cfd853	8	2026-06-08 07:04:09.005	2026-06-01 07:04:09.005
345	be8feaf60e7ef228550c3c1b3bb1534153beba0fca64229a6d6ab99d515effe7f7e36fb2cdcf285f57e406f58cc41546	9	2026-06-17 14:50:28.842	2026-06-10 14:50:28.843
42	63286261c13bb0f330a7abd5fe0e03290a1a6f238d9b6173a1cdbc0e3a1cf96fa11ba27e1c61061d714f58857442e88b	1	2026-01-11 07:54:55.226	2026-01-04 07:54:55.227
45	cee0af8d7572ef89ad01886748c35ee20fc771a1c0ca6faa1f901983dae94260285b00e630de48d355bb284386bb2fe2	1	2026-01-11 13:43:12.559	2026-01-04 13:43:12.56
46	5ecf0b781ab1fcd2d632d4240bd5547ea01fbb029ee784fd3dcaab91b4423419b3fdb0613cbc39c26e3bc67a85620d6d	1	2026-01-11 13:44:07.411	2026-01-04 13:44:07.412
354	0fb3d4e08640192fa645b9874d9c7af83e2b399cfcc589bb5bbc4e917e55cd05cc2f69acd3f701b9bf0820979e52c6d7	4	2026-06-17 19:01:23.433	2026-06-10 19:01:23.434
51	a5de57a7f72733de7f1660af22a2eeac7d68b173fd3a9f0dae6db66133ac51d84737ebc6b7e41836d3f2b2948dad0da0	1	2026-01-13 07:22:23.088	2026-01-06 07:22:23.089
52	9e14e076f1bf2a61c638e17322900e9fe1c13204357ff23edd82906ee078836281c74805a70924e5e4c12bc207e0233f	1	2026-01-13 08:00:16.668	2026-01-06 08:00:16.669
134	a5c03f25ad5dafd18b5dcc294a4c1238bd2a88884de83e22664a0f9190bbbb95fd010c1f168e6e9e601789bc6c170d5c	4	2026-03-01 21:55:37.026	2026-02-22 21:55:37.027
55	3d19a65d27197724cca6473737c95aa54d6e4a50789e7177f027bb77ddcb8939b6894d82d8d57141016114ef92d8fec5	4	2026-02-02 11:15:06.484	2026-01-26 11:15:06.485
135	10317ff84ec3a2f4a25e27c045d857e0cdec835fc7bba1f564f9bad82b7f5435921fc09c56f3ac455a45ea9870647270	1	2026-03-13 14:25:24.405	2026-03-06 14:25:24.407
136	65fafd1fe9bc31632c40645a4edc5b731c77ca8538f401cb414cea5f5cb40d6ae1b09e9aa4864215bd8e33384de74ee2	1	2026-04-01 14:46:43.332	2026-03-25 14:46:43.334
137	7911fc577ada1b2d19078eed95a4b46cef163147e89fabee43ea2f2bcf2d7e5dca87df38a1eca8db97fcb6cd6c54bc27	1	2026-04-01 14:46:55.889	2026-03-25 14:46:55.89
200	315bc916e14f1b564c4a6496d8d4dbe31f3b2199995fe85c20061d1224f5df490c878e13c0d23b1afb2033c173296ae3	4	2026-04-22 08:17:42.552	2026-04-15 08:17:42.553
62	e99abb693a6c309effefda7075ab7776f674bc7078e9bfcb780c4b0d0febe496d0e4446a0c032a82d9bb20e0557bad5a	1	2026-02-03 17:50:53.3	2026-01-27 17:50:53.301
63	7f285c1a74bec1d9e71453875914f87a0d8ca4ba73f634d8184f2c31964af285fa32462ba51181c017907e5d2c2e2ad5	1	2026-02-03 17:59:36.654	2026-01-27 17:59:36.655
67	474d61b6b62bb85b4eac6d69d39461a07cbe3e7537ca3edab67a65bda43516272e1a82581dbeefa01d6d32e1a50b7647	3	2026-02-05 13:16:16.369	2026-01-29 13:16:16.37
68	61db36dc2dd923bfd351e01b067c0246cfee9eb9db99266c8ead494d5a8cf9133aa6810ae85afa7fb7bf89960390ee39	1	2026-02-12 21:18:17.737	2026-02-05 21:18:17.739
69	af217272bc3cd3ee760539d5571e9d23c1d1376d38c85a39aa07d92e6bfe7ef70fce853f29960f4726a7a337399bf406	1	2026-02-12 21:29:40.531	2026-02-05 21:29:40.533
71	a762da13ad828a1f2d5d30284baceb914ffad83412dac2ada1d854327a01306d03416f7b85808700ad37457d2cb5cf6a	1	2026-02-13 17:53:17.143	2026-02-06 17:53:17.144
72	0b6bad8af8d00a2096fb67874114dee73c9c325a9caeab434efddeab13db1cadfd2ad1b741fa65b8ca3e2ab40b4129c3	1	2026-02-13 17:56:28.294	2026-02-06 17:56:28.295
73	07707054275b3204172aeca03d60376adc0f4fa3be351340f198b07e8c39ff0969d24680133290b026e4fc85e8f0c131	1	2026-02-15 12:17:51.793	2026-02-08 12:17:51.794
74	13228f8aa7e89f898dd012619705f4e4e3d2973a75e2e4def6963c2e88f88f39923e18994343e175b1bda97ef8905922	1	2026-02-15 12:23:33.146	2026-02-08 12:23:33.147
207	f700748bade46fa50db728262565c45a9e313cf1d3ce3a7e648bf55fc4f2ec9027b007d61235c106576e5d0e69730cfb	1	2026-04-22 14:29:23.313	2026-04-15 14:29:23.314
79	c08f95aeadfba4a10da52621a5fe674fcc790b05016cc0f8d8c7c5883c1c84b3b8b60921caad6a50f6344f341c197b2c	1	2026-02-21 13:15:28.924	2026-02-14 13:15:28.925
81	396ea9c853f59cb313a55d2b4f02f2e8768b079c992fb7692fea8adecce51b7a8af06fabcb64a79deab2d0ff91d81c26	1	2026-02-21 13:24:31.13	2026-02-14 13:24:31.131
82	9b1fda753cb1ac00c1db8ce6e8b4cdaeafb9c525812fc316ecb6fb822e7548b50ffe2835b0585aedc34cd0231ddcbad4	1	2026-02-21 13:24:48.305	2026-02-14 13:24:48.307
83	673d3662eca784fa0fb12241c8d66a0aa4bb8ef4be46b1f6c9af45c0e6a38abd2591f5b190b8caefe1550dcd0f26f0b1	1	2026-02-21 13:26:16.891	2026-02-14 13:26:16.892
84	62f6cc23d1a557767b665d23f90778c2418e67b7ef22b52ba063a8cd15dfe9845551ad05ea872c219311f9bc3aa4a9f5	1	2026-02-21 13:26:22.775	2026-02-14 13:26:22.776
85	920e937f6ccb570be9e28eb90fc1294ecc97a66ddced4bfad4b4ae292ff595771b52b46bb19f14887b7e90933a660622	1	2026-02-21 13:27:48.804	2026-02-14 13:27:48.805
86	fc8e2d30fe07deb2548a64b506c0420559beb9027a94f1d6a3f748ccbffe4dd55d2ca59427d89cfc62e4a286933f3f54	1	2026-02-21 13:28:10.367	2026-02-14 13:28:10.368
87	e0e03621183449a1af3a3bcf586652ed352982627fa44032466f43879bd147276da967e14f9253db49dd9c238f3a8513	1	2026-02-21 13:39:53.101	2026-02-14 13:39:53.103
212	6c63a980cc3588302c77a3ea72f2bd7f5e55604afee58f5ad5cf05389ce07a64976c2c13c71a41f16180fa0d4ccd1e8a	1	2026-04-22 19:24:29.581	2026-04-15 19:24:29.582
248	265a6b900762ff563967677cef0a3005aa0f7d4e345381046767426376e0f2e3f548d1cfa9d05fa1175f3ece3a6e228d	1	2026-04-27 18:10:12.658	2026-04-20 18:10:12.744
366	9ee8df676da4aa6315198c0f4f9f623d534e0c90a84d1e6b6f3cb2ca80dd2cd5bd64fe752994cfd6833a4e93307b3be1	9	2026-07-02 22:29:38.805	2026-06-25 22:29:38.806
258	3495fd37b8098a602c60f7e0ad75e798ab3953dbd8d9845df9bc5ace27bfa7768e2d3e2e4498c0467533216895705c30	1	2026-04-28 16:55:09.587	2026-04-21 16:55:09.588
272	6f798aa445eae25eecb340ee72be9ccfdce4d85df28ba72fd5905dd3ec5d4691f0a65b66fafe619f7e996f99e1f9e9ab	6	2026-05-03 18:37:56.671	2026-04-26 18:37:56.674
356	796e969620e718eaf130ff3d798a35297c70c9d9df3bff84f9c331dd999e7b178784a312d9b874a204b603c0e3543963	9	2026-06-17 19:03:37.559	2026-06-10 19:03:37.56
279	ce9096942a12bd2e6e4197b0a61569b426e4d420d6e2d5eadda37f6380a48b11b581b966d5ff3ff88d29b27f12a31329	1	2026-05-04 18:48:21.51	2026-04-27 18:48:21.511
360	6d31a58e8cf3c60ae284e04381a83ef0dd80a8540fdca1b2ebbe36745f5b3d7ea8a632c01540debb4ac87c1b6d8fbe97	4	2026-06-21 18:42:54.415	2026-06-14 18:42:54.416
283	814710a9a97f24694f353d1a044ccc274c97c141722d2012aa8db9bf865cd33ba84a01b9fdc3636b156b9c7b1a332864	3	2026-05-08 11:40:12.257	2026-05-01 11:40:12.258
\.


--
-- Data for Name: SeasonalFactor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SeasonalFactor" (id, name, "startDate", "endDate", multiplier, "cityId", "isActive", "createdAt") FROM stdin;
1	Easter discount 2026	2026-04-01 12:00:00	2026-04-15 12:00:00	0.9	\N	t	2026-04-03 21:46:59.321
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, "passwordHash", "firstName", "lastName", "phoneNumber", role, "createdAt", "updatedAt") FROM stdin;
4	johndoe@gmail.com	$2b$10$7wK1Qslc2hDd3gD0Mt4tWuNxzN6EtS8AJxTSCKqkvXj8NcN4xd09a	John	Doe	+37064769698	USER	2026-01-03 09:58:33.825	2026-04-25 14:29:28.466
8	dzonis.depas@gmail.com	$2b$10$U7H1522ZFatbHG3rBs4t1e5FHyviXROAJdCfRXZXxT58eJztqB6e.	DÅ¾onis	Depas	\N	USER	2026-04-16 11:39:52.92	2026-05-03 19:17:48.545
6	goodmatuxx@gmail.com	$2b$10$tmoKcWFsMPLTyQ1ozlMizuhgKJt6njK0aeUC2ZIBy6Ud2hG7k7IlC	Marius	MantvydÄ—nas	\N	USER	2026-04-03 18:46:33.076	2026-05-03 19:18:15.509
3	markas2@yahoo.com	$2b$10$kYMndY.umG0DGlvnF4.eWuLLqAT2y.nqEDMnG1u8FhDFYtAJ6JETG	Markas II	Liuteris	+370647769956	USER	2025-12-31 15:50:19.886	2026-05-03 19:18:53.314
2	dzeimsasbondas47@gmail.com	$2b$10$fvInwu81j1Rr4.ZiIk4OBO7FxOjjObToWDOIj.ijU3dvYM7zJ7jDy	dzeimsas	\N	\N	USER	2025-12-28 22:37:06.744	2026-05-03 19:19:18.333
1	ratai.admin67@gmail.com	$2b$10$iBNy27eaVjmkax2sgrrGhOg4.Yo0sx/L7YpgJSda75o2zxE88piZW	Matas	MotiejÅ«nas	\N	ADMIN	2025-12-28 22:37:06.327	2026-05-03 19:19:51.712
9	ratai.admin52@gmail.com	$2b$10$bRJ36deOOubXyZeTlfsS4.42qpkPVIdhXALCOcSx94v0AfqBkxOEy	Saulius	Prusaitis	\N	ADMIN	2026-05-03 19:20:51.267	2026-05-03 19:21:47.022
7	matasmtj@gmail.com	$2b$10$SL6QusHYfFfM8rIKgGDzHuISa3EfNMjJFqmErwPA2Y.mDMQxtsqfi	Matas	MotiejÅ«nas	064769956	USER	2026-04-03 20:41:05.296	2026-05-26 06:24:55.114
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
e24787a4-56ec-41c0-8d9a-6186d5cecfe5	0e512c6389b958b48842e61114c557eb988ebc8ee9a01321458f7ae1f0a559ba	2025-12-28 22:23:18.547029+00	20251228222317_init_complete	\N	\N	2025-12-28 22:23:18.250285+00	1
bb4d707e-77c0-431f-adee-1c8279137ae1	0465684468f4dcfd3bbb7f7fcd4ab13cb0ac492e0a98be5403f0833742b46cb6	2026-01-03 20:22:25.836902+00	20260103202225_add_sale_and_parts_features	\N	\N	2026-01-03 20:22:25.515766+00	1
81eb376c-40c4-472a-8a7c-90089e57b9c2	5f1bf33029af40e62221615388a332ab98892a83ee1d2057c33293d734e5da9f	2026-01-03 20:45:23.813794+00	20260103204523_add_sale_description	\N	\N	2026-01-03 20:45:23.400613+00	1
496866dd-ccf9-4c92-99d1-a47d0cb60a8b	b36df4d37a9254d3d9c55eaef1c82b5af80b9352b3ef357df445179f977d3854	2026-02-05 20:34:07.709603+00	20260205203407_add_dynamic_pricing	\N	\N	2026-02-05 20:34:07.373128+00	1
04ebbd77-af11-48c4-bde7-e8044019cc9f	3b8f8f93861d5c82dff5b9309b6425029125da7349eb4e22801af9f871d29d1c	2026-03-06 14:59:59.244751+00	20260306000000_remove_parts	\N	\N	2026-03-06 14:59:58.752859+00	1
9ab6b85b-4c77-44eb-9bc8-cd4fb3dd5e16	765495d6ad79a695dee3f78669b12ce077afb852c664eeacecfc5e71ddb3f095	2026-04-03 12:38:11.847937+00	20260403120000_password_reset_tokens	\N	\N	2026-04-03 12:38:11.366587+00	1
ce2820fd-5bcb-4151-8833-0ca0ffcbb5d0	f1dd0d397955dd459bba8bbfbac37c186a9f6f2f11d030e02c72526cbc1e2581	2026-04-04 07:10:37.978578+00	20260403140000_car_utilization_pricing	\N	\N	2026-04-04 07:10:37.602241+00	1
419368fc-6e55-4a76-86b7-65ec5edd0c4e	25962b27fcc242fb1716c08eaabb6b702b2dbbf5d8ad00fb9e291714dfdf30aa	2026-04-04 08:27:14.003794+00	20260403160000_car_prep_blocks	\N	\N	2026-04-04 08:27:13.534617+00	1
e90e35eb-90ad-4328-9502-130d3a4bb166	17289b66015afce1e07256f8403a1c677bf6e0e7ecea69e659c09ad0d661986d	2026-04-14 16:36:08.41681+00	20260414120000_add_contact_business_hours	\N	\N	2026-04-14 16:36:08.056059+00	1
257bd045-62d8-4b83-843c-4d879544a98d	557ec7774d2cfd9d7fb5d6a7e3b93b27669306d25f2f64092a46841768e5ea23	2026-05-25 12:33:21.330812+00	20260520120000_add_pricing_rule_car_junction	\N	\N	2026-05-25 12:33:20.939813+00	1
\.


--
-- Name: CarImage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CarImage_id_seq"', 30, true);


--
-- Name: CarPrepBlock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CarPrepBlock_id_seq"', 2, true);


--
-- Name: Car_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Car_id_seq"', 26, true);


--
-- Name: CityDemandMetrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CityDemandMetrics_id_seq"', 215, true);


--
-- Name: City_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."City_id_seq"', 4, true);


--
-- Name: ContactOperationArea_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ContactOperationArea_id_seq"', 58, true);


--
-- Name: Contact_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Contact_id_seq"', 1, true);


--
-- Name: Contract_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Contract_id_seq"', 44, true);


--
-- Name: LegalPageContent_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."LegalPageContent_id_seq"', 6, true);


--
-- Name: PartImage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PartImage_id_seq"', 1, true);


--
-- Name: Part_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Part_id_seq"', 1, true);


--
-- Name: PasswordResetToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PasswordResetToken_id_seq"', 13, true);


--
-- Name: PricingRule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PricingRule_id_seq"', 7, true);


--
-- Name: PricingSnapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PricingSnapshot_id_seq"', 80, true);


--
-- Name: RefreshToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."RefreshToken_id_seq"', 366, true);


--
-- Name: SeasonalFactor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."SeasonalFactor_id_seq"', 1, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."User_id_seq"', 9, true);


--
-- Name: CarImage CarImage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CarImage"
    ADD CONSTRAINT "CarImage_pkey" PRIMARY KEY (id);


--
-- Name: CarPrepBlock CarPrepBlock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CarPrepBlock"
    ADD CONSTRAINT "CarPrepBlock_pkey" PRIMARY KEY (id);


--
-- Name: Car Car_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Car"
    ADD CONSTRAINT "Car_pkey" PRIMARY KEY (id);


--
-- Name: CityDemandMetrics CityDemandMetrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CityDemandMetrics"
    ADD CONSTRAINT "CityDemandMetrics_pkey" PRIMARY KEY (id);


--
-- Name: City City_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."City"
    ADD CONSTRAINT "City_pkey" PRIMARY KEY (id);


--
-- Name: ContactOperationArea ContactOperationArea_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactOperationArea"
    ADD CONSTRAINT "ContactOperationArea_pkey" PRIMARY KEY (id);


--
-- Name: Contact Contact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contact"
    ADD CONSTRAINT "Contact_pkey" PRIMARY KEY (id);


--
-- Name: Contract Contract_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_pkey" PRIMARY KEY (id);


--
-- Name: LegalPageContent LegalPageContent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LegalPageContent"
    ADD CONSTRAINT "LegalPageContent_pkey" PRIMARY KEY (id);


--
-- Name: PartImage PartImage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PartImage"
    ADD CONSTRAINT "PartImage_pkey" PRIMARY KEY (id);


--
-- Name: Part Part_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Part"
    ADD CONSTRAINT "Part_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetToken PasswordResetToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);


--
-- Name: PricingRuleCar PricingRuleCar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingRuleCar"
    ADD CONSTRAINT "PricingRuleCar_pkey" PRIMARY KEY ("pricingRuleId", "carId");


--
-- Name: PricingRule PricingRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingRule"
    ADD CONSTRAINT "PricingRule_pkey" PRIMARY KEY (id);


--
-- Name: PricingSnapshot PricingSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingSnapshot"
    ADD CONSTRAINT "PricingSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: SeasonalFactor SeasonalFactor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SeasonalFactor"
    ADD CONSTRAINT "SeasonalFactor_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: CarImage_carId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CarImage_carId_idx" ON public."CarImage" USING btree ("carId");


--
-- Name: CarPrepBlock_carId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CarPrepBlock_carId_idx" ON public."CarPrepBlock" USING btree ("carId");


--
-- Name: CarPrepBlock_carId_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CarPrepBlock_carId_startDate_endDate_idx" ON public."CarPrepBlock" USING btree ("carId", "startDate", "endDate");


--
-- Name: Car_numberPlate_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Car_numberPlate_key" ON public."Car" USING btree ("numberPlate");


--
-- Name: Car_vin_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Car_vin_key" ON public."Car" USING btree (vin);


--
-- Name: CityDemandMetrics_cityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CityDemandMetrics_cityId_key" ON public."CityDemandMetrics" USING btree ("cityId");


--
-- Name: CityDemandMetrics_lastCalculated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CityDemandMetrics_lastCalculated_idx" ON public."CityDemandMetrics" USING btree ("lastCalculated");


--
-- Name: City_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "City_name_key" ON public."City" USING btree (name);


--
-- Name: ContactOperationArea_cityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactOperationArea_cityId_idx" ON public."ContactOperationArea" USING btree ("cityId");


--
-- Name: ContactOperationArea_contactId_cityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ContactOperationArea_contactId_cityId_key" ON public."ContactOperationArea" USING btree ("contactId", "cityId");


--
-- Name: ContactOperationArea_contactId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactOperationArea_contactId_idx" ON public."ContactOperationArea" USING btree ("contactId");


--
-- Name: LegalPageContent_pageKey_language_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LegalPageContent_pageKey_language_key" ON public."LegalPageContent" USING btree ("pageKey", language);


--
-- Name: PartImage_partId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PartImage_partId_idx" ON public."PartImage" USING btree ("partId");


--
-- Name: Part_make_model_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Part_make_model_idx" ON public."Part" USING btree (make, model);


--
-- Name: PasswordResetToken_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON public."PasswordResetToken" USING btree ("tokenHash");


--
-- Name: PasswordResetToken_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordResetToken_userId_idx" ON public."PasswordResetToken" USING btree ("userId");


--
-- Name: PricingRuleCar_carId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PricingRuleCar_carId_idx" ON public."PricingRuleCar" USING btree ("carId");


--
-- Name: PricingRule_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PricingRule_priority_idx" ON public."PricingRule" USING btree (priority);


--
-- Name: PricingRule_startDate_endDate_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PricingRule_startDate_endDate_isActive_idx" ON public."PricingRule" USING btree ("startDate", "endDate", "isActive");


--
-- Name: PricingSnapshot_carId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PricingSnapshot_carId_createdAt_idx" ON public."PricingSnapshot" USING btree ("carId", "createdAt");


--
-- Name: PricingSnapshot_cityId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PricingSnapshot_cityId_createdAt_idx" ON public."PricingSnapshot" USING btree ("cityId", "createdAt");


--
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- Name: SeasonalFactor_startDate_endDate_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SeasonalFactor_startDate_endDate_isActive_idx" ON public."SeasonalFactor" USING btree ("startDate", "endDate", "isActive");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: CarImage CarImage_carId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CarImage"
    ADD CONSTRAINT "CarImage_carId_fkey" FOREIGN KEY ("carId") REFERENCES public."Car"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CarPrepBlock CarPrepBlock_carId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CarPrepBlock"
    ADD CONSTRAINT "CarPrepBlock_carId_fkey" FOREIGN KEY ("carId") REFERENCES public."Car"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Car Car_cityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Car"
    ADD CONSTRAINT "Car_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES public."City"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CityDemandMetrics CityDemandMetrics_cityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CityDemandMetrics"
    ADD CONSTRAINT "CityDemandMetrics_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES public."City"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ContactOperationArea ContactOperationArea_cityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactOperationArea"
    ADD CONSTRAINT "ContactOperationArea_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES public."City"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ContactOperationArea ContactOperationArea_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactOperationArea"
    ADD CONSTRAINT "ContactOperationArea_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Contract Contract_carId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_carId_fkey" FOREIGN KEY ("carId") REFERENCES public."Car"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Contract Contract_editLockedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_editLockedByUserId_fkey" FOREIGN KEY ("editLockedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Contract Contract_pricingSnapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_pricingSnapshotId_fkey" FOREIGN KEY ("pricingSnapshotId") REFERENCES public."PricingSnapshot"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PartImage PartImage_partId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PartImage"
    ADD CONSTRAINT "PartImage_partId_fkey" FOREIGN KEY ("partId") REFERENCES public."Part"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PasswordResetToken PasswordResetToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PricingRuleCar PricingRuleCar_carId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingRuleCar"
    ADD CONSTRAINT "PricingRuleCar_carId_fkey" FOREIGN KEY ("carId") REFERENCES public."Car"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PricingRuleCar PricingRuleCar_pricingRuleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingRuleCar"
    ADD CONSTRAINT "PricingRuleCar_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES public."PricingRule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PricingRule PricingRule_carId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingRule"
    ADD CONSTRAINT "PricingRule_carId_fkey" FOREIGN KEY ("carId") REFERENCES public."Car"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PricingRule PricingRule_cityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingRule"
    ADD CONSTRAINT "PricingRule_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES public."City"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PricingSnapshot PricingSnapshot_carId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingSnapshot"
    ADD CONSTRAINT "PricingSnapshot_carId_fkey" FOREIGN KEY ("carId") REFERENCES public."Car"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PricingSnapshot PricingSnapshot_cityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingSnapshot"
    ADD CONSTRAINT "PricingSnapshot_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES public."City"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RefreshToken RefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SeasonalFactor SeasonalFactor_cityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SeasonalFactor"
    ADD CONSTRAINT "SeasonalFactor_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES public."City"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 0GdXtRyEegjbIj4tTMVSsXih7eexpeeMQvdiQT7Nrz7UCG0310TIF3r5SlB3KX6

