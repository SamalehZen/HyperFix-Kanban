import { FadeIn } from "@/components/landing/fade-in";

export function FounderStatement() {
  return (
    <section id="why" className="px-6 py-16 md:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <FadeIn>
          <h2 className="text-3xl font-semibold md:text-4xl">
            Pourquoi HyperFix existe
          </h2>
        </FadeIn>
        <FadeIn delay={80}>
          <div className="mt-6 space-y-6 text-lg leading-relaxed text-muted-foreground">
            <p>
              Je suis{" "}
              <strong className="font-medium text-foreground">Andrej</strong>,
              et j&apos;ai créé HyperFix parce que j&apos;en avais assez des
              outils de gestion de projet qui gênaient plus qu&apos;ils
              n&apos;aidaient. Après des années à utiliser des plateformes
              lourdes et trop compliquées qui
              <strong className="font-medium text-foreground">
                {" "}
                détournaient l&apos;attention du vrai travail
              </strong>
              , je savais qu&apos;il devait y avoir une meilleure façon de
              faire.
            </p>
            <p>
              Le problème n&apos;était pas que ces outils manquaient de
              fonctionnalités : c&apos;est qu&apos;ils en avaient
              <strong className="font-medium text-foreground"> trop</strong>.
              Chaque notification, chaque bouton inutile, chaque flux complexe
              éloignait mon équipe de ce qui comptait vraiment :{" "}
              <strong className="font-medium text-foreground">
                construire d&apos;excellents produits
              </strong>
              .
            </p>
            <p>
              Je pense que les meilleurs outils sont{" "}
              <strong className="font-medium text-foreground">
                invisibles
              </strong>
              . Ils doivent amplifier le flux naturel de votre équipe, pas vous
              forcer à vous adapter au leur. HyperFix repose sur ce principe :
              <strong className="font-medium text-foreground">
                {" "}
                moins, c&apos;est mieux
              </strong>{" "}
              — chaque fonctionnalité existe parce qu&apos;elle résout un vrai
              problème, pas parce qu&apos;elle impressionne en démo.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
