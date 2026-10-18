-- Keep campaign destinations compatible with the admin form while rejecting unsafe or malformed values.
-- Internal destinations must be local absolute paths and use the same safe character set
-- enforced by the campaign editor. External destinations must be non-empty HTTPS URLs.
alter table public.ad_campaigns
  drop constraint if exists ad_campaign_destination_valid;

alter table public.ad_campaigns
  add constraint ad_campaign_destination_valid
  check (
    (destination_url ~* '^https://[^[:space:]]+$')
    or (
      destination_url !~ '^//'
      and destination_url ~ '^/[A-Za-z0-9/_?&=.%#-]*$'
    )
  );
