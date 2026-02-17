"""
Unit tests for VLabs API endpoints
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.main import app
from backend.database import Base, engine, SessionLocal

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables before each test and drop after"""
    Base.metadata.create_all(bind=engine)
    yield
    # Don't drop tables to preserve existing data
    # Base.metadata.drop_all(bind=engine)


class TestColleges:
    """Tests for /vlabs/colleges endpoints"""
    
    def test_list_colleges_empty(self):
        """Test listing colleges when none exist"""
        response = client.get("/vlabs/colleges")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_college(self):
        """Test creating a new college"""
        response = client.post("/vlabs/colleges", json={"name": "Test College"})
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test College"
        assert "id" in data
    
    def test_create_duplicate_college(self):
        """Test creating duplicate college fails"""
        client.post("/vlabs/colleges", json={"name": "Duplicate College"})
        response = client.post("/vlabs/colleges", json={"name": "Duplicate College"})
        assert response.status_code == 400


class TestDepartments:
    """Tests for /vlabs/departments endpoints"""
    
    def test_create_department(self):
        """Test creating a department"""
        # First create a college
        college_resp = client.post("/vlabs/colleges", json={"name": "Dept Test College"})
        college_id = college_resp.json()["id"]
        
        # Now create department
        response = client.post("/vlabs/departments", json={
            "name": "Computer Science",
            "college_id": college_id
        })
        assert response.status_code == 200
        assert response.json()["name"] == "Computer Science"
    
    def test_filter_departments_by_college(self):
        """Test filtering departments by college"""
        # Create college
        college_resp = client.post("/vlabs/colleges", json={"name": "Filter Test College"})
        college_id = college_resp.json()["id"]
        
        # Create department
        client.post("/vlabs/departments", json={
            "name": "Electronics",
            "college_id": college_id
        })
        
        # Filter
        response = client.get(f"/vlabs/departments?college_id={college_id}")
        assert response.status_code == 200
        depts = response.json()
        assert any(d["name"] == "Electronics" for d in depts)


class TestSubjects:
    """Tests for /vlabs/subjects endpoints"""
    
    def test_create_subject(self):
        """Test creating a subject"""
        # Create college and department first
        college_resp = client.post("/vlabs/colleges", json={"name": "Subject Test College"})
        college_id = college_resp.json()["id"]
        
        dept_resp = client.post("/vlabs/departments", json={
            "name": "IT",
            "college_id": college_id
        })
        dept_id = dept_resp.json()["id"]
        
        # Create subject
        response = client.post("/vlabs/subjects", json={
            "name": "Data Structures Lab",
            "code": "CS301",
            "semester": 3,
            "department_id": dept_id
        })
        assert response.status_code == 200
        assert response.json()["name"] == "Data Structures Lab"


class TestExperiments:
    """Tests for /vlabs/experiments endpoint"""
    
    def test_list_experiments_empty(self):
        """Test listing experiments"""
        response = client.get("/vlabs/experiments")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestSaveToVLabs:
    """Tests for /vlabs/save endpoint"""
    
    def test_save_syllabus(self):
        """Test saving parsed syllabus data"""
        # Create college and department
        college_resp = client.post("/vlabs/colleges", json={"name": "Save Test College"})
        college_id = college_resp.json()["id"]
        
        dept_resp = client.post("/vlabs/departments", json={
            "name": "Mechanical",
            "college_id": college_id
        })
        dept_id = dept_resp.json()["id"]
        
        # Save syllabus data
        response = client.post("/vlabs/save", json={
            "college_id": college_id,
            "department_id": dept_id,
            "semester": 5,
            "subjects": [
                {
                    "subject": "Thermodynamics Lab",
                    "subject_code": "ME501",
                    "experiments": [
                        {
                            "unit": 1,
                            "topic": "Heat transfer experiment",
                            "description": "Study heat transfer",
                            "suggested_simulation": "Heat Transfer"
                        }
                    ]
                }
            ]
        })
        assert response.status_code == 200
        assert response.json()["success"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
