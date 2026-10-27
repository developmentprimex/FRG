# Local email sender protection

`nachkauf@myarchitecto.de` is forbidden as the SMTP account, From address, Sender
address or envelope sender in the local application.

Local execution is detected by `LOCAL_EMAIL_SAFETY=true` or development/test mode.
The local `frontend/.env` enables the explicit flag; that file is ignored by Git.
Locally started production builds are protected by that flag. Database addresses
do not activate the guard, since hosted production may also use PostgreSQL on localhost.

All application SMTP transports use `createGuardedSmtpTransport`. The guard
checks the account before creating a transport and checks each message before
sending. Orders and claims can use a configured safe internal account when the
default mailbox is forbidden. Internal SMTP failures do not trigger a local
fallback to the production account. Missing safe credentials fail without sending.

The current local sender is `315primex.eu@gmail.com`. Hosted production retains
its configured senders and fallback behavior when no local condition applies.
Tests use mocked transports; verification does not send email.

Admin login codes can be delivered directly to the single address configured in
`LOCAL_ADMIN_LOGIN_RECIPIENT`, only through the admin verification sender and
only from the safe `315primex.eu@gmail.com` account. Other local mail retains
the default recipient redirection. The verification page shows the actual
delivery address, and missing SMTP configuration fails instead of claiming a
code was emailed.
