import { useState, useMemo } from "react";
import {
  Terminal,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Gamepad2,
  Home,
  Heart,
  BookOpen,
  Phone,
  HelpCircle,
  ReceiptText,
  Target,
  Briefcase,
  DollarSign,
  Ellipsis,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { MonthSelector } from "./MonthSelector";

// ── Types ──

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
  onDedupe?: () => void;
  budget: Budget | null;
  isLoading: boolean;
  isBatchSaving?: boolean;
  error: string;
  onRetry: () => void;
}

// ── Constants ──

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "餐饮": UtensilsCrossed,
  "交通": Car,
  "购物": ShoppingBag,
  "娱乐": Gamepad2,
  "住房": Home,
  "医疗": Heart,
  "教育": BookOpen,
  "通讯": Phone,
};

const QUICK_ACTIONS = [
  { icon: ReceiptText, label: "账单" },
  { icon: Target, label: "预算" },
  { icon: Briefcase, label: "资产" },
  { icon: DollarSign, label: "返现" },
  { icon: Ellipsis, label: "更多" },
];

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const FILTER_OPTIONS = [
  { key: "all", label: "全部" },
  { key: "income", label: "收入" },
  { key: "expense", label: "支出" },
] as const;

// ── Helpers ──

function getCategoryIcon(category: string) {
  const Icon = CATEGORY_ICON_MAP[category] || HelpCircle;
  return Icon;
}

