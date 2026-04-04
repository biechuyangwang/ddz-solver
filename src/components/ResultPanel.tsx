import { useGameStore } from '../store/game-store';
import { ResultHeader } from './ResultHeader';
import { ResultTabs, type TabId } from './ResultTabs';
import { SimulationView } from './simulation/SimulationView';
import { DecisionTreeView } from './tree/DecisionTreeView';

export function ResultPanel() {
  const status = useGameStore((s) => s.status);
  const result = useGameStore((s) => s.result);
  const tree = useGameStore((s) => s.tree);
  const errorMessage = useGameStore((s) => s.errorMessage);
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);

  if (status !== 'done' && status !== 'error') {
    return null;
  }

  if (status === 'error') {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <p className="text-red-600 font-semibold">{errorMessage || '求解失败'}</p>
      </div>
    );
  }

  if (!result) return null;

  const tabsDisabled = !result.winnable || !tree;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <ResultHeader result={result} />
      <ResultTabs activeTab={activeTab} onTabChange={setActiveTab} tabsDisabled={tabsDisabled} />

      <div className="mt-4">
        {activeTab === 'overview' && null}
        {activeTab === 'tree' && !tabsDisabled && (
          <DecisionTreeView />
        )}
        {activeTab === 'tree' && tabsDisabled && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">无必胜策略，无法展示决策树</p>
          </div>
        )}
        {activeTab === 'simulation' && !tabsDisabled && (
          <SimulationView />
        )}
        {activeTab === 'simulation' && tabsDisabled && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">无必胜策略，无法模拟</p>
            <p className="text-sm">模拟仅支持必胜局面</p>
          </div>
        )}
      </div>
    </div>
  );
}
