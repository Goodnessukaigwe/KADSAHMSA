# Live chat

One black launcher (bottom right, draggable) on every public page with two tabs: **Chat** and **Submit a ticket**.
There is no AI assistant: the team answers by hand.

- **Visitor**: gives a name and email, writes a message. Replies show in the chat, and by email if they have left.
  The chat is remembered in their browser; the email link (`/?chat=<token>`) reopens it anywhere.
- **Team**: `/admin/inbox` (super admin and content admin). Reply, add internal notes, set status / priority / owner,
  save reusable replies. A badge on the navigation shows chats waiting for a reply. Tickets still land under Feedback.
- **Email alerts** (needs Resend, see `docs/email.md`): staff get one alert per conversation per 10 minutes
  (the owner, or all staff if unassigned).
- **Limits**: 5 new chats per hour per network, 200 visitor messages per chat.

## Set up

1. Run `supabase/apply-help-chat.sql` once in the Supabase SQL editor. Until then the Chat tab stays hidden.
2. Nothing else; no new environment variables.
