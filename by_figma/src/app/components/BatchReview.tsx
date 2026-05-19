import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import type { ParsedReceiptDTO } from "../../api/client";

const CATEGORIES = ["餐饮", "交通", "购物", "娱乐", "医疗", "教育", "住房", "其他"];

interface BatchItem extends ParsedReceiptDTO {
  _id: number;
  selected: boolean;
}

interface BatchReviewProps {
  transactions: ParsedReceiptDTO[];
  errors?: string[];
  onSave: (items: ParsedReceiptDTO[]) => void;
  onClose: () => void;
}

export function BatchReview({ transactions, errors, onSave, onClose }: BatchReviewProps) {
  const [items, setItems] = useState<BatchItem[]>(
    transactions.map((t, i) => ({ ...t, _id: i, selected: true }))
  );

  const toggleItem = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateItem = (id: number, field: string, value: string | number) => {
    setItems((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSave = () => {
    const selected = items
      .filter((i) => i.selected)
      .map(({ _id, selected, ...rest }) => rest);
    if (selected.length > 0) {
      onSave(selected);
    }
  };

  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg bg-white dark:bg-black max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 flex-shrink-0">
            <h3 className="text-lg font-medium">
              识别结果 ({selectedCount}/{items.length})
            </h3>
            <button onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Errors */}
          {errors && errors.length > 0 && (
            <div className="px-6 py-3 bg-[#FFF0F0] dark:bg-[#2D1B1B] flex-shrink-0">
              {errors.map((err, i) => (
                <div key={i} className="text-sm text-[#FF3B30]">
                  {err}
                </div>
              ))}
            </div>
          )}

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {items.map((item) => (
              <div
                key={item._id}
                className={`border transition-colors ${
                  item.selected
                    ? "border-black/10 dark:border-white/10"
                    : "border-black/5 dark:border-white/5 opacity-50"
                }`}
              >
                {/* Item header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItem(item._id)}
                    className="w-4 h-4 accent-black dark:accent-white"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.merchant}</div>
                    <div className="text-xs text-[#8E8E93]">
                      {item.date?.slice(0, 16)}
                    </div>
                  </div>
                  <div className="font-mono text-base flex-shrink-0">
                    {item.amount.toFixed(2)}
                  </div>
                </div>

                {/* Item edit fields */}
                {item.selected && (
                  <div className="px-4 pb-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#8E8E93] mb-1">分类</label>
                      <div className="relative">
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(item._id, "category", e.target.value)}
                          className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-1 text-sm outline-none appearance-none"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#8E8E93] mb-1">金额</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) =>
                          updateItem(item._id, "amount", parseFloat(e.target.value) || 0)
                        }
                        className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-1 font-mono text-sm outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-black/10 dark:border-white/10 flex gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="flex-1 border border-black/20 dark:border-white/20 py-3 text-sm hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={selectedCount === 0}
              className="flex-1 bg-black dark:bg-white text-white dark:text-black py-3 text-sm font-medium disabled:opacity-30 hover:opacity-90 transition-opacity"
            >
              保存 {selectedCount} 条记录
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
