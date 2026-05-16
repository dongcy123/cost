import { useState, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

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

export function ChartsView({ transactions, selectedMonth, onBack, onEditTransaction }: ChartsViewProps) {
  const [activeTab, setActiveTab] = useState<'trend' | 'structure'>('trend');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Prepare trend data
  const trendData = useMemo(() => {
    const dailyTotals = new Map<string, number>();

    transactions
      .filter(t => t.month === selectedMonth)
      .forEach(t => {
        const day = t.date.slice(0, 10);
        dailyTotals.set(day, (dailyTotals.get(day) || 0) + t.amount);
      });

    const sorted = Array.from(dailyTotals.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({
        date: date.slice(5),
        amount: parseFloat(amount.toFixed(2))
      }));

    return sorted;
  }, [transactions, selectedMonth]);

  // Prepare structure data
  const structureData = useMemo(() => {
    const categoryTotals = new Map<string, number>();

    transactions
      .filter(t => t.month === selectedMonth)
      .forEach(t => {
        categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + t.amount);
      });

    const sorted = Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount: parseFloat(amount.toFixed(2))
      }))
      .sort((a, b) => b.amount - a.amount);

    return sorted;
  }, [transactions, selectedMonth]);

  // Generate grayscale colors
  const COLORS = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC'];
  const maxCategory = structureData[0]?.category;

  const filteredTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions
      .filter(t => t.month === selectedMonth && t.category === selectedCategory)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedMonth, selectedCategory]);

  return (
    <div className="w-full min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
        <button onClick={onBack} className="flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="text-sm text-[#8E8E93]">{selectedMonth}</div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-4">
        <div className="flex gap-6 border-b border-black/10 dark:border-white/10">
          <button
            className={`pb-2 text-sm relative ${activeTab === 'trend' ? 'font-medium' : ''}`}
            onClick={() => {
              setActiveTab('trend');
              setSelectedCategory(null);
            }}
          >
            趋势
            {activeTab === 'trend' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />
            )}
          </button>
          <button
            className={`pb-2 text-sm relative ${activeTab === 'structure' ? 'font-medium' : ''}`}
            onClick={() => {
              setActiveTab('structure');
              setSelectedCategory(null);
            }}
          >
            结构
            {activeTab === 'structure' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />
            )}
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="px-6">
        {activeTab === 'trend' ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#8E8E93' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#8E8E93' }}
                  domain={['dataMin', 'dataMax']}
                  ticks={trendData.length > 0 ? [
                    Math.min(...trendData.map(d => d.amount)),
                    Math.max(...trendData.map(d => d.amount))
                  ] : []}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#000',
                    border: 'none',
                    borderRadius: 0,
                    color: '#fff',
                    fontSize: 12
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)}`, '支出']}
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
        ) : (
          <>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={structureData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="amount"
                    onClick={(data) => setSelectedCategory(data.category)}
                  >
                    {structureData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.category === maxCategory ? '#FF3B30' : COLORS[index % COLORS.length]}
                        stroke="none"
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#000',
                      border: 'none',
                      borderRadius: 0,
                      color: '#fff',
                      fontSize: 12
                    }}
                    formatter={(value: number) => `${value.toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Legend */}
            <div className="mt-6 space-y-2">
              {structureData.map((item, index) => (
                <button
                  key={item.category}
                  className="w-full flex items-center justify-between py-2 px-4 hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] transition-colors"
                  onClick={() => setSelectedCategory(item.category === selectedCategory ? null : item.category)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3"
                      style={{
                        backgroundColor: item.category === maxCategory ? '#FF3B30' : COLORS[index % COLORS.length]
                      }}
                    />
                    <span className="text-sm">{item.category}</span>
                  </div>
                  <span className="font-mono text-sm">{item.amount.toFixed(2)}</span>
                </button>
              ))}
            </div>

            {/* Filtered Transactions */}
            {selectedCategory && (
              <div className="mt-6 border-t border-black/10 dark:border-white/10 pt-4">
                <div className="text-sm font-medium mb-3">{selectedCategory} 明细</div>
                <div className="space-y-0">
                  {filteredTransactions.map(transaction => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5 cursor-pointer hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] transition-colors px-4 -mx-4"
                      onClick={() => onEditTransaction(transaction)}
                    >
                      <div className="flex flex-col">
                        <div className="text-sm">{transaction.merchant}</div>
                        <div className="text-xs text-[#8E8E93]">
                          {transaction.date.slice(5, 16)}
                        </div>
                      </div>
                      <div className="font-mono text-sm">{transaction.amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
