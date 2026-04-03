import { cn } from '../lib/cn';

export type TabId = 'overview' | 'tree' | 'simulation';

interface ResultTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  /** Whether tree/simulation tabs should be disabled (not winnable or no tree) */
  tabsDisabled?: boolean;
}

export function ResultTabs({ activeTab, onTabChange, tabsDisabled = false }: ResultTabsProps) {
  const tabs: { id: TabId; label: string; disabled?: boolean }[] = [
    { id: 'overview', label: '概览' },
    { id: 'tree', label: '决策树', disabled: tabsDisabled },
    { id: 'simulation', label: '对局模拟', disabled: tabsDisabled },
  ];

  return (
    <div className="flex border-b border-tab-border" role="tablist" aria-label="结果视图切换">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = tab.disabled;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              isActive
                ? 'border-tab-active text-tab-active'
                : 'border-transparent text-gray-500 hover:text-gray-700',
              isDisabled && 'opacity-50 cursor-not-allowed hover:text-gray-500',
            )}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            disabled={isDisabled}
            title={isDisabled ? '仅支持必胜局面' : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
