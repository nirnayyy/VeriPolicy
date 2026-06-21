-- Add metric fields to briefs table
alter table public.briefs add column if not exists citations_count integer not null default 0;
alter table public.briefs add column if not exists forecast_accuracy numeric(4, 2) not null default 0.00;

-- Update briefs table to ensure metrics are properly initialized
update public.briefs set citations_count = 0 where citations_count is null;
update public.briefs set forecast_accuracy = 0 where forecast_accuracy is null;

-- Create function to automatically sync profile metrics when briefs change
create or replace function public.sync_profile_metrics_on_brief_change()
returns trigger
language plpgsql
as $$
begin
  -- Update briefs_count and citations_count
  update public.profiles
  set
    briefs_count = (select count(*) from public.briefs where user_id = new.user_id),
    citations_count = (select coalesce(sum(citations_count), 0) from public.briefs where user_id = new.user_id),
    forecast_accuracy = (
      case 
        when (select count(*) from public.briefs where user_id = new.user_id and status = 'Published') > 0
        then (select round(avg(forecast_accuracy)::numeric, 2) from public.briefs where user_id = new.user_id and status = 'Published')
        else 0
      end
    ),
    updated_at = now()
  where id = new.user_id;
  return new;
end;
$$;

-- Drop existing triggers if they exist
drop trigger if exists briefs_sync_profile_metrics_insert on public.briefs;
drop trigger if exists briefs_sync_profile_metrics_update on public.briefs;
drop trigger if exists briefs_sync_profile_metrics_delete on public.briefs;

-- Create triggers to sync metrics on insert, update, and delete
create trigger briefs_sync_profile_metrics_insert
  after insert on public.briefs
  for each row execute function public.sync_profile_metrics_on_brief_change();

create trigger briefs_sync_profile_metrics_update
  after update on public.briefs
  for each row execute function public.sync_profile_metrics_on_brief_change();

create trigger briefs_sync_profile_metrics_delete
  after delete on public.briefs
  for each row execute function public.sync_profile_metrics_on_brief_change();
