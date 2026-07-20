import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  priceInCents: number;
  imageUrl: string;
};

type CartState = {
  items: Array<CartProduct & { quantity: number }>;
  add: (product: CartProduct, quantity?: number) => void;
  update: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add(product, quantity = 1) {
        set((state) => {
          const existing = state.items.find((item) => item.id === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === product.id ? { ...item, quantity: Math.min(item.quantity + quantity, 99) } : item
              )
            };
          }

          return { items: [...state.items, { ...product, quantity }] };
        });
      },
      update(productId, quantity) {
        set((state) => ({
          items: state.items
            .map((item) => (item.id === productId ? { ...item, quantity: Math.max(1, Math.min(quantity, 99)) } : item))
            .filter((item) => item.quantity > 0)
        }));
      },
      remove(productId) {
        set((state) => ({ items: state.items.filter((item) => item.id !== productId) }));
      },
      clear() {
        set({ items: [] });
      }
    }),
    {
      name: "bespoke-cart-v1"
    }
  )
);
