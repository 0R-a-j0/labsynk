"""
VLabs Experiment Matcher — fuzzy-matches syllabus experiment topics
against the IIT VLabs experiment database (vlabs_experiments.json).

Matching strategy (3-tier):
  1. Exact substring match on experiment name
  2. Token-overlap similarity (handles word reordering)
  3. Discipline/Lab context narrowing via subject name
"""

import json
import os
import re
from difflib import SequenceMatcher
from typing import Optional, Dict, List

# ── Load VLabs data once at import time ──────────────────────────────

_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vlabs_experiments.json")

_vlabs_data: List[Dict] = []
_vlabs_index: Dict[str, List[int]] = {}  # keyword → list of indices into _vlabs_data


def _normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    text = text.lower().strip()
    text = re.sub(r"[''`]", "", text)  # collapse apostrophes (keep as one token)
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _tokenize(text: str) -> set:
    """Return set of meaningful tokens (len >= 2)."""
    stop_words = {
        'the', 'and', 'for', 'with', 'using', 'from', 'its', 'this',
        'that', 'are', 'was', 'were', 'been', 'have', 'has', 'had',
        'not', 'but', 'can', 'will', 'shall', 'may', 'all', 'each',
        'any', 'such', 'also', 'into', 'than', 'then', 'when', 'which',
        'who', 'how', 'what', 'where', 'why', 'about', 'write', 'program',
        'study', 'implement', 'exercise', 'experiment', 'lab', 'practical',
        'based', 'use', 'used'
    }
    tokens = set(_normalize(text).split())
    return tokens - stop_words


def _load_data():
    """Load VLabs JSON and build keyword index."""
    global _vlabs_data, _vlabs_index

    if _vlabs_data:
        return  # already loaded

    if not os.path.exists(_DATA_PATH):
        print(f"⚠️  VLabs data file not found: {_DATA_PATH}")
        return

    try:
        with open(_DATA_PATH, "r", encoding="utf-8") as f:
            _vlabs_data = json.load(f)
    except Exception as e:
        print(f"⚠️  Failed to load VLabs data: {e}")
        return

    # Build inverted keyword index for fast lookup
    for idx, entry in enumerate(_vlabs_data):
        tokens = _tokenize(entry.get("experiment_name", ""))
        tokens |= _tokenize(entry.get("lab_name", ""))
        for token in tokens:
            if len(token) >= 3:
                _vlabs_index.setdefault(token, []).append(idx)

    print(f"✅ VLabs matcher loaded: {len(_vlabs_data)} experiments, {len(_vlabs_index)} keywords indexed")


# Load on import
_load_data()


def _token_overlap_score(tokens_a: set, tokens_b: set) -> float:
    """Jaccard-like overlap score between two token sets."""
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    return len(intersection) / len(union)


def _sequence_similarity(a: str, b: str) -> float:
    """SequenceMatcher ratio between two normalized strings."""
    return SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()


def find_vlabs_link(
    experiment_topic: str,
    subject_name: str = "",
    threshold: float = 0.35
) -> Optional[Dict]:
    """
    Find the best matching VLabs experiment URL for a given topic.

    Args:
        experiment_topic: The experiment topic/name from the syllabus
        subject_name: The subject/lab name from the syllabus (for context narrowing)
        threshold: Minimum similarity score to accept a match (0.0-1.0)

    Returns:
        Dict with {source, url, description} or None if no match above threshold
    """
    if not _vlabs_data or not experiment_topic or not experiment_topic.strip():
        return None

    topic_norm = _normalize(experiment_topic)
    topic_tokens = _tokenize(experiment_topic)
    subject_tokens = _tokenize(subject_name) if subject_name else set()

    # ── Tier 3: Narrow candidates by subject/lab context ──────────
    # Find entries whose lab_name or discipline_name relates to the subject
    candidate_indices = set()

    # Use keyword index to find candidates matching topic tokens
    for token in topic_tokens:
        if token in _vlabs_index:
            candidate_indices.update(_vlabs_index[token])

    # If we have subject context, also add candidates from matching labs
    if subject_tokens:
        for token in subject_tokens:
            if token in _vlabs_index:
                candidate_indices.update(_vlabs_index[token])

    # If no candidates from index, search all (but cap for performance)
    if not candidate_indices:
        candidate_indices = set(range(min(len(_vlabs_data), 500)))

    # ── Score candidates ──────────────────────────────────────────
    best_score = 0.0
    best_entry = None

    for idx in candidate_indices:
        entry = _vlabs_data[idx]
        exp_name = entry.get("experiment_name", "")
        exp_norm = _normalize(exp_name)
        lab_name = entry.get("lab_name", "")

        # Tier 1: Exact substring match (highest score)
        if topic_norm in exp_norm or exp_norm in topic_norm:
            score = 0.95
        else:
            # Tier 2: Token overlap + sequence similarity
            exp_tokens = _tokenize(exp_name)
            token_score = _token_overlap_score(topic_tokens, exp_tokens)
            seq_score = _sequence_similarity(experiment_topic, exp_name)

            # Weighted combination
            score = (token_score * 0.6) + (seq_score * 0.4)

            # Bonus if subject matches lab name
            if subject_tokens and lab_name:
                lab_tokens = _tokenize(lab_name)
                subject_lab_overlap = _token_overlap_score(subject_tokens, lab_tokens)
                if subject_lab_overlap > 0.2:
                    score += 0.1  # Context bonus

        if score > best_score:
            best_score = score
            best_entry = entry

    # ── Return result if above threshold ──────────────────────────
    if best_entry and best_score >= threshold:
        url = best_entry.get("experiment_url", "")
        matched_name = best_entry.get("experiment_name", "")
        lab = best_entry.get("lab_name", "")

        if url:
            return {
                "source": "IIT VLabs",
                "url": url,
                "description": f"Virtual Lab: {matched_name} ({lab})"
            }

    return None


def find_all_vlabs_links(
    experiment_topic: str,
    subject_name: str = "",
    max_results: int = 1,
    threshold: float = 0.35
) -> List[Dict]:
    """
    Find multiple matching VLabs experiment URLs (for future use).
    Currently returns up to max_results best matches.
    """
    result = find_vlabs_link(experiment_topic, subject_name, threshold)
    return [result] if result else []
