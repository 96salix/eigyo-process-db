/**
 * 営業ダッシュボード
 * アプリケーションメインロジック (Ver. 2.0 - 拡張版)
 * 
 * このファイル内の計算ロジックや仕様を変更した場合は、`README.md` もあわせて更新してください。
 */

// アプリのグローバル状態
const state = {
  currentTab: 'overview',
  selectedPeriod: 'this-month',
  selectedTeam: 'group1',
  selectedMember: 'suzuki',
  hiddenComparisonTeams: [],
  hiddenComparisonItemsByMode: {},
  funnelComparisonMode: 'team',
  funnelComparisonSort: { stageKey: null, type: 'metric', direction: 'desc' },
  leaderboardMetric: 'calls',
  selectedFunnelLayer: 'team',
  teamViewMode: 'detail',
  // 市場調査用サブタブと選択エリア
  currentMarketSubTab: 'pref',
  selectedAreaId: 'kanto',
  // 先行指標シミュレータのデフォルト値 (9段階プロセス)
  simulator: {
    calls: 450,
    connection: 34,
    booking: 22,
    hearing: 69,
    proposal: 4.2,
    consent: 56,
    setup: 47,
    prep: 57,
    close: 40
  }
};

// 保持するApexChartsのインスタンス
let charts = {
  revenueTrend: null,
  weeklyActivity: null,
  scatterCorrelation: null,
  radarDiagnostic: null,
  marketHeatmap: null,
  marketAreaHeatmap: null,
  areaComparison: null,
  contractDonut: null,
  unitPrice: null,
  lossReasons: null,
  teamActivities: {}
};

// -------------------------------------------------------------
// 1. 初期化処理
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // 仕様変更時の更新案内ログ
  console.log("%cダッシュボード仕様・数式の変更時は README.md も更新してください。", "color: #ef4444; font-size: 14px; font-weight: bold;");

  // Lucideアイコンのレンダリング
  lucide.createIcons();

  // イベントリスナーの登録
  initEventListeners();

  // ヘッダーとスコープバーの初期同期
  updatePageContext();

  // 初期レンダリング
  renderAll();

  // 初期状態でのグラフ作成
  initCharts();

  // 現場営業チェックリストの初期表示の更新
  if (typeof updateSalesChecklist === 'function') {
    updateSalesChecklist();
  }

  // 日本全国需給ヒートマップの初期化 (NEW)
  if (typeof initJapanMap === 'function' && document.getElementById('japan-map-container')) {
    initJapanMap();
  }
});

// イベントリスナー登録
function initEventListeners() {
  // チームセレクターの変更
  const teamSel = document.getElementById('teamSelector');
  if (teamSel) {
    teamSel.addEventListener('change', (e) => {
      state.selectedTeam = e.target.value;
      updatePageContext();
      renderAll();
    });
  }

  const memberSel = document.getElementById('memberSelector');
  if (memberSel) {
    memberSel.addEventListener('change', (e) => {
      state.selectedMember = e.target.value;
      updatePageContext();
      renderAll();
    });
  }

  document.addEventListener('click', (e) => {
    const modeBtn = e.target.closest('[data-comparison-mode]');
    if (modeBtn) {
      e.preventDefault();
      setFunnelComparisonMode(modeBtn.dataset.comparisonMode);
      return;
    }

    const showAllBtn = e.target.closest('[data-comparison-show-all]');
    if (showAllBtn) {
      e.preventDefault();
      showAllTeamsInComparison();
      return;
    }

    const toggleBtn = e.target.closest('[data-comparison-toggle]');
    if (toggleBtn) {
      e.preventDefault();
      toggleTeamComparisonVisibility(toggleBtn.dataset.comparisonToggle);
      return;
    }

    const sortBtn = e.target.closest('[data-comparison-sort-stage]');
    if (sortBtn) {
      e.preventDefault();
      const type = sortBtn.dataset.comparisonSortType || 'metric';
      sortComparisonByStage(sortBtn.dataset.comparisonSortStage, type);
      return;
    }

    const actionBtn = e.target.closest('[data-action-panel]');
    if (actionBtn) {
      e.preventDefault();
      toggleProcessActions(actionBtn.dataset.actionPanel, actionBtn);
    }
  });

  // 先行指標シミュレータの9段階スライダー監視
  const sliders = [
    { id: 'slider-calls', key: 'calls', suffix: ' 回', isFloat: false },
    { id: 'slider-connection', key: 'connection', suffix: ' %', isFloat: false },
    { id: 'slider-booking', key: 'booking', suffix: ' %', isFloat: false },
    { id: 'slider-hearing', key: 'hearing', suffix: ' %', isFloat: false },
    { id: 'slider-proposal', key: 'proposal', suffix: ' 件', isFloat: true },
    { id: 'slider-consent', key: 'consent', suffix: ' %', isFloat: false },
    { id: 'slider-setup', key: 'setup', suffix: ' %', isFloat: false },
    { id: 'slider-prep', key: 'prep', suffix: ' %', isFloat: false },
    { id: 'slider-close', key: 'close', suffix: ' %', isFloat: false }
  ];

  sliders.forEach(slider => {
    const el = document.getElementById(slider.id);
    if (el) {
      el.addEventListener('input', (e) => {
        const val = slider.isFloat ? parseFloat(e.target.value) : parseInt(e.target.value);
        state.simulator[slider.key] = val;
        
        const lblEl = document.getElementById(`${slider.id}-lbl`);
        if (lblEl) {
          lblEl.textContent = `${val}${slider.suffix}`;
        }
        updateSimulation();
      });
    }
  });

  // ポップオーバー外クリックでポップオーバーを閉じる
  document.addEventListener('click', (e) => {
    const popover = document.getElementById('riskPopover');
    if (popover && popover.classList.contains('active')) {
      const isClickInsideTable = e.target.closest('#riskTableBody');
      const isClickInsidePopover = e.target.closest('#riskPopover');
      if (!isClickInsideTable && !isClickInsidePopover) {
        closeRiskPopover();
      }
    }
  });
}

// -------------------------------------------------------------
// 2. 状態変更 ＆ レンダリング
// -------------------------------------------------------------

// タブの切り替え
window.switchTab = function(tabId) {
  state.currentTab = tabId;

  // ナビゲーションボタンのアクティブクラス制御
  const tabs = ['overview', 'funnel', 'correlation'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const content = document.getElementById(`tab-content-${t}`);
    
    if (t === tabId) {
      if (btn) btn.classList.add('active');
      if (content) content.classList.remove('hidden');
    } else {
      if (btn) btn.classList.remove('active');
      if (content) content.classList.add('hidden');
    }
  });

  updatePageContext();

  // ポップオーバーが開いていたら閉じる
  closeRiskPopover();

  renderAll();
};

function getSelectedTeamText() {
  const selector = document.getElementById('teamSelector');
  if (!selector || selector.selectedIndex === -1 || !selector.options[selector.selectedIndex]) {
    return '東京CA 第1グループ';
  }
  return selector.options[selector.selectedIndex].text;
}

// チームレイヤーは現状、横並び比較ビューを常時表示する。
window.setTeamViewMode = function(mode = 'detail') {
  state.teamViewMode = mode;
};

function getPeriodText() {
  const labels = {
    'this-month': '当月 (5月累計)',
    'last-month': '先月',
    q1: 'Q1累計',
    'fy-total': '年度の積み上げ (累計)'
  };
  return labels[state.selectedPeriod] || '当月 (5月累計)';
}

function updatePageContext() {
  const selectedTeam = getSelectedTeamText();
  const titles = {
    overview: 'ファネル分析',
    funnel: '売上進捗',
    correlation: '市況分析'
  };

  const titleEl = document.getElementById('currentTabTitle');
  if (titleEl) titleEl.textContent = titles[state.currentTab] || titles.overview;

  const funnelTargetEl = document.getElementById('funnel-target-label');
  if (funnelTargetEl) funnelTargetEl.textContent = selectedTeam;

}

window.setFunnelLayer = function(layerId) {
  state.selectedFunnelLayer = 'team';
  ['overall', 'team'].forEach(layer => {
    const btn = document.getElementById(`layer-btn-${layer}`);
    const content = document.getElementById(`funnel-layer-${layer}`);
    if (btn) {
      btn.className = layer === 'team'
        ? 'funnel-layer-btn px-4 py-2 rounded-lg text-white bg-slate-800'
        : 'funnel-layer-btn px-4 py-2 rounded-lg text-slate-400 hover:text-white';
    }
    if (content) {
      content.classList.toggle('hidden', layer !== 'team');
    }
  });

  // レイヤー切り替え時にすべての詳細パネルを閉じる
  document.querySelectorAll('.process-action-panel').forEach(panel => {
    panel.classList.add('hidden');
    panel.classList.remove('process-action-panel-open');
  });
  document.querySelectorAll('.process-action-chevron').forEach(chevron => {
    chevron.classList.remove('rotate-180');
  });

  setTeamViewMode(state.teamViewMode);
};

// 期間の変更 (当月・先月・Q1・年度の積み上げ)
window.setPeriod = function(periodId) {
  state.selectedPeriod = periodId;

  // ボタンのアクティブクラス制御
  const periods = ['this-month', 'last-month', 'q1', 'fy-total'];
  periods.forEach(p => {
    const btn = document.getElementById(`period-${p}`);
    if (btn) {
      if (p === periodId) {
        btn.className = "px-3 py-1 rounded-md text-[11px] font-semibold text-white bg-slate-800 border border-slate-700/50 shadow";
      } else {
        btn.className = "px-3 py-1 rounded-md text-[11px] font-semibold text-slate-400 hover:text-white transition";
      }
    }
  });

  // KPI数値をアニメーション付きで変化させる
  animateKpiChanges(periodId);
  updatePageContext();
};

// 累計積み上げ計算ヘルパー関数
function getCumulativeArray(arr) {
  let sum = 0;
  return arr.map(v => {
    if (v === null || v === undefined) return null;
    sum += v;
    return sum;
  });
}

// KPI数値変更アニメーション
function animateKpiChanges(period) {
  let multiplier = 1.0;
  let labelSuffix = " (当月)";
  if (period === 'last-month') {
    multiplier = 1.12;
    labelSuffix = " (前月確定)";
  } else if (period === 'q1') {
    multiplier = 3.25;
    labelSuffix = " (Q1累計)";
  } else if (period === 'fy-total') {
    multiplier = 12.0;
    labelSuffix = " (年度累計)";
  }

  const baseKpis = dashboardData.kpis;

  // 各KPIカードの数値を変更
  updateKpiCard('kpi-revenue', baseKpis.revenue.value * multiplier, 30000000 * multiplier, multiplier, "円", labelSuffix);
  updateKpiCard('kpi-interviews', baseKpis.interviews.value * multiplier, 180 * multiplier, multiplier, "件", labelSuffix);
  updateKpiCard('kpi-recommendations', baseKpis.recommendations.value * multiplier, 120 * multiplier, multiplier, "件", labelSuffix);
  updateKpiCard('kpi-offers', baseKpis.offers.value * multiplier, 24 * multiplier, multiplier, "件", labelSuffix);
  


  // KPIカード内バッジの切り替え
  const isCumulative = period === 'q1' || period === 'fy-total';
  const badgeText = isCumulative ? '年度レベル (累計)' : '各月の情報 (月次)';
  const badgeClass = isCumulative 
    ? 'px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-brand-purple/20 text-brand-purple border border-brand-purple/30 glow-badge-purple animate-pulse'
    : 'px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-brand-blue/10 text-brand-blue border border-brand-blue/20';

  ['kpi-revenue', 'kpi-interviews', 'kpi-recommendations', 'kpi-offers'].forEach(id => {
    const badgeEl = document.getElementById(`${id}-badge`);
    if (badgeEl) {
      badgeEl.textContent = badgeText;
      badgeEl.className = badgeClass;
    }
  });

  // 各種グラフの更新
  if (charts.revenueTrend) {
    const chartTitleEl = document.getElementById('trend-chart-title');
    const chartSubtitleEl = document.getElementById('trend-chart-subtitle');

    if (isCumulative) {
      // 累計積み上げモード (Q1または年度累計)
      if (chartTitleEl) chartTitleEl.textContent = `成約・売上トレンドと着地予測 (年度累計・積み上げ)`;
      if (chartSubtitleEl) chartSubtitleEl.textContent = '実績の積み上げと通期予測の推移予測 (S字カーブ)';

      const cumulativeTarget = getCumulativeArray(dashboardData.monthlyTrend.target);
      const cumulativeActual = getCumulativeArray(dashboardData.monthlyTrend.actual);
      const cumulativeForecast = getCumulativeArray(dashboardData.monthlyTrend.forecast);
      
      charts.revenueTrend.updateSeries([
        { name: '通期目標 (累計)', data: cumulativeTarget },
        { name: '通期実績 (累計)', data: cumulativeActual },
        { name: '先行予測 (累計)', data: cumulativeForecast }
      ]);

      charts.revenueTrend.updateOptions({
        yaxis: {
          labels: {
            formatter: function (value) { return value + "万円 (累計)"; }
          }
        },
        tooltip: {
          y: {
            formatter: function (y) {
              if (typeof y !== "undefined") return y.toLocaleString() + " 万円 (累計)";
              return y;
            }
          }
        }
      });
    } else {
      // 通常の月次モード (当月または先月)
      if (chartTitleEl) chartTitleEl.textContent = '成約・売上トレンドと着地予測 (月次)';
      if (chartSubtitleEl) chartSubtitleEl.textContent = '当月先行指標に基づく翌月成約の推移予測';

      let newActual = [...dashboardData.monthlyTrend.actual];
      if (period === 'last-month') {
        newActual = newActual.map(v => v ? v * 0.95 : null);
      }
      
      charts.revenueTrend.updateSeries([
        { name: '目標', data: dashboardData.monthlyTrend.target },
        { name: '実績', data: newActual },
        { name: '先行予測', data: dashboardData.monthlyTrend.forecast }
      ]);

      charts.revenueTrend.updateOptions({
        yaxis: {
          labels: {
            formatter: function (value) { return value + "万円"; }
          }
        },
        tooltip: {
          y: {
            formatter: function (y) {
              if (typeof y !== "undefined") return y.toLocaleString() + " 万円";
              return y;
            }
          }
        }
      });
    }
  }

  // チームカードの数値を同期アップデート
  renderTeamComparison();
}

// 個別KPIカードのHTML要素アップデート
function updateKpiCard(kpiId, targetValue, targetGoal, multiplier, unit, suffix) {
  const valEl = document.getElementById(`${kpiId}-val`);
  const pctEl = document.getElementById(`${kpiId}-pct`);
  const barEl = document.getElementById(`${kpiId}-bar`);
  const diffEl = document.getElementById(`${kpiId}-diff`);

  // 目標達成率
  const newPct = ((targetValue / targetGoal) * 100).toFixed(1);
  pctEl.textContent = `${newPct}%`;
  barEl.style.width = `${Math.min(newPct, 100)}%`;

  // 数値のアニメーション風カウントアップ
  let start = 0;
  const end = Math.floor(targetValue);
  const duration = 400; // ms
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current = Math.floor(start + progress * (end - start));
    
    valEl.textContent = current.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  requestAnimationFrame(animate);
}

// チーム変更時のランダムデータ微小リフレッシュ
function simulateDataRefresh() {
  const cards = document.querySelectorAll('.glass-panel');
  cards.forEach(c => {
    c.style.opacity = '0.7';
    setTimeout(() => c.style.opacity = '1', 150);
  });
  
  setPeriod(state.selectedPeriod);
  renderAll(); // チーム選択時に全コンポーネントを動的に再描画
}

// -------------------------------------------------------------
// 3. 各タブの描画ロジック
// -------------------------------------------------------------

function renderAll() {
  renderLayerFunnels();
  renderRevenueProgress();
  renderMarketOverview();
  setFunnelLayer(state.selectedFunnelLayer);
}

const FUNNEL_STAGES = [
  { name: "登録", fullName: "新規登録者", key: "registrations", icon: "user-plus", accent: "slate" },
  { name: "面談設定", fullName: "新規面談設定", key: "bookings", icon: "calendar-plus", accent: "blue" },
  { name: "面談実施", fullName: "新規面談実施", key: "interviews", icon: "messages-square", accent: "cyan" },
  { name: "求人提案", fullName: "求人マッチング提案", key: "proposals", icon: "sparkles", accent: "purple" },
  { name: "推薦", fullName: "推薦承諾・書類提出", key: "recommendations", icon: "send", accent: "pink" },
  { name: "面接", fullName: "面接実施", key: "setups", icon: "briefcase-business", accent: "amber" },
  { name: "決定", fullName: "内定承諾・決定", key: "placements", icon: "badge-check", accent: "emerald" }
];

const FUNNEL_STAGE_CLASSES = {
  slate: { icon: 'bg-slate-500/10 border-slate-500/20 text-slate-300', bar: 'from-slate-500 to-slate-400', text: 'text-slate-300' },
  blue: { icon: 'bg-brand-blue/10 border-brand-blue/20 text-brand-blue', bar: 'from-brand-blue to-blue-400', text: 'text-brand-blue' },
  cyan: { icon: 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan', bar: 'from-brand-cyan to-cyan-300', text: 'text-brand-cyan' },
  purple: { icon: 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple', bar: 'from-brand-purple to-violet-400', text: 'text-brand-purple' },
  pink: { icon: 'bg-pink-500/10 border-pink-500/20 text-pink-400', bar: 'from-pink-500 to-rose-400', text: 'text-pink-400' },
  amber: { icon: 'bg-brand-amber/10 border-brand-amber/20 text-brand-amber', bar: 'from-brand-amber to-yellow-300', text: 'text-brand-amber' },
  emerald: { icon: 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald', bar: 'from-brand-emerald to-emerald-300', text: 'text-brand-emerald' }
};

function getFunnelAdvices() {
  return {
    bookings: {
      title: "登録 → 面談設定",
      owner: "CAリーダー",
      action: "初動10分以内の架電と、平日19時以降・土曜の接続率が高い時間帯へコールを寄せる。",
      lever: "初回接触SLA / 架電時間帯"
    },
    interviews: {
      title: "面談設定 → 面談実施",
      owner: "CAリーダー",
      action: "面談日は3日以内に寄せ、前日リマインドと当日30分前確認でキャンセルを防ぐ。",
      lever: "面談リマインド / 日程短縮"
    },
    proposals: {
      title: "面談実施 → 求人提案",
      owner: "CA/RA",
      action: "面談当日に3大本音を埋め、RAと即時すり合わせして候補者別の提案理由を作る。",
      lever: "ヒアリング充足 / 当日求人提案"
    },
    recommendations: {
      title: "求人提案 → 推薦",
      owner: "CA",
      action: "大量提案を止め、3〜4件の厳選求人に絞って推薦理由を候補者の本音に接続する。",
      lever: "提案厳選 / 推薦理由"
    },
    setups: {
      title: "推薦 → 面接",
      owner: "RAリーダー",
      action: "推薦後24時間以内の企業打診を徹底し、書類選考理由と日程候補を即日回収する。",
      lever: "企業打診SLA / 選考回収"
    },
    placements: {
      title: "面接 → 決定",
      owner: "CA/RA",
      action: "面接前対策を80%以上へ戻し、面接直後の意向回収と他社比較の不安潰しを即日実施する。",
      lever: "面接前対策 / 意向グリップ"
    }
  };
}

function aggregateFunnelData() {
  const totals = {};
  FUNNEL_STAGES.forEach(stage => {
    totals[stage.key] = { actual: 0, target: 0 };
  });

  Object.values(dashboardData.teamsData || {}).forEach(team => {
    FUNNEL_STAGES.forEach(stage => {
      totals[stage.key].actual += team.funnel[stage.key]?.actual || 0;
      totals[stage.key].target += team.funnel[stage.key]?.target || 0;
    });
  });

  return totals;
}

function findFunnelBottleneck(fData) {
  let worst = null;

  for (let i = 1; i < FUNNEL_STAGES.length; i++) {
    const stage = FUNNEL_STAGES[i];
    const prevStage = FUNNEL_STAGES[i - 1];
    const actualRate = fData[prevStage.key].actual > 0 ? (fData[stage.key].actual / fData[prevStage.key].actual) * 100 : 0;
    const targetRate = fData[prevStage.key].target > 0 ? (fData[stage.key].target / fData[prevStage.key].target) * 100 : 0;
    const gap = actualRate - targetRate;
    const expectedActual = fData[prevStage.key].actual * (targetRate / 100);
    const missingAtStage = Math.max(0, expectedActual - fData[stage.key].actual);
    const downstreamTargetConversion = fData[stage.key].target > 0
      ? fData.placements.target / fData[stage.key].target
      : 0;
    const lostPlacements = missingAtStage * downstreamTargetConversion;

    if (!worst || gap < worst.gap) {
      worst = {
        stage,
        prevStage,
        actualRate,
        targetRate,
        gap,
        missingAtStage,
        lostPlacements,
        revenueImpact: lostPlacements * 1250000
      };
    }
  }

  return worst;
}

function getTeamBottleneckScore(team, bottleneckKey) {
  const stageIndex = FUNNEL_STAGES.findIndex(stage => stage.key === bottleneckKey);
  if (stageIndex <= 0) return 0;

  const stage = FUNNEL_STAGES[stageIndex];
  const prevStage = FUNNEL_STAGES[stageIndex - 1];
  const prevActual = team.funnel[prevStage.key]?.actual || 0;
  const prevTarget = team.funnel[prevStage.key]?.target || 0;
  const actual = team.funnel[stage.key]?.actual || 0;
  const target = team.funnel[stage.key]?.target || 0;
  const actualRate = prevActual > 0 ? (actual / prevActual) * 100 : 0;
  const targetRate = prevTarget > 0 ? (target / prevTarget) * 100 : 0;

  return actualRate - targetRate;
}

function renderLayerFunnels() {
  renderFunnelAnalysis(
    aggregateFunnelData(),
    'overviewFunnelStepsContainer',
    'overviewFunnelBottleneckContainer',
    'overall'
  );

  const team = dashboardData.teamsData[state.selectedTeam] || dashboardData.teamsData.group1;
  renderFunnelAnalysis(
    team.funnel,
    'funnelStepsContainer',
    'funnelBottleneckContainer',
    'team'
  );

  renderFunnelSummaryList(
    'teamFunnelSummaryGrid',
    Object.entries(dashboardData.teamsData).map(([id, teamData]) => ({
      id,
      name: teamData.name,
      caption: teamData.leader,
      funnel: teamData.funnel,
      onClick: `selectTeamAndScroll('${id}')`
    }))
  );

  renderTeamFunnelComparisonMatrix();

  updatePageContext();
  lucide.createIcons();
}

function getTeamStatusConfig(status) {
  const statusConfig = {
    good: {
      label: '良好',
      badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      bar: 'bg-gradient-to-r from-brand-blue to-brand-cyan',
      mutedBar: 'bg-emerald-500'
    },
    warning: {
      label: '注意',
      badge: 'bg-amber-500/10 border-amber-500/20 text-brand-amber',
      bar: 'bg-brand-amber',
      mutedBar: 'bg-brand-amber'
    },
    danger: {
      label: '警告',
      badge: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      bar: 'bg-rose-500',
      mutedBar: 'bg-rose-500'
    }
  };

  return statusConfig[status] || statusConfig.good;
}

function getMetricStatusClass(percent) {
  if (percent >= 100) return 'text-emerald-400';
  if (percent >= 80) return 'text-brand-amber';
  return 'text-rose-400';
}

function cloneFunnelData(funnel) {
  return Object.fromEntries(FUNNEL_STAGES.map(stage => ([
    stage.key,
    {
      actual: funnel[stage.key]?.actual || 0,
      target: funnel[stage.key]?.target || 0
    }
  ])));
}

function scaleFunnelData(baseFunnel, factor) {
  return Object.fromEntries(FUNNEL_STAGES.map(stage => ([
    stage.key,
    {
      actual: Math.max(0, Math.round((baseFunnel[stage.key]?.actual || 0) * factor)),
      target: Math.max(1, Math.round((baseFunnel[stage.key]?.target || 0) * factor))
    }
  ])));
}

function sumFunnelItems(items) {
  const totals = {};
  FUNNEL_STAGES.forEach(stage => {
    totals[stage.key] = { actual: 0, target: 0 };
  });

  items.forEach(item => {
    FUNNEL_STAGES.forEach(stage => {
      totals[stage.key].actual += item.funnel[stage.key]?.actual || 0;
      totals[stage.key].target += item.funnel[stage.key]?.target || 0;
    });
  });

  return totals;
}

function getFunnelComparisonItems(mode = state.funnelComparisonMode) {
  if (mode === 'prefecture') {
    const teams = dashboardData.teamsData;
    return [
      {
        id: 'tokyo',
        name: '東京',
        caption: '第1G・第2G・第3G',
        funnel: sumFunnelItems(['group1', 'group2', 'group3'].map(id => ({ funnel: teams[id].funnel })))
      },
      { id: 'kanagawa', name: '神奈川', caption: '神奈川CA', funnel: cloneFunnelData(teams.kanagawa.funnel) },
      { id: 'saitama', name: '埼玉', caption: '埼玉CA', funnel: cloneFunnelData(teams.saitama.funnel) },
      { id: 'chiba', name: '千葉', caption: '千葉CA', funnel: cloneFunnelData(teams.chiba.funnel) },
      { id: 'osaka', name: '大阪', caption: '関西CA', funnel: cloneFunnelData(teams.osaka.funnel) },
      { id: 'aichi', name: '愛知', caption: '東海CA', funnel: cloneFunnelData(teams.nagoya.funnel) }
    ];
  }

  if (mode === 'area') {
    const teams = dashboardData.teamsData;
    return [
      {
        id: 'kanto',
        name: '関東',
        caption: '東京・神奈川・埼玉・千葉',
        funnel: sumFunnelItems(['group1', 'group2', 'group3', 'kanagawa', 'saitama', 'chiba'].map(id => ({ funnel: teams[id].funnel })))
      },
      { id: 'kansai', name: '関西', caption: '大阪', funnel: cloneFunnelData(teams.osaka.funnel) },
      { id: 'tokai', name: '東海', caption: '愛知', funnel: cloneFunnelData(teams.nagoya.funnel) }
    ];
  }

  if (mode === 'age') {
    const aggregate = aggregateFunnelData();
    return [
      { id: '20s', name: '20代', caption: '若手層', funnel: scaleFunnelData(aggregate, 0.24) },
      { id: '30s', name: '30代', caption: '主力層', funnel: scaleFunnelData(aggregate, 0.34) },
      { id: '40s', name: '40代', caption: '経験者層', funnel: scaleFunnelData(aggregate, 0.25) },
      { id: '50s', name: '50代以上', caption: 'ベテラン層', funnel: scaleFunnelData(aggregate, 0.17) }
    ];
  }

  return Object.entries(dashboardData.teamsData).map(([id, team]) => ({
    id,
    name: team.name,
    caption: team.leader,
    funnel: cloneFunnelData(team.funnel)
  }));
}

function getFunnelComparisonModeLabel(mode = state.funnelComparisonMode) {
  return {
    team: 'チーム',
    prefecture: '都道府県',
    area: 'エリア',
    age: '年齢'
  }[mode] || 'チーム';
}

function getComparisonStageValue(item, stageKey, type = 'metric') {
  const metric = item.funnel[stageKey];
  if (!metric) return 0;

  if (type === 'transition') {
    const stageIndex = FUNNEL_STAGES.findIndex(stage => stage.key === stageKey);
    if (stageIndex <= 0) return 0;
    const prevStage = FUNNEL_STAGES[stageIndex - 1];
    const prevMetric = item.funnel[prevStage.key];
    return prevMetric?.actual > 0 ? (metric.actual / prevMetric.actual) * 100 : 0;
  }

  return metric.actual;
}

function getComparisonChipLabel(name) {
  if (name.startsWith('東京CA ')) {
    return name.replace('東京CA ', '').replace('グループ', 'G');
  }
  return name.replace('グループ', '');
}

function renderTeamFunnelComparisonMatrix() {
  const matrix = document.getElementById('teamFunnelComparisonMatrix');
  const controls = document.getElementById('teamComparisonVisibilityControls');
  if (!matrix || !controls || !dashboardData.teamsData) return;

  const mode = state.funnelComparisonMode || 'team';
  const items = getFunnelComparisonItems(mode);
  const hiddenIds = new Set(state.hiddenComparisonItemsByMode[mode] || []);
  let visibleItems = items.filter(item => !hiddenIds.has(item.id));
  const sortState = state.funnelComparisonSort || {};
  if (sortState.stageKey) {
    const direction = sortState.direction === 'asc' ? 1 : -1;
    visibleItems = [...visibleItems].sort((a, b) => {
      const valA = getComparisonStageValue(a, sortState.stageKey, sortState.type || 'metric');
      const valB = getComparisonStageValue(b, sortState.stageKey, sortState.type || 'metric');
      return (valA - valB) * direction;
    });
  }

  ['team', 'prefecture', 'area', 'age'].forEach(modeId => {
    const btn = document.getElementById(`comparison-mode-${modeId}`);
    if (btn) {
      btn.className = modeId === mode
        ? 'comparison-mode-btn px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/70 text-white'
        : 'comparison-mode-btn px-3 py-1 rounded-lg bg-slate-950/40 border border-slate-800/80 text-slate-400 hover:text-white hover:border-brand-blue/35';
    }
  });

  controls.innerHTML = items.map(item => {
    const isHidden = hiddenIds.has(item.id);
    return `
      <button data-comparison-toggle="${item.id}" class="px-2.5 py-1 rounded-full border text-[9px] font-bold transition ${isHidden ? 'bg-slate-950/40 border-slate-800/80 text-slate-500 line-through hover:text-slate-300' : 'bg-slate-800/70 border-slate-700/70 text-slate-300 hover:border-brand-blue/35 hover:text-white'}">
        ${getComparisonChipLabel(item.name)}
      </button>
    `;
  }).join('');

  if (visibleItems.length === 0) {
    matrix.innerHTML = `
      <div class="min-h-40 rounded-xl border border-slate-800/70 bg-slate-950/30 flex flex-col items-center justify-center gap-3 text-center">
        <p class="text-xs font-bold text-slate-300">表示中の${getFunnelComparisonModeLabel(mode)}がありません</p>
        <button data-comparison-show-all="true" class="px-3 py-1.5 rounded-lg bg-brand-blue/15 border border-brand-blue/30 text-[10px] font-bold text-brand-cyan hover:text-white transition">全項目を戻す</button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const labelWidth = 118;
  const columnWidth = 144;
  const overallFunnel = sumFunnelItems(items);
  const stickyLabelClass = 'sticky left-0 z-50 bg-[#020617] border-r border-slate-800/80';
  const stickyOverallClass = 'sticky z-40 bg-[#020617] border-r border-slate-800/80';
  const overallHeaderCell = `
    <div class="${stickyOverallClass} team-funnel-compare-col border-l border-slate-800/70 p-2" style="left: ${labelWidth}px;">
      <h5 class="text-xs font-bold text-white truncate">全体</h5>
      <p class="text-[9px] text-slate-500 truncate mt-0.5">${getFunnelComparisonModeLabel(mode)}合算</p>
    </div>
  `;

  const headerCells = visibleItems.map(item => {
    return `
      <div class="team-funnel-compare-col border-l border-slate-800/70 bg-slate-950/20 p-2">
        <div class="flex items-start justify-between gap-2">
          <button class="min-w-0 text-left group cursor-default">
            <h5 class="text-xs font-bold text-white truncate">${item.name}</h5>
            <p class="text-[9px] text-slate-500 truncate mt-0.5">${item.caption || ''}</p>
          </button>
          <button data-comparison-toggle="${item.id}" class="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800/70 transition" title="この項目を非表示">
            <i data-lucide="eye-off" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  const stageRows = FUNNEL_STAGES.map((stage, index) => {
    const isSortedStage = state.funnelComparisonSort?.stageKey === stage.key && state.funnelComparisonSort?.type !== 'transition';
    const labelCell = `
      <button data-comparison-sort-stage="${stage.key}" class="${stickyLabelClass} p-1.5 flex items-center gap-1.5 text-left group hover:bg-slate-900/80 transition w-full h-full min-h-[28px]">
        <span class="w-[18px] h-[18px] rounded-md border ${FUNNEL_STAGE_CLASSES[stage.accent].icon} flex items-center justify-center flex-shrink-0">
          <i data-lucide="${stage.icon}" class="w-3 h-3"></i>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-[9px] font-extrabold text-white leading-tight">${index + 1}. ${stage.fullName}</p>
        </div>
        <i data-lucide="${isSortedStage && state.funnelComparisonSort.direction === 'asc' ? 'arrow-up-wide-narrow' : 'arrow-down-wide-narrow'}" class="w-3.5 h-3.5 ${isSortedStage ? 'text-brand-cyan opacity-100' : 'text-slate-500 opacity-0 group-hover:opacity-100'} transition"></i>
      </button>
    `;

    const overallMetric = overallFunnel[stage.key];
    const overallClasses = FUNNEL_STAGE_CLASSES[stage.accent];
    const overallRegActual = overallFunnel.registrations.actual || 1;
    const overallRegTarget = overallFunnel.registrations.target || 1;
    const overallActualRate = overallRegActual > 0 ? (overallMetric.actual / overallRegActual) * 100 : 0;
    const overallTargetRate = overallRegTarget > 0 ? (overallMetric.target / overallRegTarget) * 100 : 0;
    const overallStageCell = `
      <div class="${stickyOverallClass} border-l border-t border-slate-800/60 p-1.5" style="left: ${labelWidth}px;">
        <div class="w-full text-left">
          <div class="flex items-center justify-between gap-1">
            <span class="text-[9px] text-slate-400 font-semibold truncate">
              <strong class="text-[10.5px] text-white font-extrabold">${overallMetric.actual.toLocaleString()}</strong>
              <span class="text-slate-600">/</span>
              <strong class="text-[10.5px] text-slate-300 font-extrabold">${overallMetric.target.toLocaleString()}</strong>
            </span>
          </div>
          <div class="mt-1 w-full bg-slate-800/60 rounded-md h-3.5 relative flex items-center overflow-hidden border border-slate-800">
            <div class="bg-gradient-to-r ${overallClasses.bar} h-full rounded-l-lg opacity-85" style="width: ${Math.min(overallActualRate, 100)}%"></div>
            <span class="absolute left-2 text-[8px] font-bold text-white drop-shadow">${overallActualRate.toFixed(1)}%</span>
            <div class="absolute top-0 bottom-0 border-l-2 border-dashed border-emerald-400 z-20 w-0" style="left: ${Math.min(overallTargetRate, 100)}%" title="目標全体比: ${overallTargetRate.toFixed(1)}%"></div>
          </div>
        </div>
      </div>
    `;

    const cells = visibleItems.map(item => {
      const fData = item.funnel;
      const metric = fData[stage.key];
      const classes = FUNNEL_STAGE_CLASSES[stage.accent];
      const regActual = fData.registrations.actual || 1;
      const regTarget = fData.registrations.target || 1;
      const overallActualRate = regActual > 0 ? (metric.actual / regActual) * 100 : 0;
      const overallTargetRate = regTarget > 0 ? (metric.target / regTarget) * 100 : 0;

      return `
        <div class="border-l border-t border-slate-800/60 p-1.5 bg-slate-950/20">
          <div class="w-full text-left">
            <div class="flex items-center justify-between gap-1">
              <span class="text-[9px] text-slate-400 font-semibold truncate">
                <strong class="text-[10.5px] text-white font-extrabold">${metric.actual.toLocaleString()}</strong>
                <span class="text-slate-600">/</span>
                <strong class="text-[10.5px] text-slate-300 font-extrabold">${metric.target.toLocaleString()}</strong>
              </span>
            </div>
            <div class="mt-1 w-full bg-slate-800/60 rounded-md h-3.5 relative flex items-center overflow-hidden border border-slate-800">
              <div class="bg-gradient-to-r ${classes.bar} h-full rounded-l-lg opacity-85" style="width: ${Math.min(overallActualRate, 100)}%"></div>
              <span class="absolute left-2 text-[8px] font-bold text-white drop-shadow">${overallActualRate.toFixed(1)}%</span>
              <div class="absolute top-0 bottom-0 border-l-2 border-dashed border-emerald-400 z-20 w-0" style="left: ${Math.min(overallTargetRate, 100)}%" title="目標全体比: ${overallTargetRate.toFixed(1)}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const isSortedTransition = state.funnelComparisonSort?.stageKey === stage.key && state.funnelComparisonSort?.type === 'transition';
    const transitionLabelCell = `
      <button data-comparison-sort-stage="${stage.key}" data-comparison-sort-type="transition" class="${stickyLabelClass} border-t border-slate-800/70 p-1.5 flex items-center justify-between text-left group hover:bg-slate-900/80 transition w-full h-full min-h-[28px]">
        <div class="flex items-center gap-1.5">
          <span class="w-5 h-5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-center flex-shrink-0">
            <i data-lucide="arrow-down-up" class="w-3 h-3 text-slate-400"></i>
          </span>
          <span class="text-[9.5px] font-extrabold text-slate-400 group-hover:text-white transition">プロセス移行率</span>
        </div>
        <i data-lucide="${isSortedTransition && state.funnelComparisonSort.direction === 'asc' ? 'arrow-up-wide-narrow' : 'arrow-down-wide-narrow'}" class="w-3.5 h-3.5 ${isSortedTransition ? 'text-brand-cyan opacity-100' : 'text-slate-500 opacity-0 group-hover:opacity-100'} transition"></i>
      </button>
    `;

    const transitionRow = index === 0 ? '' : `
      ${transitionLabelCell}
      ${(() => {
        const metric = overallFunnel[stage.key];
        const prevStage = FUNNEL_STAGES[index - 1];
        const prevMetric = overallFunnel[prevStage.key];
        const transitionRate = prevMetric.actual > 0 ? (metric.actual / prevMetric.actual) * 100 : 0;
        const targetTransitionRate = prevMetric.target > 0 ? (metric.target / prevMetric.target) * 100 : 0;
        const transitionGap = transitionRate - targetTransitionRate;
        const isWeakTransition = transitionGap < 0;
        const transitionBarClass = transitionGap >= 0
          ? 'bg-emerald-400'
          : transitionGap >= -3
            ? 'bg-slate-300/80'
            : 'bg-rose-400';
        const isStageExpanded = state.expandedStages?.[stage.key] || false;
        return `
          <div class="${stickyOverallClass} border-l border-t border-slate-800/60 p-1.5 ${isWeakTransition ? 'bg-rose-950' : ''} flex flex-col justify-start gap-0.5" style="left: ${labelWidth}px;">
            <button onclick="toggleComparisonStageActions('${stage.key}', this)" data-action-stage="${stage.key}" class="w-full text-left py-0.5 hover:text-brand-cyan transition flex items-center justify-between gap-2 group">
              <div class="flex items-center gap-1.5 min-w-0">
                <div class="min-w-0">
                  <span class="text-[9.5px] whitespace-nowrap text-slate-200 group-hover:text-white transition">
                    <strong>${transitionRate.toFixed(1)}%</strong>
                    <span class="text-slate-600">/</span>
                    <span class="text-slate-400">${targetTransitionRate.toFixed(1)}%</span>
                  </span>
                </div>
              </div>
              <i data-lucide="chevron-down" class="process-action-chevron w-3.5 h-3.5 text-slate-500 transition-transform group-hover:text-brand-cyan ${isStageExpanded ? 'rotate-180' : ''}"></i>
            </button>
            <div class="mt-0.5 w-full bg-slate-800/60 rounded-full h-1 relative overflow-hidden">
              <div class="h-full rounded-full ${transitionBarClass}" style="width: ${Math.min(transitionRate, 100)}%"></div>
            </div>
          </div>
        `;
      })()}
      ${visibleItems.map(item => {
        const fData = item.funnel;
        const metric = fData[stage.key];
        const prevStage = FUNNEL_STAGES[index - 1];
        const prevMetric = fData[prevStage.key];
        const transitionRate = prevMetric.actual > 0 ? (metric.actual / prevMetric.actual) * 100 : 0;
        const targetTransitionRate = prevMetric.target > 0 ? (metric.target / prevMetric.target) * 100 : 0;
        const transitionGap = transitionRate - targetTransitionRate;
        const isWeakTransition = transitionGap < 0;
        const transitionBarClass = transitionGap >= 0
          ? 'bg-emerald-400'
          : transitionGap >= -3
            ? 'bg-slate-300/80'
            : 'bg-rose-400';
        const isStageExpanded = state.expandedStages?.[stage.key] || false;
        const panelId = `team-compare-${mode}-${item.id}-${stage.key}-actions`;
        const actionItems = getProcessActionChecks(stage.key, fData, 'team');
        const actionPanel = `
          <div id="${panelId}" class="process-action-panel ${isStageExpanded ? '' : 'hidden'} mt-2 space-y-2 border-l border-slate-800/80 pl-2">
            ${actionItems.map(action => {
              const itemClass = action.rate >= 100
                ? 'text-emerald-300 font-bold'
                : action.rate >= 80
                  ? 'text-brand-amber font-bold'
                  : 'text-rose-300 font-bold';
              const barClass = action.rate >= 100
                ? 'bg-emerald-400'
                : action.rate >= 80
                  ? 'bg-brand-amber'
                  : 'bg-rose-400';
              return `
                <div class="py-1">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <h6 class="text-[9px] font-medium text-slate-300 truncate">${action.label}</h6>
                    <span class="${itemClass} text-[8.5px]">${action.rate.toFixed(0)}%</span>
                  </div>
                  <div class="h-1 bg-slate-800/80 rounded-full overflow-hidden">
                    <div class="h-full rounded-full ${barClass}" style="width: ${Math.min(action.rate, 100)}%"></div>
                  </div>
                  <div class="mt-0.5 flex justify-between text-[7.5px] text-slate-500">
                    <span>${action.actual.toLocaleString()}${action.unit}</span>
                    <span>${action.target.toLocaleString()}${action.unit}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
        return `
          <div class="border-l border-t border-slate-800/60 p-1.5 ${isWeakTransition ? 'bg-rose-500/10' : 'bg-slate-950/30'} flex flex-col justify-start gap-0.5">
            <button onclick="toggleComparisonStageActions('${stage.key}', this)" data-action-stage="${stage.key}" class="w-full text-left py-0.5 hover:text-brand-cyan transition flex items-center justify-between gap-2 group">
              <div class="flex items-center gap-1.5 min-w-0">
                <div class="min-w-0">
                  <span class="text-[9.5px] whitespace-nowrap text-slate-200 group-hover:text-white transition">
                    <strong>${transitionRate.toFixed(1)}%</strong>
                    <span class="text-slate-600">/</span>
                    <span class="text-slate-400">${targetTransitionRate.toFixed(1)}%</span>
                  </span>
                </div>
              </div>
              <i data-lucide="chevron-down" class="process-action-chevron w-3.5 h-3.5 text-slate-500 transition-transform group-hover:text-brand-cyan ${isStageExpanded ? 'rotate-180' : ''}"></i>
            </button>
            <div class="mt-0.5 w-full bg-slate-800/60 rounded-full h-1 relative overflow-hidden">
              <div class="h-full rounded-full ${transitionBarClass}" style="width: ${Math.min(transitionRate, 100)}%"></div>
            </div>
            ${actionPanel}
          </div>
        `;
      }).join('')}
    `;

    return `${transitionRow}${labelCell}${overallStageCell}${cells}`;
  }).join('');

  matrix.innerHTML = `
    <div class="inline-grid min-w-full rounded-xl border border-slate-800/80 bg-slate-900/30" style="grid-template-columns: ${labelWidth}px ${columnWidth}px repeat(${visibleItems.length}, ${columnWidth}px);">
      <div class="${stickyLabelClass} p-2">
        <p class="text-xs font-bold text-slate-200">比較指標</p>
        <p class="text-[8.5px] text-slate-500 mt-1">工程名は左固定</p>
      </div>
      ${overallHeaderCell}
      ${headerCells}
      ${stageRows}
    </div>
  `;

  matrix.querySelectorAll('[data-action-panel]').forEach(button => {
    button.dataset.actionBound = 'true';
    const panelId = button.getAttribute('data-action-panel');
    const toggleActionPanel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      button.dataset.actionClicked = 'true';
      matrix.dataset.lastActionPanel = panelId || '';
      toggleProcessActions(panelId, button);
    };
    button.addEventListener('click', toggleActionPanel);
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        toggleActionPanel(e);
      }
    });
  });

  lucide.createIcons();
}

function toggleTeamComparisonVisibility(itemId) {
  const mode = state.funnelComparisonMode || 'team';
  const hidden = new Set(state.hiddenComparisonItemsByMode[mode] || []);
  if (hidden.has(itemId)) {
    hidden.delete(itemId);
  } else {
    hidden.add(itemId);
  }
  state.hiddenComparisonItemsByMode[mode] = [...hidden];
  if (mode === 'team') {
    state.hiddenComparisonTeams = [...hidden];
  }
  renderTeamFunnelComparisonMatrix();
}

function showAllTeamsInComparison() {
  const mode = state.funnelComparisonMode || 'team';
  state.hiddenComparisonItemsByMode[mode] = [];
  if (mode === 'team') {
    state.hiddenComparisonTeams = [];
  }
  renderTeamFunnelComparisonMatrix();
}

function setFunnelComparisonMode(mode) {
  state.funnelComparisonMode = mode;
  renderTeamFunnelComparisonMatrix();
}

function sortComparisonByStage(stageKey, type = 'metric') {
  const current = state.funnelComparisonSort || {};
  const isSameSort = current.stageKey === stageKey && current.type === type;
  const nextDirection = isSameSort && current.direction === 'desc' ? 'asc' : 'desc';
  state.funnelComparisonSort = { stageKey, type, direction: nextDirection };
  renderTeamFunnelComparisonMatrix();
}

window.toggleTeamComparisonVisibility = toggleTeamComparisonVisibility;
window.showAllTeamsInComparison = showAllTeamsInComparison;
window.setFunnelComparisonMode = setFunnelComparisonMode;
window.sortComparisonByStage = sortComparisonByStage;

function renderFunnelAnalysis(fData, stepsContainerId, bottleneckContainerId, scope = 'overall') {
  const container = document.getElementById(stepsContainerId);
  const bottleneckContainer = document.getElementById(bottleneckContainerId);
  if (!container || !bottleneckContainer || !fData) return;

  const regActual = fData.registrations.actual || 1;
  const regTarget = fData.registrations.target || 1;
  let htmlContent = '';

  FUNNEL_STAGES.forEach((stage, index) => {
    const actualVal = fData[stage.key].actual;
    const targetVal = fData[stage.key].target;
    const classes = FUNNEL_STAGE_CLASSES[stage.accent];
    const achievement = targetVal > 0 ? (actualVal / targetVal) * 100 : 0;
    const overallActualRate = regActual > 0 ? (actualVal / regActual) * 100 : 0;
    const overallTargetRate = regTarget > 0 ? (targetVal / regTarget) * 100 : 0;
    const panelId = `${stepsContainerId}-${stage.key}-actions`;
    const actionItems = getProcessActionChecks(stage.key, fData, scope);

    htmlContent += `
      <div class="relative">
        <button onclick="toggleProcessActions('${panelId}', this)" class="w-full text-left group flex items-center gap-3 py-1 px-1 rounded-xl hover:bg-slate-900/10 transition-colors">
          <div class="w-7 h-7 rounded-lg border ${classes.icon} flex items-center justify-center flex-shrink-0">
            <i data-lucide="${stage.icon}" class="w-3.5 h-3.5"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center mb-0.5 text-[11px]">
              <span class="font-bold text-white">
                ${index + 1}. ${stage.fullName}
              </span>
              <span class="text-slate-300 font-semibold flex items-center gap-1.5">
                <span>
                  ${actualVal.toLocaleString()} / <span class="text-brand-emerald font-bold">目標 ${targetVal.toLocaleString()}</span>
                  <span class="text-[10px] text-slate-500 font-normal">
                    (${index === 0 ? `${achievement.toFixed(0)}%` : `${overallActualRate.toFixed(1)}%`})
                  </span>
                </span>
                <i data-lucide="chevron-down" class="process-action-chevron w-3.5 h-3.5 text-slate-500 transition-transform group-hover:text-brand-cyan"></i>
              </span>
            </div>
            <div class="w-full bg-slate-800/60 rounded-md h-5.5 relative flex items-center overflow-hidden border border-slate-800 group-hover:border-brand-blue/30 transition">
              <div class="bg-gradient-to-r ${classes.bar} h-full rounded-l-lg opacity-85 transition-all duration-500" style="width: ${Math.min(overallActualRate, 100)}%"></div>
              <span class="absolute left-2.5 text-[10px] font-bold text-white drop-shadow">${overallActualRate.toFixed(1)}%</span>
              <div class="absolute top-0 bottom-0 border-l-2 border-dashed border-emerald-400 z-20 w-0" style="left: ${Math.min(overallTargetRate, 100)}%" title="目標全体比: ${overallTargetRate.toFixed(1)}%"></div>
            </div>
          </div>
        </button>
        <div id="${panelId}" class="process-action-panel hidden overflow-hidden">
          <div class="mt-1.5 p-2 rounded-xl bg-slate-950/35 border border-slate-800/70 grid grid-cols-1 gap-2">
            ${actionItems.map(item => {
              const itemClass = item.rate >= 100
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : item.rate >= 80
                  ? 'text-brand-amber bg-brand-amber/10 border-brand-amber/20'
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
              return `
                <div class="rounded-xl bg-slate-900/50 border border-slate-800/70 p-2">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h6 class="text-[10px] font-bold text-white">${item.label}</h6>
                      <p class="text-[8.5px] text-slate-500 mt-0.5">${item.reason}</p>
                    </div>
                    <span class="px-1.5 py-0.5 rounded border ${itemClass} text-[8px] font-bold">${item.rate.toFixed(0)}%</span>
                  </div>
                  <div class="flex justify-between text-[9px] text-slate-400 mb-0.5">
                    <span>実施 ${item.actual.toLocaleString()}${item.unit}</span>
                    <span>基準 ${item.target.toLocaleString()}${item.unit}</span>
                  </div>
                  <div class="h-1 bg-slate-800/80 rounded-full overflow-hidden">
                    <div class="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan" style="width: ${Math.min(item.rate, 100)}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    if (index < FUNNEL_STAGES.length - 1) {
      const nextStage = FUNNEL_STAGES[index + 1];
      const nextActualVal = fData[nextStage.key].actual;
      const nextTargetVal = fData[nextStage.key].target;
      const prevStepActualRate = actualVal > 0 ? (nextActualVal / actualVal) * 100 : 0;
      const prevStepTargetRate = targetVal > 0 ? (nextTargetVal / targetVal) * 100 : 0;
      const gap = prevStepActualRate - prevStepTargetRate;
      const gapSign = gap >= 0 ? '+' : '';
      const gapClass = gap >= 0
        ? 'text-emerald-400 font-bold bg-emerald-500/10 border-emerald-500/20'
        : 'text-rose-400 font-bold bg-rose-500/10 border-rose-500/20';

      const nextPanelId = `${stepsContainerId}-${nextStage.key}-actions`;

      htmlContent += `
        <div class="my-0.5 px-3 flex items-center gap-3">
          <div class="w-7 flex justify-center flex-shrink-0">
            <i data-lucide="arrow-down" class="w-3.5 h-3.5 text-slate-600"></i>
          </div>
          <button onclick="toggleProcessActions('${nextPanelId}', this)" class="flex-1 flex items-center justify-between py-1 text-[9.5px] text-slate-500 hover:text-brand-cyan group/trans transition">
            <span class="font-bold flex items-center transition-colors group-hover/trans:text-brand-cyan">
              <span>移行率: <strong class="text-slate-200 font-extrabold">${prevStepActualRate.toFixed(1)}%</strong></span>
            </span>
            <div class="flex items-center gap-2">
              <span class="text-slate-400 group-hover/trans:text-slate-300 transition-colors">目標: <strong class="text-brand-emerald/90 font-bold">${prevStepTargetRate.toFixed(1)}%</strong></span>
              <span class="px-1.5 py-0.5 rounded border ${gapClass} text-[8.5px] scale-90 origin-right transition-transform">目標比 ${gapSign}${gap.toFixed(1)}pt</span>
              <i data-lucide="chevron-down" class="process-action-chevron w-3.5 h-3.5 text-slate-500 transition-transform group-hover/trans:text-brand-cyan"></i>
            </div>
          </button>
        </div>
      `;
    }
  });

  container.innerHTML = htmlContent;

  const bottleneck = findFunnelBottleneck(fData);
  const isHealthy = bottleneck.gap >= 0;
  const advice = getFunnelAdvices()[bottleneck.stage.key] || {
    title: `${bottleneck.prevStage.name} → ${bottleneck.stage.name}`,
    action: '該当工程の案件を棚卸しし、目標移行率との差分を確認してください。',
    lever: '工程別移行率'
  };

  bottleneckContainer.innerHTML = `
    <div class="mt-5 p-4 rounded-xl ${isHealthy ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-rose-500/5 border-rose-500/15'} border flex items-start gap-3">
      <div class="p-2 rounded-lg ${isHealthy ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} border flex-shrink-0">
        <i data-lucide="${isHealthy ? 'shield-check' : 'shield-alert'}" class="w-4 h-4"></i>
      </div>
      <div class="flex-1 min-w-0 text-left">
        <div class="flex justify-between items-center gap-3 mb-1">
          <h5 class="text-xs font-bold text-slate-200">ボトルネック: <span class="${isHealthy ? 'text-emerald-400' : 'text-rose-400'} font-bold">${advice.title}</span></h5>
          <span class="px-2 py-0.5 rounded border ${isHealthy ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'} text-[8px] font-bold">
            目標比 ${bottleneck.gap.toFixed(1)}pt
          </span>
        </div>
        <p class="text-[10px] text-slate-400 leading-relaxed mt-0.5">${advice.action}</p>
        <div class="mt-3 pt-2.5 border-t border-slate-800/40 flex items-center gap-2 text-[9.5px]">
          <strong class="text-slate-300">改善レバー:</strong>
          <span class="${isHealthy ? 'text-brand-blue' : 'text-brand-amber'} font-bold">${advice.lever}</span>
        </div>
      </div>
    </div>
  `;
}

function renderFunnelSummaryList(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = items.map(item => {
    const fData = item.funnel;
    const bottleneck = findFunnelBottleneck(fData);
    const placementRate = fData.placements.target > 0 ? (fData.placements.actual / fData.placements.target) * 100 : 0;
    const conversion = fData.interviews.actual > 0 ? (fData.placements.actual / fData.interviews.actual) * 100 : 0;
    const statusClass = bottleneck.gap >= 0
      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      : bottleneck.gap >= -10
        ? 'bg-brand-amber/10 border-brand-amber/20 text-brand-amber'
        : 'bg-rose-500/10 border-rose-500/20 text-rose-400';

    return `
      <button onclick="${item.onClick}" class="w-full text-left p-3 rounded-2xl bg-slate-950/30 border border-slate-800/70 hover:border-brand-blue/35 hover:bg-slate-900/60 transition group">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="min-w-0">
            <h5 class="text-xs text-white font-bold truncate group-hover:text-brand-cyan transition">${item.name}</h5>
            <p class="text-[9px] text-slate-500 truncate mt-0.5">${item.caption || ''}</p>
          </div>
          <span class="px-2 py-0.5 rounded-full border ${statusClass} text-[9px] font-bold">${placementRate.toFixed(0)}%</span>
        </div>
        <div class="grid grid-cols-3 gap-2 text-[9px] text-slate-400">
          <span>面談 <strong class="text-white">${fData.interviews.actual}</strong></span>
          <span>推薦 <strong class="text-white">${fData.recommendations.actual}</strong></span>
          <span>決定 <strong class="text-white">${fData.placements.actual}</strong></span>
        </div>
        <div class="mt-2 w-full bg-slate-800/70 h-1.5 rounded-full overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan" style="width: ${Math.min(placementRate, 100)}%"></div>
        </div>
        <div class="mt-2 flex justify-between text-[9px] text-slate-500">
          <span>面談→決定 ${conversion.toFixed(1)}%</span>
          <span>詰まり ${bottleneck.prevStage.name}→${bottleneck.stage.name}</span>
        </div>
      </button>
    `;
  }).join('');
}

function getProcessActionChecks(stageKey, fData, scope) {
  const registrations = fData.registrations.actual || 1;
  const bookings = fData.bookings.actual || 1;
  const interviews = fData.interviews.actual || 1;
  const proposals = fData.proposals.actual || 1;
  const recommendations = fData.recommendations.actual || 1;
  const setups = fData.setups.actual || 1;
  const targetFactor = scope === 'member' ? 1 : 1;

  const actionMap = {
    registrations: [
      {
        label: '新規流入獲得',
        actual: fData.registrations.actual,
        target: fData.registrations.target,
        unit: '件',
        reason: 'ファネルの入口となる新規登録者を十分に獲得できているか'
      },
      {
        label: '掘り起こし接触',
        actual: Math.round(fData.registrations.actual * 0.82),
        target: Math.round(fData.registrations.target * 0.85),
        unit: '件',
        reason: '既存・休眠候補者への再接触で入口を補えているか'
      },
      {
        label: '求人訴求配信',
        actual: Math.round(fData.registrations.actual * 0.76),
        target: Math.round(fData.registrations.target * 0.8),
        unit: '件',
        reason: '登録を促す求人訴求やスカウト配信を実行できているか'
      }
    ],
    bookings: [
      {
        label: '初動架電量',
        actual: registrations,
        target: fData.registrations.target,
        unit: '件',
        reason: '登録者へ十分に初回接触できているか'
      },
      {
        label: '接続後の面談化',
        actual: fData.bookings.actual,
        target: Math.round(registrations * 0.75 * targetFactor),
        unit: '件',
        reason: '接続後に面談設定まで押し切れているか'
      },
      {
        label: '即時対応SLA',
        actual: Math.round(Math.min(100, (fData.bookings.actual / Math.max(fData.bookings.target, 1)) * 100)),
        target: 100,
        unit: '%',
        reason: '10分以内初動などの基準を満たせているか'
      }
    ],
    interviews: [
      {
        label: '面談リマインド',
        actual: fData.interviews.actual,
        target: Math.round(bookings * 0.82),
        unit: '件',
        reason: '設定後キャンセルを防ぐ事前確認ができているか'
      },
      {
        label: '3日以内実施',
        actual: Math.round(fData.interviews.actual * 0.9),
        target: Math.round(bookings * 0.75),
        unit: '件',
        reason: '熱量が落ちる前に面談を実施できているか'
      },
      {
        label: '再調整回収',
        actual: Math.max(0, bookings - fData.interviews.actual),
        target: Math.max(1, Math.round(bookings * 0.12)),
        unit: '件',
        reason: 'キャンセル分を再設定に戻せているか'
      }
    ],
    proposals: [
      {
        label: '面談当日提案',
        actual: fData.proposals.actual,
        target: Math.round(interviews * 1.8),
        unit: '件',
        reason: '面談後すぐに求人提示まで進めているか'
      },
      {
        label: '条件ヒアリング',
        actual: Math.round(interviews * 0.78),
        target: Math.round(interviews * 0.85),
        unit: '件',
        reason: '提案に必要な希望条件を握れているか'
      },
      {
        label: 'RAすり合わせ',
        actual: Math.round(interviews * 0.72),
        target: Math.round(interviews * 0.8),
        unit: '件',
        reason: '求人側との当日連携ができているか'
      }
    ],
    recommendations: [
      {
        label: '推薦意思確認',
        actual: fData.recommendations.actual,
        target: Math.round(proposals * 0.72),
        unit: '件',
        reason: '提案求人を推薦承諾まで進められているか'
      },
      {
        label: '推薦理由説明',
        actual: Math.round(fData.recommendations.actual * 0.86),
        target: Math.round(fData.recommendations.target * 0.95),
        unit: '件',
        reason: '候補者に求人ごとの納得理由を伝えられているか'
      },
      {
        label: '書類回収',
        actual: Math.round(fData.recommendations.actual * 0.92),
        target: fData.recommendations.target,
        unit: '件',
        reason: '推薦提出に必要な書類が滞留していないか'
      }
    ],
    setups: [
      {
        label: '24h企業打診',
        actual: fData.setups.actual,
        target: Math.round(recommendations * 0.52),
        unit: '件',
        reason: '推薦後すぐ企業へ打診できているか'
      },
      {
        label: '日程候補回収',
        actual: Math.round(fData.setups.actual * 0.9),
        target: Math.round(fData.setups.target * 0.95),
        unit: '件',
        reason: '面接設定に必要な候補日を回収できているか'
      },
      {
        label: '選考理由回収',
        actual: Math.round(recommendations * 0.42),
        target: Math.round(recommendations * 0.5),
        unit: '件',
        reason: '書類選考の通過/NG理由を回収できているか'
      }
    ],
    placements: [
      {
        label: '面接前対策',
        actual: Math.round(setups * 0.7),
        target: Math.round(setups * 0.8),
        unit: '件',
        reason: '面接前に志望動機整理・想定問答ができているか'
      },
      {
        label: '面接後即日回収',
        actual: Math.round(setups * 0.68),
        target: Math.round(setups * 0.85),
        unit: '件',
        reason: '面接後の温度感と懸念を即日回収できているか'
      },
      {
        label: '承諾クロージング',
        actual: fData.placements.actual,
        target: fData.placements.target,
        unit: '件',
        reason: '内定後の比較・辞退懸念を潰せているか'
      }
    ]
  };

  return (actionMap[stageKey] || []).map(item => ({
    ...item,
    target: Math.max(1, item.target),
    rate: item.target > 0 ? (item.actual / item.target) * 100 : 0
  }));
}

function toggleProcessActions(panelId, trigger) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  panel.classList.toggle('hidden');
  panel.classList.toggle('process-action-panel-open');

  const isHidden = panel.classList.contains('hidden');

  // Rotate chevron in the trigger itself
  const chevron = trigger?.querySelector('.process-action-chevron');
  if (chevron) {
    chevron.classList.toggle('rotate-180', !isHidden);
  }

  // Synchronize chevrons on all buttons that target this panelId
  const triggers = document.querySelectorAll(`[onclick*="${panelId}"]`);
  triggers.forEach(t => {
    const chev = t.querySelector('.process-action-chevron');
    if (chev) {
      chev.classList.toggle('rotate-180', !isHidden);
    }
  });
}

window.toggleProcessActions = toggleProcessActions;

window.toggleComparisonStageActions = function(stageKey, trigger) {
  const matrix = document.getElementById('teamFunnelComparisonMatrix');
  if (!matrix) return;

  const panels = [...matrix.querySelectorAll(`.process-action-panel[id$="-${stageKey}-actions"]`)];
  if (panels.length === 0) return;

  const shouldOpen = panels.some(panel => panel.classList.contains('hidden'));
  panels.forEach(panel => {
    panel.classList.toggle('hidden', !shouldOpen);
    panel.classList.toggle('process-action-panel-open', shouldOpen);
  });

  const labelChevron = trigger?.querySelector('.comparison-stage-chevron')
    || matrix.querySelector(`.comparison-stage-chevron[data-stage-key="${stageKey}"]`);
  if (labelChevron) {
    labelChevron.classList.toggle('rotate-180', shouldOpen);
  }
};

window.setAllProcessActions = function(open) {
  const activeLayer = document.querySelector('.funnel-layer-content:not(.hidden)');
  const root = activeLayer || document;
  root.querySelectorAll('.process-action-panel').forEach(panel => {
    panel.classList.toggle('hidden', !open);
    panel.classList.toggle('process-action-panel-open', open);
  });
  root.querySelectorAll('.process-action-chevron').forEach(chevron => {
    chevron.classList.toggle('rotate-180', open);
  });
};

function renderRevenueProgress() {
  const kpiGrid = document.getElementById('revenueKpiGrid');
  if (!kpiGrid) return;

  const revenue = dashboardData.kpis.revenue;
  const offers = dashboardData.kpis.offers;
  const cumulativeTarget = getCumulativeArray(dashboardData.monthlyTrend.target);
  const cumulativeActual = getCumulativeArray(dashboardData.monthlyTrend.actual);
  const cumulativeForecast = getCumulativeArray(dashboardData.monthlyTrend.forecast);
  const currentIndex = 5;
  const forecast = cumulativeForecast[currentIndex];
  const target = cumulativeTarget[currentIndex];
  const actual = cumulativeActual[currentIndex];
  const forecastGap = forecast - target;

  const kpis = [
    { label: '年度累計売上', value: `${actual.toLocaleString()}万`, sub: `累計目標 ${target.toLocaleString()}万`, pct: (actual / target) * 100, tone: 'blue' },
    { label: '年度着地予測', value: `${forecast.toLocaleString()}万`, sub: `累計目標差 ${forecastGap >= 0 ? '+' : ''}${forecastGap.toLocaleString()}万`, pct: (forecast / target) * 100, tone: forecastGap >= 0 ? 'emerald' : 'amber' },
    { label: '当月決定数', value: `${offers.value}件`, sub: `当月目標 ${offers.target}件`, pct: offers.achievementRate, tone: 'cyan' },
    { label: '平均単価', value: `${dashboardData.unitPriceTrend.avgCommission.at(-1)}万`, sub: '紹介手数料', pct: 100, tone: 'purple' }
  ];

  kpiGrid.innerHTML = kpis.map(kpi => {
    const color = {
      blue: 'from-brand-blue to-brand-cyan text-brand-blue',
      emerald: 'from-brand-emerald to-emerald-300 text-brand-emerald',
      amber: 'from-brand-amber to-yellow-300 text-brand-amber',
      cyan: 'from-brand-cyan to-cyan-300 text-brand-cyan',
      purple: 'from-brand-purple to-violet-400 text-brand-purple'
    }[kpi.tone];
    return `
      <div class="glass-panel rounded-2xl p-5">
        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">${kpi.label}</p>
        <div class="mt-2 flex items-end justify-between gap-3">
          <strong class="text-2xl font-extrabold text-white">${kpi.value}</strong>
          <span class="text-[10px] ${color.split(' ').at(-1)} font-bold">${kpi.pct.toFixed(0)}%</span>
        </div>
        <p class="text-[10px] text-slate-400 mt-1">${kpi.sub}</p>
        <div class="mt-3 h-1.5 bg-slate-800/70 rounded-full overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r ${color.replace(` ${color.split(' ').at(-1)}`, '')}" style="width: ${Math.min(kpi.pct, 100)}%"></div>
        </div>
      </div>
    `;
  }).join('');

  renderRevenueProgressChart();
  renderTeamRevenueList();
  renderUnitPriceMiniChart();
  renderLossReasonList();
}

function renderRevenueProgressChart() {
  const el = document.getElementById('revenueProgressChart');
  if (!el) return;

  if (charts.revenueProgress) {
    charts.revenueProgress.destroy();
  }

  const cumulativeTarget = getCumulativeArray(dashboardData.monthlyTrend.target);
  const cumulativeActual = getCumulativeArray(dashboardData.monthlyTrend.actual);
  const cumulativeForecast = getCumulativeArray(dashboardData.monthlyTrend.forecast);

  charts.revenueProgress = new ApexCharts(el, {
    series: [
      { name: '年度累計目標', data: cumulativeTarget },
      { name: '年度累計実績', data: cumulativeActual },
      { name: '年度累計予測', data: cumulativeForecast }
    ],
    chart: { type: 'line', height: 320, background: 'transparent', toolbar: { show: false }, foreColor: '#94a3b8' },
    colors: ['#60a5fa', '#10b981', '#f59e0b'],
    stroke: { width: [3, 4, 3], curve: 'smooth', dashArray: [5, 0, 4] },
    fill: { type: 'gradient', gradient: { shade: 'dark', opacityFrom: 0.24, opacityTo: 0.04 } },
    labels: dashboardData.monthlyTrend.months,
    markers: { size: [0, 5, 0] },
    grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
    yaxis: { labels: { formatter: value => `${value.toLocaleString()}万` } },
    legend: { labels: { colors: '#94a3b8' } },
    tooltip: { theme: 'dark', y: { formatter: value => `${value?.toLocaleString()}万円 (年度累計)` } }
  });
  charts.revenueProgress.render();
}

function renderTeamRevenueList() {
  const container = document.getElementById('teamRevenueList');
  if (!container) return;

  const avgCommission = 125;
  const teams = Object.values(dashboardData.teamsData)
    .map(team => {
      const actual = team.funnel.placements.actual * avgCommission;
      const target = team.funnel.placements.target * avgCommission;
      return { team, actual, target, pct: target > 0 ? (actual / target) * 100 : 0 };
    })
    .sort((a, b) => a.pct - b.pct);

  container.innerHTML = teams.map(item => {
    const status = item.pct >= 100 ? 'text-emerald-400' : item.pct >= 80 ? 'text-brand-amber' : 'text-rose-400';
    return `
      <div class="p-3 rounded-2xl bg-slate-950/30 border border-slate-800/70">
        <div class="flex items-center justify-between gap-3 mb-2">
          <div>
            <h4 class="text-xs font-bold text-white">${item.team.name}</h4>
            <p class="text-[9px] text-slate-500">${item.team.leader}</p>
          </div>
          <strong class="${status} text-xs">${item.pct.toFixed(0)}%</strong>
        </div>
        <div class="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>実績 ${item.actual.toLocaleString()}万</span>
          <span>目標 ${item.target.toLocaleString()}万</span>
        </div>
        <div class="h-1.5 bg-slate-800/70 rounded-full overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan" style="width: ${Math.min(item.pct, 100)}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderUnitPriceMiniChart() {
  const el = document.getElementById('unitPriceMiniChart');
  if (!el) return;

  if (charts.unitPriceMini) {
    charts.unitPriceMini.destroy();
  }

  charts.unitPriceMini = new ApexCharts(el, {
    series: [
      { name: '紹介手数料', data: dashboardData.unitPriceTrend.avgCommission },
      { name: '決定年収', data: dashboardData.unitPriceTrend.avgSalary }
    ],
    chart: { type: 'line', height: 260, background: 'transparent', toolbar: { show: false }, foreColor: '#94a3b8' },
    colors: ['#06b6d4', '#8b5cf6'],
    stroke: { width: 3, curve: 'smooth' },
    labels: dashboardData.unitPriceTrend.months,
    grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
    legend: { labels: { colors: '#94a3b8' } },
    yaxis: { labels: { formatter: value => `${value}万` } },
    tooltip: { theme: 'dark', y: { formatter: value => `${value}万円` } }
  });
  charts.unitPriceMini.render();
}

function renderLossReasonList() {
  const container = document.getElementById('lossReasonList');
  if (!container) return;

  const max = Math.max(...dashboardData.lossReasons.values);
  container.innerHTML = dashboardData.lossReasons.categories.map((category, index) => {
    const value = dashboardData.lossReasons.values[index];
    const pct = max > 0 ? (value / max) * 100 : 0;
    return `
      <div>
        <div class="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>${category}</span>
          <strong class="text-white">${value}件</strong>
        </div>
        <div class="h-2 bg-slate-800/70 rounded-full overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-rose-500 to-brand-amber" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderMarketOverview() {
  const heatmapEl = document.getElementById('marketHeatmapMiniChart');
  if (!heatmapEl) return;

  renderMarketHeatmapMini();
  renderMarketSummaryList();
  renderContractShareList();
}

function renderMarketHeatmapMini() {
  const el = document.getElementById('marketHeatmapMiniChart');
  if (!el) return;

  if (charts.marketHeatmapMini) {
    charts.marketHeatmapMini.destroy();
  }

  charts.marketHeatmapMini = new ApexCharts(el, {
    series: dashboardData.marketHeatmap,
    chart: { height: 380, type: 'heatmap', background: 'transparent', toolbar: { show: false }, foreColor: '#94a3b8' },
    plotOptions: {
      heatmap: {
        radius: 4,
        colorScale: {
          ranges: [
            { from: 0.0, to: 0.9, name: '買い手', color: '#2563eb' },
            { from: 0.91, to: 1.8, name: '均衡', color: '#06b6d4' },
            { from: 1.81, to: 2.8, name: '売り手', color: '#f59e0b' },
            { from: 2.81, to: 5.0, name: '超売り手', color: '#ef4444' }
          ]
        }
      }
    },
    dataLabels: { enabled: true, style: { colors: ['#fff'], fontSize: '10px' } },
    stroke: { width: 2, colors: ['#0a0f1d'] },
    grid: { padding: { right: 16 } },
    tooltip: { theme: 'dark', y: { formatter: value => `${value.toFixed(1)}倍` } }
  });
  charts.marketHeatmapMini.render();
}

function renderMarketSummaryList() {
  const container = document.getElementById('marketSummaryList');
  if (!container) return;

  const rows = dashboardData.marketHeatmap
    .flatMap(area => area.data.map(item => ({ area: area.name, category: item.x, ratio: item.y })))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 6);

  container.innerHTML = rows.map(row => {
    const tone = row.ratio >= 2.8 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : row.ratio >= 1.8 ? 'text-brand-amber bg-brand-amber/10 border-brand-amber/20' : 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20';
    return `
      <div class="p-3 rounded-2xl bg-slate-950/30 border border-slate-800/70 flex items-center justify-between gap-3">
        <div>
          <h4 class="text-xs font-bold text-white">${row.area}</h4>
          <p class="text-[9px] text-slate-500">${row.category}</p>
        </div>
        <span class="px-2 py-0.5 rounded-full border ${tone} text-[10px] font-bold">${row.ratio.toFixed(1)}倍</span>
      </div>
    `;
  }).join('');
}

function renderContractShareList() {
  const container = document.getElementById('contractShareList');
  if (!container) return;

  const total = dashboardData.contractTypes.values.reduce((sum, value) => sum + value, 0);
  container.innerHTML = dashboardData.contractTypes.labels.map((label, index) => {
    const value = dashboardData.contractTypes.values[index];
    const pct = total > 0 ? (value / total) * 100 : 0;
    return `
      <div>
        <div class="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>${label}</span>
          <strong class="text-white">${pct.toFixed(1)}%</strong>
        </div>
        <div class="h-2 bg-slate-800/70 rounded-full overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-cyan" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTeamComparison() {
  const container = document.getElementById('teamComparisonGrid');
  if (!container || !dashboardData.teamsData) return;

  // 選択された期間の倍率を取得
  let multiplier = 1.0;
  if (state.selectedPeriod === 'last-month') {
    multiplier = 1.12;
  } else if (state.selectedPeriod === 'q1') {
    multiplier = 3.25;
  } else if (state.selectedPeriod === 'fy-total') {
    multiplier = 12.0;
  }

  const isCumulative = state.selectedPeriod === 'q1' || state.selectedPeriod === 'fy-total';

  const statusConfig = {
    good: {
      label: '良好',
      badge: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 glow-badge-emerald',
      accent: 'group-hover:text-brand-blue',
      bar: 'bg-gradient-to-r from-brand-blue to-brand-cyan',
      placementBar: 'bg-gradient-to-r from-brand-emerald to-emerald-400',
      button: 'hover:bg-brand-blue/15 hover:border-brand-blue/30'
    },
    warning: {
      label: '注意',
      badge: 'bg-amber-500/10 border border-amber-500/20 text-brand-amber glow-badge-amber',
      accent: 'group-hover:text-brand-amber',
      bar: 'bg-brand-amber',
      placementBar: 'bg-brand-amber',
      button: 'hover:bg-brand-amber/15 hover:border-brand-amber/30'
    },
    danger: {
      label: '警告',
      badge: 'bg-rose-500/10 border border-rose-500/20 text-rose-400 glow-badge-rose animate-pulse',
      accent: 'group-hover:text-rose-500',
      bar: 'bg-rose-500',
      placementBar: 'bg-rose-600',
      button: 'hover:bg-rose-500/15 hover:border-rose-500/30'
    }
  };

  const sortedTeams = Object.entries(dashboardData.teamsData).sort(([, teamA], [, teamB]) => {
    const priority = { danger: 0, warning: 1, good: 2 };
    return (priority[teamA.status] ?? 2) - (priority[teamB.status] ?? 2);
  });

  container.innerHTML = sortedTeams.map(([teamId, team]) => {
    const cfg = statusConfig[team.status] || statusConfig.good;
    const conversion = team.funnel.interviews.actual > 0
      ? ((team.funnel.placements.actual / team.funnel.interviews.actual) * 100).toFixed(1)
      : '0.0';

    const metricRows = [
      ['新規面談実施' + (isCumulative ? ' (累計)' : ''), team.funnel.interviews, cfg.bar],
      ['求人推薦数' + (isCumulative ? ' (累計)' : ''), team.funnel.recommendations, cfg.bar],
      ['決定数' + (isCumulative ? ' (累計)' : ''), team.funnel.placements, cfg.placementBar]
    ].map(([label, metric, barClass]) => {
      const isHealthy = metric.percent >= 100;
      const textClass = isHealthy ? 'text-emerald-400' : (metric.percent >= 80 ? 'text-brand-amber' : 'text-rose-400');
      // 倍率を適用した値
      const actualVal = Math.round(metric.actual * multiplier);
      const targetVal = Math.round(metric.target * multiplier);
      return `
        <div>
          <div class="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>${label}: <strong class="text-white">${actualVal.toLocaleString()}件</strong> / 目標 ${targetVal.toLocaleString()}件</span>
            <span class="${textClass} font-bold">${metric.percent.toFixed(1)}%</span>
          </div>
          <div class="w-full bg-slate-800/60 rounded-full h-1 overflow-hidden">
            <div class="${barClass} h-full rounded-full" style="width: ${Math.min(metric.percent, 100)}%"></div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="bg-slate-900/30 p-5 rounded-xl border border-slate-800/80 hover:border-slate-700/60 transition flex flex-col justify-between group">
        <div>
          <div class="flex justify-between items-start mb-3">
            <div>
              <h5 class="text-xs font-bold text-white ${cfg.accent} transition">${team.name}</h5>
              <p class="text-[9px] text-slate-500 mt-0.5">${team.leader}</p>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${cfg.badge}">${cfg.label}</span>
          </div>

          <div class="space-y-3.5 mb-5 pt-2 border-t border-slate-800/60">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              ${isCumulative ? '年度累計ファネル進捗' : '当月ファネル進捗 (累計)'}
            </div>
            ${metricRows}
            <div class="pt-2 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-800/20">
              <span>成約率 (面談→決定):</span>
              <strong class="text-white text-xs font-bold">${conversion}% <span class="text-[9px] text-slate-500 font-normal">(平均11.7%)</span></strong>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-800/60">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">週次行動量 (目標 vs 実績)</div>
            <div id="teamActivityChart-${teamId}" class="h-40"></div>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-slate-800/60">
          <button onclick="selectTeamAndScroll('${teamId}')" class="w-full py-2 rounded-lg bg-slate-800/80 ${cfg.button} border border-slate-700/60 text-[10.5px] font-bold text-slate-300 hover:text-white transition flex items-center justify-center gap-1">
            <span>このチームのファネルを見る</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // 各チームのミニチャートを再描画
  setTimeout(() => {
    Object.entries(dashboardData.teamsData).forEach(([teamId, team]) => {
      const elementId = `#teamActivityChart-${teamId}`;
      const chartEl = document.querySelector(elementId);
      if (chartEl) {
        // 既存のグラフを破棄してメモリリークを防ぐ
        if (charts.teamActivities[teamId]) {
          try {
            charts.teamActivities[teamId].destroy();
          } catch (e) {
            // すでに破棄されている場合は無視
          }
        }
        // 再初期化
        charts.teamActivities[teamId] = createTeamMiniBarChart(
          elementId,
          team.weeklyActivity.target,
          team.weeklyActivity.actual,
          team.weeklyActivity.categories
        );
      }
    });
  }, 120);

  lucide.createIcons();
}

// チーム別ファネル ＆ 動的ボトルネック診断の描画
function renderFunnel() {
  const container = document.getElementById('funnelStepsContainer');
  const bottleneckContainer = document.getElementById('funnelBottleneckContainer');
  if (!container || !bottleneckContainer || !dashboardData.teamsData) return;

  const team = state.selectedTeam === 'all'
    ? { name: '全体', funnel: aggregateFunnelData() }
    : dashboardData.teamsData[state.selectedTeam];
  if (!team) return;
  const fData = team.funnel;

  const stages = [
    { name: "1. 新規登録者", key: "registrations", dot: "bg-slate-400", bar: "bg-gradient-to-r from-slate-700 to-slate-600" },
    { name: "2. 新規面談設定", key: "bookings", dot: "bg-brand-blue", bar: "bg-gradient-to-r from-brand-blue/70 to-brand-blue/50" },
    { name: "3. 新規面談実施", key: "interviews", dot: "bg-brand-cyan", bar: "bg-gradient-to-r from-brand-cyan/70 to-brand-cyan/50" },
    { name: "4. 求人マッチング提案", key: "proposals", dot: "bg-brand-purple", bar: "bg-gradient-to-r from-brand-purple/70 to-brand-purple/50" },
    { name: "5. 推薦承諾・書類提出", key: "recommendations", dot: "bg-pink-500", bar: "bg-gradient-to-r from-pink-500/70 to-pink-500/50" },
    { name: "6. 面接実施", key: "setups", dot: "bg-brand-amber", bar: "bg-gradient-to-r from-brand-amber/70 to-brand-amber/50" },
    { name: "7. 内定承諾（決定）", key: "placements", dot: "bg-brand-emerald", bar: "bg-gradient-to-r from-brand-emerald/75 to-brand-emerald/50" }
  ];

  let htmlContent = "";
  const regActual = fData.registrations.actual;
  const regTarget = fData.registrations.target;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const actualVal = fData[stage.key].actual;
    const targetVal = fData[stage.key].target;

    // 達成率
    const achievement = targetVal > 0 ? (actualVal / targetVal) * 100 : 0;
    // 全体登録比
    const overallActualRate = regActual > 0 ? (actualVal / regActual) * 100 : 0;
    const overallTargetRate = regTarget > 0 ? (targetVal / regTarget) * 100 : 0;

    // プロセス移行率コネクターの生成 (登録ステップ以外)
    if (i > 0) {
      const prevStage = stages[i - 1];
      const prevActualVal = fData[prevStage.key].actual;
      const prevTargetVal = fData[prevStage.key].target;
      const prevStepActualRate = prevActualVal > 0 ? (actualVal / prevActualVal) * 100 : 0;
      const prevStepTargetRate = prevTargetVal > 0 ? (targetVal / prevTargetVal) * 100 : 0;
      const gap = prevStepActualRate - prevStepTargetRate;
      const gapSign = gap >= 0 ? "+" : "";
      const gapClass = gap >= 0 ? "text-emerald-400 font-bold bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 font-bold bg-rose-500/10 border-rose-500/20";

      htmlContent += `
        <!-- コネクターフロー (前工程からの移行率) -->
        <div class="flex items-center justify-between px-3 py-1.5 my-1.5 rounded-lg bg-slate-900/20 border border-slate-800/40 text-[9.5px]">
          <span class="text-slate-400 font-semibold flex items-center gap-1">
            <i data-lucide="arrow-down" class="w-3.5 h-3.5 text-slate-500 animate-bounce"></i>
            <span>プロセス移行率:</span>
          </span>
          <div class="flex items-center gap-2.5">
            <span class="text-slate-300">実績: <strong class="text-white">${prevStepActualRate.toFixed(1)}%</strong></span>
            <span class="text-slate-600">|</span>
            <span class="text-slate-400">目標: <strong class="text-brand-emerald">${prevStepTargetRate.toFixed(1)}%</strong></span>
            <span class="px-1.5 py-0.5 rounded border ${gapClass} text-[8.5px]">
              目標比 ${gapSign}${gap.toFixed(1)}%
            </span>
          </div>
        </div>
      `;
    }

    // ファネルバー本体
    htmlContent += `
      <div class="relative">
        <div class="flex justify-between items-center mb-1 text-[11px]">
          <span class="font-bold flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${stage.dot}"></span>
            ${stage.name}
          </span>
          <span class="text-slate-300 font-semibold">
            ${actualVal} 名 / <span class="text-brand-emerald font-bold">目標 ${targetVal} 名</span> 
            <span class="text-[10px] text-slate-500 font-normal">
              (${i === 0 ? `達成率 ${achievement.toFixed(0)}%` : `全体比 ${overallActualRate.toFixed(1)}% / 目標 ${overallTargetRate.toFixed(1)}%`})
            </span>
          </span>
        </div>
        <div class="w-full bg-slate-800/60 rounded-lg h-8 relative flex items-center overflow-hidden border border-slate-800">
          <div class="${stage.bar} h-full rounded-l-lg opacity-85 transition-all duration-500" style="width: ${overallActualRate}%"></div>
          <span class="absolute left-3 text-xs font-bold text-white drop-shadow">${overallActualRate.toFixed(1)}%</span>
          <div class="absolute top-0 bottom-0 border-l-2 border-dashed border-emerald-400 z-20 w-0" style="left: ${overallTargetRate}%" title="目標全体比: ${overallTargetRate.toFixed(1)}%"></div>
        </div>
      </div>
    `;
  }

  container.innerHTML = htmlContent;

  // ボトルネック自動検出 ＆ コーチングアドバイス生成
  let minGap = Infinity;
  let bottleneckIndex = -1;

  for (let i = 1; i < stages.length; i++) {
    const prevActualVal = fData[stages[i - 1].key].actual;
    const prevTargetVal = fData[stages[i - 1].key].target;
    const actualVal = fData[stages[i].key].actual;
    const targetVal = fData[stages[i].key].target;

    const prevStepActualRate = prevActualVal > 0 ? (actualVal / prevActualVal) * 100 : 0;
    const prevStepTargetRate = prevTargetVal > 0 ? (targetVal / prevTargetVal) * 100 : 0;
    const gap = prevStepActualRate - prevStepTargetRate;

    if (gap < minGap) {
      minGap = gap;
      bottleneckIndex = i;
    }
  }

  const advices = {
    1: {
      title: "新規面談設定 (登録 → 設定)",
      desc: "新規登録から面談設定への移行率（設定率）が課題となっています。登録者への初期アプローチの遅れや、架電タイミングのミスマッチが要因です。薬剤師の接続率が高い平日19:00以降や木曜・土曜にコールを集中させ、初期トークで人気求人をフックに面談移行率を高めてください。",
      remedy: "10分以内初動架電率の徹底 / 架電時間帯のゴールデンタイム集中"
    },
    2: {
      title: "新規面談実施 (設定 → 実施)",
      desc: "面談設定から実施への移行率（接続率・キャンセル防止）が低迷しています。設定から面談日までの期間が空きすぎているか、面談前のリマインド確認が不十分な可能性があります。面談予約時は3日以内の日程を設定し、前日には必ず確認メッセージまたはコールを徹底してください。",
      remedy: "面談設定から3日以内の面談実施 / 前日のリマインドコール徹底"
    },
    3: {
      title: "求人提案 (面談実施 → 求人提案)",
      desc: "面談実施から求人提案への移行率が課題です。面談時のヒアリングで転職本音や条件が握りきれておらず、提案求人のミスマッチが生じているか、求人RA側との連携不足が懸念されます。面談時の『3大本音』のヒアリング充足度を見直し、RAと即時すり合わせを行ってください。",
      remedy: "ヒアリング充足率の向上 / CA-RA間の当日マッチングすり合わせ"
    },
    4: {
      title: "推薦提出 (求人提案 → 推薦提出)",
      desc: "提案から推薦承諾（書類提出）への歩留まりが最も悪化しています。求職者に大量の求人を送りつける『ガチャ打ち』状態になり、意思決定を迷わせている可能性があります。提案数を1人あたり3〜4件の厳選求人に絞り込み、それぞれの求人の推薦理由を熱量高く説明してください。",
      remedy: "提案求人数の厳選（ガチャ打ち防止）/ 各求人の強み・マッチ理由の個別解説"
    },
    5: {
      title: "面接実施 (推薦提出 → 面接実施)",
      desc: "推薦提出から面接実施（選考通過・調整）への移行率に最大のボトルネックがあります。企業側の選考遅延、推薦後のスピード打診の遅れ、あるいは書類選考落ちが頻発している可能性があります。推薦後24時間以内の企業打診を徹底し、RAによる企業への積極的なプッシュを強化してください。",
      remedy: "推薦後24時間以内のスピード打診 / RAによる企業プッシュ・選考理由回収"
    },
    6: {
      title: "内定承諾・決定 (面接実施 → 内定承諾)",
      desc: "面接から最終成約（内定承諾）への歩留まりが最も低迷しています。面接前の志望動機整理や模擬面接などの事前対策が不十分なため、面接辞退や他社敗退、現職引き止めによる離職が起きています。面接前の『模擬面接前対策率』を80%以上に引き上げ、他社比較のサポートを強化してください。",
      remedy: "模擬面接・選考対策の80%以上実施 / 内定承諾の即日グリップ・辞退理由の事前潰し"
    }
  };

  const perfectScoreAdvice = {
    title: "プロセス効率：極めて健全 (目標クリア)",
    desc: "素晴らしい実績です！現在、チームのすべての工程で目標歩留まりを上回る効率性を達成しています。無駄のない高品質なパイプライン管理が行われています。この高い行動品質を標準化・チームメンバーへ展開しつつ、さらなる『新規登録数』などの行動分母の拡大に注力してください。",
    remedy: "高品質プロセスの標準マニュアル化 / 新規アプローチ数の増加によるスケール"
  };

  const advice = minGap < 0 ? advices[bottleneckIndex] : perfectScoreAdvice;
  const isHealthy = minGap >= 0;

  bottleneckContainer.innerHTML = `
    <div class="mt-5 p-4 rounded-xl ${isHealthy ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-rose-500/5 border-rose-500/15'} border flex items-start gap-3">
      <div class="p-2 rounded-lg ${isHealthy ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} border flex-shrink-0 animate-pulse">
        <i data-lucide="${isHealthy ? 'shield-check' : 'shield-alert'}" class="w-4 h-4"></i>
      </div>
      <div class="flex-1 min-w-0 text-left">
        <div class="flex justify-between items-center mb-1">
          <h5 class="text-xs font-bold text-slate-200">全体ボトルネック診断: <span class="${isHealthy ? 'text-emerald-400' : 'text-rose-400'} font-bold">${advice.title}</span></h5>
          ${minGap < 0 ? `<span class="px-2 py-0.5 rounded border border-rose-500/20 bg-rose-500/10 text-rose-400 text-[8px] font-bold">目標比 ${minGap.toFixed(1)}%</span>` : `<span class="px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[8px] font-bold">優秀</span>`}
        </div>
        <p class="text-[10px] text-slate-400 leading-relaxed mt-0.5">
          ${advice.desc}
        </p>
        <div class="mt-3 pt-2.5 border-t border-slate-800/40 flex items-center gap-2 text-[9.5px]">
          <strong class="text-slate-300">💡 改善の第一アクション:</strong>
          <span class="${isHealthy ? 'text-brand-blue' : 'text-brand-amber'} font-bold">${advice.remedy}</span>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
}

// 3-1. リアルタイムアクティビティフィードの描画

// 3-1. リアルタイムアクティビティフィードの描画
function renderActivityFeed() {
  const container = document.getElementById('feedContainer');
  if (!container) return;

  container.innerHTML = dashboardData.activityFeed.map(item => {
    let icon = 'info';
    let iconClass = 'bg-slate-800 text-slate-400 border-slate-700';
    
    if (item.type === 'placement') {
      icon = 'award';
      iconClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 glow-badge-emerald';
    } else if (item.type === 'offer') {
      icon = 'check-circle-2';
      iconClass = 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20 glow-badge-blue';
    } else if (item.type === 'recommendation') {
      icon = 'send';
      iconClass = 'bg-brand-purple/10 text-brand-purple border-brand-purple/20';
    } else if (item.type === 'interview' || item.type === 'interview_done') {
      icon = 'calendar';
      iconClass = 'bg-brand-blue/10 text-brand-blue border-brand-blue/20';
    } else if (item.type === 'job_order') {
      icon = 'file-text';
      iconClass = 'bg-brand-amber/10 text-brand-amber border-brand-amber/20';
    }

    return `
      <div class="flex gap-3.5 items-start p-3 rounded-xl bg-slate-900/30 border border-slate-800/40 hover:bg-slate-900/50 transition">
        <div class="w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconClass}">
          <i data-lucide="${icon}" class="w-4 h-4"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-center mb-0.5">
            <span class="text-[11px] font-bold text-slate-200">${item.member}</span>
            <span class="text-[9px] text-slate-500">${item.time}</span>
          </div>
          <p class="text-[10.5px] text-slate-400 leading-relaxed">${item.message}</p>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons({ attrs: { class: 'w-4 h-4' } });
}

// 3-2. リーダーボード
window.sortLeaderboard = function(metric) {
  state.leaderboardMetric = metric;

  const metrics = ['calls', 'interviews', 'recommendations', 'placements'];
  metrics.forEach(m => {
    const btn = document.getElementById(`lead-tab-${m}`);
    if (m === metric) {
      btn.className = "flex-1 py-1 rounded-md text-white bg-slate-800 shadow border border-slate-700/30 whitespace-nowrap px-2";
    } else {
      btn.className = "flex-1 py-1 rounded-md text-slate-400 hover:text-white transition whitespace-nowrap px-2";
    }
  });

  renderLeaderboard();
};

function renderLeaderboard() {
  const container = document.getElementById('leaderboardContainer');
  if (!container) return;

  const metric = state.leaderboardMetric;
  const unitLabels = { calls: '回', interviews: '件', recommendations: '件', placements: '件' };

  const sortedMembers = [...dashboardData.members].sort((a, b) => b.metrics[metric] - a.metrics[metric]);

  container.innerHTML = sortedMembers.map((member, index) => {
    const value = member.metrics[metric];
    const maxVal = Math.max(...dashboardData.members.map(m => m.metrics[metric]));
    const percent = maxVal > 0 ? (value / maxVal) * 100 : 0;

    let rankBadge = `<span class="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center">${index + 1}</span>`;
    if (index === 0) rankBadge = `<span class="w-5 h-5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-bold flex items-center justify-center shadow shadow-yellow-500/10">1</span>`;
    if (index === 1) rankBadge = `<span class="w-5 h-5 rounded-full bg-slate-300/10 text-slate-300 border border-slate-300/20 text-[10px] font-bold flex items-center justify-center shadow shadow-slate-300/10">2</span>`;
    if (index === 2) rankBadge = `<span class="w-5 h-5 rounded-full bg-amber-700/10 text-amber-600 border border-amber-700/20 text-[10px] font-bold flex items-center justify-center shadow shadow-amber-700/10">3</span>`;

    const initial = member.name.split(' ')[0][0];

    return `
      <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/20 border border-slate-800/40 hover:bg-slate-900/40 transition">
        ${rankBadge}
        <div class="w-7 h-7 rounded-lg ${member.avatarColor} flex items-center justify-center text-white text-[10px] font-bold shadow-md">
          ${initial}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-baseline mb-1">
            <span class="text-xs font-bold text-slate-200">${member.name}</span>
            <span class="text-xs font-extrabold text-white">${value.toLocaleString()}<span class="text-[9.5px] font-normal text-slate-400 ml-0.5">${unitLabels[metric]}</span></span>
          </div>
          <div class="w-full bg-slate-800/60 rounded-full h-1 overflow-hidden">
            <div class="bg-gradient-to-r from-brand-blue to-brand-cyan h-full rounded-full transition-all duration-500" style="width: ${percent}%"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 3-3. 先行指標予測シミュレーションの更新 (Ver. 2.0 - 9段階プロセス対応版)
function updateSimulation() {
  const calls = state.simulator.calls;
  const connection = state.simulator.connection / 100;
  const booking = state.simulator.booking / 100;

  // 1. 週次面談数 ＆ 月次面談数への換算
  const weeklyInterviews = calls * connection * booking;
  const monthlyInterviews = weeklyInterviews * 4.333;

  // 2. 9段階プロセスの各歩留まり率の適用 (既定のファネル歩留まりを基準にしたキャリブレーション方程式)
  const proposalRate = (state.simulator.hearing + 222) / 350; // 69%のとき 291/350 = 0.831 (提案移行率 83.1% を再現)
  const consentRate = (state.simulator.consent + 100) / 200;   // 56%のとき 156/200 = 0.78  (推薦承諾率 78.0% を再現)
  const setupRate = (state.simulator.setup + 50) / 202.9;      // 47%のとき 97/202.9 = 0.478 (推薦後面接設定率 47.8% を再現)
  const closeRate = (state.simulator.close + 11.6) / 119.4;    // 40%のとき 51.6/119.4 = 0.432 (面接後内定承諾率 43.2% を再現)

  // 3. 行動品質とボリュームによる二次補正
  const prepFactor = (state.simulator.prep + 100) / 157;        // 57%のとき 1.00 (面接前対策の影響力)
  const proposalFactor = (state.simulator.proposal + 2) / 6.2;  // 4.2件のとき 1.00 (1面談あたり求人提案数の影響力)

  // 4. 予測決定数（Placements）の算出
  let predictedPlacements = monthlyInterviews * proposalRate * consentRate * setupRate * closeRate * prepFactor * proposalFactor;

  // 初期値 (19.55件) を目標である 19.0件 に一致させるためのキャリブレーション定数
  const calibrationCoeff = 19.0 / 19.552; 
  predictedPlacements = predictedPlacements * calibrationCoeff;

  // 5. 予測売上高（紹介手数料125万円換算）
  const avgCommission = 1250000;
  const predictedRevenue = predictedPlacements * avgCommission;

  // UI要素の更新
  document.getElementById('sim-placement-val').innerHTML = `${predictedPlacements.toFixed(1)} <span class="text-xs font-medium text-slate-400">件</span>`;
  document.getElementById('sim-revenue-val').innerHTML = `${(predictedRevenue / 1000000).toFixed(1)} <span class="text-xs font-medium text-slate-400">百万円</span>`;

  // 目標達成率の算出 (目標: 成約 16.0件、売上 20.0百万円)
  const placementRatio = Math.round((predictedPlacements / 16.0) * 100);
  const revenueRatio = Math.round((predictedRevenue / 20000000) * 100);

  const placementRatioEl = document.getElementById('sim-placement-ratio');
  const revenueRatioEl = document.getElementById('sim-revenue-ratio');
  const goalStatusEl = document.getElementById('sim-goal-status');

  if (placementRatioEl) {
    placementRatioEl.textContent = `${placementRatio}%`;
    placementRatioEl.className = placementRatio >= 100 ? "text-brand-emerald font-bold" : "text-rose-500 font-bold";
  }
  if (revenueRatioEl) {
    revenueRatioEl.textContent = `${revenueRatio}%`;
    revenueRatioEl.className = revenueRatio >= 100 ? "text-brand-emerald font-bold" : "text-rose-500 font-bold";
  }

  if (goalStatusEl) {
    if (placementRatio >= 100 && revenueRatio >= 100) {
      goalStatusEl.textContent = "目標クリア！";
      goalStatusEl.className = "bg-emerald-500/10 border border-emerald-500/20 text-brand-emerald px-1.5 py-0.5 rounded font-bold glow-badge-emerald";
    } else {
      goalStatusEl.textContent = "目標未達成";
      goalStatusEl.className = "bg-rose-500/10 border border-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded font-bold glow-badge-rose";
    }
  }

  const revEl = document.getElementById('sim-revenue-val');
  if (predictedPlacements >= 24) {
    revEl.className = "text-2xl font-extrabold text-brand-emerald transition-all tracking-tight";
  } else if (predictedPlacements >= 18) {
    revEl.className = "text-2xl font-extrabold text-brand-blue transition-all tracking-tight";
  } else {
    revEl.className = "text-2xl font-extrabold text-rose-500 transition-all tracking-tight";
  }
}

// 3-4. 個別メンバーボトルネック診断
window.loadMemberDiagnostic = function() {
  const select = document.getElementById('memberSelector');
  if (!select) return;

  const memberId = select.value;
  state.selectedMember = memberId;

  const member = dashboardData.members.find(m => m.id === memberId);
  if (!member) return;

  const avatarEl = document.getElementById('diag-avatar');
  avatarEl.className = `w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${member.avatarColor}`;
  
  const initial = member.name.split(' ')[0][0];
  avatarEl.textContent = initial;

  document.getElementById('diag-member-name').textContent = member.name;
  document.getElementById('diag-member-role').textContent = member.role;

  const badgeEl = document.getElementById('diag-status-badge');
  let badgeText = "順調 (高生産性)";
  let badgeStyle = "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 glow-badge-emerald";
  
  if (member.ratios.overall_conversion < 6.0) {
    badgeText = "要プロセス改善 (低効率)";
    badgeStyle = "bg-rose-500/10 border-rose-500/20 text-rose-500 glow-badge-rose";
  } else if (member.ratios.rec_to_interview < 35.0) {
    badgeText = "要マッチング力強化";
    badgeStyle = "bg-brand-amber/10 border-brand-amber/20 text-brand-amber glow-badge-amber";
  } else if (member.metrics.interviews < 20) {
    badgeText = "要行動量強化 (分母不足)";
    badgeStyle = "bg-brand-blue/10 border-brand-blue/20 text-brand-blue glow-badge-blue";
  }
  
  badgeEl.className = `ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${badgeStyle}`;
  badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${member.ratios.overall_conversion < 6.0 ? 'bg-rose-500 animate-pulse' : (member.ratios.rec_to_interview < 35.0 ? 'bg-brand-amber animate-pulse' : 'bg-brand-blue')}"></span><span>${badgeText}</span>`;

  document.getElementById('diag-strengths').textContent = member.diagnostics.strengths;
  document.getElementById('diag-weaknesses').textContent = member.diagnostics.weaknesses;
  document.getElementById('diag-advice').textContent = member.diagnostics.advice;

  document.getElementById('stat-member-ratio').innerHTML = `${member.ratios.overall_conversion.toFixed(1)}% <span class="text-[9px] text-slate-500 font-normal">(面談→決定)</span>`;
  document.getElementById('stat-team-ratio').innerHTML = `${teamAverages.ratios.overall_conversion.toFixed(1)}% <span class="text-[9px] text-slate-500 font-normal">(面談→決定)</span>`;

  // 個別スタッツ詳細比較メーターの更新
  const connValEl = document.getElementById('diag-stat-conn-val');
  const connAvgEl = document.getElementById('diag-stat-conn-avg');
  const connBarEl = document.getElementById('diag-stat-conn-bar');
  if (connValEl) connValEl.textContent = `${member.metrics.connection_rate.toFixed(1)}%`;
  if (connAvgEl) connAvgEl.textContent = `${teamAverages.metrics.connection_rate.toFixed(1)}%`;
  if (connBarEl) connBarEl.style.width = `${member.metrics.connection_rate}%`;

  const hearValEl = document.getElementById('diag-stat-hear-val');
  const hearAvgEl = document.getElementById('diag-stat-hear-avg');
  const hearBarEl = document.getElementById('diag-stat-hear-bar');
  if (hearValEl) hearValEl.textContent = `${member.metrics.hearing_rate.toFixed(1)}%`;
  if (hearAvgEl) hearAvgEl.textContent = `${teamAverages.metrics.hearing_rate.toFixed(1)}%`;
  if (hearBarEl) hearBarEl.style.width = `${member.metrics.hearing_rate}%`;

  const consValEl = document.getElementById('diag-stat-cons-val');
  const consAvgEl = document.getElementById('diag-stat-cons-avg');
  const consBarEl = document.getElementById('diag-stat-cons-bar');
  if (consValEl) consValEl.textContent = `${member.metrics.consent_rate.toFixed(1)}%`;
  if (consAvgEl) consAvgEl.textContent = `${teamAverages.metrics.consent_rate.toFixed(1)}%`;
  if (consBarEl) consBarEl.style.width = `${member.metrics.consent_rate}%`;

  const prepValEl = document.getElementById('diag-stat-prep-val');
  const prepAvgEl = document.getElementById('diag-stat-prep-avg');
  const prepBarEl = document.getElementById('diag-stat-prep-bar');
  if (prepValEl) prepValEl.textContent = `${member.metrics.prep_rate.toFixed(1)}%`;
  if (prepAvgEl) prepAvgEl.textContent = `${teamAverages.metrics.prep_rate.toFixed(1)}%`;
  if (prepBarEl) prepBarEl.style.width = `${member.metrics.prep_rate}%`;

  if (charts.radarDiagnostic) {
    charts.radarDiagnostic.updateSeries([
      {
        name: member.name,
        data: [
          member.metrics.interviews,
          member.metrics.connection_rate,
          member.metrics.hearing_rate,
          member.metrics.consent_rate,
          member.metrics.prep_rate
        ]
      },
      {
        name: 'チーム平均',
        data: [
          teamAverages.metrics.interviews,
          teamAverages.metrics.connection_rate,
          teamAverages.metrics.hearing_rate,
          teamAverages.metrics.consent_rate,
          teamAverages.metrics.prep_rate
        ]
      }
    ]);
  }
};

// -------------------------------------------------------------
// Ver. 2.0: 離職リスクスコアボード・ポップオーバーロジック
// -------------------------------------------------------------

function renderRiskTable() {
  const tbody = document.getElementById('riskTableBody');
  if (!tbody) return;

  tbody.innerHTML = dashboardData.earlyLeavingRisks.map(item => {
    let statusClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 glow-badge-emerald";
    let rowClass = "risk-row-good";
    let dotClass = "bg-emerald-500";
    if (item.status === '危険') {
      statusClass = "bg-rose-500/10 text-rose-500 border-rose-500/20 glow-badge-rose";
      rowClass = "risk-row-danger";
      dotClass = "bg-rose-500 animate-pulse";
    } else if (item.status === '注意') {
      statusClass = "bg-amber-500/10 text-amber-500 border-amber-500/20 glow-badge-amber";
      rowClass = "risk-row-warning";
      dotClass = "bg-amber-500";
    }

    return `
      <tr class="table-interactive-row ${rowClass} transition border-b border-slate-800/40 hover:bg-slate-800/20" onclick="showRiskPopover(event, '${item.id}')">
        <td class="py-3.5 px-4 font-bold text-white">${item.name}</td>
        <td class="py-3.5 px-4 text-slate-400">${item.joinedDate}</td>
        <td class="py-3.5 px-4 text-slate-300 font-medium">${item.destination}</td>
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-2 max-w-[120px] mx-auto">
            <div class="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
              <div class="h-full rounded-full ${item.status === '危険' ? 'bg-rose-500' : (item.status === '注意' ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${item.score}%"></div>
            </div>
            <span class="text-[10px] font-bold text-slate-300 w-8 text-right">${item.score}%</span>
          </div>
        </td>
        <td class="py-3.5 px-4">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold border ${statusClass}">
            <span class="w-1.2 h-1.2 rounded-full ${dotClass}"></span>
            <span>${item.status}</span>
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

window.showRiskPopover = function(event, riskId) {
  // バブリング防止
  event.stopPropagation();

  const popover = document.getElementById('riskPopover');
  const item = dashboardData.earlyLeavingRisks.find(r => r.id === riskId);
  if (!popover || !item) return;

  // テキスト挿入
  document.getElementById('popover-reason').textContent = item.reason;
  document.getElementById('popover-prescription').textContent = item.prescription;

  // ポジショニング計算 (クリックされた行の近く)
  const rect = event.currentTarget.getBoundingClientRect();
  const mainScroll = document.querySelector('main').getBoundingClientRect();
  
  // スクリプトエリアの相対座標で配置
  const top = rect.bottom - mainScroll.top + document.querySelector('main').scrollTop - 15;
  const left = rect.left - mainScroll.left - 50;

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
  popover.classList.add('active');

  // SVGアイコンをポップオーバー内部で再生成
  lucide.createIcons({ attrs: { class: 'w-3.5 h-3.5' } });
};

window.closeRiskPopover = function() {
  const popover = document.getElementById('riskPopover');
  if (popover) {
    popover.classList.remove('active');
  }
};

// -------------------------------------------------------------
// 4. チャート定義 (ApexChartsの初期化)
// -------------------------------------------------------------

function initCharts() {
  // 現在の画面はファネル分析に絞り込んでいるため、旧チャート群は初期化しない。
  return;

  // 4-1. 売上トレンドグラフ
  const revenueTrendOptions = {
    series: [
      { name: '目標', type: 'area', data: dashboardData.monthlyTrend.target },
      { name: '実績', type: 'area', data: dashboardData.monthlyTrend.actual },
      { name: '先行予測', type: 'line', data: dashboardData.monthlyTrend.forecast }
    ],
    chart: {
      height: 320,
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#94a3b8'
    },
    colors: ['#60a5fa', '#10b981', '#8b5cf6'], // 目標線をrgba半透明から高輝度のソリッドブルー(#60a5fa)へ変更し視認性を大幅向上
    stroke: { width: [3, 4, 3], curve: 'smooth', dashArray: [4, 0, 5] }, // 目標線を太さ3pxのダッシュ線にして実績と明確に区別
    fill: {
      type: ['gradient', 'gradient', 'solid'],
      gradient: {
        shade: 'dark',
        type: 'vertical',
        opacityFrom: [0.25, 0.4, 0],
        opacityTo: [0.05, 0.05, 0],
        stops: [0, 90, 100]
      }
    },
    labels: dashboardData.monthlyTrend.months,
    markers: {
      size: [0, 5, 0],
      colors: ['#3b82f6', '#10b981', '#8b5cf6'],
      strokeWidth: 2,
      hover: { size: 7 }
    },
    xaxis: { tooltip: { enabled: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: {
      labels: {
        formatter: function (value) { return value + "万円"; }
      }
    },
    grid: { borderColor: 'rgba(255, 255, 255, 0.06)', strokeDashArray: 4 },
    legend: { show: false },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      y: {
        formatter: function (y) {
          if (typeof y !== "undefined") return y.toLocaleString() + " 万円";
          return y;
        }
      }
    }
  };
  charts.revenueTrend = new ApexCharts(document.querySelector("#revenueTrendChart"), revenueTrendOptions);
  charts.revenueTrend.render();

  // 4-2. 週次行動量バーチャート
  const weeklyActivityOptions = {
    series: [
      { name: '目標', data: dashboardData.weeklyActivity.target },
      { name: '実績', data: dashboardData.weeklyActivity.actual }
    ],
    chart: {
      type: 'bar',
      height: '100%',
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#94a3b8'
    },
    plotOptions: {
      bar: { horizontal: false, columnWidth: '55%', EndingShape: 'rounded', borderRadius: 4 },
    },
    colors: ['rgba(255, 255, 255, 0.25)', '#3b82f6'], // 目標バーの透過度を上げて輪郭をくっきりさせる
    dataLabels: { enabled: false },
    stroke: { show: true, width: 1.5, colors: ['rgba(255, 255, 255, 0.55)', 'transparent'] }, // 目標バーに白半透明の境界線を付与して強調
    xaxis: {
      categories: dashboardData.weeklyActivity.categories,
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      show: true,
      labels: { formatter: function(val) { return Math.floor(val) + "回"; } }
    },
    grid: { borderColor: 'rgba(255, 255, 255, 0.06)', strokeDashArray: 4 },
    legend: { show: false },
    tooltip: {
      theme: 'dark',
      y: { formatter: function (val) { return val + " 回/件"; } }
    }
  };
  charts.weeklyActivity = new ApexCharts(document.querySelector("#weeklyActivityChart"), weeklyActivityOptions);
  charts.weeklyActivity.render();

  // 4-3. 相関分析 散布図チャート
  const scatterSeries = dashboardData.members.map(member => {
    const x = member.metrics.calls + (member.metrics.interviews * 5);
    const y = member.metrics.recommendations;
    return { name: member.name, data: [[x, y]] };
  });

  const scatterOptions = {
    series: scatterSeries,
    chart: {
      height: 320,
      type: 'scatter',
      zoom: { enabled: false },
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#94a3b8'
    },
    colors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4'],
    markers: { size: 14, strokeWidth: 2, strokeColors: '#ffffff', hover: { size: 17 } },
    xaxis: {
      title: {
        text: 'アクション総量 (週次架電数 + 週次面談数×5)',
        style: { color: '#94a3b8', fontSize: '10px' }
      },
      labels: { formatter: function(val) { return Math.floor(val) + "pt"; } },
      axisBorder: { show: false },
      axisTicks: { show: false },
      min: 200,
      max: 900
    },
    yaxis: {
      title: {
        text: '推薦承諾数 (成果件数)',
        style: { color: '#94a3b8', fontSize: '10px' }
      },
      min: 5,
      max: 35
    },
    grid: { borderColor: 'rgba(255, 255, 255, 0.06)', strokeDashArray: 4 },
    annotations: {
      xaxis: [{
        x: 520,
        borderColor: '#475569',
        borderWidth: 1.5,
        label: {
          style: { color: '#fff', background: '#475569', fontSize: '9px' },
          text: '行動量平均 (520pt)'
        }
      }],
      yaxis: [{
        y: 19,
        borderColor: '#475569',
        borderWidth: 1.5,
        label: {
          style: { color: '#fff', background: '#475569', fontSize: '9px' },
          text: '推薦数平均 (19件)'
        }
      }]
    },
    legend: { position: 'top', horizontalAlign: 'right', offsetY: -10, markers: { width: 8, height: 8 } },
    tooltip: {
      theme: 'dark',
      custom: function({series, seriesIndex, dataPointIndex, w}) {
        const memberData = dashboardData.members[seriesIndex];
        const x = w.config.series[seriesIndex].data[dataPointIndex][0];
        const y = w.config.series[seriesIndex].data[dataPointIndex][1];
        return `
          <div class="p-3">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="w-2.5 h-2.5 rounded-full ${memberData.avatarColor}"></span>
              <strong class="text-xs text-white">${memberData.name}</strong>
            </div>
            <div class="space-y-0.5 text-[10px] text-slate-300">
              <div>役割: <span class="text-white">${memberData.role}</span></div>
              <div>行動スコア: <span class="text-brand-blue font-bold">${x} pt</span></div>
              <div>推薦数: <span class="text-brand-emerald font-bold">${y} 件</span></div>
              <div>面談→推薦率: <span class="text-brand-cyan font-bold">${memberData.ratios.interview_to_rec}%</span></div>
            </div>
          </div>
        `;
      }
    }
  };
  charts.scatterCorrelation = new ApexCharts(document.querySelector("#scatterCorrelationChart"), scatterOptions);
  charts.scatterCorrelation.render();

  // 4-4. レーダー診断チャート
  const initialMember = dashboardData.members.find(m => m.id === 'suzuki');
  const radarOptions = {
    series: [
      {
        name: initialMember.name,
        data: [
          initialMember.metrics.interviews,
          initialMember.metrics.connection_rate,
          initialMember.metrics.hearing_rate,
          initialMember.metrics.consent_rate,
          initialMember.metrics.prep_rate
        ]
      },
      {
        name: 'チーム平均',
        data: [
          teamAverages.metrics.interviews,
          teamAverages.metrics.connection_rate,
          teamAverages.metrics.hearing_rate,
          teamAverages.metrics.consent_rate,
          teamAverages.metrics.prep_rate
        ]
      }
    ],
    chart: {
      height: 280,
      type: 'radar',
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#94a3b8'
    },
    colors: ['#3b82f6', 'rgba(255, 255, 255, 0.25)'],
    stroke: { width: 2 },
    fill: { opacity: [0.2, 0.05] },
    markers: { size: 3 },
    xaxis: {
      categories: ['新規面談数 (件)', '架電接続率 (%)', 'ヒアリング充足率 (%)', '推薦承諾率 (%)', '面接前対策率 (%)'],
      labels: { style: { fontSize: '9.5px', colors: ['#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8'] } }
    },
    yaxis: { show: false, tickAmount: 4 },
    grid: { circular: true },
    legend: { show: false },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: function(val, { dataPointIndex }) {
          if (dataPointIndex === 0) return val + " 件";
          return val.toFixed(1) + " %";
        }
      }
    }
  };
  charts.radarDiagnostic = new ApexCharts(document.querySelector("#radarDiagnosticChart"), radarOptions);
  charts.radarDiagnostic.render();

  // -------------------------------------------------------------
  // Ver. 2.0: 新規チャート初期化 (ヒートマップ、ドーナツ、失注理由、単価推移)
  // -------------------------------------------------------------

  // 4-5. 需給ミスマッチヒートマップ
  const heatmapOptions = {
    series: dashboardData.marketHeatmap,
    chart: {
      height: 320,
      type: 'heatmap',
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#94a3b8'
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        radius: 4,
        useDirectColors: false,
        colorScale: {
          ranges: [
            { from: 0.0, to: 0.5, name: '充足 (0.5以下)', color: '#1e3a8a' }, // 深い青
            { from: 0.51, to: 1.0, name: '均衡 (0.5〜1.0)', color: '#3b82f6' }, // 青
            { from: 1.01, to: 2.0, name: 'やや不足 (1.0〜2.0)', color: '#06b6d4' }, // シアン
            { from: 2.01, to: 3.0, name: '不足 (2.0〜3.0)', color: '#f59e0b' }, // オレンジ
            { from: 3.01, to: 5.0, name: '極度不足 (3.0+)', color: '#ef4444' } // 赤
          ]
        }
      }
    },
    dataLabels: { enabled: true, style: { colors: ['#ffffff'], fontSize: '10px' } },
    stroke: { width: 2, colors: ['#0a0f1d'] },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    grid: { padding: { right: 20 } },
    tooltip: {
      theme: 'dark',
      y: { formatter: function(val) { return val.toFixed(1) + " 倍 (求人/求職者)"; } }
    }
  };
  charts.marketHeatmap = new ApexCharts(document.querySelector("#marketHeatmapChart"), heatmapOptions);
  charts.marketHeatmap.render();

  // 4-6. 雇用形態別成約シェア (ドーナツ)
  const donutOptions = {
    series: dashboardData.contractTypes.values,
    chart: {
      height: 200,
      type: 'donut',
      background: 'transparent',
      foreColor: '#94a3b8'
    },
    labels: dashboardData.contractTypes.labels,
    colors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'],
    stroke: { show: false },
    dataLabels: { enabled: false },
    legend: {
      position: 'bottom',
      fontSize: '10px',
      markers: { width: 8, height: 8 }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          background: 'transparent',
          labels: {
            show: true,
            name: { show: true, fontSize: '10px', color: '#94a3b8', offsetY: -5 },
            value: {
              show: true,
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#ffffff',
              offsetY: 5,
              formatter: function(val) { return (val / 10000).toLocaleString() + "万"; }
            },
            total: {
              show: true,
              label: '当月成約計',
              color: '#94a3b8',
              formatter: function(w) {
                const sum = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return (sum / 10000).toLocaleString() + "万円";
              }
            }
          }
        }
      }
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: function(val) { return val.toLocaleString() + " 円"; } }
    }
  };
  charts.contractDonut = new ApexCharts(document.querySelector("#contractDonutChart"), donutOptions);
  charts.contractDonut.render();

  // 4-7. 平均決定単価推移 (複合チャート)
  const unitPriceOptions = {
    series: [
      { name: '平均紹介手数料', type: 'area', data: dashboardData.unitPriceTrend.avgCommission },
      { name: '平均決定年収', type: 'line', data: dashboardData.unitPriceTrend.avgSalary }
    ],
    chart: {
      height: 180,
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#94a3b8'
    },
    colors: ['rgba(6, 182, 212, 0.4)', '#3b82f6'],
    stroke: { width: [0, 3], curve: 'smooth' },
    fill: {
      type: ['gradient', 'solid'],
      gradient: { shade: 'dark', type: 'vertical', opacityFrom: 0.3, opacityTo: 0.05 }
    },
    labels: dashboardData.unitPriceTrend.months,
    markers: { size: [0, 4] },
    xaxis: { axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: [
      {
        title: { text: '紹介手数料 (万円)', style: { color: '#06b6d4', fontSize: '9px' } },
        labels: { formatter: function(val) { return val + "万"; } }
      },
      {
        opposite: true,
        title: { text: '決定年収 (万円)', style: { color: '#3b82f6', fontSize: '9px' } },
        labels: { formatter: function(val) { return val + "万"; } }
      }
    ],
    grid: { borderColor: 'rgba(255, 255, 255, 0.05)', strokeDashArray: 4 },
    legend: { show: false },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      y: { formatter: function(val) { return val + " 万円"; } }
    }
  };
  charts.unitPrice = new ApexCharts(document.querySelector("#unitPriceChart"), unitPriceOptions);
  charts.unitPrice.render();

  // 4-8. 内定辞退・失注理由 (横型バー)
  const lossReasonsOptions = {
    series: [{
      name: '辞退件数',
      data: dashboardData.lossReasons.values
    }],
    chart: {
      type: 'bar',
      height: '100%',
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#94a3b8'
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '55%',
        borderRadius: 4,
        distributed: true
      }
    },
    colors: ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#06b6d4'],
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      style: { colors: ['#fff'], fontSize: '10px' },
      formatter: function(val, opt) { return opt.w.globals.labels[opt.dataPointIndex] + ": " + val + "件"; },
      offsetX: 10
    },
    xaxis: {
      categories: dashboardData.lossReasons.categories,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { show: false }
    },
    grid: { show: false },
    legend: { show: false },
    tooltip: {
      theme: 'dark',
      y: { formatter: function(val) { return val + " 件"; } }
    }
  };
  if (document.querySelector("#lossReasonsChart")) {
    charts.lossReasons = new ApexCharts(document.querySelector("#lossReasonsChart"), lossReasonsOptions);
    charts.lossReasons.render();
  }

  // チーム別ミニ棒グラフ初期化
  if (dashboardData.teamsData) {
    Object.entries(dashboardData.teamsData).forEach(([teamId, team]) => {
      charts.teamActivities[teamId] = createTeamMiniBarChart(
        `#teamActivityChart-${teamId}`,
        team.weeklyActivity.target,
        team.weeklyActivity.actual,
        team.weeklyActivity.categories
      );
    });
  }
}

// =============================================================
// Ver. 2.0 拡張機能: ロール別注力インサイト ＆ チェックリスト制御
// =============================================================

// 1. 利用者別インサイトのタブ切り替え
window.switchRoleTab = function(role) {
  const roles = ['manager', 'leader', 'sales'];
  
  roles.forEach(r => {
    const btn = document.getElementById(`role-tab-btn-${r}`);
    const content = document.getElementById(`role-tab-content-${r}`);
    
    if (r === role) {
      if (btn) {
        btn.classList.add('bg-slate-800', 'text-white');
        btn.classList.remove('text-slate-400', 'hover:text-white');
      }
      if (content) {
        content.classList.remove('hidden');
      }
    } else {
      if (btn) {
        btn.classList.remove('bg-slate-800', 'text-white');
        btn.classList.add('text-slate-400', 'hover:text-white');
      }
      if (content) {
        content.classList.add('hidden');
      }
    }
  });
};

// 2. 現場営業チェックリストの進捗更新
window.updateSalesChecklist = function() {
  const checkboxes = document.querySelectorAll('.sales-task-checkbox');
  if (checkboxes.length === 0) return;

  let checkedCount = 0;
  checkboxes.forEach(cb => {
    if (cb.checked) {
      checkedCount++;
      // ラベルテキストに取り消し線＆色薄化クラスを追加して、より洗練されたUIに
      cb.nextElementSibling.classList.add('line-through', 'text-slate-500');
      cb.nextElementSibling.classList.remove('text-slate-300');
    } else {
      cb.nextElementSibling.classList.remove('line-through', 'text-slate-500');
      cb.nextElementSibling.classList.add('text-slate-300');
    }
  });

  const percent = Math.round((checkedCount / checkboxes.length) * 100);
  
  const progressBar = document.getElementById('salesChecklistProgress');
  const percentLabel = document.getElementById('salesChecklistPercent');
  const statusBadge = document.getElementById('salesChecklistStatus');

  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
  if (percentLabel) {
    percentLabel.textContent = `${percent}%`;
  }
  if (statusBadge) {
    if (percent === 100) {
      statusBadge.className = "px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold glow-badge-emerald";
      statusBadge.textContent = "本日分完了 🎉";
    } else {
      statusBadge.className = "px-2 py-0.5 rounded-md bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-[10px] font-bold";
      statusBadge.textContent = `実施中 (${checkedCount}/${checkboxes.length})`;
    }
  }
};

// =============================================================
// Ver. 2.5: 高度マネジメント拡張機能 レンダリングロジック
// =============================================================

// 1. ボトムアップ案件ヨミ（パイプライン）の描画
function renderYomiPipeline() {
  const tbody = document.getElementById('yomiTableBody');
  if (!tbody) return;

  // 確度別合計の計算
  let totalA = 0;
  let totalB = 0;
  let totalC = 0;

  dashboardData.pipelineYomi.forEach(item => {
    if (item.rank === 'A') totalA += item.commission;
    else if (item.rank === 'B') totalB += item.commission;
    else if (item.rank === 'C') totalC += item.commission;
  });

  document.getElementById('yomi-a-val').textContent = `${totalA}万円`;
  document.getElementById('yomi-b-val').textContent = `${totalB}万円`;
  document.getElementById('yomi-c-val').textContent = `${totalC}万円`;

  tbody.innerHTML = dashboardData.pipelineYomi.map(item => {
    let rankBadge = '';
    if (item.rank === 'A') {
      rankBadge = `<span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-brand-emerald border border-emerald-500/20 font-extrabold text-[8.5px]">Aヨミ</span>`;
    } else if (item.rank === 'B') {
      rankBadge = `<span class="px-1.5 py-0.5 rounded bg-brand-blue/10 text-brand-blue border border-brand-blue/20 font-extrabold text-[8.5px]">Bヨミ</span>`;
    } else {
      rankBadge = `<span class="px-1.5 py-0.5 rounded bg-brand-purple/10 text-brand-purple border border-brand-purple/20 font-extrabold text-[8.5px]">Cヨミ</span>`;
    }

    return `
      <tr class="border-b border-slate-800/40 hover:bg-slate-800/20 transition">
        <td class="p-1.5 pl-2 font-medium text-slate-200">
          <div>${item.name}</div>
          <div class="text-[8px] text-slate-500">${item.member} | ${item.stage}</div>
        </td>
        <td class="p-1.5 text-center">${rankBadge}</td>
        <td class="p-1.5 text-right font-bold text-white pr-2">${item.commission}万円</td>
      </tr>
    `;
  }).join('');
}

// 2. 入社後定着フォローボードの描画
function renderPostJoiningFollowups() {
  const container = document.getElementById('postJoiningList');
  if (!container) return;

  container.innerHTML = dashboardData.postJoiningFollowups.map(item => {
    let satisfactionBadge = '';
    let borderClass = '';
    if (item.satisfaction === 'Good') {
      satisfactionBadge = `<span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-brand-emerald text-[8px] font-bold border border-emerald-500/20 glow-badge-emerald flex items-center gap-0.5"><span class="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>良好</span>`;
      borderClass = 'border-slate-800/60 hover:bg-slate-900/40';
    } else if (item.satisfaction === 'Warning') {
      satisfactionBadge = `<span class="px-1.5 py-0.5 rounded bg-amber-500/10 text-brand-amber text-[8px] font-bold border border-amber-500/20 glow-badge-amber flex items-center gap-0.5"><span class="w-1 h-1 rounded-full bg-brand-amber"></span>注意</span>`;
      borderClass = 'border-brand-amber/25 bg-brand-amber/5 hover:bg-brand-amber/10';
    } else {
      satisfactionBadge = `<span class="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[8px] font-bold border border-rose-500/20 glow-badge-rose flex items-center gap-0.5"><span class="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></span>危険</span>`;
      borderClass = 'border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10';
    }

    return `
      <div class="p-2.5 rounded-xl border ${borderClass} transition space-y-2">
        <div class="flex justify-between items-center">
          <div>
            <strong class="text-xs font-bold text-slate-200">${item.name}</strong>
            <span class="text-[8px] text-slate-500 ml-1.5">${item.joinedDate}入社 | ${item.destination}</span>
          </div>
          ${satisfactionBadge}
        </div>
        
        <div class="flex items-center gap-3 text-[9px] bg-slate-950/40 p-1.5 rounded-lg border border-slate-900/60">
          <span class="text-slate-500 font-semibold">面談進捗:</span>
          
          <label class="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" ${item.weekFollow ? 'checked' : ''} onchange="togglePostJoiningCheck('${item.id}', 'week')" class="w-3 h-3 rounded bg-slate-800 border-slate-700 text-brand-emerald focus:ring-brand-emerald">
            <span class="${item.weekFollow ? 'text-brand-emerald font-bold line-through' : 'text-slate-400'}">1週</span>
          </label>
          
          <label class="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" ${item.monthFollow ? 'checked' : ''} onchange="togglePostJoiningCheck('${item.id}', 'month')" class="w-3 h-3 rounded bg-slate-800 border-slate-700 text-brand-emerald focus:ring-brand-emerald">
            <span class="${item.monthFollow ? 'text-brand-emerald font-bold line-through' : 'text-slate-400'}">1ヶ月</span>
          </label>
          
          <label class="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" ${item.threeMonthFollow ? 'checked' : ''} onchange="togglePostJoiningCheck('${item.id}', 'three')" class="w-3 h-3 rounded bg-slate-800 border-slate-700 text-brand-emerald focus:ring-brand-emerald">
            <span class="${item.threeMonthFollow ? 'text-brand-emerald font-bold line-through' : 'text-slate-400'}">3ヶ月</span>
          </label>
        </div>
        
        <div class="text-[9px] text-slate-400 leading-relaxed bg-slate-900/20 p-1.5 rounded border border-slate-800/20">
          <div class="flex items-center gap-1 text-[8.5px] text-slate-500 font-bold mb-0.5">
            <i data-lucide="message-square" class="w-2.5 h-2.5 text-slate-500"></i>
            <span>対応メモ (${item.member})</span>
          </div>
          <span>${item.notes}</span>
        </div>
      </div>
    `;
  }).join('');
}

window.togglePostJoiningCheck = function(id, type) {
  const item = dashboardData.postJoiningFollowups.find(p => p.id === id);
  if (!item) return;

  if (type === 'week') item.weekFollow = !item.weekFollow;
  else if (type === 'month') item.monthFollow = !item.monthFollow;
  else if (type === 'three') item.threeMonthFollow = !item.threeMonthFollow;

  // 面談結果による満足度とメモのリアクティブ変化
  if (item.weekFollow && item.monthFollow && item.threeMonthFollow) {
    item.satisfaction = 'Good';
    item.notes = "入社後3ヶ月フォロー完了。定着が確認されたため、返金リスクは消滅しました！";
  } else if (item.satisfaction === 'Danger' && item.monthFollow) {
    item.satisfaction = 'Warning';
    item.notes = "RAと店長を交えた緊急三者面談を実施し、土日休みのシフト調整について『隔週土曜日勤務＋平日振替休日』で一旦合意。経過観察中。";
  }

  renderPostJoiningFollowups();
  lucide.createIcons();
};

// 3. 新規登録架電アプローチ初動スピードの描画
function renderLeadResponseTime() {
  const list = document.getElementById('leaderLeadSpeedList');
  const avgRateEl = document.getElementById('leader-team-init-rate');
  if (avgRateEl) {
    avgRateEl.textContent = `${dashboardData.leadResponseTime.withinTenPercent}%`;
  }
  if (!list) return;

  list.innerHTML = dashboardData.leadResponseTime.members.map(member => {
    let speedBadge = '';
    if (member.withinTenPercent >= 80) {
      speedBadge = `<span class="px-1 py-0.5 rounded bg-emerald-500/10 text-brand-emerald text-[8.5px] border border-emerald-500/20 font-bold">${member.withinTenPercent}%</span>`;
    } else if (member.withinTenPercent >= 70) {
      speedBadge = `<span class="px-1 py-0.5 rounded bg-brand-amber/10 text-brand-amber text-[8.5px] border border-brand-amber/20 font-bold">${member.withinTenPercent}%</span>`;
    } else {
      speedBadge = `<span class="px-1 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[8.5px] border border-rose-500/20 font-bold">${member.withinTenPercent}%</span>`;
    }

    return `
      <div class="flex justify-between items-center">
        <span class="text-slate-400">${member.name}</span>
        <div class="flex items-center gap-1.5">
          <span class="text-slate-500">${member.avgMinutes}分</span>
          ${speedBadge}
        </div>
      </div>
    `;
  }).join('');
}

// 4. 架電接続率メーターの描画
function renderHourlyConnectionMeters() {
  const grid = document.getElementById('connectionRateGrid');
  if (!grid) return;

  grid.innerHTML = dashboardData.hourlyConnectionData.hours.map((hour, index) => {
    const rate = dashboardData.hourlyConnectionData.rates[index];
    const isGolden = hour === "13:00" || hour === "19:00";
    const barColor = isGolden ? 'bg-gradient-to-r from-brand-emerald to-brand-cyan glow-bar-emerald' : 'bg-slate-700';
    const textStyle = isGolden ? 'text-brand-emerald font-bold animate-pulse' : 'text-slate-300';
    const bgCardStyle = isGolden ? 'bg-slate-900/60 border-brand-emerald/20 shadow shadow-emerald-500/5' : 'bg-slate-950/20 border-slate-800/40';

    return `
      <div class="p-1.5 rounded-lg border ${bgCardStyle} transition">
        <div class="flex justify-between items-baseline mb-1">
          <span class="text-[8.5px] text-slate-500">${hour}</span>
          <span class="text-[9.5px] ${textStyle}">${rate}%</span>
        </div>
        <div class="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
          <div class="${barColor} h-full rounded-full transition-all duration-500" style="width: ${rate}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// チームミニ棒グラフ生成ヘルパー関数
function createTeamMiniBarChart(elementSelector, targetData, actualData, categories) {
  const options = {
    series: [
      { name: '目標', data: targetData },
      { name: '実績', data: actualData }
    ],
    chart: {
      type: 'bar',
      height: 140,
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#94a3b8',
      sparkline: { enabled: false }
    },
    plotOptions: {
      bar: { horizontal: false, columnWidth: '60%', borderRadius: 2 }
    },
    colors: ['rgba(255, 255, 255, 0.25)', '#3b82f6'], // 目標バーの視認性を引き上げ
    dataLabels: { enabled: false },
    stroke: { show: true, width: 1.2, colors: ['rgba(255, 255, 255, 0.5)', 'transparent'] }, // 白半透明の輪郭を追加して強調
    xaxis: {
      categories: categories,
      labels: {
        show: true,
        style: { fontSize: '8px', colors: '#94a3b8' }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      show: true,
      labels: {
        show: true,
        style: { fontSize: '8px', colors: '#94a3b8' },
        formatter: function(val) { return Math.floor(val); }
      }
    },
    grid: { borderColor: 'rgba(255, 255, 255, 0.05)', strokeDashArray: 2 },
    legend: { show: false },
    tooltip: {
      theme: 'dark',
      y: { formatter: function (val) { return val; } }
    }
  };
  const chart = new ApexCharts(document.querySelector(elementSelector), options);
  chart.render();
  return chart;
}

// チーム選択 ＆ 最上部スマートスクロール連携
window.selectTeamAndScroll = function(teamId) {
  state.selectedTeam = teamId;

  // 画面遷移
  switchTab('overview');
  setFunnelLayer('team');
  renderAll();

  // 最上部へスマートにスクロール
  const scrollArea = document.getElementById('mainScrollArea') || document.querySelector('main');
  if (scrollArea) {
    scrollArea.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
};

window.selectMemberAndScroll = function(memberId) {
  const selector = document.getElementById('memberSelector');
  if (selector) {
    selector.value = memberId;
    selector.dispatchEvent(new Event('change'));
    switchTab('correlation');

    const scrollArea = document.getElementById('mainScrollArea') || document.querySelector('main');
    scrollArea.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
};

// =============================================================
// Ver. 3.0 日本地図（47都道府県）需給ヒートマップ 制御ロジック
// =============================================================

const prefCodeMap = {
  hokkaido: 1, aomori: 2, iwate: 3, miyagi: 4, akita: 5, yamagata: 6, fukushima: 7,
  ibaraki: 8, tochigi: 9, gunma: 10, saitama: 11, chiba: 12, tokyo: 13, kanagawa: 14,
  niigata: 15, toyama: 16, ishikawa: 17, fukui: 18, yamanashi: 19, nagano: 20, gifu: 21,
  shizuoka: 22, aichi: 23, mie: 24, shiga: 25, kyoto: 26, osaka: 27, hyogo: 28,
  nara: 29, wakayama: 30, tottori: 31, shimane: 32, okayama: 33, hiroshima: 34, yamaguchi: 35,
  tokushima: 36, kagawa: 37, ehime: 38, kochi: 39, fukuoka: 40, saga: 41, nagasaki: 42,
  kumamoto: 43, oita: 44, miyazaki: 45, kagoshima: 46, okinawa: 47
};

let currentSelectedPrefId = 'akita';

function initJapanMap() {
  const mapContainer = document.getElementById('japan-map-container');
  if (!mapContainer) return;

  mapContainer.innerHTML = '';

  const areas = Object.keys(dashboardData.japanPrefecturesData).map(prefId => {
    const data = dashboardData.japanPrefecturesData[prefId];
    const code = prefCodeMap[prefId];
    const isActive = (prefId === currentSelectedPrefId);
    
    let color = 'rgba(6, 182, 212, 0.38)';
    let hoverColor = 'rgba(34, 211, 238, 0.9)';
    
    if (isActive) {
      if (data.status === 'seller-extreme') {
        color = 'rgba(239, 68, 68, 0.95)';
      } else if (data.status === 'seller') {
        color = 'rgba(245, 158, 11, 0.95)';
      } else if (data.status === 'buyer') {
        color = 'rgba(59, 130, 246, 0.95)';
      } else {
        color = 'rgba(6, 182, 212, 0.95)';
      }
    } else {
      if (data.status === 'seller-extreme') {
        color = 'rgba(239, 68, 68, 0.38)';
        hoverColor = 'rgba(248, 113, 113, 0.9)';
      } else if (data.status === 'seller') {
        color = 'rgba(245, 158, 11, 0.38)';
        hoverColor = 'rgba(251, 191, 36, 0.9)';
      } else if (data.status === 'buyer') {
        color = 'rgba(59, 130, 246, 0.38)';
        hoverColor = 'rgba(96, 165, 250, 0.9)';
      }
    }

    return {
      code: code,
      name: data.name,
      color: color,
      hoverColor: hoverColor,
      prefectures: [code]
    };
  });

  jpmap.japanMap(mapContainer, {
    areas: areas,
    width: (mapContainer.clientWidth > 16) ? (mapContainer.clientWidth - 16) : 520,
    movesIslands: true,
    backgroundColor: 'transparent',
    borderLineColor: 'rgba(255, 255, 255, 0.08)',
    borderLineWidth: 1,
    lineColor: 'rgba(255, 255, 255, 0.08)',
    lineWidth: 1,
    onSelect: function(data) {
      const prefId = Object.keys(prefCodeMap).find(key => prefCodeMap[key] === data.code);
      if (prefId) {
        selectJapanPrefecture(prefId);
      }
    }
  });
}

window.selectJapanPrefecture = function(prefId) {
  const data = dashboardData.japanPrefecturesData[prefId];
  const detailPanel = document.getElementById('japan-map-detail-panel');
  if (!data || !detailPanel) return;

  if (currentSelectedPrefId !== prefId) {
    currentSelectedPrefId = prefId;
    initJapanMap();
  }

  let statusBadgeClass = '';
  let statusLabel = '';
  if (data.status === 'seller-extreme') {
    statusBadgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20 glow-badge-rose';
    statusLabel = '超売り手市場 (深刻な不足)';
  } else if (data.status === 'seller') {
    statusBadgeClass = 'bg-amber-500/10 text-brand-amber border-amber-500/20 glow-badge-amber';
    statusLabel = '売り手市場 (人員不足)';
  } else if (data.status === 'seller-light' || data.status === 'balance-light') {
    statusBadgeClass = 'bg-cyan-500/10 text-brand-cyan border-brand-cyan/20 glow-badge-cyan';
    statusLabel = 'やや売り手/均衡';
  } else if (data.status === 'balance') {
    statusBadgeClass = 'bg-slate-700/30 text-slate-300 border-slate-700/50';
    statusLabel = '均衡市場';
  } else {
    statusBadgeClass = 'bg-brand-blue/10 text-brand-blue border-brand-blue/20 glow-badge-blue';
    statusLabel = '買い手市場 (充足気味)';
  }

  let dotColor = 'bg-brand-cyan';
  if (data.status === 'seller-extreme') dotColor = 'bg-rose-500 animate-pulse';
  else if (data.status === 'seller') dotColor = 'bg-brand-amber';
  else if (data.status === 'buyer') dotColor = 'bg-brand-blue';

  detailPanel.innerHTML = `
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 tab-content">
      <div class="flex justify-between items-center border-b border-slate-800/60 pb-3">
        <div>
          <h5 class="text-sm font-bold text-white flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full ${dotColor}"></span>
            <span>${data.name} 需給詳細</span>
          </h5>
          <span class="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">日本全国 都道府県白地図</span>
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${statusBadgeClass}">
          ${statusLabel}
        </span>
      </div>
      
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 text-center">
          <span class="text-[8.5px] text-slate-500 block mb-0.5">求人倍率</span>
          <strong class="text-lg font-extrabold text-white">${data.ratio.toFixed(1)} <span class="text-[9.5px] font-medium text-slate-400">倍</span></strong>
        </div>
        <div class="bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 text-center">
          <span class="text-[8.5px] text-slate-500 block mb-0.5">有効求人数</span>
          <strong class="text-base font-bold text-slate-200">${data.demand} <span class="text-[9px] font-normal text-slate-500">件</span></strong>
        </div>
        <div class="bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 text-center">
          <span class="text-[8.5px] text-slate-500 block mb-0.5">登録求職者数</span>
          <strong class="text-base font-bold text-slate-200">${data.supply} <span class="text-[9px] font-normal text-slate-500">名</span></strong>
        </div>
      </div>
      
      <div class="space-y-3">
        <div class="bg-slate-950/20 border border-slate-900/40 rounded-xl p-3.5">
          <label class="text-[9.5px] uppercase tracking-wider text-slate-500 font-bold block mb-1">🗺️ 都道府県別需給概況</label>
          <p class="text-[10.5px] text-slate-300 leading-relaxed">${data.desc}</p>
        </div>
        
        <div class="bg-brand-emerald/5 border border-brand-emerald/20 rounded-xl p-3.5 space-y-1.5">
          <label class="text-[9.5px] uppercase tracking-wider text-brand-emerald font-bold flex items-center gap-1">
            <i data-lucide="zap" class="w-3.5 h-3.5 text-brand-emerald animate-pulse"></i>
            <span>CA・RA推奨営業攻略アクション</span>
          </label>
          <p class="text-[10.5px] text-slate-200 leading-relaxed font-semibold">${data.action}</p>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
};

// =============================================================
// Ver. 4.0 エリア別市場調査 & エリア定義管理画面 制御ロジック
// =============================================================

// アコーディオンの開閉状態
const accordionState = {
  hokkaido_tohoku: true,
  kanto: true,
  chubu: false,
  kinki: false,
  chugoku: false,
  shikoku: false,
  kyushu: false,
  okinawa: false
};

// 地方別の都道府県リスト
const regionPrefs = {
  hokkaido_tohoku: {
    name: '北海道・東北',
    prefs: ['hokkaido', 'aomori', 'iwate', 'miyagi', 'akita', 'yamagata', 'fukushima']
  },
  kanto: {
    name: '関東',
    prefs: ['tokyo', 'kanagawa', 'saitama', 'chiba', 'ibaraki', 'tochigi', 'gunma']
  },
  chubu: {
    name: '中部・甲信越',
    prefs: ['niigata', 'toyama', 'ishikawa', 'fukui', 'yamanashi', 'nagano', 'gifu', 'shizuoka', 'aichi']
  },
  kinki: {
    name: '近畿',
    prefs: ['mie', 'shiga', 'kyoto', 'osaka', 'hyogo', 'nara', 'wakayama']
  },
  chugoku: {
    name: '中国',
    prefs: ['tottori', 'shimane', 'okayama', 'hiroshima', 'yamaguchi']
  },
  shikoku: {
    name: '四国',
    prefs: ['tokushima', 'kagawa', 'ehime', 'kochi']
  },
  kyushu: {
    name: '九州',
    prefs: ['fukuoka', 'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima']
  },
  okinawa: {
    name: '沖縄',
    prefs: ['okinawa']
  }
};

// 仮のエリア定義（保存ボタンを押すまでの一時的な状態）
let tempAreas = null;

// 都道府県別・エリア別の市場調査サブタブの切り替え
window.switchMarketSubTab = function(subTabId) {
  state.currentMarketSubTab = subTabId;
  
  const prefBtn = document.getElementById('market-subtab-pref');
  const areaBtn = document.getElementById('market-subtab-area');
  const prefContainer = document.getElementById('market-pref-container');
  const areaContainer = document.getElementById('market-area-container');
  
  if (subTabId === 'pref') {
    if (prefBtn) prefBtn.className = "flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 border border-slate-700/50 shadow transition-all duration-200";
    if (areaBtn) areaBtn.className = "flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all duration-200";
    if (prefContainer) prefContainer.classList.remove('hidden');
    if (areaContainer) areaContainer.classList.add('hidden');
    
    // 白地図の再描画
    setTimeout(() => {
      if (typeof initJapanMap === 'function') initJapanMap();
    }, 50);
  } else {
    if (prefBtn) prefBtn.className = "flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all duration-200";
    if (areaBtn) areaBtn.className = "flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 border border-slate-700/50 shadow transition-all duration-200";
    if (prefContainer) prefContainer.classList.add('hidden');
    if (areaContainer) areaContainer.classList.remove('hidden');
    
    // エリア別画面のレンダリング
    renderAreaMarket();
  }
};

// 営業エリアデータの動的集計
window.calculateAreaData = function() {
  let areas = JSON.parse(localStorage.getItem('m3c_area_definitions'));
  if (!areas) {
    areas = defaultAreas;
    localStorage.setItem('m3c_area_definitions', JSON.stringify(defaultAreas));
  }
  
  const prefData = dashboardData.japanPrefecturesData;
  
  return areas.map(area => {
    let totalDemand = 0;
    let totalSupply = 0;
    
    area.prefs.forEach(prefId => {
      const p = prefData[prefId];
      if (p) {
        totalDemand += p.demand;
        totalSupply += p.supply;
      }
    });
    
    const averageRatio = totalSupply > 0 ? parseFloat((totalDemand / totalSupply).toFixed(2)) : 0.0;
    
    let status = 'balance';
    if (averageRatio >= 2.5) status = 'seller-extreme';
    else if (averageRatio >= 1.8) status = 'seller';
    else if (averageRatio >= 1.2) status = 'seller-light';
    else if (averageRatio >= 0.9) status = 'balance';
    else status = 'buyer';
    
    return {
      id: area.id,
      name: area.name,
      prefs: area.prefs,
      demand: totalDemand,
      supply: totalSupply,
      ratio: averageRatio,
      status: status,
      action: area.action || '推奨攻略アクションを策定してください。'
    };
  });
};

// 都道府県別の職種需給データシミュレーション (ばらつき付加)
function getPrefJobsData(prefId, ratio) {
  // ハッシュコードのような簡易シードで、都道府県ごとに毎回一定のばらつきを持たせる
  const seed = prefId.charCodeAt(0) + prefId.charCodeAt(prefId.length - 1);
  const factor = (seed % 10) / 30 - 0.08; // -0.08 〜 +0.22 の範囲
  
  return {
    '調剤薬局': parseFloat((ratio * (1.0 + factor)).toFixed(2)),
    'ドラッグ(調剤有)': parseFloat((ratio * (1.4 + factor * 1.5)).toFixed(2)),
    'ドラッグ(OTCのみ)': parseFloat((ratio * (1.1 - factor)).toFixed(2)),
    '病院・クリニック': parseFloat((ratio * (0.4 + factor * 0.5)).toFixed(2))
  };
}

// エリア内の全都道府県の職種別データを集計
function calculateAreaJobsData(areaPrefs) {
  const prefData = dashboardData.japanPrefecturesData;
  let sum = { '調剤薬局': 0, 'ドラッグ(調剤有)': 0, 'ドラッグ(OTCのみ)': 0, '病院・クリニック': 0 };
  let count = 0;
  
  areaPrefs.forEach(prefId => {
    const p = prefData[prefId];
    if (p) {
      const jobs = getPrefJobsData(prefId, p.ratio);
      sum['調剤薬局'] += jobs['調剤薬局'];
      sum['ドラッグ(調剤有)'] += jobs['ドラッグ(調剤有)'];
      sum['ドラッグ(OTCのみ)'] += jobs['ドラッグ(OTCのみ)'];
      sum['病院・クリニック'] += jobs['病院・クリニック'];
      count++;
    }
  });
  
  if (count === 0) return { '調剤薬局': 0, 'ドラッグ(調剤有)': 0, 'ドラッグ(OTCのみ)': 0, '病院・クリニック': 0 };
  
  return {
    '調剤薬局': parseFloat((sum['調剤薬局'] / count).toFixed(2)),
    'ドラッグ(調剤有)': parseFloat((sum['ドラッグ(調剤有)'] / count).toFixed(2)),
    'ドラッグ(OTCのみ)': parseFloat((sum['ドラッグ(OTCのみ)'] / count).toFixed(2)),
    '病院・クリニック': parseFloat((sum['病院・クリニック'] / count).toFixed(2))
  };
}

// エリア別市場調査のレンダリング
window.renderAreaMarket = function() {
  const areaData = calculateAreaData();
  if (areaData.length === 0) return;
  
  // 選択中のエリアIDが現在存在しない場合は、最初のエリアをセット
  if (!areaData.find(a => a.id === state.selectedAreaId)) {
    state.selectedAreaId = areaData[0].id;
  }
  
  const currentArea = areaData.find(a => a.id === state.selectedAreaId);
  
  // 1. エリア一覧サマリーカードの描画
  const listContainer = document.getElementById('areaSummaryList');
  if (listContainer) {
    const statusConfig = {
      'seller-extreme': { label: '超不足', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20 glow-badge-rose', dot: 'bg-rose-500' },
      'seller': { label: '不足', badge: 'bg-amber-500/10 text-brand-amber border-amber-500/20 glow-badge-amber', dot: 'bg-brand-amber' },
      'seller-light': { label: 'やや不足', badge: 'bg-cyan-500/10 text-brand-cyan border-brand-cyan/20 glow-badge-cyan', dot: 'bg-brand-cyan' },
      'balance': { label: '均衡', badge: 'bg-slate-700/40 text-slate-300 border-slate-700/50', dot: 'bg-slate-400' },
      'buyer': { label: '充足', badge: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20 glow-badge-blue', dot: 'bg-brand-blue' }
    };
    
    listContainer.innerHTML = areaData.map(area => {
      const isSelected = area.id === state.selectedAreaId;
      const cfg = statusConfig[area.status] || statusConfig.balance;
      const activeClass = isSelected 
        ? "border-brand-blue bg-brand-blue/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
        : "border-slate-800/80 bg-slate-900/20 hover:border-slate-700/60";
      
      return `
        <div onclick="selectArea('${area.id}')" class="p-3 rounded-xl border ${activeClass} transition-all duration-200 cursor-pointer flex items-center justify-between group">
          <div class="flex items-center gap-3">
            <span class="w-2.5 h-2.5 rounded-full ${cfg.dot} ${isSelected ? 'animate-pulse' : ''}"></span>
            <div>
              <h5 class="text-xs font-bold text-white group-hover:text-brand-blue transition">${area.name}</h5>
              <p class="text-[9px] text-slate-500 mt-0.5">求人 ${area.demand}件 / 求職者 ${area.supply}名</p>
            </div>
          </div>
          <div class="flex items-center gap-2.5">
            <div class="text-right pr-2">
              <span class="text-xs font-extrabold text-white">${area.ratio.toFixed(2)}</span>
              <span class="text-[9px] text-slate-500 block">倍</span>
            </div>
            <span class="px-2 py-0.5 rounded text-[8px] font-bold border ${cfg.badge}">
              ${cfg.label}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // 2. エリア詳細 & アクションパネルの描画
  const detailPanel = document.getElementById('area-detail-panel');
  if (detailPanel && currentArea) {
    let dotColor = 'bg-brand-cyan';
    if (currentArea.status === 'seller-extreme') dotColor = 'bg-rose-500 animate-pulse';
    else if (currentArea.status === 'seller') dotColor = 'bg-brand-amber';
    else if (currentArea.status === 'buyer') dotColor = 'bg-brand-blue';
    
    // 所属都道府県の日本語名一覧を作成
    const prefData = dashboardData.japanPrefecturesData;
    const prefNames = currentArea.prefs
      .map(id => prefData[id] ? prefData[id].name : id)
      .join('、') || '（未割り当て）';
    
    detailPanel.innerHTML = `
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 tab-content h-full flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-center border-b border-slate-800/60 pb-3">
            <div>
              <h5 class="text-sm font-bold text-white flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full ${dotColor}"></span>
                <span>${currentArea.name} エリア需給詳細</span>
              </h5>
              <span class="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">営業攻略アクション</span>
            </div>
          </div>
          
          <div class="grid grid-cols-3 gap-3 mt-4">
            <div class="bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 text-center">
              <span class="text-[8.5px] text-slate-500 block mb-0.5">平均求人倍率</span>
              <strong class="text-lg font-extrabold text-white">${currentArea.ratio.toFixed(2)} <span class="text-[9.5px] font-medium text-slate-400">倍</span></strong>
            </div>
            <div class="bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 text-center">
              <span class="text-[8.5px] text-slate-500 block mb-0.5">総有効求人数</span>
              <strong class="text-base font-bold text-slate-200">${currentArea.demand} <span class="text-[9px] font-normal text-slate-500">件</span></strong>
            </div>
            <div class="bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 text-center">
              <span class="text-[8.5px] text-slate-500 block mb-0.5">総登録者数</span>
              <strong class="text-base font-bold text-slate-200">${currentArea.supply} <span class="text-[9px] font-normal text-slate-500">名</span></strong>
            </div>
          </div>
          
          <div class="space-y-3 mt-4">
            <div class="bg-slate-950/20 border border-slate-900/40 rounded-xl p-3.5">
              <label class="text-[9.5px] uppercase tracking-wider text-slate-500 font-bold block mb-1">📍 所属都道府県一覧 (${currentArea.prefs.length}県)</label>
              <p class="text-[10.5px] text-slate-300 leading-relaxed font-semibold">${prefNames}</p>
            </div>
            
            <div class="bg-brand-emerald/5 border border-brand-emerald/20 rounded-xl p-3.5 space-y-1.5">
              <label class="text-[9.5px] uppercase tracking-wider text-brand-emerald font-bold flex items-center gap-1">
                <i data-lucide="zap" class="w-3.5 h-3.5 text-brand-emerald animate-pulse"></i>
                <span>CA・RA推奨営業攻略アクション</span>
              </label>
              <p class="text-[10.5px] text-slate-200 leading-relaxed font-semibold">${currentArea.action}</p>
            </div>
          </div>
        </div>
      </div>
    `;
    lucide.createIcons();
  }
  
  // 3. エリア別比較グラフ (縦棒) の描画
  renderAreaComparisonChart(areaData);
  
  // 4. エリア別の職種×求人倍率ヒートマップの描画
  renderAreaHeatmapChart(currentArea);
};

// エリア選択ハンドラ
window.selectArea = function(areaId) {
  state.selectedAreaId = areaId;
  renderAreaMarket();
};

// エリア別求人倍率比較グラフ (ApexCharts) のレンダリング
function renderAreaComparisonChart(areaData) {
  const chartContainer = document.getElementById('areaComparisonChart');
  if (!chartContainer) return;
  
  const seriesData = areaData.map(area => area.ratio);
  const categories = areaData.map(area => area.name);
  
  const colors = areaData.map(area => {
    if (area.status === 'seller-extreme') return '#ef4444'; // 赤
    if (area.status === 'seller') return '#f59e0b'; // 黄
    if (area.status === 'seller-light') return '#06b6d4'; // シアン
    if (area.status === 'buyer') return '#3b82f6'; // 青
    return '#64748b'; // グレー
  });
  
  const options = {
    series: [{
      name: '平均求人倍率',
      data: seriesData
    }],
    chart: {
      type: 'bar',
      height: 250,
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#94a3b8'
    },
    plotOptions: {
      bar: {
        distributed: true, // 各バーに個別の色を割り当て
        borderRadius: 4,
        columnWidth: '55%',
        dataLabels: { position: 'top' }
      }
    },
    colors: colors,
    dataLabels: {
      enabled: true,
      formatter: function (val) { return val.toFixed(2) + "倍"; },
      offsetY: -20,
      style: { fontSize: '10px', colors: ["#fff"], fontWeight: 'bold' }
    },
    grid: { borderColor: 'rgba(255, 255, 255, 0.05)', strokeDashArray: 2 },
    xaxis: {
      categories: categories,
      labels: { style: { fontSize: '10px', colors: '#94a3b8' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      title: { text: '求人倍率 (倍)', style: { color: '#94a3b8', fontSize: '10px' } },
      labels: { formatter: function (val) { return val.toFixed(1) + "倍"; } }
    },
    legend: { show: false },
    tooltip: {
      theme: 'dark',
      y: { formatter: function (val) { return val.toFixed(2) + " 倍"; } }
    }
  };
  
  if (charts.areaComparison) {
    charts.areaComparison.destroy();
  }
  
  charts.areaComparison = new ApexCharts(chartContainer, options);
  charts.areaComparison.render();
}

// エリア別の職種×求人倍率ヒートマップ (ApexCharts) のレンダリング
function renderAreaHeatmapChart(currentArea) {
  const chartContainer = document.getElementById('marketAreaHeatmapChart');
  if (!chartContainer || !currentArea) return;
  
  // 選択されたエリアの職種別データを計算
  const jobsData = calculateAreaJobsData(currentArea.prefs);
  
  const categories = ['調剤薬局', 'ドラッグ(調剤有)', 'ドラッグ(OTCのみ)', '病院・クリニック'];
  
  const series = [{
    name: currentArea.name,
    data: categories.map(cat => ({
      x: cat,
      y: jobsData[cat]
    }))
  }];
  
  // 他のエリアのデータも参考値として表示
  const allAreaData = calculateAreaData();
  allAreaData.forEach(area => {
    if (area.id !== currentArea.id) {
      const areaJobs = calculateAreaJobsData(area.prefs);
      series.push({
        name: area.name,
        data: categories.map(cat => ({
          x: cat,
          y: areaJobs[cat]
        }))
      });
    }
  });
  
  const options = {
    series: series,
    chart: {
      type: 'heatmap',
      height: 300,
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#94a3b8'
    },
    plotOptions: {
      heatmap: {
        radius: 4,
        enableShades: false,
        colorScale: {
          ranges: [
            { from: 0.0, to: 0.89, color: 'rgba(59, 130, 246, 0.75)', name: '充足 (0.9未満)' }, // 青
            { from: 0.9, to: 1.79, color: 'rgba(6, 182, 212, 0.75)', name: '均衡 (0.9-1.8)' }, // シアン
            { from: 1.8, to: 2.49, color: 'rgba(245, 158, 11, 0.75)', name: '不足 (1.8-2.5)' }, // 黄
            { from: 2.5, to: 10.0, color: 'rgba(239, 68, 68, 0.75)', name: '超不足 (2.5以上)' } // 赤
          ]
        }
      }
    },
    dataLabels: {
      enabled: true,
      style: { colors: ['#fff'], fontWeight: 'bold' },
      formatter: function(val) { return val.toFixed(2) + "倍"; }
    },
    grid: { show: false },
    xaxis: {
      labels: { style: { fontSize: '10px' } }
    },
    yaxis: {
      labels: { style: { fontSize: '10px' } }
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: function (val) { return val.toFixed(2) + " 倍"; } }
    }
  };
  
  if (charts.marketAreaHeatmap) {
    charts.marketAreaHeatmap.destroy();
  }
  
  charts.marketAreaHeatmap = new ApexCharts(chartContainer, options);
  charts.marketAreaHeatmap.render();
}

// -------------------------------------------------------------
// 4. エリア定義管理画面 (Area Manager) の制御・レンダリング
// -------------------------------------------------------------

// エリア定義アコーディオン開閉トグル
window.toggleAccordion = function(regionId) {
  accordionState[regionId] = !accordionState[regionId];
  renderAreaManager();
};

// エリア定義管理画面のレンダリング
window.renderAreaManager = function() {
  // `tempAreas` が未初期化なら、localStorage またはデフォルトから複製
  if (!tempAreas) {
    let saved = JSON.parse(localStorage.getItem('m3c_area_definitions'));
    if (!saved) saved = defaultAreas;
    tempAreas = JSON.parse(JSON.stringify(saved)); // ディープコピー
  }
  
  // 1. 左ペイン: 定義済みエリア一覧の描画
  const listContainer = document.getElementById('managerAreaList');
  if (listContainer) {
    if (tempAreas.length === 0) {
      listContainer.innerHTML = `
        <div class="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
          営業エリアが定義されていません。<br>「エリア追加」から作成してください。
        </div>
      `;
    } else {
      listContainer.innerHTML = tempAreas.map(area => {
        return `
          <div class="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-800 transition">
            <div class="min-w-0 flex-1 pr-3">
              <input type="text" value="${area.name}" onchange="updateAreaName('${area.id}', this.value)" class="bg-transparent border-b border-transparent focus:border-brand-blue text-xs font-bold text-white focus:outline-none w-full py-0.5" title="エリア名をクリックして編集できます">
              <p class="text-[9px] text-slate-500 mt-1 flex items-center gap-1">
                <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                <span>割り当て都道府県: ${area.prefs.length}県</span>
              </p>
            </div>
            <button onclick="deleteArea('${area.id}')" class="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition" title="エリア削除">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `;
      }).join('');
    }
  }
  
  // 2. 右ペイン: 地方別アコーディオン & 所属エリアドロップダウンの描画
  const accordionContainer = document.getElementById('prefecturesAccordionContainer');
  if (accordionContainer) {
    // 割り当てのない都道府県数を集計
    let unassignedCount = 0;
    const allPrefIds = Object.keys(prefCodeMap);
    
    // 割り当て状況マップを作成
    const assignedMap = {};
    allPrefIds.forEach(id => { assignedMap[id] = null; });
    
    tempAreas.forEach(area => {
      area.prefs.forEach(prefId => {
        assignedMap[prefId] = area;
      });
    });
    
    // 未割り当てのカウント
    Object.values(assignedMap).forEach(val => {
      if (!val) unassignedCount++;
    });
    
    const unassignedEl = document.getElementById('unassignedCount');
    if (unassignedEl) {
      unassignedEl.textContent = unassignedCount;
      if (unassignedCount > 0) unassignedEl.className = "text-brand-amber font-bold animate-pulse";
      else unassignedEl.className = "text-slate-400 font-semibold";
    }
    
    // 地方別アコーディオンHTML生成
    const prefData = dashboardData.japanPrefecturesData;
    
    accordionContainer.innerHTML = Object.entries(regionPrefs).map(([regionId, region]) => {
      const isOpen = accordionState[regionId];
      const icon = isOpen ? 'chevron-up' : 'chevron-down';
      const visibleClass = isOpen ? '' : 'hidden';
      
      // 地方内の都道府県所属UI行を生成
      const rowsHtml = region.prefs.map(prefId => {
        const p = prefData[prefId];
        if (!p) return '';
        
        const currentArea = assignedMap[prefId];
        
        // 所属エリアドロップダウンの生成
        const optionsHtml = `
          <option value="" ${!currentArea ? 'selected' : ''}>-- 未所属 (未割り当て) --</option>
          ${tempAreas.map(area => `
            <option value="${area.id}" ${currentArea && currentArea.id === area.id ? 'selected' : ''}>
              ${area.name}
            </option>
          `).join('')}
        `;
        
        const dotColor = currentArea ? 'bg-brand-blue' : 'bg-slate-700';
        
        return `
          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900/10 hover:bg-slate-900/30 border border-slate-900/50 text-xs">
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
              <span class="font-semibold text-slate-300 w-16">${p.name}</span>
              <span class="text-[9px] text-slate-500">倍率: ${p.ratio.toFixed(1)}倍 / 求人 ${p.demand}件</span>
            </div>
            
            <div class="relative">
              <select onchange="updatePrefectureAssignment('${prefId}', this.value)" class="bg-slate-800 border border-slate-700/80 rounded px-2.5 py-1 text-[10.5px] font-semibold text-white focus:outline-none focus:border-brand-blue cursor-pointer appearance-none pr-7">
                ${optionsHtml}
              </select>
              <div class="absolute right-2 top-2 pointer-events-none text-slate-500">
                <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      return `
        <div class="bg-slate-950/20 border border-slate-900 rounded-xl overflow-hidden">
          <!-- アコーディオンヘッダー -->
          <div onclick="toggleAccordion('${regionId}')" class="flex justify-between items-center px-4 py-3 bg-slate-900/30 hover:bg-slate-900/50 cursor-pointer transition select-none">
            <h5 class="text-xs font-bold text-slate-200 flex items-center gap-2">
              <i data-lucide="map" class="w-3.5 h-3.5 text-slate-500"></i>
              <span>${region.name} 地方 (${region.prefs.length}都道府県)</span>
            </h5>
            <i data-lucide="${icon}" class="w-4 h-4 text-slate-400"></i>
          </div>
          
          <!-- アコーディオンボディ -->
          <div class="p-3.5 space-y-2 border-t border-slate-900/60 bg-slate-950/10 ${visibleClass}">
            ${rowsHtml}
          </div>
        </div>
      `;
    }).join('');
  }
  
  lucide.createIcons();
};

// エリア名のリアルタイム変更
window.updateAreaName = function(areaId, newName) {
  if (!newName.trim()) return;
  const area = tempAreas.find(a => a.id === areaId);
  if (area) {
    area.name = newName.trim();
  }
};

// 都道府県のエリア所属の変更処理
window.updatePrefectureAssignment = function(prefId, newAreaId) {
  // まず、すべてのエリアからこの都道府県を削除
  tempAreas.forEach(area => {
    area.prefs = area.prefs.filter(id => id !== prefId);
  });
  
  // 指定された新しいエリアに追加
  if (newAreaId) {
    const targetArea = tempAreas.find(a => a.id === newAreaId);
    if (targetArea) {
      targetArea.prefs.push(prefId);
    }
  }
  
  // マッピング状況を再カウントするために右ペインのみ即時レンダリング
  renderAreaManager();
};

// 新規エリアの追加
window.addNewArea = function() {
  const newId = 'custom_area_' + Date.now();
  const areaCount = tempAreas.length + 1;
  const newName = '新規エリア ' + areaCount;
  
  tempAreas.push({
    id: newId,
    name: newName,
    prefs: [],
    action: 'このエリアの推奨営業攻略アクションをここに記載してください。'
  });
  
  renderAreaManager();
};

// エリアの削除
window.deleteArea = function(areaId) {
  if (confirm('このエリアを削除しますか？ (所属していた都道府県は未所属になります)')) {
    tempAreas = tempAreas.filter(a => a.id !== areaId);
    renderAreaManager();
  }
};

// エリア定義設定の保存とダッシュボードへの反映
window.saveAreaDefinitions = function() {
  localStorage.setItem('m3c_area_definitions', JSON.stringify(tempAreas));
  
  // ダッシュボードに反映を告げるポップアップ風通知
  alert('営業エリアの定義を保存し、ダッシュボードに反映しました！');
  
  // グローバルなエリアデータをリビルドし、市場タブを再描画
  renderAll();
  
  // 保存完了に伴い、市場タブに遷移して効果を確認しやすくする
  switchTab('market');
  switchMarketSubTab('area'); // エリア別サブタブを表示
};

// デフォルト設定へのリセット
window.resetAreaDefinitionsToDefault = function() {
  if (confirm('エリア定義をすべて初期設定 (標準地方区分) に戻しますか？')) {
    localStorage.removeItem('m3c_area_definitions');
    tempAreas = null; // リセット
    renderAreaManager();
    renderAll();
    alert('初期設定に復元しました。');
  }
};

// -------------------------------------------------------------
// 5. メンバー横並び比較・同期アコーディオン機能 (NEW)
// -------------------------------------------------------------

// ファネル比較の特定ステージのアクションリストを同期開閉
window.toggleComparisonStageActions = function(stageKey, clickedEl) {
  state.expandedStages = state.expandedStages || {};
  const isExpanded = !state.expandedStages[stageKey];
  state.expandedStages[stageKey] = isExpanded;

  // すべての該当アクションパネルをトグル
  const panels = document.querySelectorAll(`[id$="-${stageKey}-actions"]`);
  panels.forEach(panel => {
    panel.classList.toggle('hidden', !isExpanded);
  });

  // すべての該当 chevrons を回転
  const buttons = document.querySelectorAll(`[data-action-stage="${stageKey}"]`);
  buttons.forEach(btn => {
    const chevron = btn.querySelector('.process-action-chevron');
    if (chevron) {
      chevron.classList.toggle('rotate-180', isExpanded);
    }
  });
};
