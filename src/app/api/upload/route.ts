import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// fs access requires the Node.js runtime (not Edge).
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const PDF_MAGIC = Buffer.from('%PDF-');

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

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
    // renamed/spoofed HTML/SVG/script file cannot be stored as a "resume".
    if (buffer.length < PDF_MAGIC.length || !buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
      return NextResponse.json({ error: 'File content is not a valid PDF' }, { status: 400 });
    }

    // Never trust the client's filename/extension (path traversal, stored XSS).
    // Generate a safe, server-controlled name with a forced .pdf extension.
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `resume-${uniqueSuffix}.pdf`;

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
