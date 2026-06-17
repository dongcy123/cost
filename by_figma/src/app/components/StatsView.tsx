import { useState, useMemo } from "react";
import {
  ArrowLeft,
  TrendingUp,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Gamepad2,
  Home,
  Heart,
  BookOpen,
  Phone,
  HelpCircle,
} from "lucide-react";
import {
  Line,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ComposedChart,
  BarChart,
  Bar,
  Legend,
} from "recharts";

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

interface StatsViewProps {
  transactions: Transaction[];
  selectedMonth: string;
  budget: Budget | null;
  onBack: () => void;
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

const YELLOW_PALETTE = [
  "#F4D03F", "#E0B830", "#CBA130", "#B78A28",
  "#A37320", "#8E5C18", "#7A4510", "#662E08",
];

const STRUCTURE_COLORS = [
  "#F4D03F", "#1A1A1A", "#8E8E93", "#C0C0C0",
  "#E0B830", "#D1D1D6", "#4A4A4A", "#F2F2F7",
];

function getCategoryIcon(category: string) {
  const Icon = CATEGORY_ICON_MAP[category] || HelpCircle;
  return Icon;
}

// ── Budget Ring sub-component ──

function BudgetRing({
  category,
  spent,
  budget,
  color,
}: {
  category: string;
  spent: number;
  budget: number;
  color: string;
}) {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const isOverBudget = spent > budget && budget > 0;

  const Icon = getCategoryIcon(category);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[72px] h-[72px]">
        <svg width="72" height="72" viewBox="0 0 72 72">
          {/* Background ring */}
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="#F2F2F7"
            strokeWidth="6"
          />
          {/* Progress ring */}
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke={isOverBudget ? "#E8A030" : color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 36 36)"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        {/* Center icon + percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-4 h-4 text-[#1A1A1A]" />
          <span className="text-[11px] font-semibold text-[#1A1A1A]">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      <span className="text-xs text-[#8E8E93] truncate max-w-[72px] text-center">
        {category}
      </span>
      <span className="text-[10px] text-[#8E8E93]">
        {spent.toFixed(0)}/{budget > 0 ? budget.toFixed(0) : "—"}
      </span>
    </div>
  );
}

// ── Main Component ──

