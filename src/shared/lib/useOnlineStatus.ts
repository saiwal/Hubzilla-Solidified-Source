import { createSignal, onMount, onCleanup } from 'solid-js';

export function useOnlineStatus() {
  const [online, setOnline] = createSignal(navigator.onLine);
  onMount(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    onCleanup(() => {
      window.removeEventListener('online',  on);
      window.removeEventListener('offline', off);
    });
  });
  return online;
}
