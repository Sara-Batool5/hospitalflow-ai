import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  verifyPassword,
} from "../../../../lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body?.email ?? ""));
    const password = String(body?.password ?? "");

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 6 || password.length > 100) {
      return NextResponse.json(
        { ok: false, message: "Password must be 6 to 100 characters." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: user, error } = await supabase
      .from("app_users")
      .select("email, password_hash")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Sign-in lookup failed:", error.message);
      return NextResponse.json(
        {
          ok: false,
          message:
            "Sign-in is not set up yet. Run the SQL setup in Supabase first.",
        },
        { status: 500 }
      );
    }

    let isNew = false;

    if (!user) {
      // First sign-in with this email creates a private demo workspace.
      const { error: insertError } = await supabase
        .from("app_users")
        .insert({ email, password_hash: hashPassword(password) });

      if (insertError) {
        console.error("Account creation failed:", insertError.message);
        return NextResponse.json(
          { ok: false, message: "Could not create your workspace." },
          { status: 500 }
        );
      }
      isNew = true;
    } else if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { ok: false, message: "Incorrect password for this email." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true, isNew, email });
    response.cookies.set(SESSION_COOKIE, createSessionToken(email), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error("Sign-in failed:", error);
    return NextResponse.json(
      { ok: false, message: "Sign-in is temporarily unavailable." },
      { status: 500 }
    );
  }
}
