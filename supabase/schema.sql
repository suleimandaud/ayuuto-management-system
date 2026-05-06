-- Ayuuto/Hagbad Management System schema
-- Run this in Supabase SQL Editor after creating your project.

create extension if not exists "pgcrypto";

-- 1) Enums
create type public.user_role as enum ('admin', 'member');
create type public.group_frequency as enum ('weekly', 'monthly', 'custom');
create type public.group_status as enum ('active', 'completed', 'cancelled');
create type public.member_status as enum ('active', 'removed', 'completed');
create type public.round_status as enum ('pending', 'active', 'completed', 'cancelled');
create type public.payment_status as enum ('paid', 'unpaid', 'partial', 'late', 'cancelled', 'corrected');
create type public.payment_method as enum ('cash', 'bank', 'mobile_money', 'other');
create type public.payout_status as enum ('pending', 'received', 'cancelled', 'corrected');

-- 2) Tables
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text unique,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);

create table public.ayuuto_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount_per_member numeric(12,2) not null check (amount_per_member >= 0),
  frequency public.group_frequency not null default 'monthly',
  custom_interval_days integer check (custom_interval_days is null or custom_interval_days > 0),
  start_date date not null,
  status public.group_status not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.ayuuto_groups(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  phone text not null,
  status public.member_status not null default 'active',
  joined_at timestamptz not null default now(),
  unique (group_id, phone)
);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.ayuuto_groups(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  due_date date not null,
  receiver_member_id uuid references public.group_members(id) on delete set null,
  expected_total numeric(12,2) not null default 0,
  paid_total numeric(12,2) not null default 0,
  status public.round_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (group_id, round_number)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.ayuuto_groups(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  member_id uuid not null references public.group_members(id) on delete restrict,
  amount_due numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  payment_status public.payment_status not null default 'unpaid',
  payment_method public.payment_method,
  paid_date timestamptz,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, member_id)
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.ayuuto_groups(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  receiver_member_id uuid not null references public.group_members(id) on delete restrict,
  payout_amount numeric(12,2) not null default 0,
  payout_date timestamptz,
  received_status public.payout_status not null default 'pending',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  table_name text not null,
  record_id uuid,
  description text,
  created_at timestamptz not null default now()
);

-- 3) Helpful indexes
create index idx_group_members_group_id on public.group_members(group_id);
create index idx_group_members_profile_id on public.group_members(profile_id);
create index idx_rounds_group_id on public.rounds(group_id);
create index idx_payments_group_round on public.payments(group_id, round_id);
create index idx_payments_member_id on public.payments(member_id);
create index idx_payouts_group_id on public.payouts(group_id);

-- 4) Functions
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger payments_touch_updated_at
before update on public.payments
for each row execute function public.touch_updated_at();

create trigger payouts_touch_updated_at
before update on public.payouts
for each row execute function public.touch_updated_at();

