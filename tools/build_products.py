"""Builds the whole site from tools/catalog.py: homepage store, product pages, thank-you page,
sitemap, and the Worker's price list. Run from the repo root: python3 tools/build_products.py"""
import json, re, pathlib, sys, html
root = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / "tools"))
from catalog import PRODUCTS, SHELVES

SITE = "https://kunlun-17.github.io/ProfetaKit/"
CAT_KEY = {"money": "money", "life": "life", "code": "code"}
esc = html.escape

LOGO = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="11" width="34" height="25" rx="6" fill="#16181F"/><rect x="3" y="11" width="34" height="9" rx="4.5" fill="#2D4BFF"/><path d="M14 11V8a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3" fill="none" stroke="#16181F" stroke-width="3"/><rect x="17" y="17" width="6" height="6" rx="1.5" fill="#FFD54A"/></svg>'
CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>'


def head(title, desc, canonical, og_image=None, ld=None, noindex=False):
    og = f'<meta property="og:image" content="{SITE}{og_image}">' if og_image else ""
    ldj = f'<script type="application/ld+json">{json.dumps(ld)}</script>' if ld else ""
    robots = '<meta name="robots" content="noindex">' if noindex else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canonical}">
{robots}
<meta property="og:type" content="website">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canonical}">
{og}
<meta name="theme-color" content="#F5F6F8">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/styles.css">
{ldj}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="./" aria-label="ProfetaKit home">{LOGO}<span>ProfetaKit</span></a>
    <nav aria-label="Main"><ul class="nav">
      <li><a href="./#store">Shop</a></li>
      <li><a href="./#store" data-jump="money">Money</a></li>
      <li><a href="./#store" data-jump="life">Work &amp; Life</a></li>
      <li><a href="./#store" data-jump="code">Code</a></li>
      <li><a href="free-kits.html">Free</a></li>
      <li><a href="./#faq">FAQ</a></li>
    </ul></nav>
    <a class="btn btn-small top-cta" href="./#store">Browse kits</a>
    <a class="top-search" href="./#store" data-focus-search aria-label="Search kits"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></a>
  </div>
</header>
"""


FOOT = """<footer class="foot">
  <div class="wrap">
    <div><strong>ProfetaKit</strong>Ready-made digital solutions. Download, use, done.</div>
    <p class="legal">ProfetaKit is a Dafreta Networks company. Charges appear as Dafreta Networks.<br>© <span id="year">2026</span> ProfetaKit. All rights reserved.</p>
  </div>
</footer>
<nav class="tabbar" aria-label="Quick navigation">
  <a href="./" data-tab="home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>Home</a>
  <a href="./#store" data-tab="shop"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>Shop</a>
  <a href="./#store" data-focus-search data-tab="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>Search</a>
  <a href="free-kits.html" data-tab="free"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M12 8v13M3 12h18M12 8c-1.5-3-5-3.5-5-1.2C7 8 9.5 8 12 8zm0 0c1.5-3 5-3.5 5-1.2C17 8 14.5 8 12 8z"/></svg>Free</a>
  <a href="./#faq" data-tab="help"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/></svg>Help</a>
