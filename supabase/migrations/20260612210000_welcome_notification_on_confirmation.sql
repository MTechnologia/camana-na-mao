-- NREF055: enviar a notificação (e e-mail) de boas-vindas SOMENTE após a
-- confirmação do e-mail, e não na finalização do cadastro.
--
-- Antes: a Edge Function `complete-registration` inseria a notificação de
-- boas-vindas ao concluir o cadastro (antes da confirmação). Como o webhook de
-- `notifications` (INSERT) dispara o `send-web-push`, o e-mail de boas-vindas
-- chegava junto/antes do e-mail de confirmação, gerando confusão (usuário
-- clicava no e-mail errado).
--
-- Agora: um trigger em `auth.users` insere a notificação de boas-vindas apenas
-- quando `email_confirmed_at` deixa de ser nulo (i.e., no momento da
-- confirmação). Idempotente por natureza (a transição ocorre uma única vez).

create or replace function public.notify_welcome_on_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Dispara apenas na transição null -> confirmado.
  if (old.email_confirmed_at is null and new.email_confirmed_at is not null) then
    insert into public.notifications (user_id, title, message, type, priority)
    values (
      new.id,
      'Bem-vindo(a) à Câmara Municipal!',
      'Agora você pode acompanhar audiências públicas, fazer relatos de transporte e urbanos, ver serviços perto de você e muito mais. Acesse o menu para explorar.',
      'system',
      'normal'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_welcome_on_confirmation on auth.users;

create trigger trg_notify_welcome_on_confirmation
after update of email_confirmed_at on auth.users
for each row
execute function public.notify_welcome_on_confirmation();
