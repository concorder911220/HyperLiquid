import { useState } from 'react'
import OrderBook from './components/OrderBook'
import TradeHistory from './components/TradeHistory'
import './App.css'

function App() {
  const [activeView, setActiveView] = useState<'orderbook' | 'trades'>('orderbook')

  return (
    <div className="app">
      <header className="app-header">
        <h1>HyperLiquid Trading Dashboard</h1>
        <nav className="nav-tabs">
          <button 
            className={`nav-tab ${activeView === 'orderbook' ? 'active' : ''}`}
            onClick={() => setActiveView('orderbook')}
          >
            Order Book
          </button>
          <button 
            className={`nav-tab ${activeView === 'trades' ? 'active' : ''}`}
            onClick={() => setActiveView('trades')}
          >
            Trade History
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeView === 'orderbook' && (
          <div className="orderbook-container">
            <OrderBook symbol="AVAX" />
          </div>
        )}
        
        {activeView === 'trades' && (
          <div className="trades-container">
            <TradeHistory />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
