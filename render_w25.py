import json
import os
from src.models import PulseReport, Theme
from src.render.builder import ReportBuilder

def render_w25():
    path = "data/reports/indmoney/2026-W25.json"
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
        
    with open(path, "r") as f:
        data = json.load(f)
        
    themes = [Theme(**t) for t in data.get("themes", [])]
    data["themes"] = themes
    report = PulseReport(**data)
    
    print("=== DOC BLOCKS ===")
    blocks = ReportBuilder.build_doc_blocks(report)
    for b in blocks:
        print(f"[{b['type']}] {b['text']}")
        
    print("\n=== EMAIL TEASER (TEXT) ===")
    text = ReportBuilder.build_email_text(report, "https://docs.google.com/document/d/1nnQF8o8ykphaydKrNnciMWQVQmhBiPDr6vuM-HZv2f4/edit")
    print(text)
    
if __name__ == "__main__":
    render_w25()
