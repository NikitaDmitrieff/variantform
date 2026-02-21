"use client";
import { useState } from "react";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarButton,
} from "@/components/ui/resizable-navbar";

const navItems = [
  { name: "How it works", link: "#how-it-works" },
  { name: "Commands", link: "#commands" },
  { name: "Compare", link: "#compare" },
];

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <Navbar>
      <NavBody>
        <a
          href="#"
          className="relative z-20 flex items-center gap-2.5 px-2 py-1 text-sm font-bold text-white"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-gradient-to-br from-cyan-400 to-violet-500">
            <span className="font-display text-xs font-extrabold text-white">
              V
            </span>
          </div>
          <span className="font-display text-base tracking-tight">
            variantform
          </span>
        </a>
        <NavItems items={navItems} />
        <div className="flex items-center gap-3">
          <NavbarButton
            href="https://github.com/NikitaDmitrieff/variantform"
            variant="secondary"
            className="text-zinc-400"
          >
            GitHub
          </NavbarButton>
          <NavbarButton href="#get-started" variant="gradient">
            Get Started
          </NavbarButton>
        </div>
      </NavBody>
      <MobileNav>
        <MobileNavHeader>
          <a
            href="#"
            className="flex items-center gap-2 text-sm font-bold text-white"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-gradient-to-br from-cyan-400 to-violet-500">
              <span className="font-display text-xs font-extrabold text-white">
                V
              </span>
            </div>
            variantform
          </a>
          <MobileNavToggle
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </MobileNavHeader>
        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        >
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.link}
              className="text-sm text-zinc-300"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.name}
            </a>
          ))}
          <NavbarButton href="#get-started" variant="gradient" className="w-full">
            Get Started
          </NavbarButton>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
