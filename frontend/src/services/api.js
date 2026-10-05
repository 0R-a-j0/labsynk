export const API_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

const queryString = (values) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
        if (value !== null && value !== undefined && value !== '') params.set(key, value);
    }
    return params.size ? `?${params}` : '';
};

// All API traffic shares authentication, error handling, and the configured origin.
async function request(path, { method = 'GET', body, token, anonymous = false, signal } = {}) {
    const headers = {};
    const accessToken = anonymous ? null : (token ?? localStorage.getItem('labsynk_token'));
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (body !== undefined && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }
    let response;
    try {
        response = await fetch(`${API_URL}${path}`, { method, headers, body, signal });
    } catch (error) {
        if (signal?.aborted || error.name === 'AbortError') throw error;
        throw new Error('Cannot reach the API. Check your connection and try again. If this continues, the site’s backend or API URL needs attention.', { cause: error });
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const detail = typeof error.detail === 'string' ? error.detail
            : Array.isArray(error.detail) ? error.detail.map(item => item.msg).join('; ')
                : response.status >= 500
                    ? `The API is unavailable (${response.status}). Please try again shortly.`
                    : `Request failed (${response.status})`;
        throw new Error(detail);
    }
    if (response.status === 204) return null;
    if (response.headers.get('content-type')?.includes('text/html')) {
        throw new Error('The API returned a web page instead of data. Check the site’s API URL or /api proxy configuration.');
    }
    return response.json();
}

const upload = (path, file, options = {}) => {
    const body = new FormData();
    body.append('file', file);
    return request(path, { ...options, method: 'POST', body });
};
const post = (path, body) => request(path, { method: 'POST', body });
const put = (path, body) => request(path, { method: 'PUT', body });
const remove = path => request(path, { method: 'DELETE' });

export const api = {
    login: (email, password) => request('/auth/login', {
        method: 'POST', body: { email, password }, anonymous: true,
    }),
    checkAuth: token => request('/auth/check', { token }),
    getUsers: () => request('/auth/users'),
    getDirectory: () => request('/auth/directory'),
    createUser: (email, password, role, department_id = null, name = null) =>
        post('/auth/register', { email, password, role, department_id: department_id ? Number(department_id) : null, name }),
    deleteUser: id => remove(`/auth/users/${id}`),
    updateUser: (id, updates) => put(`/auth/users/${id}`, updates),

    getInventory: (skip = 0, limit = 100, filters = {}) =>
        request(`/inventory/${queryString({ ...filters, skip, limit })}`),
    searchInventory: q => request(`/inventory/search${queryString({ q })}`),
    createItem: item => post('/inventory/', item),
    updateItem: (id, item) => put(`/inventory/${id}`, item),
    deleteItem: id => remove(`/inventory/${id}`),
    getSchedules: () => request('/schedule/'),
    createSchedule: schedule => post('/schedule/', schedule),
    deleteSchedule: id => remove(`/schedule/${id}`),
    getLabRooms: () => request('/schedule/rooms'),

    uploadSyllabus: (file, options) => upload('/syllabus/upload', file, options),
    manualSyllabus: data => post('/syllabus/manual', data),
    chatWithAI: (query, context = '') => post('/ai/chat', { query, context }),

    getColleges: () => request('/vlabs/colleges'),
    createCollege: name => post('/vlabs/colleges', { name }),
    deleteCollege: id => remove(`/vlabs/colleges/${id}`),
    getDepartments: (college_id = null) => request(`/vlabs/departments${queryString({ college_id })}`),
    createDepartment: (name, college_id) => post('/vlabs/departments', { name, college_id }),
    deleteDepartment: id => remove(`/vlabs/departments/${id}`),
    getSubjects: (department_id = null, semester = null) =>
        request(`/vlabs/subjects${queryString({ department_id, semester })}`),
    createSubject: subject => post('/vlabs/subjects', subject),
    updateSubject: (id, data) => put(`/vlabs/subjects/${id}`, data),
    deleteSubject: id => remove(`/vlabs/subjects/${id}`),
    getVLabExperiments: (subject_id = null, department_id = null, semester = null) =>
        request(`/vlabs/experiments${queryString({ subject_id, department_id, semester })}`),
    createExperiment: experiment => post('/vlabs/experiments', experiment),
    updateExperiment: (id, data) => put(`/vlabs/experiments/${id}`, data),
    deleteExperiment: id => remove(`/vlabs/experiments/${id}`),
    saveToVLabs: (college_id, department_id, semester, subjects) =>
        post('/vlabs/save', { college_id, department_id, semester, subjects }),
    uploadLabManual: (subjectId, file) => upload(`/vlabs/subjects/${subjectId}/lab-manual`, file),

    suggestResource: data => post('/engagement/resources/suggest', data),
    getSuggestions: () => request('/engagement/resources/suggestions'),
    updateSuggestionStatus: (id, status) => request(
        `/engagement/resources/suggestions/${id}/status${queryString({ status })}`, { method: 'PATCH' }),
    reportInventoryIssue: (data, token) => request('/engagement/inventory/report', { method: 'POST', body: data, token }),
    getInventoryReports: () => request('/engagement/inventory/reports'),
    updateReportStatus: (id, status) => request(
        `/engagement/inventory/reports/${id}/status${queryString({ status })}`, { method: 'PATCH' }),
};
