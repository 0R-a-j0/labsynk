"""
VLabs Experiment Matcher — hierarchical matching against the IIT VLabs
experiment database (vlabs_experiments.json).

Matching pipeline (3 stages):
  Stage 1 — Discipline : subject_name → best matching discipline
  Stage 2 — Lab        : subject_name → best matching lab within that discipline
  Stage 3 — Experiment : experiment_topic → best matching experiment within that lab

Falls through to a wider pool if a stage produces no confident candidates.
"""

import json
import os
import re
from difflib import SequenceMatcher
from typing import Optional, Dict, List

# ── Data path ────────────────────────────────────────────────────────

_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "vlabs_experiments.json"
)

# ── Hierarchical index ───────────────────────────────────────────────
# Structure: { discipline_name: { lab_name: [entry, ...] } }
_index: Dict[str, Dict[str, List[Dict]]] = {}

# ── Fast-path discipline hint keywords ──────────────────────────────
# Maps lowercase keyword fragments → discipline name in the dataset
DISCIPLINE_HINTS: Dict[str, str] = {
    # Computer Science
    "computer": "Computer Science & Engineering",
    "cse": "Computer Science & Engineering",
    "data structure": "Computer Science & Engineering",
    "dsa": "Computer Science & Engineering",
    "algorithm": "Computer Science & Engineering",
    "dbms": "Computer Science & Engineering",
    "database": "Computer Science & Engineering",
    "programming": "Computer Science & Engineering",
    "python": "Computer Science & Engineering",
    "java": "Computer Science & Engineering",
    "c programming": "Computer Science & Engineering",
    "operating system": "Computer Science & Engineering",
    "network": "Computer Science & Engineering",
    "cryptography": "Computer Science & Engineering",
    "image processing": "Computer Science & Engineering",
    "neural network": "Computer Science & Engineering",
    "artificial intelligence": "Computer Science & Engineering",
    "machine learning": "Computer Science & Engineering",
    "nlp": "Computer Science & Engineering",
    "natural language": "Computer Science & Engineering",
    "speech": "Computer Science & Engineering",
    # Electrical
    "electrical": "Electrical Engineering",
    "power": "Electrical Engineering",
    "machine": "Electrical Engineering",
    "transformer": "Electrical Engineering",
    "motor": "Electrical Engineering",
    "generator": "Electrical Engineering",
    # Electronics
    "electronics": "Electronics & Communications",
    "analog": "Electronics & Communications",
    "digital": "Electronics & Communications",
    "communication": "Electronics & Communications",
    "signal": "Electronics & Communications",
    "amplifier": "Electronics & Communications",
    "microprocessor": "Electronics & Communications",
    "vlsi": "Electronics & Communications",
    "embedded": "Electronics & Communications",
    # Mechanical
    "mechanical": "Mechanical Engineering",
    "thermodynamics": "Mechanical Engineering",
    "fluid": "Mechanical Engineering",
    "heat transfer": "Mechanical Engineering",
    "manufacturing": "Mechanical Engineering",
    "dynamics": "Mechanical Engineering",
    # Civil
    "civil": "Civil Engineering",
    "structural": "Civil Engineering",
    "concrete": "Civil Engineering",
    "soil": "Civil Engineering",
    "surveying": "Civil Engineering",
    # Chemical
    "chemical": "Chemical Engineering",
    "reaction": "Chemical Engineering",
    "process": "Chemical Engineering",
    # Physical Sciences
    "physics": "Physical Sciences",
    "optics": "Physical Sciences",
    "mechanics": "Physical Sciences",
    "wave": "Physical Sciences",
    "quantum": "Physical Sciences",
    # Chemical Sciences
    "chemistry": "Chemical Sciences",
    "organic": "Chemical Sciences",
    "inorganic": "Chemical Sciences",
    # Biotech
    "biotech": "Biotechnology and Biomedical Engineering",
    "biology": "Biotechnology and Biomedical Engineering",
    "biochem": "Biotechnology and Biomedical Engineering",
    "biomedical": "Biotechnology and Biomedical Engineering",
    "microbiology": "Biotechnology and Biomedical Engineering",
}


# ── Text utilities ───────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """Lowercase, collapse apostrophes, replace other punctuation with space."""
    text = text.lower().strip()
    text = re.sub(r"[''`]", "", text)          # collapse apostrophes
    text = re.sub(r"[^a-z0-9\s]", " ", text)   # replace other punctuation
    text = re.sub(r"\s+", " ", text).strip()
    return text


_STOP_WORDS = {
    "the", "and", "for", "with", "using", "from", "its", "this", "that",
    "are", "was", "were", "been", "have", "has", "had", "not", "but",
    "can", "will", "shall", "may", "all", "each", "any", "such", "also",
    "into", "than", "then", "when", "which", "who", "how", "what",
    "where", "why", "about", "write", "program", "study", "implement",
    "exercise", "experiment", "lab", "practical", "based", "use", "used",
    "new", "introduction", "basic", "advanced", "simple",
}


def _tokenize(text: str) -> set:
    """Return meaningful tokens (len ≥ 2, not stop-words)."""
    return {t for t in _normalize(text).split() if len(t) >= 2 and t not in _STOP_WORDS}


def _overlap(a: set, b: set) -> float:
    """Jaccard overlap score."""
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _seq_sim(a: str, b: str) -> float:
    """Sequence-matcher similarity on normalised strings."""
    return SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()


