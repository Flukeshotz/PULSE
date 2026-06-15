from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer
from src.models import Theme

class ThemeDeduplicator:
    def __init__(self, threshold: float = 0.75):
        self.threshold = threshold
        self.model_name = "BAAI/bge-small-en-v1.5"
        self._model = None

    def _get_model(self):
        if self._model is None:
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def dedupe(self, themes: List[Theme]) -> List[Theme]:
        if not themes:
            return []
            
        merged = []
        # Sort themes by rank (highest volume first) so we always keep the dominant theme's name
        sorted_themes = sorted(themes, key=lambda t: t.rank)
        
        texts = [f"{t.name}. {t.action_plan}" for t in sorted_themes]
        embeddings = self._get_model().encode(texts, show_progress_bar=False)
        
        for i, theme in enumerate(sorted_themes):
            is_duplicate = False
            for j, kept_theme in enumerate(merged):
                # Cosine similarity
                sim = np.dot(embeddings[i], embeddings[kept_theme['orig_idx']]) / (
                    np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[kept_theme['orig_idx']])
                )
                print(f"  [dedupe] Comparing '{theme.name}' to '{kept_theme['theme'].name}' -> sim: {sim:.2f}")
                if sim > self.threshold:
                    # Merge quotes into the kept theme
                    kept_theme['theme'].quotes.extend(theme.quotes)
                    # Deduplicate lists by quote text
                    seen_texts = set()
                    unique_quotes = []
                    for q in kept_theme['theme'].quotes:
                        text_val = q.get('text') if isinstance(q, dict) else q
                        if text_val not in seen_texts:
                            seen_texts.add(text_val)
                            unique_quotes.append(q)
                    kept_theme['theme'].quotes = unique_quotes
                    
                    # Merge metadata
                    total_mentions = kept_theme['theme'].mentions_count + theme.mentions_count
                    if total_mentions > 0:
                        avg1 = kept_theme['theme'].average_rating * kept_theme['theme'].mentions_count
                        avg2 = theme.average_rating * theme.mentions_count
                        kept_theme['theme'].average_rating = round((avg1 + avg2) / total_mentions, 2)
                    
                    kept_theme['theme'].mentions_count = total_mentions
                    
                    if kept_theme['theme'].rating_distribution and theme.rating_distribution:
                        for k in kept_theme['theme'].rating_distribution:
                            kept_theme['theme'].rating_distribution[k] += theme.rating_distribution.get(k, 0)
                            
                    if kept_theme['theme'].confidence_components:
                        import math
                        vol_score = min(1.0, math.log10(total_mentions + 1) / 3.0)
                        kept_theme['theme'].confidence_components['volume'] = round(vol_score, 2)
                        q_score = min(1.0, len(unique_quotes) / 5.0)
                        kept_theme['theme'].confidence_components['quote_validation'] = round(q_score, 2)
                        kept_theme['theme'].confidence_score = round((vol_score * 0.6) + (q_score * 0.4), 2)
                        
                    is_duplicate = True
                    print(f"  [dedupe] Merged '{theme.name}' into '{kept_theme['theme'].name}' (sim: {sim:.2f})")
                    break
                    
            if not is_duplicate:
                merged.append({'orig_idx': i, 'theme': theme})
                
        final_themes = [item['theme'] for item in merged]
        
        # Calculate priority_score
        import math
        for t in final_themes:
            vol_factor = min(1.0, math.log10(t.mentions_count + 1) / 3.0)
            neg_factor = max(0.0, (5.0 - t.average_rating) / 4.0)
            t.priority_score = int(round(vol_factor * neg_factor * t.confidence_score * 100))
            
        # Re-rank based on priority
        final_themes.sort(key=lambda t: t.priority_score, reverse=True)
        for idx, t in enumerate(final_themes):
            t.rank = idx + 1
            
        return final_themes
