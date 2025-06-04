import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Loader2, RefreshCw, Filter, ChevronDown } from 'lucide-react';

interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  category: 'market' | 'stocks' | 'economy' | 'crypto' | 'commodities';
}

const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['market', 'stocks', 'economy']);
  const [showMore, setShowMore] = useState(false);

  const categories = [
    { id: 'market', label: 'Market' },
    { id: 'stocks', label: 'Stocks' },
    { id: 'economy', label: 'Economy' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'commodities', label: 'Commodities' }
  ];

  const fetchNews = async () => {
    setLoading(true);
    try {
      // This would be replaced with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockNews: NewsItem[] = [
        {
          title: "Fed signals potential rate cuts as inflation cools",
          description: "Federal Reserve officials indicate openness to rate reductions in 2024 as inflation shows consistent signs of moderating.",
          url: "https://www.reuters.com/markets/us/federal-reserve-signals-rate-cuts-inflation-cools-2024",
          source: "Reuters",
          publishedAt: `${Math.floor(Math.random() * 30 + 5)} minutes ago`,
          sentiment: "positive",
          category: "economy"
        },
        {
          title: "AI chip demand drives record semiconductor sales",
          description: "Global semiconductor industry reports unprecedented growth driven by artificial intelligence and machine learning applications.",
          url: "https://www.bloomberg.com/news/articles/2024-ai-chip-demand-semiconductor-sales",
          source: "Bloomberg",
          publishedAt: `${Math.floor(Math.random() * 60 + 30)} minutes ago`,
          sentiment: "positive",
          category: "stocks"
        },
        {
          title: "Treasury yields retreat on economic data",
          description: "U.S. Treasury yields decline as latest economic indicators suggest moderating growth and cooling inflation pressures.",
          url: "https://www.wsj.com/articles/treasury-yields-retreat-economic-data-2024",
          source: "Wall Street Journal",
          publishedAt: `${Math.floor(Math.random() * 60 + 60)} minutes ago`,
          sentiment: "neutral",
          category: "market"
        },
        {
          title: "Oil prices volatile amid Middle East tensions",
          description: "Crude oil markets experience increased volatility as geopolitical tensions in the Middle East raise supply concerns.",
          url: "https://www.ft.com/content/oil-markets-middle-east-tensions-2024",
          source: "Financial Times",
          publishedAt: `${Math.floor(Math.random() * 120 + 120)} minutes ago`,
          sentiment: "negative",
          category: "commodities"
        },
        {
          title: "Bitcoin surges past key resistance levels",
          description: "Leading cryptocurrency breaks through technical barriers as institutional adoption continues to grow.",
          url: "https://www.coindesk.com/markets/2024/bitcoin-resistance-levels",
          source: "CoinDesk",
          publishedAt: `${Math.floor(Math.random() * 180 + 180)} minutes ago`,
          sentiment: "positive",
          category: "crypto"
        },
        {
          title: "Global markets rally on positive economic data",
          description: "Stock markets worldwide post gains as economic indicators suggest resilient growth despite challenges.",
          url: "https://www.marketwatch.com/story/global-markets-rally-economic-data",
          source: "MarketWatch",
          publishedAt: `${Math.floor(Math.random() * 240 + 240)} minutes ago`,
          sentiment: "positive",
          category: "market"
        },
        {
          title: "Tech sector leads market gains on AI optimism",
          description: "Technology stocks outperform broader market as investors bet on artificial intelligence growth prospects.",
          url: "https://www.cnbc.com/2024/tech-stocks-ai-optimism",
          source: "CNBC",
          publishedAt: `${Math.floor(Math.random() * 300 + 300)} minutes ago`,
          sentiment: "positive",
          category: "stocks"
        },
        {
          title: "Gold prices hit new highs on safe-haven demand",
          description: "Precious metals continue upward trend as investors seek safety amid global uncertainties.",
          url: "https://www.reuters.com/markets/commodities/gold-prices-new-highs",
          source: "Reuters",
          publishedAt: `${Math.floor(Math.random() * 360 + 360)} minutes ago`,
          sentiment: "positive",
          category: "commodities"
        }
      ];
      
      // Filter news based on selected categories
      const filteredNews = mockNews.filter(item => selectedCategories.includes(item.category));
      setNews(filteredNews);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(fetchNews, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, selectedCategories]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-500/20 text-green-400';
      case 'negative':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTimeUntilNextUpdate = () => {
    if (!autoRefresh) return 'Auto-refresh disabled';
    const nextUpdate = new Date(lastUpdate.getTime() + refreshInterval);
    const diff = nextUpdate.getTime() - Date.now();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `Next update in ${minutes}m ${seconds}s`;
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
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
            Market News
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filter
              <ChevronDown className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            </button>
            {showMore && (
              <div className="absolute top-full left-0 mt-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-2 z-10">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedCategories.includes(category.id)
                        ? 'bg-violet-500/20 text-violet-400'
                        : 'text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    {category.label}
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
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getSentimentColor(item.sentiment)}`}>
                  {item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-700/40 text-gray-300">
                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                </span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-3">{item.description}</p>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span>{item.source}</span>
                <span>{item.publishedAt}</span>
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