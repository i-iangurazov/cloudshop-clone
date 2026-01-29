import { cookies, headers } from "next/headers";
import { getToken } from "next-auth/jwt";

export const getServerAuthToken = async () => {
  const headerStore = headers();
  const cookieStore = cookies();

  return getToken({
    req: { headers: headerStore, cookies: cookieStore } as never,
    secret: process.env.NEXTAUTH_SECRET,
  });
};
