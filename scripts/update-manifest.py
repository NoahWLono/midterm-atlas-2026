"""Refresh hashes after intentional source updates. Does not change the snapshot date."""
import hashlib
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1] / 'public' / 'data'
path = root / 'model-manifest.json'
manifest = json.loads(path.read_text())
manifest['sources'] = [
    {'file': p.name, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size}
    for p in sorted(root.iterdir()) if p.is_file() and p != path
]
path.write_text(json.dumps(manifest, indent=2) + '\n')
print(f"Hashed {len(manifest['sources'])} source files.")
