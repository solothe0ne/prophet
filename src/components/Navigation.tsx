import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface NavigationProps {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (id: string) => void;
  theme: string;
}

export const Navigation: React.FC<NavigationProps> = ({ tabs, activeTab, setActiveTab, theme }) => {
  return (
    <div className={`flex items-center gap-1 p-1 rounded-lg shadow-inner transition-colors duration-200 ${
      theme === 'dark' ? 'bg-gray-800/60' : 'bg-gray-200/60'
    }`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 py-2 px-4 rounded-md transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-lg'
              : theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300/50'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};