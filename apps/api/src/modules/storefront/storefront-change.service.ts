export type StorefrontChangeScope = "settings" | "products" | "categories";

type StorefrontChangeListener = (scope: StorefrontChangeScope) => void;

export class StorefrontChangeService {
  private readonly listeners = new Set<StorefrontChangeListener>();

  subscribe(listener: StorefrontChangeListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(scope: StorefrontChangeScope) {
    for (const listener of this.listeners) listener(scope);
  }
}
