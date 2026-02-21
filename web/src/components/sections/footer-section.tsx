"use client";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";

export function FooterSection() {
  return (
    <footer className="relative mt-24">
      {/* Footer links — above the VARIANTFORM text */}
      <div className="px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
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
          <a
            href="https://github.com/NikitaDmitrieff/variantform#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-zinc-300"
          >
            Read the full documentation
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
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

      {/* VARIANTFORM — the true footer */}
      <div className="h-[20rem] flex items-center justify-center overflow-hidden">
        <TextHoverEffect text="VARIANTFORM" duration={0.3} />
      </div>
    </footer>
  );
}
