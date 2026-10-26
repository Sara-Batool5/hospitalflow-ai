
"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  GitBranch,
  HeartPulse,
  ShieldCheck,
  Workflow,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="welcome-page">
      <div className="welcome-glow welcome-glow-one" />
      <div className="welcome-glow welcome-glow-two" />

      <header className="welcome-header">
        <Link href="/" className="welcome-brand">
          <span className="welcome-brand-icon">
            <HeartPulse size={25} />
          </span>
          <span>
            <strong>HospitalFlow AI</strong>
            <small>Autonomous Operations Coordinator</small>
          </span>
        </Link>

        <nav className="welcome-nav">
          <a href="#how-it-works">How it works</a>
          <Link href="/signin" className="welcome-signin">
            Sign in <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>

      <section className="welcome-hero">
        <div className="welcome-copy">
          <div className="welcome-eyebrow">
            <span className="welcome-pulse" />
            INTELLIGENT HOSPITAL OPERATIONS
          </div>

          <h1>
            Better coordination.
            <br />
            <span>Smarter hospital</span>
            <br />
            operations.
          </h1>

          <p className="welcome-description">
            Bring operational issues, department coordination, and
            approval workflows into one intelligent workspace.
            Identify bottlenecks and keep teams moving forward.
          </p>

          <div className="welcome-actions">
            <Link href="/dashboard" className="welcome-primary">
              Explore Demo Dashboard
              <ArrowRight size={18} />
            </Link>

            <Link href="/signin" className="welcome-secondary">
              Sign in to explore
            </Link>
          </div>

          <div className="welcome-trust">
            <span><CheckCircle2 size={16} /> Synthetic demo data</span>
            <span><ShieldCheck size={16} /> Human-reviewed actions</span>
          </div>
        </div>

        <div className="welcome-visual">
          <div className="visual-orbit visual-orbit-outer" />
          <div className="visual-orbit visual-orbit-inner" />

          <div className="visual-center">
            <HeartPulse size={48} strokeWidth={1.5} />
            <strong>HospitalFlow</strong>
            <span>Operations intelligence</span>
          </div>

          <div className="visual-node visual-node-top">
            <Activity size={19} />
            <span><strong>Monitor</strong><small>Detect bottlenecks</small></span>
          </div>

          <div className="visual-node visual-node-right">
            <GitBranch size={19} />
            <span><strong>Coordinate</strong><small>Route next steps</small></span>
          </div>

          <div className="visual-node visual-node-bottom">
            <ShieldCheck size={19} />
            <span><strong>Review</strong><small>Human approval</small></span>
          </div>

          <div className="visual-node visual-node-left">
            <Workflow size={19} />
            <span><strong>Resolve</strong><small>Track progress</small></span>
          </div>

          <svg className="visual-connections" viewBox="0 0 500 500" aria-hidden="true">
            <path d="M250 85 L250 175" />
            <path d="M415 250 L325 250" />
            <path d="M250 415 L250 325" />
            <path d="M85 250 L175 250" />
          </svg>
        </div>
      </section>

      <section id="how-it-works" className="welcome-features">
        <div className="welcome-feature">
          <span className="feature-number">01</span>
          <h3>Detect bottlenecks</h3>
          <p>Identify missing information, delays, and operational issues.</p>
        </div>

        <div className="welcome-feature">
          <span className="feature-number">02</span>
          <h3>Coordinate workflows</h3>
          <p>Organize recommended next steps across hospital departments.</p>
        </div>

        <div className="welcome-feature">
          <span className="feature-number">03</span>
          <h3>Keep humans in control</h3>
          <p>Review recommendations and track decisions through audit logs.</p>
        </div>
      </section>

      <footer className="welcome-footer">
        <span>HospitalFlow AI © 2026</span>
        <span>Portfolio demonstration · No live hospital systems connected</span>
      </footer>
    </main>
  );
}
