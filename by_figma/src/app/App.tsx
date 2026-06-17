import { useState, useEffect, useCallback } from "react";
import {
  Camera,
  Pencil,
  Plus,
  Home,
  PieChart,
  Wallet,
  Ellipsis,
} from "lucide-react";
import { MainDashboard } from "./components/MainDashboard";
import { StatsView } from "./components/StatsView";
import { UploadOverlay } from "./components/UploadOverlay";
import { OKRDrawer } from "./components/OKRDrawer";
import { TransactionEditCard } from "./components/TransactionEditCard";
import { BatchReview } from "./components/BatchReview";
import { ManualEntryCard } from "./components/ManualEntryCard";
import { LoginScreen } from "./components/LoginScreen";
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
  dedupeTransactions,
  getAuthToken,
  verifyToken,
  clearAuthToken,
} from "../api/client";

export default function App() {
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setAuthState("unauthenticated");
        return;
      }
      const valid = await verifyToken();
      if (valid) {
        setAuthState("authenticated");
      } else {
        clearAuthToken();
        setAuthState("unauthenticated");
      }
    };
    checkAuth();
  }, []);

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
  const [previousTransactions, setPreviousTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ── Batch review state ──
  const [batchResults, setBatchResults] = useState<ParsedReceiptDTO[]>([]);
  const [batchErrors, setBatchErrors] = useState<string[]>([]);
  const [showBatchReview, setShowBatchReview] = useState(false);
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  // ── Manual entry state ──
  const [showManualEntry, setShowManualEntry] = useState(false);

  // ── View routing ──
  const [currentView, setCurrentView] = useState<"home" | "stats">("home");

  // ── FAB menu ──
  const [showFabMenu, setShowFabMenu] = useState(false);

  // ── Data loading ──

  const loadData = useCallback(async (month: string) => {
    setIsLoading(true);
    setLoadError("");
    try {
      // Compute previous month for comparison data
      const [year, monthNum] = month.split("-").map(Number);
      const prevDate = new Date(year, monthNum - 2, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

      const [txns, prevTxns, bgt] = await Promise.all([
        fetchTransactions(month),
        fetchTransactions(prevMonth),
        fetchBudget(month),
      ]);
      setTransactions(txns);
      setPreviousTransactions(prevTxns);
      setBudget(bgt);
    } catch {
      setLoadError("数据加载失败，请检查网络后重试");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authState !== "authenticated") return;
    loadData(selectedMonth);
  }, [selectedMonth, loadData, authState]);

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
    // Close modal immediately, show saving indicator
    setShowBatchReview(false);
    setBatchResults([]);
    setBatchErrors([]);
    setIsBatchSaving(true);

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
    } catch {
      setLoadError("批量保存失败");
    } finally {
      setIsBatchSaving(false);
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

  // ── Dedupe toast state ──
  const [dedupeToast, setDedupeToast] = useState("");

  // ── Dedupe ──

  const handleDedupe = async () => {
    try {
      const result = await dedupeTransactions();
      if (result.deleted > 0) {
        await loadData(selectedMonth);
      }
      setDedupeToast(`去重完成，已删除 ${result.deleted} 条重复记录`);
      setTimeout(() => setDedupeToast(""), 3000);
    } catch {
      setLoadError("去重失败，请重试");
    }
  };

  // ── Helpers ──

  const dismissError = () => setLoadError("");

  if (authState === "loading") {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <LoginScreen onAuthenticated={() => setAuthState("authenticated")} />;
  }

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

      {/* Dedupe Toast */}
      {dedupeToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 text-sm z-50">
          {dedupeToast}
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
        {currentView === "home" ? (
          <MainDashboard
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
            onShowCharts={() => setCurrentView("stats")}
            onShowOKR={() => setShowOKRDrawer(true)}
            onDedupe={handleDedupe}
            budget={budget}
            isLoading={isLoading}
            isBatchSaving={isBatchSaving}
            error={loadError}
            onRetry={() => loadData(selectedMonth)}
          />
        ) : (
          <StatsView
            transactions={[...transactions, ...previousTransactions]}
            selectedMonth={selectedMonth}
            budget={budget}
            onBack={() => setCurrentView("home")}
          />
        )}
      </div>

      {/* ═══ Bottom Navigation Bar + FAB ═══ */}
      {!showBatchReview && !showManualEntry && (
        <>
          {/* FAB Menu Overlay */}
          {showFabMenu && (
            <>
              <div
                className="fixed inset-0 bg-black/20 z-40 transition-opacity"
                onClick={() => setShowFabMenu(false)}
              />
              <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2" style={{ animation: "fabMenuIn 0.2s ease-out" }}>
                {/* Camera Upload */}
                <label className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3.5 shadow-lg cursor-pointer active:bg-[#F7F8FA] transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                    <Camera className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-[#1A1A1A]">拍照录入</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      setShowFabMenu(false);
                      handleFileSelect(e);
                    }}
                  />
                </label>
                {/* Manual Entry */}
                <button
                  className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3.5 shadow-lg active:bg-[#F7F8FA] transition-colors"
                  onClick={() => {
                    setShowFabMenu(false);
                    setShowManualEntry(true);
                  }}
                >
                  <div className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                    <Pencil className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-[#1A1A1A]">手动录入</span>
                </button>
              </div>
            </>
          )}

          {/* Bottom Nav Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F2F2F7] z-30 pb-1">
            <div className="flex items-end justify-around px-2 pt-2 pb-1 relative max-w-lg mx-auto">
              {/* Home */}
              <button
                className="flex flex-col items-center gap-0.5 py-1 px-3"
                onClick={() => setCurrentView("home")}
              >
                <Home className={`w-5 h-5 ${currentView === "home" ? "text-[#1A1A1A]" : "text-[#8E8E93]"}`} />
                <span className={`text-[10px] ${currentView === "home" ? "text-[#1A1A1A] font-medium" : "text-[#8E8E93]"}`}>首页</span>
              </button>

              {/* Charts */}
              <button
                className="flex flex-col items-center gap-0.5 py-1 px-3"
                onClick={() => setCurrentView("stats")}
              >
                <PieChart className={`w-5 h-5 ${currentView === "stats" ? "text-[#1A1A1A]" : "text-[#8E8E93]"}`} />
                <span className={`text-[10px] ${currentView === "stats" ? "text-[#1A1A1A] font-medium" : "text-[#8E8E93]"}`}>统计</span>
              </button>

              {/* FAB */}
              <div className="relative -mt-3">
                <button
                  onClick={() => setShowFabMenu(!showFabMenu)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(244,208,63,0.4)] transition-all active:scale-95 ${
                    showFabMenu
                      ? "bg-[#1A1A1A] rotate-45"
                      : "bg-[#F4D03F]"
                  }`}
                >
                  <Plus className={`w-7 h-7 transition-colors ${
                    showFabMenu ? "text-white" : "text-[#1A1A1A]"
                  }`} />
                </button>
              </div>

              {/* Budget */}
              <button
                className="flex flex-col items-center gap-0.5 py-1 px-3"
                onClick={() => setShowOKRDrawer(true)}
              >
                <Wallet className="w-5 h-5 text-[#8E8E93]" />
                <span className="text-[10px] text-[#8E8E93]">预算</span>
              </button>

              {/* More */}
              <button
                className="flex flex-col items-center gap-0.5 py-1 px-3"
                onClick={handleDedupe}
              >
                <Ellipsis className="w-5 h-5 text-[#8E8E93]" />
                <span className="text-[10px] text-[#8E8E93]">更多</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Loading FAB */}
      {isUploading && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
          <div className="w-14 h-14 rounded-full bg-[#F4D03F] flex items-center justify-center shadow-[0_4px_16px_rgba(244,208,63,0.4)]">
            <div className="w-6 h-6 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
          </div>
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

      <style>{`
        @keyframes fabMenuIn {
          from {
            opacity: 0;
            transform: translate(-50%, 12px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}
