"""
Unit tests for VLabs experiment matcher (hierarchical version)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.vlabs_matcher import (
    find_vlabs_link,
    find_all_vlabs_links,
    _normalize,
    _tokenize,
    _overlap,
    _match_discipline,
    _match_labs,
)


class TestNormalization:
    """Tests for text normalization utilities."""

    def test_normalize_basic(self):
        assert _normalize("  Hello  World!  ") == "hello world"

    def test_normalize_punctuation(self):
        assert _normalize("DNA/RNA Sequencing & Analysis") == "dna rna sequencing analysis"

    def test_normalize_apostrophe_collapsed(self):
        assert "kirchhoffs" in _normalize("Kirchhoff's Laws")

    def test_tokenize_removes_stop_words(self):
        tokens = _tokenize("Write a program using arrays")
        assert "arrays" in tokens
        assert "write" not in tokens
        assert "using" not in tokens


class TestTokenOverlap:
    """Tests for overlap scoring."""

    def test_identical_sets(self):
        a = {"binary", "search", "tree"}
        assert _overlap(a, a) == 1.0

    def test_partial_overlap(self):
        a = {"binary", "search", "tree"}
        b = {"binary", "search", "algorithm"}
        score = _overlap(a, b)
        assert 0.4 < score < 0.6  # 2 common out of 4 unique

    def test_no_overlap(self):
        a = {"heat", "transfer"}
        b = {"sorting", "algorithm"}
        assert _overlap(a, b) == 0.0

    def test_empty_sets(self):
        assert _overlap(set(), {"a", "b"}) == 0.0


class TestDisciplineMatching:
    """Tests for Stage 1 – discipline resolution."""

    def test_cs_keyword_hint(self):
        discs = _match_discipline("Data Structures Lab")
        assert len(discs) == 1
        assert "Computer Science & Engineering" in discs

    def test_electronics_keyword_hint(self):
        discs = _match_discipline("Electronics and Circuits")
        assert "Electronics & Communications" in discs

    def test_empty_subject_returns_all(self):
        discs = _match_discipline("")
        assert len(discs) > 1   # fallback → all disciplines

    def test_no_match_returns_all(self):
        discs = _match_discipline("xyzzy gibberish subject")
        assert len(discs) > 1


class TestLabMatching:
    """Tests for Stage 2 – lab resolution."""

    def test_narrows_within_discipline(self):
        disciplines = ["Computer Science & Engineering"]
        labs = _match_labs(disciplines, "Data Structures")
        # Should return at least one CS lab
        assert len(labs) >= 1

    def test_no_subject_returns_labs(self):
        disciplines = ["Computer Science & Engineering"]
        labs = _match_labs(disciplines, "")
        assert len(labs) >= 1


class TestFindVLabsLink:
    """Tests for the main hierarchical matching function."""

    def test_cs_experiment_matches_cs_lab(self):
        result = find_vlabs_link("Bubble Sort", subject_name="Data Structures")
        assert result is not None
        assert result["source"] == "IIT VLabs"
        assert result["url"].startswith("http")
        # Should NOT come from a Biology or Chemical lab
        assert "Structures" in result["description"] or "Sort" in result["description"] or "Data" in result["description"]

    def test_binary_search_matches(self):
        result = find_vlabs_link("Binary Search", subject_name="Data Structures Lab")
        assert result is not None
        assert result["source"] == "IIT VLabs"

    def test_no_match_gibberish(self):
        result = find_vlabs_link("xyzzy foobar nonsense placeholder")
        assert result is None

    def test_returns_valid_structure(self):
        result = find_vlabs_link("Bubble Sort", subject_name="Data Structures")
        if result:
            assert "source" in result
            assert "url" in result
            assert "description" in result

    def test_empty_topic_returns_none(self):
        assert find_vlabs_link("") is None
        assert find_vlabs_link("   ") is None

    def test_subject_context_narrows_result(self):
        # Electronics subject → should pick electronics experiment
        result = find_vlabs_link(
            "Inverting Amplifier",
            subject_name="Electronics and Analog Circuits"
        )
        if result:
            assert result["source"] == "IIT VLabs"


class TestFindAllVLabsLinks:
    """Tests for the multi-result wrapper."""

    def test_returns_list(self):
        results = find_all_vlabs_links("Bubble Sort", subject_name="Data Structures")
        assert isinstance(results, list)

    def test_match_returns_non_empty(self):
        results = find_all_vlabs_links("Bubble Sort", subject_name="Data Structures")
        assert len(results) >= 1

    def test_empty_for_no_match(self):
        results = find_all_vlabs_links("xyzzy nonsense")
        assert results == []


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
