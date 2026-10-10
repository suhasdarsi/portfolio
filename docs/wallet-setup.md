# Contact card signing

QR and vCard downloads are generated locally. Apple Wallet generation sends details to `/api/wallet` for signing, without a contact database. Nothing is saved in the browser; each Wallet download gets a fresh pass ID, which identifies the pass, not an account or public profile.

Local preview: `bun run build`, then `bun scripts/preview-wallet.ts`. This binds only to 127.0.0.1:4324 and reads credentials from an external directory (`WALLET_CREDENTIAL_DIR`). Never put keys in static assets or source control.

Production requires Cloudflare secrets `WALLET_SIGNER_KEY`, `WALLET_SIGNER_CERT`, and `WALLET_WWDR_CERT`. Upload the private key only with explicit account-owner approval. Run `bunx wrangler deploy --dry-run` before deploying. Without credentials the API returns 503; QR and contact downloads still work.

The Worker checks same-origin requests, validates fields, limits input to 8KB and rate-limits five passes per minute per IP. No user-supplied URLs are fetched. Hosting providers still process request metadata. Never log request bodies.

Verify adding a generated pass on an actual iPhone before declaring device compatibility. Renew the signing certificate before November 9, 2027. Downloading/regenerating needs internet; the installed pass and embedded QR can be shown offline. Reusing a draft ID regenerates the same pass identity. Automatic push updates are not implemented. Android users can use QR/vCard, not Google Wallet.
