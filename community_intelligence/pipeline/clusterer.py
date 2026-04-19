"""
Topic clustering.

Strategy:
  - Embed each RawItem (sentence-transformers if installed, else hashed
    bag-of-words fallback so the pipeline runs in pure Python).
  - Greedy single-pass cosine-similarity clustering — no sklearn dep,
    suitable for the 100-300 items per refresh cycle we expect.
"""

import hashlib
import logging
import math
import re
from collections import defaultdict
from typing import List

from ..scrapers.base import RawItem

log = logging.getLogger(__name__)

SIM_THRESHOLD = 0.55   # cosine sim above which items collapse into one topic
_model = None


def _get_st_model():
    global _model
    if _model is not None:
        return _model
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('all-MiniLM-L6-v2')
        return _model
    except Exception:
        return None


def _embed(texts: List[str]) -> List[list]:
    model = _get_st_model()
    if model is not None:
        try:
            return model.encode(texts, normalize_embeddings=True).tolist()
        except Exception as exc:
            log.warning('sentence-transformers encode failed, fallback: %s', exc)

    # Fallback: hashed bag of words → 256-dim normalized vector
    vecs = []
    for t in texts:
        v = [0.0] * 256
        for tok in re.findall(r'[A-Za-z][A-Za-z0-9]{2,}', t.lower()):
            h = int(hashlib.md5(tok.encode()).hexdigest(), 16) % 256
            v[h] += 1.0
        norm = math.sqrt(sum(x * x for x in v)) or 1.0
        vecs.append([x / norm for x in v])
    return vecs


def _cosine(a: list, b: list) -> float:
    return sum(x * y for x, y in zip(a, b))


class Cluster(list):
    """A list of RawItem with the cluster's centroid attached."""
    centroid: list


def cluster_items(items: List[RawItem]) -> List[Cluster]:
    """
    Greedy single-pass clustering. Items entering the same cluster have
    cosine similarity >= SIM_THRESHOLD with the cluster centroid.
    Returns list of Cluster objects sorted by total cross-platform
    engagement descending. Each Cluster has a `.centroid` attribute.
    """
    if not items:
        return []
    vecs = _embed([it.text for it in items])
    clusters: list[dict] = []  # each: {'items':[], 'centroid': list, 'count': int}

    for it, v in zip(items, vecs):
        best_idx, best_sim = -1, -1.0
        for i, c in enumerate(clusters):
            s = _cosine(v, c['centroid'])
            if s > best_sim:
                best_sim, best_idx = s, i
        if best_sim >= SIM_THRESHOLD:
            c = clusters[best_idx]
            c['items'].append(it)
            n = c['count'] + 1
            c['centroid'] = [(c['centroid'][k] * c['count'] + v[k]) / n for k in range(len(v))]
            c['count'] = n
        else:
            clusters.append({'items': [it], 'centroid': list(v), 'count': 1})

    # Drop singleton clusters that aren't backed by multi-platform signal
    grouped = []
    for c in clusters:
        platforms = {it.platform for it in c['items']}
        engagement = sum(it.engagement for it in c['items'])
        if len(c['items']) >= 2 or len(platforms) >= 2 or engagement >= 500:
            grouped.append((engagement, c['items'], c['centroid']))

    grouped.sort(key=lambda x: x[0], reverse=True)
    out: list[Cluster] = []
    for _, items_, centroid in grouped:
        cluster = Cluster(items_)
        cluster.centroid = centroid
        out.append(cluster)
    return out


def fingerprint(centroid: list) -> str:
    """Stable short hash of a rounded centroid — used to dedupe topics across runs."""
    rounded = ','.join(f'{x:.2f}' for x in centroid)
    return hashlib.sha256(rounded.encode()).hexdigest()[:32]
