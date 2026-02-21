"use client";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";

export function FooterSection() {
  return (
    <footer className="relative border-t border-white/[0.04]">
      {/* Big text hover effect */}
      <div className="h-[20rem] flex items-center justify-center overflow-hidden">
        <TextHoverEffect text="VARIANTFORM" duration={0.3} />
      </div>

      {/* Footer links */}
      <div className="border-t border-white/[0.04] px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-violet-500">
              <span className="font-display text-[10px] font-extrabold text-white">
                V
              </span>
            </div>
            <span className="font-display text-sm text-zinc-500 tracking-tight">
              variantform
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-600">
            <a
              href="https://github.com/NikitaDmitrieff/variantform"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-zinc-300"
            >
              GitHub
            </a>
            <a
              href="https://github.com/NikitaDmitrieff/variantform#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-zinc-300"
            >
              Docs
            </a>
            <a
              href="https://github.com/NikitaDmitrieff/variantform/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-zinc-300"
            >
              MIT License
            </a>
          </div>
          <p className="text-xs text-zinc-700">
            Built with precision by{" "}
            <a
              href="https://github.com/NikitaDmitrieff"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Nikita Dmitrieff
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
