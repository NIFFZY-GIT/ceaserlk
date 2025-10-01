"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

export interface AuthHighlight {
  icon: ReactNode;
  title: string;
  description?: string;
}

interface AuthLayoutProps {
  children: ReactNode;
  formTitle: string;
  formSubtitle: string;
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    highlights?: AuthHighlight[];
  };
  footer?: ReactNode;
  bottomSlot?: ReactNode;
  backgroundImage?: string;
}

const LogoMark = () => (
  <span className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-slate-800">
    <svg
      aria-hidden="true"
      className="h-9 w-9 text-slate-900"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 17L12 22L22 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12L12 17L22 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span>Ceaser</span>
  </span>
);

const AuthLayout = ({
  children,
  formTitle,
  formSubtitle,
  hero,
  footer,
  bottomSlot,
  backgroundImage = "/images/image.jpg",
}: AuthLayoutProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        <div className="absolute inset-y-0 right-[-12rem] h-[28rem] w-[28rem] rounded-full bg-rose-500/20 blur-[140px] lg:right-[-6rem] lg:h-[36rem] lg:w-[36rem]" />
        <div className="absolute left-[-16rem] top-[-10rem] h-[26rem] w-[26rem] rounded-full bg-indigo-500/20 blur-[150px]" />
        <div className="absolute inset-x-0 top-[-14rem] flex justify-center">
          <div className="h-72 w-[28rem] rounded-full bg-accent/25 blur-[140px]" />
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          <div className="relative order-2 w-full text-white lg:order-1 lg:max-w-xl">
            <div className="absolute inset-0 -z-10 hidden overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 shadow-[0_40px_140px_-60px_rgba(15,23,42,0.8)] lg:block">
              <Image
                src={backgroundImage}
                alt="Motivational backdrop"
                fill
                priority
                className="object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-900/90" />
            </div>
            <div className="space-y-8 rounded-[2.5rem] border border-white/10 bg-white/5 p-8 backdrop-blur-md lg:border-none lg:bg-transparent lg:p-0 lg:backdrop-blur-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {hero.eyebrow}
              </span>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {hero.title}
                </h1>
                <p className="mt-6 text-base text-white/70 sm:text-lg">{hero.description}</p>
              </div>
              {hero.highlights && hero.highlights.length > 0 && (
                <dl className="grid gap-5 sm:grid-cols-2">
                  {hero.highlights.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-lg"
                    >
                      <div className="flex items-center gap-3 text-sm font-semibold text-white">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white">
                          {item.icon}
                        </span>
                        {item.title}
                      </div>
                      {item.description && (
                        <p className="mt-3 text-sm text-white/60">{item.description}</p>
                      )}
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>

          <div className="order-1 w-full lg:order-2 lg:max-w-md">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-[0_30px_120px_-60px_rgba(15,23,42,0.45)]">
              <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-white/95" />
              <div className="relative z-10 p-8 sm:p-10">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <LogoMark />
                </Link>
                <div className="mt-6 space-y-3">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
                    {formTitle}
                  </h2>
                  <p className="text-sm text-slate-500 sm:text-base">{formSubtitle}</p>
                </div>
                <div className="mt-8 space-y-7">{children}</div>
                {footer && <div className="mt-10 space-y-6">{footer}</div>}
              </div>
            </div>
            {bottomSlot && (
              <div className="mt-8 text-center text-sm text-white/80">
                {bottomSlot}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
