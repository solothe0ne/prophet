import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Loader2, RefreshCw, Filter, ChevronDown } from 'lucide-react';
import { fetchNews } from '../services/api';

interface NewsItem {
  title: string;
  url: string;
  source: string;
  time_published: string;
  summary: string;
  sentiment?: {
    score: number;
    label: string;
  };
  topics?: string[];
}

const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['market', 'stocks', 'economy']);
  const [showTopics, setShowTopics] = useState(false);

  const topics = [
    { id: 'market', label: 'Market' },
    { id: 'stocks', label: 'Stocks' },
    { id: 'economy', label: 'Economy' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'forex', label: 'Forex' }
  ];

  const fetchNewsData = async () => {
    try {
      setLoading(true);
      const data = await fetchNews();
      setNews(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch news. Please try again later.');
      console.error('News fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsData();
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(fetchNewsData, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return 'bg-green-500/20 text-green-400';
    if (sentiment < -0.3) return 'bg-red-500/20 text-red-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getTimeUntilNextUpdate = () => {
    if (!autoRefresh) return 'Auto-refresh disabled';
    const nextUpdate = new Date(lastUpdate.getTime() + refreshInterval);
    const diff = nextUpdate.getTime() - Date.now();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `Next update in ${minutes}m ${seconds}s`;
  };

  if (loading && news.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-cyan-400" />
            Financial News
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowTopics(!showTopics)}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filter
              <ChevronDown className={`w-4 h-4 transition-transform ${showTopics ? 'rotate-180' : ''}`} />
            </button>
            {showTopics && (
              <div className="absolute top-full left-0 mt-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-2 z-10">
                {topics.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => {
                      setSelectedTopics(prev => 
                        prev.includes(topic.id)
                          ? prev.filter(t => t !== topic.id)
                          : [...prev, topic.id]
                      );
                    }}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedTopics.includes(topic.id)
                        ? 'bg-violet-500/20 text-violet-400'
                        : 'text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-all duration-200 ${
              autoRefresh 
                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                : 'bg-gray-700/40 text-gray-400 border border-gray-600/50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </button>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-gray-700/40 border border-gray-600/50 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <option value={300000}>5 minutes</option>
            <option value={600000}>10 minutes</option>
            <option value={900000}>15 minutes</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-300 p-4 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-4">
        {news.map((item, index) => (
          <a 
            key={index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gray-800/60 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/70 transition-all hover:bg-gray-800/80 hover:scale-[1.01] transform duration-200"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-lg mb-2 text-gray-100 group-hover:text-blue-400">{item.title}</h3>
              {item.sentiment && (
                <span className={`text-xs px-2 py-1 rounded-full ${getSentimentColor(item.sentiment.score)}`}>
                  {item.sentiment.label}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-3">{item.summary}</p>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span>{item.source}</span>
                <span>{formatDate(item.time_published)}</span>
              </div>
              <span className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                Read more <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;