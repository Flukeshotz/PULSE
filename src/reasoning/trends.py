import os
import json
from typing import List, Dict, Any, Tuple

from src.models import Theme, ThemeTrend

class TrendEngine:
    def __init__(self, product: str):
        self.product = product
        self.history_dir = os.path.join("data", "reports", product, "theme_history")

    def _get_history(self, theme_id: str) -> List[Dict[str, Any]]:
        filepath = os.path.join(self.history_dir, f"{theme_id}.json")
        if not os.path.exists(filepath):
            return []
        with open(filepath, 'r') as f:
            try:
                history_data = json.load(f)
                if not isinstance(history_data, list):
                    return []
            except json.JSONDecodeError:
                return []
                
        # Sort history by week
        history_data.sort(key=lambda x: x.get("iso_week", ""))
        return history_data

    def _get_previous_week_record(self, history_data: List[Dict[str, Any]], current_week: str) -> Dict[str, Any]:
        prev = None
        for record in history_data:
            if record.get("iso_week") < current_week:
                prev = record
        return prev

    def _calculate_age_weeks(self, start_week: str, end_week: str) -> int:
        try:
            y1, w1 = int(start_week[:4]), int(start_week[-2:])
            y2, w2 = int(end_week[:4]), int(end_week[-2:])
            return (y2 - y1) * 52 + (w2 - w1)
        except (ValueError, TypeError, IndexError):
            return 0

    def compute_trends(self, themes: List[Theme], current_week: str):
        for theme in themes:
            if not theme.theme_id:
                continue
                
            history_data = self._get_history(theme.theme_id)
            prev_record = self._get_previous_week_record(history_data, current_week)
            
            first_seen = current_week
            if history_data:
                first_seen = history_data[0].get("iso_week", current_week)
            age_weeks = self._calculate_age_weeks(first_seen, current_week)
            
            if not prev_record:
                # Emerging / New
                status = "emerging" if theme.mentions_count > 25 else "new"
                theme.trend = ThemeTrend(
                    status=status,
                    mentions_wow_pct=100.0,
                    priority_wow_delta=theme.priority_score,
                    rating_wow_delta=0.0,
                    first_seen=first_seen,
                    age_weeks=age_weeks
                )
                continue
                
            prev_mentions = prev_record.get("mentions_count", 0)
            prev_priority = prev_record.get("priority_score", 0)
            prev_rating = prev_record.get("average_rating", 0.0)
            
            mentions_delta = theme.mentions_count - prev_mentions
            mentions_wow_pct = (mentions_delta / prev_mentions * 100.0) if prev_mentions > 0 else 100.0
            
            priority_delta = theme.priority_score - prev_priority
            rating_delta = theme.average_rating - prev_rating
            
            status = "stable"
            if mentions_wow_pct > 50.0 and theme.priority_score > 70:
                status = "escalating"
            elif prev_mentions < 5 and theme.mentions_count > 25:
                status = "emerging"
            elif prev_priority > 0 and (priority_delta / prev_priority) < -0.30:
                status = "improving"
            
            theme.trend = ThemeTrend(
                status=status,
                mentions_wow_pct=round(mentions_wow_pct, 1),
                priority_wow_delta=priority_delta,
                rating_wow_delta=round(rating_delta, 1),
                first_seen=first_seen,
                age_weeks=age_weeks
            )

    def get_top_escalations_and_improvements(self, themes: List[Theme]) -> Tuple[List[Theme], List[Theme]]:
        escalations = [t for t in themes if t.trend and t.trend.status == "escalating"]
        improvements = [t for t in themes if t.trend and t.trend.status == "improving"]
        
        # Sort escalations by priority score descending
        escalations.sort(key=lambda x: x.priority_score, reverse=True)
        # Sort improvements by largest priority drop
        improvements.sort(key=lambda x: x.trend.priority_wow_delta)
        
        return escalations[:3], improvements[:3]
