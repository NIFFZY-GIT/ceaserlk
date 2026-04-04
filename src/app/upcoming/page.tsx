"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

// --- Types ---
type WaitingListResponse = {
  success: boolean;
  joined?: boolean;
  totalCount: number;
  upcomingEnabled: boolean;
  subtitleText: string;
  tshirtReleaseAt: string;
  movieReleaseAt: string;
  logoImageUrl: string;
  backgroundMode: 'video' | 'slider';
  backgroundVideoUrl: string | null;
  backgroundAudioUrl: string | null;
  backgroundSliderImages: string[];
  message?: string;
  error?: string;
};

type CountryCodeOption = {
  label: string;
  code: string;
};

const COUNTRY_CODES: CountryCodeOption[] = [
  { label: "Sri Lanka", code: "+94" },
  { label: "India", code: "+91" },
  { label: "United Kingdom", code: "+44" },
  { label: "United States", code: "+1" },
  { label: "United Arab Emirates", code: "+971" },
  { label: "Australia", code: "+61" },
  { label: "Canada", code: "+1" },
];

function normalizeCountryCode(input: string): string {
  const digitsOnly = input.replace(/\D/g, "");
  return digitsOnly ? `+${digitsOnly}` : "+";
}

type CountdownParts = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

function getCountdownParts(targetDate: string | null): CountdownParts {
  if (!targetDate) return { days: "00", hours: "00", minutes: "00", seconds: "00" };

  const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function getCountdownRemainingMs(targetDate: string | null): number {
  if (!targetDate) return 0;

  const targetMs = new Date(targetDate).getTime();
  if (Number.isNaN(targetMs)) return 0;

  return Math.max(0, targetMs - Date.now());
}

function CountdownCard({
  title,
  targetDate,
}: {
  title: string;
  targetDate: string | null;
}) {
  const [parts, setParts] = useState<CountdownParts>(() =>
    getCountdownParts(targetDate)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setParts(getCountdownParts(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <section className="rounded-3xl border border-white/15 bg-black/45 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition duration-300 hover:border-white/25 hover:bg-black/55">
      <h3 className="mb-5 text-center text-[10px] uppercase tracking-[0.34em] text-white/70">
        {title}
      </h3>

      <div className="flex items-start justify-center gap-1 sm:gap-2">
        <div className="w-[70px] text-center sm:w-[84px]">
          <p className="animate-[countGlow_1.25s_ease-in-out_infinite] rounded-xl bg-white/[0.04] py-2 text-3xl font-semibold leading-none sm:text-4xl bg-gradient-to-b from-white to-white/55 bg-clip-text text-transparent">
            {parts.days}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/55">Days</p>
        </div>

        <span className="pt-2 text-2xl text-white/55 sm:text-3xl">:</span>

        <div className="w-[70px] text-center sm:w-[84px]">
          <p className="animate-[countGlow_1.25s_ease-in-out_infinite] rounded-xl bg-white/[0.04] py-2 text-3xl font-semibold leading-none sm:text-4xl bg-gradient-to-b from-white to-white/55 bg-clip-text text-transparent">
            {parts.hours}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/55">Hours</p>
        </div>

        <span className="pt-2 text-2xl text-white/55 sm:text-3xl">:</span>

        <div className="w-[70px] text-center sm:w-[84px]">
          <p className="animate-[countGlow_1.25s_ease-in-out_infinite] rounded-xl bg-white/[0.04] py-2 text-3xl font-semibold leading-none sm:text-4xl bg-gradient-to-b from-white to-white/55 bg-clip-text text-transparent">
            {parts.minutes}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/55">Mins</p>
        </div>

        <span className="pt-2 text-2xl text-white/55 sm:text-3xl">:</span>

        <div className="w-[70px] text-center sm:w-[84px]">
          <p className="animate-[countGlow_1.25s_ease-in-out_infinite] rounded-xl bg-white/[0.04] py-2 text-3xl font-semibold leading-none sm:text-4xl bg-gradient-to-b from-white to-white/55 bg-clip-text text-transparent">
            {parts.seconds}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/55">Seconds</p>
        </div>
      </div>
    </section>
  );
}

export default function LuxModernPage() {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState("+94");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<WaitingListResponse | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [needsInteractionToPlay, setNeedsInteractionToPlay] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [showJoinSuccessAlert, setShowJoinSuccessAlert] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const countryCodeInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  const dialCodeDigits = useMemo(
    () =>
      Array.from(new Set(COUNTRY_CODES.map((item) => item.code.replace(/\D/g, "")))).sort(
        (a, b) => b.length - a.length
      ),
    []
  );

  const formattedCount = useMemo(() => {
    return new Intl.NumberFormat("en-US").format(data?.totalCount ?? 0);
  }, [data?.totalCount]);

  useEffect(() => {
    fetch("/api/waiting-list")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const backgroundMode = data?.backgroundMode === 'video' ? 'video' : 'slider';
  const sliderImages = useMemo(() => {
    if (!Array.isArray(data?.backgroundSliderImages) || data?.backgroundSliderImages.length === 0) {
      return [];
    }
    return data.backgroundSliderImages;
  }, [data?.backgroundSliderImages]);

  useEffect(() => {
    if (backgroundMode !== 'slider' || sliderImages.length <= 1) {
      setActiveSlideIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % sliderImages.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [backgroundMode, sliderImages]);

  const selectedCountryLabel = useMemo(() => {
    const match = COUNTRY_CODES.find((item) => item.code === normalizeCountryCode(countryCode));
    return match?.label || "Custom country code";
  }, [countryCode]);

  const handleCountryCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "");

    if (!digits) {
      setCountryCode("+");
      return;
    }

    let codeDigits = digits;
    let overflowDigits = "";
    const matchedDialCode = dialCodeDigits.find((dialCode) => digits.startsWith(dialCode));

    if (matchedDialCode) {
      codeDigits = matchedDialCode;
      overflowDigits = digits.slice(matchedDialCode.length);
    } else if (digits.length > 4) {
      codeDigits = digits.slice(0, 4);
      overflowDigits = digits.slice(4);
    }

    setCountryCode(`+${codeDigits}`);

    if (overflowDigits) {
      setPhoneNumber((prev) => `${overflowDigits}${prev}`.slice(0, 15));
      window.requestAnimationFrame(() => {
        phoneInputRef.current?.focus();
      });
    }
  };

  const showMovieCountdown = useMemo(() => {
    return getCountdownRemainingMs(data?.movieReleaseAt ?? null) > 0;
  }, [data?.movieReleaseAt]);

  const useVideoAudio = backgroundMode === 'video' && Boolean(data?.backgroundVideoUrl);
  const useSliderAudio = backgroundMode === 'slider' && Boolean(data?.backgroundAudioUrl);
  const hasAnyAudioSource = useVideoAudio || useSliderAudio;

  const tryStartActiveMedia = useCallback(() => {
    const mediaElement: HTMLMediaElement | null = useVideoAudio
      ? videoRef.current
      : useSliderAudio
        ? audioRef.current
        : null;

    if (!mediaElement) {
      return;
    }

    const playPromise = mediaElement.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise
        .then(() => {
          setNeedsInteractionToPlay(false);
        })
        .catch(() => {
          // Mobile browsers block autoplay with sound; retry muted so background video still starts.
          if (useVideoAudio && videoRef.current && !videoRef.current.muted) {
            videoRef.current.muted = true;
            setIsAudioMuted(true);

            const mutedPlayPromise = videoRef.current.play();
            if (mutedPlayPromise && typeof mutedPlayPromise.catch === 'function') {
              mutedPlayPromise
                .then(() => setNeedsInteractionToPlay(false))
                .catch(() => setNeedsInteractionToPlay(true));
              return;
            }
          }

          setNeedsInteractionToPlay(true);
        });
    }
  }, [useSliderAudio, useVideoAudio]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isAudioMuted;
    }
    if (audioRef.current) {
      audioRef.current.muted = isAudioMuted;
    }
  }, [isAudioMuted]);

  useEffect(() => {
    const audioElement = audioRef.current;
    const videoElement = videoRef.current;

    if (audioElement && !useSliderAudio) {
      if (!audioElement.paused) {
        audioElement.pause();
      }
    }

    if (videoElement && !useVideoAudio) {
      if (!videoElement.paused) {
        videoElement.pause();
      }
    }

    if (hasAnyAudioSource) {
      tryStartActiveMedia();
    }
  }, [hasAnyAudioSource, useSliderAudio, useVideoAudio, tryStartActiveMedia]);

  useEffect(() => {
    const mediaElement: HTMLMediaElement | null = useVideoAudio
      ? videoRef.current
      : useSliderAudio
        ? audioRef.current
        : null;

    if (!mediaElement) {
      return;
    }

    const handleReadyToPlay = () => {
      tryStartActiveMedia();
    };

    mediaElement.addEventListener('canplay', handleReadyToPlay);
    mediaElement.addEventListener('loadeddata', handleReadyToPlay);

    return () => {
      mediaElement.removeEventListener('canplay', handleReadyToPlay);
      mediaElement.removeEventListener('loadeddata', handleReadyToPlay);
    };
  }, [useVideoAudio, useSliderAudio, data?.backgroundVideoUrl, data?.backgroundAudioUrl, tryStartActiveMedia]);

  useEffect(() => {
    if (!needsInteractionToPlay || !hasAnyAudioSource) {
      return;
    }

    const tryPlay = () => {
      tryStartActiveMedia();
    };

    window.addEventListener('pointerdown', tryPlay, { once: true });
    window.addEventListener('keydown', tryPlay, { once: true });

    return () => {
      window.removeEventListener('pointerdown', tryPlay);
      window.removeEventListener('keydown', tryPlay);
    };
  }, [needsInteractionToPlay, hasAnyAudioSource, tryStartActiveMedia]);

  useEffect(() => {
    if (!isLoading && data && data.upcomingEnabled === false) {
      router.replace('/');
    }
  }, [isLoading, data, router]);

  useEffect(() => {
    if (!showJoinSuccessAlert) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowJoinSuccessAlert(false);
    }, 5500);

    return () => window.clearTimeout(timer);
  }, [showJoinSuccessAlert]);

  if (!isLoading && data?.upcomingEnabled === false) {
    return null;
  }

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();

    const sanitized = phoneNumber.replace(/\D/g, "");
    const normalizedCode = normalizeCountryCode(countryCode);
    if (normalizedCode === "+") {
      setFormError("Enter country code");
      return;
    }
    if (!sanitized || sanitized.length < 7) {
      setFormError("Enter a valid phone number");
      return;
    }

    setFormError(null);
    setFormMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/waiting-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: `${normalizedCode}${sanitized}`,
        }),
      });

      const updated = await res.json();

      if (!res.ok) {
        setFormError(updated.error || "Something went wrong");
        return;
      }

      if (updated.success) setData(updated);

      if (updated.joined) {
        setShowJoinSuccessAlert(true);
        setFormMessage(null);
      } else {
        setFormMessage(updated.message || "This phone number is already on the waiting list.");
      }
      setPhoneNumber("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAudioMute = () => {
    setIsAudioMuted((prev) => !prev);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-4 pb-16 pt-16 text-white sm:px-6 lg:px-8">
      {useSliderAudio ? (
        <>
          <audio
            ref={audioRef}
            src={data?.backgroundAudioUrl || undefined}
            autoPlay
            loop
            playsInline
            muted={isAudioMuted}
          />
        </>
      ) : null}

      {hasAnyAudioSource ? (
        <button
          type="button"
          onClick={handleToggleAudioMute}
          className="fixed bottom-5 left-4 z-[80] rounded-full border border-white/25 bg-black/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-white/40 hover:bg-black/75 sm:bottom-6 sm:left-6"
          aria-label={isAudioMuted ? 'Unmute page audio' : 'Mute page audio'}
        >
          {isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
        </button>
      ) : null}

      {showJoinSuccessAlert ? (
        <div
          className="fixed right-4 top-20 z-[80] w-[92vw] max-w-md overflow-hidden rounded-2xl border border-emerald-300/40 bg-black/85 shadow-[0_22px_60px_rgba(16,185,129,0.32)] backdrop-blur-xl sm:right-6 sm:top-24"
          role="status"
          aria-live="polite"
        >
          <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500" />
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400/15 text-emerald-200">
              <span className="text-sm font-bold">OK</span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/90">Waiting List Confirmed</p>
              <p className="mt-1 text-base font-semibold text-white">You joined the waiting list.</p>
              <p className="mt-1 text-sm leading-relaxed text-emerald-100/90">We will contact you once the tee is dropped.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowJoinSuccessAlert(false)}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
              aria-label="Dismiss success alert"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      
      {/* 🔥 Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        {backgroundMode === 'video' && data?.backgroundVideoUrl ? (
          <video
            ref={videoRef}
            key={data.backgroundVideoUrl}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
            autoPlay
            loop
            muted={isAudioMuted}
            playsInline
          >
            <source src={data.backgroundVideoUrl} />
          </video>
        ) : (
          sliderImages.map((imageUrl, index) => (
            <div
              key={`${imageUrl}-${index}`}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
                activeSlideIndex === index ? 'opacity-35' : 'opacity-0'
              }`}
              style={{ backgroundImage: `url('${imageUrl}')` }}
            />
          ))
        )}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(255,255,255,0.22),transparent_35%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_28%,rgba(255,255,255,0.12),transparent_38%)]" />
      </div>

      <main className="relative mx-auto w-full max-w-6xl">

        {/* 🧠 HEADER */}
        <header className="-mt-8 mb-12 text-center animate-[fadeIn_1s_ease-out] md:-mt-12 md:mb-14">

          <Image
            src={data?.logoImageUrl || '/images/michale copy2.png'}
            alt="The Michale"
            width={500}
            height={100}
            className="mx-auto w-[260px] opacity-95 sm:w-[320px] md:w-[420px]"
            priority
          />

          <p className="mt-1 text-[11px] tracking-[0.38em] text-white/70 uppercase">
            {(data?.subtitleText || 'Tribute Edition').trim() || 'Tribute Edition'}
          </p>

        </header>

  
        <section className="-mt-6 text-center md:-mt-8 md:mb-12">
          {/* <p className="text-[10px] tracking-[0.4em] text-white/65 uppercase">
            Waiting List
          </p> */}

          <div className="mx-auto mt-4 inline-flex  sm:px-6 sm:py-3 md:px-8 md:py-4">
            <div className="text-[6rem] sm:text-[7.6rem] md:text-[9.8rem] lg:text-[16rem] font-bold bg-gradient-to-b from-white to-white/30 bg-clip-text text-transparent leading-[0.9]">
              {isLoading ? "000,000" : formattedCount}
            </div>
          </div>

          <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/50">Registered on the waiting list</p>
        </section>

        {/* 🧾 FORM */}
        <section className="mx-auto mb-14 w-full max-w-3xl rounded-3xl border border-black/10 bg-black/10 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-6">
          <form onSubmit={handleJoin} className="space-y-4">
            <p className="text-lg font-semibold text-white">Join Waiting List</p>

            <div className="grid gap-3 sm:grid-cols-[100px_1fr_auto]">
              <input
                ref={countryCodeInputRef}
                type="tel"
                value={countryCode}
                onChange={(e) => handleCountryCodeChange(e.target.value)}
                placeholder="+94"
                className="h-12 rounded-xl border border-white/15 bg-black/70 px-3 text-base text-white outline-none transition placeholder:text-white/35 focus:border-white/40 focus:ring-2 focus:ring-white/35"
                inputMode="numeric"
                maxLength={5}
                aria-label="Country code"
              />

              <input
                ref={phoneInputRef}
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number"
                className="h-12 rounded-xl border border-white/15 bg-black/70 px-4 text-base text-white outline-none transition placeholder:text-white/35 focus:border-white/40 focus:ring-2 focus:ring-white/35"
                inputMode="numeric"
                maxLength={15}
                aria-label="Phone number"
              />

              <button
                disabled={isSubmitting}
                className="h-12 rounded-xl bg-white px-6 text-xs font-semibold uppercase tracking-[0.14em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isSubmitting ? "Joining..." : "Join"}
              </button>
            </div>

            <p className="text-xs text-white/60">Country: {selectedCountryLabel}</p>
            <p className="text-xs text-white/60">
              Preview: {normalizeCountryCode(countryCode)} {phoneNumber || "••••••••"}
            </p>

            {formError && <p className="text-sm text-white/70">{formError}</p>}
            {formMessage && <p className="text-sm text-white/90">{formMessage}</p>}
          </form>
        </section>

        {/* ⏳ COUNTDOWN */}
        <section className={`grid gap-6 ${showMovieCountdown ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
          <CountdownCard
            title="T-Shirt Release"
            targetDate={data?.tshirtReleaseAt ?? null}
          />
          {showMovieCountdown ? (
            <CountdownCard
              title="Movie Release"
              targetDate={data?.movieReleaseAt ?? null}
            />
          ) : null}
        </section>
      </main>

      {/* 🎬 Animation */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes countGlow {
          0%, 100% {
            transform: translateY(0);
            filter: drop-shadow(0 0 0 rgba(255, 255, 255, 0));
          }
          50% {
            transform: translateY(-1px);
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.25));
          }
        }
      `}</style>
    </div>
  );
}