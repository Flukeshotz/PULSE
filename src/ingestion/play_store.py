from datetime import date
from typing import List
from google_play_scraper import Sort, reviews
from src.ingestion.base import ReviewSource, SourceError
from src.models import RawRecord
from src.config.loader import ProductConfig

class PlayStoreSource(ReviewSource):
    name = "play_store"

    def fetch(self, product: ProductConfig, window_start: date, window_end: date) -> List[RawRecord]:
        config = product.sources.play_store
        if not config.enabled:
            return []

        records = []
        try:
            langs = config.languages or ['en', 'hi']
            for lang in langs:
                continuation_token = None
                total_fetched = 0
                reached_end = False

                while not reached_end:
                    result, continuation_token = reviews(
                        config.package,
                        lang=lang,
                        country='in',
                        sort=Sort.NEWEST,
                        count=1000,
                        continuation_token=continuation_token
                    )

                    if not result:
                        break

                    for rev in result:
                        total_fetched += 1
                        rev_date = rev['at'].date()
                        
                        if rev_date < window_start:
                            reached_end = True
                            break

                        if window_start <= rev_date <= window_end:
                            content = rev.get('content', '')
                            if not content or not content.strip():
                                continue

                            records.append(RawRecord(
                                source=self.name,
                                native_id=rev.get('reviewId', ""),
                                text=content,
                                rating=float(rev.get('score', 0)) if rev.get('score') else None,
                                created_at=rev['at'],
                                locale=f"{lang}-IN",
                                url=None,
                                meta={
                                    "thumbsUpCount": rev.get("thumbsUpCount", 0),
                                    "reviewCreatedVersion": rev.get("reviewCreatedVersion")
                                }
                            ))
                    
                    if not continuation_token:
                        break

                print(f"  [play_store] Raw fetch loop checked {total_fetched} total reviews from Google Play (lang={lang}).")

        except Exception as e:
            raise SourceError(f"Play Store fetch failed: {str(e)}") from e
            
        return records
