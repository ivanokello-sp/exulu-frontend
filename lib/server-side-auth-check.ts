import { getServerSession } from "next-auth";
import { getAuthOptions, pool } from "@/app/api/auth/[...nextauth]/options";
import { UserWithRole } from "@/types/models/user";

let cachedUser: Record<string, {
  user: UserWithRole;
  timestamp: number;
}> = {};

// 5 minutes
const ttl = 1000 * 60 * 5;

export const serverSideAuthCheck = async (): Promise<UserWithRole | false> => {
  const authOptions = await getAuthOptions()
  const session: any = await getServerSession(authOptions);
  if (!session?.user) return false;
  console.log("[EXULU] serverSideAuthCheck session:", session)

  const cacheKey = session.user.id + session.user.email + session.user.name;

  if (
    cachedUser &&
    cachedUser[cacheKey] &&
    cachedUser[cacheKey].timestamp > Date.now() - ttl
  ) { return cachedUser[cacheKey].user; }

  const client = await pool.connect();
  try {
    const res = await client.query(`
          SELECT
            users.*,
            json_build_object(
              'id', roles.id,
              'name', roles.name,
              'agents', roles.agents,
              'workflows', roles.workflows,
              'variables', roles.variables,
              'users', roles.users
            ) as role
          FROM users
          LEFT JOIN roles ON users.role = roles.id
          WHERE users.email = $1
        `, [session.user.email])
    console.log("[EXULU] serverSideAuthCheck res:", res)
    const user: any = res.rows[0];
    if (!user) {
      return false;
    }
    console.log("[EXULU] Server side auth check", res.rows)
    console.log("session.user.email", session.user.email)
    cachedUser[cacheKey] = {
      user: user,
      timestamp: Date.now()
    };
    return cachedUser[cacheKey].user;
  } finally {
    client.release();
  }
}