import React, { useState, useEffect } from 'react';
import { Chart, LineChart, AreaChart } from './components/Charts';
import PredictionForm from './components/PredictionForm';
import PredictionResults from './components/PredictionResults';
import NewsFeed from './components/NewsFeed';
import SocialSentiment from './components/SocialSentiment';
import MarketOverview from './components/MarketOverview';
import { Navigation } from './components/Navigation';
import { fetchPrediction, fetchMarketData } from './services/api';
import { LineChart as LineIcon, BarChart, TrendingUp, Zap, BookOpen, Twitter, Sun, Moon } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('prediction');
  const [predictionData, setPredictionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [marketData, setMarketData] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchInitialMarketData = async () => {
      try {
        const data = await fetchMarketData();
        setMarketData(data);
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    };

    fetchInitialMarketData();
  }, []);

  const handlePrediction = async (formData) => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await fetchPrediction(formData);
      setPredictionData(result);
    } catch (err) {
      setError(err.message || 'Failed to make prediction');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'prediction':
        return (
          <div className="flex flex-col space-y-6">
            <PredictionForm onSubmit={handlePrediction} isLoading={isLoading} />
            {error && <div className="bg-red-500/20 text-red-300 p-4 rounded-lg">{error}</div>}
            {predictionData && <PredictionResults data={predictionData} />}
          </div>
        );
      case 'market':
        return <MarketOverview data={marketData} />;
      case 'news':
        return <NewsFeed />;
      case 'social':
        return <SocialSentiment />;
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'prediction', label: 'Prediction', icon: <LineIcon className="w-5 h-5" /> },
    { id: 'market', label: 'Market', icon: <BarChart className="w-5 h-5" /> },
    { id: 'news', label: 'News', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'social', label: 'Social', icon: <Twitter className="w-5 h-5" /> },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-200 animate-gradient ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-gray-100' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50/30 to-pink-50 text-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <TrendingUp className="h-8 w-8 text-accent-cyan animate-pulse-slow" />
              <div className="absolute -inset-1 bg-accent-cyan/30 rounded-full blur-md animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold gradient-text animate-shimmer">
              ProphetProfitGains
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all duration-300 ${
                theme === 'dark' 
                  ? 'bg-gray-800/80 hover:bg-gray-700 hover:scale-110' 
                  : 'bg-white/80 hover:bg-gray-100 hover:scale-110'
              }`}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <div className="bg-accent-emerald/10 text-accent-emerald py-1 px-3 rounded-full flex items-center gap-1 text-sm font-medium animate-pulse">
              <Zap className="h-4 w-4" />
              <span>Live</span>
            </div>
          </div>
        </header>
        
        <Navigation tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />
        
        <main className={`mt-6 rounded-xl p-6 shadow-lg transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 hover:bg-gray-800/60'
            : 'bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white/90'
        }`}>
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}

export default App;