"use client";

import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  SearchIcon,
  SquareKanban,
  SquircleDashed,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import BoardToolbar from "@/components/project-board-toolbar";
import { PrivateKanbanView } from "@/components/project-private-kanban-view";
import { PrivateListView } from "@/components/project-private-list-view";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useTaskFilters } from "@/hooks/use-task-filters";
import { cn } from "@/lib/utils";
import {
  MOCK_PROJECTS,
  MOCK_USERS,
  MOCK_WORKSPACE,
  MOCK_WORKSPACE_LABELS,
} from "./mock-data";

const PREVIEW_W = 1400;
const PREVIEW_H = 860;

// ─────────────────────────────────────────────────────────────────────────────
// MockSidebar — visually identical to app-sidebar.tsx, driven by mock data
// ─────────────────────────────────────────────────────────────────────────────
function MockSidebar({
  activeProjectId,
  onProjectSelect,
}: {
  activeProjectId: string;
  onProjectSelect: (id: string) => void;
}) {
  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      className="border-none pt-1.5"
    >
      {/* Header — WorkspaceSwitcher */}
      <SidebarHeader className="pt-1 pb-1.5">
        <div className="flex items-center justify-between w-full gap-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      className="group h-8 w-full rounded-md px-2 text-sidebar-foreground data-[active=true]:bg-sidebar-accent/50"
                      size="default"
                    />
                  }
                >
                  <div className="flex items-center min-w-0 w-full">
                    <span className="truncate text-sm font-medium text-sidebar-foreground">
                      {MOCK_WORKSPACE.name}
                    </span>
                  </div>
                  <ChevronDown className="ml-1 size-3.5 text-sidebar-foreground/72 opacity-90 transition-all duration-200 ease-out group-hover:opacity-100" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="min-w-40 text-sidebar-foreground"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                    <DropdownMenuItem className="h-7 text-sm data-highlighted:bg-sidebar-accent">
                      {MOCK_WORKSPACE.name}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="h-7 text-sm data-highlighted:bg-sidebar-accent">
                      Add workspace
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="h-7 w-7 shrink-0 flex items-center justify-center">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] font-medium">
                AC
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden gap-1 py-1">
        {/* Search (visual only) */}
        <SidebarGroup className="pb-1">
          <button
            type="button"
            className="inline-flex h-8 w-full cursor-pointer rounded-md border border-input bg-background px-2 py-1.5 text-foreground text-sm shadow-xs outline-none transition-[color,box-shadow]"
          >
            <span className="flex grow items-center">
              <SearchIcon
                aria-hidden="true"
                className="-ms-1 me-3 text-muted-foreground/80"
                size={16}
              />
              <span className="font-normal text-muted-foreground/70">
                Search
              </span>
            </span>
            <kbd className="-me-0.5 ms-6 inline-flex h-4 max-h-full items-center rounded border border-border/70 bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/60">
              ⌘K
            </kbd>
          </button>
        </SidebarGroup>

        {/* NavMain — Overview */}
        <Collapsible defaultOpen>
          <SidebarGroup className="gap-1 p-2">
            <CollapsibleTrigger
              nativeButton={false}
              className="data-panel-open:[&_svg]:rotate-90"
              render={
                <SidebarGroupLabel className="h-7 cursor-pointer justify-between px-0 text-sidebar-accent-foreground" />
              }
            >
              <span>Overview</span>
              <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/60 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {["Projects", "Members", "Invitations"].map((title) => (
                    <SidebarMenuItem key={title}>
                      <SidebarMenuButton
                        size="default"
                        className="h-8 ps-3.5 text-sm hover:bg-transparent hover:text-sidebar-accent-foreground active:bg-transparent cursor-default"
                      >
                        <span>{title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsiblePanel>
          </SidebarGroup>
        </Collapsible>

        {/* NavProjects — Projects */}
        <Collapsible defaultOpen>
          <SidebarGroup className="gap-1 p-2 pt-1">
            <CollapsibleTrigger
              nativeButton={false}
              className="data-panel-open:[&_svg]:rotate-90"
              render={
                <SidebarGroupLabel className="h-7 cursor-pointer justify-between px-0 text-sidebar-accent-foreground" />
              }
            >
              <span>Projects</span>
              <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/60 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0">
                  {MOCK_PROJECTS.map((project) => (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton
                        isActive={project.id === activeProjectId}
                        size="default"
                        className="group/proj h-8 text-sm"
                        onClick={() => onProjectSelect(project.id)}
                      >
                        <span className="truncate">{project.name}</span>

                        <span className="ml-1 h-5 w-5 flex items-center justify-center opacity-0 group-hover/proj:opacity-100 rounded-sm">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsiblePanel>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      {/* Footer — version only */}
      <SidebarFooter>
        <div className="flex items-center justify-center px-2 py-1.5">
          <span className="text-xs text-muted-foreground">v1.0.0</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AppPreview
// ─────────────────────────────────────────────────────────────────────────────
export function AppPreview() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const [activeProjectId, setActiveProjectId] = useState(MOCK_PROJECTS[0].id);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  const activeProject =
    MOCK_PROJECTS.find((p) => p.id === activeProjectId) ?? MOCK_PROJECTS[0];

  const {
    filters,
    filteredProject,
    updateFilter,
    updateLabelFilter,
    clearFilters,
    hasActiveFilters,
  } = useTaskFilters(activeProject, activeProjectId);

  const handleProjectSelect = useCallback((id: string) => {
    setActiveProjectId(id);
  }, []);

  // Scale preview to fill the container width; boost on mobile for legibility
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) {
        const boost = w < 768 ? 2.5 : 1;
        setScale((w / PREVIEW_W) * boost);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full overflow-x-auto md:overflow-x-hidden [-webkit-overflow-scrolling:touch]"
      style={{ height: PREVIEW_H * scale }}
    >
      <div
        style={{
          width: PREVIEW_W,
          height: PREVIEW_H,
          transform: `scale(${scale}) translateZ(0)`,
          transformOrigin: "top left",
          willChange: "transform",
          backfaceVisibility: "hidden" as const,
          WebkitFontSmoothing: "subpixel-antialiased",
        }}
        className="absolute top-0 left-0 overflow-hidden rounded-xl border border-border/70 bg-background shadow-2xl ring-1 ring-black/5"
      >
        <SidebarProvider
          defaultOpen
          style={
            { "--sidebar-width": "14rem", minHeight: 0 } as React.CSSProperties
          }
          className="h-full"
        >
          <MockSidebar
            activeProjectId={activeProjectId}
            onProjectSelect={handleProjectSelect}
          />

          <SidebarInset className="m-2 flex flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm/5">
            {/* ── Project header (matches project-layout.tsx) ───────────── */}
            <header className="h-10 flex shrink-0 items-center gap-2 border-b border-border bg-card px-2">
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {/* Breadcrumb */}
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="text-sm text-muted-foreground truncate">
                      {MOCK_WORKSPACE.name}
                    </span>
                    <span className="text-muted-foreground/70 text-xs">/</span>
                    <span className="text-sm font-medium truncate">
                      {activeProject.name}
                    </span>
                  </div>

                  {/* View switcher */}
                  <div className="h-8 items-center gap-0.5 rounded-lg border border-border/80 bg-background p-0.5 inline-flex">
                    <Button
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="xs"
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "h-6 gap-1.5 rounded-md px-2 text-xs",
                        viewMode !== "list" && "text-muted-foreground",
                      )}
                    >
                      <SquircleDashed className="size-3.5" />
                      Backlog
                    </Button>
                    <Button
                      variant={viewMode === "board" ? "secondary" : "ghost"}
                      size="xs"
                      onClick={() => setViewMode("board")}
                      className={cn(
                        "h-6 gap-1.5 rounded-md px-2 text-xs",
                        viewMode !== "board" && "text-muted-foreground",
                      )}
                    >
                      <SquareKanban className="size-3.5" />
                      Board
                    </Button>
                  </div>
                </div>
              </div>
            </header>

            {/* ── Board Toolbar ─────────────────────────────────────────── */}
            <BoardToolbar
              project={activeProject}
              filters={filters}
              updateFilter={updateFilter}
              updateLabelFilter={updateLabelFilter}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              users={MOCK_USERS}
              workspaceLabels={MOCK_WORKSPACE_LABELS}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />

            {/* ── View content ─────────────────────────────────────────── */}
            <div className="relative flex-1 overflow-hidden flex flex-col min-h-0 bg-linear-to-b from-muted/20 to-background">
              {viewMode === "board" ? (
                <PrivateKanbanView
                  project={filteredProject ?? activeProject}
                  onTaskClick={() => {}}
                />
              ) : (
                <PrivateListView
                  project={filteredProject ?? activeProject}
                  onTaskClick={() => {}}
                />
              )}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}
