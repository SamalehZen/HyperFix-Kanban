import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AssistantFullPage } from "@/components/ai/assistant-full-page";
import Layout from "@/components/common/layout";

export const Route = createFileRoute("/_layout/_authenticated/ai")({
  component: AIPageComponent,
});

function AIPageComponent() {
  const { t } = useTranslation();
  return (
    <Layout>
      <Layout.Header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {t("navigation:sidebar.aiAssistant")}
          </span>
        </div>
      </Layout.Header>
      <Layout.Content>
        <AssistantFullPage />
      </Layout.Content>
    </Layout>
  );
}
