const express = require('express');
const cors = require('cors');
const axios = require('axios');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// HyperLiquid API endpoints
const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz/info';
const HYPERLIQUID_WS_URL = 'wss://api.hyperliquid.xyz/ws';

// Store active WebSocket connections
const clients = new Set();

// WebSocket server for frontend connections
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Frontend client connected');
  clients.add(ws);

  ws.on('close', () => {
    console.log('Frontend client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// HyperLiquid WebSocket connection for order book data
let hyperLiquidWS = null;

function connectToHyperLiquid() {
  hyperLiquidWS = new WebSocket(HYPERLIQUID_WS_URL);

  hyperLiquidWS.on('open', () => {
    console.log('Connected to HyperLiquid WebSocket');
    
    // Subscribe to order book for AVAX (you can change this to any symbol)
    const subscribeMessage = {
      method: 'subscribe',
      subscription: {
        type: 'l2Book',
        coin: 'AVAX'
      }
    };
    
    hyperLiquidWS.send(JSON.stringify(subscribeMessage));
    
    // Also subscribe to all book updates
    const allBooksMessage = {
      method: 'subscribe',
      subscription: {
        type: 'allMids'
      }
    };
    
    hyperLiquidWS.send(JSON.stringify(allBooksMessage));
  });

  hyperLiquidWS.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received WebSocket message:', JSON.stringify(message, null, 2));
      
      // Forward order book updates to all connected frontend clients
      if (message.channel === 'l2Book' || message.data) {
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'orderbook',
              data: message.data || message
            }));
          }
        });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  hyperLiquidWS.on('close', () => {
    console.log('HyperLiquid WebSocket connection closed. Attempting to reconnect...');
    setTimeout(connectToHyperLiquid, 5000);
  });

  hyperLiquidWS.on('error', (error) => {
    console.error('HyperLiquid WebSocket error:', error);
  });
}

// Initialize HyperLiquid WebSocket connection
connectToHyperLiquid();

// REST API Endpoints

// Get initial order book data
app.get('/api/orderbook/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.post(HYPERLIQUID_API_URL, {
      type: 'l2Book',
      coin: symbol.toUpperCase()
    });
    
    console.log('HyperLiquid order book response:', JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching order book:', error);
    res.status(500).json({ error: 'Failed to fetch order book data' });
  }
});

// Debug endpoint to see raw HyperLiquid data
app.get('/api/debug/orderbook/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.post(HYPERLIQUID_API_URL, {
      type: 'l2Book',
      coin: symbol.toUpperCase()
    });
    
    res.json({
      raw: response.data,
      formatted: {
        timestamp: Date.now(),
        symbol: symbol.toUpperCase(),
        dataStructure: Object.keys(response.data),
        sampleLevels: Array.isArray(response.data.levels) ? response.data.levels.slice(0, 3) : 'No levels array'
      }
    });
  } catch (error) {
    console.error('Error fetching debug order book:', error);
    res.status(500).json({ error: 'Failed to fetch debug order book data' });
  }
});

// Get user trade history
app.post('/api/user-trades', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Validate address format (should be 0x followed by 40 hex characters)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ 
        error: 'Invalid wallet address format. Please use a valid HyperLiquid wallet address (0x format).' 
      });
    }

    // Get user fills (completed trades)
    const fillsResponse = await axios.post(HYPERLIQUID_API_URL, {
      type: 'userFills',
      user: walletAddress
    });

    // Get user positions
    const positionsResponse = await axios.post(HYPERLIQUID_API_URL, {
      type: 'clearinghouseState',
      user: walletAddress
    });

    // Process and analyze the trade data
    const processedTrades = await processTradeHistory(fillsResponse.data, positionsResponse.data);
    
    res.json({
      trades: processedTrades,
      totalTrades: processedTrades.length
    });
  } catch (error) {
    console.error('Error fetching user trades:', error);
    res.status(500).json({ error: 'Failed to fetch user trade history' });
  }
});

// Process trade history to reconstruct completed positions
async function processTradeHistory(fills, positions) {
  const completedTrades = [];
  const openPositions = new Map();

  // Sort fills by timestamp
  fills.sort((a, b) => new Date(a.time) - new Date(b.time));

  for (const fill of fills) {
    const coin = fill.coin;
    const size = parseFloat(fill.sz);
    const price = parseFloat(fill.px);
    const side = fill.side;
    const timestamp = new Date(fill.time);
    const fee = parseFloat(fill.fee || 0);

    const positionKey = coin;
    
    if (!openPositions.has(positionKey)) {
      // Opening a new position
      openPositions.set(positionKey, {
        coin,
        side,
        openTime: timestamp,
        openPrice: price,
        size: Math.abs(size),
        totalFees: fee,
        fills: [fill]
      });
    } else {
      const position = openPositions.get(positionKey);
      
      // Check if this is closing the position (opposite side)
      if ((position.side === 'B' && side === 'A') || (position.side === 'A' && side === 'B')) {
        const closeSize = Math.abs(size);
        
        if (closeSize >= position.size) {
          // Position fully closed
          const duration = timestamp - position.openTime;
          const entryValue = position.openPrice * position.size;
          const exitValue = price * position.size;
          
          let pnl;
          if (position.side === 'B') { // Long position
            pnl = exitValue - entryValue;
          } else { // Short position
            pnl = entryValue - exitValue;
          }
          
          pnl -= (position.totalFees + fee); // Subtract fees
          
          completedTrades.push({
            coin,
            direction: position.side === 'B' ? 'Long' : 'Short',
            openTime: position.openTime.toISOString(),
            closeTime: timestamp.toISOString(),
            duration: formatDuration(duration),
            durationMs: duration,
            openPrice: position.openPrice,
            closePrice: price,
            size: position.size,
            realizedPnL: pnl,
            totalFees: position.totalFees + fee
          });
          
          openPositions.delete(positionKey);
        } else {
          // Partial close
          position.size -= closeSize;
          position.totalFees += fee;
          position.fills.push(fill);
        }
      } else {
        // Adding to existing position (same side)
        const newSize = position.size + Math.abs(size);
        const newOpenPrice = ((position.openPrice * position.size) + (price * Math.abs(size))) / newSize;
        
        position.size = newSize;
        position.openPrice = newOpenPrice;
        position.totalFees += fee;
        position.fills.push(fill);
      }
    }
  }

  return completedTrades.sort((a, b) => new Date(b.closeTime) - new Date(a.closeTime));
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Get available assets/coins
app.get('/api/assets', async (req, res) => {
  try {
    const response = await axios.post(HYPERLIQUID_API_URL, {
      type: 'meta'
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on port 8080`);
});
