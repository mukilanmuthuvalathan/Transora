import { z } from "zod";
import { setAuthCookie, signUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, routeGuard } from "@/lib/responses";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  return routeGuard(async () => {
    const body = schema.safeParse(await request.json());
    if (!body.success) return fail("Please enter your email and password.");
    const user = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (!user || !(await verifyPassword(body.data.password, user.passwordHash))) return fail("Invalid email or password.", 401);
    const safeUser = { id: user.id, name: user.name, email: user.email };
    await setAuthCookie(signUser(safeUser));
    return ok({ user: safeUser });
  });
}
