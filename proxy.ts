// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALE_COOKIE = 'NEXT_LOCALE';
const defaultLocale = 'en';
const locales = ['en', 'de'];

export default function proxy(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-next-pathname', encodeURIComponent(request.nextUrl.pathname));

    // Get locale from cookie or use default
    const locale = request.cookies.get(LOCALE_COOKIE)?.value || defaultLocale;

    // Validate locale
    const validLocale = locales.includes(locale) ? locale : defaultLocale;

    // Set locale header for server components
    requestHeaders.set('x-locale', validLocale);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};