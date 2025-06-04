import React, { useEffect, useState } from 'react';
import { BarChart, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Loader2, ArrowRight } from 'lucide-react';
import { fetchMarketData } from '../services/api';

interface MarketOverviewProps {
  data: any;
}

const MarketOverview: React.FC<MarketOverviewProps> = ({ data }) => {
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const updateMarketData = async () => {
      try {
        const newData = await fetchMarketData();
        setMarketData(newData);
        setLastUpdate(new Date());
        setError(null);
        setLoading(false);
      } catch (error) {
        console.error('Failed to update market data:', error);
        setError('Failed to fetch market data. Please try again later.');
        setLoading(false);
      }
    };

    updateMarketData();
    // Update every minute
    const interval = setInterval(updateMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    const minutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 text-red-300 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-gray-800/60 rounded-lg p-5 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center">
              <BarChart className="w-5 h-5 text-cyan-400 mr-2" />
              Market Indices
            </h3>
            <div className="text-sm text-gray-400">
              Last updated: {formatTime(lastUpdate)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(marketData?.indices || {}).map(([name, data]: [string, any], i) => (
              <div key={i} className="bg-gray-700/30 rounded-lg p-3 hover:bg-gray-700/40 transition-all">
                <div className="text-xs text-gray-400 mb-1">{name}</div>
                <div className="text-lg font-semibold">{data.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</div>
                <div className={`text-sm flex items-center ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.change >= 0 ? 
                    <TrendingUp className="w-3 h-3 mr-1" /> : 
                    <TrendingDown className="w-3 h-3 mr-1" />
                  }
                  {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-gray-800/60 rounded-lg p-5 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center">
              <ArrowUpRight className="w-5 h-5 text-green-400 mr-2" />
              Top Gainers
            </h3>
          </div>
          
          <div className="space-y-3">
            {marketData?.movers?.gainers?.map((stock: any, i: number) => (
              <div key={i} className="flex items-center justify-between hover:bg-gray-700/20 p-2 rounded-lg transition-all">
                <div>
                  <div className="font-medium">{stock.symbol}</div>
                  <div className="text-xs text-gray-400">{stock.name}</div>
                </div>
                <div className="text-right">
                  <div>${stock.price}</div>
                  <div className="text-green-400 text-sm">+{stock.change}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-800/60 rounded-lg p-5 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center">
              <ArrowDownRight className="w-5 h-5 text-red-400 mr-2" />
              Top Losers
            </h3>
          </div>
          
          <div className="space-y-3">
            {marketData?.movers?.losers?.map((stock: any, i: number) => (
              <div key={i} className="flex items-center justify-between hover:bg-gray-700/20 p-2 rounded-lg transition-all">
                <div>
                  <div className="font-medium">{stock.symbol}</div>
                  <div className="text-xs text-gray-400">{stock.name}</div>
                </div>
                <div className="text-right">
                  <div>${stock.price}</div>
                  <div className="text-red-400 text-sm">{stock.change}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;