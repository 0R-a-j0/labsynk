"""
Unit tests for Syllabus Parser (pdfplumber-based)
"""
import pytest
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.services.syllabus_service import parse_syllabus_with_pdfplumber


class TestPdfPlumberParser:
    """Tests for the pdfplumber-based syllabus parser"""
    
    @pytest.fixture
    def sample_pdf_content(self):
        """Load the sample PDF if it exists"""
        pdf_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "5th Sem labs.pdf")
        if os.path.exists(pdf_path):
            with open(pdf_path, "rb") as f:
                return f.read()
        return None
    
    def test_parse_empty_content(self):
        """Test parsing empty content returns empty subjects"""
        result = parse_syllabus_with_pdfplumber(b"")
        assert result["subjects"] == []
    
    def test_parse_real_pdf(self, sample_pdf_content):
        """Test parsing the real 5th Sem labs PDF"""
        if sample_pdf_content is None:
            pytest.skip("5th Sem labs.pdf not found")
        
        result = parse_syllabus_with_pdfplumber(sample_pdf_content)
        
        # Should find multiple subjects (7 in this PDF)
        assert len(result["subjects"]) >= 1
        
        # Check first subject has expected structure
        first_subject = result["subjects"][0]
        assert "subject" in first_subject
        assert "subject_code" in first_subject
        assert "experiments" in first_subject
        assert len(first_subject["experiments"]) > 0
    
    def test_subject_names_are_meaningful(self, sample_pdf_content):
        """Test that subject names are extracted from page headers, not junk text"""
        if sample_pdf_content is None:
            pytest.skip("5th Sem labs.pdf not found")
        
        result = parse_syllabus_with_pdfplumber(sample_pdf_content)
        
        for subject in result["subjects"]:
            name = subject["subject"]
            # Subject name should be meaningful, not random junk
            assert len(name) > 5
            # Should not contain random numbers or codes as primary name
            assert not name.startswith("UNIT")
            assert not name.startswith("[")
    
    def test_experiments_have_units(self, sample_pdf_content):
        """Test that experiments have unit numbers extracted"""
        if sample_pdf_content is None:
            pytest.skip("5th Sem labs.pdf not found")
        
        result = parse_syllabus_with_pdfplumber(sample_pdf_content)
        
        for subject in result["subjects"]:
            for exp in subject["experiments"]:
                # Should have unit number
                assert "unit" in exp
                assert exp["unit"] is not None
                assert isinstance(exp["unit"], int)
    
    def test_experiments_have_topics(self, sample_pdf_content):
        """Test that experiments have meaningful topics"""
        if sample_pdf_content is None:
            pytest.skip("5th Sem labs.pdf not found")
        
        result = parse_syllabus_with_pdfplumber(sample_pdf_content)
        
        for subject in result["subjects"]:
            for exp in subject["experiments"]:
                assert "topic" in exp
                assert len(exp["topic"]) > 5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
