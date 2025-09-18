import React, { useState, useEffect, useRef } from 'react';
import './OrderBook.css';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

interface OrderBookProps {
  symbol?: string;
}

const OrderBook: React.FC<OrderBookProps> = ({ symbol = 'AVAX' }) => {
  const [orderBookData, setOrderBookData] = useState<OrderBookData>({ bids: [], asks: [] });
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'orderbook' | 'trades'>('orderbook');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to backend WebSocket
    const connectWebSocket = () => {
      wsRef.current = new WebSocket('ws://localhost:8080');

      wsRef.current.onopen = () => {
        console.log('Connected to backend WebSocket');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Frontend received WebSocket message:', message);
          if (message.type === 'orderbook') {
            updateOrderBook(message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    // Start with realistic AVAX pricing for immediate display
    generateMockOrderBook();
    
    // Initial order book fetch
    fetchInitialOrderBook();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol]);

  const fetchInitialOrderBook = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/orderbook/${symbol}`);
      const data = await response.json();
      updateOrderBook(data);
    } catch (error) {
      console.error('Error fetching initial order book:', error);
    }
  };

  const updateOrderBook = (data: any) => {
    console.log('Updating order book with data:', data);
    
    // Handle HyperLiquid data structure
    if (data && data.levels && Array.isArray(data.levels) && data.levels.length >= 2) {
      const bidsRaw = data.levels[0] || []; // First array is bids
      const asksRaw = data.levels[1] || []; // Second array is asks
      
      const asks: OrderBookEntry[] = [];
      const bids: OrderBookEntry[] = [];

      // Process asks (sell orders)
      asksRaw.forEach((level: any) => {
        if (level.px && level.sz) {
          const price = parseFloat(level.px);
          const size = parseFloat(level.sz);
          
          if (!isNaN(price) && !isNaN(size) && size > 0) {
            const total = price * size;
            asks.push({ 
              price: parseFloat(price.toFixed(3)), 
              size: parseFloat(size.toFixed(2)), 
              total: parseFloat(total.toFixed(2)) 
            });
          }
        }
      });

      // Process bids (buy orders)
      bidsRaw.forEach((level: any) => {
        if (level.px && level.sz) {
          const price = parseFloat(level.px);
          const size = parseFloat(level.sz);
          
          if (!isNaN(price) && !isNaN(size) && size > 0) {
            const total = price * size;
            bids.push({ 
              price: parseFloat(price.toFixed(3)), 
              size: parseFloat(size.toFixed(2)), 
              total: parseFloat(total.toFixed(2)) 
            });
          }
        }
      });

      // Sort asks ascending (lowest price first) and bids descending (highest price first)
      asks.sort((a, b) => a.price - b.price);
      bids.sort((a, b) => b.price - a.price);

      // Update state with real data
      setOrderBookData({ 
        asks: asks.slice(0, 10), 
        bids: bids.slice(0, 10) 
      });
      
      console.log('Updated with real HyperLiquid data:', { 
        asksCount: asks.length, 
        bidsCount: bids.length,
        sampleAsk: asks[0],
        sampleBid: bids[0]
      });
    } else {
      console.log('Invalid data structure, using fallback mock data');
      generateMockOrderBook();
    }
  };

  const generateMockOrderBook = () => {
    // Use realistic AVAX pricing based on current market
    const basePrice = 32.93; 
    const asks: OrderBookEntry[] = [];
    const bids: OrderBookEntry[] = [];

    // Generate asks (sell orders) - higher prices
    for (let i = 0; i < 11; i++) {
      const price = basePrice + (i * 0.001);
      const size = Math.random() * 100 + 50;
      asks.push({
        price: parseFloat(price.toFixed(3)),
        size: parseFloat(size.toFixed(2)),
        total: parseFloat((price * size).toFixed(2))
      });
    }

    // Generate bids (buy orders) - lower prices  
    for (let i = 0; i < 11; i++) {
      const price = basePrice - ((i + 1) * 0.001);
      const size = Math.random() * 100 + 50;
      bids.push({
        price: parseFloat(price.toFixed(3)),
        size: parseFloat(size.toFixed(2)),
        total: parseFloat((price * size).toFixed(2))
      });
    }

    setOrderBookData({ asks, bids });
  };

  const handlePriceClick = (price: number) => {
    setSelectedPrice(price);
  };

  const formatPrice = (price: number) => {
    return price.toFixed(3);
  };

  const formatSize = (size: number) => {
    return size.toFixed(2);
  };

  const formatTotal = (total: number) => {
    return total.toFixed(2);
  };

  return (
    <div className="order-book">
      <div className="order-book-header">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'orderbook' ? 'active' : ''}`}
            onClick={() => setActiveTab('orderbook')}
          >
            <span>Order book</span>
          </button>
          <button 
            className={`tab ${activeTab === 'trades' ? 'active' : ''}`}
            onClick={() => setActiveTab('trades')}
          >
            <span>Trades</span>
          </button>
        </div>
        <div className="symbol-selector">
          <select value={symbol} className="symbol-dropdown">
            <option value="AVAX">AVAX</option>
            {/* <option value="BTC">BTC</option>
            <option value="ETH">ETH</option> */}
          </select>
          <span className="dropdown-arrow">▼</span>
        </div>
      </div>

      {activeTab === 'orderbook' && (
        <div className="order-book-content">
          <div className="symbol-row">
            <button className="symbol-button">
              <span>0.001</span>
              <span>▼</span>
            </button>
            <button className="symbol-button">
              <span>AVAX</span>
              <span>▼</span>
            </button>
          </div>
          
          <div className="order-book-table">
            <div className="table-header">
              <div className="col">PRICE (USD)</div>
              <div className="col">SIZE (AVAX)</div>
              <div className="col">TOTAL (AVAX)</div>
            </div>
            
            {/* Asks (Sell orders) */}
            <div className="asks">
              {orderBookData.asks.map((ask, index) => (
                <div 
                  key={`ask-${ask.price}-${index}`}
                  className="order-row ask-row"
                  onClick={() => handlePriceClick(ask.price)}
                >
                  <div className="col ask-price">{formatPrice(ask.price)}</div>
                  <div className="col">{formatSize(ask.size)}</div>
                  <div className="col">{formatTotal(ask.total)}</div>
                </div>
              ))}
            </div>

            {/* Spread indicator */}
            <div className="spread">
              {orderBookData.asks.length > 0 && orderBookData.bids.length > 0 && (
                <span className="spread-value">
                  {formatPrice(orderBookData.bids[0]?.price)}
                </span>
              )}
            </div>

            {/* Bids (Buy orders) */}
            <div className="bids">
              {orderBookData.bids.map((bid, index) => (
                <div 
                  key={`bid-${bid.price}-${index}`}
                  className="order-row bid-row"
                  onClick={() => handlePriceClick(bid.price)}
                >
                  <div className="col bid-price">{formatPrice(bid.price)}</div>
                  <div className="col">{formatSize(bid.size)}</div>
                  <div className="col">{formatTotal(bid.total)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trades' && (
        <div className="trades-content">
          <div className="trades-placeholder">
            Trade history will be displayed here
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderBook;
