import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { api, API_URL } from '../src/services/api.js';

let calls;
beforeEach(() => {
    calls = [];
    globalThis.localStorage = { getItem: () => 'synthetic-token' };
    globalThis.fetch = async (url, options) => {
        calls.push({ url, ...options });
        return new Response('{}', { status: 200 });
    };
});

test('mutations and uploads consistently send the stored token', async () => {
    await api.createItem({ name: 'Test' });
    await api.deleteItem(4);
    await api.createSchedule({ lab_name: 'Lab' });
    await api.deleteSchedule(5);
    await api.createCollege('College');
    await api.uploadLabManual(1, new Blob(['%PDF-1.4']));
    for (const call of calls) {
        assert.equal(call.headers.Authorization, 'Bearer synthetic-token');
        assert.ok(call.url.startsWith(API_URL));
    }
    assert.ok(calls.at(-1).body instanceof FormData);
    assert.equal(calls.at(-1).headers['Content-Type'], undefined);
});

test('login does not forward a stale token; explicit tokens work', async () => {
    await api.login('someone@example.com', 'password');
    assert.equal(calls[0].headers.Authorization, undefined);
    await api.checkAuth('explicit-token');
    assert.equal(calls[1].headers.Authorization, 'Bearer explicit-token');
});

test('query strings preserve user input and filters', async () => {
    await api.searchInventory('a&limit=999#fragment');
    assert.equal(new URL(calls[0].url).searchParams.get('q'), 'a&limit=999#fragment');
    assert.equal(new URL(calls[0].url).searchParams.has('limit'), false);
    await api.getInventory(0, 200, { college_id: 2, department_id: 3 });
    assert.equal(new URL(calls[1].url).searchParams.get('department_id'), '3');
});

test('moderation matches backend paths and PATCH methods', async () => {
    await api.getSuggestions();
    await api.updateSuggestionStatus(1, 'Approved');
    await api.updateReportStatus(2, 'Resolved');
    assert.equal(new URL(calls[0].url).pathname, '/engagement/resources/suggestions');
    assert.equal(new URL(calls[1].url).pathname, '/engagement/resources/suggestions/1/status');
    assert.equal(calls[1].method, 'PATCH');
    assert.equal(calls[2].method, 'PATCH');
});

test('validation details and failed deletes are surfaced', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: [{ msg: 'Invalid value' }] }), { status: 422 });
    await assert.rejects(api.createItem({}), /Invalid value/);
    globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
    await assert.rejects(api.deleteItem(1), /503/);
});

test('syllabus scans propagate cancellation without overriding multipart headers', async () => {
    const controller = new AbortController();
    await api.uploadSyllabus(new Blob(['%PDF-1.4']), { signal: controller.signal });
    assert.equal(calls[0].signal, controller.signal);
    assert.ok(calls[0].body instanceof FormData);
    assert.equal(calls[0].headers['Content-Type'], undefined);
});
