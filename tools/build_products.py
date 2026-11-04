"""Builds product pages, the homepage catalogue, sitemap and the Worker price list from tools/catalog.py.
Run from the repo root: python3 tools/build_products.py"""
import json, re, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / "tools"))
from catalog import PRODUCTS, SHELVES

SITE = "https://kunlun-17.github.io/ProfetaKit/"
index_path = root / "index.html"
index = index_path.read_text()

# ---------- homepage catalogue ----------
def card(p):
    best = '<p class="bundle-tag">Best value</p>' if p.get("best") else ""
    cls = "product product-bundle" if p.get("best") else "product"
    if p is PRODUCTS[-1] and len(PRODUCTS) % 3 == 1:
        cls += " product-wide"
    btn = "btn btn-block btn-yellow" if p.get("best") else "btn btn-block"
    return f'''      <article class="{cls}">
        {best}<a class="product-shot" href="{p["slug"]}.html" tabindex="-1" aria-hidden="true"><img src="assets/products/{p["img"]}" alt="" loading="lazy" width="640" height="420"></a>
        <p class="product-shelf">{SHELVES[p["shelf"]][0]}</p>
        <h3><a href="{p["slug"]}.html">{p["name"]}</a></h3>
        <p>{p["card"]}</p>
        <p class="price" data-usd="{p["usd"]}" data-php="{p["php"]}">{p["usd"]}</p>
        <a class="{btn}" href="{p["slug"]}.html">See what's inside</a>
      </article>'''

shelf_html = ""
for key, (label, blurb) in SHELVES.items():
    items = [p for p in PRODUCTS if p["shelf"] == key]
    cls = {"money": "shelf shelf-money", "life": "shelf shelf-work", "code": "shelf shelf-code"}[key]
    lis = "".join(f'<li><a href="{p["slug"]}.html">{p["name"]}</a></li>' for p in items)
    shelf_html += f'''      <div class="{cls}">
        <h3>{label}</h3>
        <p>{blurb}</p>
        <ul>{lis}</ul>
        <span class="shelf-status">{len(items)} kit{"s" if len(items) != 1 else ""} ready</span>
      </div>
'''

catalogue = f'''<section id="shelves" class="shelves" aria-labelledby="shelves-title">
    <h2 id="shelves-title">Pick your shelf</h2>
    <p class="section-lede">Every kit sits on one of three shelves. New kits land every two weeks, based on what people are actually looking for.</p>
    <div class="shelf-grid">
{shelf_html}    </div>
  </section>

  <section id="featured" class="featured" aria-labelledby="featured-title">
    <div class="featured-head">
      <div>
        <h2 id="featured-title">All kits</h2>
        <p class="section-lede">Real files you can open today. Every page shows exactly what's inside.</p>
      </div>
    </div>
    <div class="product-row">
{chr(10).join(card(p) for p in PRODUCTS)}
    </div>
  </section>

  '''
index = re.sub(r'<section id="shelves".*?(?=<section id="how")', catalogue, index, flags=re.S)
index_path.write_text(index)

