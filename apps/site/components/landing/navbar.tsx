"use client";

import { Logo } from "@/components/landing/logo";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const navigationLinks = ["Produit", "Docs", "À propos"];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 px-4 backdrop-blur-md md:px-6">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  className="group size-8 md:hidden"
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <svg
                className="pointer-events-none"
                fill="none"
                height={16}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width={16}
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Menu</title>
                <path
                  className="-translate-y-[7px] origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-315"
                  d="M4 12L20 12"
                />
                <path
                  className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
                  d="M4 12H20"
                />
                <path
                  className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-135"
                  d="M4 12H20"
                />
              </svg>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-1 md:hidden">
              <NavigationMenu className="max-w-none *:w-full" viewport={false}>
                <NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
                  {navigationLinks.map((link) => (
                    <NavigationMenuItem className="w-full" key={link}>
                      <div className="px-2 py-1.5 font-medium text-muted-foreground text-xs">
                        {link}
                      </div>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-6">
            <a
              className="flex h-8 items-center text-primary hover:text-primary"
              href="/"
              aria-label="Accueil HyperFix"
            >
              <Logo />
            </a>
            <NavigationMenu
              className="max-md:hidden"
              viewport={false}
              delayDuration={0}
              skipDelayDuration={0}
            >
              <NavigationMenuList className="gap-2">
                {navigationLinks.map((link) => (
                  <NavigationMenuItem key={link}>
                    <span className="block rounded-none px-2 py-1.5 font-medium text-muted-foreground">
                      {link}
                    </span>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="text-sm max-sm:hidden"
            size="sm"
            variant="ghost"
            onClick={() => {
              window.location.href = "https://github.com/sponsors/andrejsshell";
            }}
          >
            Sponsoriser
          </Button>
          <Button
            className="text-sm"
            size="sm"
            variant="ghost"
            onClick={() => {
              window.location.href =
                "https://coubeche.hypeer.cloud/auth/sign-in";
            }}
          >
            Connexion
          </Button>
          <Button
            className="text-sm"
            size="sm"
            onClick={() => {
              window.location.href = "https://coubeche.hypeer.cloud";
            }}
          >
            Commencer
          </Button>
        </div>
      </div>
    </header>
  );
}
