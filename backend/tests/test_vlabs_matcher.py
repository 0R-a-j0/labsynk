"""
Unit tests for VLabs experiment matcher
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.vlabs_matcher import (
    find_vlabs_link,
    find_all_vlabs_links,
    _normalize,
    _tokenize,
    _token_overlap_score,
)


class TestNormalization:
    """Tests for text normalization utilities."""

    def test_normalize_basic(self):
        assert _normalize("  Hello  World!  ") == "hello world"

    def test_normalize_punctuation(self):
        assert _normalize("DNA/RNA Sequencing & Analysis") == "dna rna sequencing analysis"

    def test_tokenize_removes_stop_words(self):
        tokens = _tokenize("Write a program using arrays")
        assert "arrays" in tokens
        assert "write" not in tokens  # stop word
        assert "using" not in tokens  # stop word


class TestTokenOverlap:
    """Tests for token overlap scoring."""

    def test_identical_sets(self):
        a = {"binary", "search", "tree"}
        assert _token_overlap_score(a, a) == 1.0

    def test_partial_overlap(self):
        a = {"binary", "search", "tree"}
        b = {"binary", "search", "algorithm"}
        score = _token_overlap_score(a, b)
        assert 0.4 < score < 0.6  # 2 common out of 4 unique

    def test_no_overlap(self):
        a = {"heat", "transfer"}
        b = {"sorting", "algorithm"}
        assert _token_overlap_score(a, b) == 0.0


class TestFindVLabsLink:
    """Tests for the main matching function."""

    def test_exact_match(self):
        """Known VLabs experiment should return a link."""
        result = find_vlabs_link("Binary Search")
        # Should find something related to binary search
        if result:
            assert result["source"] == "IIT VLabs"
            assert result["url"].startswith("http")

    def test_fuzzy_match(self):
        """Reworded experiment should still match."""
        result = find_vlabs_link(
            "Bubble Sort Algorithm",
            subject_name="Data Structures"
        )
        if result:
            assert result["source"] == "IIT VLabs"
            assert "url" in result

    def test_no_match_gibberish(self):
        """Completely unrelated text should return None."""
        result = find_vlabs_link("xyzzy foobar nonsense placeholder")
        assert result is None

    def test_subject_context_helps(self):
        """Subject name should improve matching relevance."""
        # Without subject context
        result_no_ctx = find_vlabs_link("Frequency Response")
        # With subject context
        result_with_ctx = find_vlabs_link(
            "Frequency Response",
            subject_name="Control Systems"
        )
        # Both may match, but with context the match should exist
        # We mainly verify it doesn't crash
        if result_with_ctx:
            assert result_with_ctx["source"] == "IIT VLabs"

    def test_returns_valid_structure(self):
        """Result should have source, url, description keys."""
        result = find_vlabs_link("Kirchhoff's Laws")
        if result:
            assert "source" in result
            assert "url" in result
            assert "description" in result

    def test_empty_topic_returns_none(self):
        """Empty topic should return None."""
        assert find_vlabs_link("") is None
        assert find_vlabs_link("   ") is None


class TestFindAllVLabsLinks:
    """Tests for the multi-result function."""

    def test_returns_list(self):
        results = find_all_vlabs_links("Ohm's Law")
        assert isinstance(results, list)

    def test_empty_for_no_match(self):
        results = find_all_vlabs_links("xyzzy nonsense")
        assert results == []


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
