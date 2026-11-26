-- The "Локації та Чан" page goes. It showed the same catalogue block as the
-- pricing page and the home page, so it was a third copy of one list with no
-- answer to "which of these should I read?".
--
-- Its block goes with it by cascade. Nothing is lost that is not already on
-- /pricing, which shows the same cards with their prices.
--
-- The hero's second button pointed at it and would otherwise have become a
-- dead link; it now points where the content actually lives.
update public.page_blocks
   set content = jsonb_set(
         content,
         '{secondaryCta}',
         jsonb_build_object('label', 'Локації та ціни', 'href', '/pricing')
       )
 where block_type = 'hero'
   and content -> 'secondaryCta' ->> 'href' = '/locations';

delete from public.pages where slug = 'locations';

-- The price cards get a booking button; the home page catalogue does not.
-- On the home page the card is an introduction, and the hero already carries
-- the call to book.
update public.page_blocks
   set content = content || '{"showBooking": true}'::jsonb
 where page_slug = 'pricing'
   and block_type = 'locations';
