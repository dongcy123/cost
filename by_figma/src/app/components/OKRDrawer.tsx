import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Budget {
  month: string;
  monthlyBudget: number;
  categories: Record<string, number>;
}

interface OKRDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget | null;
  onUpdateBudget: (budget: Budget) => void;
  selectedMonth: string;
}

export function OKRDrawer({
  isOpen,
  onClose,
  budget,
  onUpdateBudget,
  selectedMonth,
}: OKRDrawerProps) {
  const [localBudget, setLocalBudget] = useState<Budget>({
    month: selectedMonth,
    monthlyBudget: 5000,
    categories: { 餐饮: 2000, 交通: 800, 购物: 1500, 娱乐: 500, 其他: 200 },
  });

  useEffect(() => {
    if (budget) {
      setLocalBudget(budget);
    }
  }, [budget]);

  const handleMonthlyBudgetChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setLocalBudget((prev) => ({ ...prev, monthlyBudget: numValue }));
  };

  const handleCategoryChange = (category: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLocalBudget((prev) => ({
      ...prev,
      categories: { ...prev.categories, [category]: numValue },
    }));
  };

  const handleUpdate = () => {
    onUpdateBudget({ ...localBudget, month: selectedMonth });
    onClose();
  };

  const calculatePercentage = (amount: number) => {
    if (localBudget.monthlyBudget === 0) return 0;
    return ((amount / localBudget.monthlyBudget) * 100).toFixed(1);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 bottom-0 w-[85%] bg-white dark:bg-black z-50 transform transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="px-6 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-medium">全局控制协议 (OKR)</h2>
            <button onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mb-8">
              <label className="block text-sm text-[#8E8E93] mb-2">
                全局预算 (O)
              </label>
              <input
                type="number"
                value={localBudget.monthlyBudget}
                onChange={(e) => handleMonthlyBudgetChange(e.target.value)}
                placeholder="请输入月度上限..."
                className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-2 font-mono outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-[#8E8E93] mb-4">
                分类阈值 (KR)
              </label>
              <div className="space-y-6">
                {Object.entries(localBudget.categories).map(([category, amount]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{category}</span>
                      <span className="text-xs text-[#8E8E93]">
                        {calculatePercentage(amount)}%
                      </span>
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => handleCategoryChange(category, e.target.value)}
                      className="w-full bg-transparent border-b border-black/10 dark:border-white/10 py-1 font-mono text-sm outline-none focus:border-black dark:focus:border-white transition-colors"
                    />
                    <input
                      type="range"
                      min="0"
                      max={localBudget.monthlyBudget}
                      value={amount}
                      onChange={(e) => handleCategoryChange(category, e.target.value)}
                      className="w-full h-1 bg-[#F2F2F7] dark:bg-[#1C1C1E] appearance-none slider"
                      style={{
                        background: `linear-gradient(to right, #000 0%, #000 ${calculatePercentage(amount)}%, #F2F2F7 ${calculatePercentage(amount)}%, #F2F2F7 100%)`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-black/10 dark:border-white/10">
            <button
              onClick={handleUpdate}
              className="w-full bg-black dark:bg-white text-white dark:text-black py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              更新规则
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #000;
          cursor: pointer;
          border-radius: 0;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #000;
          cursor: pointer;
          border: none;
          border-radius: 0;
        }
        .dark .slider::-webkit-slider-thumb {
          background: #fff;
        }
        .dark .slider::-moz-range-thumb {
          background: #fff;
        }
      `}</style>
    </>
  );
}
