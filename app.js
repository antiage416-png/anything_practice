/**
 * Quantitative Trading System Engine Controller (JS)
 * Drives UI, backtesting simulation, SVG charting, OMS execution, and risk monitors.
 */

// Application State
const state = {
  activeTab: 'workflow',
  strategy: 'momentum',
  symbol: 'AAPL',
  capital: 100000,
  shortWindow: 10,
  longWindow: 30,
  slippageBps: 5,
  commissionPct: 0.1,
  circuitBreaker: false,
  maxDrawdownLimit: 15,
  marketData: {},
  backtestResults: null,
  activeOrders: [],
  logs: []
};

// Architecture Stage Details Mapping
const stageDetails = {
  ingestion: {
    title: "1. 데이터 수집 & Point-in-Time DB",
    desc: "실시간 Tick/Bar 데이터 수집 및 펀더멘털 Point-in-Time 전처리 Engine",
    items: [
      { label: "Data Feed Source", val: "WebSocket Stream (Binance/Upbit) & REST API (US Stocks)" },
      { label: "Storage Engine", val: "ClickHouse + TimescaleDB + MinIO Parquet" },
      { label: "Point-in-Time Guard", val: "Look-Ahead Bias & Survivorship Bias 자동 차단" },
      { label: "Feature Store", val: "Moving Averages, Volatility, RSI, Vol Profile, Order Book Imbalance" }
    ]
  },
  research: {
    title: "2. 알파 연구 & 백테스팅 엔진",
    desc: "알파 팩터 발굴, 이벤트 드리븐 시뮬레이션 및 Walk-Forward 오버피팅 검증",
    items: [
      { label: "Factor Taxonomy", val: "Momentum, Mean-Reversion, StatArb, Sentiment AI Factor" },
      { label: "Engine Mode", val: "Vectorized Fast-Screening & Event-Driven Fill Engine" },
      { label: "Cost Modeling", val: "Fixed/Proportional Slippage + Market Impact Model" },
      { label: "Cross Validation", val: "Combinatorial Purged Cross-Validation (CPCV)" }
    ]
  },
  risk: {
    title: "3. 포트폴리오 & 실시간 리스크 엔진",
    desc: "Risk Parity, Mean-Variance 최적화 및 실시간 VaR/MDD 서킷브레이커",
    items: [
      { label: "Portfolio Models", val: "Hierarchical Risk Parity (HRP), Black-Litterman" },
      { label: "Real-time VaR", val: "Historical & Parametric 95%/99% VaR Limits" },
      { label: "Position Guard", val: "Max Single Asset Exposure (30%), Leverage Cap (1.5x)" },
      { label: "Circuit Breaker", val: "Portfolio MDD > 15% 감지 시 즉시 Emergency Risk-Off" }
    ]
  },
  oms: {
    title: "4. 주문 & 실행 엔진 (OMS / EMS)",
    desc: "타겟 포지션 재배분, TWAP/VWAP 주문 분할 및 증권사/거래소 FIX연동",
    items: [
      { label: "Order Routing", val: "TWAP (Time-Weighted), VWAP (Volume-Weighted), POV" },
      { label: "Protocol Adapter", val: "FIX Protocol 4.4 / REST / WebSocket Native Connector" },
      { label: "Order State Machine", val: "QUEUED -> SUBMITTED -> PARTIAL_FILL -> FILLED" },
      { label: "Execution Latency", val: "Average Order Dispatch Latency < 4.2ms" }
    ]
  },
  monitoring: {
    title: "5. 실시간 모니터링 & MLOps",
    desc: "PnL 실시간 관제, Alpha Decay 모니터링 및 모델 자동 재학습 파이프라인",
    items: [
      { label: "Telemetry & Logs", val: "Grafana + Prometheus + Structured JSON Logs" },
      { label: "Alpha Decay Guard", val: "Rolling 30-day Sharpe Decay Alerting System" },
      { label: "Emergency Control", val: "Global Stop Trading Switch & Slack/Telegram Alert" }
    ]
  }
};

// Synthetic Market Data Generator
function generateMarketData(symbol, count = 180) {
  let price = symbol === 'AAPL' ? 180 : symbol === 'NVDA' ? 120 : symbol === 'MSFT' ? 420 : 65000;
  const vol = symbol.includes('BTC') ? 0.035 : 0.018;
  const series = [];
  
  let date = new Date();
  date.setDate(date.getDate() - count);

  for (let i = 0; i < count; i++) {
    date.setDate(date.getDate() + 1);
    const change = (Math.random() - 0.49) * vol;
    price = Math.max(10, price * (1 + change));
    series.push({
      date: date.toISOString().split('T')[0],
      close: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 2000000) + 500000
    });
  }
  return series;
}

