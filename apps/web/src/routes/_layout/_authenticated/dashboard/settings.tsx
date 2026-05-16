import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/settings",
)({
  component: SettingsLayout,
});

function SettingsLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: workspace } = useActiveWorkspace();
  const { data: projects } = useGetProjects({
    workspaceId: workspace?.id ?? "",
  });
  const { isAdmin, role } = useWorkspacePermission();

  // Members must never reach workspace or project mutation pages even by typing
  // the URL — bounce them to their account settings. Backend still enforces.
  // Wait for role to hydrate first so we don't false-positively redirect
  // admins during the initial workspace-user query.
  useEffect(() => {
    if (role === undefined) return;
    if (isAdmin) return;
    const pathname = location.pathname;
    if (
      pathname.includes("/dashboard/settings/workspace") ||
      pathname.includes("/dashboard/settings/projects")
    ) {
      navigate({
        to: "/dashboard/settings/account/information",
        replace: true,
      });
    }
  }, [isAdmin, role, location.pathname, navigate]);

  const getActiveTab = () => {
    const pathname = location.pathname;
    if (pathname.includes("/dashboard/settings/account")) {
      return "account";
    }
    if (pathname.includes("/dashboard/settings/workspace")) {
      return "workspace";
    }
    if (pathname.includes("/dashboard/settings/projects")) {
      return "project";
    }
    return "account";
  };

  const activeTab = getActiveTab();

  return (
    <>
      <PageTitle title={t("navigation:page.settingsTitle")} />
      <div className="flex flex-col gap-4 p-4 bg-sidebar w-full h-full">
        <div className="flex flex-col gap-4 bg-card h-full border border-border rounded-md p-4 relative overflow-hidden">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate({
                  to: "/dashboard/workspace/$workspaceId",
                  params: { workspaceId: workspace?.id ?? "" },
                })
              }
            >
              <ChevronLeft className=" border border-border rounded-md p-1 size-6" />
              {t("navigation:page.backToWorkspace")}
            </Button>

            <h1 className="text-2xl font-semibold pl-2 mt-2">
              {t("navigation:page.settingsTitle")}
            </h1>

            <Tabs value={activeTab} className="w-[400px] pt-2">
              <TabsList className="bg-sidebar gap-2">
                <TabsTrigger
                  className="[&[data-state=active]]:border [&[data-state=active]]:border-border [&[data-state=active]]:rounded-md [&[data-state=active]]:bg-card"
                  value="account"
                  onClick={() =>
                    navigate({ to: "/dashboard/settings/account/information" })
                  }
                >
                  {t("settings:account")}
                </TabsTrigger>
                {isAdmin ? (
                  <>
                    <TabsTrigger
                      value="workspace"
                      className="[&[data-state=active]]:border [&[data-state=active]]:border-border [&[data-state=active]]:rounded-md [&[data-state=active]]:bg-card"
                      onClick={() =>
                        navigate({
                          to: "/dashboard/settings/workspace/general",
                        })
                      }
                    >
                      {t("navigation:page.settingsWorkspaceTab")}
                    </TabsTrigger>
                    <TabsTrigger
                      disabled={projects?.length === 0}
                      value="project"
                      className="[&[data-state=active]]:border [&[data-state=active]]:border-border [&[data-state=active]]:rounded-md [&[data-state=active]]:bg-card"
                      onClick={() =>
                        navigate({ to: "/dashboard/settings/projects" })
                      }
                    >
                      {t("navigation:sidebar.projects")}
                    </TabsTrigger>
                  </>
                ) : null}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}
