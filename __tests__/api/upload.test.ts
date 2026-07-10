// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('fs/promises', () => ({ writeFile: vi.fn(), mkdir: vi.fn() }));
vi.mock('@vercel/blob', () => ({ put: vi.fn() }));

import { POST } from '@/app/api/upload/route';
import { getServerSession } from 'next-auth/next';
import { writeFile } from 'fs/promises';
import { put } from '@vercel/blob';

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
  const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  afterEach(() => {
    if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
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

  it.each([
    ['student', 'stu1'],
    ['employer', 'emp1'],
    ['school', 'sch1'],
  ])('accepts a PNG avatar upload from a %s', async (role, id) => {
    (getServerSession as any).mockResolvedValue({ user: { id, role } });
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('fake png data')]);
    const form = new FormData();
    form.set('file', pdfFile(png, 'me.png', 'image/png'));
    form.set('type', 'avatar');

    const res = await POST(makeRequest(form));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.url).toMatch(/^\/uploads\/avatar-\d+-\d+\.png$/);
  });

  it('accepts a JPEG avatar and forces a .jpg server-side name', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from('fake jpeg data')]);
    const form = new FormData();
    form.set('file', pdfFile(jpeg, 'photo.jpeg', 'image/jpeg'));
    form.set('type', 'avatar');

    const res = await POST(makeRequest(form));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.url).toMatch(/^\/uploads\/avatar-\d+-\d+\.jpg$/);
  });

  it('rejects an avatar whose content is not actually an image (spoofed extension)', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const form = new FormData();
    form.set('file', pdfFile(NOT_PDF_BYTES, 'sneaky.png', 'image/png'));
    form.set('type', 'avatar');

    const res = await POST(makeRequest(form));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/png or jpeg/i);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('rejects a PDF sent as an avatar', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const form = new FormData();
    form.set('file', pdfFile(PDF_BYTES, 'resume.pdf', 'application/pdf'));
    form.set('type', 'avatar');

    const res = await POST(makeRequest(form));
    expect(res.status).toBe(400);
    expect(writeFile).not.toHaveBeenCalled();
  });

  describe('when a Vercel Blob store is connected (BLOB_READ_WRITE_TOKEN set)', () => {
    beforeEach(() => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token';
    });

    it('uploads to Blob storage instead of local disk and returns its public URL', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
      (put as any).mockResolvedValue({ url: 'https://example.public.blob.vercel-storage.com/resume-123-456.pdf' });

      const form = new FormData();
      form.set('file', pdfFile());
      form.set('type', 'resume');

      const res = await POST(makeRequest(form));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.url).toBe('https://example.public.blob.vercel-storage.com/resume-123-456.pdf');
      expect(put).toHaveBeenCalledTimes(1);
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('still validates the file before ever calling Blob storage', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
      const form = new FormData();
      form.set('file', pdfFile(NOT_PDF_BYTES, 'resume.pdf', 'application/pdf'));
      form.set('type', 'resume');

      const res = await POST(makeRequest(form));
      expect(res.status).toBe(400);
      expect(put).not.toHaveBeenCalled();
    });
  });
});