# ---------- product pages ----------
head_nav = index.split('<main id="main">')[0]
footer = index.split('</main>')[1]
for p in PRODUCTS:
    page = head_nav
    page = re.sub(r"<title>.*?</title>", f"<title>{p['title']}</title>", page, flags=re.S)
    page = re.sub(r'<meta name="description" content=".*?">', f'<meta name="description" content="{p["desc"]}">', page)
    page = re.sub(r'<link rel="canonical" href=".*?">', f'<link rel="canonical" href="{SITE}{p["slug"]}.html">', page)
    page = re.sub(r'<meta property="og:title" content=".*?">', f'<meta property="og:title" content="{p["name"]} – ProfetaKit">', page)
    page = re.sub(r'<meta property="og:url" content=".*?">', f'<meta property="og:url" content="{SITE}{p["slug"]}.html">\n<meta property="og:image" content="{SITE}assets/products/{p["img"]}">', page)
    ld = {"@context": "https://schema.org", "@type": "Product", "name": p["name"], "description": p["desc"], "image": SITE + "assets/products/" + p["img"],
          "brand": {"@type": "Brand", "name": "ProfetaKit"},
          "offers": {"@type": "Offer", "priceCurrency": "PHP", "price": str(p["php_cents"] // 100), "availability": "https://schema.org/InStock", "url": SITE + p["slug"] + ".html"}}
    page = re.sub(r'<script type="application/ld\+json">.*?</script>', '<script type="application/ld+json">\n' + json.dumps(ld) + '\n</script>', page, flags=re.S)
    for a in ("#shelves", "#featured", "#how", "#faq"):
        page = page.replace(f'href="{a}"', f'href="./{a}"')
    inside = "\n".join(f"          <li>{i}</li>" for i in p["inside"])
    fmts = "".join(f"<span>{x}</span>" for x in p["formats"])
    gallery = ""
    if p.get("gallery"):
        gallery = '<div class="pp-gallery">' + "".join(f'<a href="assets/products/{g}" target="_blank" rel="noopener"><img src="assets/products/{g}" alt="Enlarge preview" loading="lazy"></a>' for g in p["gallery"]) + "</div>"
    demo = f'<a class="btn btn-ghost btn-block" href="{p["demo"]}" target="_blank" rel="noopener">Try the live demo</a>' if p.get("demo") else ""
    page += f'''<main id="main">
  <p class="crumbs"><a href="./">Home</a> / <a href="./#shelves">{SHELVES[p["shelf"]][0]}</a> / {p["name"]}</p>
  <section class="pp">
    <div>
      <div class="pp-art"><img src="assets/products/{p["img"]}" alt="Preview of the {p["name"]}" width="1400" height="900"></div>
      {gallery}
    </div>
    <div>
      <h1>{p["h1"]}</h1>
      <p class="lede">{p["sub"]}</p>
      <div class="pp-formats">{fmts}</div>
      <div class="pp-buy">
        <div class="pp-buy-row">
          <p class="price" data-usd="{p["usd"]}" data-php="{p["php"]}">{p["usd"]}</p>
        </div>
        <button type="button" class="btn btn-yellow btn-block" data-buy="{p["slug"]}">Buy now</button>
        {demo}
        <p class="buy-error" role="alert" hidden></p>
        <p class="pp-small">Pay with GCash, Maya, GrabPay or card. Your download opens right after payment. Prices are shown in your local currency.</p>
      </div>
      <div class="pp-inside">
        <h2>What's inside</h2>
        <ul>
{inside}
        </ul>
      </div>
      <div class="pp-inside">
        <h2>Made for</h2>
        <p>{p["who"]}</p>
      </div>
    </div>
  </section>
</main>
'''
    page += footer
    (root / f"{p['slug']}.html").write_text(page)

# remove pages for products no longer sold
keep = {p["slug"] for p in PRODUCTS} | {"index", "thanks"}
for old in root.glob("*.html"):
    if old.stem not in keep:
        old.unlink()

# ---------- sitemap ----------
urls = [SITE] + [f"{SITE}{p['slug']}.html" for p in PRODUCTS] + [f"{SITE}demo/kitboard/index.html"]
(root / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n")

# ---------- Worker price list ----------
wpath = root / "worker" / "profetakit-worker.js"
w = wpath.read_text()
block = "const PRODUCTS = {\n" + "".join(
    f"  '{p['slug']}': {{\n    name: {json.dumps(p['name'])}, price: {p['php_cents']},\n    files: {json.dumps(p['files'])},\n  }},\n" for p in PRODUCTS) + "};"
w = re.sub(r"const PRODUCTS = \{.*?\n\};", block, w, flags=re.S)
wpath.write_text(w)
print("built", len(PRODUCTS), "products")
