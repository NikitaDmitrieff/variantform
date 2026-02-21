"use client";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";

export function FooterSection() {
  return (
    <footer className="relative mt-32">
      {/* Footer links */}
      <div className="border-t border-white/[0.04] px-4 py-12">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-6 text-center">
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
            Built by{" "}
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

      {/* VARIANTFORM — subtle grey sign-off */}
      <div className="h-[18rem] flex items-center justify-center overflow-hidden opacity-25">
        <TextHoverEffect text="VARIANTFORM" duration={0.3} />
      </div>
    </footer>
  );
}
