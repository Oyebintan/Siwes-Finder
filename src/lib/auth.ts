import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

// Fail fast: never fall back to a hardcoded signing secret. A missing secret
// means anyone could forge session tokens, so refuse to start without one.
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
if (!NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to your environment before starting the app."
  );
}

// Admins are provisioned by email allowlist (there is no public admin signup).
// Set ADMIN_EMAILS="a@x.com,b@y.com" in the environment. Matching users are
// promoted to the 'admin' role the next time they sign in. SUPER_ADMIN_EMAILS
// works the same way but promotes to 'super_admin', which outranks 'admin'
// (e.g. a plain admin can't delete a super_admin's account).
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

function isSuperAdminEmail(email?: string | null): boolean {
  return !!email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

// Resolves the allowlist-driven role for an email, or null if it isn't on
// either list. Super admin takes priority over plain admin.
function resolvePrivilegedRole(email?: string | null): "super_admin" | "admin" | null {
  if (isSuperAdminEmail(email)) return "super_admin";
  if (isAdminEmail(email)) return "admin";
  return null;
}

export const authOptions: AuthOptions = {
  providers: [
    // Only register Google sign-in when real credentials are configured.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await connectToDatabase();

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const user = await User.findOne({ email: credentials.email });
        if (!user || !user.password) {
          throw new Error("No account found with this email");
        }

        const isPasswordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordMatch) {
          throw new Error("Incorrect password");
        }

        // Promote allowlisted emails to admin/super_admin on sign-in.
        const privilegedRole = resolvePrivilegedRole(user.email);
        if (privilegedRole && user.role !== privilegedRole) {
          user.role = privilegedRole;
          await user.save();
        }

        return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectToDatabase();
        const existingUser = await User.findOne({ email: user.email });
        if (!existingUser) {
          const newUser = await User.create({
            name: user.name,
            email: user.email,
            role: resolvePrivilegedRole(user.email) ?? "unassigned",
          });
          user.id = newUser._id.toString();
          user.role = newUser.role;
        } else {
          // Promote allowlisted emails to admin/super_admin on sign-in.
          const privilegedRole = resolvePrivilegedRole(existingUser.email);
          if (privilegedRole && existingUser.role !== privilegedRole) {
            existingUser.role = privilegedRole;
            await existingUser.save();
          }
          user.id = existingUser._id.toString();
          user.role = existingUser.role;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
  },
  secret: NEXTAUTH_SECRET,
};
