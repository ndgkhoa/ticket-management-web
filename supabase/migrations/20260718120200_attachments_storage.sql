-- Storage for ticket attachments. The `attachments` metadata table + its RLS already exist; this
-- adds the bucket and object-level policies. Public bucket keeps the demo simple (links resolve
-- without signing); a real deployment would go private + signed URLs. The `attachments` RLS still
-- governs who can discover the link.

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Any authenticated user may upload; the table's insert policy ties a file to a ticket the caller may touch.
create policy "attachments authenticated upload"
on storage.objects
for insert to authenticated
with check (bucket_id = 'attachments');

create policy "attachments authenticated read"
on storage.objects
for select to authenticated
using (bucket_id = 'attachments');

-- Only the uploader removes their own object (matches the table's delete policy intent).
create policy "attachments owner delete"
on storage.objects
for delete to authenticated
using (bucket_id = 'attachments' and owner = (select auth.uid()));
