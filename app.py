from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
from datetime import datetime, timedelta
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import pandas as pd
import re
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from xgboost import XGBRegressor
from textblob import TextBlob
import praw
import tweepy
import os
from dotenv import load_dotenv
import pickle
from functools import lru_cache
import ta
import traceback
import requests
from bs4 import BeautifulSoup
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Reddit API
reddit = praw.Reddit(
    client_id=os.getenv('REDDIT_CLIENT_ID'),
    client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
    user_agent="stock_sentiment_analyzer"
)

# Initialize Twitter API
twitter_client = tweepy.Client(
    bearer_token=os.getenv('TWITTER_BEARER_TOKEN')
)

# Cache for model predictions and market data
prediction_cache = {}
market_data_cache = {}
news_cache = {}
social_cache = {}
CACHE_DURATION = 300  # 5 minutes

# Market indices to track
MARKET_INDICES = {
    '^GSPC': 'S&P 500',
    '^DJI': 'Dow Jones',
    '^IXIC': 'NASDAQ',
    '^RUT': 'Russell 2000',
    '^VIX': 'VIX',
    '^FTSE': 'FTSE 100',
    '^N225': 'Nikkei 225'
}

def create_lstm_model(input_shape):
    model = Sequential([
        LSTM(50, return_sequences=True, input_shape=input_shape),
        Dropout(0.2),
        LSTM(50, return_sequences=False),
        Dropout(0.2),
        Dense(25),
        Dense(1)
    ])
    model.compile(optimizer='adam', loss='mse')
    return model

def prepare_data(data, lookback=60):
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(data.reshape(-1, 1))
    
    X, y = [], []
    for i in range(lookback, len(scaled_data)):
        X.append(scaled_data[i-lookback:i])
        y.append(scaled_data[i])
    
    return np.array(X), np.array(y), scaler

def calculate_technical_indicators(df):
    df['RSI'] = ta.momentum.RSIIndicator(df['Close']).rsi()
    df['MACD'] = ta.trend.MACD(df['Close']).macd()
    df['BB_high'] = ta.volatility.BollingerBands(df['Close']).bollinger_hband()
    df['BB_low'] = ta.volatility.BollingerBands(df['Close']).bollinger_lband()
    df['ATR'] = ta.volatility.AverageTrueRange(df['High'], df['Low'], df['Close']).average_true_range()
    df = df.fillna(method='ffill').fillna(method='bfill')
    return df

@app.route('/news', methods=['GET'])
def get_news():
    try:
        symbol = request.args.get('symbol')
        cache_key = f"news_{symbol if symbol else 'general'}"
        
        # Check cache
        if cache_key in news_cache:
            cache_time, cached_data = news_cache[cache_key]
            if (datetime.now() - cache_time).seconds < CACHE_DURATION:
                return jsonify(cached_data)
        
        # Fetch fresh news from Alpha Vantage
        api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        topics = f"{symbol},stocks,market" if symbol else "market,finance,stocks"
        url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics={topics}&apikey={api_key}'
        
        response = requests.get(url)
        data = response.json()
        news = data.get('feed', [])
        
        # Cache the results
        news_cache[cache_key] = (datetime.now(), news)
        
        return jsonify(news)
    except Exception as e:
        print(f"News API error: {str(e)}")
        return jsonify({"error": "Failed to fetch news"}), 500

@app.route('/social', methods=['GET'])
def get_social():
    try:
        symbol = request.args.get('symbol')
        if not symbol:
            return jsonify({"error": "Symbol parameter is required"}), 400
            
        cache_key = f"social_{symbol}"
        
        # Check cache
        if cache_key in social_cache:
            cache_time, cached_data = social_cache[cache_key]
            if (datetime.now() - cache_time).seconds < CACHE_DURATION:
                return jsonify(cached_data)
        
        # Fetch StockTwits data
        url = f'https://api.stocktwits.com/api/2/streams/symbol/{symbol}.json'
        response = requests.get(url)
        data = response.json()
        messages = data.get('messages', [])
        
        # Cache the results
        social_cache[cache_key] = (datetime.now(), messages)
        
        return jsonify(messages)
    except Exception as e:
        print(f"Social API error: {str(e)}")
        return jsonify({"error": "Failed to fetch social data"}), 500

