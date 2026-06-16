import GoogleProvider from "next-auth/providers/google";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Runs server-side only. Exchanges the verified Google identity for our own
    // backend JWT (or finds out the account is still pending approval).
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        try {
          const response = await fetch(`${API_URL}/auth/google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": process.env.INTERNAL_API_SECRET,
            },
            body: JSON.stringify({ name: profile.name, email: profile.email }),
          });
          const data = await response.json();

          if (response.ok) {
            token.backendToken = data.token;
            token.backendUser = data.user;
            token.pending = false;
          } else {
            token.backendToken = null;
            token.pending = true;
          }
        } catch {
          token.backendToken = null;
          token.pending = true;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.backendToken = token.backendToken || null;
      session.backendUser = token.backendUser || null;
      session.pending = Boolean(token.pending);
      return session;
    },
  },
};
