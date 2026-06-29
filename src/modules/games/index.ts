import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { GAMES } from "./games-registry";

const gameView = () => import("./views/GamesPage");

registerModule({
  id: "games",
  routes: [
    { path: "/games",     component: gameView },
    ...GAMES.map((game) => ({ path: `/games/${game.id}`, component: gameView })),
  ],
  navItem: {
    path: "/games",
    href: "/games",
    label: () => useI18n().t("nav.games"),
    icon: "games",
    hidden: false,
  },
});

export {};
