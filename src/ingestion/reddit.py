import os
from datetime import date, datetime
from typing import List
from src.ingestion.base import ReviewSource, SourceError
from src.models import RawRecord
from src.config.loader import ProductConfig

class RedditSource(ReviewSource):
    name = "reddit"

    def fetch(self, product: ProductConfig, window_start: date, window_end: date) -> List[RawRecord]:
        config = product.sources.reddit
        if not config.enabled:
            return []

        client_id = os.environ.get("REDDIT_CLIENT_ID")
        client_secret = os.environ.get("REDDIT_CLIENT_SECRET")
        if not client_id or not client_secret:
            raise SourceError("Reddit auth failed: REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET not set in environment")

        try:
            import praw
            reddit = praw.Reddit(
                client_id=client_id,
                client_secret=client_secret,
                user_agent="ReviewPulseBot/1.0"
            )
            
            records = []
            for query in config.queries:
                for sub_name in config.subreddits:
                    subreddit = reddit.subreddit(sub_name)
                    for post in subreddit.search(query, sort='new', time_filter='year'):
                        if getattr(post, 'removed_by_category', None) or post.title in ["[deleted]", "[removed]"]:
                            continue
                            
                        created_utc = datetime.utcfromtimestamp(post.created_utc)
                        post_date = created_utc.date()
                        
                        if window_start <= post_date <= window_end:
                            text = post.title + "\n" + getattr(post, 'selftext', '')
                            
                            # Relevance filter
                            if query.lower() not in text.lower():
                                continue
                                
                            records.append(RawRecord(
                                source=self.name,
                                native_id=post.id,
                                text=text,
                                rating=None,
                                created_at=created_utc,
                                locale=None,
                                url=f"https://reddit.com{post.permalink}",
                                meta={
                                    "upvotes": post.score,
                                    "num_comments": post.num_comments
                                }
                            ))
        except Exception as e:
            raise SourceError(f"Reddit fetch failed: {str(e)}") from e
            
        return records
