import { useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface Transaction {
  id: number;
  category: string;
  merchant: string;
  amount: number;
  date: string;
  month: string;
}

interface ChartsViewProps {
  transactions: Transaction[];
  selectedMonth: string;
  onBack: () => void;
  onEditTransaction: (transaction: Transaction) => void;
}

const COLORS = [
  "#000000",
  "#333333",
  "#666666",
  "#999999",
  "#BBBBBB",
  "#CCCCCC",
  "#DDDDDD",
  "#EEEEEE",
];

export function ChartsView({
  transactions,
  selectedMonth,
  onBack,
  onEditTransaction,
}: ChartsViewProps) {
  const [tab, setTab] = useState<"trend" | "structure">("trend");

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

  const structureData = useMemo(() => {
    const categoryTotals = new Map<string, number>();
    transactions
      .filter((t) => t.month === selectedMonth)
      .forEach((t) => {
        categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + Number(t.amount));
      });

    return Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({ category, amount: parseFloat(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, selectedMonth]);

  const maxCategory = structureData[0]?.category;

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
        <button onClick={onBack} className="flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="text-sm text-[#8E8E93]">{selectedMonth}</div>
        <div className="w-10" />
      </div>

      {/* Tabs */}
      <div className="px-6 pt-6">
        <div className="flex border-b border-black/10 dark:border-white/10">
          <button
            onClick={() => setTab("trend")}
            className={`pb-3 text-sm relative mr-8 ${
              tab === "trend" ? "font-medium" : "text-[#8E8E93]"
            }`}
          >
            趋势
            {tab === "trend" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />
            )}
          </button>
          <button
            onClick={() => setTab("structure")}
            className={`pb-3 text-sm relative ${
              tab === "structure" ? "font-medium" : "text-[#8E8E93]"
            }`}
          >
            结构
            {tab === "structure" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />
            )}
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 px-6 py-6">
        {tab === "trend" ? (
          <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] p-6">
            {trendData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-[#8E8E93]">
                暂无数据
              </div>
            ) : (
              <>
                <div className="text-sm text-[#8E8E93] mb-4">每日支出趋势</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#8E8E93" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#8E8E93" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#000",
                          border: "none",
                          borderRadius: 0,
                          color: "#fff",
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [`${value.toFixed(2)}`, "支出"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#000000"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] p-6">
            {structureData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-[#8E8E93]">
                暂无数据
              </div>
            ) : (
              <>
                <div className="text-sm text-[#8E8E93] mb-4">分类支出占比</div>
                <div className="h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={structureData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="amount"
                      >
                        {structureData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.category === maxCategory
                                ? "#FF3B30"
                                : COLORS[index % COLORS.length]
                            }
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#000",
                          border: "none",
                          borderRadius: 0,
                          color: "#fff",
                          fontSize: 12,
                        }}
                        formatter={(value: number) => `${value.toFixed(2)}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-4 space-y-1">
                  {structureData.map((item, index) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between py-1.5 px-2"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 flex-shrink-0"
                          style={{
                            backgroundColor:
                              item.category === maxCategory
                                ? "#FF3B30"
                                : COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="text-sm">{item.category}</span>
                      </div>
                      <span className="font-mono text-sm">
                        {item.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
