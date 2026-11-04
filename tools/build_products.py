"""Generate product pages from one template. Run: python3 tools/build_products.py"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
index = (root / "index.html").read_text()
head_nav = index.split('<main id="main">')[0]
footer = index.split('</main>')[1]

products = [
 dict(slug="debt-payoff-tracker", name="Debt Payoff Tracker",
  title="Debt Payoff Tracker – Snowball & Avalanche Spreadsheet (Google Sheets & Excel)",
  desc="Debt payoff spreadsheet for Google Sheets and Excel. Compare snowball and avalanche methods, see your debt-free date and track every payment.",
  h1="Debt Payoff Tracker", sub="List your debts once and see the exact month you'll be debt-free. Switch between the snowball and avalanche methods to find the faster path.",
  art='<div class="product-art art-debt" style="height:100%"><span style="--w:92%"></span><span style="--w:70%"></span><span style="--w:44%"></span><span style="--w:18%"></span></div>',
  usd="$7", php="₱249",
  inside=["Debt list for up to 20 debts with balance, rate and minimum payment","Snowball vs. avalanche comparison with total interest saved","Debt-free date that updates as you pay","Monthly payment log with progress bars","Quick-start guide (PDF)"]),
 dict(slug="monthly-budget-tracker", name="Monthly Budget Tracker",
  title="Monthly Budget Tracker – Budget Spreadsheet Template (Google Sheets & Excel)",
  desc="Monthly budget spreadsheet for Google Sheets and Excel. Plan each paycheck, track spending by category and see a yearly overview.",
  h1="Monthly Budget Tracker", sub="Plan every paycheck, track spending by category and see where your money actually went. Built-in 50/30/20 guide if you're starting from zero.",
  art='<div class="product-art art-budget" style="height:100%"><span></span><span></span><span></span></div>',
  usd="$7", php="₱249",
  inside=["Paycheck planner for weekly, bi-weekly or monthly pay","Spending tracker with editable categories","50/30/20 budget guide","12-month overview with charts","Quick-start guide (PDF)"]),
 dict(slug="money-reset-bundle", name="Money Reset Bundle",
  title="Money Reset Bundle – Budget, Debt Payoff & Savings Tracker Templates",
  desc="Three money templates in one bundle: Monthly Budget Tracker, Debt Payoff Tracker and Savings Goal Tracker for Google Sheets and Excel.",
  h1="Money Reset Bundle", sub="Everything you need to take control of your money: a budget, a debt payoff plan and savings goals, all working together. Three kits for less than the price of two.",
  art='<div class="product-art art-bundle" style="height:100%"><i></i><i></i><i></i></div>',
  usd="$12", php="₱399",
  inside=["Monthly Budget Tracker","Debt Payoff Tracker","Savings Goal Tracker for up to 10 goals","Every future money-shelf kit, added to your download free","Quick-start guide (PDF)"]),
]

for p in products:
    page = head_nav
    page = re.sub(r"<title>.*?</title>", f"<title>{p['title']}</title>", page, flags=re.S)
    page = re.sub(r'<meta name="description" content=".*?">', f'<meta name="description" content="{p["desc"]}">', page)
    page = page.replace('href="https://kunlun-17.github.io/ProfetaKit/">', f'href="https://kunlun-17.github.io/ProfetaKit/{p["slug"]}.html">', 1)
    page = re.sub(r'<script type="application/ld\+json">.*?</script>', f'''<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"Product","name":"{p['name']}","description":"{p['desc']}","brand":{{"@type":"Brand","name":"ProfetaKit"}},"offers":{{"@type":"Offer","priceCurrency":"USD","price":"{p['usd'].strip('$')}","availability":"https://schema.org/InStock"}}}}
</script>''', page, flags=re.S)
    page = page.replace('href="#shelves"', 'href="./#shelves"').replace('href="#featured"', 'href="./#featured"').replace('href="#how"', 'href="./#how"').replace('href="#faq"', 'href="./#faq"')
    inside = "\n".join(f"          <li>{i}</li>" for i in p["inside"])
    page += f'''<main id="main">
  <p class="crumbs"><a href="./">Home</a> / <a href="./#shelves">Money</a> / {p['name']}</p>
  <section class="pp">
    <div class="pp-art" aria-hidden="true">{p['art']}</div>
    <div>
      <h1>{p['h1']}</h1>
      <p class="lede">{p['sub']}</p>
      <div class="pp-formats"><span>Google Sheets</span><span>Excel</span><span>PDF guide</span></div>
      <div class="pp-buy">
        <div class="pp-buy-row">
          <p class="price" data-usd="{p['usd']}" data-php="{p['php']}">{p['usd']}</p>
        </div>
        <button type="button" class="btn btn-yellow btn-block" data-buy="{p['slug']}">Buy now</button>
        <p class="buy-error" role="alert" hidden></p>
        <p class="pp-small">Pay with GCash, Maya, GrabPay or card. Your download opens right after payment. You're charged in pesos; USD prices are approximate.</p>
      </div>
      <div class="pp-inside">
        <h2>What's inside</h2>
        <ul>
{inside}
        </ul>
      </div>
    </div>
  </section>
</main>
'''
    page += footer
    (root / f"{p['slug']}.html").write_text(page)
print("built", len(products))
