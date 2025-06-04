import React, { useState, useEffect } from 'react';
import { Twitter, MessageCircle, Loader2, TrendingUp, TrendingDown, ArrowRight, Search, RefreshCw } from 'lucide-react';
import { Chart } from './Charts';
import { fetchSocialSentiment } from '../services/api';

interface SocialPost {
  id: number;
  body: string;
  user: {
    username: string;
    avatar_url: string;
  };
  created_at: string;
  sentiment: number;
  source: string;
}

const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'];

const SocialSentiment: React.FC = () => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticker, setTicker] = useState('AAPL');
  const [tickerInput, setTickerInput] = useState('AAPL');
  const [overallSentiment, setOverallSentiment] = useState(0);
  const [sentimentTrend, setSentimentTrend] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes

  const fetchSentimentData = async () => {
    try {
      setLoading(true);
      const data = await fetchSocialSentiment(ticker);
      setPosts(data.messages);
      
      // Calculate overall sentiment
      const avgSentiment = data.messages.reduce((acc: number, post: SocialPost) => acc + post.sentiment, 0) / data.messages.length;
      setOverallSentiment(avgSentiment);
      
      // Determine trend
      setSentimentTrend(avgSentiment > 0.1 ? 'up' : avgSentiment < -0.1 ? 'down' : 'neutral');
      
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch social sentiment data. Please try again later.');
      console.error('Social sentiment fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentimentData();
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(fetchSentimentData, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [ticker, autoRefresh, refreshInterval]);

  const handleTickerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedTicker = tickerInput.trim().toUpperCase();
    if (formattedTicker && formattedTicker !== ticker) {
      setTicker(formattedTicker);
    }
  };

  const sentimentChartData = {
    labels: posts.map(post => new Date(post.created_at).toLocaleTimeString()),
    datasets: [
      {
        label: 'Social Sentiment',
        data: posts.map(post => post.sentiment),
        borderColor: 'rgb(124, 58, 237)',
        backgroundColor: 'rgba(124, 58, 237, 0.5)',
        tension: 0.4,
      }
    ],
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return 'text-green-400';
    if (sentiment < -0.3) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getSentimentScore = (sentiment: number) => {
    return (sentiment * 100).toFixed(0);
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

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <form onSubmit={handleTickerSubmit} className="flex gap-2">
          <div className="relative">
            <input
              type="text"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              placeholder="Enter ticker..."
              className="bg-gray-700/40 border border-gray-600/50 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50 w-[120px]"
              maxLength={5}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-violet-400"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {popularTickers.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTickerInput(t);
                  setTicker(t);
                }}
                className={`px-3 py-1 rounded-full text-sm transition-all duration-200 ${
                  ticker === t 
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/50' 
                    : 'bg-gray-700/40 text-gray-400 border border-gray-600/50 hover:bg-gray-700/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </form>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-800/60 rounded-lg p-5 border border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Sentiment Analysis for ${ticker}</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {getTimeUntilNextUpdate()}
              </span>
              {loading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
            </div>
          </div>
          <div className="h-[250px]">
            <Chart type="line" data={sentimentChartData} />
          </div>
        </div>
        
        <div className="bg-gray-800/60 rounded-lg p-5 border border-gray-700/50 flex flex-col justify-between hover:bg-gray-800/70 transition-all duration-300">
          <h3 className="text-lg font-medium mb-4">Sentiment Overview</h3>
          
          <div className="text-center my-5">
            <div className={`text-6xl font-bold ${getSentimentColor(overallSentiment)} animate-pulse-slow`}>
              {getSentimentScore(overallSentiment)}
            </div>
            <p className="text-gray-400 mt-2">Sentiment Score</p>
          </div>
          
          <div className="bg-gray-700/40 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Trend</span>
              <div className="flex items-center">
                {sentimentTrend === 'up' && <TrendingUp className="w-4 h-4 text-green-400 mr-1 animate-bounce-subtle" />}
                {sentimentTrend === 'down' && <TrendingDown className="w-4 h-4 text-red-400 mr-1 animate-bounce-subtle" />}
                <span className={
                  sentimentTrend === 'up' ? 'text-green-400' : 
                  sentimentTrend === 'down' ? 'text-red-400' : 
                  'text-gray-400'
                }>
                  {sentimentTrend === 'up' ? 'Improving' : 
                   sentimentTrend === 'down' ? 'Declining' : 
                   'Stable'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">24h Change</span>
              <span className={overallSentiment > 0 ? 'text-green-400' : 'text-red-400'}>
                {overallSentiment > 0 ? '+' : ''}{(overallSentiment * 20).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800/60 rounded-lg p-5 border border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Recent Social Mentions</h3>
          <span className="text-sm text-gray-400">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
        <div className="space-y-4">
          {posts.map((post, index) => (
            <div 
              key={index} 
              className="border-b border-gray-700/50 pb-4 last:border-0 last:pb-0 hover:bg-gray-700/20 p-3 rounded-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center text-sm">
                  {post.source === 'twitter' ? (
                    <Twitter className="w-4 h-4 text-blue-400" />
                  ) : (
                    <MessageCircle className="w-4 h-4 text-orange-400" />
                  )}
                  <span className="ml-2 text-gray-300">{post.user.username}</span>
                  <span className="ml-2 text-gray-500">• {formatDate(post.created_at)}</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs ${getSentimentColor(post.sentiment)} bg-opacity-20`}>
                  {getSentimentScore(post.sentiment)}
                </div>
              </div>
              <p className="text-gray-300 mb-2">{post.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocialSentiment;