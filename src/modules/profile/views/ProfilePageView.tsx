import { useParams } from "@solidjs/router";
import { useI18n } from "@/i18n";
import ProfileView from "@/modules/channel/views/ProfileView";

export default function ProfilePageView() {
  const params = useParams<{ nick: string }>();
  const { t } = useI18n();

  return (
    <div class="max-w-2xl mx-auto py-4 px-2">
      <ProfileView />
      <div class="mt-3 text-center">
        <a
          href={`/channel/${params.nick}`}
          class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors"
        >
          {t("nav.channel")} →
        </a>
      </div>
    </div>
  );
}
