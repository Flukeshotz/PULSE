import os
import json
import glob
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import numpy as np

# Load model globally to avoid reloading for every product
model = None
def get_model():
    global model
    if model is None:
        model = SentenceTransformer('BAAI/bge-small-en-v1.5')
    return model

def generate_theme_map(product=None):
    if product is None:
        products = [d for d in os.listdir("data/reports") if os.path.isdir(os.path.join("data/reports", d))]
        for p in products:
            print(f"Generating theme map for {p}...")
            generate_theme_map(p)
        return
        
    reports_dir = f"data/reports/{product}"
    files = glob.glob(os.path.join(reports_dir, "*.json"))
    
    all_themes = set()
    for f in files:
        if "manifest.json" in f or "theme_map.json" in f:
            continue
        try:
            with open(f, "r") as fh:
                data = json.load(fh)
                for theme in data.get("themes", []):
                    # We strip the sentiment prefix for matching
                    name = theme.get("name", "")
                    if name.startswith("["):
                        name = name.split("]", 1)[-1].strip()
                    if name:
                        all_themes.add(name)
        except Exception as e:
            print(f"Error reading {f}: {e}")
            
    unique_themes = list(all_themes)
    if not unique_themes:
        print("No themes found.")
        return

    print(f"Embedding {len(unique_themes)} unique themes...")
    m = get_model()
    embeddings = m.encode(unique_themes)
    
    # Group themes
    threshold = 0.65
    theme_map = {}
    
    canonical_themes = []
    canonical_embeddings = []
    
    for idx, (theme, emb) in enumerate(zip(unique_themes, embeddings)):
        if not canonical_themes:
            canonical_themes.append(theme)
            canonical_embeddings.append(emb)
            theme_map[theme] = theme
            continue
            
        sims = cosine_similarity([emb], canonical_embeddings)[0]
        max_idx = np.argmax(sims)
        max_sim = sims[max_idx]
        
        if max_sim > threshold:
            theme_map[theme] = canonical_themes[max_idx]
        else:
            canonical_themes.append(theme)
            canonical_embeddings.append(emb)
            theme_map[theme] = theme
            
    # Now output a mapping from original (with prefix possibly) to canonical
    # We want the frontend to be able to map easily. The frontend can just strip prefix, map, and re-attach prefix.
    # So we just output the map.
    out_path = os.path.join(reports_dir, "theme_map.json")
    with open(out_path, "w") as fh:
        json.dump(theme_map, fh, indent=2)
        
    print(f"Saved theme_map.json with {len(canonical_themes)} canonical groups.")

if __name__ == "__main__":
    generate_theme_map()
