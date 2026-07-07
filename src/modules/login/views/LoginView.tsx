import { useSearchParams } from "@solidjs/router";
import LoginForm from "./LoginForm";

// Only accept a same-site path as a redirect target — anything else (a
// protocol-relative "//evil.com" or absolute URL) is ignored to avoid an
// open redirect via the "next" query param.
function safeNext(next: string | string[] | undefined): string | undefined {
  const value = Array.isArray(next) ? next[0] : next;
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return undefined;
}

export default function LoginView() {
  const [searchParams] = useSearchParams();

  return (
    <div class="min-h-[60vh] flex items-center justify-center">
      <LoginForm dest={safeNext(searchParams.next)} />
    </div>
  );
}
