-- Private certificates bucket stub. No uploads in this slice.

insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do nothing;
