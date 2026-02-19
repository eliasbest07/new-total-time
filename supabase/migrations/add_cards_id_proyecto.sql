-- Relaciona cards con proyecto en pizarras de organización.
-- Esto permite separar card de pizarra base (id_proyecto NULL)
-- vs card de pizarra de proyecto (id_proyecto = <id>).

alter table public.cards
add column if not exists id_proyecto bigint null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cards_id_proyecto_fkey'
  ) then
    alter table public.cards
    add constraint cards_id_proyecto_fkey
    foreign key (id_proyecto)
    references public.proyecto (id)
    on delete set null;
  end if;
end $$;

create index if not exists idx_cards_pizarra_proyecto
on public.cards (id_pizarra, id_proyecto);
