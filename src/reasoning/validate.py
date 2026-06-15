import string
import re
from typing import List, Tuple
from groq import Groq
from src.models import Review, Theme
from src.config.loader import load_config

class QuoteValidator:
    def __init__(self):
        import os
        self.unauthentic_quotes_dropped = 0
        self.irrelevant_quotes_dropped = 0
        self.client = Groq(api_key=os.environ.get("GROQ_API"))
        self.model = load_config().run.llm_model

    def _normalize(self, text: str) -> str:
        text = text.lower()
        text = text.translate(str.maketrans('', '', string.punctuation))
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def validate_theme(self, theme: Theme, cluster: List[Review]) -> Theme:
        from rapidfuzz import fuzz
        authentic_quotes = []
        original_quote_count = len(theme.quotes) if theme.quotes else 0
        
        for quote in theme.quotes:
            norm_quote = self._normalize(quote)
            if not norm_quote:
                self.unauthentic_quotes_dropped += 1
                continue
                
            matched = False
            for r in cluster:
                text = self._normalize(r.text)
                score = fuzz.partial_ratio(norm_quote, text)
                if score >= 90:
                    matched = True
                    
                    # Deduplication check
                    is_duplicate = False
                    for existing in authentic_quotes:
                        if fuzz.token_set_ratio(norm_quote, self._normalize(existing["text"])) > 95:
                            is_duplicate = True
                            break
                            
                    if not is_duplicate:
                        authentic_quotes.append({
                            "text": quote,
                            "source": r.source,
                            "rating": r.rating
                        })
                    break
                    
            if not matched:
                self.unauthentic_quotes_dropped += 1
                
        # Phase 2: Relevance Check via LLM
        valid_quotes = []
        avg_score = 0.0
        if authentic_quotes:
            valid_quotes, avg_score = self._check_relevance(theme, authentic_quotes)
            
        theme.quotes = valid_quotes
        theme.evidence_score = len(valid_quotes) / max(1, original_quote_count)
        
        # Phase 3: Theme Summary Validation
        if len(valid_quotes) >= 1 and avg_score >= 2.0:
            theme.summary_validation = self._validate_summary(theme, valid_quotes)
        else:
            theme.summary_validation = "Unsupported"
            
        return theme

    def _check_relevance(self, theme: Theme, quotes: List[dict]) -> Tuple[List[dict], float]:
        prompt = f"""You are a strict data validation assistant.
Your task is to determine if a customer quote provides specific evidence to support a given theme.

Theme: {theme.name}
Description: {theme.description}

Analyze the following quotes. Rate how strongly each quote supports the theme.
0 = unrelated
1 = weakly related
2 = partially supports
3 = strongly supports

Quotes:
"""
        for i, q in enumerate(quotes):
            prompt += f"[{i}] \"{q['text']}\"\n"
            
        prompt += """
Output format:
0: [score]
1: [score]
...
Return ONLY the index, a colon, and the score.
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                temperature=0.0,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100
            )
            result = response.choices[0].message.content.strip()
            
            # Parse result
            valid_quotes = []
            lines = [line.strip() for line in result.split('\n') if line.strip()]
            total_score = 0
            
            for i, q in enumerate(quotes):
                prefix = f"{i}:"
                score = 0
                for line in lines:
                    if line.startswith(prefix):
                        try:
                            score = int(line.split(':')[1].strip())
                        except ValueError:
                            pass
                        break
                        
                if score >= 2:
                    valid_quotes.append(q)
                    total_score += score
                else:
                    self.irrelevant_quotes_dropped += 1
                    
            avg_score = total_score / max(1, len(valid_quotes)) if valid_quotes else 0.0
            return valid_quotes, avg_score
            
        except Exception as e:
            print(f"Error during relevance check: {e}")
            # If API fails, default to keeping them
            return quotes, 3.0

    def _validate_summary(self, theme: Theme, quotes: List[dict]) -> str:
        prompt = f"""You are a strict data validation assistant.

Theme: {theme.name}
Summary: {theme.description}

Quotes:
"""
        for i, q in enumerate(quotes):
            prompt += f"- \"{q['text']}\"\n"
            
        prompt += """
Does the summary make claims not supported by the quotes? 
Return exactly one of these three labels based on how well the quotes support the summary:
Supported
Partially Supported
Unsupported

Return ONLY the label.
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                temperature=0.0,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=20
            )
            result = response.choices[0].message.content.strip()
            if "Partially Supported" in result:
                return "Partially Supported"
            elif "Unsupported" in result:
                return "Unsupported"
            else:
                return "Supported"
        except Exception as e:
            print(f"Error during summary validation: {e}")
            return "Supported"
