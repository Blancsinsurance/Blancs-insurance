-- ============================================================
-- quote_requests: separate SMS consent columns — run in Supabase SQL Editor
--
-- Twilio A2P 10DLC Error 30913 rejects campaigns whose opt-in flow
-- combines marketing consent with informational/transactional consent.
-- These two columns track each consent independently, matching the two
-- separate checkboxes now rendered on the quote form.
--
-- If an old combined `sms_consent` column exists from before this change,
-- it is left in place (not dropped) so no historical data is lost — the
-- app no longer reads or writes it.
-- ============================================================

alter table public.quote_requests
  add column if not exists sms_consent_informational boolean not null default false;

alter table public.quote_requests
  add column if not exists sms_consent_marketing boolean not null default false;

comment on column public.quote_requests.sms_consent_informational is
  'Opt-in for informational/transactional SMS (e.g., appointment reminders, policy updates). Independent of marketing consent — do not merge.';

comment on column public.quote_requests.sms_consent_marketing is
  'Opt-in for marketing/promotional SMS. Independent of informational consent — do not merge.';
