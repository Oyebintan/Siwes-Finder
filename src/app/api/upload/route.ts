import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// fs access requires the Node.js runtime (not Edge).
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const PDF_MAGIC = Buffer.from('%PDF-');

// Each upload kind is tied to the role allowed to perform it and a filename
// prefix, so a student resume and a company verification doc never collide.
const UPLOAD_KINDS: Record<string, { role: string; prefix: string }> = {
  resume: { role: 'student', prefix: 'resume' },
  verification: { role: 'employer', prefix: 'verification' },
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
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
    if (session.user.role !== spec.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File is too large. Maximum size is 5 MB.' }, { status: 400 });
    }

    // MIME type and extension are both client-controlled, so they are only a
    // first pass — the real check is the magic-byte verification below.
    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
    if (file.type !== 'application/pdf' || !hasPdfExtension) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Verify the actual file contents start with the PDF signature, so a
    // renamed/spoofed HTML/SVG/script file cannot be stored.
    if (buffer.length < PDF_MAGIC.length || !buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
      return NextResponse.json({ error: 'File content is not a valid PDF' }, { status: 400 });
    }

    // Never trust the client's filename/extension (path traversal, stored XSS).
    // Generate a safe, server-controlled name with a forced .pdf extension.
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${spec.prefix}-${uniqueSuffix}.pdf`;

    // KNOWN PRODUCTION GAP: Vercel's serverless functions have a read-only
    // filesystem outside /tmp, and /tmp itself doesn't persist or get served
    // as a static asset across invocations. Writing to public/uploads works
    // in local dev only — on Vercel this call will throw (or silently write
    // to a file no later request/deploy can see). Before relying on uploads
    // in production, swap this for a persistent object store (e.g. Vercel
    // Blob, S3) and store the returned URL instead of a local path.
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
