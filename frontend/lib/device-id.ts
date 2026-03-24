const DEVICE_ID_KEY = "lila.device_id";

function createDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getOrCreateDeviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);

  if (existing) {
    return existing;
  }

  const next = createDeviceId();
  window.localStorage.setItem(DEVICE_ID_KEY, next);

  return next;
}

export function clearStoredDeviceId(): void {
  window.localStorage.removeItem(DEVICE_ID_KEY);
}
