-- Public bucket keeps demo links resolvable without signing; production would go private + signed
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "attachments authenticated upload"
on storage.objects
for insert to authenticated
with check (bucket_id = 'attachments');

create policy "attachments authenticated read"
on storage.objects
for select to authenticated
using (bucket_id = 'attachments');

create policy "attachments owner delete"
on storage.objects
for delete to authenticated
using (bucket_id = 'attachments' and owner = (select auth.uid()));
