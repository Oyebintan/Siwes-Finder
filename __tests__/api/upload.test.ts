// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('fs/promises', () => ({ writeFile: vi.fn(), mkdir: vi.fn() }));

import { POST } from '@/app/api/upload/route';
import { getServerSession } from 'next-auth/next';
import { writeFile } from 'fs/promises';

const PDF_BYTES = Buffer.from('%PDF-1.4 fake pdf content');
const NOT_PDF_BYTES = Buffer.from('<html>not a pdf</html>');

function makeRequest(form: FormData) {
  return new Request('http://localhost/api/upload', { method: 'POST', body: form });
}

function pdfFile(bytes: Buffer = PDF_BYTES, name = 'resume.pdf', type = 'application/pdf') {
  // Buffer's ArrayBufferLike backing type doesn't satisfy DOM's stricter
  // BlobPart<ArrayBuffer> at the type level, though it's fine at runtime.
  return new File([bytes as unknown as BlobPart], name, { type });
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const form = new FormData();
    form.set('file', pdfFile());
    form.set('type', 'resume');

    const res = await POST(makeRequest(form));
    expect(res.status).toBe(401);
  });

  it('rejects an unknown upload type', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const form = new FormData();
    form.set('file', pdfFile());
    form.set('type', 'headshot');

    const res = await POST(makeRequest(form));
    expect(res.status).toBe(400);
  });

  it('rejects a role mismatch (e.g. employer uploading a resume)', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const form = new FormData();
    form.set('file', pdfFile());
    form.set('type', 'resume');

    const res = await POST(makeRequest(form));
    expect(res.status).toBe(403);
  });

  it('rejects a missing file', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const form = new FormData();
    form.set('type', 'resume');

    const res = await POST(makeRequest(form));
    expect(res.status).toBe(400);
  });

  it('rejects an oversized file', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const big = Buffer.alloc(5 * 1024 * 1024 + 1);
    const form = new FormData();
    form.set('file', pdfFile(big));
    form.set('type', 'resume');

    const res = await POST(makeRequest(form));
    expect(res.status).toBe(400);
  });

  it('rejects a non-PDF content-type/extension', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const form = new FormData();
    form.set('file', pdfFile(NOT_PDF_BYTES, 'resume.html', 'text/html'));
    form.set('type', 'resume');

    const res = await POST(makeRequest(form));
    expect(res.status).toBe(400);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('rejects a file with a spoofed .pdf extension whose content is not actually a PDF', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const form = new FormData();
    // Extension and declared MIME type both lie about the content.
    form.set('file', pdfFile(NOT_PDF_BYTES, 'resume.pdf', 'application/pdf'));
    form.set('type', 'resume');

    const res = await POST(makeRequest(form));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/not a valid pdf/i);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('accepts a valid resume upload and returns a server-generated filename', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const form = new FormData();
    form.set('file', pdfFile(PDF_BYTES, '../../etc/passwd.pdf'));
    form.set('type', 'resume');

    const res = await POST(makeRequest(form));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(writeFile).toHaveBeenCalledTimes(1);
    // The client-supplied filename must never reach disk verbatim (path traversal / stored XSS guard).
    expect(data.url).toMatch(/^\/uploads\/resume-\d+-\d+\.pdf$/);
  });

  it('accepts a verification document from an employer', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const form = new FormData();
    form.set('file', pdfFile(PDF_BYTES, 'cac-certificate.pdf'));
    form.set('type', 'verification');

    const res = await POST(makeRequest(form));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.url).toMatch(/^\/uploads\/verification-\d+-\d+\.pdf$/);
  });
});
