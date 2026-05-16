import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface MonthSelectorProps {
  selectedMonth: string;
  onSelect: (month: string) => void;
}

export function MonthSelector({ selectedMonth, onSelect }: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate last 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (month: string) => {
    onSelect(month);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="text-sm text-[#8E8E93] flex items-center gap-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedMonth}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-black border border-black/10 dark:border-white/10 shadow-lg z-50 min-w-[120px]">
          <div className="max-h-64 overflow-y-auto">
            {months.map(month => (
              <button
                key={month}
                onClick={() => handleSelect(month)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] transition-colors ${
                  month === selectedMonth ? 'bg-[#F2F2F7] dark:bg-[#1C1C1E] font-medium' : ''
                }`}
              >
                {month}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
