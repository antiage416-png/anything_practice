"""
Quantitative Trading System Core Engine (Python Reference Implementation)
Modules:
1. DataIngestion: Point-in-Time Data Generator & Preprocessor
2. AlphaResearch: Signal Generation (Momentum, Mean Reversion, Multi-Factor)
3. BacktestEngine: Event-Driven & Vectorized Backtest with Slippage & Market Impact
4. RiskEngine: Value at Risk (VaR), Max Drawdown Guard, Position Sizing
5. OMS_EMS: Target Position Rebalancing, TWAP/VWAP Order Execution
"""

import math
import random
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

# ==========================================
# 1. Data Ingestion & Preprocessing Layer
# ==========================================
class QuantDataIngestion:
    def __init__(self, symbols: List[str], days: int = 252):
        self.symbols = symbols
        self.days = days
        self.market_data = {}

    def generate_synthetic_market_data(self) -> Dict[str, List[Dict]]:
        """Generates realistic synthetic daily price & volume data with Point-in-Time timestamps."""
        random.seed(42)
        base_prices = {"AAPL": 180.0, "NVDA": 120.0, "MSFT": 420.0, "BTC-USD": 65000.0, "ETH-USD": 3500.0}
        volatilities = {"AAPL": 0.015, "NVDA": 0.028, "MSFT": 0.014, "BTC-USD": 0.035, "ETH-USD": 0.042}
        
        start_date = datetime.now() - timedelta(days=self.days)
        
        for symbol in self.symbols:
            price = base_prices.get(symbol, 100.0)
            vol = volatilities.get(symbol, 0.02)
            data_series = []
            
            for i in range(self.days):
                date_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
                change = random.gauss(0.0005, vol)
                price = max(1.0, price * (1 + change))
                high = price * (1 + abs(random.gauss(0, vol * 0.5)))
                low = price * (1 - abs(random.gauss(0, vol * 0.5)))
                open_p = low + (high - low) * random.random()
                volume = int(random.uniform(500000, 5000000))
                
                data_series.append({
                    "timestamp": date_str,
                    "open": round(open_p, 2),
                    "high": round(high, 2),
                    "low": round(low, 2),
                    "close": round(price, 2),
                    "volume": volume
                })
            self.market_data[symbol] = data_series
        return self.market_data


# ==========================================
# 2. Alpha Research & Signal Generation
# ==========================================
class AlphaEngine:
    @staticmethod
    def calculate_rsi(prices: List[float], period: int = 14) -> List[float]:
        rsi_values = [50.0] * len(prices)
        if len(prices) < period + 1:
            return rsi_values

        gains, losses = [], []
        for i in range(1, len(prices)):
            diff = prices[i] - prices[i - 1]
            gains.append(max(diff, 0.0))
            losses.append(max(-diff, 0.0))

        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period

        for i in range(period, len(prices)):
            diff = prices[i] - prices[i - 1]
            gain = max(diff, 0.0)
            loss = max(-diff, 0.0)

            avg_gain = (avg_gain * (period - 1) + gain) / period
            avg_loss = (avg_loss * (period - 1) + loss) / period

            if avg_loss == 0:
                rsi_values[i] = 100.0
            else:
                rs = avg_gain / avg_loss
                rsi_values[i] = round(100.0 - (100.0 / (1.0 + rs)), 2)

        return rsi_values

    @staticmethod
    def generate_momentum_signals(prices: List[float], short_window: int = 10, long_window: int = 30) -> List[int]:
        """Generates 1 (Long), -1 (Short/Cash), 0 (Neutral) signals based on SMA Crossover."""
        signals = [0] * len(prices)
        for i in range(long_window, len(prices)):
            short_sma = sum(prices[i - short_window + 1 : i + 1]) / short_window
            long_sma = sum(prices[i - long_window + 1 : i + 1]) / long_window
            if short_sma > long_sma:
                signals[i] = 1
            else:
                signals[i] = -1
        return signals


# ==========================================
# 3. Vectorized / Event-Driven Backtester
# ==========================================
class QuantBacktester:
    def __init__(self, initial_capital: float = 100000.0, commission_rate: float = 0.001, slippage: float = 0.0005):
        self.initial_capital = initial_capital
        self.commission_rate = commission_rate
        self.slippage = slippage

    def run_backtest(self, price_data: List[Dict], signals: List[int]) -> Dict:
        capital = self.initial_capital
        position = 0
        portfolio_values = []
        trades = []

        for i in range(len(price_data)):
            price = price_data[i]["close"]
            signal = signals[i]
            timestamp = price_data[i]["timestamp"]

            # Rebalancing logic
            if signal == 1 and position == 0:  # Buy Signal
                buy_price = price * (1 + self.slippage)
                shares = int((capital * 0.95) / buy_price)
                if shares > 0:
                    cost = shares * buy_price
                    commission = cost * self.commission_rate
                    capital -= (cost + commission)
                    position = shares
                    trades.append({"type": "BUY", "price": round(buy_price, 2), "shares": shares, "timestamp": timestamp})

            elif signal == -1 and position > 0:  # Sell Signal
                sell_price = price * (1 - self.slippage)
                revenue = position * sell_price
                commission = revenue * self.commission_rate
                capital += (revenue - commission)
                trades.append({"type": "SELL", "price": round(sell_price, 2), "shares": position, "timestamp": timestamp})
                position = 0

            # Current Total Portfolio Valuation
            current_val = capital + (position * price)
            portfolio_values.append(current_val)

        # Metrics calculation
        returns = [(portfolio_values[k] - portfolio_values[k-1]) / portfolio_values[k-1] for k in range(1, len(portfolio_values))]
        total_return = round(((portfolio_values[-1] - self.initial_capital) / self.initial_capital) * 100, 2)
        
        avg_ret = sum(returns) / len(returns) if returns else 0
        std_ret = (sum([(r - avg_ret)**2 for r in returns]) / len(returns)) ** 0.5 if returns else 1e-6
        sharpe_ratio = round((avg_ret / std_ret) * math.sqrt(252), 2) if std_ret > 0 else 0.0

        # Max Drawdown
        peak = portfolio_values[0]
        max_dd = 0.0
        for val in portfolio_values:
            if val > peak:
                peak = val
            dd = (peak - val) / peak
            if dd > max_dd:
                max_dd = dd

        return {
            "initial_capital": self.initial_capital,
            "final_portfolio_value": round(portfolio_values[-1], 2),
            "total_return_pct": total_return,
            "sharpe_ratio": sharpe_ratio,
            "max_drawdown_pct": round(max_dd * 100, 2),
            "total_trades": len(trades),
            "portfolio_history": portfolio_values,
            "trades": trades
        }


