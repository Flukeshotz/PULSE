from google_play_scraper import Sort, reviews
import datetime

def fetch_lang(lang):
    window_start = datetime.date(2026, 4, 5)
    continuation_token = None
    reached_end = False
    ids = set()
    while not reached_end:
        res, continuation_token = reviews('in.indwealth', lang=lang, country='in', sort=Sort.NEWEST, count=1000, continuation_token=continuation_token)
        if not res: break
        for r in res:
            dt = r['at'].date()
            if dt < window_start:
                reached_end = True
                break
            if r.get('content', '').strip():
                ids.add(r['reviewId'])
        if not continuation_token: break
    return ids

en_ids = fetch_lang('en')
hi_ids = fetch_lang('hi')

print(f"en count: {len(en_ids)}")
print(f"hi count: {len(hi_ids)}")

overlap = en_ids.intersection(hi_ids)
only_hi = hi_ids - en_ids

print(f"overlap: {len(overlap)}")
print(f"only in hi: {len(only_hi)}")