// Initialize System
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initMarketData();
  initFormListeners();
  selectPipelineNode('research');
  runBacktest();
  startLiveTickerSimulation();
  addLog("INFO", "Quant Trading Workflow Engine initialized cleanly.");
  addLog("INFO", "Market Data Ingestion Layer: 5 Assets connected via WebSocket/REST.");
});

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const targetPane = document.getElementById(`pane-${tab.dataset.tab}`);
      if (targetPane) targetPane.classList.add('active');
      state.activeTab = tab.dataset.tab;
    });
  });
}

function initMarketData() {
  ['AAPL', 'NVDA', 'MSFT', 'BTC-USD'].forEach(sym => {
    state.marketData[sym] = generateMarketData(sym, 200);
  });
}

function initFormListeners() {
  const form = document.getElementById('backtest-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      state.symbol = document.getElementById('opt-symbol').value;
      state.strategy = document.getElementById('opt-strategy').value;
      state.capital = parseFloat(document.getElementById('opt-capital').value) || 100000;
      state.shortWindow = parseInt(document.getElementById('opt-short').value) || 10;
      state.longWindow = parseInt(document.getElementById('opt-long').value) || 30;
      state.slippageBps = parseFloat(document.getElementById('opt-slippage').value) || 5;
      
      runBacktest();
      addLog("EXEC", `New Backtest triggered for ${state.symbol} [${state.strategy.toUpperCase()}]`);
    });
  }

  const btnCircuit = document.getElementById('btn-circuit-breaker');
  if (btnCircuit) {
    btnCircuit.addEventListener('click', () => {
      state.circuitBreaker = !state.circuitBreaker;
      if (state.circuitBreaker) {
        btnCircuit.classList.add('btn-danger');
        btnCircuit.innerText = '🚨 RISK-OFF ACTIVE';
        document.getElementById('circuit-status').innerText = 'TRIGGERED (HALTED)';
        document.getElementById('circuit-status').style.color = '#ef4444';
        addLog("RISK", "EMERGENCY CIRCUIT BREAKER TRIGGERED! All open orders canceled.");
      } else {
        btnCircuit.classList.remove('btn-danger');
        btnCircuit.innerText = '🛡️ TRIGGER CIRCUIT BREAKER';
        document.getElementById('circuit-status').innerText = 'NORMAL (ACTIVE)';
        document.getElementById('circuit-status').style.color = '#10b981';
        addLog("INFO", "Circuit breaker reset to NORMAL state.");
      }
    });
  }
}

// Architecture Diagram Inspector Node Click
function selectPipelineNode(nodeKey) {
  document.querySelectorAll('.pipeline-node').forEach(n => n.classList.remove('selected'));
  const targetNode = document.getElementById(`node-${nodeKey}`);
  if (targetNode) targetNode.classList.add('selected');

  const details = stageDetails[nodeKey];
  if (!details) return;

  const detailBox = document.getElementById('stage-detail-card');
  if (detailBox) {
    let html = `<div style="font-size: 16px; font-weight: 700; color: var(--accent-cyan); margin-bottom: 6px;">${details.title}</div>`;
    html += `<div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">${details.desc}</div>`;
    html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">`;

    details.items.forEach(item => {
      html += `
        <div style="background: rgba(15,23,42,0.6); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
          <div style="font-size: 11px; color: var(--accent-cyan); font-weight: 600;">${item.label}</div>
          <div style="font-size: 12px; color: var(--text-main); margin-top: 4px; font-family: var(--font-mono);">${item.val}</div>
        </div>
      `;
    });
    html += `</div>`;
    detailBox.innerHTML = html;
  }
}