# ==========================================
# 4. Portfolio & Risk Engine
# ==========================================
class RiskEngine:
    def __init__(self, max_drawdown_limit: float = 0.15, max_single_stock_weight: float = 0.30):
        self.max_drawdown_limit = max_drawdown_limit
        self.max_single_stock_weight = max_single_stock_weight
        self.circuit_breaker_active = False

    def check_circuit_breaker(self, current_drawdown: float) -> bool:
        """Triggers emergency risk-off if portfolio drawdown exceeds safety threshold."""
        if current_drawdown >= self.max_drawdown_limit:
            self.circuit_breaker_active = True
            return True
        return False

    def calculate_var(self, returns: List[float], confidence_level: float = 0.95) -> float:
        """Calculates Historical Value at Risk (VaR)."""
        if not returns:
            return 0.0
        sorted_returns = sorted(returns)
        index = int((1 - confidence_level) * len(sorted_returns))
        return round(abs(sorted_returns[index]) * 100, 2)


# ==========================================
# 5. Order & Execution Management System (OMS/EMS)
# ==========================================
class ExecutionEngine:
    @staticmethod
    def generate_twap_orders(symbol: str, side: str, total_shares: int, slices: int = 5) -> List[Dict]:
        """TWAP (Time-Weighted Average Price) order splitting simulator."""
        share_per_slice = total_shares // slices
        remainder = total_shares % slices
        order_slices = []
        
        now = datetime.now()
        for i in range(slices):
            qty = share_per_slice + (remainder if i == slices - 1 else 0)
            exec_time = (now + timedelta(minutes=i * 5)).strftime("%H:%M:%S")
            order_slices.append({
                "slice_id": f"ORD-{symbol}-{i+1}",
                "symbol": symbol,
                "side": side,
                "quantity": qty,
                "target_time": exec_time,
                "status": "QUEUED"
            })
        return order_slices


import sys

# ==========================================
# Main Execution Test Routine
# ==========================================
if __name__ == "__main__":
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    print("=" * 60)
    print("QUANTITATIVE SYSTEM ENGINE RUNNER")
    print("=" * 60)

    # 1. Ingestion
    symbols = ["AAPL", "NVDA", "BTC-USD"]
    ingestor = QuantDataIngestion(symbols=symbols, days=252)
    market_data = ingestor.generate_synthetic_market_data()
    print(f"✅ Data Ingestion Complete: {len(symbols)} assets loaded across 252 trading days.")

    # 2. Alpha Mining
    aapl_closes = [bar["close"] for bar in market_data["AAPL"]]
    signals = AlphaEngine.generate_momentum_signals(aapl_closes, short_window=10, long_window=30)
    rsi_vals = AlphaEngine.calculate_rsi(aapl_closes)
    print(f"✅ Alpha Signals Computed (AAPL): {signals.count(1)} Long, {signals.count(-1)} Sell/Cash signals.")

    # 3. Backtesting
    backtester = QuantBacktester(initial_capital=100000.0)
    results = backtester.run_backtest(market_data["AAPL"], signals)
    print("\n📊 BACKTEST PERFORMANCE METRICS (AAPL Strategy):")
    print(f"   • Initial Capital: ${results['initial_capital']:,}")
    print(f"   • Final Portfolio: ${results['final_portfolio_value']:,}")
    print(f"   • Total Return:    {results['total_return_pct']}%")
    print(f"   • Sharpe Ratio:    {results['sharpe_ratio']}")
    print(f"   • Max Drawdown:    {results['max_drawdown_pct']}%")
    print(f"   • Executed Trades: {results['total_trades']}")

    # 4. Risk Engine
    risk = RiskEngine(max_drawdown_limit=0.15)
    is_triggered = risk.check_circuit_breaker(results["max_drawdown_pct"] / 100.0)
    print(f"✅ Risk Engine Circuit Breaker Triggered: {is_triggered}")

    # 5. OMS Order Execution
    twap_slices = ExecutionEngine.generate_twap_orders("AAPL", "BUY", total_shares=1500, slices=5)
    print("\n⚡ OMS TWAP EXECUTION SLICES:")
    for s in twap_slices:
        print(f"   [{s['slice_id']}] {s['side']} {s['quantity']} shares @ {s['target_time']} -> Status: {s['status']}")
    print("=" * 60)
