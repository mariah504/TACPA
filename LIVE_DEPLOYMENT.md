# TACPA live registration deployment

Verified November 16, 2026 (America/Chicago).

The production domain https://jointacpa.com is hosted by the existing Sites project `appgprj_6af78b8b0c8481918747b7a706f5793d`, not this GitHub repository. Changes to the root index.html do not deploy that domain.

Production source repository: https://git.chatgpt-team.site/9bc4d63e-9964-4acc-99d8-4882820b6fcc/appgprj_6af78b8b0c8481918747b7a706f5793d.git
Production source commit: 0d305ae012822993d9aacf9518f2f76f83d0af51
Sites version: 3.

The public form POSTs to /signup. The server validates origin, size, parent name, email, team length and explicit consent; it forwards to JOINTACPA Supabase Edge Function tacpa-signup. The function validates and writes public.tacpa_registrations using a server-only service credential. Confirmation requires a persisted UUID. Duplicate emails return 409 without exposing the existing UUID. The public table has RLS and no anonymous/authenticated grants or policies.

Supabase project: hdgnvgdpyqxnuvubnvlu (JOINTACPA). Firebase is not used. Phone and athlete_name are nullable because the live form does not collect them. Added volunteer_interest, source, is_test columns and a unique lower(email) index. Four prior D1 records were copied with original IDs/timestamps and source=prior_live_site. Prior records lack checkbox consent evidence, so consent_to_contact remains false. Old D1 data is preserved; new submissions use Supabase only.

Manage records in Supabase Table Editor. Filter is_test=false, sort created_at descending, and update status using new/contacted/approved/declined. No automated email or payment processing is configured.

The www hostname returned HTTP 503 during verification and is not an attached custom domain. Share the apex URL until DNS and custom-hostname configuration are completed.

The deployed function source is retained here for maintenance. Deploying it requires authorized Supabase access. Never commit credentials. Use the Sites source repository and native version deployment workflow for live website changes; do not repoint DNS to this repository as part of a routine code update.
