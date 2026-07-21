import { registerModule } from "@/shared/lib/module-registry";

registerModule({
  id: "password-reset",
  routes: [
    { path: "/forgot-password", component: () => import("./views/ForgotPasswordView") },
    { path: "/reset-password/:token", component: () => import("./views/ResetPasswordView") },
  ],
  slots: {},
  permissions: [],
});
