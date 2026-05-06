import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // IP Whitelist Check (Production Only)
    if (process.env.NODE_ENV === 'production') {
      const allowedIpsString = process.env.ALLOWED_IPS;
      if (allowedIpsString) {
        const allowedIps = allowedIpsString.split(',').map(ip => ip.trim());
        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                         req.headers.get('x-real-ip') || 
                         'unknown';

        if (!allowedIps.includes(clientIp)) {
          console.warn(`[Security] Blocked access attempt from unauthorized IP: ${clientIp}`);
          return new NextResponse(
            `<html>
              <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; color: #1e293b; text-align: center; padding: 20px;">
                <h1 style="color: #e11d48;">Access Restricted</h1>
                <p style="max-width: 500px; line-height: 1.6;">Your IP address (<strong>${clientIp}</strong>) is not authorized to access this application.</p>
              </body>
            </html>`,
            { status: 403, headers: { 'Content-Type': 'text/html' } }
          );
        }
      }
    }

    // Role-based route protection
    if (pathname.startsWith('/agent') && token?.role !== 'agent') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    if (pathname === '/' && token?.role === 'agent') {
      return NextResponse.redirect(new URL('/agent', req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|.*\\.(?:png|jpg|jpeg|webp|svg)$).*)",
  ],
};
