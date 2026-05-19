import { useState, useEffect, useCallback } from "react";
import { Camera, Pencil } from "lucide-react";
import { MainDashboard } from "./components/MainDashboard";
import { UploadOverlay } from "./components/UploadOverlay";
import { OKRDrawer } from "./components/OKRDrawer";
import { TransactionEditCard } from "./components/TransactionEditCard";
import { BatchReview } from "./components/BatchReview";
import { ManualEntryCard } from "./components/ManualEntryCard";
import type { ParsedReceiptDTO } from "../api/client";
import {
  Transaction,
  Budget,
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  fetchBudget,
  updateBudget,
  parseReceipt,
  parseReceipts,
} from "../api/client";

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "parsing" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState("");

  const [showOKRDrawer, setShowOKRDrawer] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ── Batch review state ──
  const [batchResults, setBatchResults] = useState<ParsedReceiptDTO[]>([]);
  const [batchErrors, setBatchErrors] = useState<string[]>([]);
  const [showBatchReview, setShowBatchReview] = useState(false);

  // ── Manual entry state ──
  const [showManualEntry, setShowManualEntry] = useState(false);

  // ── Data loading ──

  const loadData = useCallback(async (month: string) => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [txns, bgt] = await Promise.all([
        fetchTransactions(month),
        fetchBudget(month),
      ]);
      setTransactions(txns);
      setBudget(bgt);
    } catch {
      setLoadError("数据加载失败，请检查网络后重试");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedMonth);
  }, [selectedMonth, loadData]);

  // ── Upload ──

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus("uploading");
    setUploadError("");
    setUploadProgress(10);

    try {
      // Convert all files to base64
      const total = files.length;
      const images: string[] = [];

      for (let i = 0; i < total; i++) {
        images.push(await fileToBase64(files[i]));
        setUploadProgress(10 + Math.round((i / total) * 20));
      }

      setUploadStatus("parsing");
      setUploadProgress(40);

      let result;
      if (images.length === 1) {
        result = await parseReceipt(images[0]);
      } else {
        result = await parseReceipts(images);
      }

      const { transactions: parsed, errors } = result;

      setUploadProgress(100);

      if (parsed.length === 1) {
        // Single result — auto-save without review
        const t = parsed[0];
        const saved = await createTransaction({
          category: t.category,
          merchant: t.merchant,
          amount: t.amount,
          date: t.date,
          month: t.date.slice(0, 7),
        });
        setTransactions((prev) => [saved, ...prev]);
        setUploadStatus("success");
        setTimeout(() => {
          setIsUploading(false);
          setUploadStatus("idle");
        }, 2500);
      } else {
        // Multiple results — open batch review
        setIsUploading(false);
        setUploadStatus("idle");
        setShowBatchReview(true);
      }

      setBatchResults(parsed);
      setBatchErrors(errors || []);
    } catch (err: any) {
      setUploadStatus("error");
      setUploadError(err?.message || "识别失败，请重试");
      setTimeout(() => {
        setIsUploading(false);
        setUploadStatus("idle");
        setUploadProgress(0);
        setUploadError("");
      }, 4000);
    }
  };

  const handleBatchSave = async (items: ParsedReceiptDTO[]) => {
    try {
      for (const item of items) {
        const saved = await createTransaction({
          category: item.category,
          merchant: item.merchant,
          amount: item.amount,
          date: item.date,
          month: item.date.slice(0, 7),
        });
        setTransactions((prev) => [saved, ...prev]);
      }
      setShowBatchReview(false);
      setBatchResults([]);
      setBatchErrors([]);
    } catch {
      setLoadError("批量保存失败");
    }
  };

  const handleBatchCancel = () => {
    setShowBatchReview(false);
    setBatchResults([]);
    setBatchErrors([]);
  };

  const handleManualSave = async (data: {
    category: string;
    merchant: string;
    amount: number;
    date: string;
  }) => {
    try {
      const saved = await createTransaction({
        ...data,
        month: data.date.slice(0, 7),
      });
      setTransactions((prev) => [saved, ...prev]);
      setShowManualEntry(false);
    } catch {
      setLoadError("保存失败，请重试");
    }
  };

  // ── CRUD ──

  const handleDeleteTransaction = async (id: number) => {
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setLoadError("删除失败，请重试");
    }
  };

  const handleEditTransaction = (txn: Transaction) => {
    setEditingTransaction(txn);
  };

  const handleSaveTransaction = async (updated: Transaction) => {
    try {
      const saved = await updateTransaction(updated.id, {
        category: updated.category,
        merchant: updated.merchant,
        amount: updated.amount,
        date: updated.date,
        month: updated.month,
      });
      setTransactions((prev) =>
        prev.map((t) => (t.id === saved.id ? saved : t))
      );
    } catch {
      setLoadError("保存失败，请重试");
    }
  };

  const handleUpdateBudget = async (newBudget: Budget) => {
    try {
      const saved = await updateBudget(selectedMonth, {
        monthlyBudget: newBudget.monthlyBudget,
        categories: newBudget.categories,
      });
      setBudget(saved);
    } catch {
      setLoadError("预算保存失败");
    }
  };

  // ── Helpers ──

  const dismissError = () => setLoadError("");

  return (
    <div className="w-full min-h-screen bg-white dark:bg-black text-black dark:text-white relative overflow-hidden">
      {/* Top Progress Bar */}
      {isUploading && uploadProgress < 100 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-50">
          <div
            className="h-full bg-black dark:bg-white transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Success Toast */}
      {uploadStatus === "success" && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 text-sm z-50">
          [录入成功]
        </div>
      )}

      {/* Error Toast */}
      {(loadError || uploadError) && (
        <button
          onClick={uploadError ? undefined : dismissError}
          className="fixed top-4 left-1/2 -translate-x-1/2 bg-[#FF3B30] text-white px-6 py-3 text-sm z-50 cursor-pointer"
        >
          {uploadError || loadError}
        </button>
      )}

      {/* Main Content */}
      <div className="relative z-10">
        <MainDashboard
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          transactions={transactions}
          onDeleteTransaction={handleDeleteTransaction}
          onEditTransaction={handleEditTransaction}
          onShowOKR={() => setShowOKRDrawer(true)}
          budget={budget}
          isLoading={isLoading}
          error={loadError}
          onRetry={() => loadData(selectedMonth)}
        />
      </div>

      {/* FAB */}
      {!isUploading && !showBatchReview && !showManualEntry && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
          <button
            onClick={() => setShowManualEntry(true)}
            className="w-14 h-14 bg-white dark:bg-black border border-black/20 dark:border-white/20 flex items-center justify-center"
          >
            <Pencil className="w-5 h-5 text-black dark:text-white" />
          </button>

          <label className="w-14 h-14 bg-black dark:bg-white flex items-center justify-center cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Camera className="w-6 h-6 text-white dark:text-black" />
          </label>
        </div>
      )}

      {/* Loading FAB */}
      {isUploading && (
        <div className="fixed bottom-6 right-6 w-14 h-14 bg-black dark:bg-white flex items-center justify-center z-40">
          <div className="w-6 h-6 border-2 border-white dark:border-black border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* OKR Drawer */}
      <OKRDrawer
        isOpen={showOKRDrawer}
        onClose={() => setShowOKRDrawer(false)}
        budget={budget}
        onUpdateBudget={handleUpdateBudget}
        selectedMonth={selectedMonth}
      />

      {/* Upload Overlay */}
      <UploadOverlay isVisible={isUploading} status={uploadStatus} />

      {/* Batch Review */}
      {showBatchReview && (
        <BatchReview
          transactions={batchResults}
          errors={batchErrors}
          onSave={handleBatchSave}
          onClose={handleBatchCancel}
        />
      )}

      {/* Manual Entry */}
      {showManualEntry && (
        <ManualEntryCard
          onSave={handleManualSave}
          onClose={() => setShowManualEntry(false)}
        />
      )}

      {/* Transaction Edit Card */}
      <TransactionEditCard
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
      />
    </div>
  );
}
