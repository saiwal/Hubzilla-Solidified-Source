import { createResource, Show } from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import { useAuth } from "@/shared/store/auth-store";
import { useI18n } from "@/i18n";
import WebpageComposer from "@/shared/editor/composers/WebpageComposer";
import { fetchWebPageByIid } from "../api";

export default function WebpageEditorView() {
  const { t } = useI18n();
  const params = useParams<{ nick: string; iid?: string }>();
  const navigate = useNavigate();
  const auth = useAuth();

  const nick = () => params.nick;
  const iid = () => (params.iid ? parseInt(params.iid, 10) : null);
  const isEditing = () => iid() !== null;

  const [page] = createResource(
    () => (isEditing() ? { nick: nick(), iid: iid()! } : null),
    ({ nick, iid }) => fetchWebPageByIid(nick, iid),
  );

  const onSaved = () => navigate(`/webpages/${nick()}`);
  const onCancel = () => navigate(`/webpages/${nick()}`);

  return (
    <div class="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div class="flex items-center gap-2 text-sm text-muted px-4 pt-4">
        <A
          href={`/webpages/${nick()}`}
          class="hover:text-txt transition-colors"
        >
          {t("webpages.back")}
        </A>
        <span>/</span>
        <span>{isEditing() ? t("webpages.edit_page_title") : t("webpages.new_page_title")}</span>
      </div>

      {/* Loading skeleton */}
      <Show when={page.loading}>
        <div class="space-y-4 p-4 animate-pulse">
          <div class="h-8 bg-elevated rounded w-1/2" />
          <div class="h-4 bg-elevated rounded w-1/4" />
          <div class="h-64 bg-elevated rounded" />
        </div>
      </Show>

      {/* Error */}
      <Show when={page.error}>
        <div class="m-4 p-4 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">
          {page.error?.message ?? t("webpages.load_failed")}
        </div>
      </Show>

      {/* Create mode */}
      <Show when={!isEditing() && !page.loading}>
        <WebpageComposer
          profileUid={auth()?.uid ?? 0}
          nick={nick()}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      </Show>

      {/* Edit mode */}
      <Show when={isEditing() && !page.loading && page()}>
        <WebpageComposer
          profileUid={auth()?.uid ?? 0}
          nick={nick()}
          initial={{
            mid:      page()!.mid,
            title:    page()!.title,
            slug:     page()!.slug,
            body:     page()!.body,
            mimetype: page()!.mimetype,
          }}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      </Show>
    </div>
  );
}
