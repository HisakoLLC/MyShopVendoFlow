// Temporarily disable middleware to troubleshoot login issues
export const config = {
  matcher: [], // Empty matcher means middleware won't run on any routes
}

export function middleware() {
  // No-op middleware
}