</nav>
<script src="assets/main.js"></script>
<script>(function(){var onStore=!!document.querySelector(".cat");document.querySelectorAll("[data-jump]").forEach(function(a){var c=a.getAttribute("data-jump");if(!onStore){a.href="./#store?cat="+c;return;}a.addEventListener("click",function(){var b=document.querySelector('.cat[data-cat="'+c+'"]');if(b)b.click();});});})();</script>
</body>
</html>
"""


def previews(p):
    return [{"src": "assets/previews/" + f, "cap": c} for f, c in p["previews"]]


def card(p, order):
    cat = p["shelf"]
    badge = '<span class="badge">Best value</span>' if p.get("best") else ('<span class="badge badge-gr">Card · PayPal</span>' if p.get("gumroad") else "")
    search = " ".join([p["name"], p["card"], SHELVES[cat][0], " ".join(p["formats"]), " ".join(p["inside"])]).lower()
    first = p["previews"][0][0]
    return f'''      <article class="card" data-cat="{cat}" data-price="{p["php_cents"] or int(float(p["usd"].lstrip("$")) * 5800)}" data-order="{order}" data-search="{esc(search)}">
        <div class="card-media">
          {badge}<span class="shots">{len(p["previews"])} previews</span>
          <img src="assets/covers/{p["slug"]}.jpg" alt="{esc(p["name"])} cover" loading="lazy" width="1280" height="720">
          <button type="button" class="btn btn-light btn-small quick" data-quick="{p["slug"]}">Quick look</button>
        </div>
        <div class="card-body">
          <p class="card-cat">{SHELVES[cat][0]}</p>
          <h3><a href="{p["slug"]}.html">{esc(p["name"])}</a></h3>
          <p class="card-desc">{esc(p["card"])}</p>
          <div class="card-foot">
            <span class="price" data-usd="{p["usd"]}" data-php="{p["php"]}">{p["usd"]}</span>
            <span class="formats">{" · ".join(p["formats"][:2])}</span>
          </div>
        </div>
      </article>'''


# ---------------- homepage ----------------
counts = {k: sum(1 for p in PRODUCTS if p["shelf"] == k) for k in SHELVES}
cats_html = f'<button type="button" class="cat" data-cat="all" aria-pressed="true"><span class="dot"></span>All kits <span class="n">{len(PRODUCTS)}</span></button>' + "".join(
    f'<button type="button" class="cat" data-cat="{k}" aria-pressed="false"><span class="dot"></span>{lab} <span class="n">{counts[k]}</span></button>' for k, (lab, _) in SHELVES.items())
catalog_json = {p["slug"]: {"slug": p["slug"], "name": p["name"], "sub": p["sub"], "cat": p["shelf"], "catLabel": SHELVES[p["shelf"]][0],
                            "usd": p["usd"], "php": p["php"], "formats": p["formats"], "inside": p["inside"], "previews": previews(p), "gumroad": p.get("gumroad", "")} for p in PRODUCTS}

home = head("ProfetaKit – Digital Templates & Starter Kits",
            "Ready-made spreadsheets, resume templates and admin dashboards. Preview every page before you buy, pay with GCash, Maya or card, and download instantly.",
            SITE, PRODUCTS[0]["previews"][0][0] and "assets/previews/" + PRODUCTS[1]["previews"][0][0],
            {"@context": "https://schema.org", "@type": "Organization", "name": "ProfetaKit", "url": SITE, "parentOrganization": {"@type": "Organization", "name": "Dafreta Networks"}})
home += f'''<main id="main">
  <section class="hero">
    <div class="wrap">
      <div class="hero-copy">
        <p class="eyebrow"><span class="pulse"></span>Your one-stop kit shop · new kits every two weeks</p>
        <h1>Digital kits that do the work for you.</h1>
        <p class="lede">Spreadsheets, resume templates and admin dashboards for online sellers, planners, job seekers and developers. Preview every page, pay with GCash, Maya or card, and download in seconds.</p>
        <form class="hero-search" role="search" action="./#store" data-hero-search>
          <label class="sr-only" for="hero-q">What do you need?</label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input id="hero-q" type="search" placeholder="What do you need? Try budget, wedding, resume…" autocomplete="off">
          <button class="btn btn-cobalt" type="submit">Find kits</button>
        </form>
        <div class="quick-tags" aria-label="Popular searches">
          <button type="button" data-tag="seller">Online seller</button>
          <button type="button" data-tag="budget">Budget</button>
          <button type="button" data-tag="debt">Debt payoff</button>
          <button type="button" data-tag="wedding">Wedding</button>
          <button type="button" data-tag="resume">Resume</button>
          <button type="button" data-tag="dashboard">Dashboard</button>
        </div>
        <ul class="facts">
          <li>{CHECK}Instant download</li>
          <li>{CHECK}GCash · Maya · QR Ph · Card</li>
          <li>{CHECK}{sum(len(p['previews']) for p in PRODUCTS)} real previews</li>
        </ul>
      </div>
      <div class="scene" aria-hidden="true">
        <div class="rig">
          <figure class="slab s-back"><img src="assets/previews/kitboard-1.jpg" alt=""></figure>
          <figure class="slab s-mid"><img src="assets/previews/seller-1.jpg" alt=""></figure>
          <figure class="slab s-front"><img src="assets/previews/wedding-1.jpg" alt=""></figure>
          <figure class="slab s-phone"><img src="assets/previews/kitboard-6.jpg" alt=""></figure>
          <span class="float-chip c1"><b>₱</b> GCash · Maya · Card</span>
          <span class="float-chip c2"><b>.xlsx</b> Ready to use</span>
          <span class="float-chip c3"><b>↓</b> Instant download</span>
        </div>
      </div>
    </div>
  </section>

  <section id="store" class="store" aria-labelledby="store-title">
    <div class="wrap">
      <div class="store-head">
        <div>
          <h2 id="store-title">Shop the kits</h2>
          <p>Every kit shows real screenshots of each page. Tap Quick look to flip through them before you buy.</p>
        </div>
      </div>
      <div class="toolbar">
        <div class="cats" role="group" aria-label="Categories">{cats_html}</div>
        <div class="tools-right">
          <label class="search"><span class="sr-only">Search kits</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input type="search" placeholder="Search kits…" data-store-search></label>
          <label class="sort"><span class="sr-only">Sort</span><select data-store-sort><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label>
        </div>
      </div>
      <div class="grid" data-store>
{chr(10).join(card(p, i) for i, p in enumerate(PRODUCTS))}
        <p class="empty" hidden>No kits match that search yet. Try another word, or pick All kits.</p>
      </div>
    </div>
  </section>

  <section id="how" class="how" aria-labelledby="how-title">
    <div class="wrap">
      <h2 id="how-title">From checkout to using it in about a minute.</h2>
      <ol class="steps">
        <li><h3>Preview everything</h3><p>Every kit shows real screenshots of each tab and page, so you know exactly what you're getting.</p></li>
        <li><h3>Pay your way</h3><p>GCash, Maya, GrabPay, QR Ph or any Visa or Mastercard, local or international.</p></li>
        <li><h3>Download and go</h3><p>Your files open right after payment. Make a copy, add your details, done.</p></li>
      </ol>
    </div>
  </section>

  <section class="soon" aria-labelledby="soon-title">
    <div class="wrap">
      <div class="soon-box">
        <div>
          <h2 id="soon-title">New kits every two weeks.</h2>
          <p>We watch what people are searching for and build the kits they actually need. Follow along to hear when they drop.</p>
          <div class="hero-actions"><a class="btn btn-light" href="https://www.facebook.com/" rel="noopener">Follow on Facebook</a><a class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.3)" href="https://www.tiktok.com/" rel="noopener">Follow on TikTok</a></div>
        </div>
        <ul class="soon-list">
          <li><strong>More money trackers</strong>For freelancers, side hustles and shared household bills.</li>
          <li><strong>React and Next.js dashboards</strong>With live demos you can click through first.</li>
          <li><strong>Image library membership</strong>Unlimited downloads for your projects.</li>
        </ul>
      </div>
    </div>
  </section>

  <section id="faq" class="faq" aria-labelledby="faq-title">
    <div class="wrap">
      <h2 id="faq-title">Questions before you buy</h2>
      <div>
        <details><summary>How do I get my files?</summary><p>Right after payment you're taken to your download page. Save the link: it keeps working for a year.</p></details>
        <details><summary>Which apps do I need?</summary><p>Spreadsheets work in Google Sheets (free) and Microsoft Excel 2016 or newer. Resume templates open in Word or Google Docs. The dashboard template is plain HTML that runs in any browser.</p></details>
        <details><summary>What payment methods can I use?</summary><p>GCash, Maya, GrabPay, QR Ph, and Visa or Mastercard credit and debit cards, including cards issued outside the Philippines.</p></details>
        <details><summary>Why do some kits say "Buy on Gumroad"?</summary><p>Our freelancer and developer kits are sold through Gumroad, so buyers anywhere can pay by card or PayPal in US dollars. Your download link arrives by email right after payment. Everything else checks out here with GCash, Maya, QR Ph or card.</p></details>
        <details><summary>Why does my statement say Dafreta Networks?</summary><p>ProfetaKit is run by Dafreta Networks, so that's the name your bank or e-wallet shows for the charge.</p></details>
        <details><summary>Can I get a refund?</summary><p>Because files are delivered instantly, sales are final. If a file doesn't open or something is broken, message us and we'll fix it or refund you.</p></details>
      </div>
    </div>
  </section>
</main>

<dialog class="ql" id="quicklook" aria-label="Quick look">
  <button class="ql-close" type="button" aria-label="Close">×</button>
  <div class="ql-grid"><div class="ql-gallery"></div><div class="ql-info"></div></div>
</dialog>
<script type="application/json" id="catalog-data">{json.dumps(catalog_json)}</script>
''' + FOOT
(root / "index.html").write_text(home)

# ---------------- product pages ----------------
for p in PRODUCTS:
    cat = p["shelf"]
    ld = {"@context": "https://schema.org", "@type": "Product", "name": p["name"], "description": p["desc"],
          "image": [SITE + "assets/previews/" + f for f, _ in p["previews"]], "brand": {"@type": "Brand", "name": "ProfetaKit"},
          "offers": ({"@type": "Offer", "priceCurrency": "USD", "price": p["usd"].lstrip("$"), "availability": "https://schema.org/InStock", "url": p["gumroad"]} if p.get("gumroad") else
                     {"@type": "Offer", "priceCurrency": "PHP", "price": str(p["php_cents"] // 100), "availability": "https://schema.org/InStock", "url": SITE + p["slug"] + ".html"})}
    page = head(p["title"], p["desc"], f"{SITE}{p['slug']}.html", f"assets/covers/{p['slug']}.jpg", ld)
    inside = "".join(f"<li>{CHECK}<span>{x}</span></li>" for x in p["inside"])
    chips = "".join(f"<span>{x}</span>" for x in p["formats"])
    if p.get("gumroad"):
        buy_main = f'<a class="btn btn-cobalt btn-block" href="{p["gumroad"]}" target="_blank" rel="noopener">Buy on Gumroad</a>'
        buy_bar = f'<a class="btn btn-cobalt" href="{p["gumroad"]}" target="_blank" rel="noopener">Buy on Gumroad</a>'
        buy_note = "Sold through Gumroad: pay by card or PayPal, charged in US dollars. Your download link arrives by email right away."
    else:
        buy_main = f'<button type="button" class="btn btn-cobalt btn-block" data-buy="{p["slug"]}">Buy now</button>'
        buy_bar = f'<button type="button" class="btn btn-cobalt" data-buy="{p["slug"]}">Buy now</button>'
        buy_note = "Pay with GCash, Maya, GrabPay, QR Ph or card. Your download opens right after payment. Prices are shown in your local currency."
    demo = f'<a class="btn btn-ghost btn-block" href="{p["demo"]}" target="_blank" rel="noopener">Try the live demo</a>' if p.get("demo") else ""
    rel = [q for q in PRODUCTS if q["slug"] != p["slug"] and q["shelf"] == cat][:3]
    rel += [q for q in PRODUCTS if q["slug"] != p["slug"] and q not in rel][: 4 - len(rel)]
    page += f'''<main id="main">
  <div class="wrap"><p class="crumbs"><a href="./">Home</a> / <a href="./#store" data-jump="{cat}">{SHELVES[cat][0]}</a> / {esc(p["name"])}</p></div>
  <section class="pp">
    <div class="wrap">
      <div class="pp-gallery" data-gallery='{esc(json.dumps(previews(p)))}'>
        <div class="gallery-main"><img src="assets/previews/{p["previews"][0][0]}" alt="{esc(p["previews"][0][1])}"></div>
      </div>
      <div class="pp-info">
        <p class="pp-cat" data-cat="{cat}">{SHELVES[cat][0]}</p>
        <h1>{esc(p["h1"])}</h1>
        <p class="lede">{esc(p["sub"])}</p>
        <div class="chips">{chips}</div>
        <div class="buybox">
          <span class="price" data-usd="{p["usd"]}" data-php="{p["php"]}">{p["usd"]}</span>
          {buy_main}
          {demo}
          <p class="buy-error" role="alert" hidden></p>
          <p class="buy-note">{buy_note}</p>
        </div>
        <div class="pp-section"><h2>What's inside</h2><ul>{inside}</ul></div>
        <div class="pp-section"><h2>Made for</h2><p>{esc(p["who"])}</p></div>
      </div>
    </div>
  </section>
  <div class="buybar" data-buybar>
    <div><span class="buybar-name">{esc(p["name"])}</span><span class="price" data-usd="{p["usd"]}" data-php="{p["php"]}">{p["usd"]}</span></div>
    {buy_bar}
  </div>
  <section class="related" aria-labelledby="rel-title">
    <div class="wrap">
      <h2 id="rel-title">You might also like</h2>
      <div class="grid">
{chr(10).join(card(q, i) for i, q in enumerate(rel)).replace('<button type="button" class="btn btn-light btn-small quick" data-quick=', '<a class="btn btn-light btn-small quick" href=').replace('">Quick look</button>', '.html">View kit</a>')}
      </div>
    </div>
  </section>
</main>
''' + FOOT
    (root / f"{p['slug']}.html").write_text(page)

# ---------------- thank-you page ----------------
thanks_old = (root / "thanks.html").read_text()
script = re.search(r'<script>\n\(function \(\) \{.*?</script>', thanks_old, flags=re.S).group(0)
thanks = head("Your downloads – ProfetaKit", "Your ProfetaKit downloads.", SITE + "thanks.html", noindex=True)
thanks += '''<main id="main" class="thanks">
  <h1 id="t-title">Checking your payment…</h1>
  <p class="lede" id="t-msg">This usually takes a few seconds.</p>
  <ul class="dl-list" id="t-files"></ul>
  <p class="buy-note" id="t-note" hidden>Bookmark this page. Your download link keeps working for a year.</p>
</main>
''' + FOOT.replace("</body>", script + "\n</body>")
(root / "thanks.html").write_text(thanks)

# remove pages for products no longer sold
keep = {p["slug"] for p in PRODUCTS} | {"index", "thanks"}
for old in root.glob("*.html"):
    if old.stem not in keep:
        old.unlink()


# ---------------- free kits page ----------------
GH = "https://github.com/Kunlun-17/ProfetaKit/tree/main/free/"
FREE = [("kitline-lite", "Kitline Lite", "Free HTML & CSS buttons, badges, alerts, cards and form inputs. MIT licence, no framework.", "kitline-ui", "code", ["HTML", "CSS"]),
        ("waitlist-landing-page", "Waitlist Landing Page", "A clean coming-soon page with an email signup. One HTML file, works on phones.", "landing-page-pack", "code", ["HTML", "CSS"]),
        ("simple-invoice-template", "Simple Invoice Template", "A printable invoice for Excel and Google Sheets. Amounts, tax and total work themselves out.", "freelancer-business-kit", "money", ["Excel", "Google Sheets"]),
        ("seller-ai-prompts-sampler", "10 AI Prompts for Online Sellers", "The Store Brief plus 10 fill-in prompts for listings, pricing, chat replies and ads.", "seller-ai-prompt-system", "money", ["Markdown", "CSV"]),
        ("freelancer-cold-email-templates", "8 Cold Email Templates", "Cold emails and follow-ups for freelancers that sound like a person wrote them.", "client-outreach-pack", "life", ["Markdown"])]
by_slug = {q["slug"]: q for q in PRODUCTS}
fcards = ""
for fs, ft, fd, paid, fcat, ffmt in FREE:
    q = by_slug[paid]
    fcards += f"""      <article class="card" data-cat="{fcat}">
        <div class="card-media"><span class="badge">Free</span><img src="assets/covers/free-{fs}.jpg" alt="{esc(ft)} cover" loading="lazy" width="1280" height="720"></div>
        <div class="card-body">
          <p class="card-cat">{SHELVES[fcat][0]}</p>
          <h3>{esc(ft)}</h3>
          <p class="card-desc">{esc(fd)}</p>
          <div class="free-actions" style="display:grid;gap:.5rem;margin-top:auto">
            <a class="btn btn-cobalt btn-block" href="free/{fs}.zip" download>Download free</a>
            <a class="btn btn-ghost btn-block" href="{GH}{fs}" target="_blank" rel="noopener">View on GitHub</a>
            <p class="formats" style="margin:.2rem 0 0">{" · ".join(ffmt)} · Full version: <a href="{paid}.html">{esc(q["name"])}</a> ({q["usd"]})</p>
          </div>
        </div>
      </article>