export function StatsView({
  transactions,
  selectedMonth,
  budget,
  onBack,
}: StatsViewProps) {
  const [activeTab, setActiveTab] = useState<"trend" | "structure" | "compare" | "budget">("trend");

  const tabs = [
    { key: "trend" as const, label: "趋势" },
    { key: "structure" as const, label: "结构" },
    { key: "compare" as const, label: "对比" },
    { key: "budget" as const, label: "预算" },
  ];

  // ── Previous month ──

  const previousMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  }, [selectedMonth]);

  // ── Current month total ──

  const currentTotal = useMemo(() => {
    return transactions
      .filter((t) => t.month === selectedMonth)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions, selectedMonth]);

  // ── Trend data ──

  const trendData = useMemo(() => {
    const dailyTotals = new Map<string, number>();
    transactions
      .filter((t) => t.month === selectedMonth)
      .forEach((t) => {
        const day = t.date.slice(0, 10);
        dailyTotals.set(day, (dailyTotals.get(day) || 0) + Number(t.amount));
      });

    return Array.from(dailyTotals.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({
        date: date.slice(5),
        amount: parseFloat(amount.toFixed(2)),
      }));
  }, [transactions, selectedMonth]);

  // ── Structure data ──

  const structureData = useMemo(() => {
    const categoryTotals = new Map<string, number>();
    transactions
      .filter((t) => t.month === selectedMonth)
      .forEach((t) => {
        categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + Number(t.amount));
      });

    return Array.from(categoryTotals.entries())
      .map(({ 0: category, 1: amount }) => ({
        category,
        amount: parseFloat(amount.toFixed(2)),
        percentage: currentTotal > 0 ? (amount / currentTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, selectedMonth, currentTotal]);

  // ── Monthly comparison data ──

  const comparisonData = useMemo(() => {
    // Gather all categories from both months
    const allCategories = new Set<string>();
    const currentMap = new Map<string, number>();
    const previousMap = new Map<string, number>();

    transactions
      .filter((t) => t.month === selectedMonth)
      .forEach((t) => {
        allCategories.add(t.category);
        currentMap.set(t.category, (currentMap.get(t.category) || 0) + Number(t.amount));
      });

    transactions
      .filter((t) => t.month === previousMonth)
      .forEach((t) => {
        allCategories.add(t.category);
        previousMap.set(t.category, (previousMap.get(t.category) || 0) + Number(t.amount));
      });

    return Array.from(allCategories)
      .map((cat) => ({
        category: cat,
        当月: parseFloat((currentMap.get(cat) || 0).toFixed(2)),
        上月: parseFloat((previousMap.get(cat) || 0).toFixed(2)),
      }))
      .sort((a, b) => (b.当月 + b.上月) - (a.当月 + a.上月));
  }, [transactions, selectedMonth, previousMonth]);

  // ── Budget execution data ──

  const budgetRings = useMemo(() => {
    if (!budget) return [];

    const spentMap = new Map<string, number>();
    transactions
      .filter((t) => t.month === selectedMonth)
      .forEach((t) => {
        spentMap.set(t.category, (spentMap.get(t.category) || 0) + Number(t.amount));
      });

    return Object.entries(budget.categories)
      .map(([category, limit], index) => ({
        category,
        spent: parseFloat((spentMap.get(category) || 0).toFixed(2)),
        budget: Number(limit),
        color: YELLOW_PALETTE[index % YELLOW_PALETTE.length],
      }))
      .sort((a, b) => {
        const pctA = a.budget > 0 ? a.spent / a.budget : 0;
        const pctB = b.budget > 0 ? b.spent / b.budget : 0;
        return pctB - pctA;
      });
  }, [transactions, selectedMonth, budget]);

  // ── Totals ──

  const totalStructureAmount = structureData.reduce((sum, d) => sum + d.amount, 0);

  const compareCurrentTotal = comparisonData.reduce((sum, d) => sum + d.当月, 0);
  const comparePreviousTotal = comparisonData.reduce((sum, d) => sum + d.上月, 0);

  // ── Render ──

  return (
    <div className="w-full min-h-screen bg-[#F7F8FA] pb-28">
      {/* ═══ Header ═══ */}
      <div className="bg-gradient-to-b from-[#F4D03F] to-[#F7D94E] pt-4 pb-10 rounded-b-[2.5rem]">
        <div className="flex items-center px-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">返回</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-base font-semibold text-[#1A1A1A]">统计分析</h1>
          </div>
          <div className="w-[60px]" />
        </div>
      </div>

      {/* ═══ Tab bar ═══ */}
      <div className="mx-4 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-1 flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-sm rounded-xl font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-[#F4D03F] text-[#1A1A1A] shadow-sm"
                  : "text-[#8E8E93] hover:text-[#1A1A1A]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Chart Content ═══ */}
      <div className="mx-4 mt-4">
        {/* ── Trend chart ── */}
        {activeTab === "trend" && (
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5">
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">每日支出趋势</h3>
            <p className="text-xs text-[#8E8E93] mb-4">{selectedMonth} 日均 ¥{(currentTotal / Math.max(trendData.length, 1)).toFixed(0)}</p>

            {trendData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-[#8E8E93]">
                暂无数据
              </div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="statsYellowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F4D03F" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#F4D03F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#8E8E93" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#8E8E93" }}
                      width={42}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1A1A1A",
                        border: "none",
                        borderRadius: 12,
                        color: "#fff",
                        fontSize: 12,
                        padding: "8px 12px",
                      }}
                      formatter={(value: number) => [`¥${value.toFixed(2)}`, "支出"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      fill="url(#statsYellowGrad)"
                      stroke="none"
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#F4D03F"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#F4D03F", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── Structure chart ── */}
        {activeTab === "structure" && (
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5">
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">分类支出结构</h3>
            <p className="text-xs text-[#8E8E93] mb-4">共 {structureData.length} 个分类</p>

            {structureData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-[#8E8E93]">
                暂无数据
              </div>
            ) : (
              <>
                {/* Donut */}
                <div className="h-40 flex items-center justify-center">
                  <ResponsiveContainer width="60%" height="100%">
                    <PieChart>
                      <Pie
                        data={structureData}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="amount"
                        cornerRadius={4}
                      >
                        {structureData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STRUCTURE_COLORS[index % STRUCTURE_COLORS.length]}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1A1A1A",
                          border: "none",
                          borderRadius: 12,
                          color: "#fff",
                          fontSize: 12,
                          padding: "8px 12px",
                        }}
                        formatter={(value: number) => `¥${value.toFixed(2)}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Leaderboard */}
                <div className="space-y-2.5 mt-2">
                  {structureData.map((item, index) => {
                    const Icon = getCategoryIcon(item.category);
                    return (
                      <div key={item.category} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#F7F8FA] flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-[#1A1A1A]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-[#1A1A1A] truncate">{item.category}</span>
                            <span className="text-xs text-[#8E8E93] ml-2 flex-shrink-0">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(item.percentage, 100)}%`,
                                  backgroundColor: STRUCTURE_COLORS[index % STRUCTURE_COLORS.length],
                                }}
                              />
                            </div>
                            <span className="text-xs text-[#8E8E93] w-14 text-right flex-shrink-0">
                              {item.amount.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-3 mt-3 border-t border-[#F2F2F7]">
                  <span className="text-sm font-medium text-[#1A1A1A]">合计</span>
                  <span className="text-sm font-bold text-[#1A1A1A]">
                    ¥{totalStructureAmount.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Monthly comparison ── */}
        {activeTab === "compare" && (
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5">
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">月度分类对比</h3>
            <p className="text-xs text-[#8E8E93] mb-4">
              {selectedMonth} vs {previousMonth}
              {comparePreviousTotal > 0 && (
                <span className={`ml-2 font-medium ${
                  compareCurrentTotal > comparePreviousTotal
                    ? "text-[#E8A030]"
                    : "text-[#34C759]"
                }`}>
                  {compareCurrentTotal > comparePreviousTotal ? "↑" : "↓"}{" "}
                  {Math.abs(((compareCurrentTotal - comparePreviousTotal) / comparePreviousTotal) * 100).toFixed(1)}%
                </span>
              )}
            </p>

            {comparisonData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-[#8E8E93]">
                暂无数据
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonData}
                    margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                    barCategoryGap="30%"
                  >
                    <XAxis
                      dataKey="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#8E8E93" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#8E8E93" }}
                      width={42}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1A1A1A",
                        border: "none",
                        borderRadius: 12,
                        color: "#fff",
                        fontSize: 12,
                        padding: "8px 12px",
                      }}
                      formatter={(value: number) => `¥${value.toFixed(2)}`}
                    />
                    <Legend
                      iconType="rect"
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                    <Bar
                      dataKey="当月"
                      fill="#F4D03F"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="上月"
                      fill="#D1D1D6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bottom summary cards */}
            {comparisonData.length > 0 && (
              <div className="flex gap-3 mt-4 pt-4 border-t border-[#F2F2F7]">
                <div className="flex-1 bg-[#FFF9E6] rounded-xl p-3">
                  <div className="text-[10px] text-[#8E8E93] mb-0.5">当月合计</div>
                  <div className="text-sm font-bold text-[#1A1A1A]">
                    ¥{compareCurrentTotal.toFixed(2)}
                  </div>
                </div>
                <div className="flex-1 bg-[#F7F8FA] rounded-xl p-3">
                  <div className="text-[10px] text-[#8E8E93] mb-0.5">上月合计</div>
                  <div className="text-sm font-bold text-[#1A1A1A]">
                    ¥{comparePreviousTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Budget execution rings ── */}
        {activeTab === "budget" && (
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5">
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">预算执行</h3>
            <p className="text-xs text-[#8E8E93] mb-4">
              月度预算 ¥{budget?.monthlyBudget?.toFixed(0) || "—"}
              <span className="ml-2">
                已用 ¥{currentTotal.toFixed(0)}
              </span>
            </p>

            {budgetRings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-sm text-[#8E8E93] mb-2">尚未设置分类预算</div>
                <p className="text-xs text-[#8E8E93]">返回首页点击 ⚙️ 规则 进行设置</p>
              </div>
            ) : (
              <>
                {/* Ring grid */}
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-5">
                  {budgetRings.map((item) => (
                    <BudgetRing
                      key={item.category}
                      category={item.category}
                      spent={item.spent}
                      budget={item.budget}
                      color={item.color}
                    />
                  ))}
                </div>

                {/* Summary bar */}
                <div className="mt-5 pt-4 border-t border-[#F2F2F7]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#8E8E93]">总预算使用率</span>
                    <span className="text-xs font-semibold text-[#1A1A1A]">
                      {budget && budget.monthlyBudget > 0
                        ? ((currentTotal / budget.monthlyBudget) * 100).toFixed(1)
                        : "—"}%
                    </span>
                  </div>
                  <div className="h-2 bg-[#F2F2F7] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        budget && currentTotal > budget.monthlyBudget
                          ? "bg-[#E8A030]"
                          : "bg-[#F4D03F]"
                      }`}
                      style={{
                        width: `${budget && budget.monthlyBudget > 0
                          ? Math.min((currentTotal / budget.monthlyBudget) * 100, 100)
                          : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-[#8E8E93]">
                      已用 ¥{currentTotal.toFixed(0)}
                    </span>
                    <span className="text-[10px] text-[#8E8E93]">
                      预算 ¥{budget?.monthlyBudget?.toFixed(0) || "—"}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
