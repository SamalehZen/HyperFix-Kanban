import { Logo } from "@/components/landing/logo";

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-sidebar/70 px-6 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="space-y-4 md:col-span-2">
            <span className="inline-flex">
              <Logo />
            </span>
            <p className="max-w-sm text-balance text-muted-foreground text-sm">
              Tout ce dont vous avez besoin. Rien de superflu.
            </p>
          </div>

          <div className="col-span-3 grid gap-6 sm:grid-cols-3">
            <div className="space-y-3 text-sm">
              <p className="font-medium">Produit</p>
              <span className="block text-muted-foreground">Cloud</span>
              <span className="block text-muted-foreground">Démarrage</span>
              <span className="block text-muted-foreground">
                Fonctionnalités
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <p className="font-medium">Ressources</p>
              <span className="block text-muted-foreground">GitHub</span>
              <span className="block text-muted-foreground">Licence</span>
              <span className="block text-muted-foreground">Contribution</span>
            </div>

            <div className="space-y-3 text-sm">
              <p className="font-medium">Communauté</p>
              <span className="block text-muted-foreground">Discord</span>
              <span className="block text-muted-foreground">Documentation</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
