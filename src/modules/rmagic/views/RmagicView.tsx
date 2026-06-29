import { Navigate } from "@solidjs/router";

// Remote login is now part of the combined login page.
export default function RmagicView() {
  return <Navigate href="/login" />;
}
