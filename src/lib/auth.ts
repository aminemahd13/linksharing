import { prisma } from "@/lib/prisma";
import { compare } from "bcrypt";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  orgId?: string | null;
};

export const authOptions = {
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        // Emails are unique per org; select the matching admin (default org if unset).
        const admin = await prisma.admin.findFirst({ where: { email } });
        if (!admin?.passwordHash) return null;
        const isValid = await compare(password, admin.passwordHash);
        if (!isValid) return null;
        const user: AuthUser = {
          id: admin.id,
          email: admin.email,
          name: admin.name ?? null,
          role: admin.role,
          orgId: admin.orgId ?? null,
        };
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        const authUser = user as AuthUser;
        token.role = authUser.role;
        token.orgId = authUser.orgId;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token as { role?: string }).role;
        session.user.orgId = (token as { orgId?: string | null }).orgId;
      }
      return session;
    },
  },
};