def fetch_financial_news():
    try:
        # Using Alpha Vantage News API
        api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=market,finance,stocks&apikey={api_key}'
        response = requests.get(url)
        data = response.json()
        return data.get('feed', [])
    except Exception as e:
        print(f"Error fetching news: {str(e)}")
        return []

def fetch_social_sentiment(symbol):
    try:
        # Using StockTwits API
        url = f'https://api.stocktwits.com/api/2/streams/symbol/{symbol}.json'
        response = requests.get(url)
        data = response.json()
        return data.get('messages', [])
    except Exception as e:
        print(f"Error fetching social sentiment: {str(e)}")
        return []

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        ticker = data.get('ticker', '').strip().upper()
        days = int(data.get('days', 7))
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        
        if not all([ticker, days, start_date, end_date]):
            return jsonify({"error": "Missing required parameters"}), 400
            
        if not validate_ticker(ticker):
            return jsonify({"error": "Invalid ticker symbol format"}), 400
            
        if days < 1 or days > 30:
            return jsonify({"error": "Days must be between 1 and 30"}), 400
        
        cache_key = f"{ticker}_{start_date}_{end_date}_{days}"
        if cache_key in prediction_cache:
            return jsonify(prediction_cache[cache_key])
        
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(start=start_date, end=end_date)
            
            if hist.empty:
                return jsonify({"error": f"No data found for ticker {ticker}"}), 404
                
            if len(hist) < 60:
                return jsonify({"error": f"Insufficient historical data for {ticker}. Need at least 60 days."}), 400
                
        except Exception as e:
            print(f"Error fetching data for {ticker}: {str(e)}")
            return jsonify({"error": f"Failed to fetch data for {ticker}"}), 404
        
        hist = calculate_technical_indicators(hist)
        
        lookback = 60
        X, y, scaler = prepare_data(hist['Close'].values, lookback)
        
        if len(X) == 0 or len(y) == 0:
            return jsonify({"error": "Failed to prepare training data"}), 500
        
        lstm_model = create_lstm_model((lookback, 1))
        lstm_model.fit(X, y, epochs=50, batch_size=32, verbose=0)
        
        features = ['RSI', 'MACD', 'ATR']
        X_xgb = hist[features].values
        y_xgb = hist['Close'].values[1:]
        
        X_xgb = X_xgb[:-1]
        
        if len(X_xgb) != len(y_xgb):
            return jsonify({"error": "Data preparation error: Feature/label mismatch"}), 500
        
        xgb_model = XGBRegressor(objective='reg:squarederror')
        xgb_model.fit(X_xgb, y_xgb)
        
        historical_prices = hist['Close'].tolist()
        
        lstm_preds = []
        xgb_preds = []
        last_sequence = X[-1]
        last_features = hist[features].iloc[-1:].values
        
        for _ in range(days):
            lstm_pred = lstm_model.predict(last_sequence.reshape(1, lookback, 1))
            lstm_pred = scaler.inverse_transform(lstm_pred)[0][0]
            lstm_preds.append(lstm_pred)
            
            last_sequence = np.roll(last_sequence, -1)
            last_sequence[-1] = scaler.transform([[lstm_pred]])[0][0]
            
            xgb_pred = xgb_model.predict(last_features)[0]
            xgb_preds.append(xgb_pred)
            
            last_features = np.array([
                [50, 0, hist['ATR'].mean()]
            ])
        
        future_predictions = [0.6 * lstm + 0.4 * xgb for lstm, xgb in zip(lstm_preds, xgb_preds)]
        
        # Fetch additional data
        news = fetch_financial_news()
        social_sentiment = fetch_social_sentiment(ticker)
        
        response = {
            "ticker": ticker,
            "historical": historical_prices,
            "predictions": future_predictions,
            "metrics": {
                "trend": round(((future_predictions[-1] - future_predictions[0]) / future_predictions[0]) * 100, 2),
                "volatility": round(np.std(future_predictions) / np.mean(future_predictions) * 100, 2),
                "rsi": round(float(hist['RSI'].iloc[-1]), 2) if not pd.isna(hist['RSI'].iloc[-1]) else 50,
            },
            "news": news[:10],  # Latest 10 news articles
            "social": social_sentiment[:10]  # Latest 10 social posts
        }
        
        prediction_cache[cache_key] = response
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({"error": str(e)}), 500

