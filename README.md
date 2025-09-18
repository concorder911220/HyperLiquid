# HyperLiquid Trading Dashboard

A real-time trading dashboard built with Node.js backend and React (Vite) frontend, integrating with the HyperLiquid API to provide order book visualization and trade history analysis.

## Features

### Test 1: Real-time Order Book
- **Pixel-perfect implementation** of the provided Figma design
- **Real-time WebSocket connection** to HyperLiquid API for live market data
- **Interactive order book** with bid/ask visualization
- **Responsive design** with dark theme matching the specification
- **Symbol selection** dropdown (AVAX, BTC, ETH)

### Test 2: Trade History Analysis
- **Wallet address input** for querying user trade history
- **Completed perpetual trades reconstruction** from HyperLiquid API data
- **Comprehensive trade analysis** including:
  - Coin/Symbol (ETH, BTC, etc.)
  - Direction (Long/Short)
  - Position open time
  - Position duration (formatted as days/hours/minutes)
  - Realized PnL in USD
  - Entry and exit prices

## Tech Stack

- **Backend**: Node.js, Express, WebSocket (ws)
- **Frontend**: React 19, TypeScript, Vite
- **API Integration**: HyperLiquid REST API and WebSocket
- **Styling**: Custom CSS with dark theme

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd HyperLiquid
   ```

2. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**:
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the backend server** (in the `backend` directory):
   ```bash
   npm start
   ```
   The backend will run on `http://localhost:3001` with WebSocket on port `8080`

2. **Start the frontend development server** (in the `frontend` directory):
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

3. **Access the application**:
   Open your browser and navigate to `http://localhost:5173`

## API Endpoints

### Backend REST API

- `GET /api/orderbook/:symbol` - Get initial order book data for a symbol
- `POST /api/user-trades` - Get user's completed perpetual trades
  ```json
  {
    "walletAddress": "0x..."
  }
  ```
- `GET /api/assets` - Get available trading assets

### WebSocket

- **URL**: `ws://localhost:8080`
- **Real-time order book updates** pushed to connected clients
- **Automatic reconnection** on connection loss

## Usage

### Order Book View
1. Select the "Order Book" tab in the main navigation
2. View real-time bid/ask data for AVAX (default)
3. Click on price levels to select them
4. Change symbols using the dropdown (AVAX/BTC/ETH)

### Trade History View
1. Select the "Trade History" tab in the main navigation
2. Enter a HyperLiquid wallet address (0x...)
3. Click "Get Trades" to fetch and analyze the trade history
4. View completed trades with detailed PnL analysis

## Architecture

### Backend (`backend/server.js`)
- **Express server** handling REST API requests
- **WebSocket proxy** connecting to HyperLiquid's WebSocket API
- **Trade analysis engine** reconstructing completed positions
- **CORS enabled** for frontend communication

### Frontend Components
- **App.tsx** - Main application with tab navigation
- **OrderBook.tsx** - Real-time order book component
- **TradeHistory.tsx** - Trade history analysis interface
- **Custom CSS** - Dark theme styling matching Figma design

## HyperLiquid API Integration

### Order Book Data
- **WebSocket**: `wss://api.hyperliquid.xyz/ws`
- **Subscription**: `l2Book` for order book levels
- **REST fallback**: `https://api.hyperliquid.xyz/info` for initial data

### Trade History Data
- **User Fills**: `userFills` endpoint for completed trades
- **Clearinghouse State**: `clearinghouseState` for position data
- **Custom logic** to match opening/closing trades and calculate PnL

## Development

### Backend Development
```bash
cd backend
npm run dev  # Start with auto-reload
```

### Frontend Development  
```bash
cd frontend
npm run dev  # Start Vite dev server with HMR
```

### Building for Production
```bash
cd frontend
npm run build  # Build optimized frontend bundle
```

## Troubleshooting

1. **WebSocket connection issues**:
   - Ensure backend is running on port 3001
   - Check that WebSocket server is on port 8080
   - Verify firewall settings

2. **API rate limits**:
   - HyperLiquid API has rate limits
   - Implement request throttling if needed

3. **CORS issues**:
   - Backend includes CORS middleware
   - Ensure frontend is making requests to correct backend URL

