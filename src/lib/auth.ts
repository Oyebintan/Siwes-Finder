import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/userLookup";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { resolvePrivilegedRole } from "@/lib/adminEmails";
import { findOrCreateGoogleUser } from "@/lib/googleAuth";

// No hardcoded fallback secret — but also no module-scope throw when it's
// missing: `next build` imports every route module while collecting page
// data, so throwing here fails the whole build on machines without the env
// var (e.g. Vercel preview builds). NextAuth itself refuses to serve auth
// requests without a secret in production (NO_SECRET), which preserves the
// "never run with a forgeable session" guarantee at runtime.
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        // NextAuth v4 hands authorize() a plain headers object, not a
        // fetch Request -- pull the first x-forwarded-for hop directly
        // (Vercel sets that header itself; clients can't spoof it there).
        const forwarded = req?.headers?.["x-forwarded-for"];
        const ip =
          (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) || "unknown";
        const limited = await checkRateLimit({ name: "login", key: ip, ...RATE_LIMITS.login });
        if (!limited.ok) {
          throw new Error("Too many attempts. Please wait a few minutes and try again.");
        }

        await connectToDatabase();

        const user = await findUserByEmail(credentials.email);
        // One message for both failures -- distinct "no account" / "wrong
        // password" errors let anyone probe which emails are registered.
        if (!user || !user.password || !(await bcrypt.compare(credentials.password, user.password))) {
          throw new Error("Invalid email or password");
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
        const dbUser = await findOrCreateGoogleUser({ email: user.email!, name: user.name });
        user.id = dbUser._id.toString();
        user.role = dbUser.role;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      // update() is triggered client-side (see /onboarding after the role
      // picker) and its payload is attacker-controlled: any signed-in user
      // can POST arbitrary JSON to the session endpoint. Never copy a role
      // from that payload into the token — re-read it from the database,
      // which only /api/auth/role (student/employer, unassigned-only) and
      // the admin allowlists can change.
      if (trigger === "update" && token.id) {
        await connectToDatabase();
        const dbUser = await User.findById(token.id).select("role");
        if (dbUser) {
          token.role = dbUser.role;
        }
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
  // Sessions expire after 2 hours of inactivity instead of NextAuth's
  // 30-day default. JWT sessions are rolling: the cookie is re-issued on
  // activity, so someone actively using the app stays signed in, while a
  // browser left idle past the window comes back logged out.
  session: { strategy: "jwt", maxAge: 60 * 60 * 2 },
  jwt: { maxAge: 60 * 60 * 2 },
  pages: {
    signIn: '/login',
  },
  secret: NEXTAUTH_SECRET,
};