def validate_ticker(ticker):
    if not re.match("^[A-Z0-9-]+$", ticker):
        return False
    return True

@app.route('/market', methods=['GET'])
def market_data():
    try:
        current_time = datetime.now()
        
        if 'data' in market_data_cache and 'timestamp' in market_data_cache:
            cache_age = (current_time - market_data_cache['timestamp']).total_seconds()
            if cache_age < CACHE_DURATION:
                return jsonify(market_data_cache['data'])
        
        market_data = {
            "indices": {},
            "predictions": {},
            "movers": {}
        }
        
        # Fetch and predict for each index
        for symbol, name in MARKET_INDICES.items():
            try:
                index = yf.Ticker(symbol)
                hist = index.history(period="1y")  # Get 1 year of historical data
                
                if not hist.empty:
                    current_price = hist['Close'].iloc[-1]
                    open_price = hist['Open'].iloc[-1]
                    price_change = ((current_price - open_price) / open_price) * 100
                    
                    # Calculate predictions for indices
                    hist = calculate_technical_indicators(hist)
                    lookback = 60
                    X, y, scaler = prepare_data(hist['Close'].values[-lookback:], lookback)
                    
                    if len(X) > 0:
                        lstm_model = create_lstm_model((lookback, 1))
                        lstm_model.fit(X, y, epochs=50, batch_size=32, verbose=0)
                        
                        # Predict next 5 days
                        predictions = []
                        last_sequence = X[-1]
                        
                        for _ in range(5):
                            pred = lstm_model.predict(last_sequence.reshape(1, lookback, 1))
                            pred = scaler.inverse_transform(pred)[0][0]
                            predictions.append(pred)
                            
                            last_sequence = np.roll(last_sequence, -1)
                            last_sequence[-1] = scaler.transform([[pred]])[0][0]
                        
                        market_data["indices"][name] = {
                            "value": round(current_price, 2),
                            "change": round(price_change, 2)
                        }
                        
                        market_data["predictions"][name] = {
                            "current": round(current_price, 2),
                            "forecast": [round(p, 2) for p in predictions],
                            "trend": round(((predictions[-1] - predictions[0]) / predictions[0]) * 100, 2)
                        }
                    
            except Exception as index_error:
                print(f"Error processing {symbol}: {str(index_error)}")
                continue
        
        try:
            market_data["movers"] = get_top_movers()
        except Exception as e:
            print(f"Error fetching top movers: {str(e)}")
            market_data["movers"] = {"gainers": [], "losers": []}
        
        if not market_data["indices"]:
            return jsonify({"error": "Unable to fetch market data"}), 500
        
        # Update cache
        market_data_cache['data'] = market_data
        market_data_cache['timestamp'] = current_time
            
        return jsonify(market_data)
        
    except Exception as e:
        print(f"Market data error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch market data"}), 500

def get_top_movers():
    sp500_tickers = [
        'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'BRK-B', 'XOM', 'UNH', 'JNJ',
        'JPM', 'V', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV', 'LLY', 'PFE'
    ]
    
    gainers = []
    losers = []
    
    for ticker in sp500_tickers:
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period="1d")
            
            if not hist.empty:
                current_price = hist['Close'].iloc[-1]
                open_price = hist['Open'].iloc[0]
                price_change = ((current_price - open_price) / open_price) * 100
                
                info = stock.info
                company_name = info.get('longName', ticker)
                
                stock_data = {
                    "symbol": ticker,
                    "name": company_name,
                    "price": round(current_price, 2),
                    "change": round(price_change, 2)
                }
                
                if price_change > 0:
                    gainers.append(stock_data)
                else:
                    losers.append(stock_data)
                    
        except Exception as e:
            print(f"Error fetching data for {ticker}: {str(e)}")
            continue
    
    gainers.sort(key=lambda x: x['change'], reverse=True)
    losers.sort(key=lambda x: x['change'])
    
    return {
        "gainers": gainers[:5],
        "losers": losers[:5]
    }

if __name__ == '__main__':
    app.run(debug=True)