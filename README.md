# ProfetaKit

Digital templates and starter kits. Ready-made digital solutions. Download, use, done.

## Go live with GitHub Pages
1. Upload all files in this folder to the root of the `ProfetaKit` repo (keep the `assets` folder).
2. In the repo, open **Settings → Pages**, set **Source** to "Deploy from a branch", then pick `main` and `/ (root)`.
3. The site appears at `https://kunlun-17.github.io/ProfetaKit/` within a few minutes.

## Payments and downloads (Cloudflare Worker)
`worker/profetakit-worker.js` runs checkout and delivery:
1. In Cloudflare, create a new Worker (for example `profetakit-store`) and paste the file in.
2. Create a KV namespace and bind it as `ORDERS`. Create a private R2 bucket and bind it as `FILES`.
3. Add secrets `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET`, and text variables
   `SITE_URL` (`https://kunlun-17.github.io/ProfetaKit`) and `PAYMENT_METHODS`.
4. In PayMongo, add a webhook to `https://<your-worker>/webhook` for `checkout_session.payment.paid`.
5. Upload the product files to R2 using the keys listed in `PRODUCTS` in the Worker.
6. Put the Worker address in `STORE_API` at the top of the checkout section in `assets/main.js`.

## Never put paid files in this repo
This repo is public. Product files are delivered through a separate download page or service.
