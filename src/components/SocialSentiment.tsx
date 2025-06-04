import React, { useState, useEffect } from 'react';
import { Twitter, MessageCircle, Loader2, TrendingUp, TrendingDown, ArrowRight, Search, RefreshCw } from 'lucide-react';
import { Chart } from './Charts';

interface SocialPost {
  text: string;
  source: 'twitter' | 'reddit';
  user: string;
  timestamp: string;
  sentiment: number;
  relevance: number;
  url?: string;
}

const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'];

// Ticker-specific news and events database
const tickerEvents = {
  AAPL: [
    { positive: "iPhone sales exceed expectations in emerging markets", sentiment: 0.85 },
    { positive: "New MacBook Pro receives rave reviews", sentiment: 0.75 },
    { negative: "Supply chain constraints may impact production", sentiment: -0.6 },
    { neutral: "Apple's services revenue shows steady growth", sentiment: 0.3 },
    { positive: "Vision Pro pre-orders surpass expectations", sentiment: 0.9 }
  ],
  MSFT: [
    { positive: "Azure cloud revenue grows significantly", sentiment: 0.8 },
    { positive: "AI integration boosts Microsoft 365 adoption", sentiment: 0.7 },
    { negative: "Gaming division faces increased competition", sentiment: -0.5 },
    { positive: "Enterprise solutions gain market share", sentiment: 0.6 },
    { neutral: "New Windows features announced", sentiment: 0.2 }
  ],
  GOOGL: [
    { positive: "Ad revenue rebounds strongly", sentiment: 0.75 },
    { positive: "Gemini AI shows promising results", sentiment: 0.85 },
    { negative: "Antitrust concerns weigh on outlook", sentiment: -0.7 },
    { positive: "YouTube subscription growth accelerates", sentiment: 0.6 },
    { neutral: "Cloud platform gains enterprise customers", sentiment: 0.4 }
  ],
  AMZN: [
    { positive: "AWS maintains cloud market leadership", sentiment: 0.8 },
    { positive: "Prime membership reaches new milestone", sentiment: 0.7 },
    { negative: "Rising logistics costs impact margins", sentiment: -0.55 },
    { positive: "International expansion shows promise", sentiment: 0.65 },
    { neutral: "New fulfillment centers operational", sentiment: 0.3 }
  ],
  META: [
    { positive: "Ad platform recovery exceeds expectations", sentiment: 0.9 },
    { positive: "Metaverse engagement metrics improve", sentiment: 0.65 },
    { negative: "Privacy changes affect targeting", sentiment: -0.5 },
    { positive: "WhatsApp monetization progresses", sentiment: 0.7 },
    { neutral: "New VR hardware announced", sentiment: 0.4 }
  ],
  NVDA: [
    { positive: "AI chip demand remains strong", sentiment: 0.95 },
    { positive: "Data center revenue hits record", sentiment: 0.85 },
    { negative: "Chip prices face pressure", sentiment: -0.45 },
    { positive: "New GPU architecture unveiled", sentiment: 0.75 },
    { neutral: "Gaming segment stabilizes", sentiment: 0.3 }
  ],
  TSLA: [
    { positive: "Production efficiency improves", sentiment: 0.8 },
    { positive: "New gigafactory exceeds targets", sentiment: 0.75 },
    { negative: "Competition intensifies in EV market", sentiment: -0.65 },
    { positive: "FSD capability expands", sentiment: 0.7 },
    { neutral: "Energy storage deployment grows", sentiment: 0.4 }
  ]
};

const usernames = {
  twitter: ['@marketanalyst', '@techtrader', '@stockguru', '@investorpro', '@marketwatch', '@tradingexpert'],
  reddit: ['u/valueInvestor', 'u/techanalyst', 'u/stocktrader', 'u/marketpro', 'u/investorinsights']
};

