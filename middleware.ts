// middleware.ts
import { clerkMiddleware, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const pathname = req.nextUrl.pathname;

  // No logueado → a sign-in
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Obtener usuario desde Clerk
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);

  const mutualId = user.publicMetadata?.mutualId as number | undefined;

  // Si NO tiene mutual → onboarding
  if (!mutualId && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Si tiene mutual → bloquear acceso a sign-in, sign-up y onboarding
  if (
    mutualId &&
    (pathname === "/" ||
      pathname.startsWith("/sign-in") ||
      pathname.startsWith("/sign-up") ||
      pathname.startsWith("/onboarding"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*|sign-in|sign-up|unauthorized).*)", "/"],
};
