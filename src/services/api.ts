import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface PredictionParams {
  ticker: string;
  days: number;
  startDate: string;
  endDate: string;
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

export const fetchRedditPosts = async (query: string = 'stocks') => {
  try {
    const response = await axios.get(`${API_BASE_URL}/reddit?q=${query}`);
    return response.data.posts;
  } catch (error) {
    console.error('Reddit API error:', error);
    throw new Error('Failed to fetch Reddit posts');
  }
};

export const fetchTwitterPosts = async (query: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/twitter?q=${query}`);
    return response.data.tweets;
  } catch (error) {
    console.error('Twitter API error:', error);
    throw new Error('Failed to fetch Twitter posts');
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