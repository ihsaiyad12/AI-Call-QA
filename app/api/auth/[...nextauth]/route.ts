import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing username or password");
        }

        await dbConnect();

        const user = await User.findOne({ username: credentials.username });

        if (!user) {
          throw new Error("Invalid username or password");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid username or password");
        }

        return {
          id: user._id.toString(),
          name: user.username,
          role: user.role || 'analyst',
        };
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.name = token.name;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
