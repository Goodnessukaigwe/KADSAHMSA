-- After you register, run this in the Supabase SQL editor (replace the email).
-- Required so /admin opens: middleware allows only content_admin or super_admin.

insert into public.user_roles (user_id, role_id)
select id, 'super_admin'
from auth.users
where email = 'you@example.com'
on conflict (user_id, role_id) do nothing;
