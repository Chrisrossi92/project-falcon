begin;

create or replace function public.amc_candidate_normalized_text(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(btrim(coalesce(p_value, '')), '');
$$;

create or replace function public.amc_candidate_normalized_state(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when upper(public.amc_candidate_normalized_text(p_value)) ~ '^[A-Z]{2}$'
      then upper(public.amc_candidate_normalized_text(p_value))
    else null
  end;
$$;

create or replace function public.amc_candidate_normalized_zip(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select substring(public.amc_candidate_normalized_text(p_value) from '^([0-9]{5})(?:-[0-9]{4})?$');
$$;

create or replace function public.amc_candidate_normalized_county(p_value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_county text;
begin
  v_county := lower(public.amc_candidate_normalized_text(p_value));
  if v_county is null then
    return null;
  end if;

  v_county := regexp_replace(v_county, '[^a-z0-9 ]+', ' ', 'g');
  v_county := regexp_replace(v_county, '\s+', ' ', 'g');
  v_county := regexp_replace(v_county, '\s+county$', '', 'i');
  v_county := nullif(btrim(v_county), '');

  return v_county;
end;
$$;

create or replace function public.amc_candidate_normalized_market(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    btrim(
      regexp_replace(
        lower(public.amc_candidate_normalized_text(p_value)),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

create or replace function public.amc_candidate_normalized_product_slug(p_value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_key text;
begin
  v_key := lower(public.amc_candidate_normalized_text(p_value));
  if v_key is null then
    return null;
  end if;

  v_key := regexp_replace(v_key, '[^a-z0-9]+', '_', 'g');
  v_key := regexp_replace(v_key, '(^_+|_+$)', '', 'g');

  return case v_key
    when 'appraisal' then 'appraisal'
    when 'restricted_appraisal' then 'restricted_appraisal'
    when 'restricted' then 'restricted_appraisal'
    when 'construction_draw' then 'construction_draw'
    when 'draw' then 'construction_draw'
    when 'draw_inspection' then 'construction_draw'
    when 'short_term_rental' then 'short_term_rental'
    when 'str' then 'short_term_rental'
    when 'residential' then 'residential'
    when 'commercial' then 'commercial'
    when 'industrial' then 'industrial'
    when 'multifamily' then 'multifamily'
    when 'multi_family' then 'multifamily'
    when 'land' then 'land'
    when 'review' then 'review'
    when 'appraisal_review' then 'review'
    else v_key
  end;
end;
$$;

create or replace function public.amc_candidate_order_product_slugs(
  p_report_type text,
  p_property_type text
)
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  v_report_key text;
  v_property_key text;
  v_property_slug text;
begin
  v_report_key := lower(public.amc_candidate_normalized_text(p_report_type));
  if v_report_key is not null then
    v_report_key := regexp_replace(v_report_key, '[^a-z0-9]+', '_', 'g');
    v_report_key := regexp_replace(v_report_key, '(^_+|_+$)', '', 'g');
  end if;

  v_property_key := lower(public.amc_candidate_normalized_text(p_property_type));
  if v_property_key is not null then
    v_property_key := regexp_replace(v_property_key, '[^a-z0-9]+', '_', 'g');
    v_property_key := regexp_replace(v_property_key, '(^_+|_+$)', '', 'g');
  end if;

  if v_report_key in ('restricted', 'restricted_appraisal') then
    return array['restricted_appraisal']::text[];
  end if;

  if v_report_key in ('construction_draw', 'draw', 'draw_inspection') then
    return array['construction_draw']::text[];
  end if;

  if v_report_key in ('review', 'appraisal_review') then
    return array['review']::text[];
  end if;

  if v_report_key in ('short_term_rental', 'str') then
    return array['short_term_rental']::text[];
  end if;

  v_property_slug := case v_property_key
    when 'residential' then 'residential'
    when 'commercial' then 'commercial'
    when 'industrial' then 'industrial'
    when 'multifamily' then 'multifamily'
    when 'multi_family' then 'multifamily'
    when 'land' then 'land'
    when 'short_term_rental' then 'short_term_rental'
    when 'str' then 'short_term_rental'
    when 'office' then 'commercial'
    when 'retail' then 'commercial'
    when 'mixed_use' then 'commercial'
    when 'special_purpose' then 'commercial'
    when 'medical_office' then 'commercial'
    when 'self_storage' then 'commercial'
    when 'hospitality' then 'commercial'
    when 'restaurant' then 'commercial'
    when 'auto_service' then 'commercial'
    when 'car_wash' then 'commercial'
    when 'gas_station_c_store' then 'commercial'
    when 'bank_branch' then 'commercial'
    when 'school_daycare' then 'commercial'
    when 'religious_facility' then 'commercial'
    when 'agricultural' then 'commercial'
    else null
  end;

  if v_property_slug is not null then
    return array[v_property_slug]::text[];
  end if;

  if v_report_key in ('appraisal', 'narrative', 'narrative_appraisal', 'form', 'form_appraisal') then
    return array['appraisal']::text[];
  end if;

  return '{}'::text[];
end;
$$;

revoke all on function public.amc_candidate_normalized_text(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_normalized_state(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_normalized_zip(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_normalized_county(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_normalized_market(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_normalized_product_slug(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_order_product_slugs(text, text) from public, anon, authenticated;

comment on function public.amc_candidate_normalized_text(text) is
  'AMC-6I idempotent reinstall of candidate helper. Shared trim/null helper for assignment candidate matching.';

comment on function public.amc_candidate_normalized_state(text) is
  'AMC-6I idempotent reinstall of candidate helper. Normalizes candidate matching state values to two-letter uppercase codes or null.';

comment on function public.amc_candidate_normalized_zip(text) is
  'AMC-6I idempotent reinstall of candidate helper. Normalizes candidate matching ZIP values to five digits or null.';

comment on function public.amc_candidate_normalized_county(text) is
  'AMC-6I idempotent reinstall of candidate helper. Normalizes county names for exact candidate matching.';

comment on function public.amc_candidate_normalized_market(text) is
  'AMC-6I idempotent reinstall of candidate helper. Normalizes market labels for exact text matching only.';

comment on function public.amc_candidate_normalized_product_slug(text) is
  'AMC-6I idempotent reinstall of candidate helper. Normalizes known Vendor Directory product labels/slugs to stable product slugs.';

comment on function public.amc_candidate_order_product_slugs(text, text) is
  'AMC-6I idempotent reinstall of candidate helper. Derives conservative vendor product slugs from order report/property fields. Does not create assignments, mutate orders, or change assignment behavior.';

commit;
