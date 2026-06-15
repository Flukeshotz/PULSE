import requests
import feedparser

# App Store RSS
url_app_store = "https://itunes.apple.com/in/rss/customerreviews/page=1/id=1450178837/sortby=mostrecent/json"
r = requests.get(url_app_store)
data = r.json()
entries = data.get("feed", {}).get("entry", [])
print(f"App store entries: {len(entries)}")

# Reddit RSS
url_reddit = "https://www.reddit.com/r/IndiaInvestments/search.rss?q=INDMoney&restrict_sr=1&sort=new"
headers = {"User-Agent": "Mozilla/5.0"}
r2 = requests.get(url_reddit, headers=headers)
d = feedparser.parse(r2.text)
print(f"Reddit entries: {len(d.entries)}")

# Reddit general query if 0
url_reddit_gen = "https://www.reddit.com/search.rss?q=INDMoney&sort=new"
r3 = requests.get(url_reddit_gen, headers=headers)
d3 = feedparser.parse(r3.text)
print(f"Reddit general entries: {len(d3.entries)}")
