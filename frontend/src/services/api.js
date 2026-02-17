const API_URL = 'http://127.0.0.1:8000';

// Helper to get auth header
const getAuthHeader = () => {
    const token = localStorage.getItem('labsynk_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
    // ====== Auth API ======
    login: async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Login failed');
        }
        return response.json();
    },

    checkAuth: async (token) => {
        const response = await fetch(`${API_URL}/auth/check`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) return { authenticated: false };
        return response.json();
    },

    getUsers: async () => {
        const response = await fetch(`${API_URL}/auth/users`, {
            headers: getAuthHeader(),
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },

    createUser: async (email, password, role, department_id = null) => {
        const body = { email, password, role };
        if (department_id) body.department_id = parseInt(department_id);
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to create user');
        }
        return response.json();
    },

    deleteUser: async (userId) => {
        const response = await fetch(`${API_URL}/auth/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to delete user');
        }
        return response.json();
    },

    updateUser: async (userId, updates) => {
        const response = await fetch(`${API_URL}/auth/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader(),
            },
            body: JSON.stringify(updates),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to update user');
        }
        return response.json();
    },

    // ====== Inventory API ======
    getInventory: async (skip = 0, limit = 100) => {
        const response = await fetch(`${API_URL}/inventory/?skip=${skip}&limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch inventory');
        return response.json();
    },

    searchInventory: async (query) => {
        const response = await fetch(`${API_URL}/inventory/search?q=${query}`);
        if (!response.ok) throw new Error('Failed to search inventory');
        return response.json();
    },

    createItem: async (item) => {
        const response = await fetch(`${API_URL}/inventory/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
        });
        if (!response.ok) throw new Error('Failed to create item');
        return response.json();
    },

    updateItem: async (id, item) => {
        const response = await fetch(`${API_URL}/inventory/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
        });
        if (!response.ok) throw new Error('Failed to update item');
        return response.json();
    },

    getSchedules: async () => {
        const response = await fetch(`${API_URL}/schedule/`);
        if (!response.ok) throw new Error('Failed to fetch schedules');
        return response.json();
    },

    createSchedule: async (schedule) => {
        const response = await fetch(`${API_URL}/schedule/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schedule),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create schedule');
        }
        return response.json();
    },

    uploadSyllabus: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_URL}/syllabus/upload`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to parse syllabus');
        }
        return response.json();
    },

    manualSyllabus: async (data) => {
        const response = await fetch(`${API_URL}/syllabus/manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to process manual syllabus');
        return response.json();
    },

    chatWithAI: async (query, context = "") => {
        const response = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, context }),
        });
        if (!response.ok) throw new Error('Failed to get AI response');
        return response.json();
    },

    // ====== VLabs API ======

    getColleges: async () => {
        const response = await fetch(`${API_URL}/vlabs/colleges`);
        if (!response.ok) throw new Error('Failed to fetch colleges');
        return response.json();
    },

    createCollege: async (name) => {
        const response = await fetch(`${API_URL}/vlabs/colleges`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to create college');
        }
        return response.json();
    },

    getDepartments: async (collegeId = null) => {
        const url = collegeId
            ? `${API_URL}/vlabs/departments?college_id=${collegeId}`
            : `${API_URL}/vlabs/departments`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch departments');
        return response.json();
    },

    createDepartment: async (name, collegeId) => {
        const response = await fetch(`${API_URL}/vlabs/departments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, college_id: collegeId }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to create department');
        }
        return response.json();
    },

    deleteCollege: async (collegeId) => {
        const response = await fetch(`${API_URL}/vlabs/colleges/${collegeId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to delete college');
        }
        return response.json();
    },

    deleteDepartment: async (departmentId) => {
        const response = await fetch(`${API_URL}/vlabs/departments/${departmentId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to delete department');
        }
        return response.json();
    },

    getSubjects: async (departmentId = null, semester = null) => {
        const params = new URLSearchParams();
        if (departmentId) params.append('department_id', departmentId);
        if (semester) params.append('semester', semester);
        const url = `${API_URL}/vlabs/subjects${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch subjects');
        return response.json();
    },

    getVLabExperiments: async (subjectId = null, departmentId = null, semester = null) => {
        const params = new URLSearchParams();
        if (subjectId) params.append('subject_id', subjectId);
        if (departmentId) params.append('department_id', departmentId);
        if (semester) params.append('semester', semester);
        const url = `${API_URL}/vlabs/experiments${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch experiments');
        return response.json();
    },

    createSubject: async (subject) => {
        const response = await fetch(`${API_URL}/vlabs/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subject),
        });
        if (!response.ok) throw new Error('Failed to create subject');
        return response.json();
    },

    updateSubject: async (id, data) => {
        const response = await fetch(`${API_URL}/vlabs/subjects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update subject');
        return response.json();
    },

    deleteSubject: async (id) => {
        const response = await fetch(`${API_URL}/vlabs/subjects/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete subject');
        return response.json();
    },

    createExperiment: async (experiment) => {
        const response = await fetch(`${API_URL}/vlabs/experiments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(experiment),
        });
        if (!response.ok) throw new Error('Failed to create experiment');
        return response.json();
    },

    updateExperiment: async (id, data) => {
        const response = await fetch(`${API_URL}/vlabs/experiments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update experiment');
        return response.json();
    },

    deleteExperiment: async (id) => {
        const response = await fetch(`${API_URL}/vlabs/experiments/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete experiment');
        return response.json();
    },

    saveToVLabs: async (collegeId, departmentId, semester, subjects) => {
        const response = await fetch(`${API_URL}/vlabs/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                college_id: collegeId,
                department_id: departmentId,
                semester: semester,
                subjects: subjects
            }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to save to VLabs');
        }
        return response.json();
    },

    // ====== Lab Manual API ======
    uploadLabManual: async (subjectId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_URL}/vlabs/subjects/${subjectId}/lab-manual`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to upload lab manual');
        }
        return response.json();
    },
};
