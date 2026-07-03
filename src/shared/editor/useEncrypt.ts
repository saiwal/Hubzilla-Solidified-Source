import { createSignal } from "solid-js";
import { useI18n } from "@/i18n";
import { encryptBody, isEncryptedBody } from "@/shared/lib/postCrypto";

/**
 * Shared encrypt state + logic for all composers.
 * Call once inside the component body and pass store.body / store.setBody.
 */
export function useEncrypt(getBody: () => string, setBody: (b: string) => void) {
  const { t } = useI18n();

  const [open, setOpen]       = createSignal(false);
  const [password, setPassword] = createSignal("");
  const [confirm, setConfirm]   = createSignal("");
  const [hint, setHint]         = createSignal("");
  const [encrypting, setEncrypting] = createSignal(false);
  const [error, setError]       = createSignal("");

  async function doEncrypt() {
    const body = getBody().trim();
    if (!body)              { setError(t("editor.encrypt_error_empty"));       return; }
    if (isEncryptedBody(body)) { setError(t("editor.encrypt_error_already")); return; }
    const pw = password().trim();
    if (!pw)                { setError(t("editor.encrypt_error_no_password")); return; }
    if (pw !== confirm().trim()) { setError(t("editor.encrypt_error_mismatch")); return; }

    setEncrypting(true);
    setError("");
    try {
      setBody(await encryptBody(body, pw, hint().trim()));
      setOpen(false);
      setPassword("");
      setConfirm("");
      setHint("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encryption failed");
    } finally {
      setEncrypting(false);
    }
  }

  function reset() {
    setOpen(false);
    setPassword("");
    setConfirm("");
    setHint("");
    setError("");
  }

  return {
    open, setOpen,
    password, setPassword,
    confirm, setConfirm,
    hint, setHint,
    encrypting, error,
    doEncrypt, reset,
  };
}
