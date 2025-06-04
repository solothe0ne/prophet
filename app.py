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
MARKET_DATA_CACHE_DURATION = 60  # Cache duration in seconds

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
    # Add technical indicators
    df['RSI'] = ta.momentum.RSIIndicator(df['Close']).rsi()
    df['MACD'] = ta.trend.MACD(df['Close']).macd()
    df['BB_high'] = ta.volatility.BollingerBands(df['Close']).bollinger_hband()
    df['BB_low'] = ta.volatility.BollingerBands(df['Close']).bollinger_lband()
    df['ATR'] = ta.volatility.AverageTrueRange(df['High'], df['Low'], df['Close']).average_true_range()
    
    # Fill NaN values with forward fill, then backward fill
    df = df.fillna(method='ffill').fillna(method='bfill')
    return df

@lru_cache(maxsize=100)
def get_social_sentiment(ticker, limit=100):
    try:
        # Reddit sentiment
        reddit_posts = reddit.subreddit("wallstreetbets+stocks+investing").search(
            f"{ticker}", limit=limit, time_filter="week"
        )
        
        # Twitter sentiment
        tweets = twitter_client.search_recent_tweets(
            query=f"${ticker} -is:retweet lang:en",
            max_results=100
        )
        
        sentiment_scores = []
        
        # Analyze Reddit posts
        for post in reddit_posts:
            blob = TextBlob(post.title + " " + post.selftext)
            sentiment_scores.append(blob.sentiment.polarity)
        
        # Analyze tweets
        if tweets.data:
            for tweet in tweets.data:
                blob = TextBlob(tweet.text)
                sentiment_scores.append(blob.sentiment.polarity)
        
        if sentiment_scores:
            return sum(sentiment_scores) / len(sentiment_scores)
        return 0
    except Exception as e:
        print(f"Error in sentiment analysis: {str(e)}")
        return 0

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        ticker = data.get('ticker', '').strip().upper()
        days = int(data.get('days', 7))
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        
        # Input validation
        if not all([ticker, days, start_date, end_date]):
            return jsonify({"error": "Missing required parameters"}), 400
            
        if not validate_ticker(ticker):
            return jsonify({"error": "Invalid ticker symbol format"}), 400
            
        if days < 1 or days > 30:
            return jsonify({"error": "Days must be between 1 and 30"}), 400
        
        # Check cache
        cache_key = f"{ticker}_{start_date}_{end_date}_{days}"
        if cache_key in prediction_cache:
            return jsonify(prediction_cache[cache_key])
        
        # Fetch historical data
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
        
        # Calculate technical indicators
        hist = calculate_technical_indicators(hist)
        
        # Prepare data for LSTM
        lookback = 60
        X, y, scaler = prepare_data(hist['Close'].values, lookback)
        
        if len(X) == 0 or len(y) == 0:
            return jsonify({"error": "Failed to prepare training data"}), 500
        
        # Train LSTM model
        lstm_model = create_lstm_model((lookback, 1))
        lstm_model.fit(X, y, epochs=50, batch_size=32, verbose=0)
        
        # Prepare data for XGBoost
        features = ['RSI', 'MACD', 'ATR']
        X_xgb = hist[features].values
        y_xgb = hist['Close'].values[1:]  # Shift labels by 1 to predict next day
        
        # Ensure X and y have the same number of samples
        X_xgb = X_xgb[:-1]  # Remove last row to match y_xgb length
        
        if len(X_xgb) != len(y_xgb):
            return jsonify({"error": "Data preparation error: Feature/label mismatch"}), 500
        
        # Train XGBoost model
        xgb_model = XGBRegressor(objective='reg:squarederror')
        xgb_model.fit(X_xgb, y_xgb)
        
        # Get historical closing prices
        historical_prices = hist['Close'].tolist()
        
        # Make future predictions
        lstm_preds = []
        xgb_preds = []
        last_sequence = X[-1]
        last_features = hist[features].iloc[-1:].values
        
        for _ in range(days):
            # LSTM prediction
            lstm_pred = lstm_model.predict(last_sequence.reshape(1, lookback, 1))
            lstm_pred = scaler.inverse_transform(lstm_pred)[0][0]
            lstm_preds.append(lstm_pred)
            
            # Update sequence for next prediction
            last_sequence = np.roll(last_sequence, -1)
            last_sequence[-1] = scaler.transform([[lstm_pred]])[0][0]
            
            # XGBoost prediction
            xgb_pred = xgb_model.predict(last_features)[0]
            xgb_preds.append(xgb_pred)
            
            # Update features for next prediction (simplified)
            last_features = np.array([
                [50,  # Neutral RSI
                0,   # Neutral MACD
                hist['ATR'].mean()]  # Average ATR
            ])
        
        # Ensemble predictions (weighted average)
        future_predictions = [0.6 * lstm + 0.4 * xgb for lstm, xgb in zip(lstm_preds, xgb_preds)]
        
        # Get social sentiment
        sentiment = get_social_sentiment(ticker)
        
        # Adjust predictions based on sentiment
        sentiment_factor = 1 + (sentiment * 0.1)  # Max ±10% adjustment
        future_predictions = [p * sentiment_factor for p in future_predictions]
        
        response = {
            "ticker": ticker,
            "historical": historical_prices,
            "predictions": future_predictions,
            "metrics": {
                "trend": round(((future_predictions[-1] - future_predictions[0]) / future_predictions[0]) * 100, 2),
                "volatility": round(np.std(future_predictions) / np.mean(future_predictions) * 100, 2),
                "rsi": round(float(hist['RSI'].iloc[-1]), 2) if not pd.isna(hist['RSI'].iloc[-1]) else 50,
                "sentiment": round(sentiment, 2)
            }
        }
        
        # Cache the results
        prediction_cache[cache_key] = response
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({"error": str(e)}), 500

def validate_ticker(ticker):
    # Check if ticker is valid format (letters, numbers, and hyphens only)
    if not re.match("^[A-Z0-9-]+$", ticker):
        return False
    return True

@app.route('/market', methods=['GET'])
def market_data():
    try:
        current_time = datetime.now()
        
        # Check cache
        if 'data' in market_data_cache and 'timestamp' in market_data_cache:
            cache_age = (current_time - market_data_cache['timestamp']).total_seconds()
            if cache_age < MARKET_DATA_CACHE_DURATION:
                return jsonify(market_data_cache['data'])
        
        # Define major indices
        indices = {
            '^GSPC': 'S&P 500',
            '^IXIC': 'NASDAQ',
            '^DJI': 'DOW',
            '^RUT': 'RUSSELL 2000'
        }
        
        market_data = {
            "indices": {},
            "movers": {}
        }
        
        # Fetch real-time data for each index
        for symbol, name in indices.items():
            try:
                index = yf.Ticker(symbol)
                hist = index.history(period="1d")
                
                if not hist.empty:
                    current_price = hist['Close'].iloc[-1]
                    open_price = hist['Open'].iloc[0]
                    price_change = ((current_price - open_price) / open_price) * 100
                    
                    market_data["indices"][name] = {
                        "value": round(current_price, 2),
                        "change": round(price_change, 2)
                    }
                    
            except Exception as index_error:
                print(f"Error fetching data for {symbol}: {str(index_error)}")
                traceback.print_exc()
                continue
        
        # Get top gainers and losers
        try:
            market_data["movers"] = get_top_movers()
        except Exception as e:
            print(f"Error fetching top movers: {str(e)}")
            traceback.print_exc()
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
    # List of S&P 500 stocks (you might want to update this list periodically)
    sp500_tickers = [
        'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'BRK-B', 'XOM', 'UNH', 'JNJ',
        'JPM', 'V', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV', 'LLY', 'PFE',
        # Add more tickers as needed
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
    
    # Sort by absolute change percentage
    gainers.sort(key=lambda x: x['change'], reverse=True)
    losers.sort(key=lambda x: x['change'])
    
    return {
        "gainers": gainers[:5],  # Top 5 gainers
        "losers": losers[:5]     # Top 5 losers
    }

if __name__ == '__main__':
    app.run(debug=True)