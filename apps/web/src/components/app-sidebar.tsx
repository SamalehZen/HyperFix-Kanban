import { Sparkles } from "lucide-react";
import type * as React from "react";
import { useTranslation } from "react-i18next";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { ThemeToggleDropdown } from "@/components/theme-toggle-dropdown";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { VersionDisplay } from "@/components/version-display";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { shortcuts } from "@/constants/shortcuts";
import { useRegisterShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAIStore } from "@/store/ai";
import Search from "./search";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { toggleSidebar } = useSidebar();
  const { toggle } = useAIStore();
  const { t } = useTranslation();

  useRegisterShortcuts({
    modifierShortcuts: {
      [shortcuts.sidebar.prefix]: {
        [shortcuts.sidebar.toggle]: toggleSidebar,
      },
    },
  });

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      className="border-none pt-1.5"
      {...props}
    >
      <SidebarHeader className="pt-1 pb-1.5">
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden gap-1 py-1">
        <Search />
        <NavMain />
        <NavProjects />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex h-16 items-center justify-between gap-3 px-1">
          <VersionDisplay />
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggle}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title={`${t("navigation:sidebar.aiAssistant")} (Alt+A)`}
              type="button"
            >
              <Sparkles
                size={14}
                className="hover:text-primary transition-colors"
              />
            </button>
            <ThemeToggleDropdown />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
