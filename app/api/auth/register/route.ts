import { z } from "zod";
import { hashPassword, setAuthCookie, signUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, routeGuard } from "@/lib/responses";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  return routeGuard(async () => {
    const body = schema.safeParse(await request.json());
    if (!body.success) return fail("Please provide a name, valid email, and password with at least 8 characters.");
    const exists = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (exists) return fail("An account with this email already exists.", 409);
    const user = await prisma.user.create({
      data: {
        name: body.data.name,
        email: body.data.email,
        passwordHash: await hashPassword(body.data.password),
        settings: { create: {} }
      },
      select: { id: true, name: true, email: true }
    });
    await setAuthCookie(signUser(user));
    return ok({ user });
  });
}
