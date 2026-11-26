-- A block that renders the "leave a review" form, so the page keeps its shape:
-- everything a visitor sees on a page is an ordered block the owner can move,
-- retitle or hide (see 0009-page-blocks-for-editable-content.md). Hard-coding
-- the form into the reviews route would have been the one exception, and an
-- exception is what the block system exists to avoid.
--
-- Run the two halves separately. PostgreSQL will not let a transaction use an
-- enum value it added itself, so the insert cannot sit with the alter.

-- === run on its own ===
alter type public.block_type add value if not exists 'review_form';

-- === then run this ===
insert into public.page_blocks (page_slug, block_type, sort_order, is_visible, content)
select 'reviews', 'review_form', 2, true, jsonb_build_object(
  'eyebrow', 'Ваша думка',
  'title',   'Залиште відгук',
  'lead',    'Поставте оцінку — і, якщо захочете, розкажіть, як минув візит.',
  'note',    'Відгук з''явиться на сайті після перевірки адміністратором.'
)
where not exists (
  select 1 from public.page_blocks
   where page_slug = 'reviews' and block_type = 'review_form'
);
