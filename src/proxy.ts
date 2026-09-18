import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const adminRealm = "Metals Calendar Admin";

function unauthorizedResponse() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${adminRealm}", charset="UTF-8"`,
      "Cache-Control": "no-store",
    },
  });
}

function getBasicAuthCredentials(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decodedValue = atob(authorizationHeader.slice("Basic ".length));
    const separatorIndex = decodedValue.indexOf(":");

    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decodedValue.slice(0, separatorIndex),
      password: decodedValue.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }

    return unauthorizedResponse();
  }

  const credentials = getBasicAuthCredentials(
    request.headers.get("authorization"),
  );

  if (
    credentials?.username !== adminUsername ||
    credentials.password !== adminPassword
  ) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
