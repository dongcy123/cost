import { useState, useEffect, useCallback } from "react";
import { Camera } from "lucide-react";
import { MainDashboard } from "./components/MainDashboard";
import { UploadOverlay } from "./components/UploadOverlay";
import { ChartsView } from "./components/ChartsView";
import { OKRDrawer } from "./components/OKRDrawer";
import { TransactionEditCard } from "./components/TransactionEditCard";
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

  const [showCharts, setShowCharts] = useState(false);
  const [showOKRDrawer, setShowOKRDrawer] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("uploading");
    setUploadError("");
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 15, 60));
    }, 200);

    try {
      const base64 = await fileToBase64(file);
      setUploadProgress(70);
      setUploadStatus("parsing");

      // Backend: Baidu OCR → DeepSeek LLM
      const result = await parseReceipt(base64);

      const dto = {
        category: result.category,
        merchant: result.merchant,
        amount: result.amount,
        date: result.date,
        month: selectedMonth,
      };

      const saved = await createTransaction(dto);
      setTransactions((prev) => [saved, ...prev]);
      setUploadProgress(100);
      setUploadStatus("success");

      setTimeout(() => {
        setIsUploading(false);
        setUploadStatus("idle");
        setUploadProgress(0);
      }, 2500);
    } catch (err: any) {
      clearInterval(progressInterval);
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
        {!showCharts ? (
          <MainDashboard
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
            onShowCharts={() => setShowCharts(true)}
            onShowOKR={() => setShowOKRDrawer(true)}
            budget={budget}
            isLoading={isLoading}
            error={loadError}
            onRetry={() => loadData(selectedMonth)}
          />
        ) : (
          <ChartsView
            transactions={transactions}
            selectedMonth={selectedMonth}
            onBack={() => setShowCharts(false)}
            onEditTransaction={handleEditTransaction}
          />
        )}
      </div>

      {/* FAB */}
      {!isUploading && (
        <label className="fixed bottom-6 right-6 w-14 h-14 bg-black dark:bg-white flex items-center justify-center cursor-pointer z-40">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Camera className="w-6 h-6 text-white dark:text-black" />
        </label>
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
