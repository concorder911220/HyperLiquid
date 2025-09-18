import React, { useState } from 'react';
import './TradeHistory.css';

interface CompletedTrade {
  coin: string;
  direction: string;
  openTime: string;
  closeTime: string;
  duration: string;
  realizedPnL: number;
  openPrice: number;
  closePrice: number;
  size: number;
  totalFees: number;
}

interface TradeHistoryResponse {
  trades: CompletedTrade[];
  totalTrades: number;
}

const TradeHistory: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [trades, setTrades] = useState<CompletedTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalTrades, setTotalTrades] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setError(null);
    setTrades([]);

    try {
      const response = await fetch('http://localhost:3001/api/user-trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: walletAddress.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TradeHistoryResponse = await response.json();
      setTrades(data.trades);
      setTotalTrades(data.totalTrades);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trade history');
    } finally {
      setLoading(false);
    }
  };

  const formatPnL = (pnl: number) => {
    const formatted = pnl.toFixed(2);
    return pnl >= 0 ? `+$${formatted}` : `-$${Math.abs(pnl).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(4)}`;
  };

  const getTotalPnL = () => {
    return trades.reduce((sum, trade) => sum + trade.realizedPnL, 0);
  };

  return (
    <div className="trade-history">
      <div className="trade-history-header">
        <h2>Perpetual Trade History</h2>
        <p>Enter a HyperLiquid wallet address to view completed perpetual trades</p>
        <div className="address-info">
          <p className="info-text">
            ✅ Use HyperLiquid wallet addresses (0x format)<br/>
            ❌ BEP20, TRC20, or other network addresses won't work
          </p>
          <div className="example-addresses">
            <p className="example-title">How to find your HyperLiquid address:</p>
            <ul className="example-list">
              <li>Connect MetaMask to HyperLiquid and copy your address</li>
              <li>Check your HyperLiquid trading history for your wallet</li>
              <li>Use any Ethereum address that has traded on HyperLiquid</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="wallet-form">
        <div className="input-group">
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter HyperLiquid wallet address (0x...)"
            className="wallet-input"
            disabled={loading}
          />
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Loading...' : 'Get Trades'}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {trades.length > 0 && (
        <div className="trade-results">
          <div className="results-summary">
            <div className="summary-item">
              <span className="summary-label">Total Trades:</span>
              <span className="summary-value">{totalTrades}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total PnL:</span>
              <span className={`summary-value ${getTotalPnL() >= 0 ? 'positive' : 'negative'}`}>
                {formatPnL(getTotalPnL())}
              </span>
            </div>
          </div>

          <div className="trades-table">
            <div className="table-header">
              <div className="col coin-col">Coin</div>
              <div className="col direction-col">Direction</div>
              <div className="col time-col">Open Time</div>
              <div className="col duration-col">Duration</div>
              <div className="col price-col">Entry/Exit</div>
              <div className="col pnl-col">Realized PnL</div>
            </div>
            
            <div className="table-body">
              {trades.map((trade, index) => (
                <div key={index} className="trade-row">
                  <div className="col coin-col">
                    <span className="coin-symbol">{trade.coin}</span>
                  </div>
                  <div className="col direction-col">
                    <span className={`direction ${trade.direction.toLowerCase()}`}>
                      {trade.direction}
                    </span>
                  </div>
                  <div className="col time-col">
                    <span className="time-text">{formatDate(trade.openTime)}</span>
                  </div>
                  <div className="col duration-col">
                    <span className="duration-text">{trade.duration}</span>
                  </div>
                  <div className="col price-col">
                    <div className="price-info">
                      <span className="entry-price">{formatPrice(trade.openPrice)}</span>
                      <span className="price-separator">→</span>
                      <span className="exit-price">{formatPrice(trade.closePrice)}</span>
                    </div>
                  </div>
                  <div className="col pnl-col">
                    <span className={`pnl ${trade.realizedPnL >= 0 ? 'positive' : 'negative'}`}>
                      {formatPnL(trade.realizedPnL)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && trades.length === 0 && walletAddress && (
        <div className="no-trades">
          No completed perpetual trades found for this wallet address.
        </div>
      )}
    </div>
  );
};

export default TradeHistory;
