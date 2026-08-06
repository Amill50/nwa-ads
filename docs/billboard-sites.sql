-- NWA Ads — billboard_sites table + seed data
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times; CREATE TABLE uses IF NOT EXISTS.

-- ── 1. Table ──────────────────────────────────────────────────────────────────

create table if not exists billboard_sites (
  id              uuid primary key default gen_random_uuid(),
  site_type       text not null check (site_type in ('existing', 'candidate')),
  -- links to shared/js/inventory.js device_id when this is an existing NWA-tracked billboard;
  -- null for candidates
  device_id       text,
  lat             double precision not null,
  lng             double precision not null,
  county          text,
  -- e.g. 'AR-102', 'I-49'; null if not on a known corridor
  road_corridor   text,
  -- e.g. 'Lamar Advertising', 'OUTFRONT Media'; null for candidates until an operator is involved
  sales_operator  text,
  landowner_name    text,
  landowner_address text,
  -- phone/email if ever sourced; public parcel records typically only have mailing address
  landowner_contact text,
  zoning_status   text,
  traffic_aadt    integer,
  notes           text,
  -- where this record's data came from, e.g. 'Benton County Assessor GIS'
  source          text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists billboard_sites_site_type_idx on billboard_sites (site_type);
create index if not exists billboard_sites_lat_lng_idx   on billboard_sites (lat, lng);

-- ── 2. RLS — matches campaigns table policy pattern ───────────────────────────
-- Authenticated users (admin) can read and write; anon cannot.
-- Service role (used for seeding) bypasses RLS automatically.

alter table billboard_sites enable row level security;

-- Drop and recreate so this script stays safe to re-run
drop policy if exists "Authenticated users can select billboard_sites" on billboard_sites;
drop policy if exists "Authenticated users can insert billboard_sites" on billboard_sites;
drop policy if exists "Authenticated users can update billboard_sites" on billboard_sites;
drop policy if exists "Authenticated users can delete billboard_sites" on billboard_sites;

create policy "Authenticated users can select billboard_sites"
  on billboard_sites for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert billboard_sites"
  on billboard_sites for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update billboard_sites"
  on billboard_sites for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete billboard_sites"
  on billboard_sites for delete
  using (auth.role() = 'authenticated');

-- ── 3. Seed — existing Lamar signs ────────────────────────────────────────────
-- 27 rows total: 15 Benton County (resolved landowner), 12 Washington County (unresolved).
-- device_id values match shared/js/inventory.js entries where media_owner contains "Lamar".
--
-- NOTE for site-scout map (future task): render pins color-coded by site_type.
-- 'existing' = competitor/Lamar inventory (informational); 'candidate' = open opportunity.

-- Skip seed if rows already exist so the script stays idempotent
do $$
begin
  if (select count(*) from billboard_sites where site_type = 'existing' and sales_operator = 'Lamar Advertising') = 0 then

    insert into billboard_sites
      (site_type, device_id, lat, lng, county, sales_operator, landowner_name, landowner_address, notes, source)
    values

      -- ── Benton County — resolved via gis.bentonvillear.com ArcGIS parcel service ──

      ('existing', '4058', 36.35672,   -94.21257, 'Benton', 'Lamar Advertising',
       'HILLCREST HOLDINGS LLC',         'PO BOX 564, JOHNSON AR 72741-0564',
       null, 'Benton County Assessor GIS'),

      ('existing', '4061', 36.335663,  -94.20546, 'Benton', 'Lamar Advertising',
       'MCCOY INVESTMENTS LLC',          '1111 SE 34TH ST, BENTONVILLE AR 72712-3714',
       null, 'Benton County Assessor GIS'),

      ('existing', '4209', 36.352894,  -94.17843, 'Benton', 'Lamar Advertising',
       'WAL-MART PROPERTIES INC 01-2741','WAL MART PROPERTY TAX DEPT, BENTONVILLE AR 72712-8050',
       'Sign sits on Walmart-owned land', 'Benton County Assessor GIS'),

      ('existing', '5623', 36.335484,  -94.22374, 'Benton', 'Lamar Advertising',
       'PARCEL STRATEGIES LLC',          '2900 PERCY MACHIN DR, NORTH LITTLE ROCK AR 72114',
       null, 'Benton County Assessor GIS'),

      ('existing', '4207', 36.361984,  -94.21726, 'Benton', 'Lamar Advertising',
       'TRI STATE REALTY CO',            '5315 N O ST, FORT SMITH AR 72904-7367',
       null, 'Benton County Assessor GIS'),

      ('existing', '4049', 36.35603,   -94.175095,'Benton', 'Lamar Advertising',
       'HWY 102 LLC',                   '12123 KNIS RD, LITTLE ROCK AR 72211-4109',
       'Entity name matches AR-102 corridor', 'Benton County Assessor GIS'),

      ('existing', '5812', 36.35759,   -94.25081, 'Benton', 'Lamar Advertising',
       'HOUPE, JEFF',                   '11086 AUDUBON RD, GRAVETTE AR 72736-9414',
       'Individual owner, not an entity', 'Benton County Assessor GIS'),

      ('existing', '4084', 36.267834,  -94.15085, 'Benton', 'Lamar Advertising',
       'ARKANSAS STATE HIGHWAY COMMISSION','PO BOX 2261, LITTLE ROCK AR 72203',
       'State-owned ROW parcel — different process than a private lease',
       'Benton County Assessor GIS'),

      ('existing', '4071', 36.28888,   -94.16002, 'Benton', 'Lamar Advertising',
       'DGS PROPERTY HOLDING LLC',      '26 MUSSELBURGH LN, BELLA VISTA AR 72715',
       null, 'Benton County Assessor GIS'),

      ('existing', '4062', 36.35646,   -94.19786, 'Benton', 'Lamar Advertising',
       'S & R INVESTMENTS LLC',         '4401 SW HOLLOWBROOK ST, BENTONVILLE AR 72713',
       null, 'Benton County Assessor GIS'),

      ('existing', '7073', 36.41947,   -94.22223, 'Benton', 'Lamar Advertising',
       'FOREST HILLS BOULEVARD LLC',    '535 OLD JOPPA RD, JOPPA MD 21085-1001',
       'Out-of-state owner', 'Benton County Assessor GIS'),

      ('existing', '4210', 36.245327,  -94.15188, 'Benton', 'Lamar Advertising',
       'ARKANSAS STATE HIGHWAY COMMISSION','PO BOX 2261, LITTLE ROCK AR 72203',
       'State-owned ROW parcel — different process than a private lease',
       'Benton County Assessor GIS'),

      ('existing', '4056', 36.333893,  -94.18484, 'Benton', 'Lamar Advertising',
       'QHOTELS LLC',                   '28 S WINDSOR DR, ROGERS AR 72758-9504',
       null, 'Benton County Assessor GIS'),

      ('existing', '5768', 36.1724,    -94.52395, 'Benton', 'Lamar Advertising',
       'OZARK MANAGEMENT COMPANY LLC',  '1980 W US 412 HWY, SILOAM SPRINGS AR 72761-3805',
       null, 'Benton County Assessor GIS'),

      ('existing', '4083', 36.180595,  -94.50763, 'Benton', 'Lamar Advertising',
       'RHODES DEVELOPMENT COMPANY LLC','PO BOX 779, CAPE GIRARDEAU MO 63702',
       'Out-of-state owner', 'Benton County Assessor GIS'),

      -- ── Washington County — unresolved (no public parcel REST endpoint located yet) ──

      ('existing', '5582', 36.16642,   -94.18617, 'Washington', 'Lamar Advertising',
       null, null, null, 'unresolved — needs Washington County lookup'),

      ('existing', '4065', 36.13918,   -94.14371, 'Washington', 'Lamar Advertising',
       null, null, null, 'unresolved — needs Washington County lookup'),

      ('existing', '4080', 36.148277,  -94.18623, 'Washington', 'Lamar Advertising',
       null, null, null, 'unresolved — needs Washington County lookup'),

      ('existing', '4201', 36.160744,  -94.18707, 'Washington', 'Lamar Advertising',
       null, null, null, 'unresolved — needs Washington County lookup'),

      ('existing', '4101', 36.15717,   -94.18575, 'Washington', 'Lamar Advertising',
       null, null, null, 'unresolved — needs Washington County lookup'),

      ('existing', '4067', 36.179935,  -94.17992, 'Washington', 'Lamar Advertising',
       null, null, null, 'unresolved — needs Washington County lookup'),

      ('existing', '4218', 36.17579,   -94.19152, 'Washington', 'Lamar Advertising',
       null, null, null, 'unresolved — needs Washington County lookup'),

      ('existing', '4052', 36.17553,   -94.17776, 'Washington', 'Lamar Advertising',
       null, null, null, 'unresolved — needs Washington County lookup'),

      ('existing', '4054', 36.198776,  -94.18195, 'Washington', 'Lamar Advertising',
       null, null, null, 'unresolved — needs Washington County lookup'),

      ('existing', '4220', 36.17077,   -94.138855,'Washington', 'Lamar Advertising',
       null, null, null, 'unresolved — needs Washington County lookup'),

      ('existing', '4074', 36.175827,  -94.19714, 'Washington', 'Lamar Advertising',
       null, null, null, 'unresolved — needs Washington County lookup'),

      ('existing', '4439', 36.045223,  -94.229416,'Washington', 'Lamar Advertising',
       null, null, null, 'unresolved — needs Washington County lookup');

  end if;
end $$;
