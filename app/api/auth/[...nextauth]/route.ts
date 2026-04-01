import NextAuth from "next-auth";
import {getAuthOptions} from "@/app/api/auth/[...nextauth]/options";

export const dynamic = "force-dynamic";

async function handler(req: any, res: any) {
  const authOptions = await getAuthOptions();
  return await NextAuth(req, res, authOptions);
}

export { handler as GET, handler as POST };
