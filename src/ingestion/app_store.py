import requests
from datetime import datetime, date
from typing import List
# pyrefly: ignore [missing-import]
from src.ingestion.base import ReviewSource, SourceError
from src.models import RawRecord
from src.config.loader import ProductConfig

class AppStoreSource(ReviewSource):
    name = "app_store"

    def fetch(self, product: ProductConfig, window_start: date, window_end: date) -> List[RawRecord]:
        config = product.sources.app_store
        if not config.enabled:
            return []

        records: List[RawRecord] = []
        try:
            for country in config.countries:
                for page in range(1, 11):
                    # Using the exact architecture RSS feed URL
                    url = f"https://itunes.apple.com/{country}/rss/customerreviews/page={page}/id={config.app_id}/sortby=mostrecent/json"
                    resp = requests.get(url, timeout=10)
                    if resp.status_code != 200:
                        raise SourceError(f"App Store HTTP {resp.status_code}")
                        
                    data = resp.json()
                    entries = data.get("feed", {}).get("entry", [])
                    if not entries:
                        break # no more pages
                        
                    for entry in entries:
                        if "im:rating" not in entry:
                            continue
                            
                        updated_str = entry.get("updated", {}).get("label", "")
                        if updated_str:
                            try:
                                rev_dt = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
                            except ValueError:
                                rev_dt = datetime.strptime(updated_str[:19], "%Y-%m-%dT%H:%M:%S")
                        else:
                            continue
                            
                        rev_date = rev_dt.date()
                        
                        # Since newest first, stop if we go past the start date
                        if rev_date < window_start:
                            return records
                            
                        if window_start <= rev_date <= window_end:
                            title = entry.get("title", {}).get("label", "")
                            content = entry.get("content", {}).get("label", "")
                            rating = float(entry.get("im:rating", {}).get("label", 0))
                            author = entry.get("author", {}).get("name", {}).get("label", "")
                            rev_id = entry.get("id", {}).get("label", "")
                            
                            records.append(RawRecord(
                                source=self.name,
                                native_id=rev_id,
                                text=f"{title}\n{content}",
                                rating=rating,
                                created_at=rev_dt,
                                locale=country,
                                url=None,
                                meta={"author": author}
                            ))
        except Exception as e:
            raise SourceError(f"App Store fetch failed: {str(e)}") from e
            
        return records
