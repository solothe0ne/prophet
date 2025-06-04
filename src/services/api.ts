import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000';

// Add types for better type safety
export interface PredictionParams {
  ticker: string;
  days: number;
  startDate: string;
  endDate: string;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
}

export const fetchPrediction = async (params: PredictionParams) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/predict`, params);
    return response.data;
  } catch (error: any) {
    console.error('Prediction API error:', error);
    if (error.response) {
      throw new Error(error.response.data.error || 'Failed to fetch prediction');
    }
    throw new Error('Failed to connect to prediction service. Please ensure the Flask server is running.');
  }
};

export const fetchNews = async (symbol?: string) => {
  try {
    // Using Alpha Vantage News API
    const API_KEY = 'YOUR_ALPHA_VANTAGE_KEY'; // Replace with your key
    const topics = symbol ? `${symbol},stocks,market` : 'market,finance,stocks';
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=${topics}&apikey=${API_KEY}`
    );
    return response.data.feed || [];
  } catch (error) {
    console.error('News API error:', error);
    throw new Error('Failed to fetch news');
  }
};

export const fetchSocialSentiment = async (symbol: string) => {
  try {
    // Using StockTwits API
    const response = await axios.get(
      `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`
    );
    return response.data.messages || [];
  } catch (error) {
    console.error('Social API error:', error);
    throw new Error('Failed to fetch social sentiment');
  }
};

export const fetchMarketData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/market`);
    return response.data;
  } catch (error) {
    console.error('Market data API error:', error);
    throw new Error('Failed to fetch market data');
  }
};