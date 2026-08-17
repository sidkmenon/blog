# Sid Menon's blog

A statically generated SvelteKit site deployed on Cloudflare Pages. Two Pages Functions handle
double-opt-in email subscriptions through Resend; all content routes and the RSS feed are static.

## Local development

```sh
npm install
npm run dev
```

`npm run dev` serves the static site through Vite. To exercise the Pages Functions locally, copy
`.dev.vars.example` to `.dev.vars`, replace its placeholder values, and run:

```sh
npm run preview
```

## Resend setup

1. Verify `sidharthkmenon.com` as a sending domain in Resend.
2. Create a Segment for blog subscribers and copy its ID.
3. Create an API key with permission to send email and manage contacts.
4. Configure these variables for both preview and production in Cloudflare Pages:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` (for example, `Sid Menon <writing@sidharthkmenon.com>`)
   - `RESEND_SEGMENT_ID`
   - `SUBSCRIBE_TOKEN_SECRET` (generate one with `openssl rand -base64 32`)

The signup endpoint emails a signed confirmation link. A contact is only created in Resend after
the link is opened. The link expires after 24 hours, and Resend handles subsequent broadcast
unsubscribes.

## Cloudflare Pages

For a Git-connected Pages project, use:

- Build command: `npm run build`
- Build output directory: `build`
- Production branch: `main`

The checked-in `_routes.json` limits Function invocations to `/api/*`; all other requests are served
as static assets. A manual deployment can be created with `npm run deploy` after authenticating
Wrangler.
