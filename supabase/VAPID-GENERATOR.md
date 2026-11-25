# VAPID generator (Edge Function)

Function name: `trx-vapid-generator`

## Protect the generator

Before calling the function, create a strong random setup secret (at least 32 random bytes) and add it in Supabase Dashboard → Edge Functions → Secrets:

- `VAPID_GENERATOR_SECRET`: a one-time operator secret used only to protect this generator.

Do not commit this secret or put it in the web app. The function has JWT verification disabled because it authenticates with the dedicated header itself.

## Generate keys

Call the function directly from a trusted terminal, not from the browser app:

```sh
curl -X POST \
  'https://axednjikcambzbkxyqpp.supabase.co/functions/v1/trx-vapid-generator' \
  -H 'Content-Type: application/json' \
  -H 'x-vapid-generator-secret: YOUR_GENERATOR_SECRET'
```

The response contains:

- `VAPID_PUBLIC_KEY`: configure as Supabase Edge Function secret with the same name.
- `VAPID_PRIVATE_KEY`: configure as Supabase Edge Function secret with the same name. This is a JSON JWK string.

Also configure `VAPID_SUBJECT` (for example `mailto:admin@example.com`) and the existing `PUSH_DISPATCH_SECRET`.

## After generation

1. Copy the two VAPID values into Supabase Edge Function Secrets.
2. Delete `VAPID_GENERATOR_SECRET` from Edge Function Secrets (or rotate it) to disable further generation.
3. Never paste the private JWK into GitHub, frontend source, chat messages, or logs.
4. The public key is safe to expose to browsers; the private key is not.

The function does not save keys in a database and does not log them. Each successful call generates a new key pair; do not regenerate after enabling subscriptions unless you intend to rotate the VAPID identity.