const SocialSentiment: React.FC = () => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState('AAPL');
  const [tickerInput, setTickerInput] = useState('AAPL');
  const [overallSentiment, setOverallSentiment] = useState(0);
  const [sentimentTrend, setSentimentTrend] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes

  const generateTickerSpecificPost = (ticker: string, event: any, timeAgo: number): SocialPost => {
    const isTwitter = Math.random() > 0.5;
    const username = isTwitter 
      ? usernames.twitter[Math.floor(Math.random() * usernames.twitter.length)]
      : usernames.reddit[Math.floor(Math.random() * usernames.reddit.length)];

    let text = '';
    if ('positive' in event) {
      text = event.positive;
    } else if ('negative' in event) {
      text = event.negative;
    } else {
      text = event.neutral;
    }

    // Add ticker symbol and make text more social media-like
    text = `$${ticker} - ${text}. ${
      event.sentiment > 0 
        ? ['Bullish! 🚀', 'Looking strong! 📈', 'Great potential! ⭐'][Math.floor(Math.random() * 3)]
        : event.sentiment < 0
        ? ['Concerning... 📉', 'Need to watch this 👀', 'Stay cautious 🔍'][Math.floor(Math.random() * 3)]
        : ['Interesting development 🤔', 'Worth monitoring 📊', 'Keep an eye on this 👁️'][Math.floor(Math.random() * 3)]
    }`;

    return {
      text,
      source: isTwitter ? 'twitter' : 'reddit',
      user: username,
      timestamp: `${timeAgo}m ago`,
      sentiment: event.sentiment,
      relevance: 0.7 + Math.random() * 0.3,
      url: isTwitter 
        ? `https://twitter.com/example/status/${Math.random().toString(36).substr(2, 9)}`
        : `https://reddit.com/r/stocks/comments/${Math.random().toString(36).substr(2, 9)}`
    };
  };

  const fetchSocialData = async () => {
    if (!loading) setLoading(true);
    try {
      // Get ticker-specific events
      const events = tickerEvents[ticker as keyof typeof tickerEvents] || tickerEvents.AAPL;
      
      // Generate 5 posts with different timestamps
      const mockPosts: SocialPost[] = events.map((event, index) => 
        generateTickerSpecificPost(ticker, event, Math.floor(Math.random() * 30) + index * 15)
      );

      // Sort by timestamp (most recent first)
      mockPosts.sort((a, b) => 
        parseInt(a.timestamp) - parseInt(b.timestamp)
      );
      
      setPosts(mockPosts);
      
      // Calculate overall sentiment
      const avgSentiment = mockPosts.reduce((acc, post) => acc + post.sentiment, 0) / mockPosts.length;
      setOverallSentiment(avgSentiment);
      
      // Determine trend
      setSentimentTrend(avgSentiment > 0.1 ? 'up' : avgSentiment < -0.1 ? 'down' : 'neutral');
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch social data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialData();
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(fetchSocialData, refreshInterval);
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
    labels: ['7 Days Ago', '6 Days Ago', '5 Days Ago', '4 Days Ago', '3 Days Ago', '2 Days Ago', 'Today'],
    datasets: [
      {
        label: 'Social Sentiment',
        data: [0.2, 0.15, -0.1, -0.3, 0.1, 0.4, overallSentiment],
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

  const getSourceIcon = (source: string) => {
    return source === 'twitter' ? 
      <Twitter className="w-4 h-4 text-blue-400" /> : 
      <MessageCircle className="w-4 h-4 text-orange-400" />;
  };

  const getTimeUntilNextUpdate = () => {
    if (!autoRefresh) return 'Auto-refresh disabled';
    const nextUpdate = new Date(lastUpdate.getTime() + refreshInterval);
    const diff = nextUpdate.getTime() - Date.now();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `Next update in ${minutes}m ${seconds}s`;
  };

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
              className="border-b border-gray-700/50 pb-4 last:border-0 last:pb-0 hover:bg-gray-700/20 p-3 rounded-lg transition-all duration-200 hover:scale-[1.01] transform"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center text-sm">
                  {getSourceIcon(post.source)}
                  <span className="ml-2 text-gray-300">{post.user}</span>
                  <span className="ml-2 text-gray-500">• {post.timestamp}</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs ${getSentimentColor(post.sentiment)} bg-opacity-20`}>
                  {getSentimentScore(post.sentiment)}
                </div>
              </div>
              <p className="text-gray-300 mb-2">{post.text}</p>
              <div className="flex items-center justify-end text-xs text-gray-500">
                <span>Relevance: {(post.relevance * 100).toFixed(0)}%</span>
                <a 
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 text-blue-400 hover:text-blue-300 flex items-center hover:scale-105 transform duration-200"
                >
                  View thread <ArrowRight className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocialSentiment;