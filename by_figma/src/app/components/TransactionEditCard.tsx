import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Transaction {
  id: number;
  category: string;
  merchant: string;
  amount: number;
  date: string;
  month: string;
}

interface TransactionEditCardProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  onDelete: (id: number) => void;
}

const CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '医疗', '教育', '住房', '其他'];

export function TransactionEditCard({ transaction, onClose, onSave, onDelete }: TransactionEditCardProps) {
  const [editData, setEditData] = useState<Transaction | null>(null);

  useEffect(() => {
    if (transaction) {
      setEditData({ ...transaction });
    }
  }, [transaction]);

  if (!transaction || !editData) return null;

  const handleSave = () => {
    if (editData) {
      onSave(editData);
      onClose();
    }
  };

  const handleDelete = () => {
    onDelete(transaction.id);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
        onClick={onClose}
      >
        {/* Card */}
        <div
          className="w-full max-w-md bg-white dark:bg-black border border-black/10 dark:border-white/10 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium">编辑记录</h3>
            <button onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Category */}
            <div>
              <label className="block text-sm text-[#8E8E93] mb-2">
                分类
              </label>
              <select
                value={editData.category}
                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                className="w-full bg-white dark:bg-black border-b border-black/20 dark:border-white/20 py-2 outline-none focus:border-black dark:focus:border-white transition-colors"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-white dark:bg-black">{cat}</option>
                ))}
              </select>
            </div>

            {/* Merchant */}
            <div>
              <label className="block text-sm text-[#8E8E93] mb-2">
                商户
              </label>
              <input
                type="text"
                value={editData.merchant}
                onChange={(e) => setEditData({ ...editData, merchant: e.target.value })}
                className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-2 outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm text-[#8E8E93] mb-2">
                金额
              </label>
              <input
                type="number"
                step="0.01"
                value={editData.amount}
                onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-2 font-mono outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm text-[#8E8E93] mb-2">
                日期时间
              </label>
              <input
                type="datetime-local"
                value={editData.date.slice(0, 16)}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const newMonth = newDate.slice(0, 7);
                  setEditData({
                    ...editData,
                    date: newDate + ':00',
                    month: newMonth
                  });
                }}
                className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-2 outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={handleDelete}
              className="flex-1 border border-[#FF3B30] text-[#FF3B30] py-3 text-sm font-medium hover:bg-[#FF3B30] hover:text-white transition-colors"
            >
              删除
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-black dark:bg-white text-white dark:text-black py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
