import string
import re
from typing import List
from src.models import Review, Theme

class QuoteValidator:
    def __init__(self):
        self.dropped_quotes = 0

    def _normalize(self, text: str) -> str:
        text = text.lower()
        text = text.translate(str.maketrans('', '', string.punctuation))
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def validate_theme(self, theme: Theme, cluster: List[Review]) -> Theme:
        from rapidfuzz import fuzz
        valid_quotes = []
        for quote in theme.quotes:
            norm_quote = self._normalize(quote)
            if not norm_quote:
                self.dropped_quotes += 1
                continue
                
            matched = False
            for r in cluster:
                text = self._normalize(r.text)
                score = fuzz.partial_ratio(norm_quote, text)
                if score >= 90:
                    matched = True
                    
                    # Deduplication check
                    is_duplicate = False
                    for existing in valid_quotes:
                        if fuzz.token_set_ratio(norm_quote, self._normalize(existing["text"])) > 95:
                            is_duplicate = True
                            break
                            
                    if not is_duplicate:
                        valid_quotes.append({
                            "text": quote,
                            "source": r.source,
                            "rating": r.rating
                        })
                    break
                    
            if not matched:
                self.dropped_quotes += 1
                
        theme.quotes = valid_quotes
        return theme
