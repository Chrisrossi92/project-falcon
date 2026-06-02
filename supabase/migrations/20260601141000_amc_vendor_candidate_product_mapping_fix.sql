begin;

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

revoke all on function public.amc_candidate_order_product_slugs(text, text) from public, anon, authenticated;

comment on function public.amc_candidate_order_product_slugs(text, text) is
  'AMC-5D.1 patch. Derives conservative vendor product slugs from order report/property fields for candidate matching, including literal commercial and common appraisal/review/draw/STR labels. Does not create assignments, mutate orders, or change assignment behavior.';

commit;
