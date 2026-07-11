import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { put } from '@vercel/blob';
import { requireSession } from '@/lib/mobileAuth';

// fs access requires the Node.js runtime (not Edge).
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB — avatars/logos stay small
const PDF_MAGIC = Buffer.from('%PDF-');
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

// Each upload kind is tied to the role(s) allowed to perform it, a filename
// prefix (so a resume and a verification doc never collide) and a content
// format. role: null means any signed-in user (avatars work for students,
// employers and schools alike).
const UPLOAD_KINDS: Record<string, { role: string | null; prefix: string; format: 'pdf' | 'image' }> = {
  resume: { role: 'student', prefix: 'resume', format: 'pdf' },
  verification: { role: 'employer', prefix: 'verification', format: 'pdf' },
  avatar: { role: null, prefix: 'avatar', format: 'image' },
};

export async function POST(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const kind = (formData.get('type') as string) || 'resume';

    const spec = UPLOAD_KINDS[kind];
    if (!spec) {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }
    if (spec.role && session.user.role !== spec.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
    }
    const maxSize = spec.format === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File is too large. Maximum size is ${spec.format === 'image' ? '2' : '5'} MB.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    let extension: string;

    // MIME type and extension are both client-controlled, so they are only a
    // first pass — the real check is the magic-byte verification, so a
    // renamed/spoofed HTML/SVG/script file cannot be stored.
    if (spec.format === 'pdf') {
      if (file.type !== 'application/pdf' || !name.endsWith('.pdf')) {
        return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
      }
      if (buffer.length < PDF_MAGIC.length || !buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
        return NextResponse.json({ error: 'File content is not a valid PDF' }, { status: 400 });
      }
      extension = 'pdf';
    } else {
      const isPng = file.type === 'image/png' && name.endsWith('.png') &&
        buffer.length >= PNG_MAGIC.length && buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC);
      const isJpeg = file.type === 'image/jpeg' && (name.endsWith('.jpg') || name.endsWith('.jpeg')) &&
        buffer.length >= JPEG_MAGIC.length && buffer.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC);
      if (!isPng && !isJpeg) {
        return NextResponse.json({ error: 'Only PNG or JPEG images are allowed' }, { status: 400 });
      }
      extension = isPng ? 'png' : 'jpg';
    }

    // Never trust the client's filename/extension (path traversal, stored XSS).
    // Generate a safe, server-controlled name with a forced extension.
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${spec.prefix}-${uniqueSuffix}.${extension}`;
    const contentType = extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : 'image/jpeg';

    // Vercel's serverless functions have a read-only filesystem outside /tmp,
    // and /tmp itself doesn't persist or get served as a static asset across
    // invocations, so local-disk writes only work in dev. Once the project's
    // Vercel Blob store is connected, BLOB_READ_WRITE_TOKEN is auto-injected
    // and we upload there instead, returning its public URL.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType,
        addRandomSuffix: false,
      });
      return NextResponse.json({ url: blob.url }, { status: 200 });
    }

    const uploadDir = path.join(process.cwd(), 'public/uploads');
    await mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Server error during upload' }, { status: 500 });
  }
}
