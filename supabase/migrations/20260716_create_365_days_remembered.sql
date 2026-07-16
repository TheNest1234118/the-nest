-- ============================================================
-- THE NEST — 365 DAYS REMEMBERED
-- Initial secure database foundation
-- ============================================================

begin;

-- ============================================================
-- 1. INTERNAL AI EVALUATION FOR EACH VOICE CAPSULE
--
-- This table is intentionally server-only.
-- The browser must never be able to create or edit evaluations.
-- ============================================================

create table if not exists public.award_memo_evaluations (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  memo_id uuid not null
    references public.memos(id)
    on delete cascade,

  qualified boolean not null default false,

  quality_score integer not null default 0
    check (quality_score between 0 and 100),

  reflection_score integer not null default 0
    check (reflection_score between 0 and 100),

  personal_content_score integer not null default 0
    check (personal_content_score between 0 and 100),

  coherence_score integer not null default 0
    check (coherence_score between 0 and 100),

  originality_score integer not null default 0
    check (originality_score between 0 and 100),

  spam_score integer not null default 0
    check (spam_score between 0 and 100),

  transcript_word_count integer not null default 0
    check (transcript_word_count >= 0),

  duration_seconds integer not null default 0
    check (duration_seconds >= 0),

  reason text not null default '',

  model text not null default '',

  transcript_hash text,

  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint award_memo_evaluations_one_per_memo
    unique (memo_id)
);

create index if not exists
  award_memo_evaluations_user_id_idx
on public.award_memo_evaluations(user_id);

create index if not exists
  award_memo_evaluations_qualified_idx
on public.award_memo_evaluations(user_id, qualified);

create index if not exists
  award_memo_evaluations_evaluated_at_idx
on public.award_memo_evaluations(evaluated_at desc);


-- ============================================================
-- 2. QUALIFIED CALENDAR DAYS
--
-- One user can receive at most one qualified day per local date.
-- Multiple valid recordings on the same day still count as one.
-- ============================================================

create table if not exists public.award_qualified_days (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  local_date date not null,

  timezone text not null default 'Europe/Zurich',

  qualifying_memo_id uuid not null
    references public.memos(id)
    on delete cascade,

  evaluation_id uuid not null
    references public.award_memo_evaluations(id)
    on delete cascade,

  quality_score integer not null
    check (quality_score between 0 and 100),

  premium_active boolean not null default false,

  qualified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint award_qualified_days_one_per_user_date
    unique (user_id, local_date)
);

create index if not exists
  award_qualified_days_user_date_idx
on public.award_qualified_days(user_id, local_date desc);

create index if not exists
  award_qualified_days_memo_idx
on public.award_qualified_days(qualifying_memo_id);


-- ============================================================
-- 3. USER AWARD PROGRESS
-- ============================================================

