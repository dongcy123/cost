import { useMemo } from "react";
import { Terminal } from "lucide-react";
import { MonthSelector } from "./MonthSelector";

interface Transaction {
  id: number;
  category: string;
  merchant: string;
  amount: number;
  date: string;
  month: string;
}

interface Budget {
  month: string;
  monthlyBudget: number;
  categories: Record<string, number>;
}

interface MainDashboardProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  transactions: Transaction[];
  onDeleteTransaction: (id: number) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onShowCharts: () => void;
  onShowOKR: () => void;
  budget: Budget | null;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
}

export function MainDashboard({
  selectedMonth,
  setSelectedMonth,
  transactions,
  onDeleteTransaction,
  onEditTransaction,
  onShowCharts,
  onShowOKR,
  budget,
  isLoading,
  error,
  onRetry,
}: MainDashboardProps) {
  const currentTotal = useMemo(() => {
    return transactions
      .filter((t) => t.month === selectedMonth)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions, selectedMonth]);

  const previousMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  }, [selectedMonth]);

  const previousTotal = useMemo(() => {
    return transactions
      .filter((t) => t.month === previousMonth)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions, previousMonth]);

  const percentageChange = useMemo(() => {
    if (previousTotal === 0) return 0;
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }, [currentTotal, previousTotal]);

  const monthlyBudget = budget?.monthlyBudget || 0;

  const budgetDeviation = useMemo(() => {
    if (monthlyBudget === 0) return 0;
    return ((currentTotal - monthlyBudget) / monthlyBudget) * 100;
  }, [currentTotal, monthlyBudget]);

  const auditMessage = useMemo(() => {
    if (monthlyBudget === 0) {
      return '[提示] 尚未设置预算，点击右上角 ⚙️ 规则 设置月度预算';
    }
    if (budgetDeviation > 10) {
      return `[警告] 本月支出已超预算 ${budgetDeviation.toFixed(1)}%，建议控制餐饮和购物类支出`;
    } else if (budgetDeviation > 0) {
      return `[提示] 本月支出超预算 ${budgetDeviation.toFixed(1)}%，请注意控制`;
    } else {
      return `[正常] 预算执行良好，当前进度 ${monthlyBudget > 0 ? (currentTotal / monthlyBudget * 100).toFixed(1) : "0.0"}%`;
    }
  }, [budgetDeviation, currentTotal, monthlyBudget]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => t.month === selectedMonth);
  }, [transactions, selectedMonth]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="w-full min-h-screen">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <div className="h-5 w-20 bg-[#F2F2F7] dark:bg-[#1C1C1E] animate-pulse" />
          <div className="h-5 w-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] animate-pulse" />
        </div>
        <div className="px-6 py-12 text-center">
          <div className="h-10 w-32 bg-[#F2F2F7] dark:bg-[#1C1C1E] animate-pulse mx-auto mb-4" />
          <div className="h-4 w-16 bg-[#F2F2F7] dark:bg-[#1C1C1E] animate-pulse mx-auto" />
        </div>
        <div className="px-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 bg-[#F2F2F7] dark:bg-[#1C1C1E] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error && transactions.length === 0) {
    return (
      <div className="w-full min-h-screen">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <MonthSelector selectedMonth={selectedMonth} onSelect={setSelectedMonth} />
          <button className="text-sm text-[#8E8E93]" onClick={onShowOKR}>
            ⚙️ 规则
          </button>
        </div>
        <div className="px-6 py-20 text-center">
          <div className="text-[#8E8E93] text-sm mb-4">{error}</div>
          <button
            onClick={onRetry}
            className="border border-black dark:border-white px-6 py-2 text-sm hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
        <MonthSelector selectedMonth={selectedMonth} onSelect={setSelectedMonth} />
        <button className="text-sm text-[#8E8E93]" onClick={onShowOKR}>
          ⚙️ 规则
        </button>
      </div>

      {/* Core Number */}
      <div className="px-6 py-12 text-center">
        <div className="font-mono text-4xl font-bold mb-2">
          {currentTotal.toFixed(2)}
        </div>
        <div
          className={`text-xs font-mono ${percentageChange >= 0 ? "text-[#FF3B30]" : "text-[#8E8E93]"}`}
        >
          {percentageChange >= 0 ? "↑" : "↓"}{" "}
          {Math.abs(percentageChange).toFixed(1)}%
        </div>
      </div>

      {/* Audit Console */}
      <div className="mx-6 mb-6 bg-[#F2F2F7] dark:bg-[#1C1C1E] px-4 py-3 flex items-start gap-3">
        <Terminal className="w-4 h-4 text-[#8E8E93] mt-0.5 flex-shrink-0" />
        <div className="text-sm text-[#8E8E93] flex-1">{auditMessage}</div>
      </div>

      {/* Charts Tab */}
      <div className="px-6 mb-4">
        <div className="flex gap-6 border-b border-black/10 dark:border-white/10">
          <button className="pb-2 text-sm relative" onClick={onShowCharts}>
            趋势
          </button>
          <button className="pb-2 text-sm relative" onClick={onShowCharts}>
            结构
          </button>
        </div>
      </div>

      {/* Transaction List / Empty */}
      {filteredTransactions.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="text-sm text-[#8E8E93]">
            暂无记录
          </div>
          <div className="text-xs text-[#8E8E93] mt-1">
            点击右下角按钮拍摄你的第一张小票
          </div>
        </div>
      ) : (
        <div className="pb-20">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="h-14 px-6 flex items-center justify-between border-b border-black/5 dark:border-white/5 cursor-pointer hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] transition-colors"
              onClick={() => onEditTransaction(transaction)}
            >
              <div className="flex flex-col">
                <div className="text-sm">{transaction.category}</div>
                <div className="text-xs text-[#8E8E93]">
                  {transaction.merchant}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="font-mono text-base">
                  {Number(transaction.amount).toFixed(2)}
                </div>
                <div className="text-xs text-[#8E8E93]">
                  {transaction.date.slice(5, 16)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
