import os
import json
import re
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
import numpy as np

from src.models import Theme

class ThemeTracker:
    def __init__(self, product: str):
        self.product = product
        self.history_dir = os.path.join("data", "reports", product, "theme_history")
        os.makedirs(self.history_dir, exist_ok=True)
        self.model_name = "BAAI/bge-small-en-v1.5"
        self.similarity_threshold = 0.85
        self._model = None
        self._history = self._load_history()

    def _get_model(self):
        if self._model is None:
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def _load_history(self) -> Dict[str, List[Dict[str, Any]]]:
        history = {}
        for filename in os.listdir(self.history_dir):
            if filename.endswith(".json"):
                theme_id = filename[:-5]
                filepath = os.path.join(self.history_dir, filename)
                with open(filepath, 'r') as f:
                    try:
                        data = json.load(f)
                        if data and isinstance(data, list):
                            history[theme_id] = data
                    except json.JSONDecodeError:
                        pass
        return history

    def _slugify(self, text: str) -> str:
        text = re.sub(r'\[.*?\]', '', text)
        text = text.lower().strip()
        text = re.sub(r'[^a-z0-9]+', '_', text)
        return text.strip('_')

    def assign_ids(self, themes: List[Theme]) -> List[Theme]:
        if not themes:
            return themes
            
        # Get embeddings for current themes
        texts = [f"{t.name}. {t.description}" for t in themes]
        current_embeddings = self._get_model().encode(texts, show_progress_bar=False)
        
        # Get embeddings for historical themes
        hist_ids = list(self._history.keys())
        hist_texts = []
        for hid in hist_ids:
            records = self._history[hid]
            last_record = records[-1] if records else {}
            name = last_record.get('name', hid.replace('_', ' '))
            desc = last_record.get('description', '')
            hist_texts.append(f"{name}. {desc}")
            
        hist_embeddings = None
        if hist_texts:
            hist_embeddings = self._get_model().encode(hist_texts, show_progress_bar=False)
            
        for i, theme in enumerate(themes):
            assigned_id = None
            if hist_embeddings is not None:
                # Calculate cosine similarity
                emb1 = current_embeddings[i]
                sims = np.dot(hist_embeddings, emb1) / (np.linalg.norm(hist_embeddings, axis=1) * np.linalg.norm(emb1))
                best_idx = np.argmax(sims)
                best_sim = float(sims[best_idx])
                
                decision = "new_theme"
                if best_sim > self.similarity_threshold:
                    assigned_id = hist_ids[best_idx]
                    decision = "matched"
                    
                # Log the decision
                log_record = {
                    "incoming_theme": theme.name,
                    "matched_theme": hist_texts[best_idx] if hist_texts else None,
                    "similarity": round(best_sim, 4),
                    "decision": decision
                }
                with open(os.path.join(self.history_dir, "matching_log.jsonl"), "a") as f:
                    f.write(json.dumps(log_record) + "\n")
                    
            if not assigned_id:
                assigned_id = self._slugify(theme.name)
                # Handle collisions just in case
                base_id = assigned_id
                counter = 1
                while assigned_id in self._history:
                    assigned_id = f"{base_id}_{counter}"
                    counter += 1
                self._history[assigned_id] = [] # Register new
                
                # We need to add the newly registered item to hist_embeddings to match subsequent themes to it
                new_text = f"{theme.name}. {theme.description}"
                new_emb = self._get_model().encode([new_text], show_progress_bar=False)
                if hist_embeddings is None:
                    hist_embeddings = new_emb
                else:
                    hist_embeddings = np.vstack([hist_embeddings, new_emb])
                hist_ids.append(assigned_id)
                
            theme.theme_id = assigned_id
            
        return themes

    def update_history(self, iso_week: str, themes: List[Theme]):
        for theme in themes:
            theme_id = theme.theme_id
            if not theme_id:
                continue
                
            record = {
                "iso_week": iso_week,
                "name": theme.name,
                "description": theme.description,
                "mentions_count": theme.mentions_count,
                "priority_score": theme.priority_score,
                "average_rating": theme.average_rating,
                "confidence_score": theme.confidence_score
            }
            
            filepath = os.path.join(self.history_dir, f"{theme_id}.json")
            history_data = []
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    try:
                        history_data = json.load(f)
                    except json.JSONDecodeError:
                        pass
                        
            # Check if iso_week already exists and update or append
            for existing in history_data:
                if existing.get("iso_week") == iso_week:
                    existing.update(record)
                    break
            else:
                history_data.append(record)
                
            # sort chronologically by iso_week
            history_data.sort(key=lambda x: x.get("iso_week", ""))
                
            with open(filepath, 'w') as f:
                json.dump(history_data, f, indent=2)