"""
freepage = head("Free Templates – Invoice, Landing Page, CSS Components, AI Prompts & Email Templates | ProfetaKit",
                "Free downloads from ProfetaKit: a simple invoice spreadsheet, a waitlist landing page, a free CSS component kit, 10 AI prompts for online sellers and 8 cold email templates.",
                SITE + "free-kits.html", "assets/covers/free-kitline-lite.jpg")
freepage += f"""<main id="main">
  <section class="store" style="padding-top:2.5rem">
    <div class="wrap">
      <p class="crumbs"><a href="./">Home</a> / Free kits</p>
      <h1 style="font-size:clamp(2rem,5vw,3rem);margin:.4rem 0 .5rem">Free kits. No sign-up.</h1>
      <p class="lede" style="max-width:40rem;color:var(--soft)">Small, genuinely useful versions of our paid kits. Download the zip or grab the files from GitHub. If you like them, the full versions do a lot more.</p>
      <div class="grid" style="margin-top:1.6rem">
{fcards}      </div>
    </div>
  </section>
</main>
""" + FOOT
(root / "free-kits.html").write_text(freepage)

# ---------------- sitemap ----------------
urls = [SITE, SITE + "free-kits.html"] + [f"{SITE}{p['slug']}.html" for p in PRODUCTS] + [f"{SITE}demo/kitboard/index.html"]
(root / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n")

# ---------------- Worker price list ----------------
wpath = root / "worker" / "profetakit-worker.js"
w = wpath.read_text()
block = "const PRODUCTS = {\n" + "".join(
    f"  '{p['slug']}': {{\n    name: {json.dumps(p['name'])}, price: {p['php_cents']},\n    files: {json.dumps(p['files'])},\n  }},\n" for p in PRODUCTS if not p.get("gumroad")) + "};"
w = re.sub(r"const PRODUCTS = \{.*?\n\};", block, w, flags=re.S)
wpath.write_text(w)
print("built", len(PRODUCTS), "products")