create or replace function public.recalculate_round_paid_total(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rounds r
  set paid_total = coalesce((
    select sum(amount_paid)
    from public.payments p
    where p.round_id = p_round_id
      and p.payment_status not in ('cancelled', 'corrected')
  ), 0)
  where r.id = p_round_id;
end;
$$;

create or replace function public.payments_recalculate_round()
returns trigger
language plpgsql
as $$
begin
  perform public.recalculate_round_paid_total(coalesce(new.round_id, old.round_id));
  return coalesce(new, old);
end;
$$;

create trigger payments_after_insert_update
after insert or update on public.payments
for each row execute function public.payments_recalculate_round();

-- Generate rounds, default unpaid payment rows, and payout rows from active members.
-- Receiver order follows member joined_at order.
create or replace function public.generate_group_rounds(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.ayuuto_groups%rowtype;
  v_member_count integer;
  v_member public.group_members%rowtype;
  v_round_id uuid;
  v_round_number integer := 0;
  v_due_date date;
  v_expected_total numeric(12,2);
begin
  if not public.is_admin() then
    raise exception 'Only admins can generate rounds';
  end if;

  select * into v_group from public.ayuuto_groups where id = p_group_id;
  if not found then
    raise exception 'Group not found';
  end if;

  select count(*) into v_member_count
  from public.group_members
  where group_id = p_group_id and status = 'active';

  if v_member_count = 0 then
    raise exception 'Add active members before generating rounds';
  end if;

  v_expected_total := v_member_count * v_group.amount_per_member;

  for v_member in
    select * from public.group_members
    where group_id = p_group_id and status = 'active'
    order by joined_at asc, full_name asc
  loop
    v_round_number := v_round_number + 1;

    if v_group.frequency = 'weekly' then
      v_due_date := (v_group.start_date + ((v_round_number - 1) * interval '7 days'))::date;
    elsif v_group.frequency = 'monthly' then
      v_due_date := (v_group.start_date + ((v_round_number - 1) * interval '1 month'))::date;
    else
      v_due_date := v_group.start_date + ((v_round_number - 1) * coalesce(v_group.custom_interval_days, 30));
    end if;

    insert into public.rounds (
      group_id, round_number, due_date, receiver_member_id, expected_total, paid_total, status
    ) values (
      p_group_id,
      v_round_number,
      v_due_date,
      v_member.id,
      v_expected_total,
      0,
      case when v_round_number = 1 then 'active'::public.round_status else 'pending'::public.round_status end
    )
    on conflict (group_id, round_number) do update
      set due_date = excluded.due_date,
          receiver_member_id = excluded.receiver_member_id,
          expected_total = excluded.expected_total
    returning id into v_round_id;

    insert into public.payments (group_id, round_id, member_id, amount_due, amount_paid, payment_status, created_by)
    select p_group_id, v_round_id, gm.id, v_group.amount_per_member, 0, 'unpaid', auth.uid()
    from public.group_members gm
    where gm.group_id = p_group_id and gm.status = 'active'
    on conflict (round_id, member_id) do nothing;

    insert into public.payouts (group_id, round_id, receiver_member_id, payout_amount, received_status, created_by)
    values (p_group_id, v_round_id, v_member.id, v_expected_total, 'pending', auth.uid())
    on conflict (round_id) do update
      set receiver_member_id = excluded.receiver_member_id,
          payout_amount = excluded.payout_amount;
  end loop;
end;
$$;

create or replace function public.sync_my_member_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  select phone into v_phone from auth.users where id = auth.uid();

  insert into public.profiles (id, phone, role)
  values (auth.uid(), v_phone, 'member')
  on conflict (id) do update set phone = coalesce(profiles.phone, excluded.phone);

  update public.group_members
  set profile_id = auth.uid()
  where profile_id is null
    and phone = v_phone;
end;
$$;

-- Optional helper: make the first admin manually after their first OTP login.
-- update public.profiles set role = 'admin', full_name = 'Admin Name' where phone = '+25261xxxxxxx';

-- 5) RLS
alter table public.profiles enable row level security;
alter table public.ayuuto_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.rounds enable row level security;
alter table public.payments enable row level security;
alter table public.payouts enable row level security;
alter table public.activity_logs enable row level security;

-- profiles
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- ayuuto_groups
create policy "groups_admin_all"
on public.ayuuto_groups for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "groups_member_select_joined"
on public.ayuuto_groups for select
to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = ayuuto_groups.id
      and gm.profile_id = auth.uid()
  )
);

-- group_members
create policy "group_members_admin_all"
on public.group_members for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "group_members_member_select_own"
on public.group_members for select
to authenticated
using (profile_id = auth.uid());

-- rounds
create policy "rounds_admin_all"
on public.rounds for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "rounds_member_select_joined_group"
on public.rounds for select
to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = rounds.group_id
      and gm.profile_id = auth.uid()
  )
);

-- payments. No delete policy: payment history should not be permanently deleted from the app.
create policy "payments_admin_all"
on public.payments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "payments_member_select_own"
on public.payments for select
to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.id = payments.member_id
      and gm.profile_id = auth.uid()
  )
);

-- payouts
create policy "payouts_admin_all"
on public.payouts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "payouts_member_select_joined_group"
on public.payouts for select
to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = payouts.group_id
      and gm.profile_id = auth.uid()
  )
);

-- activity logs
create policy "activity_logs_admin_all"
on public.activity_logs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "activity_logs_user_select_own"
on public.activity_logs for select
to authenticated
using (user_id = auth.uid());

-- 6) Activity logging helper triggers for payments/payouts
create or replace function public.log_payment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs (user_id, action, table_name, record_id, description)
  values (
    auth.uid(),
    TG_OP,
    'payments',
    coalesce(new.id, old.id),
    concat('Payment ', lower(TG_OP), ' for round ', coalesce(new.round_id, old.round_id))
  );
  return coalesce(new, old);
end;
$$;

create trigger log_payment_insert_update
after insert or update on public.payments
for each row execute function public.log_payment_change();

create or replace function public.log_payout_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs (user_id, action, table_name, record_id, description)
  values (
    auth.uid(),
    TG_OP,
    'payouts',
    coalesce(new.id, old.id),
    concat('Payout ', lower(TG_OP), ' for round ', coalesce(new.round_id, old.round_id))
  );
  return coalesce(new, old);
end;
$$;

create trigger log_payout_insert_update
after insert or update on public.payouts
for each row execute function public.log_payout_change();
