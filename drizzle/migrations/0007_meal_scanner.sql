-- Private scan drafts and conservative project-wide quota reservations.
alter table public.foods add column image_path text;
alter table public.food_logs add column image_path text;
alter table public.food_logs add column nutrition_source text;
create table public.meal_scans (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), state text not null default 'processing' check(state in('processing','ready','saved','failed','expired')),
 result jsonb, log_ids uuid[], reserved_tokens int not null default 10240
);
create index meal_scans_date on public.meal_scans(created_at);
create index meal_scans_owner on public.meal_scans(user_id,created_at);
alter table public.meal_scans enable row level security;
grant select,insert,update,delete on public.meal_scans to service_role;
create table public.meal_scan_gate(id int primary key check(id=1),blocked_until timestamptz);
insert into public.meal_scan_gate(id) values(1);
alter table public.meal_scan_gate enable row level security;
grant select,update on public.meal_scan_gate to service_role;
create or replace function public.reserve_meal_scan(p_user uuid,p_request uuid,p_daily int,p_personal int,p_rpm int,p_tpm int,p_preview boolean default false) returns jsonb
language plpgsql security definer set search_path=public as $$
declare start_day timestamptz; reset_at timestamptz; block_at timestamptz; total int; personal int; minute_count int; tokens bigint; existing public.meal_scans;
begin
 if p_daily not between 1 and 1000 or p_personal not between 1 and 100 or p_rpm not between 1 and 60 or p_tpm not between 10240 and 1000000 then raise exception 'Invalid scan allowance'; end if;
 perform pg_advisory_xact_lock(730726001);
 start_day := date_trunc('day', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles';
 reset_at := (date_trunc('day',now() at time zone 'America/Los_Angeles')+interval '1 day') at time zone 'America/Los_Angeles';
 select * into existing from meal_scans where id=p_request;
 if found then
   if existing.user_id<>p_user then raise exception 'Invalid scan request'; end if;
   return jsonb_build_object('allowed',true,'existing',true,'state',existing.state,'result',existing.result,'scan_id',existing.id);
 end if;
 select blocked_until into block_at from meal_scan_gate where id=1;
 select count(*),count(*) filter(where user_id=p_user) into total,personal from meal_scans where created_at>=start_day;
 select count(*),coalesce(sum(reserved_tokens),0) into minute_count,tokens from meal_scans where created_at>now()-interval '1 minute';
 if block_at>now() or total>=p_daily or personal>=p_personal then return jsonb_build_object('allowed',false,'retry_at',greatest(reset_at,block_at),'remaining',0); end if;
 if minute_count>=p_rpm or tokens+10240>p_tpm then return jsonb_build_object('allowed',false,'retry_at',now()+interval '1 minute','remaining',greatest(0,least(p_daily-total,p_personal-personal))); end if;
 if p_preview then return jsonb_build_object('allowed',true,'remaining',least(p_daily-total,p_personal-personal)); end if;
 -- Expire draft content; retain only reservation metadata for accurate accounting.
 update meal_scans set result=null,state='expired' where state in('ready','processing') and created_at<now()-interval '24 hours';
 insert into meal_scans(id,user_id) values(p_request,p_user);
 return jsonb_build_object('allowed',true,'scan_id',p_request,'remaining',least(p_daily-total,p_personal-personal)-1);
end; $$;
revoke all on function public.reserve_meal_scan(uuid,uuid,int,int,int,int,boolean) from public,anon,authenticated;
grant execute on function public.reserve_meal_scan(uuid,uuid,int,int,int,int,boolean) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('meal-photos','meal-photos',false,524288,array['image/jpeg']);
create policy "Read own meal photos" on storage.objects for select to authenticated using(bucket_id='meal-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Upload own meal photos" on storage.objects for insert to authenticated with check(bucket_id='meal-photos' and (storage.foldername(name))[1]=auth.uid()::text);
-- Users can remove uncommitted uploads, but saved diary/library pictures remain intact.
create policy "Remove unsaved meal photos" on storage.objects for delete to authenticated using(bucket_id='meal-photos' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.foods f where f.image_path=name) and not exists(select 1 from public.food_logs l where l.image_path=name));

create or replace function public.save_scanned_meal(p_scan uuid,p_items jsonb,p_meal text,p_date date,p_image text) returns uuid[]
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); draft public.meal_scans; item jsonb; food public.foods; fid uuid; qty numeric; kcal numeric; protein numeric; carbs numeric; fat numeric; new_id uuid; ids uuid[]:='{}'; label text; units text;
begin
 if u is null then raise exception 'Authentication required'; end if;
 select * into draft from meal_scans where id=p_scan and user_id=u for update;
 if not found then raise exception 'Scan not found'; end if;
 if draft.state='saved' then return draft.log_ids; end if;
 if draft.state<>'ready' or draft.created_at<now()-interval '24 hours' then raise exception 'Scan expired. Please scan your meal again.'; end if;
 if p_meal not in('breakfast','lunch','dinner','snack') or p_meal is null or p_date is null or p_date>current_date+1 then raise exception 'Invalid meal or date'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 8 then raise exception 'Choose between one and eight foods'; end if;
 if p_image is null or p_image<>u::text||'/'||p_scan::text||'.jpg' or not exists(select 1 from storage.objects where bucket_id='meal-photos' and name=p_image) then raise exception 'Upload your meal photo before saving'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,7307));
 for item in select value from jsonb_array_elements(p_items) loop
  label:=trim(item->>'name'); units:=item->>'unit'; qty:=(item->>'quantity')::numeric;
  if label is null or length(label) not between 1 and 100 or units is null or units not in('g','mL','serving','piece','cup','tbsp') or qty is null or qty not between 0.01 and 10000 then raise exception 'Invalid food portion'; end if;
  fid:=nullif(item->>'food_id','')::uuid;
  if fid is not null then
    select * into food from foods where id=fid and (is_system_food or created_by=u);
    if not found or food.serving_unit<>units then raise exception 'Food match is no longer available. Review the food again.'; end if;
  else
    -- Exact-name reuse prevents duplicate personal foods on subsequent scans.
    select * into food from foods where (is_system_food or created_by=u) and lower(trim(name))=lower(label) and serving_unit=units order by is_system_food desc,created_at limit 1;
    if not found then
      kcal:=(item->>'calories')::numeric; protein:=(item->>'protein')::numeric; carbs:=(item->>'carbs')::numeric; fat:=(item->>'fat')::numeric;
      if kcal is null or kcal not between 0 and 10000 or protein is null or protein not between 0 and 999 or carbs is null or carbs not between 0 and 999 or fat is null or fat not between 0 and 999 then raise exception 'Invalid estimated nutrition'; end if;
      insert into foods(created_by,name,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g,source_note,is_system_food,image_path)
      values(u,label,qty,units,kcal,protein,carbs,fat,'AI-estimated meal photo; reviewed by user',false,p_image) returning * into food;
    end if;
  end if;
  insert into food_logs(user_id,food_id,food_name_snapshot,meal_type,log_date,quantity,unit,serving_multiplier,calories_snapshot,protein_snapshot_g,carbs_snapshot_g,fat_snapshot_g,image_path,nutrition_source)
  values(u,food.id,food.name,p_meal,p_date,qty,units,qty/food.serving_size,food.calories*qty/food.serving_size,food.protein_g*qty/food.serving_size,food.carbs_g*qty/food.serving_size,food.fat_g*qty/food.serving_size,p_image,case when food.source_note like 'AI-estimated%' then 'ai_estimate' else 'library_match' end) returning id into new_id;
  ids:=array_append(ids,new_id);
 end loop;
 update meal_scans set state='saved',log_ids=ids,result=null where id=p_scan;
 return ids;
end; $$;
revoke all on function public.save_scanned_meal(uuid,jsonb,text,date,text) from public,anon;
grant execute on function public.save_scanned_meal(uuid,jsonb,text,date,text) to authenticated;
NOTIFY pgrst,'reload schema';

-- Called opportunistically by the server; never remove a committed food/diary image.
create or replace function public.unused_meal_photos(p_user uuid) returns text[]
language sql security definer set search_path=public as $$
 select coalesce(array_agg(name),'{}'::text[]) from (
   select o.name from storage.objects o where o.bucket_id='meal-photos'
   and (storage.foldername(o.name))[1]=p_user::text and o.created_at<now()-interval '24 hours'
   and not exists(select 1 from foods f where f.image_path=o.name)
   and not exists(select 1 from food_logs l where l.image_path=o.name)
   limit 100
 ) orphaned;
$$;
revoke all on function public.unused_meal_photos(uuid) from public,anon,authenticated;
grant execute on function public.unused_meal_photos(uuid) to service_role;
