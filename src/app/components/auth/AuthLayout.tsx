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
  <Image
    src="/assets/logo3.png"
    alt="CEASAR Designs"
    width={150}
    height={63}
    priority
    className="w-auto h-auto max-h-12"
    style={{ height: 'auto', width: 'auto' }}
  />
);

const AuthLayout = ({
  children,
  formTitle,
  formSubtitle,
  hero,
  footer,
  bottomSlot,
  backgroundImage = "/assets/pattern.png",
}: AuthLayoutProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative z-10 flex flex-col justify-center min-h-screen px-6 py-12 sm:px-10 lg:px-16">
        <div className="flex flex-col w-full max-w-6xl gap-12 mx-auto lg:flex-row lg:items-center lg:gap-16">
          <div className="relative order-2 w-full text-white lg:order-1 lg:max-w-xl">
            <div className="space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
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
                      className="p-5 border rounded-2xl border-white/10"
                    >
                      <div className="flex items-center gap-3 text-sm font-semibold text-white">
                        <span className="flex items-center justify-center text-white h-9 w-9 rounded-xl bg-white/15">
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
              <div className="mt-8 text-sm text-center text-white/80">
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
