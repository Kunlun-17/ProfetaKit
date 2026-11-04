# ProfetaKit

Digital templates and starter kits. Ready-made digital solutions. Download, use, done.

## Go live with GitHub Pages
1. Upload all files in this folder to the root of the `ProfetaKit` repo (keep the `assets` folder).
2. In the repo, open **Settings → Pages**, set **Source** to "Deploy from a branch", then pick `main` and `/ (root)`.
3. The site appears at `https://kunlun-17.github.io/ProfetaKit/` within a few minutes.

## Connect PayMongo
Each product page has a **Buy now** button with two placeholders, for example:
`PAYMONGO_LINK_DEBT_PAYOFF_TRACKER_USD` and `PAYMONGO_LINK_DEBT_PAYOFF_TRACKER_PHP`.

Replace each one with the matching PayMongo payment link (it must start with `https://`) in
`tools/build_products.py`, then run `python3 tools/build_products.py` to rebuild the pages.
Until then, the buttons stay inactive.

## Never put paid files in this repo
This repo is public. Product files are delivered through a separate download page or service.
