
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage(
      "Demo sign-in is not connected to real authentication yet. Use Continue as Demo to explore HospitalFlow AI."
    );
  }

  return (
    <main className="signin-page">
      <div className="signin-glow signin-glow-one" />
      <div className="signin-glow signin-glow-two" />

      <Link href="/" className="signin-back">
        <ArrowLeft size={17} />
        Back to home
      </Link>

      <section className="signin-layout">
        <div className="signin-intro">
          <Link href="/" className="signin-brand">
            <span className="signin-brand-icon">
              <HeartPulse size={27} />
            </span>
            <span>
              <strong>HospitalFlow AI</strong>
              <small>Autonomous Operations Coordinator</small>
            </span>
          </Link>

          <div className="signin-intro-content">
            <span className="signin-eyebrow">
              YOUR OPERATIONS WORKSPACE
            </span>

            <h1>
              Every workflow.
              <br />
              <span>Moving forward.</span>
            </h1>

            <p>
              Explore how intelligent agents help hospital teams
              identify operational bottlenecks, coordinate next
              steps, and keep decisions accountable.
            </p>

            <div className="signin-benefit">
              <span><ShieldCheck size={19} /></span>
              <div>
                <strong>Human oversight built in</strong>
                <p>Recommendations remain reviewable by people.</p>
              </div>
            </div>

            <div className="signin-benefit">
              <span><LockKeyhole size={19} /></span>
              <div>
                <strong>Safe portfolio demonstration</strong>
                <p>Explore using synthetic operational records.</p>
              </div>
            </div>
          </div>

          <div className="signin-side-footer">
            HospitalFlow AI · Portfolio demonstration
          </div>
        </div>

        <div className="signin-form-side">
          <div className="signin-card">
            <div className="signin-card-logo">
              <HeartPulse size={25} />
            </div>

            <div className="signin-heading">
              <h2>Welcome Back!</h2>
              <p>Sign in to explore your operations workspace.</p>
            </div>

            <form onSubmit={handleSignIn} className="signin-form">
              <label htmlFor="signin-email">Email address</label>

              <div className="signin-input-wrap">
                <Mail size={18} />
                <input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="signin-password-label">
                <label htmlFor="signin-password">Password</label>
                <button
                  type="button"
                  className="signin-forgot"
                  onClick={() =>
                    setMessage(
                      "Password recovery is unavailable because real authentication has not been enabled for this demo."
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>

              <div className="signin-input-wrap">
                <LockKeyhole size={18} />
                <input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="signin-eye"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {message && (
                <div className="signin-message" role="status">
                  {message}
                </div>
              )}

              <button type="submit" className="signin-submit">
                Sign In <ArrowRight size={18} />
              </button>
            </form>

            <div className="signin-divider">
              <span>OR</span>
            </div>

            <Link href="/dashboard" className="signin-demo-button">
              Continue as Demo
              <ArrowRight size={17} />
            </Link>

            <p className="signin-demo-note">
              No account needed. Explore with synthetic demo data.
            </p>

            <div className="signin-card-footer">
              <ShieldCheck size={15} />
              Demo mode · No real authentication
            </div>
          </div>

          <p className="signin-bottom-note">
            New to HospitalFlow AI?{" "}
            <Link href="/">Explore the platform</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
