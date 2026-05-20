import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { fetchCategories, createCategory } from "../../api/client";

interface ManualEntryCardProps {
  onSave: (data: {
    category: string;
    merchant: string;
    amount: number;
    date: string;
  }) => void;
  onClose: () => void;
}

export function ManualEntryCard({ onSave, onClose }: ManualEntryCardProps) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("餐饮");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (!merchant.trim() || isNaN(numAmount) || numAmount <= 0) return;

    onSave({
      category,
      merchant: merchant.trim(),
      amount: numAmount,
      date: date + ":00",
    });
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setIsSaving(true);
    try {
      await createCategory(name);
      setCategories((prev) => [...prev, name].sort());
      setCategory(name);
      setNewCategory("");
      setIsAdding(false);
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = merchant.trim() && parseFloat(amount) > 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white dark:bg-black border border-black/10 dark:border-white/10 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium">手动录入</h3>
            <button onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Category */}
            <div>
              <label className="block text-sm text-[#8E8E93] mb-2">分类</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      category === c
                        ? "bg-black dark:bg-white text-white dark:text-black"
                        : "bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white"
                    }`}
                  >
                    {c}
                  </button>
                ))}
                {isAdding ? (
                  <div className="flex gap-1 items-center">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="新分类名"
                      maxLength={20}
                      autoFocus
                      className="w-20 px-2 py-1 text-sm bg-transparent border-b border-black/20 dark:border-white/20 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddCategory();
                        if (e.key === "Escape") setIsAdding(false);
                      }}
                    />
                    <button
                      onClick={handleAddCategory}
                      disabled={!newCategory.trim() || isSaving}
                      className="text-xs text-black dark:text-white disabled:opacity-30"
                    >
                      确定
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="px-3 py-1.5 text-sm bg-transparent border border-dashed border-black/20 dark:border-white/30 text-black dark:text-white"
                  >
                    <Plus className="w-3 h-3 inline mr-1" />
                    新增
                  </button>
                )}
              </div>
            </div>

            {/* Merchant */}
            <div>
              <label className="block text-sm text-[#8E8E93] mb-2">商户</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="如：星巴克、滴滴出行..."
                className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-2 outline-none focus:border-black dark:focus:border-white transition-colors"
                autoFocus
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm text-[#8E8E93] mb-2">金额</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-2 font-mono outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm text-[#8E8E93] mb-2">日期时间</label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-2 outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-black/20 dark:border-white/20 py-3 text-sm hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="flex-1 bg-black dark:bg-white text-white dark:text-black py-3 text-sm font-medium disabled:opacity-30 hover:opacity-90 transition-opacity"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
