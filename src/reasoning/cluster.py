import numpy as np
from typing import List, Dict
import umap
import hdbscan
from sentence_transformers import SentenceTransformer

from src.models import Review

class Clusterer:
    def __init__(self, random_state: int = 42, min_cluster_size: int = 10, min_samples: int = 2):
        self.random_state = random_state
        self.min_cluster_size = min_cluster_size
        self.min_samples = min_samples
        self.model_name = "BAAI/bge-small-en-v1.5"
        self._model = None

    def _get_model(self):
        if self._model is None:
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def cluster(self, reviews: List[Review]) -> List[List[Review]]:
        if len(reviews) < self.min_cluster_size:
            print("  [cluster] Too few reviews to cluster. Returning as single block.")
            return [reviews] if reviews else []

        texts = [r.text for r in reviews]
        embeddings = self._get_model().encode(texts, show_progress_bar=False)

        # UMAP reduction
        n_neighbors = min(15, len(reviews) - 1)
        if n_neighbors < 2:
            return [reviews]

        reducer = umap.UMAP(
            n_neighbors=n_neighbors,
            n_components=5,
            metric="cosine",
            min_dist=0.0,
            random_state=self.random_state
        )
        reduced_emb = reducer.fit_transform(embeddings)

        # HDBSCAN clustering
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=self.min_cluster_size,
            min_samples=self.min_samples,
            metric="euclidean"
        )
        labels = clusterer.fit_predict(reduced_emb)

        # Group reviews by label
        clusters_dict: Dict[int, List[Review]] = {}
        for idx, label in enumerate(labels):
            if label not in clusters_dict:
                clusters_dict[label] = []
            clusters_dict[label].append(reviews[idx])

        if set(clusters_dict.keys()) == {-1} or not clusters_dict:
            print("  [cluster] HDBSCAN found only noise. Returning all as one block.")
            return [reviews]

        # Sanity rule: If one cluster dominates >50% of the dataset, re-cluster it with tighter params
        # (For simplicity here, we just lower n_neighbors to force it to break up more)
        largest_cluster_size = max([len(c) for l, c in clusters_dict.items() if l != -1], default=0)
        if largest_cluster_size > len(reviews) * 0.5 and n_neighbors > 5:
            print("  [cluster] Sanity rule triggered: largest cluster >50% of reviews. Re-clustering...")
            reducer = umap.UMAP(
                n_neighbors=max(5, n_neighbors // 2),
                n_components=5,
                metric="cosine",
                min_dist=0.0,
                random_state=self.random_state
            )
            reduced_emb = reducer.fit_transform(embeddings)
            labels = clusterer.fit_predict(reduced_emb)
            clusters_dict = {}
            for idx, label in enumerate(labels):
                if label not in clusters_dict:
                    clusters_dict[label] = []
                clusters_dict[label].append(reviews[idx])

        # Ranking logic
        ranked_clusters = []
        for label, cluster_reviews in clusters_dict.items():
            if label == -1:
                continue # Skip noise
            
            volume = len(cluster_reviews)
            # Severity: 1-star upweights, 5-star downweights
            ratings = [r.rating for r in cluster_reviews if r.rating is not None]
            if ratings:
                avg_rating = sum(ratings) / len(ratings)
                severity_mult = max(0.5, (5.0 - avg_rating)) # e.g. 1 -> 4.0, 5 -> 0.0 (max 0.5)
            else:
                severity_mult = 1.0
            
            score = volume * severity_mult
            ranked_clusters.append((score, cluster_reviews))

        # Sort by score descending
        ranked_clusters.sort(key=lambda x: x[0], reverse=True)
        return [c[1] for c in ranked_clusters]
