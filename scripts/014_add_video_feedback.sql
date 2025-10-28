-- Add video feedback system for admins to give feedback to creators

-- Create video_feedback table
create table if not exists public.video_feedback (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid not null references public.videos(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  feedback text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add index for faster queries
create index if not exists idx_video_feedback_video_id on public.video_feedback(video_id);
create index if not exists idx_video_feedback_admin_id on public.video_feedback(admin_id);

-- Enable RLS
alter table public.video_feedback enable row level security;

-- RLS Policies

-- Company admins can view feedback for videos in their company
create policy "Company admins can view feedback for their videos"
  on public.video_feedback for select
  using (
    exists (
      select 1 from public.videos
      join public.profiles on profiles.company_id = videos.company_id
      where videos.id = video_feedback.video_id
      and profiles.id = auth.uid()
      and profiles.role = 'company_admin'
    )
  );

-- Creators can view feedback for their own videos
create policy "Creators can view feedback for their videos"
  on public.video_feedback for select
  using (
    exists (
      select 1 from public.videos
      join public.creators on creators.id = videos.creator_id
      where videos.id = video_feedback.video_id
      and creators.user_id = auth.uid()
    )
  );

-- Company admins can insert feedback
create policy "Company admins can insert feedback"
  on public.video_feedback for insert
  with check (
    exists (
      select 1 from public.videos
      join public.profiles on profiles.company_id = videos.company_id
      where videos.id = video_feedback.video_id
      and profiles.id = auth.uid()
      and profiles.role = 'company_admin'
    )
  );

-- Company admins can update their own feedback
create policy "Company admins can update their own feedback"
  on public.video_feedback for update
  using (admin_id = auth.uid());

-- Company admins can delete their own feedback
create policy "Company admins can delete their own feedback"
  on public.video_feedback for delete
  using (admin_id = auth.uid());

-- Create function to update updated_at timestamp
create or replace function update_video_feedback_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
drop trigger if exists trigger_update_video_feedback_updated_at on public.video_feedback;
create trigger trigger_update_video_feedback_updated_at
  before update on public.video_feedback
  for each row
  execute function update_video_feedback_updated_at();

comment on table public.video_feedback is 'Stores feedback from company admins to creators about their videos';
comment on column public.video_feedback.video_id is 'Reference to the video being given feedback';
comment on column public.video_feedback.admin_id is 'Admin who gave the feedback';
comment on column public.video_feedback.feedback is 'The feedback message';