create table if not exists public.award_progress (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  timezone text not null default 'Europe/Zurich',

  current_streak integer not null default 0
    check (current_streak >= 0),

  longest_streak integer not null default 0
    check (longest_streak >= 0),

  total_qualified_days integer not null default 0
    check (total_qualified_days >= 0),

  paid_premium_months integer not null default 0
    check (paid_premium_months >= 0),

  last_qualified_date date,

  streak_started_at date,

  award_unlocked boolean not null default false,

  award_unlocked_at timestamptz,

  award_order_status text not null default 'locked'
    check (
      award_order_status in (
        'locked',
        'available',
        'address_required',
        'address_confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 4. SUCCESSFULLY PAID PREMIUM MONTHS
--
-- Later populated by Stripe's invoice.paid webhook.
-- The same Stripe invoice can never count twice.
-- ============================================================

create table if not exists public.award_paid_months (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_invoice_id text not null,

  billing_period_start timestamptz,
  billing_period_end timestamptz,

  amount_paid integer not null default 0
    check (amount_paid >= 0),

  currency text not null default 'chf',

  paid_at timestamptz not null,
  created_at timestamptz not null default now(),

  constraint award_paid_months_unique_invoice
    unique (stripe_invoice_id)
);

create index if not exists
  award_paid_months_user_idx
on public.award_paid_months(user_id, paid_at desc);


-- ============================================================
-- 5. LATER AWARD ORDER / DELIVERY CONFIRMATION
--
-- No shipping logic is active yet.
-- This only prepares the future structure.
-- ============================================================

create table if not exists public.award_orders (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  status text not null default 'address_required'
    check (
      status in (
        'address_required',
        'address_confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
      )
    ),

  recipient_name text,

  address_line_1 text,
  address_line_2 text,
  postal_code text,
  city text,
  region text,
  country_code text,

  shipping_tracking_number text,
  shipping_carrier text,

  requested_at timestamptz not null default now(),
  address_confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint award_orders_one_per_user
    unique (user_id)
);


-- ============================================================
-- 6. SERVER AUDIT LOG
--
-- Every qualification and streak decision can be inspected later.
-- ============================================================

create table if not exists public.award_audit_log (
  id bigint generated always as identity primary key,

  user_id uuid
    references auth.users(id)
    on delete set null,

  memo_id uuid
    references public.memos(id)
    on delete set null,

  event_type text not null,

  details jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists
  award_audit_log_user_idx
on public.award_audit_log(user_id, created_at desc);

create index if not exists
  award_audit_log_memo_idx
on public.award_audit_log(memo_id);


-- ============================================================
-- 7. UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.set_award_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
  award_memo_evaluations_updated_at
on public.award_memo_evaluations;

create trigger award_memo_evaluations_updated_at
before update on public.award_memo_evaluations
for each row
execute function public.set_award_updated_at();


drop trigger if exists
  award_progress_updated_at
on public.award_progress;

create trigger award_progress_updated_at
before update on public.award_progress
for each row
execute function public.set_award_updated_at();


drop trigger if exists
  award_orders_updated_at
on public.award_orders;

create trigger award_orders_updated_at
before update on public.award_orders
for each row
execute function public.set_award_updated_at();


-- ============================================================
-- 8. RECALCULATE PROGRESS
--
-- Server-only helper. It counts qualified days, determines the
-- current consecutive chain and the longest chain.
-- ============================================================

create or replace function public.recalculate_award_progress(
  p_user_id uuid
)
returns public.award_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := 0;
  v_longest integer := 0;
  v_current integer := 0;
  v_last_date date := null;
  v_streak_start date := null;
  v_paid_months integer := 0;
  v_result public.award_progress;
begin
  select count(*)::integer, max(local_date)
  into v_total, v_last_date
  from public.award_qualified_days
  where user_id = p_user_id;

  select coalesce(max(group_length), 0)::integer
  into v_longest
  from (
    select count(*) as group_length
    from (
      select
        local_date,
        local_date
          - (
              row_number() over (
                order by local_date
              )
            )::integer as streak_group
      from public.award_qualified_days
      where user_id = p_user_id
    ) grouped_days
    group by streak_group
  ) streak_lengths;

  if v_last_date is not null then
    select
      count(*)::integer,
      min(local_date)
    into
      v_current,
      v_streak_start
    from (
      select
        local_date,
        local_date
          - (
              row_number() over (
                order by local_date
              )
            )::integer as streak_group
      from public.award_qualified_days
      where user_id = p_user_id
    ) all_groups
    where streak_group = (
      select latest_group
      from (
        select
          local_date,
          local_date
            - (
                row_number() over (
                  order by local_date
                )
              )::integer as latest_group
        from public.award_qualified_days
        where user_id = p_user_id
      ) latest_row
      order by local_date desc
      limit 1
    );
  end if;

  select count(*)::integer
  into v_paid_months
  from public.award_paid_months
  where user_id = p_user_id;

  insert into public.award_progress (
    user_id,
    current_streak,
    longest_streak,
    total_qualified_days,
    paid_premium_months,
    last_qualified_date,
    streak_started_at,
    award_unlocked,
    award_unlocked_at,
    award_order_status,
    updated_at
  )
  values (
    p_user_id,
    v_current,
    greatest(v_longest, v_current),
    v_total,
    v_paid_months,
    v_last_date,
    v_streak_start,
    v_current >= 365,
    case
      when v_current >= 365 then now()
      else null
    end,
    case
      when v_current >= 365 then 'available'
      else 'locked'
    end,
    now()
  )
  on conflict (user_id)
  do update set
    current_streak = excluded.current_streak,
    longest_streak = greatest(
      public.award_progress.longest_streak,
      excluded.longest_streak
    ),
    total_qualified_days = excluded.total_qualified_days,
    paid_premium_months = excluded.paid_premium_months,
    last_qualified_date = excluded.last_qualified_date,
    streak_started_at = excluded.streak_started_at,
    award_unlocked = excluded.award_unlocked,
    award_unlocked_at = case
      when public.award_progress.award_unlocked_at is not null
        then public.award_progress.award_unlocked_at
      else excluded.award_unlocked_at
    end,
    award_order_status = case
      when public.award_progress.award_order_status not in (
        'locked',
        'available'
      )
        then public.award_progress.award_order_status
      else excluded.award_order_status
    end,
    updated_at = now()
  returning *
  into v_result;

  return v_result;
end;
$$;


-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

alter table public.award_memo_evaluations
  enable row level security;

alter table public.award_qualified_days
  enable row level security;

alter table public.award_progress
  enable row level security;

alter table public.award_paid_months
  enable row level security;

alter table public.award_orders
  enable row level security;

alter table public.award_audit_log
  enable row level security;


-- Users may read only their own qualified days.

drop policy if exists
  "Users can read own award qualified days"
on public.award_qualified_days;

create policy
  "Users can read own award qualified days"
on public.award_qualified_days
for select
to authenticated
using (
  (select auth.uid()) = user_id
);


-- Users may read only their own progress.

drop policy if exists
  "Users can read own award progress"
on public.award_progress;

create policy
  "Users can read own award progress"
on public.award_progress
for select
to authenticated
using (
  (select auth.uid()) = user_id
);


-- Users may read their own paid-month records.

drop policy if exists
  "Users can read own paid award months"
on public.award_paid_months;

create policy
  "Users can read own paid award months"
on public.award_paid_months
for select
to authenticated
using (
  (select auth.uid()) = user_id
);


-- Users may read their own order status.
-- Address writing will later happen through a secure API.

drop policy if exists
  "Users can read own award order"
on public.award_orders;

create policy
  "Users can read own award order"
on public.award_orders
for select
to authenticated
using (
  (select auth.uid()) = user_id
);


-- No authenticated policies are created for:
-- award_memo_evaluations
-- award_audit_log
--
-- Therefore normal clients cannot read or modify those tables.


-- ============================================================
-- 10. DATABASE PRIVILEGES
-- ============================================================

revoke all
on table public.award_memo_evaluations
from anon, authenticated;

revoke all
on table public.award_audit_log
from anon, authenticated;


revoke insert, update, delete
on table public.award_qualified_days
from anon, authenticated;

revoke insert, update, delete
on table public.award_progress
from anon, authenticated;

revoke insert, update, delete
on table public.award_paid_months
from anon, authenticated;

revoke insert, update, delete
on table public.award_orders
from anon, authenticated;


grant select
on table public.award_qualified_days
to authenticated;

grant select
on table public.award_progress
to authenticated;

grant select
on table public.award_paid_months
to authenticated;

grant select
on table public.award_orders
to authenticated;


-- Only the service role may invoke progress recalculation.

revoke all
on function public.recalculate_award_progress(uuid)
from public, anon, authenticated;

grant execute
on function public.recalculate_award_progress(uuid)
to service_role;


-- The generic timestamp trigger is not intended as a public RPC.

revoke all
on function public.set_award_updated_at()
from public, anon, authenticated;


commit;