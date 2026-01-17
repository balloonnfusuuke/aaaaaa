
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase-config';
import { UnifiedRecord } from '../types';

type Mode = 'batter' | 'pitcher';
type TimePeriod = 'all' | 'month' | 'week' | 'today';

interface BatterStats {
  name: string;
  pa: number;
  ab: number;
  h: number;
  h1b: number;
  h2b: number;
  h3b: number;
  hr: number;
  bb: number;
  so: number;
  sf: number;
  hbp: number;
  rbi: number;
  swings: number;
  pitches: number;
  oSwings: number;
  oPitches: number;
  zSwings: number;
  zPitches: number;
  contacts: number;
  hardHits: number;
  barrels: number;
  sweetSpots: number;
  bip: number;
}

interface PitcherStats {
  name: string;
  bf: number;
  outs: number;
  h: number;
  hr: number;
  bb: number;
  so: number;
  hbp: number;
  runs: number;
  hardHits: number;
  bip: number;
  fb: number;
  gb: number;
}

const MetricHelpModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in">
        <div className="p-10">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-3xl font-black italic tracking-tighter">METRIC GLOSSARY</h3>
            <button onClick={onClose} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <i className="fas fa-times text-slate-500"></i>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-sm">
            <section className="space-y-6">
              <h4 className="text-indigo-600 font-black flex items-center"><i className="fas fa-bat mr-2"></i> 打者指標</h4>
              <div className="space-y-4">
                <div><span className="font-black text-slate-900 block">OPS (On-base Plus Slugging)</span><p className="text-slate-500 leading-relaxed">出塁率 + 長打率。得点創出能力を最も簡便に示す指標。0.900以上で超一流。</p></div>
                <div><span className="font-black text-slate-900 block">K% / BB%</span><p className="text-slate-500 leading-relaxed">打席に対する三振割合と四球割合。アプローチの正確さを示します。</p></div>
                <div><span className="font-black text-slate-900 block">HardHit% (強打率)</span><p className="text-slate-500 leading-relaxed">インプレーの打球のうち「強打」と判定された割合。長打の先行指標。</p></div>
                <div><span className="font-black text-slate-900 block">Barrel% (バレル率)</span><p className="text-slate-500 leading-relaxed">最も安打・長打になりやすい特定の角度と速度の打球割合。</p></div>
                <div><span className="font-black text-slate-900 block">O-Swing% (ボール球スイング率)</span><p className="text-slate-500 leading-relaxed">ストライクゾーン外の投球に対してスイングした割合。選球眼の指標。</p></div>
                <div><span className="font-black text-slate-900 block">BABIP</span><p className="text-slate-500 leading-relaxed">本塁打を除くインプレーの打球が安打になった割合。運や足の速さが影響します。</p></div>
              </div>
            </section>
            
            <section className="space-y-6">
              <h4 className="text-red-600 font-black flex items-center"><i className="fas fa-mound mr-2"></i> 投手指標</h4>
              <div className="space-y-4">
                <div><span className="font-black text-slate-900 block">ERA (防御率)</span><p className="text-slate-500 leading-relaxed">自責点を9イニング換算したもの。投手の安定感の基本。</p></div>
                <div><span className="font-black text-slate-900 block">WHIP (Walks plus Hits per Inning Pitched)</span><p className="text-slate-500 leading-relaxed">1イニングあたりに許した走者数。(安打+四球)÷投球回。</p></div>
                <div><span className="font-black text-slate-900 block">K/9 / BB/9</span><p className="text-slate-500 leading-relaxed">9イニング換算の三振数と四球数。純粋な能力値を示します。</p></div>
                <div><span className="font-black text-slate-900 block">K/BB</span><p className="text-slate-500 leading-relaxed">奪三振と四球の比率。3.5以上で優秀、制球の良さを示します。</p></div>
                <div><span className="font-black text-slate-900 block">GB% (ゴロ率)</span><p className="text-slate-500 leading-relaxed">打球のうちゴロになった割合。高いほど併殺や長打回避に有利。</p></div>
                <div><span className="font-black text-slate-900 block">被HardHit%</span><p className="text-slate-500 leading-relaxed">相手打者に許した強打の割合。投手自身の球威を示します。</p></div>
              </div>
            </section>
          </div>
          <button onClick={onClose} className="mt-12 w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl">Close Glossary</button>
        </div>
      </div>
    </div>
  );
};

