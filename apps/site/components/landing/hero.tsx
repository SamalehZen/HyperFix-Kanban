"use client";

import { Github } from "lucide-react";
import { AppPreview } from "@/components/landing/app-preview";
import { FadeIn } from "@/components/landing/fade-in";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-14 pb-16 md:pt-20 md:pb-20 lg:pt-24">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10 max-w-2xl">
          <FadeIn delay={0}>
            <h1 className="text-balance text-4xl font-medium leading-[1.06] md:text-5xl lg:text-6xl">
              Tout ce qu&apos;il vous <span className="text-primary">faut</span>
              . Rien de superflu.
            </h1>
          </FadeIn>
          <FadeIn delay={80}>
            <p className="mt-5 text-balance text-lg text-muted-foreground leading-relaxed md:text-xl">
              HyperFix vous donne une planification claire, une exécution ciblée
              et la pleine maîtrise de votre flux de travail, du backlog à la
              livraison.
            </p>
          </FadeIn>

          <FadeIn delay={160}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="gap-2"
                onClick={() => {
                  window.location.href = "https://coubeche.hypeer.cloud";
                }}
              >
                Cloud
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => {
                  window.location.href = "/docs/core";
                }}
              >
                Commencer
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => {
                  window.location.href = "https://github.com/samalehzen/hyper";
                }}
              >
                <Github className="h-4 w-4" />
                GitHub
              </Button>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={240} distance={32}>
          <AppPreview />
        </FadeIn>
      </div>
    </section>
  );
}