def _score(topic: str, candidate: str, topic_tokens: set) -> float:
    """Combined similarity score between a topic and a candidate string."""
    cand_norm = _normalize(candidate)
    topic_norm = _normalize(topic)
    # Exact substring shortcut
    if topic_norm in cand_norm or cand_norm in topic_norm:
        return 0.95
    cand_tokens = _tokenize(candidate)
    return _overlap(topic_tokens, cand_tokens) * 0.65 + _seq_sim(topic, candidate) * 0.35


# ── Build hierarchical index ─────────────────────────────────────────

def _load_data():
    global _index
    if _index:
        return

    if not os.path.exists(_DATA_PATH):
        print(f"⚠️  VLabs data file not found: {_DATA_PATH}")
        return

    try:
        with open(_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"⚠️  Failed to load VLabs data: {e}")
        return

    for entry in data:
        disc = entry.get("discipline_name", "Unknown")
        lab  = entry.get("lab_name", "Unknown")
        _index.setdefault(disc, {}).setdefault(lab, []).append(entry)

    total_exp = sum(len(e) for d in _index.values() for e in d.values())
    print(f"✅ VLabs matcher loaded: {total_exp} experiments, "
          f"{len(_index)} disciplines, "
          f"{sum(len(d) for d in _index.values())} labs")


_load_data()


# ── Stage helpers ─────────────────────────────────────────────────────

def _match_discipline(subject_name: str, fallback_threshold: float = 0.20) -> List[str]:
    """
    Stage 1: Return list of discipline names that best match subject_name.
    Uses fast-path keyword hints first, then fuzzy scoring.
    Always returns at least all disciplines as a fallback.
    """
    if not subject_name or not _index:
        return list(_index.keys())

    subj_norm = _normalize(subject_name)

    # Fast-path: keyword hint lookup
    for keyword, disc_name in DISCIPLINE_HINTS.items():
        if keyword in subj_norm and disc_name in _index:
            return [disc_name]

    # Fuzzy fallback: score all disciplines
    subj_tokens = _tokenize(subject_name)
    scores = {}
    for disc in _index:
        s = _score(subject_name, disc, subj_tokens)
        if s > 0:
            scores[disc] = s

    if not scores:
        return list(_index.keys())

    best = max(scores.values())
    if best < fallback_threshold:
        return list(_index.keys())          # no confident match → search all

    # Return disciplines within 80% of best score
    return [d for d, s in scores.items() if s >= best * 0.8]


def _match_labs(disciplines: List[str], subject_name: str,
                fallback_threshold: float = 0.15) -> Dict[str, List[Dict]]:
    """
    Stage 2: Within the given disciplines, return the labs that best match subject_name.
    Returns { lab_name: [entries] }.
    """
    if not subject_name:
        # No subject context → return all labs in matched disciplines
        result: Dict[str, List[Dict]] = {}
        for disc in disciplines:
            result.update(_index.get(disc, {}))
        return result

    subj_tokens = _tokenize(subject_name)
    subj_norm   = _normalize(subject_name)

    lab_scores: Dict[str, float] = {}
    lab_entries: Dict[str, List[Dict]] = {}

    for disc in disciplines:
        for lab, entries in _index.get(disc, {}).items():
            s = _score(subject_name, lab, subj_tokens)
            if s > lab_scores.get(lab, 0):
                lab_scores[lab] = s
                lab_entries[lab] = entries

    if not lab_scores:
        # fallback: all labs in discipline pool
        for disc in disciplines:
            lab_entries.update(_index.get(disc, {}))
        return lab_entries

    best = max(lab_scores.values())
    if best < fallback_threshold:
        return lab_entries              # no confident match → all labs

    cutoff = best * 0.75
    return {lab: lab_entries[lab] for lab, s in lab_scores.items() if s >= cutoff}


def _match_experiment(labs: Dict[str, List[Dict]], experiment_topic: str,
                      threshold: float = 0.30) -> Optional[Dict]:
    """
    Stage 3: Within the given lab entries, find the best matching experiment.
    Returns the best entry dict or None.
    """
    topic_tokens = _tokenize(experiment_topic)
    best_score   = 0.0
    best_entry   = None

    for entries in labs.values():
        for entry in entries:
            exp_name = entry.get("experiment_name", "")
            s = _score(experiment_topic, exp_name, topic_tokens)
            if s > best_score:
                best_score = s
                best_entry = entry

    if best_entry and best_score >= threshold:
        return best_entry
    return None


# ── Public API ───────────────────────────────────────────────────────

def find_vlabs_link(
    experiment_topic: str,
    subject_name: str = "",
) -> Optional[Dict]:
    """
    Find the best matching VLabs experiment URL using a 3-stage hierarchical funnel:
      Stage 1 → Discipline (by subject_name)
      Stage 2 → Lab        (by subject_name within discipline)
      Stage 3 → Experiment (by experiment_topic within lab)

    Returns:
        { source, url, description } or None if no confident match.
    """
    if not _index or not experiment_topic or not experiment_topic.strip():
        return None

    # Stage 1: Discipline
    disciplines = _match_discipline(subject_name)

    # Stage 2: Lab
    labs = _match_labs(disciplines, subject_name)

    # Stage 3: Experiment
    entry = _match_experiment(labs, experiment_topic)

    if entry:
        url = entry.get("experiment_url", "")
        if url:
            return {
                "source": "IIT VLabs",
                "url": url,
                "description": (
                    f"Virtual Lab: {entry.get('experiment_name', '')} "
                    f"({entry.get('lab_name', '')})"
                ),
            }

    return None


def find_all_vlabs_links(
    experiment_topic: str,
    subject_name: str = "",
    max_results: int = 1,
) -> List[Dict]:
    """Convenience wrapper — returns a list (for future multi-result support)."""
    result = find_vlabs_link(experiment_topic, subject_name)
    return [result] if result else []
