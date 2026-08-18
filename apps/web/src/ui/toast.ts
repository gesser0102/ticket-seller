const EVENT_NAME = "app:toast";

export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT_NAME, { detail: message }));
}

export function subscribeToToasts(handler: (message: string) => void): () => void {
  function listener(e: Event) {
    handler((e as CustomEvent<string>).detail);
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
