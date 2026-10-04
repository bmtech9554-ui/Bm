import { useEffect, useState } from "react";
import {
  fetchWalletSummary,
  fetchWalletTransactions,
  WalletConfigurationError,
  type WalletSummary,
  type WalletTransaction,
} from "../services/wallet";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "empty" }
  | { status: "error"; message: string };

function walletErrorMessage(error: unknown): string {
  return error instanceof WalletConfigurationError
    ? "Wallet data is not connected yet."
    : "Wallet data could not be loaded. Please try again later.";
}

export function useWalletSummary(): LoadState<WalletSummary> {
  const [state, setState] = useState<LoadState<WalletSummary>>({
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();

    fetchWalletSummary(controller.signal)
      .then((summary) => setState({ status: "ready", data: summary }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: walletErrorMessage(error) });
      });

    return () => controller.abort();
  }, []);

  return state;
}

export function useWalletTransactions(): LoadState<WalletTransaction[]> {
  const [state, setState] = useState<LoadState<WalletTransaction[]>>({
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();

    fetchWalletTransactions(controller.signal)
      .then((transactions) =>
        setState(
          transactions.length > 0
            ? { status: "ready", data: transactions }
            : { status: "empty" },
        ),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: walletErrorMessage(error) });
      });

    return () => controller.abort();
  }, []);

  return state;
}