function formatDateToChinese(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const weekday = WEEKDAYS[d.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

// ── Component ──

export function MainDashboard({
  selectedMonth,
  setSelectedMonth,
  transactions,
  onEditTransaction,
  onShowOKR,
  onDedupe,
  budget,
  isLoading,
  isBatchSaving,
  error,
  onRetry,
}: MainDashboardProps) {
  const [txnFilter, setTxnFilter] = useState<"all" | "income" | "expense">("all");

  // ── Computations (unchanged core logic) ──

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
      return "尚未设置预算，点击右上角 ⚙️ 规则 设置月度预算";
    }
    if (budgetDeviation > 10) {
      return `本月支出已超预算 ${budgetDeviation.toFixed(1)}%，建议控制餐饮和购物类支出`;
    } else if (budgetDeviation > 0) {
      return `本月支出超预算 ${budgetDeviation.toFixed(1)}%，请注意控制`;
    } else {
      return `预算执行良好，当前进度 ${
        monthlyBudget > 0 ? ((currentTotal / monthlyBudget) * 100).toFixed(1) : "0.0"
      }%`;
    }
  }, [budgetDeviation, currentTotal, monthlyBudget]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => t.month === selectedMonth);
  }, [transactions, selectedMonth]);

  // Type-filtered transactions for the list
  const displayedTransactions = useMemo(() => {
    if (txnFilter === "all") return filteredTransactions;
    if (txnFilter === "income") return []; // No income type yet
    return filteredTransactions; // All are expenses for now
  }, [filteredTransactions, txnFilter]);

  const dateGroups = useMemo(() => {
    const groups: Map<string, Transaction[]> = new Map();
    for (const t of displayedTransactions) {
      const day = t.date.slice(0, 10);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(t);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [displayedTransactions]);

  // Daily summary for each date group
  const dateSummaries = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of displayedTransactions) {
      const day = t.date.slice(0, 10);
      if (!map.has(day)) map.set(day, { income: 0, expense: 0 });
      const s = map.get(day)!;
      // All current transactions are expenses
      s.expense += Number(t.amount);
    }
    return map;
  }, [displayedTransactions]);

  // ── Loading skeleton ──

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#F7F8FA]">
        <div className="bg-gradient-to-b from-[#F4D03F] to-[#F7D94E] pt-4 pb-16 rounded-b-[2.5rem]">
          <div className="flex items-center justify-between px-6">
            <div className="h-5 w-20 bg-white/40 animate-pulse rounded" />
            <div className="h-5 w-14 bg-white/40 animate-pulse rounded" />
          </div>
        </div>
        <div className="px-4 -mt-12 relative z-10">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="h-4 w-16 bg-[#F2F2F7] animate-pulse mb-3 rounded" />
            <div className="h-8 w-32 bg-[#F2F2F7] animate-pulse mb-3 rounded" />
            <div className="h-3 w-20 bg-[#F2F2F7] animate-pulse rounded" />
          </div>
        </div>
        <div className="px-6 mt-6">
          <div className="flex justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-[#F2F2F7] animate-pulse" />
                <div className="h-3 w-8 bg-[#F2F2F7] animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="mx-4 mt-6 h-64 bg-white rounded-2xl animate-pulse" />
      </div>
    );
  }

  // ── Error state ──

  if (error && transactions.length === 0) {
    return (
      <div className="w-full min-h-screen bg-[#F7F8FA]">
        <div className="bg-gradient-to-b from-[#F4D03F] to-[#F7D94E] pt-4 pb-16 rounded-b-[2.5rem]">
          <div className="flex items-center justify-between px-6">
            <MonthSelector
              selectedMonth={selectedMonth}
              onSelect={setSelectedMonth}
              className="text-[#1A1A1A]/70"
            />
            <div className="flex items-center gap-3">
              {onDedupe && (
                <button className="text-sm text-[#1A1A1A]/60" onClick={onDedupe}>
                  去重
                </button>
              )}
              <button className="text-sm text-[#1A1A1A]/60" onClick={onShowOKR}>
                ⚙️ 规则
              </button>
            </div>
          </div>
        </div>
        <div className="px-6 py-20 text-center">
          <div className="text-[#8E8E93] text-sm mb-4">{error}</div>
          <button
            onClick={onRetry}
            className="bg-[#F4D03F] text-[#1A1A1A] px-8 py-3 rounded-xl text-sm font-medium hover:bg-[#E8C439] transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // ── Main Render ──

  return (
    <div className="w-full min-h-screen bg-[#F7F8FA]">
      {/* ═══ Yellow Header ═══ */}
      <div className="bg-gradient-to-b from-[#F4D03F] to-[#F7D94E] pt-4 pb-16 rounded-b-[2.5rem]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6">
          <MonthSelector selectedMonth={selectedMonth} onSelect={setSelectedMonth} />
          <div className="flex items-center gap-3">
            {onDedupe && (
              <button
                className="text-sm text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
                onClick={onDedupe}
              >
                去重
              </button>
            )}
            <button
              className="text-sm text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
              onClick={onShowOKR}
            >
              ⚙️ 规则
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Overview Card (floating over header) ═══ */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6">
          {/* Total Expense */}
          <div className="text-sm text-[#8E8E93] mb-1 font-medium">
            总支出
          </div>
          <div className="text-[2rem] font-bold text-[#1A1A1A] leading-tight mb-1 tracking-tight">
            {currentTotal.toFixed(2)}
          </div>

          {/* Month-over-month change */}
          <div className="flex items-center gap-1.5 mb-5">
            {percentageChange !== 0 && (
              <span
                className={`text-xs font-medium ${
                  percentageChange > 0 ? "text-[#E8A030]" : "text-[#34C759]"
                }`}
              >
                {percentageChange > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 inline" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 inline" />
                )}{" "}
                {Math.abs(percentageChange).toFixed(1)}%
              </span>
            )}
            <span className="text-xs text-[#8E8E93]">较上月</span>
          </div>

          {/* Income / Balance sub-metrics */}
          <div className="flex items-center gap-5 pt-4 border-t border-[#F2F2F7]">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet className="w-3.5 h-3.5 text-[#8E8E93]" />
                <span className="text-xs text-[#8E8E93]">收入</span>
              </div>
              <div className="text-sm font-semibold text-[#1A1A1A]">
                0.00
              </div>
            </div>
            <div className="w-px h-8 bg-[#F2F2F7]" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs text-[#8E8E93]">余额</span>
              </div>
              <div className="text-sm font-semibold text-[#1A1A1A]">
                {monthlyBudget > 0
                  ? (monthlyBudget - currentTotal).toFixed(2)
                  : (-currentTotal).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Quick Actions ═══ */}
      <div className="px-6 mt-6">
        <div className="flex justify-between">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-center group-active:scale-95 transition-transform">
                <action.icon className="w-5 h-5 text-[#1A1A1A]" />
              </div>
              <span className="text-[11px] text-[#8E8E93]">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Audit Message ═══ */}
      <div className="mx-4 mt-5 bg-[#FFF9E6] border border-[#F4D03F]/20 rounded-xl px-4 py-3 flex items-start gap-3">
        <Terminal className="w-4 h-4 text-[#F4D03F] mt-0.5 flex-shrink-0" />
        <div className="text-sm text-[#8E8E93] flex-1 leading-relaxed">{auditMessage}</div>
      </div>

      {/* ═══ Transaction Filters ═══ */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-[#1A1A1A]">交易记录</h3>
        </div>
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTxnFilter(opt.key)}
              className={`px-5 py-2 text-sm rounded-full font-medium transition-all ${
                txnFilter === opt.key
                  ? "bg-[#1A1A1A] text-white shadow-sm"
                  : "bg-white text-[#8E8E93] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:text-[#1A1A1A]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Transaction List ═══ */}
      <div className="px-4 mt-4 pb-28">
        {filteredTransactions.length === 0 && !isBatchSaving ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F2F2F7] flex items-center justify-center">
              <ReceiptText className="w-7 h-7 text-[#8E8E93]" />
            </div>
            <div className="text-sm text-[#8E8E93]">暂无记录</div>
            <div className="text-xs text-[#8E8E93] mt-1">
              点击下方 + 按钮拍摄你的第一张小票
            </div>
          </div>
        ) : (
          <>
            {/* Batch saving indicator */}
            {isBatchSaving && (
              <div className="mb-4 bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-[#F4D03F] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-[#8E8E93]">录入中...</span>
              </div>
            )}

            {dateGroups.map(([date, txnGroup]) => {
              const summary = dateSummaries.get(date);
              const formattedDate = formatDateToChinese(date);

              return (
                <div key={date} className="mb-4">
                  {/* Date header */}
                  <div className="flex items-center justify-between py-2 px-1">
                    <span className="text-sm font-medium text-[#1A1A1A]">
                      {formattedDate}
                    </span>
                    <span className="text-xs text-[#8E8E93]">
                      支出 {summary?.expense.toFixed(2) || "0.00"}
                    </span>
                  </div>

                  {/* Transaction cards for this date */}
                  <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden">
                    {txnGroup.map((transaction, idx) => {
                      const Icon = getCategoryIcon(transaction.category);
                      return (
                        <div
                          key={transaction.id}
                          className={`flex items-center px-4 py-3 cursor-pointer active:bg-[#F7F8FA] transition-colors ${
                            idx < txnGroup.length - 1 ? "border-b border-[#F7F8FA]" : ""
                          }`}
                          onClick={() => onEditTransaction(transaction)}
                        >
                          {/* Category Icon */}
                          <div className="w-10 h-10 rounded-full bg-[#F7F8FA] flex items-center justify-center mr-3 flex-shrink-0">
                            <Icon className="w-4.5 h-4.5 text-[#1A1A1A]" />
                          </div>

                          {/* Category + Merchant */}
                          <div className="flex-1 min-w-0 mr-3">
                            <div className="text-sm font-medium text-[#1A1A1A] truncate">
                              {transaction.category}
                            </div>
                            <div className="text-xs text-[#8E8E93] truncate">
                              {transaction.merchant || transaction.date.slice(11, 16)}
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-[#1A1A1A] tabular-nums">
                              -{Number(transaction.amount).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-[#8E8E93]">
                              {transaction.date.slice(11, 16)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
