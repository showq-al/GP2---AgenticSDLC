import { NextResponse, type NextRequest } from "next/server";

// Temporarily disable auth-based redirects to avoid blocking navigation.
// The client-side Supabase auth still works; this middleware now simply
// lets every request through.
export async function middleware(_request: NextRequest) {
  return NextResponse.next();
}
