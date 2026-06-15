from src.models import PulseReport
from typing import Dict, Any

class ReportBuilder:
    @staticmethod
    def build_doc_blocks(report: PulseReport) -> list:
        blocks = []
        
        # We don't prepend the Heading 1 because the caller (orchestrator) does it using `append_section`.
        # Just the body blocks:
        
        # Summary paragraph
        summary = (
            f"Product: {report.product} | Window: {report.iso_week} | {report.period_label}\n"
            f"Total Clean Reviews: {report.counts.get('reviews', 0)}"
        )
        blocks.append({"type": "paragraph", "text": summary})
        
        # Check for partial run (e.g. missing sources)
        missing = [s for s in getattr(report, "expected_sources", []) if s not in report.sources_covered]
        if missing:
            blocks.append({
                "type": "paragraph", 
                "text": f"⚠️ PARTIAL RUN: The following sources were unavailable or failed during this run: {', '.join(missing)}."
            })
            
        if report.counts.get("filtered_short"):
            src = report.counts
            total_short = src.get("filtered_short", 0)
            if total_short > 0:
                blocks.append({
                    "type": "paragraph", 
                    "text": f"Context: {total_short} short/one-word reviews were filtered out ({src.get('filtered_short_positive', 0)} positive, {src.get('filtered_short_negative', 0)} negative, {src.get('filtered_short_neutral', 0)} neutral)."
                })
        
        if not report.themes:
            blocks.append({"type": "paragraph", "text": "No significant themes found this week."})
            return blocks

        for theme in report.themes:
            blocks.append({"type": "heading_2", "text": f"{theme.rank}. {theme.name}"})
            
            # The exact description
            blocks.append({"type": "paragraph", "text": f"📋 Description: {theme.description}"})
            
            # Business Impact
            blocks.append({"type": "paragraph", "text": f"⚠️ Business Impact: {theme.business_impact}"})
            
            # Root Cause
            blocks.append({"type": "paragraph", "text": f"🔍 Root Cause Hypothesis: {theme.root_cause_hypothesis}"})
            
            # Action Plan
            blocks.append({"type": "paragraph", "text": f"💡 Action Plan: {theme.action_plan}"})
            
            # Teams Impacted
            teams_text = ", ".join(theme.teams_impacted) if theme.teams_impacted else "General"
            blocks.append({"type": "paragraph", "text": f"👥 Teams Impacted: {teams_text}"})
            
            if theme.quotes:
                blocks.append({"type": "paragraph", "text": "💬 Voice of the Customer:"})
                for q in theme.quotes:
                    q_text = q.get('text', q) if isinstance(q, dict) else q
                    blocks.append({"type": "bullet", "text": f'"{q_text}"'})
                    
        return blocks

    @staticmethod
    def build_email_html(report: PulseReport, doc_deep_link: str) -> str:
        # 5-line teaser
        theme_bullets = ""
        for theme in report.themes:
            theme_bullets += f"""
            <li style="margin-bottom: 8px; font-size: 16px; color: #3c4043;">
                <strong>{theme.rank}. {theme.name}</strong>
            </li>
            """
            
        if not theme_bullets:
            theme_bullets = "<li style='color: #5f6368;'>No significant themes this week.</li>"

        html = f"""
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
            
            <div style="background-color: #1a73e8; padding: 24px; text-align: center;">
                <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 500;">Weekly Review Pulse</h2>
                <p style="margin: 8px 0 0 0; color: #e8f0fe; font-size: 16px;">{report.product} • {report.iso_week}</p>
            </div>
            
            <div style="padding: 32px 24px;">
                <p style="margin: 0 0 16px 0; font-size: 16px; color: #3c4043;">
                    Analyzed <strong>{report.counts.get('reviews', 0)}</strong> clean reviews for {report.product} this week.
                </p>"""
                
        missing = [s for s in getattr(report, "expected_sources", []) if s not in report.sources_covered]
        if missing:
            html += f"""
                <div style="background-color: #fce8e6; padding: 12px; border-radius: 4px; margin-bottom: 24px; border-left: 4px solid #ea4335;">
                    <p style="margin: 0; color: #c5221f; font-size: 14px;">
                        <strong>⚠️ Partial Run:</strong> Missing sources: {', '.join(missing)}.
                    </p>
                </div>"""
                
        html += f"""
                <ul style="margin: 0 0 24px 0; padding-left: 20px; line-height: 1.5;">
                    {theme_bullets}
                </ul>
                
                <div style="margin-top: 24px;">
                    <a href="{doc_deep_link}" style="display: inline-block; background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; font-size: 16px;">
                        Read Full Report
                    </a>
                </div>
            </div>
        </div>
        """
        return html

    @staticmethod
    def build_email_text(report: PulseReport, doc_deep_link: str) -> str:
        text = f"WEEKLY REVIEW PULSE: {report.product.upper()} ({report.iso_week})\n"
        text += f"{'='*50}\n\n"
        text += f"Analyzed {report.counts.get('reviews', 0)} reviews this week.\n\n"
        
        if not report.themes:
            text += "No significant themes this week.\n"
        else:
            for theme in report.themes:
                text += f"• {theme.name}\n"
                
        text += f"\nRead full report: {doc_deep_link}\n"
        return text
