import { create } from "zustand";

interface PagoSelectionState {
  selectedIds: number[];
  toggle: (id: number) => void;
  selectAll: (ids: number[]) => void;
  clear: () => void;
}

export const usePagoSelection = create<PagoSelectionState>((set) => ({
  selectedIds: [],
  toggle: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  selectAll: (ids) => set({ selectedIds: ids }),
  clear: () => set({ selectedIds: [] }),
}));
