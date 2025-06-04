import React, { useState } from 'react';
import { Hash, Timer, Calendar, Loader2 } from 'lucide-react';

interface PredictionFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const PredictionForm: React.FC<PredictionFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    ticker: '',
    days: 7,
    startDate: formatDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)), // 1 year ago
    endDate: formatDate(new Date()) // today
  });

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'ticker') {
      // Convert to uppercase and remove any non-alphanumeric characters except hyphen
      const cleanedValue = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      setFormData(prev => ({ ...prev, [name]: cleanedValue }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseInt(value) : value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ticker.trim()) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label htmlFor="ticker" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Hash className="h-4 w-4 text-cyan-400" />
            Ticker Symbol
          </label>
          <div className="relative">
            <input
              type="text"
              id="ticker"
              name="ticker"
              value={formData.ticker}
              onChange={handleChange}
              placeholder="e.g. AAPL, MSFT, GOOGL"
              required
              pattern="[A-Z0-9-]+"
              maxLength={10}
              className="w-full py-2.5 px-4 bg-gray-800/60 border border-gray-700 focus:border-cyan-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-gray-100 placeholder-gray-500 transition-all uppercase"
            />
            <div className="text-xs text-gray-400 mt-1">Enter a valid stock symbol (e.g., AAPL, MSFT)</div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="days" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Timer className="h-4 w-4 text-cyan-400" />
            Days to Predict
          </label>
          <input
            type="number"
            id="days"
            name="days"
            min="1"
            max="30"
            value={formData.days}
            onChange={handleChange}
            className="w-full py-2.5 px-4 bg-gray-800/60 border border-gray-700 focus:border-cyan-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-gray-100 placeholder-gray-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cyan-400" />
            Start Date (Training Data)
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            max={formData.endDate}
            className="w-full py-2.5 px-4 bg-gray-800/60 border border-gray-700 focus:border-cyan-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-gray-100 placeholder-gray-500 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cyan-400" />
            End Date (Training Data)
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            min={formData.startDate}
            max={formatDate(new Date())}
            className="w-full py-2.5 px-4 bg-gray-800/60 border border-gray-700 focus:border-cyan-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-gray-100 placeholder-gray-500 transition-all"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading || !formData.ticker.trim()}
          className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg shadow-blue-700/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Generate Prediction'
          )}
        </button>
      </div>
    </form>
  );
};

export default PredictionForm;