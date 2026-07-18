-- Storage for ticket attachments. The `attachments` table (metadata) already exists with its
-- own RLS in the ticket-core migration; this adds the bucket the files live in and the
-- object-level policies.
--
-- Public bucket keeps the demo simple — links resolve without signing. A real deployment would
-- make it private and serve short-lived signed URLs; the `attachments` table RLS still governs
-- who can discover the link in the first place.

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Any authenticated user may upload into the bucket; the table's insert policy is what ties a
-- file to a ticket the caller may touch.
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
