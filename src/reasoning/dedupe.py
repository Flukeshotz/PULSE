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
                    is_duplicate = True
                    print(f"  [dedupe] Merged '{theme.name}' into '{kept_theme['theme'].name}' (sim: {sim:.2f})")
                    break
                    
            if not is_duplicate:
                merged.append({'orig_idx': i, 'theme': theme})
                
        final_themes = [item['theme'] for item in merged]
        # Re-rank based on the new final list
        for idx, t in enumerate(final_themes):
            t.rank = idx + 1
            
        return final_themes