// Backtest Simulator Engine
function runBacktest() {
  const data = state.marketData[state.symbol] || generateMarketData(state.symbol, 200);
  const closes = data.map(d => d.close);
  const signals = [];

  // Generate Signals
  for (let i = 0; i < closes.length; i++) {
    if (i < state.longWindow) {
      signals.push(0);
      continue;
    }

    if (state.strategy === 'momentum') {
      const shortAvg = closes.slice(i - state.shortWindow + 1, i + 1).reduce((a, b) => a + b, 0) / state.shortWindow;
      const longAvg = closes.slice(i - state.longWindow + 1, i + 1).reduce((a, b) => a + b, 0) / state.longWindow;
      signals.push(shortAvg > longAvg ? 1 : -1);
    } else { // Mean Reversion (RSI / Bollinger band style)
      const lastPrice = closes[i];
      const avg = closes.slice(i - 20, i + 1).reduce((a, b) => a + b, 0) / 21;
      signals.push(lastPrice < avg * 0.97 ? 1 : lastPrice > avg * 1.03 ? -1 : 0);
    }
  }

  // Backtest Portfolio Simulation
  let capital = state.capital;
  let shares = 0;
  const portfolioHistory = [];
  const trades = [];
  const slippage = state.slippageBps / 10000;
  const commission = state.commissionPct / 100;

  for (let i = 0; i < data.length; i++) {
    const price = data[i].close;
    const sig = signals[i];
    const date = data[i].date;

    if (sig === 1 && shares === 0) { // Buy
      const buyPrice = price * (1 + slippage);
      shares = Math.floor((capital * 0.95) / buyPrice);
      if (shares > 0) {
        const cost = shares * buyPrice;
        capital -= (cost + cost * commission);
        trades.push({ type: 'BUY', date, price: buyPrice.toFixed(2), shares, cost: cost.toFixed(2) });
      }
    } else if (sig === -1 && shares > 0) { // Sell
      const sellPrice = price * (1 - slippage);
      const revenue = shares * sellPrice;
      capital += (revenue - revenue * commission);
      trades.push({ type: 'SELL', date, price: sellPrice.toFixed(2), shares, revenue: revenue.toFixed(2) });
      shares = 0;
    }

    const currentVal = capital + (shares * price);
    portfolioHistory.push({ date, value: currentVal, price });
  }

  // Calculate Performance Metrics
  const finalVal = portfolioHistory[portfolioHistory.length - 1].value;
  const totalReturnPct = ((finalVal - state.capital) / state.capital) * 100;
  
  // Calculate Drawdown
  let peak = portfolioHistory[0].value;
  let maxDD = 0;
  portfolioHistory.forEach(h => {
    if (h.value > peak) peak = h.value;
    const dd = (peak - h.value) / peak;
    if (dd > maxDD) maxDD = dd;
  });

  // Calculate Sharpe
  const returns = [];
  for (let k = 1; k < portfolioHistory.length; k++) {
    returns.push((portfolioHistory[k].value - portfolioHistory[k-1].value) / portfolioHistory[k-1].value);
  }
  const avgRet = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdRet = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgRet, 2), 0) / returns.length) || 0.0001;
  const sharpe = (avgRet / stdRet) * Math.sqrt(252);

  state.backtestResults = {
    finalVal,
    totalReturnPct,
    maxDDPct: maxDD * 100,
    sharpe: sharpe.toFixed(2),
    trades,
    portfolioHistory
  };

  updateBacktestUI();
}

function updateBacktestUI() {
  const res = state.backtestResults;
  if (!res) return;

  document.getElementById('res-val').innerText = `$${res.finalVal.toLocaleString(undefined, {maximumFractionDigits:0})}`;
  
  const retEl = document.getElementById('res-return');
  retEl.innerText = `${res.totalReturnPct >= 0 ? '+' : ''}${res.totalReturnPct.toFixed(2)}%`;
  retEl.className = `metric-value ${res.totalReturnPct >= 0 ? '' : 'negative'}`;
  
  document.getElementById('res-sharpe').innerText = res.sharpe;
  document.getElementById('res-mdd').innerText = `${res.maxDDPct.toFixed(2)}%`;

  renderChart(res.portfolioHistory);
  renderTradesTable(res.trades);
}

// Render SVG Equity Curve Chart
function renderChart(history) {
  const svg = document.getElementById('pnl-chart-svg');
  if (!svg) return;

  const width = svg.clientWidth || 800;
  const height = svg.clientHeight || 300;
  
  const values = history.map(h => h.value);
  const minVal = Math.min(...values) * 0.98;
  const maxVal = Math.max(...values) * 1.02;

  const points = history.map((h, index) => {
    const x = (index / (history.length - 1)) * width;
    const y = height - ((h.value - minVal) / (maxVal - minVal)) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#00f2fe" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
    <!-- Area fill -->
    <polygon points="${areaPoints}" fill="url(#chartGrad)"/>
    <!-- Line -->
    <polyline points="${points}" fill="none" stroke="#00f2fe" stroke-width="2.5"/>
  `;
}

function renderTradesTable(trades) {
  const tbody = document.getElementById('trades-tbody');
  if (!tbody) return;

  if (trades.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">실행된 거래가 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = trades.map((t, idx) => `
    <tr>
      <td>#${idx + 1}</td>
      <td>${t.date}</td>
      <td style="color: ${t.type === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight:700;">${t.type}</td>
      <td>$${t.price}</td>
      <td>${t.shares} 주</td>
    </tr>
  `).join('');
}

// OMS Execution Simulator
function simulateTWAPOrder() {
  const qty = parseInt(document.getElementById('oms-qty').value) || 1000;
  const slices = parseInt(document.getElementById('oms-slices').value) || 5;
  const symbol = document.getElementById('oms-symbol').value;
  const side = document.getElementById('oms-side').value;

  const sliceQty = Math.floor(qty / slices);
  state.activeOrders = [];
  
  const container = document.getElementById('twap-order-waterfall');
  container.innerHTML = '';

  for (let i = 1; i <= slices; i++) {
    const orderId = `ORD-${symbol}-${Math.floor(1000 + Math.random()*9000)}`;
    state.activeOrders.push({ id: orderId, qty: sliceQty, status: 'QUEUED' });
    
    container.innerHTML += `
      <div style="background: rgba(15,23,42,0.8); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
        <div style="display:flex; justify-content:space-between; font-size:12px;">
          <span style="font-weight:700;">[${orderId}] ${side} ${sliceQty} shares ${symbol}</span>
          <span id="status-${orderId}" style="color:var(--accent-amber); font-weight:600;">QUEUED</span>
        </div>
        <div class="progress-bar">
          <div id="bar-${orderId}" class="progress-fill"></div>
        </div>
      </div>
    `;
  }

  addLog("EXEC", `OMS dispatching TWAP Order (${slices} slices, Total ${qty} shares ${symbol})`);

  // Simulate Execution Stream
  state.activeOrders.forEach((ord, index) => {
    setTimeout(() => {
      const bar = document.getElementById(`bar-${ord.id}`);
      const statusEl = document.getElementById(`status-${ord.id}`);
      if (bar && statusEl) {
        bar.style.width = '100%';
        statusEl.innerText = 'FILLED @ market';
        statusEl.style.color = 'var(--accent-green)';
        addLog("EXEC", `Slice ${ord.id} FILLED (${ord.qty} shares) via FIX API connector.`);
      }
    }, (index + 1) * 1200);
  });
}

// Live Ticker & Log Stream Simulation
function startLiveTickerSimulation() {
  setInterval(() => {
    // Ticker price jitter
    ['AAPL', 'NVDA', 'MSFT', 'BTC-USD'].forEach(sym => {
      const series = state.marketData[sym];
      if (series && series.length > 0) {
        const last = series[series.length - 1];
        const jitter = (Math.random() - 0.495) * (sym.includes('BTC') ? 120 : 0.8);
        last.close = parseFloat(Math.max(1, last.close + jitter).toFixed(2));
      }
    });

    // Update Live Monitoring UI
    const aaplPrice = state.marketData['AAPL'] ? state.marketData['AAPL'].slice(-1)[0].close : 180;
    const btcPrice = state.marketData['BTC-USD'] ? state.marketData['BTC-USD'].slice(-1)[0].close : 65000;
    
    const liveAapl = document.getElementById('live-aapl');
    const liveBtc = document.getElementById('live-btc');
    if (liveAapl) liveAapl.innerText = `$${aaplPrice}`;
    if (liveBtc) liveBtc.innerText = `$${btcPrice.toLocaleString()}`;

  }, 1500);
}

function addLog(level, msg) {
  const now = new Date().toTimeString().split(' ')[0];
  state.logs.unshift({ time: now, level, msg });
  if (state.logs.length > 50) state.logs.pop();

  const terminal = document.getElementById('terminal-log-body');
  if (terminal) {
    terminal.innerHTML = state.logs.map(l => `
      <div class="log-line">
        <span class="log-time">[${l.time}]</span>
        <span class="log-level ${l.level}">${l.level}</span>
        <span class="log-msg">${l.msg}</span>
      </div>
    `).join('');
  }
}
