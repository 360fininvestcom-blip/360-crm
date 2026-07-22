import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");
    const isAuthRoute =
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/signup");
    const isRootRoute = request.nextUrl.pathname === "/";

    // Call the Better Auth session endpoint
    const response = await fetch(new URL("/api/auth/get-session", request.url).toString(), {
        headers: {
            cookie: request.headers.get("cookie") || "",
        }
    });
    const session = response.ok ? await response.json() : null;

    if (isDashboardRoute && !session) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    if ((isAuthRoute || isRootRoute) && session) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
