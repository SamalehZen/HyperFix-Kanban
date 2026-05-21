import { FadeIn } from "@/components/landing/fade-in";

export function Features() {
  return (
    <section
      id="features"
      className="relative bg-sidebar/55 px-6 py-16 md:py-20"
    >
      <div className="mx-auto w-full max-w-6xl">
        <FadeIn>
          <div className="rounded-2xl border border-border/70 bg-card/70 p-2">
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
              <article className="rounded-xl border border-border/70 bg-card p-6 lg:col-span-5 lg:p-8">
                <p className="font-medium text-muted-foreground text-sm">
                  Flux essentiels
                </p>
                <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">
                  Une interface minimale. Une exécution parfaitement claire.
                </h2>
                <p className="mt-4 max-w-xl text-muted-foreground text-base leading-relaxed">
                  HyperFix garde la planification opérationnelle : moins de
                  tableaux de bord décoratifs, plus de responsabilités visibles
                  et de débit réel.
                </p>
                <div className="mt-6 rounded-xl border border-border/60 bg-muted/30 p-4">
                  <h3 className="text-sm font-medium">
                    Tableau et liste, une seule source de vérité
                  </h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                    Planifiez en vue liste, exécutez en vue tableau, et gardez
                    les statuts, priorités et libellés synchronisés.
                  </p>
                </div>
              </article>

              <div className="grid grid-cols-1 gap-2 lg:col-span-7 sm:grid-cols-2">
                <article className="rounded-xl border border-border/70 bg-card p-6">
                  <h3 className="text-sm font-medium">
                    Une planification qui reste concentrée
                  </h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                    Attribuez des responsables, des échéances et des priorités
                    sans ajouter de processus lourd.
                  </p>
                </article>

                <article className="rounded-xl border border-border/70 bg-card p-6">
                  <h3 className="text-sm font-medium">Libellés et priorités</h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                    Organisez les initiatives avec des libellés et priorisez le
                    travail clairement entre backlog et périmètre actif.
                  </p>
                </article>

                <article className="rounded-xl border border-border/70 bg-card p-6 sm:col-span-2">
                  <h3 className="text-sm font-medium">
                    Intégration GitHub native
                  </h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                    Synchronisez les issues et gardez la planification produit
                    alignée avec l&apos;exécution du développement.
                  </p>
                </article>

                <article className="rounded-xl border border-border/70 bg-card p-6">
                  <h3 className="text-sm font-medium">
                    Confidentialité d&apos;abord
                  </h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                    Des analyses minimales et une architecture transparente pour
                    les équipes qui veulent garder le contrôle.
                  </p>
                </article>

                <article className="rounded-xl border border-border/70 bg-card p-6">
                  <h3 className="text-sm font-medium">
                    Auto-hébergé par défaut
                  </h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                    Déployez avec Docker et gardez la pleine maîtrise de votre
                    infrastructure et de vos données.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