export const Leaderboard: React.FC = () => {
  const [logs, setLogs] = useState<UnifiedRecord[]>([]);
  const [mode, setMode] = useState<Mode>('batter');
  const [period, setPeriod] = useState<TimePeriod>('all');
  const [search, setSearch] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'unified_logs'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as UnifiedRecord)));
    });
  }, []);

  const filteredLogs = useMemo(() => {
    if (period === 'all') return logs;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastWeek = new Date();
    lastWeek.setDate(now.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    return logs.filter(log => {
      if (period === 'today') return log.date === todayStr;
      if (period === 'month') return log.date.startsWith(monthStr);
      if (period === 'week') return log.date >= lastWeekStr;
      return true;
    });
  }, [logs, period]);

  const stats = useMemo(() => {
    const bStats: Record<string, BatterStats> = {};
    const pStats: Record<string, PitcherStats> = {};

    filteredLogs.forEach(log => {
      const bId = log.batterId;
      const pId = log.pitcherId;
      if (!bId || !pId) return;

      const isHit = ['単打', '二塁打', '三塁打', '本塁打'].includes(log.paResult);
      const isWalk = ['四球', '敬遠', '死球'].includes(log.paResult);
      const isPA = log.paResult !== '進行中';
      const isAB = isPA && !isWalk && !['犠打', '犠飛', '打撃妨害'].includes(log.paResult);
      const isSO = ['三振(空振り)', '三振(見逃し)'].includes(log.paResult);
      const isSwing = log.decision === 'Swing';
      const isZone = [7, 8, 9, 12, 13, 14, 17, 18, 19].includes(log.location);
      const isBIP = isAB && !isSO && log.paResult !== '本塁打';

      if (!bStats[bId]) bStats[bId] = { name: log.batterName, pa: 0, ab: 0, h: 0, h1b: 0, h2b: 0, h3b: 0, hr: 0, bb: 0, so: 0, sf: 0, hbp: 0, rbi: 0, swings: 0, pitches: 0, oSwings: 0, oPitches: 0, zSwings: 0, zPitches: 0, contacts: 0, hardHits: 0, barrels: 0, sweetSpots: 0, bip: 0 };
      const bs = bStats[bId];
      bs.pitches += 1;
      if (isSwing) bs.swings += 1;
      if (isSwing && log.pitchOutcome !== '空振りS') bs.contacts += 1;
      if (isZone) { bs.zPitches += 1; if (isSwing) bs.zSwings += 1; }
      else { bs.oPitches += 1; if (isSwing) bs.oSwings += 1; }
      
      if (isPA) {
        bs.pa += 1;
        bs.rbi += (log.rbi || 0);
        if (isAB) bs.ab += 1;
        if (isWalk) bs.bb += 1;
        if (isSO) bs.so += 1;
        if (log.paResult === '犠飛') bs.sf += 1;
        if (isHit) {
          bs.h += 1;
          if (log.paResult === '単打') bs.h1b += 1;
          if (log.paResult === '二塁打') bs.h2b += 1;
          if (log.paResult === '三塁打') bs.h3b += 1;
          if (log.paResult === '本塁打') bs.hr += 1;
        }
        if (isBIP) {
          bs.bip += 1;
          if (log.isHardHit) bs.hardHits += 1;
          if (log.isSweetSpot) bs.sweetSpots += 1;
          if (log.battedAngle && log.battedAngle >= 8 && log.battedAngle <= 32) bs.barrels += 1;
        }
      }

      if (!pStats[pId]) pStats[pId] = { name: log.pitcherName, bf: 0, outs: 0, h: 0, hr: 0, bb: 0, so: 0, hbp: 0, runs: 0, hardHits: 0, bip: 0, fb: 0, gb: 0 };
      const ps = pStats[pId];
      if (isPA) {
        ps.bf += 1;
        if (isHit) ps.h += 1;
        if (log.paResult === '本塁打') ps.hr += 1;
        if (isWalk) ps.bb += 1;
        if (isSO) ps.so += 1;
        ps.runs += (log.rbi || 0);
        if (['内野凡打', '外野フライ', 'ライナー', 'ポップフライ', '犠飛', '併殺打'].includes(log.paResult)) ps.outs += 1;
        if (isSO) ps.outs += 1;
        if (isBIP) {
          ps.bip += 1;
          if (log.isHardHit) ps.hardHits += 1;
          if (log.launchAngle === 'フライ' || log.launchAngle === 'ポップフライ') ps.fb += 1;
          if (log.launchAngle === 'ゴロ') ps.gb += 1;
        }
      }
    });

    return { bStats, pStats };
  }, [filteredLogs]);

  const formattedBatters = useMemo(() => {
    return Object.values(stats.bStats).map((s: BatterStats) => {
      const avg = s.ab > 0 ? s.h / s.ab : 0;
      const obp = (s.ab + s.bb + s.sf) > 0 ? (s.h + s.bb) / (s.ab + s.bb + s.sf) : 0;
      const slg = s.ab > 0 ? (s.h1b + s.h2b*2 + s.h3b*3 + s.hr*4) / s.ab : 0;
      const ops = obp + slg;
      const kRate = s.pa > 0 ? (s.so / s.pa) * 100 : 0;
      const bbRate = s.pa > 0 ? (s.bb / s.pa) * 100 : 0;
      const babip = (s.ab - s.so - s.hr + s.sf) > 0 ? (s.h - s.hr) / (s.ab - s.so - s.hr + s.sf) : 0;
      const hardHitRate = s.bip > 0 ? (s.hardHits / s.bip) * 100 : 0;
      const barrelRate = s.bip > 0 ? (s.barrels / s.bip) * 100 : 0;
      const sweetSpotRate = s.bip > 0 ? (s.sweetSpots / s.bip) * 100 : 0;
      const contactRate = s.swings > 0 ? (s.contacts / s.swings) * 100 : 0;
      const oSwingRate = s.oPitches > 0 ? (s.oSwings / s.oPitches) * 100 : 0;

      return { ...s, avg, obp, slg, ops, kRate, bbRate, babip, hardHitRate, barrelRate, sweetSpotRate, contactRate, oSwingRate };
    }).filter(s => s.name.toLowerCase().includes(search.toLowerCase())).sort((a,b) => b.ops - a.ops);
  }, [stats, search]);

  const formattedPitchers = useMemo(() => {
    return Object.values(stats.pStats).map((s: PitcherStats) => {
      const ip = s.outs / 3;
      const era = ip > 0 ? (s.runs * 9) / ip : 0;
      const whip = ip > 0 ? (s.bb + s.h) / ip : 0;
      const k9 = ip > 0 ? (s.so * 9) / ip : 0;
      const bb9 = ip > 0 ? (s.bb * 9) / ip : 0;
      const kbb = s.bb > 0 ? s.so / s.bb : s.so;
      const hardHitRate = s.bip > 0 ? (s.hardHits / s.bip) * 100 : 0;
      const gbRate = s.bip > 0 ? (s.gb / s.bip) * 100 : 0;
      const fbRate = s.bip > 0 ? (s.fb / s.bip) * 100 : 0;

      return { ...s, ip: ip.toFixed(1), era, whip, k9, bb9, kbb, hardHitRate, gbRate, fbRate };
    }).filter(s => s.name.toLowerCase().includes(search.toLowerCase())).sort((a,b) => a.era - b.era);
  }, [stats, search]);

  // Fix: Making children optional in the type definition to satisfy TypeScript's JSX property checking
  const Th = ({ children, helpId }: { children?: React.ReactNode, helpId?: string }) => (
    <th className="px-4 py-6 text-center text-[10px] font-black uppercase text-slate-400 border-l border-slate-800 whitespace-nowrap">
      <div className="flex items-center justify-center space-x-1">
        <span>{children}</span>
        <button onClick={() => setIsHelpOpen(true)} className="text-[8px] opacity-30 hover:opacity-100 transition-opacity"><i className="fas fa-info-circle"></i></button>
      </div>
    </th>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <MetricHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Header Controls */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => setMode('batter')} className={`px-6 py-3 rounded-xl font-black text-xs transition-all ${mode === 'batter' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>打者成績</button>
          <button onClick={() => setMode('pitcher')} className={`px-6 py-3 rounded-xl font-black text-xs transition-all ${mode === 'pitcher' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>投手成績</button>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl">
          {(['all', 'month', 'week', 'today'] as TimePeriod[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
              {p === 'all' ? '全期間' : p === 'month' ? '今月' : p === 'week' ? '週間' : '今日'}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4 flex-1 max-w-sm">
           <div className="relative flex-1">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="選手名検索..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
           </div>
           <button onClick={() => setIsHelpOpen(true)} className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"><i className="fas fa-question-circle"></i></button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[1400px] border-collapse">
            <thead className="bg-slate-900 text-white sticky top-0 z-20">
              {mode === 'batter' ? (
                <tr>
                  <th className="sticky left-0 bg-slate-900 px-8 py-6 text-xs font-black uppercase tracking-widest z-30">Player</th>
                  <Th>PA</Th><Th>AVG</Th><Th>OBP</Th><Th>SLG</Th><Th>OPS</Th><Th>HR</Th><Th>RBI</Th>
                  <Th>K%</Th><Th>BB%</Th><Th>BABIP</Th>
                  <Th>HardHit%</Th><Th>Barrel%</Th><Th>Sweet%</Th>
                  <Th>Contact%</Th><Th>O-Swing%</Th>
                </tr>
              ) : (
                <tr>
                  <th className="sticky left-0 bg-slate-900 px-8 py-6 text-xs font-black uppercase tracking-widest z-30">Player</th>
                  <Th>ERA</Th><Th>IP</Th><Th>BF</Th><Th>WHIP</Th>
                  <Th>SO</Th><Th>BB</Th><Th>K/9</Th><Th>BB/9</Th><Th>K/BB</Th>
                  <Th>被Hard%</Th><Th>GB%</Th><Th>FB%</Th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mode === 'batter' ? formattedBatters.map(s => (
                <tr key={s.name} className="hover:bg-slate-50 transition-colors group">
                  <td className="sticky left-0 bg-white group-hover:bg-slate-50 px-8 py-5 font-black text-slate-900 z-10 border-r border-slate-50 shadow-[4px_0_8px_rgba(0,0,0,0.02)]">{s.name}</td>
                  <td className="px-4 py-5 text-center font-bold text-slate-600">{s.pa}</td>
                  <td className="px-4 py-5 text-center font-bold text-slate-800">{s.avg.toFixed(3)}</td>
                  <td className="px-4 py-5 text-center font-bold text-slate-500">{s.obp.toFixed(3)}</td>
                  <td className="px-4 py-5 text-center font-bold text-slate-500">{s.slg.toFixed(3)}</td>
                  <td className="px-4 py-5 text-center font-black text-indigo-600 bg-indigo-50/20">{s.ops.toFixed(3)}</td>
                  <td className="px-4 py-5 text-center font-bold text-slate-800">{s.hr}</td>
                  <td className="px-4 py-5 text-center font-bold text-slate-800">{s.rbi}</td>
                  <td className="px-4 py-5 text-center font-bold text-red-500">{s.kRate.toFixed(1)}%</td>
                  <td className="px-4 py-5 text-center font-bold text-emerald-600">{s.bbRate.toFixed(1)}%</td>
                  <td className="px-4 py-5 text-center font-bold text-slate-400">{s.babip.toFixed(3)}</td>
                  <td className="px-4 py-5 text-center font-bold text-orange-600">{s.hardHitRate.toFixed(1)}%</td>
                  <td className="px-4 py-5 text-center font-bold text-orange-600 font-black">{s.barrelRate.toFixed(1)}%</td>
                  <td className="px-4 py-5 text-center font-bold text-orange-500">{s.sweetSpotRate.toFixed(1)}%</td>
                  <td className="px-4 py-5 text-center font-bold text-indigo-500">{s.contactRate.toFixed(1)}%</td>
                  <td className="px-4 py-5 text-center font-bold text-slate-400">{s.oSwingRate.toFixed(1)}%</td>
                </tr>
              )) : formattedPitchers.map(s => (
                <tr key={s.name} className="hover:bg-slate-50 transition-colors group">
                  <td className="sticky left-0 bg-white group-hover:bg-slate-50 px-8 py-5 font-black text-slate-900 z-10 border-r border-slate-50 shadow-[4px_0_8px_rgba(0,0,0,0.02)]">{s.name}</td>
                  <td className="px-4 py-5 text-center font-black text-indigo-600 bg-indigo-50/20">{s.era.toFixed(2)}</td>
                  <td className="px-4 py-5 text-center font-bold text-slate-800">{s.ip}</td>
                  <td className="px-4 py-5 text-center font-bold text-slate-500">{s.bf}</td>
                  <td className="px-4 py-5 text-center font-black text-indigo-500">{s.whip.toFixed(2)}</td>
                  <td className="px-4 py-5 text-center font-bold text-slate-800">{s.so}</td>
                  <td className="px-4 py-5 text-center font-bold text-emerald-600">{s.bb}</td>
                  <td className="px-4 py-5 text-center font-bold text-emerald-600">{s.k9.toFixed(2)}</td>
                  <td className="px-4 py-5 text-center font-bold text-red-500">{s.bb9.toFixed(2)}</td>
                  <td className="px-4 py-5 text-center font-bold text-emerald-600">{s.kbb.toFixed(2)}</td>
                  <td className="px-4 py-5 text-center font-bold text-orange-600">{s.hardHitRate.toFixed(1)}%</td>
                  <td className="px-4 py-5 text-center font-bold text-emerald-600">{s.gbRate.toFixed(1)}%</td>
                  <td className="px-4 py-5 text-center font-bold text-slate-400">{s.fbRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && <div className="p-32 text-center text-slate-300 font-black uppercase tracking-widest bg-white italic">No statistical data found for this segment</div>}
        </div>
      </div>
    </div>
  );
};
