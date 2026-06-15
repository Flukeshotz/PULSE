import html
import hashlib
from typing import List, Tuple, Dict
from src.models import RawRecord, Review
from src.pii import PIIScrubber

import emoji
import langdetect

class Normalizer:
    def __init__(self):
        self.pii = PIIScrubber()
        self.max_length = 2000

    def normalize(self, raw_records: List[RawRecord], product_name: str) -> Tuple[List[Review], Dict[str, int]]:
        seen_hashes = set()
        reviews = []
        
        short_sentiments = {"positive": 0, "neutral": 0, "negative": 0}
        
        dropped_empty = 0
        dropped_short = 0
        dropped_emoji_only = 0
        dropped_duplicate = 0
        
        for raw in raw_records:
            # 1. Decode HTML entities
            decoded_text = html.unescape(raw.text).strip()
            
            # Check for totally empty
            if not decoded_text:
                dropped_empty += 1
                continue
                
            # 2. Emoji-only filter (remove emojis and check if empty)
            text_without_emojis = emoji.replace_emoji(decoded_text, replace='').strip()
            if not text_without_emojis:
                dropped_emoji_only += 1
                continue
                
            # 3. Word count filter (< 2 words dropped)
            if len(text_without_emojis.split()) < 2:
                dropped_short += 1
                if raw.rating:
                    if raw.rating >= 4:
                        short_sentiments["positive"] += 1
                    elif raw.rating <= 2:
                        short_sentiments["negative"] += 1
                    else:
                        short_sentiments["neutral"] += 1
                else:
                    short_sentiments["neutral"] += 1
                continue
                
            # 4. Hash review_id (source + native_id to avoid collisions)
            id_string = f"{raw.source}:{raw.native_id}"
            review_id = hashlib.sha256(id_string.encode('utf-8')).hexdigest()
            
            if review_id in seen_hashes:
                dropped_duplicate += 1
                continue
            seen_hashes.add(review_id)
            
            # 5. Scrub PII from text
            scrubbed_text = self.pii.scrub(decoded_text)
            
            # 6. Truncate scrubbed text if extremely long
            if len(scrubbed_text) > self.max_length:
                scrubbed_text = scrubbed_text[:self.max_length] + "..."
            
            # 7. Create Review
            reviews.append(Review(
                review_id=review_id,
                source=raw.source,
                product=product_name,
                text=scrubbed_text.strip(),
                rating=raw.rating,
                created_at=raw.created_at,
                locale=raw.locale,
                url=raw.url,
                meta=raw.meta
            ))
            
        print(f"  [normalize] Dropped {dropped_empty} empty reviews")
        print(f"  [normalize] Dropped {dropped_emoji_only} emoji-only reviews")
        print(f"  [normalize] Dropped {dropped_short} short (<2 words) reviews ({short_sentiments['positive']} pos, {short_sentiments['negative']} neg, {short_sentiments['neutral']} neu)")
        print(f"  [normalize] Dropped {dropped_duplicate} cross-run duplicates")
        
        return reviews, short_sentiments
