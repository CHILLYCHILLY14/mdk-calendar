// Stand-in for Wix's wix-http-functions module (local dev server only)
export function response(o) { return { status: o.status || 200, headers: o.headers || {}, body: o.body }; }
