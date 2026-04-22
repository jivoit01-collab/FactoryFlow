import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  BoxFilters,
  BoxTransferPayload,
  BulkPrintItem,
  CreatePalletPayload,
  DismantleBoxPayload,
  DismantlePalletPayload,
  GenerateBoxesPayload,
  LooseStockFilters,
  PalletAddBoxesPayload,
  PalletClearPayload,
  PalletFilters,
  PalletMovePayload,
  PalletRemoveBoxesPayload,
  PalletSplitPayload,
  PrintHistoryFilters,
  PrintRequestPayload,
  RepackPayload,
  ScanRequestPayload,
  VoidPayload,
} from '../types';
import { barcodeApi } from './barcode.api';

// ============================================================================
// Query Keys
// ============================================================================

export const BARCODE_QUERY_KEYS = {
  all: ['barcode'] as const,
  boxes: (filters?: BoxFilters) => [...BARCODE_QUERY_KEYS.all, 'boxes', filters] as const,
  boxDetail: (id: number) => [...BARCODE_QUERY_KEYS.all, 'box', id] as const,
  pallets: (filters?: PalletFilters) => [...BARCODE_QUERY_KEYS.all, 'pallets', filters] as const,
  palletDetail: (id: number) => [...BARCODE_QUERY_KEYS.all, 'pallet', id] as const,
  printHistory: (filters?: PrintHistoryFilters) => [...BARCODE_QUERY_KEYS.all, 'print-history', filters] as const,
  looseStock: (filters?: LooseStockFilters) => [...BARCODE_QUERY_KEYS.all, 'loose', filters] as const,
  looseStockDetail: (id: number) => [...BARCODE_QUERY_KEYS.all, 'loose', id] as const,
};

// ============================================================================
// Box Queries
// ============================================================================

export function useBoxes(filters?: BoxFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.boxes(filters),
    queryFn: () => barcodeApi.getBoxes(filters),
  });
}

export function useBoxDetail(boxId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.boxDetail(boxId!),
    queryFn: () => barcodeApi.getBoxDetail(boxId!),
    enabled: boxId !== null,
  });
}

// ============================================================================
// Box Mutations
// ============================================================================

export function useGenerateBoxes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateBoxesPayload) => barcodeApi.generateBoxes(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useVoidBox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boxId, data }: { boxId: number; data?: VoidPayload }) =>
      barcodeApi.voidBox(boxId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

// ============================================================================
// Pallet Queries
// ============================================================================

export function usePallets(filters?: PalletFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.pallets(filters),
    queryFn: () => barcodeApi.getPallets(filters),
  });
}

export function usePalletDetail(palletId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.palletDetail(palletId!),
    queryFn: () => barcodeApi.getPalletDetail(palletId!),
    enabled: palletId !== null,
  });
}

// ============================================================================
// Pallet Mutations
// ============================================================================

export function useCreatePallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePalletPayload) => barcodeApi.createPallet(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useVoidPallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data?: VoidPayload }) =>
      barcodeApi.voidPallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useMovePallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data: PalletMovePayload }) =>
      barcodeApi.movePallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useClearPallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data?: PalletClearPayload }) =>
      barcodeApi.clearPallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useSplitPallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data: PalletSplitPayload }) =>
      barcodeApi.splitPallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useAddBoxesToPallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data: PalletAddBoxesPayload }) =>
      barcodeApi.addBoxesToPallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useRemoveBoxesFromPallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data: PalletRemoveBoxesPayload }) =>
      barcodeApi.removeBoxesFromPallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useTransferBoxes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BoxTransferPayload) => barcodeApi.transferBoxes(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

// ============================================================================
// Print Queries & Mutations
// ============================================================================

export function usePrintHistory(filters?: PrintHistoryFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.printHistory(filters),
    queryFn: () => barcodeApi.getPrintHistory(filters),
  });
}

export function usePrintBoxLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boxId, data }: { boxId: number; data?: PrintRequestPayload }) =>
      barcodeApi.printBoxLabel(boxId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.printHistory() });
    },
  });
}

export function usePrintPalletLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data?: PrintRequestPayload }) =>
      barcodeApi.printPalletLabel(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.printHistory() });
    },
  });
}

export function usePrintBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkPrintItem[]) => barcodeApi.printBulk(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.printHistory() });
    },
  });
}

// ============================================================================
// Dismantle & Repack
// ============================================================================

export function useDismantlePallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ palletId, data }: { palletId: number; data: DismantlePalletPayload }) =>
      barcodeApi.dismantlePallet(palletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useDismantleBox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boxId, data }: { boxId: number; data: DismantleBoxPayload }) =>
      barcodeApi.dismantleBox(boxId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

export function useRepack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RepackPayload) => barcodeApi.repack(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
    },
  });
}

// ============================================================================
// Loose Stock
// ============================================================================

export function useLooseStock(filters?: LooseStockFilters) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.looseStock(filters),
    queryFn: () => barcodeApi.getLooseStock(filters),
  });
}

export function useLooseStockDetail(looseId: number | null) {
  return useQuery({
    queryKey: BARCODE_QUERY_KEYS.looseStockDetail(looseId!),
    queryFn: () => barcodeApi.getLooseStockDetail(looseId!),
    enabled: looseId !== null,
  });
}

// ============================================================================
// Scan
// ============================================================================

export function useProcessScan() {
  return useMutation({
    mutationFn: (data: ScanRequestPayload) => barcodeApi.processScan(data),
  });
}

export function useBarcodeLookup(barcode: string | null) {
  return useQuery({
    queryKey: [...BARCODE_QUERY_KEYS.all, 'lookup', barcode] as const,
    queryFn: () => barcodeApi.lookupBarcode(barcode!),
    enabled: !!barcode,
  });
}
