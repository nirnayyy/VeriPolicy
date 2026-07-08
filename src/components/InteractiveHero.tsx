import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import {
  ShieldCheck,
  Globe2,
  FileText,
  Activity,
  Search,
  Sparkles,
  Zap,
  TrendingUp,
  ArrowRight,
  Radar
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

// Helper for live pulse dot inside card overlays
function CardPulseDot({ color = "var(--primary)" }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ background: color }}
      />
    </span>
  );
}

export function InteractiveHero({ onScrollProgress }: { onScrollProgress?: (progress: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const firstFrameRef = useRef<HTMLImageElement>(null);
  const introTitleRef = useRef<HTMLDivElement>(null);

  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Floating card refs for GSAP custom scroll timeline
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const card4Ref = useRef<HTMLDivElement>(null);
  const card5Ref = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // ── MOUSE MOVE PARALLAX EFFECT (Zero Re-renders) ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { width, height, left, top } = container.getBoundingClientRect();
      const x = (clientX - left) / width - 0.5; // -0.5 to 0.5
      const y = (clientY - top) / height - 0.5; // -0.5 to 0.5

      // Set custom CSS variables on the container to drive GPU accelerated transformations
      container.style.setProperty("--mouse-x", x.toString());
      container.style.setProperty("--mouse-y", y.toString());
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);



  // ── LENIS SMOOTH SCROLLING & GSAP SCROLLTRIGGER SCRUBBING ──
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    // 1. Initialize Lenis (marketing landing page only context)
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      infinite: false
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // 2. Setup GSAP ScrollTrigger Scroll-Scrub
    let cardTimeline: gsap.core.Timeline | null = null;

    const setupTimeline = () => {
      if (!video) return;
      const duration = video.duration || 10.0;

      // Single ScrollTrigger to drive both pinning, video scrubbing, and card animations
      cardTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "+=450%", // Total 4.5 screens of scrolling
          pin: true,
          scrub: 0.8, // Smooth video and card scrubbing feel
          onUpdate: (self) => {
            setScrollProgress(self.progress);
            // Scrub video currentTime
            const targetTime = self.progress * duration;
            if (!isNaN(targetTime) && isFinite(targetTime)) {
              video.currentTime = targetTime;
            }
            if (onScrollProgress) {
              onScrollProgress(self.progress);
            }
          }
        }
      });

      // SECTION 1: Geopolitical Analyst (Scroll progress 0% to 30%)
      // Zoom/dolly camera on video background, blur background, sharpen center
      cardTimeline.fromTo(
        video,
        { scale: 1, filter: "blur(0px) brightness(1)" },
        { scale: 1.6, filter: "blur(6px) brightness(0.7)", duration: 0.35, ease: "none" }
      );

      if (firstFrameRef.current) {
        // Keep scale/blur mathematically aligned with the video scaling
        cardTimeline.fromTo(
          firstFrameRef.current,
          { scale: 1, filter: "blur(0px) brightness(1)" },
          { scale: 1.6, filter: "blur(6px) brightness(0.7)", duration: 0.35, ease: "none" },
          0.0
        );
        // Fade out the opacity quickly as the user starts scrolling to reveal the video
        cardTimeline.fromTo(
          firstFrameRef.current,
          { opacity: 1 },
          { opacity: 0, duration: 0.12, ease: "power1.out" },
          0.0
        );
      }

      if (introTitleRef.current) {
        cardTimeline.fromTo(
          introTitleRef.current,
          { opacity: 1, scale: 1, filter: "blur(0px)" },
          { opacity: 0, scale: 1.15, filter: "blur(8px)", duration: 0.22, ease: "power1.inOut" },
          0.0
        );
      }

      // SECTION 2: Blend into scene & Masking zoom (Scroll progress 35% to 50%)
      cardTimeline.to(
        video,
        { scale: 2.2, filter: "blur(0px) brightness(0.55)", duration: 0.15, ease: "none" }
      );

      // SECTION 3 & 4: Reveal digital network & fly cards beside camera (Scroll progress 40% to 85%)
      // Animate floating panels. Translate Z + Y, Scale, and Fade
      
      // Card 1: Geopolitical Risk card (left top)
      cardTimeline.fromTo(
        card1Ref.current,
        { opacity: 0, scale: 0.6, y: 150, z: -200, filter: "blur(8px)" },
        { opacity: 1, scale: 1.05, y: -40, z: 0, filter: "blur(0px)", duration: 0.15, ease: "power1.out" },
        0.35
      ).to(
        card1Ref.current,
        { opacity: 0, scale: 1.35, y: -200, z: 200, filter: "blur(6px)", duration: 0.12, ease: "power1.in" },
        0.52
      );

      // Card 2: Climate Decarbonization (right middle)
      cardTimeline.fromTo(
        card2Ref.current,
        { opacity: 0, scale: 0.65, y: 180, z: -250, filter: "blur(8px)" },
        { opacity: 1, scale: 1, y: 10, z: 0, filter: "blur(0px)", duration: 0.15, ease: "power1.out" },
        0.45
      ).to(
        card2Ref.current,
        { opacity: 0, scale: 1.3, y: -150, z: 150, filter: "blur(8px)", duration: 0.12, ease: "power1.in" },
        0.62
      );

      // Card 3: Defense Budget Indicator chart (left bottom)
      cardTimeline.fromTo(
        card3Ref.current,
        { opacity: 0, scale: 0.55, y: 220, z: -200, filter: "blur(10px)" },
        { opacity: 1, scale: 1, y: 30, z: 0, filter: "blur(0px)", duration: 0.15, ease: "power1.out" },
        0.55
      ).to(
        card3Ref.current,
        { opacity: 0, scale: 1.45, y: -180, z: 180, filter: "blur(8px)", duration: 0.12, ease: "power1.in" },
        0.72
      );

      // Card 4: Search bar interface (center bottom)
      cardTimeline.fromTo(
        card4Ref.current,
        { opacity: 0, scale: 0.7, y: 120, filter: "blur(5px)" },
        { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 0.14, ease: "power1.out" },
        0.65
      ).to(
        card4Ref.current,
        { opacity: 0, scale: 1.25, y: -80, filter: "blur(8px)", duration: 0.1, ease: "power1.in" },
        0.80
      );

      // Card 5: AI dossier brief (right bottom)
      cardTimeline.fromTo(
        card5Ref.current,
        { opacity: 0, scale: 0.5, y: 250, z: -300, filter: "blur(10px)" },
        { opacity: 1, scale: 1, y: 50, z: 0, filter: "blur(0px)", duration: 0.15, ease: "power1.out" },
        0.60
      ).to(
        card5Ref.current,
        { opacity: 0, scale: 1.4, y: -120, z: 160, filter: "blur(8px)", duration: 0.12, ease: "power1.in" },
        0.78
      );

      // SECTION 5: Logo assembly and CTA (Scroll progress 85% to 100%)
      // Fade in CTA panel
      cardTimeline.fromTo(
        ctaRef.current,
        { opacity: 0, y: 40, filter: "blur(8px)", scale: 0.95 },
        { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 0.15, ease: "power2.out" },
        0.85
      );


      // Force ScrollTrigger to recalculate page metrics
      ScrollTrigger.refresh();
    };

    // Initialize if video is already ready, or wait for loadedmetadata
    let onMetadata: (() => void) | null = null;
    if (video.readyState >= 1) {
      setIsVideoLoaded(true);
      setupTimeline();
    } else {
      onMetadata = () => {
        setIsVideoLoaded(true);
        setupTimeline();
      };
      video.addEventListener("loadedmetadata", onMetadata);
    }

    return () => {
      if (onMetadata) {
        video.removeEventListener("loadedmetadata", onMetadata);
      }
      lenis.destroy();
      gsap.ticker.remove((time) => {
        lenis.raf(time * 1000);
      });
      if (cardTimeline) {
        cardTimeline.kill();
        cardTimeline.revert();
      }
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-[#0d0806]"
      style={{ perspective: "1200px" }}
    >
      {/* ── CINEMATIC VIDEO BACKGROUND (Scroll-scrubbed) ── */}
      <video
        ref={videoRef}
        src="/scroll_animation.mp4"
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 transform origin-center select-none"
      />

      {/* ── HIGH-RES FALLBACK & STUNNING AESTHETIC FIRST FRAME IMAGE OVERLAY ── */}
      <img
        ref={firstFrameRef}
        src="/images/hero_first_frame.png"
        alt="Geopolitical Analyst Workspace"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-[5] transform origin-center select-none"
      />
      {/* ── CENTRAL BRAND LOGO INTRO OVERLAY (Fades on Scroll) ── */}
      <div
        ref={introTitleRef}
        className="absolute inset-0 flex flex-col items-center justify-center z-15 pointer-events-none select-none text-center px-6"
      >
        <h1 className="font-display text-5xl md:text-9xl font-semibold tracking-[0.32em] text-white uppercase leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)] translate-x-[0.16em]">
          VeriPolicy
        </h1>
        <p className="font-mono text-[8px] md:text-[11px] uppercase tracking-[0.42em] text-[#e58e8a] mt-4 md:mt-6 opacity-90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] translate-x-[0.21em]">
          Office of Policy Intelligence
        </p>
      </div>

      {/* ── GRADIENT OVERLAYS ── */}
      {/* Volcanic ambient lighting overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-t from-[#0d0806] via-[#0d0806]/10 to-[#0d0806]/40" />

      {/* ── SECTION 3 & 4: FLOATING DIGITAL NETWORK OVERLAYS (3D Parallax Tilt) ── */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        {/* Parallax wrapper reading CSS custom variables updated in mousemove */}
        <div
          className="relative w-full h-full max-w-7xl mx-auto px-6"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(calc(var(--mouse-x, 0) * 8deg)) rotateX(calc(var(--mouse-y, 0) * -8deg))`
          }}
        >
          {/* Card 1: Geopolitical Analyst Policy Card (Top Left) */}
          <div
            ref={card1Ref}
            className="absolute top-[12%] md:top-[15%] left-1/2 md:left-[10%] -translate-x-1/2 md:translate-x-0 w-[92%] md:w-[320px] pointer-events-auto backdrop-blur-md bg-black/45 border border-white/10 rounded-xl p-4 md:p-5 shadow-2xl transition-shadow duration-300 hover:shadow-[var(--shadow-elegant)] hover:border-[#e58e8a]/40"
            style={{
              transform: "translate3d(0, 0, 80px)",
              transformStyle: "preserve-3d"
            }}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#e58e8a]" />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">
                  VP.INTEL // DIRECTIVE
                </span>
              </div>
              <CardPulseDot color="#e58e8a" />
            </div>
            <h3 className="font-display text-lg font-semibold text-white tracking-tight">
              SIPRI Armament Reallocation
            </h3>
            <p className="mt-2 text-xs text-white/70 leading-relaxed">
              Scrubbing historical data parameters for defense procurement and Indo-Pacific naval trade route escalation.
            </p>
            <div className="mt-3.5 flex items-center justify-between font-mono text-[9px] text-[#e58e8a] uppercase tracking-wider">
              <span>Confidence: 0.88</span>
              <span>Ref: VP-2026-IND</span>
            </div>
          </div>

          {/* Card 2: Climate/Energy Policy Analysis (Right Upper-Mid) */}
          <div
            ref={card2Ref}
            className="absolute top-[23%] md:top-[28%] left-1/2 md:left-auto md:right-[10%] -translate-x-1/2 md:translate-x-0 w-[92%] md:w-[300px] pointer-events-auto backdrop-blur-md bg-black/40 border border-white/10 rounded-xl p-4 md:p-5 shadow-2xl transition-shadow duration-300 hover:shadow-[var(--shadow-elegant)] hover:border-[#5fa6a0]/40"
            style={{
              transform: "translate3d(0, 0, 120px)",
              transformStyle: "preserve-3d"
            }}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3.5">
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-[#5fa6a0]" />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">
                  CLIMATE // FORESIGHT
                </span>
              </div>
              <CardPulseDot color="#5fa6a0" />
            </div>
            <h3 className="font-display text-lg font-semibold text-white tracking-tight">
              Decarbonization Trajectory
            </h3>
            <p className="mt-2 text-xs text-white/70 leading-relaxed">
              Evaluating EU carbon border adjust-taxation mandates and impact forecasts on secondary trade corridors.
            </p>
            <div className="mt-3.5 flex items-center justify-between font-mono text-[9px] text-[#5fa6a0] uppercase tracking-wider">
              <span>Horizon: 12-24 Mo</span>
              <span>Impact: Critical</span>
            </div>
          </div>

          {/* Card 3: Economic/Defense Spending Chart (Left Lower-Mid) */}
          <div
            ref={card3Ref}
            className="absolute top-[45%] md:top-auto md:bottom-[20%] left-1/2 md:left-[12%] -translate-x-1/2 md:translate-x-0 w-[92%] md:w-[280px] pointer-events-auto backdrop-blur-md bg-black/45 border border-white/10 rounded-xl p-4 md:p-5 shadow-2xl transition-shadow duration-300 hover:shadow-[var(--shadow-elegant)] hover:border-[#e58e8a]/40"
            style={{
              transform: "translate3d(0, 0, 60px)",
              transformStyle: "preserve-3d"
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-[#e58e8a]" />
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/50">
                DEFENSE SPENDING % GDP
              </span>
            </div>
            <div className="relative h-20 mt-4 overflow-visible">
              <svg viewBox="0 0 240 80" className="w-full h-full text-[#e58e8a] overflow-visible">
                <defs>
                  <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e58e8a" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#e58e8a" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 65 Q 40 45 80 55 T 160 25 T 240 15 L 240 80 L 0 80 Z"
                  fill="url(#chart-glow)"
                />
                <path
                  d="M 0 65 Q 40 45 80 55 T 160 25 T 240 15"
                  fill="none"
                  stroke="#e58e8a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="160" cy="25" r="3" fill="#e58e8a" className="animate-pulse" />
                <circle cx="240" cy="15" r="4.5" fill="#e58e8a" />
                <line x1="0" y1="45" x2="240" y2="45" stroke="white" strokeOpacity="0.05" strokeDasharray="3 3" />
                <line x1="0" y1="25" x2="240" y2="25" stroke="white" strokeOpacity="0.05" strokeDasharray="3 3" />
              </svg>
              <div className="flex justify-between font-mono text-[7px] text-white/40 mt-1.5">
                <span>Q1 2026 // BASE</span>
                <span>SIPRI PROJECTION TRAJECTORY</span>
                <span>Q4 2027 // FORECAST</span>
              </div>
            </div>
          </div>

          {/* Card 4: Search Interface Overlay (Center Bottom) */}
          <div
            ref={card4Ref}
            className="absolute bottom-[6%] md:bottom-[10%] left-1/2 -translate-x-1/2 w-[92%] md:w-[90%] max-w-[340px] md:max-w-[500px] pointer-events-auto backdrop-blur-md bg-black/50 border border-white/10 rounded-full py-2.5 px-4 md:py-3 md:px-5 shadow-2xl transition-shadow duration-300 hover:shadow-[var(--shadow-elegant)] hover:border-white/20"
            style={{
              transform: "translate3d(0, 0, 100px)",
              transformStyle: "preserve-3d"
            }}
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-[#5fa6a0] animate-pulse flex-shrink-0" />
              <Search className="h-4 w-4 text-white/40 flex-shrink-0" />
              <div className="flex-1 font-mono text-[10px] md:text-[11px] text-white/70 select-none overflow-hidden text-ellipsis whitespace-nowrap">
                Querying 2.1M records for <span className="text-[#e58e8a]">semiconductor...</span>
                <span className="inline-block h-3.5 w-1 bg-[#e58e8a] ml-1 animate-pulse" />
              </div>
              <span className="font-mono text-[8px] border border-white/20 bg-white/5 text-white/50 px-1.5 py-0.5 rounded flex-shrink-0">
                ⌘K
              </span>
            </div>
          </div>

          {/* Card 5: AI Foresight dossier Summary (Right Bottom) */}
          <div
            ref={card5Ref}
            className="absolute top-[34%] md:top-auto md:bottom-[22%] left-1/2 md:left-auto md:right-[15%] -translate-x-1/2 md:translate-x-0 w-[92%] md:w-[310px] pointer-events-auto backdrop-blur-md bg-black/45 border border-white/10 rounded-xl p-4 md:p-5 shadow-2xl transition-shadow duration-300 hover:shadow-[var(--shadow-elegant)] hover:border-[#5fa6a0]/40"
            style={{
              transform: "translate3d(0, 0, 75px)",
              transformStyle: "preserve-3d"
            }}
          >
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-white/5">
              <Sparkles className="h-4 w-4 text-[#5fa6a0]" />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">
                AI CORE // SYNTHESIS
              </span>
            </div>
            <h4 className="font-display text-sm font-semibold text-white">
              Semiconductor Self-Reliance Protocol
            </h4>
            <p className="mt-2 text-[11px] text-white/70 leading-relaxed">
              Synthesized response indicates 82% confidence in secondary-market sourcing corridors under simulated sanctions environments.
            </p>
            <div className="mt-3.5 flex items-center justify-between font-mono text-[8px] text-white/40">
              <span className="flex items-center gap-1">
                <Radar className="h-3 w-3 text-[#5fa6a0]" /> Llama 3.3 Active
              </span>
              <span>1.4 SEC COMPILATION</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 5: FINAL CTA OVERLAY (Smooth Assembly) ── */}
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
        <div
          ref={ctaRef}
          className="w-full max-w-3xl mx-auto px-6 text-center pointer-events-auto select-none"
        >
          {/* Decorative Spark */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#e58e8a]/20 bg-[#e58e8a]/5 text-[#e58e8a] font-mono text-[10px] uppercase tracking-[0.25em] mb-7 backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5 fill-[#e58e8a]/20" />
            Intelligence Desk v2.0
          </div>

          {/* Large Headline */}
          <h2 className="font-display text-4xl sm:text-6xl font-medium tracking-tight text-white leading-[1.08]">
            Navigate Global Policy
            <br />
            <span className="font-serif-italic text-[#e58e8a]">Before It Happens</span>.
          </h2>

          {/* Subheading */}
          <p className="mt-6 max-w-xl mx-auto text-base text-white/70 leading-relaxed">
            AI-powered geopolitical intelligence, policy simulation, and foresight.
            Grounded in historical record across 47 jurisdictions.
          </p>

          {/* Interactive CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/signup">
              <button className="h-12 px-7 rounded-md bg-[#e58e8a] hover:bg-[#efa3a0] text-black font-mono text-[11px] uppercase tracking-[0.2em] font-semibold transition-all duration-300 shadow-[0_4px_20px_rgba(229,142,138,0.25)] flex items-center gap-2 group cursor-pointer">
                Explore Platform
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
            <Link to="/tracker">
              <button className="h-12 px-7 rounded-md border border-white/20 hover:border-white/50 hover:bg-white/5 text-white font-mono text-[11px] uppercase tracking-[0.2em] transition-all duration-300 backdrop-blur-sm cursor-pointer">
                View Live Policy Tracker
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── DETAILED SCROLL PROGRESS INDICATOR (Side Bar) ── */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3">
        <span className="font-mono text-[8px] text-white/30 uppercase tracking-[0.3em] rotate-90 translate-y-3">
          SYS STATUS
        </span>
        <div className="h-28 w-0.5 bg-white/10 rounded-full relative">
          <div
            className="w-full bg-[#e58e8a] rounded-full transition-all duration-100 absolute top-0"
            style={{ height: `${scrollProgress * 100}%` }}
          />
        </div>
        <span className="font-mono text-[9px] text-[#e58e8a] tabular-nums font-bold">
          {Math.round(scrollProgress * 100).toString().padStart(3, "0")}%
        </span>
      </div>
    </div>
  );
}
