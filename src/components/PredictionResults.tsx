import React, { useState, useEffect } from 'react';
import { AreaChart } from './Charts';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, AlertTriangle, BarChart2, Calendar, BarChart, Loader2 } from 'lucide-react';
import { fetchMarketData } from '../services/api';

interface PredictionResultsProps {
  data: any;
}

const PredictionResults: React.FC<PredictionResultsProps> = ({ data }) => {
  const [showDailyDetails, setShowDailyDetails] = useState(false);
  const [marketData, setMarketData] = useState<any>(null);
  const [marketLoading, setMarketLoading] = useState(true);

  useEffect(() => {
    const getMarketData = async () => {
      try {
        const data = await fetchMarketData();
        setMarketData(data);
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      } finally {
        setMarketLoading(false);
      }
    };

    getMarketData();
    const interval = setInterval(getMarketData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (!data || !data.predictions || data.predictions.length === 0) {
    return null;
  }

  const firstPrice = data.predictions[0];
  const lastPrice = data.predictions[data.predictions.length - 1];
  const priceChange = lastPrice - firstPrice;
  const percentChange = (priceChange / firstPrice) * 100;
  const isPositive = priceChange >= 0;

  // Combine historical and prediction data for the chart
  const allPrices = [...data.historical, ...data.predictions];
  const historicalDates = Array.from({ length: data.historical.length }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (data.historical.length - i));
    return date;
  });

  // Generate future dates (market days only)
  const getFutureDates = (startDate: Date, numDays: number) => {
    const dates = [];
    let currentDate = new Date(startDate);
    
    while (dates.length < numDays) {
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const futureDates = getFutureDates(new Date(), data.predictions.length);
  const allDates = [...historicalDates, ...futureDates];

  // Calculate confidence band (±2% of predicted values)
  const confidenceUpper = data.predictions.map(val => val * 1.02);
  const confidenceLower = data.predictions.map(val => val * 0.98);

  const chartData = {
    labels: allDates.map(date => date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })),
    datasets: [
      {
        label: 'Historical Price',
        data: [...data.historical, null],
        borderColor: 'rgb(148, 163, 184)',
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Predicted Price',
        data: [...Array(data.historical.length).fill(null), ...data.predictions],
        borderColor: isPositive ? 'rgb(94, 234, 212)' : 'rgb(251, 113, 133)',
        backgroundColor: isPositive ? 'rgba(94, 234, 212, 0.2)' : 'rgba(251, 113, 133, 0.2)',
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Upper Confidence',
        data: [...Array(data.historical.length).fill(null), ...confidenceUpper],
        borderColor: 'rgba(148, 163, 184, 0.5)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Lower Confidence',
        data: [...Array(data.historical.length).fill(null), ...confidenceLower],
        borderColor: 'rgba(148, 163, 184, 0.5)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
        fill: {
          target: '-2',
          above: 'rgba(148, 163, 184, 0.05)',
        }
      }
    ],
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Market Indices Overview */}
      {marketData && (
        <div className="bg-gray-800/80 rounded-xl p-5 border border-gray-700/50 shadow-lg backdrop-blur-sm">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-cyan-400" />
            Market Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(marketData.indices || {}).map(([name, data]: [string, any]) => (
              <div key={name} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50">
                <div className="text-sm text-gray-400 mb-1">{name}</div>
                <div className="text-xl font-bold">{data.value.toLocaleString()}</div>
                <div className={`flex items-center text-sm ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.change >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {data.change >= 0 ? '+' : ''}{data.change}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prediction Results */}
      <div className="bg-gray-800/80 rounded-xl p-5 border border-gray-700/50 shadow-lg backdrop-blur-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="col-span-1 lg:col-span-2">
            <div className="mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span>${data.ticker}</span>
                <span className={`text-sm px-3 py-1 rounded-full ${
                  isPositive ? 'bg-teal-500/20 text-teal-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {isPositive ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />}
                  {Math.abs(percentChange).toFixed(2)}%
                </span>
              </h3>
              <p className="text-gray-400 text-sm">Historical data and future predictions based on ML models</p>
            </div>

            <div className="h-[300px] relative">
              <AreaChart data={chartData} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 backdrop-blur-sm">
              <h4 className="text-gray-400 text-sm mb-1">Latest Prediction</h4>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold">${lastPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</p>
                  <p className={`text-sm ${isPositive ? 'text-teal-300' : 'text-rose-300'} flex items-center`}>
                    {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {isPositive ? '+' : ''}{priceChange.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} ({Math.abs(percentChange).toFixed(2)}%)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Confidence Range</p>
                  <p className="text-sm font-medium">
                    ${confidenceLower[confidenceLower.length-1].toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} - ${confidenceUpper[confidenceUpper.length-1].toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-gray-400 text-sm">Trend Strength</h4>
                  <BarChart2 className="w-4 h-4 text-violet-400" />
                </div>
                <p className="text-lg font-bold">{Math.abs(data.metrics?.trend || 0).toFixed(1)}%</p>
              </div>

              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-gray-400 text-sm">Volatility</h4>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-lg font-bold">{(data.metrics?.volatility || 0).toFixed(1)}%</p>
              </div>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 backdrop-blur-sm">
              <h4 className="text-gray-400 text-sm mb-2">Technical Indicators</h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-fuchsia-400"></span>
                  RSI: {data.metrics?.rsi?.toFixed(2) || 'N/A'}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  Trend: {data.metrics?.trend >= 0 ? 'Bullish' : 'Bearish'}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Volatility: {data.metrics?.volatility < 1 ? 'Low' : data.metrics?.volatility < 2 ? 'Medium' : 'High'}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-700/50 pt-6">
          <button
            onClick={() => setShowDailyDetails(!showDailyDetails)}
            className="flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors mb-4"
          >
            <Calendar className="w-4 h-4" />
            {showDailyDetails ? 'Hide' : 'Show'} Daily Predictions
          </button>

          {showDailyDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.predictions.map((price: number, index: number) => {
                  const dayChange = index > 0 
                    ? ((price - data.predictions[index - 1]) / data.predictions[index - 1]) * 100
                    : ((price - data.historical[data.historical.length - 1]) / data.historical[data.historical.length - 1]) * 100;
                  const isPositive = dayChange >= 0;

                  return (
                    <div key={index} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 backdrop-blur-sm hover:bg-gray-700/40 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm text-gray-400">
                          {futureDates[index].toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          isPositive ? 'bg-teal-500/20 text-teal-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {isPositive ? '+' : ''}{dayChange.toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-xl font-bold mb-2">
                        ${price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="text-gray-400">Confidence Range:</div>
                        <div>
                          ${confidenceLower[index].toFixed(2)} - ${confidenceUpper[index].toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictionResults;