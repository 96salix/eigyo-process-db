/**
 * M3キャリア 薬剤師人材紹介ダッシュボード
 * モック用リアルダミーデータ定義 (Ver. 2.0 - 拡張版)
 */

const dashboardData = {
  // 全体KPI (当月累計 - 2026年5月1日〜5月22日時点)
  kpis: {
    revenue: {
      label: "確定売上高 (当月)",
      value: 23750000, // 2,375万円
      target: 30000000, // 3,000万円
      unit: "円",
      achievementRate: 79.2,
      lastMonthComparison: +12.4,
      trend: [1800, 2000, 2150, 2375] // 週次推移 (万円)
    },
    interviews: {
      label: "新規面談実施数",
      value: 142,
      target: 180,
      unit: "件",
      achievementRate: 78.9,
      lastMonthComparison: +5.2,
      trend: [30, 65, 105, 142]
    },
    recommendations: {
      label: "求人推薦数",
      value: 92,
      target: 120,
      unit: "件",
      achievementRate: 76.7,
      lastMonthComparison: -2.1,
      trend: [20, 45, 68, 92]
    },
    offers: {
      label: "内定承諾（決定）数",
      value: 19,
      target: 24,
      unit: "件",
      achievementRate: 79.2,
      lastMonthComparison: +18.7,
      trend: [4, 9, 14, 19]
    }
  },

  // 売上・成約トレンド (月次推移 - 過去6ヶ月 + 当月予測)
  monthlyTrend: {
    months: ["12月", "1月", "2月", "3月", "4月", "5月(当月)", "6月(予測)"],
    target: [2500, 2600, 2800, 3200, 2800, 3000, 3200], // 万円
    actual: [2450, 2750, 2680, 3350, 2900, 2375, null], // 当月は現在値、来月はnull
    forecast: [2450, 2750, 2680, 3350, 2900, 3125, 3350] // 先行指標に基づく予測
  },

  // チーム全体の週次行動量 (直近週: 5月第3週)
  weeklyActivity: {
    categories: ["新規架電", "面談実施", "求人提案", "推薦提出", "面接設定"],
    target: [450, 45, 120, 30, 15],
    actual: [482, 41, 108, 28, 16]
  },

  // リアルタイム営業アクティビティフィード
  activityFeed: [
    {
      id: 1,
      time: "10分前",
      type: "placement", // 成約
      member: "佐藤 拓海",
      message: "調剤薬局A社（品川区）にて、30代女性薬剤師（年収 560万円）の<strong>内定承諾（決定）</strong>を獲得しました！(紹介手数料: 168万円)",
    },
    {
      id: 2,
      time: "45分前",
      type: "offer", // 内定
      member: "鈴木 美咲",
      message: "大手ドラッグストアB社（横浜市）より、20代男性薬剤師（年収 500万円）の<strong>内定</strong>を獲得しました。現在意向醸成中。",
    },
    {
      id: 3,
      time: "2時間前",
      type: "recommendation", // 推薦
      member: "渡辺 裕介",
      message: "メディカル調剤薬局（川崎市）へ、40代女性薬剤師（年収 580万円）を<strong>推薦提出</strong>しました。"
    }
  ],

  // 営業担当者別の行動データ & 成果 (当月累計 - 2026年5月1日〜5月22日時点)
  members: [
    {
      id: "sato",
      name: "佐藤 拓海",
      role: "シニアCA (両面型)",
      avatarColor: "bg-brand-blue",
      metrics: {
        calls: 310,                  // 架電数
        connection_rate: 42.0,       // 架電接続率 (%) [NEW]
        booking_rate: 21.5,          // 面談設定率 (%) [NEW]
        interviews: 28,              // 面談実施数
        hearing_rate: 92.0,          // ヒアリング充足率 (%) [NEW]
        proposals_per_int: 3.2,      // 1面談あたり提案数 (件) [NEW]
        consent_rate: 70.0,          // 推薦承諾率 (%) [NEW]
        recommendations: 20,         // 推薦数 (interviews * proposals_per_int * consent_rate)
        interviews_set: 12,          // 面接設定数
        prep_rate: 85.0,             // 面接前対策実施率 (%) [NEW]
        placements: 5,               // 決定数
        revenue: 6250000             // 決定売上 (円)
      },
      ratios: {
        interview_to_rec: 71.4,       // 面談→推薦移行率 (%)
        rec_to_interview: 60.0,       // 推薦→面接設定率 (%)
        interview_to_placement: 41.7, // 面接→決定率 (%)
        overall_conversion: 17.8      // 面談→決定率 (%)
      },
      diagnostics: {
        strengths: "ヒアリング力と信頼構築が圧倒的。ヒアリング充足率(92%)、面接前対策率(85%)はチームトップであり、これが面接決定率41.7%という超高水準を支えています。",
        weaknesses: "ベテランであるため新規架電(310回)や登録者への初回アプローチ行動量が守りに入りやすく、分母（面談実施数: 28件）がやや不足気味。",
        advice: "マッチング精度と面接前フォローは完璧です。今期さらに売上を伸ばすには、アシスタントも活用しつつ、新規架電のアプローチ量を増やして面談実施数を月間35件以上（週8〜9件ペース）に引き上げることが最優先です。"
      }
    },
    {
      id: "suzuki",
      name: "鈴木 美咲",
      role: "CA (求職者担当)",
      avatarColor: "bg-brand-emerald",
      metrics: {
        calls: 580,
        connection_rate: 31.0,
        booking_rate: 25.0,
        interviews: 45,
        hearing_rate: 45.0,          // 弱み: ヒアリングが極めて浅い
        proposals_per_int: 6.2,      // 弱み: 大量求人提案 (ガチャ打ち)
        consent_rate: 35.0,          // 弱み: マッチングが悪く推薦承諾率が低い
        recommendations: 22,
        interviews_set: 7,
        prep_rate: 30.0,             // 弱み: 面接前対策が不十分
        placements: 2,
        revenue: 2500000
      },
      ratios: {
        interview_to_rec: 48.9,
        rec_to_interview: 31.8,
        interview_to_placement: 28.6,
        overall_conversion: 4.4
      },
      diagnostics: {
        strengths: "行動量はチームNo.1（架電580回、面談45件）。フットワークが軽く、登録求職者との初期接触数は郡を抜いています。",
        weaknesses: "ヒアリング充足率(45%)が低く、面談で求職者の転職本音や優先順位を握れていないため、1面談あたり6.2件も提案しているのに対して推薦承諾率が35%と低迷。結果として面接前対策率(30%)も回らず、成約率(4.4%)が非常に低い「ガチャ打ち」状態。",
        advice: "行動量は素晴らしいですが、マッチングの『質』に重大なボトルネックがあります。大量提案を一度止め、面談時に『3大本音（転職理由・優先順位・他社状況）』を深く聞いてください。今週は提案求人数を1名あたり3〜4件に絞り、推薦承諾率を50%以上に高めることを目指しましょう。"
      }
    },
    {
      id: "takahashi",
      name: "高橋 健太",
      role: "CA/RA (両面型)",
      avatarColor: "bg-brand-purple",
      metrics: {
        calls: 390,
        connection_rate: 35.0,
        booking_rate: 23.4,
        interviews: 32,
        hearing_rate: 65.0,
        proposals_per_int: 4.0,
        consent_rate: 52.0,
        recommendations: 21,
        interviews_set: 9,
        prep_rate: 50.0,             // 弱み: 面接前対策が中途半端
        placements: 3,
        revenue: 3750000
      },
      ratios: {
        interview_to_rec: 65.6,
        rec_to_interview: 42.9,
        interview_to_placement: 33.3,
        overall_conversion: 9.4
      },
      diagnostics: {
        strengths: "CAとRAの両輪を回す両面型CAの鑑。行動量・各プロセス比率ともに平均的で、安定感がある。",
        weaknesses: "面接前対策実施率(50%)に課題あり。面接対策が十分でないため、競合他社バッティングや現職引き止めによる内定辞退で取りこぼしが発生しており、成約歩留まり(33.3%)の低下につながっている。",
        advice: "推薦までは順調ですので、面接前後のフォローを強化しましょう。面接前には必ず30分の『志望動機整理＆模擬面接』の時間を確保し、求職者が面接でアピールすべきポイントを整理してください。また、面接直後は当日中に感想を聞いて不安を即座に解消しましょう。"
      }
    },
    {
      id: "tanaka",
      name: "田中 葵",
      role: "ジュニアCA",
      avatarColor: "bg-brand-amber",
      metrics: {
        calls: 420,
        connection_rate: 25.0,       // 弱み: 架電接続率が低い (日中架電が多い)
        booking_rate: 17.1,          // 弱み: 面談設定率が低い
        interviews: 18,
        hearing_rate: 60.0,
        proposals_per_int: 3.5,
        consent_rate: 50.0,
        recommendations: 9,
        interviews_set: 3,
        prep_rate: 40.0,
        placements: 1,
        revenue: 1250000
      },
      ratios: {
        interview_to_rec: 50.0,
        rec_to_interview: 33.3,
        interview_to_placement: 33.3,
        overall_conversion: 5.6
      },
      diagnostics: {
        strengths: "指導されたプロセスを愚直に実行できており、面談に入ればヒアリング(60%)、推薦移行(50%)ともに新人としては良好な水準。",
        weaknesses: "最大のボトルネックは面談前アプローチ。架電接続率(25%)と面談設定率(17.1%)が極端に低く、新規面談(18件)という分母が全く作れていない。",
        advice: "登録者への架電接続率を高めるため、架電時間帯を見直しましょう。薬剤師は日中通電しにくいため、平日19:00〜21:00や木曜午後・土曜日の架電にリソースを集中させてください。また、接続時の初期トークで『年収UPや土日休みなどの人気求人』を魅力的に訴求し、面談設定率を22%以上へ引き上げましょう。"
      }
    },
    {
      id: "watanabe",
      name: "渡辺 裕介",
      role: "トップエグゼクティブCA",
      avatarColor: "bg-brand-cyan",
      metrics: {
        calls: 520,
        connection_rate: 38.0,       // 強み: 接続率が高い
        booking_rate: 20.2,          // 強み: 面談設定率が高い
        interviews: 40,
        hearing_rate: 85.0,          // 強み: 3大本音ヒアリング
        proposals_per_int: 4.2,      // 強み: 適正な提案数
        consent_rate: 72.0,          // 強み: 推薦承諾率が高い
        recommendations: 30,
        interviews_set: 17,
        prep_rate: 80.0,             // 強み: 面接前対策実施
        placements: 8,
        revenue: 10000000
      },
      ratios: {
        interview_to_rec: 75.0,
        rec_to_interview: 56.7,
        interview_to_placement: 47.1,
        overall_conversion: 20.0
      },
      diagnostics: {
        strengths: "高い行動量とすべてのプロセス品質（接続率38%、ヒアリング充足率85%、推薦承諾率72%、面接前対策率80%）を最高水準で両立するチームの絶対的エース。決定率20.0%で当月売上1000万超え。",
        weaknesses: "選考案件数が極めて多いため、事務処理（日程調整や求人票の手配など）が過密になり、時折初動の遅れが懸念される点。",
        advice: "文句なしの異次元のパフォーマンスです。今後は、日程調整や事務作業をアシスタントに積極的にデリゲーションし、自身は『高年収求職者のグリップ』や『大手法人の特別求人獲得』などのコア業務に時間を全振りすることで、さらに大きな売上を創出してください。"
      }
    }
  ],

  // -----------------------------------------------------------
  // Ver. 2.0 拡張データ: 需給、単価、辞退理由、離職リスク
  // -----------------------------------------------------------

  // 1. エリア×職種の求人倍率 (需給ヒートマップ用)
  // 値は 求人数 / 求職者数。3.0以上＝極度の求人過多(赤)、0.5以下＝激戦区(青)
  marketHeatmap: [
    { name: '東京城南', data: [{ x: '調剤薬局', y: 0.9 }, { x: 'ドラッグ(調剤有)', y: 1.8 }, { x: 'ドラッグ(OTCのみ)', y: 1.2 }, { x: '病院・クリニック', y: 0.4 }] },
    { name: '東京城北', data: [{ x: '調剤薬局', y: 1.5 }, { x: 'ドラッグ(調剤有)', y: 2.2 }, { x: 'ドラッグ(OTCのみ)', y: 1.6 }, { x: '病院・クリニック', y: 0.5 }] },
    { name: '東京城西', data: [{ x: '調剤薬局', y: 0.7 }, { x: 'ドラッグ(調剤有)', y: 1.4 }, { x: 'ドラッグ(OTCのみ)', y: 0.9 }, { x: '病院・クリニック', y: 0.3 }] },
    { name: '東京城東', data: [{ x: '調剤薬局', y: 1.8 }, { x: 'ドラッグ(調剤有)', y: 2.6 }, { x: 'ドラッグ(OTCのみ)', y: 1.9 }, { x: '病院・クリニック', y: 0.6 }] },
    { name: '神奈川',   data: [{ x: '調剤薬局', y: 2.2 }, { x: 'ドラッグ(調剤有)', y: 3.1 }, { x: 'ドラッグ(OTCのみ)', y: 2.3 }, { x: '病院・クリニック', y: 0.7 }] },
    { name: '埼玉',     data: [{ x: '調剤薬局', y: 2.8 }, { x: 'ドラッグ(調剤有)', y: 3.5 }, { x: 'ドラッグ(OTCのみ)', y: 2.7 }, { x: '病院・クリニック', y: 0.8 }] },
    { name: '千葉',     data: [{ x: '調剤薬局', y: 3.1 }, { x: 'ドラッグ(調剤有)', y: 3.8 }, { x: 'ドラッグ(OTCのみ)', y: 2.9 }, { x: '病院・クリニック', y: 0.9 }] }
  ],

  // 2. 雇用形態別成約売上比率 (ドーナツグラフ用)
  contractTypes: {
    labels: ["正社員 (常勤)", "パート (非常勤)", "契約社員・派遣", "スポット応援"],
    values: [17100000, 3800000, 2150000, 700000] // 合計 2375万円
  },

  // 3. 平均紹介単価（決定年収）の推移 (過去6ヶ月)
  unitPriceTrend: {
    months: ["12月", "1月", "2月", "3月", "4月", "5月"],
    avgSalary: [520, 532, 528, 545, 538, 552], // 万円
    avgCommission: [120, 122, 121, 126, 124, 128] // 万円 (紹介手数料)
  },

  // 4. 内定辞退・失注理由 (当月累計 - 積層棒グラフ用)
  lossReasons: {
    categories: ["他社決定 (競合敗退)", "条件乖離 (年収・休日)", "職場環境・雰囲気の不安", "現職による引き止め", "その他 (通勤・体力)"],
    values: [12, 8, 5, 6, 3] // 辞退件数
  },

  // 5. 早期離職リスク追跡 (決定者テーブル用)
  earlyLeavingRisks: [
    {
      id: "risk-1",
      name: "松本 さくら",
      joinedDate: "2026/06/01",
      destination: "さくら調剤薬局 (戸塚店)",
      salary: "年収 540万円",
      score: 85, // リスクスコア %
      status: "危険", // 危険, 注意, 良好
      reason: "現職薬局長からの強烈な引き止め攻勢が退職決定後も続いており、マインドが激しく揺らいでいる。",
      prescription: "5/25(月) 午前中にCA佐藤からお電話を入れ、引き止めの進捗をヒアリングしつつ、円満退職ガイド（マニュアル）を再送。必要に応じて、現職への退職意思を貫徹するためのロールプレイを実施する。"
    },
    {
      id: "risk-2",
      name: "佐藤 俊介",
      joinedDate: "2026/06/01",
      destination: "大手ドラッグチェーン (品川店)",
      salary: "年収 620万円",
      score: 45,
      status: "注意",
      reason: "内定先は『残業なし』を謳っているが、実際は近隣クリニックの夜間診療長引きによる残業常態化のクチコミを見つけてしまい疑心暗鬼に陥っている。",
      prescription: "RA田中から内定先の人事担当者へ即座に連絡を取り、品川店の直近3ヶ月の平均残業時間実績データを取得。また、超過時の残業代完全支給の規定を佐藤様に明確に提示し、不安を払拭する。"
    },
    {
      id: "risk-3",
      name: "木村 恵美",
      joinedDate: "2026/06/15",
      destination: "〇〇総合病院 (大田区)",
      salary: "年収 480万円",
      score: 15,
      status: "良好",
      reason: "第1希望だった病院への転職が叶いモチベーションは非常に高い。現職の引き継ぎも順調そのもの。",
      prescription: "定期連絡（2週間に1回）を維持。入社直前（6/10頃）に内定先病院の総務担当と入社手続き（必要書類や白衣のサイズ指定など）の漏れがないか確認サポートを行う。"
    },
    {
      id: "risk-4",
      name: "渡辺 直樹",
      joinedDate: "2026/06/01",
      destination: "メディカル調剤薬局 (川崎店)",
      salary: "年収 580万円",
      score: 60,
      status: "注意",
      reason: "当初の希望であった『在宅医療（外回り）の経験蓄積』について、内定先店舗の在宅割合が想定より低い（調剤内規メイン）ことが判明し、入社マインドが低下。",
      prescription: "RA高橋が薬局オーナーと緊急ですり合わせ、入社後3ヶ月間の薬局内業務習得ののち、近隣の在宅特化基幹店へのOJT研修および段階的な在宅案件シフトを確約。その書面を渡辺様に送付してグリップする。"
    },
    {
      id: "risk-5",
      name: "小林 健太",
      joinedDate: "2026/07/01",
      destination: "駅前ファミリークリニック (武蔵小杉)",
      salary: "年収 500万円",
      score: 30,
      status: "良好",
      reason: "勤務地が自宅から徒歩10分と至近であり、通勤面の不満はない。前職の退職プロセスも概ね合意済み。",
      prescription: "退職届提出日（5/31）の翌日に進捗確認連絡を入れ、引き止めトラブル等の不測の事態がないかをチェック。問題なければクリニックへの内定承諾確認書類の提出をガイドする。"
    }
  ],

  // 8チーム別の個別パフォーマンスデータ (横並び比較用)
  teamsData: {
    group1: {
      name: "東京CA 第1グループ",
      leader: "佐藤 拓海 (シニアCA兼務)",
      status: "good",
      statusText: "良好 (当月達成率 104.2%)",
      funnel: {
        registrations: { actual: 105, target: 100 },
        bookings: { actual: 84, target: 80 },
        interviews: { actual: 68, target: 65, percent: 104.6 },
        proposals: { actual: 56, target: 50 },
        recommendations: { actual: 48, target: 45, percent: 106.7 },
        setups: { actual: 22, target: 24 },
        placements: { actual: 10, target: 9, percent: 111.1 }
      },
      weeklyActivity: {
        categories: ["架電", "面談", "提案", "推薦", "設定"],
        target: [220, 22, 60, 15, 8],
        actual: [242, 21, 54, 14, 9]
      }
    },
    group2: {
      name: "東京CA 第2グループ",
      leader: "鈴木 美咲 (リーダー候補)",
      status: "danger",
      statusText: "警告 (行動不足・成約率低迷)",
      funnel: {
        registrations: { actual: 90, target: 100 },
        bookings: { actual: 63, target: 80 },
        interviews: { actual: 42, target: 65, percent: 64.6 },
        proposals: { actual: 30, target: 50 },
        recommendations: { actual: 20, target: 45, percent: 44.4 },
        setups: { actual: 8, target: 24 },
        placements: { actual: 2, target: 9, percent: 22.2 }
      },
      weeklyActivity: {
        categories: ["架電", "面談", "提案", "推薦", "設定"],
        target: [220, 22, 60, 15, 8],
        actual: [160, 12, 38, 7, 3]
      }
    },
    group3: {
      name: "東京CA 第3グループ",
      leader: "伊藤 直人 (東京リーダー)",
      status: "warning",
      statusText: "注意 (面接設定率に課題)",
      funnel: {
        registrations: { actual: 95, target: 95 },
        bookings: { actual: 74, target: 76 },
        interviews: { actual: 57, target: 62, percent: 91.9 },
        proposals: { actual: 48, target: 48 },
        recommendations: { actual: 41, target: 43, percent: 95.3 },
        setups: { actual: 16, target: 19 },
        placements: { actual: 5, target: 8, percent: 62.5 }
      },
      weeklyActivity: {
        categories: ["架電", "面談", "提案", "推薦", "設定"],
        target: [210, 21, 56, 14, 8],
        actual: [218, 20, 55, 13, 5]
      }
    },
    kanagawa: {
      name: "神奈川CA グループ",
      leader: "森 佳奈 (神奈川リーダー)",
      status: "good",
      statusText: "良好 (決定単価・歩留まり良好)",
      funnel: {
        registrations: { actual: 98, target: 95 },
        bookings: { actual: 76, target: 74 },
        interviews: { actual: 60, target: 58, percent: 103.4 },
        proposals: { actual: 51, target: 46 },
        recommendations: { actual: 44, target: 40, percent: 110.0 },
        setups: { actual: 19, target: 18 },
        placements: { actual: 9, target: 8, percent: 112.5 }
      },
      weeklyActivity: {
        categories: ["架電", "面談", "提案", "推薦", "設定"],
        target: [205, 20, 54, 14, 8],
        actual: [212, 22, 58, 16, 9]
      }
    },
    saitama: {
      name: "埼玉CA グループ",
      leader: "小林 隼人 (北関東リーダー)",
      status: "good",
      statusText: "良好 (求人需要を活用できている)",
      funnel: {
        registrations: { actual: 78, target: 75 },
        bookings: { actual: 60, target: 58 },
        interviews: { actual: 49, target: 48, percent: 102.1 },
        proposals: { actual: 44, target: 39 },
        recommendations: { actual: 38, target: 34, percent: 111.8 },
        setups: { actual: 18, target: 14 },
        placements: { actual: 8, target: 6, percent: 133.3 }
      },
      weeklyActivity: {
        categories: ["架電", "面談", "提案", "推薦", "設定"],
        target: [175, 18, 48, 12, 6],
        actual: [181, 19, 53, 14, 8]
      }
    },
    chiba: {
      name: "千葉CA グループ",
      leader: "長谷川 舞 (千葉リーダー)",
      status: "danger",
      statusText: "警告 (面談分母・推薦数が不足)",
      funnel: {
        registrations: { actual: 72, target: 75 },
        bookings: { actual: 50, target: 58 },
        interviews: { actual: 34, target: 48, percent: 70.8 },
        proposals: { actual: 26, target: 39 },
        recommendations: { actual: 21, target: 34, percent: 61.8 },
        setups: { actual: 9, target: 14 },
        placements: { actual: 3, target: 6, percent: 50.0 }
      },
      weeklyActivity: {
        categories: ["架電", "面談", "提案", "推薦", "設定"],
        target: [175, 18, 48, 12, 6],
        actual: [148, 13, 34, 8, 4]
      }
    },
    osaka: {
      name: "関西CA グループ",
      leader: "高橋 健太 (関西リーダー兼務)",
      status: "good",
      statusText: "良好 (当月達成率 100.0%)",
      funnel: {
        registrations: { actual: 85, target: 80 },
        bookings: { actual: 66, target: 62 },
        interviews: { actual: 52, target: 50, percent: 104.0 },
        proposals: { actual: 43, target: 40 },
        recommendations: { actual: 36, target: 35, percent: 102.9 },
        setups: { actual: 16, target: 16 },
        placements: { actual: 7, target: 7, percent: 100.0 }
      },
      weeklyActivity: {
        categories: ["架電", "面談", "提案", "推薦", "設定"],
        target: [180, 18, 50, 12, 6],
        actual: [185, 20, 48, 13, 6]
      }
    },
    nagoya: {
      name: "東海CA グループ",
      leader: "山本 優 (東海リーダー)",
      status: "warning",
      statusText: "注意 (行動量は十分・決定率が低い)",
      funnel: {
        registrations: { actual: 75, target: 72 },
        bookings: { actual: 58, target: 56 },
        interviews: { actual: 46, target: 44, percent: 104.5 },
        proposals: { actual: 37, target: 36 },
        recommendations: { actual: 30, target: 31, percent: 96.8 },
        setups: { actual: 13, target: 15 },
        placements: { actual: 4, target: 6, percent: 66.7 }
      },
      weeklyActivity: {
        categories: ["架電", "面談", "提案", "推薦", "設定"],
        target: [165, 16, 44, 11, 6],
        actual: [190, 18, 45, 10, 5]
      }
    }
  },

  // 6. ボトムアップ案件ヨミ（パイプライン）データ
  pipelineYomi: [
    { id: "pipe-1", name: "斉藤 陽子", rank: "A", salary: 550, commission: 165, member: "佐藤 拓海", stage: "内定承諾調整中", updateDate: "5/22" },
    { id: "pipe-2", name: "岡田 健二", rank: "A", salary: 600, commission: 180, member: "高橋 健太", stage: "内定意向グリップ中", updateDate: "5/22" },
    { id: "pipe-3", name: "山内 美紀", rank: "B", salary: 480, commission: 144, member: "鈴木 美咲", stage: "最終面接対策中", updateDate: "5/21" },
    { id: "pipe-4", name: "三浦 大輔", rank: "B", salary: 520, commission: 156, member: "田中 葵", stage: "最終面接調整中", updateDate: "5/22" },
    { id: "pipe-5", name: "清水 雅子", rank: "C", salary: 450, commission: 135, member: "佐藤 拓海", stage: "1次面接通過・日程調整", updateDate: "5/20" },
    { id: "pipe-6", name: "千葉 翼", rank: "C", salary: 700, commission: 245, member: "高橋 健太", stage: "推薦提出済・書類選考中", updateDate: "5/22" },
    { id: "pipe-7", name: "渡辺 恵", rank: "C", salary: 500, commission: 150, member: "鈴木 美咲", stage: "求人提案中・マッチング検討", updateDate: "5/22" }
  ],

  // 7. 入社後定着フォローデータ
  postJoiningFollowups: [
    { id: "pj-1", name: "中村 あゆみ", joinedDate: "2026/04/01", destination: "ひまわり薬局 (新宿店)", salary: "年収 520万円", satisfaction: "Good", weekFollow: true, monthFollow: true, threeMonthFollow: false, notes: "人間関係も良好で業務も順調そのもの。非常勤メンバーとの連携も円滑。", member: "佐藤 拓海" },
    { id: "pj-2", name: "石井 洋介", joinedDate: "2026/04/15", destination: "中央総合病院 (川崎市)", salary: "年収 480万円", satisfaction: "Warning", weekFollow: true, monthFollow: true, threeMonthFollow: false, notes: "当直回数が当初想定より増えそうで体調に若干の不安。病院RAを通じて実態確認中。", member: "高橋 健太" },
    { id: "pj-3", name: "山口 玲子", joinedDate: "2026/05/01", destination: "さくら薬局 (大宮店)", salary: "年収 560万円", satisfaction: "Good", weekFollow: true, monthFollow: false, threeMonthFollow: false, notes: "1週目フォロー実施。店舗の教育体制がしっかりしており満足度高。6月に1ヶ月面談。", member: "鈴木 美咲" },
    { id: "pj-4", name: "中島 翔太", joinedDate: "2026/05/10", destination: "あおぞらドラッグ (千葉店)", salary: "年収 600万円", satisfaction: "Danger", weekFollow: true, monthFollow: false, threeMonthFollow: false, notes: "合意していた『土日休み』がシフト都合で崩れかけ不満。店長およびRAと三者面談調整中。", member: "田中 葵" }
  ],

  // 8. 新規登録初動架電リードタイムデータ
  leadResponseTime: {
    avgMinutes: 14.5,
    targetMinutes: 10,
    withinTenPercent: 78.5, // 10分以内架電率 78.5%
    members: [
      { name: "佐藤 拓海", avgMinutes: 22.0, withinTenPercent: 62.0 },
      { name: "鈴木 美咲", avgMinutes: 8.5, withinTenPercent: 92.5 },
      { name: "高橋 健太", avgMinutes: 15.0, withinTenPercent: 75.0 },
      { name: "田中 葵", avgMinutes: 12.5, withinTenPercent: 84.5 }
    ]
  },

  // 9. 架電タイミング時間帯別接続データ
  hourlyConnectionData: {
    hours: ["9:00", "11:00", "13:00", "15:00", "17:00", "19:00"],
    rates: [28.5, 32.0, 52.5, 22.0, 38.5, 58.0],
    desc: "13時台（休憩）および19時台（退勤後）の接続率が高く、集中アプローチが極めて有効。"
  },

  // 10. 日本全国都道府県別需給データ (日本白地図ヒートマップ用)
  japanPrefecturesData: {
    hokkaido: { name: "北海道", ratio: 1.8, demand: 450, supply: 250, status: "seller-light", desc: "札幌中心部は求職者・求人のバランスが取れていますが、道東・道北エリア（旭川・釧路等）では慢性的な薬剤師不足が発生しています。特に冬季のスポット応援需要が活発です。", action: "道東・道北エリアの調剤薬局に対し、札幌市内や本州からの短期・週末スポット応援（往復交通費支給＋高時給）のパッケージ提案を推進してください。" },
    aomori: { name: "青森県", ratio: 2.8, demand: 180, supply: 64, status: "seller", desc: "八戸や弘前エリアを中心に求人過多が顕著。豪雪地帯の個人薬局では深刻な調剤員不足に悩まされています。", action: "U・Iターン希望者をターゲットとし、『引越し一時金全額支給』や『借り上げ社宅無料完備』を交渉材料に大手薬局の求人を優先提案してください。" },
    iwate: { name: "岩手県", ratio: 2.5, demand: 160, supply: 64, status: "seller", desc: "盛岡市内を除く北上・一関などの沿岸・内陸部で極度な薬剤師不足。採用の長期化が続いています。", action: "若手の求職者に対し、内陸エリアでの『年収650万円保証＋残業なし』の特別枠求人を積極的にぶつけて一発決定を狙いましょう。" },
    miyagi: { name: "宮城県", ratio: 1.6, demand: 480, supply: 300, status: "seller-light", desc: "仙台市内は求職者が多く比較的安定していますが、石巻・大崎エリアなどでは調剤薬局の採用難が続いています。", action: "仙台市在住の求職者に対し、車通勤可能な石巻エリアでの『高単価パート（時給3,000円以上）』を提案し、成約を促進しましょう。" },
    akita: { name: "秋田県", ratio: 3.2, demand: 160, supply: 50, status: "seller-extreme", desc: "全国で最も急速に高齢化が進むエリアであり、薬剤師の採用難易度は国内最高レベル。極度な超売り手市場です。", action: "企業に対しては、紹介手数料率の特別交渉（35%→40%）を強くプッシュ。求職者へは『完全週休3日制』『引越し費用＆支度金完全支給』を確約できる独占案件を提示します。" },
    yamagata: { name: "山形県", ratio: 2.4, demand: 170, supply: 70, status: "seller", desc: "山形市内は均衡していますが、庄内地方（酒田・鶴岡）において慢性的な病院・薬局の人員不足が続いています。", action: "山形県内の薬局チェーンから『派遣・応援契約』を誘致し、山形市内から庄内エリアへの週末短期出張応援案件としてマッチングをかけます。" },
    fukushima: { name: "福島県", ratio: 2.2, demand: 320, supply: 145, status: "seller", desc: "中通り（郡山・福島）は均衡傾向ですが、いわきエリアや浜通りにおける採用難易度は依然として極めて高い状況です。", action: "郡山市内からいわきエリアへ通勤（または高速代支給での移住）する求職者へ、通常より年収を100万円以上上乗せした『特別待遇枠』を打診します。" },
    ibaraki: { name: "茨城県", ratio: 2.3, demand: 420, supply: 182, status: "seller", desc: "つくば・水戸などの中心エリアは良好ですが、神栖や常陸大宮など、県境・沿岸部で極端な求人過多が発生しています。", action: "千葉・埼玉在住で通勤圏内の求職者に、『高速道路代支給』または『社宅完備』での特別勤務条件を交渉し、推薦を獲得してください。" },
    tochigi: { name: "栃木県", ratio: 2.1, demand: 290, supply: 138, status: "seller", desc: "宇都宮市周辺は充足しつつありますが、那須塩原や足利・佐野エリアなど郊外で薬剤師不足が続いています。", action: "宇都宮周辺の『年収アップ希望者』に対し、那須エリアなどの高年収店舗（年収600万円以上）への車通勤スキームを積極的に推奨します。" },
    gunma: { name: "群馬県", ratio: 2.0, demand: 260, supply: 130, status: "seller", desc: "高崎・前橋エリアは大手ドラッグストアの出店競争により、採用難易度が上昇傾向にあります。", action: "大手ドラッグチェーンに対し、高崎周辺の求職者を優先アプローチする代わりに、『時短勤務での正社員雇用』などの柔軟な受け入れ条件を握ります。" },
    saitama: { name: "埼玉県", ratio: 1.8, demand: 980, supply: 544, status: "seller-light", desc: "さいたま市周辺は求職者・求人ともに非常に活発。熊谷・秩父などの北西部で慢性的な薬剤師不足が発生しています。", action: "都内通勤圏内在住の求職者に対し、さいたま市以北の『残業なし＋年収580万円』の優良ドラッグ（調剤あり）求人を積極的にアピールしてください。" },
    chiba: { name: "千葉県", ratio: 1.9, demand: 950, supply: 500, status: "seller-light", desc: "船橋・市川などの東京隣接部は充足気味ですが、木更津・鴨川などの房総エリアや銚子周辺で深刻な薬剤師不足です。", action: "房総エリアの地域基幹病院や調剤チェーンに対し、千葉市内から車通勤（往復交通費・ガソリン代支給）するCA推薦枠を提案し、決定を狙います。" },
    tokyo: { name: "東京都", ratio: 0.8, demand: 2500, supply: 3125, status: "buyer", desc: "23区中心部（特に城西・城南エリア）は全国随一の薬剤師充足地域。企業優位の極めて強い買い手市場です。", action: "都内勤務希望の求職者に対しては、バッティングを避けるために他社に先んじた『スピード企業打診』と『模擬面接での完璧な意向グリップ』を徹底してください。" },
    kanagawa: { name: "神奈川県", ratio: 0.9, demand: 1800, supply: 2000, status: "buyer", desc: "横浜・川崎エリアは求職者が豊富で採用難易度は低いですが、小田原や三浦半島などの郊外では採用難が生じています。", action: "横浜周辺でバッティングに悩む求職者に対し、小田原や秦野エリアの『高年収かつ管理薬剤師ポストが狙える優良薬局』を提案して誘導を図りましょう。" },
    niigata: { name: "新潟県", ratio: 1.7, demand: 290, supply: 170, status: "seller-light", desc: "新潟市内は充足していますが、長岡・上越エリアや佐渡などの離島において、病院や門前薬局の採用難が続いています。", action: "新潟市内の求職者に対し、長岡エリアでの『新幹線通勤手当全額支給』や『単身赴任手当付き』の特別好待遇求人を交渉して推薦します。" },
    toyama: { name: "富山県", ratio: 1.5, demand: 150, supply: 100, status: "seller-light", desc: "「くすりの富山」として製薬・調剤基盤が強いですが、大手チェーンの新規出店により、若手薬剤師の獲得競争が激化しています。", action: "製薬メーカーや卸からの転職（キャリアチェンジ）を希望する求職者へ、調剤未経験でも研修制度が整った大手薬局チェーンを優先提案します。" },
    ishikawa: { name: "石川県", ratio: 1.4, demand: 180, supply: 128, status: "balance-light", desc: "金沢市内はほぼ均衡していますが、能登エリア等で急激な薬剤師不足が進んでおり、採用難が強まっています。", action: "能登エリアの薬局・病院から『応援薬剤師パッケージ』を受託し、金沢周辺在住のパート希望者に高時給でのアプローチを促進します。" },
    fukui: { name: "福井県", ratio: 1.8, demand: 110, supply: 61, status: "seller-light", desc: "嶺北（福井市）は落ち着いていますが、嶺南（敦賀・小浜）エリアにおいて極端な薬剤師不足が生じています。", action: "滋賀や京都北部在住の求職者に対し、通勤可能な敦賀エリアでの『車通勤交通費全額支給＋年収600万円保証』案件を提案します。" },
    yamanashi: { name: "山梨県", ratio: 1.6, demand: 130, supply: 81, status: "seller-light", desc: "甲府市内は均衡していますが、富士吉田・都留エリアなど、郡内地方での採用が非常に長期化しています。", action: "八王子や多摩エリア在住の『年収アップ希望』求職者に、通勤圏内である上野原・大月周辺の『高待遇調剤薬局』を積極的に提案してください。" },
    nagano: { name: "長野県", ratio: 1.9, demand: 310, supply: 163, status: "seller-light", desc: "長野市・松本市は安定していますが、諏訪・飯田エリアにおいて薬剤師の不足傾向が非常に顕著です。", action: "諏訪・伊那エリアの地域薬局チェーンに対し、松本・塩尻周辺からの『通勤用高速道路代支給』を確約させ、求職者を推薦します。" },
    gifu: { name: "岐阜県", ratio: 1.5, demand: 210, supply: 140, status: "seller-light", desc: "岐阜市周辺は均衡していますが、飛騨・高山エリアや東濃エリアなど、山間部において慢性的な調剤員不足に悩んでいます。", action: "名古屋市内や岐阜市内の若手薬剤師に、『Uターン歓迎・高年収社宅完備』をアピールし、東濃エリアの大手薬局求人をぶつけます。" },
    shizuoka: { name: "静岡県", ratio: 1.7, demand: 580, supply: 341, status: "seller-light", desc: "静岡市・浜松市周辺は求人・求職ともに豊富。伊豆半島エリアや御殿場周辺での採用難が際立っています。", action: "神奈川西部に在住する『年収アップ・残業削減希望』の求職者に、伊豆・御殿場周辺の『年収最大650万円確約』案件を強く提案しましょう。" },
    aichi: { name: "愛知県", ratio: 1.2, demand: 1100, supply: 916, status: "balance-light", desc: "名古屋市内は非常に活発でほぼ均衡。三河エリア（豊田・岡崎）や知多半島周辺で薬剤師の獲得競争が強まっています。", action: "名古屋市内でバッティングに悩む若手求職者に対し、豊田・刈谷周辺の『在宅や特殊調剤に関われる先進的薬局』を提案し差別化を図ります。" },
    mie: { name: "三重県", ratio: 1.4, demand: 180, supply: 128, status: "balance-light", desc: "四日市・津周辺は均衡していますが、伊勢・志摩エリアや尾鷲・熊野などの南部で深刻な薬剤師不足が続いています。", action: "志摩・熊野エリアの小規模薬局に対し、『管理薬剤師としての幹部候補採用（年収700万円交渉）』をフックに中堅層求職者を獲得します。" },
    shiga: { name: "滋賀県", ratio: 1.5, demand: 190, supply: 126, status: "seller-light", desc: "大津・草津周辺は京都・大阪への通勤圏として充足しつつありますが、湖東・湖北エリアでの採用が著しく難化しています。", action: "京都周辺在住でバッティングに疲弊している求職者に、米原・長浜周辺の『新幹線通勤可能な高待遇・残業なし店舗』を強く提案します。" },
    kyoto: { name: "京都府", ratio: 1.1, demand: 420, supply: 381, status: "balance", desc: "京都市内は大学が多く薬剤師が豊富で充足気味。舞鶴や宮津などの京都北部（丹後地方）で極端な人員不足です。", action: "京都市内在住で『地方医療貢献』や『スローライフ』に関心のある求職者に、北部エリアの『社宅完備・薬局長候補求人』をぶつけましょう。" },
    osaka: { name: "大阪府", ratio: 0.9, demand: 2100, supply: 2333, status: "buyer", desc: "大阪市内を中心に薬剤師が過密状態であり、非常に強い買い手市場です。求職者の他社バッティング率が極めて高いです。", action: "求職者の意向を徹底グリップするための『初回面談当日の推薦提出』と、内定後のバッティングに備えた『RA連携による企業側アピール』を同時展開してください。" },
    hyogo: { name: "兵庫県", ratio: 1.0, demand: 980, supply: 980, status: "balance", desc: "神戸・阪神間は非常に充足していますが、姫路以西の播磨地方や淡路島、但馬などの北部エリアで深刻な調剤員不足です。", action: "神戸市内のバッティング競争を避け、明石・加古川以西の『マイカー通勤可能・高年収（600万円以上）保証』求人へ求職者を誘導します。" },
    nara: { name: "奈良県", ratio: 1.3, demand: 170, supply: 130, status: "balance-light", desc: "奈良市・生駒市周辺は大阪通勤圏として充足していますが、吉野エリアなどの南部において深刻な薬剤師不足です。", action: "大阪市内で買い手市場に直面している求職者に対し、奈良県南部の『週休2.5日・残業月3時間以下』のワークライフバランス特化求人を提案します。" },
    wakayama: { name: "和歌山県", ratio: 1.6, demand: 160, supply: 100, status: "seller-light", desc: "和歌山市周辺は比較的安定していますが、紀南エリア（田辺・新宮）において極端な薬剤師不足が生じています。", action: "大阪南部在住の求職者に対し、車通勤可能な紀北・紀中エリアの『管理薬剤師候補（年収650万円保証＋高速代全額支給）』を強く訴求します。" },
    tottori: { name: "鳥取県", ratio: 2.6, demand: 130, supply: 50, status: "seller", desc: "米子・鳥取エリアともに慢性的な薬剤師不足。大手チェーンから個人薬局まで、獲得競争が激化しています。", action: "Uターン・Iターン希望の若手薬剤師に対し、『赴任手当全額支給』に加え『月最大10万円の住宅補助』を出せる薬局を即時提示します。" },
    shimane: { name: "島根県", ratio: 2.8, demand: 140, supply: 50, status: "seller", desc: "松江・出雲エリアは比較的落ち着いていますが、浜田・益田などの石見地方において極度な薬剤師不足が発生しています。", action: "石見エリアの調剤薬局チェーンと提携し、『時給4,200円以上の超高待遇派遣契約』を獲得。全国の登録者へ短期移住アプローチをかけます。" },
    okayama: { name: "岡山県", ratio: 1.4, demand: 320, supply: 228, status: "balance-light", desc: "岡山市内は薬学部が多くほぼ均衡。津山などの美作エリアや県北部において、人員獲得の難易度が上昇しています。", action: "岡山市内在住の求職者に対し、車通勤可能な津山周辺の『年収620万円保証・在宅対応有』の優良ドラッグ求人をアピールしてください。" },
    hiroshima: { name: "広島県", ratio: 1.3, demand: 520, supply: 400, status: "balance-light", desc: "広島市内はほぼ均衡していますが、三次・庄原などの北部山間エリアや呉・尾道周辺の沿岸部で薬剤師が不足しています。", action: "広島市内の求職者バッティングを避けるため、呉エリア周辺の『残薬管理や地域包括ケアに注力する地域密着薬局』を差別化提案します。" },
    yamaguchi: { name: "山口県", ratio: 1.8, demand: 220, supply: 122, status: "seller-light", desc: "下関・宇部周辺は落ち着いていますが、周南・岩国エリアや長門・萩周辺の北部において薬剤師不足が続いています。", action: "広島や北九州在住で通勤圏内の求職者に、『新幹線通勤可能』または『高速道路代完全支給』の好待遇店舗を積極的にマッチングします。" },
    tokushima: { name: "徳島県", ratio: 2.1, demand: 150, supply: 71, status: "seller", desc: "徳島市内は大学病院周辺を中心に均衡していますが、阿南・三好エリアなど郊外で薬剤師が大幅に不足しています。", action: "徳島市内の若手・中堅薬剤師へ、『薬局長昇格＋年収650万円保証』を条件に、郊外大手チェーンへのキャリアアップ転職を促します。" },
    kagawa: { name: "香川県", ratio: 1.9, demand: 210, supply: 110, status: "seller-light", desc: "高松周辺はほぼ均衡。丸亀・観音寺などの西讃エリアや東讃地方において、慢性的な調剤員不足に陥っています。", action: "高松在住の『年収アップ希望者』に対し、西讃エリアの『高年収提示店舗（最大年収620万円）』へのマイカー通勤スキームを推奨します。" },
    ehime: { name: "愛媛県", ratio: 2.3, demand: 280, supply: 121, status: "seller", desc: "松山市内は充足しつつありますが、新居浜・西条エリアなどの東予や、宇和島などの南予で深刻な採用難が発生しています。", action: "松山市内の求職者に、東予エリアへの『借り上げ社宅無料完備＋引越し一時金全額支給』を握った優良求人アプローチをかけましょう。" },
    kochi: { name: "高知県", ratio: 2.9, demand: 150, supply: 51, status: "seller-extreme", desc: "高知市内を除く全県で急激な若手薬剤師の都市部流出が進んでおり、若手・中堅の市場価値が最高潮に達しています。", action: "若手の登録者に対し、高知の『管理薬剤師候補（年収680〜720万円確約）』の超優良独占案件を即時ぶつけ、他社に先んじて一発決定を狙います。" },
    fukuoka: { name: "福岡県", ratio: 1.1, demand: 1200, supply: 1090, status: "balance", desc: "福岡市・北九州市は薬学部が多く非常に充足しており、ほぼ均衡。筑後エリアや飯塚・直方などで不足が目立ちます。", action: "福岡市内での激しいバッティング競争を避け、筑後・筑豊エリアの『マイカー通勤可能・年収600万円以上・残業ゼロ』店舗へ求職者を誘導します。" },
    saga: { name: "佐賀県", ratio: 1.7, demand: 140, supply: 82, status: "seller-light", desc: "佐賀市内は福岡からの通勤圏として均衡していますが、唐津・伊万里エリアや武雄周辺で採用難易度が上昇しています。", action: "福岡西部に在住する『年収アップ希望者』に対し、西九州道で快適に通勤可能な唐津周辺の『年収630万円確約』求人を強く提案しましょう。" },
    nagasaki: { name: "長崎県", ratio: 2.2, demand: 220, supply: 100, status: "seller", desc: "長崎市内は坂が多く通勤面での充足偏在がありますが、五島・対馬などの離島や佐世保・大村等で深刻な採用難です。", action: "離島・地方薬局チェーンから『時給4,500円以上の高待遇派遣・応援契約』を受託。全国のフットワークの軽い若手にアピールします。" },
    kumamoto: { name: "熊本県", ratio: 1.8, demand: 290, supply: 161, status: "seller-light", desc: "熊本市内は半導体マネーによる薬局出店が進み競争激化。人吉・天草などの郊外や南部で深刻な薬剤師不足です。", action: "熊本市内の求職者に対し、車通勤可能な宇城・八代周辺の『管理薬剤師ポスト（年収650万円保証＋残業なし）』を積極的に推奨します。" },
    oita: { name: "大分県", ratio: 2.0, demand: 200, supply: 100, status: "seller", desc: "大分市内は均衡していますが、日田・中津エリアや佐伯などの南部沿岸部で急激な人員不足が発生しています。", action: "大分市内の調剤経験者に、『U・Iターン支援＋年収630万円』を条件に、中津エリアの『在宅特化ドラッグストア』を優先アプローチします。" },
    miyazaki: { name: "宮崎県", ratio: 2.4, demand: 170, supply: 70, status: "seller", desc: "宮崎市内は比較的安定していますが、延岡・日向エリアや都城・小林などの県南部において薬剤師が極端に不足しています。", action: "鹿児島や熊本在住で通勤圏内の求職者に、『通勤用高速道路代支給』または『社宅完備』での特別勤務条件を交渉し、推薦を獲得します。" },
    kagoshima: { name: "鹿児島県", ratio: 2.6, demand: 230, supply: 88, status: "seller", desc: "鹿児島市内は充足していますが、薩摩川内・鹿屋エリアや奄美・種子島などの離島・半島部において極度な薬剤師不足です。", action: "離島・地方の『地域密着型アットホーム薬局』を、地元志向の求職者や、福岡から『地域医療貢献・スローライフ移住』を希望する層へアプローチします。" },
    okinawa: { name: "沖縄県", ratio: 1.5, demand: 180, supply: 120, status: "seller-light", desc: "那覇市周辺は移住希望者も含めて充足していますが、名護などの本島北部や宮古・石垣などの先島諸島で深刻な採用難です。", action: "全国の『リゾート移住・短期勤務希望』の登録者に対し、北部・離島店舗の『往復航空券支給＋家具家電付き社宅無料完備＋高時給』案件を提案します。" }
  }
};


// チーム平均値 (ベンチマーク用 - 2026年5月当月)
const teamAverages = {
  metrics: {
    calls: 444,
    connection_rate: 34.2,       // チーム平均接続率 (%) [NEW]
    booking_rate: 21.6,          // チーム平均面談設定率 (%) [NEW]
    interviews: 32.6,
    hearing_rate: 69.0,          // チーム平均ヒアリング充足率 (%) [NEW]
    proposals_per_int: 4.2,      // チーム平均提案数 (件) [NEW]
    consent_rate: 55.8,          // チーム平均推薦承諾率 (%) [NEW]
    recommendations: 20.4,
    interviews_set: 9.6,
    prep_rate: 57.0,             // チーム平均面接前対策率 (%) [NEW]
    placements: 3.8,
    revenue: 4750000
  },
  ratios: {
    interview_to_rec: 62.6,
    rec_to_interview: 47.1,
    interview_to_placement: 39.6,
    overall_conversion: 11.7
  }
};

// -------------------------------------------------------------
// Ver. 4.0 エリア定義管理用 デフォルトデータ定義
// -------------------------------------------------------------
const defaultAreas = [
  {
    id: 'kanto',
    name: '首都圏・関東',
    prefs: ['tokyo', 'kanagawa', 'saitama', 'chiba', 'ibaraki', 'tochigi', 'gunma'],
    action: '首都圏・関東エリアでは調剤薬局のバッティングが激しいため、郊外エリアへのマイカー通勤スキームの提案や、ドラッグストア（調剤あり）の高年収案件の特化提案を推進してください。'
  },
  {
    id: 'kansai',
    name: '関西圏',
    prefs: ['osaka', 'kyoto', 'hyogo', 'nara', 'wakayama', 'shiga'],
    action: '関西圏（特に大阪市内）は非常に強い買い手市場です。求職者の他社バッティングを防ぐため、初回面談当日のスピード推薦とRAによる独占求人開拓を徹底してください。'
  },
  {
    id: 'tokai',
    name: '東海圏',
    prefs: ['aichi', 'shizuoka', 'gifu', 'mie'],
    action: '東海圏（名古屋市内）は均衡していますが、三河エリアや山間部での慢性的な薬剤師不足をターゲットに、車通勤交通費支給や特別手当を握って交渉します。'
  },
  {
    id: 'hokkaido_tohoku',
    name: '北海道・東北',
    prefs: ['hokkaido', 'aomori', 'iwate', 'miyagi', 'akita', 'yamagata', 'fukushima'],
    action: '慢性的な豪雪地帯や郊外での薬剤師不足に対応し、本州や札幌市からの短期スポット応援パッケージ（往復交通費・社宅無料完備）の提案を強化します。'
  },
  {
    id: 'hokuriku_koshinetsu',
    name: '北陸・甲信越',
    prefs: ['niigata', 'toyama', 'ishikawa', 'fukui', 'yamanashi', 'nagano'],
    action: '甲信越エリアでは、八王子や東京・名古屋方面からの新幹線通勤手当付き求人の開拓や、時短勤務正社員の柔軟な受け入れ交渉が効果的です。'
  },
  {
    id: 'chugoku_shikoku',
    name: '中国・四国',
    prefs: ['tottori', 'shimane', 'okayama', 'hiroshima', 'yamaguchi', 'tokushima', 'kagawa', 'ehime', 'kochi'],
    action: '四国・島根・鳥取エリアなどは超売り手市場です。Uターン・Iターン希望者に対して引越し一時金や月最大10万円の住宅補助を出せる独占求人を提示します。'
  },
  {
    id: 'kyushu_okinawa',
    name: '九州・沖縄',
    prefs: ['fukuoka', 'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima', 'okinawa'],
    action: '福岡中心部は充足していますが、南九州・沖縄離島での薬剤師不足は深刻です。離島応援パックや、管理薬剤師としての幹部候補採用（年収700万交渉）を推進します。'
  }
];

