
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase-config';
import { Player, PitchRecord, PitchType, PitchOutcome, RunnerState } from '../types';

export const PitchEntry: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [recentPitches, setRecentPitches] = useState<PitchRecord[]>([]);
  
  // Game Context State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState('');
  const [venue, setVenue] = useState('');
  const [inning, setInning] = useState(1);
  const [isTop, setIsTop] = useState(true);
  const [outs, setOuts] = useState(0);
  const [runners, setRunners] = useState<RunnerState>({ first: false, second: false, third: false });
  const [scoreDiff, setScoreDiff] = useState(0);

  // Actor State
  const [pitcherId, setPitcherId] = useState('');
  const [batterId, setBatterId] = useState('');
  const [pitcherStyle, setPitcherStyle] = useState<PitchRecord['pitcherStyle']>('上手');

  // Pitch Data State
  const [balls, setBalls] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [pitchType, setPitchType] = useState<PitchType>('ストレート');
  const [speed, setSpeed] = useState<number | ''>('');
  const [location, setLocation] = useState(13); // Center
  const [outcome, setOutcome] = useState<PitchOutcome>('ストライク');
  
  // Subjective State
  const [intent, setIntent] = useState<PitchRecord['intent']>('ストライク');
  const [isMiss, setIsMiss] = useState(false);
  const [reaction, setReaction] = useState<PitchRecord['batterReaction']>('その他');
  const [evalValue, setEvalValue] = useState<PitchRecord['evaluation']>('妥当');

  useEffect(() => {
    // 選手データの取得
    const unsubscribePlayers = onSnapshot(collection(db, 'players'), (snap) => {
      setPlayers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    });

    // 直近の履歴
    const q = query(collection(db, 'pitch_logs'), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribePitches = onSnapshot(q, (snap) => {
      setRecentPitches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PitchRecord)));
    });

    return () => {
      unsubscribePlayers();
      unsubscribePitches();
    };
  }, []);

  const handleToggleRunner = (base: keyof RunnerState) => {
    setRunners(prev => ({ ...prev, [base]: !prev[base] }));
  };

  const handleSubmit = async () => {
    const pitcher = players.find(p => p.id === pitcherId);
    const batter = players.find(p => p.id === batterId);

    if (!pitcher || !batter) {
      alert("投手と打者を選択してください。");
      return;
    }

    const record: PitchRecord = {
      gameId: `game-${date}-${opponent}`,
      date, opponent, venue, inning, isTop, outs, runners, scoreDiff,
      atBatCount: 1, // 簡易化のため
      pitcherId,
      pitcherName: pitcher.name,
      pitcherThrowing: pitcher.throwing,
      pitcherStyle,
      batterId,
      batterName: batter.name,
      batterBatting: batter.batting,
      battingOrder: 1,
      balls, strikes,
      pitchInAtBat: 1,
      pitchType,
      speed: speed === '' ? null : Number(speed),
      location,
      outcome,
      isSwing: ['空振り', 'ヒット', 'アウト', 'ファウル', 'ホームラン'].includes(outcome),
      isContact: ['ヒット', 'アウト', 'ファウル', 'ホームラン'].includes(outcome),
      isInPlay: ['ヒット', 'アウト', 'ホームラン'].includes(outcome),
      intent, isMiss, batterReaction: reaction, evaluation: evalValue,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'pitch_logs'), record);
      // カウントの更新ロジック (簡易的)
      if (outcome === 'ボール' && balls < 3) setBalls(balls + 1);
      else if (outcome === 'ストライク' && strikes < 2) setStrikes(strikes + 1);
      else if (outcome === '空振り' && strikes < 2) setStrikes(strikes + 1);
      else { setBalls(0); setStrikes(0); }
      
      setSpeed('');
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました。");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Section 1: Situation & Actors */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center">
              <i className="fas fa-field mr-2 text-indigo-500"></i> Game Context
            </h4>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">対戦相手</label>
                <input value={opponent} onChange={e => setOpponent(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl p-2 text-sm font-bold" placeholder="相手チーム名" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">イニング</label>
                <div className="flex bg-slate-50 rounded-xl overflow-hidden">
                  <input type="number" value={inning} onChange={e => setInning(Number(e.target.value))} className="w-12 bg-transparent border-none p-2 text-center font-bold" />
                  <button onClick={() => setIsTop(!isTop)} className={`flex-1 text-[10px] font-black ${isTop ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>
                    {isTop ? '表' : '裏'}
                  </button>
                </div>
              </div>
            </div>

            {/* Runner & Outs Diamond UI */}
            <div className="relative w-48 h-48 mx-auto mb-6">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-slate-100 rotate-45 rounded-sm"></div>
              {/* Bases */}
              <button onClick={() => handleToggleRunner('first')} className={`absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rotate-45 border-2 transition-all ${runners.first ? 'bg-orange-500 border-orange-600 shadow-lg shadow-orange-200' : 'bg-white border-slate-200'}`}></button>
              <button onClick={() => handleToggleRunner('second')} className={`absolute top-4 left-1/2 -translate-x-1/2 w-8 h-8 rotate-45 border-2 transition-all ${runners.second ? 'bg-orange-500 border-orange-600 shadow-lg shadow-orange-200' : 'bg-white border-slate-200'}`}></button>
              <button onClick={() => handleToggleRunner('third')} className={`absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rotate-45 border-2 transition-all ${runners.third ? 'bg-orange-500 border-orange-600 shadow-lg shadow-orange-200' : 'bg-white border-slate-200'}`}></button>
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                <span className="text-[10px] font-black text-gray-300 block mb-1">OUTS</span>
                <div className="flex space-x-1.5">
                  {[1, 2].map(num => (
                    <button key={num} onClick={() => setOuts(num === outs ? num - 1 : num)} className={`w-4 h-4 rounded-full border-2 ${outs >= num ? 'bg-red-500 border-red-600' : 'bg-white border-slate-200'}`}></button>
                  ))}
                </div>
              </div>
            </div>

            {/* Count Indicator */}
            <div className="flex justify-around bg-slate-900 rounded-2xl p-4 text-white shadow-inner">
              <div className="text-center">
                <span className="text-[10px] font-black text-blue-400 block">BALL</span>
                <div className="flex space-x-1 mt-1">
                  {[1, 2, 3].map(n => <div key={n} className={`w-3 h-3 rounded-full ${balls >= n ? 'bg-blue-500 shadow-glow-blue' : 'bg-slate-700'}`}></div>)}
                </div>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-black text-yellow-400 block">STRIKE</span>
                <div className="flex space-x-1 mt-1">
                  {[1, 2].map(n => <div key={n} className={`w-3 h-3 rounded-full ${strikes >= n ? 'bg-yellow-500 shadow-glow-yellow' : 'bg-slate-700'}`}></div>)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Players</h4>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">PITCHER</label>
                <select value={pitcherId} onChange={e => setPitcherId(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-indigo-600">
                  <option value="">選択...</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.number} {p.name} ({p.throwing})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">BATTER</label>
                <select value={batterId} onChange={e => setBatterId(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-emerald-600">
                  <option value="">選択...</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.number} {p.name} ({p.batting}打)</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Pitch Input */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-8">
              <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Pitch Data</h4>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {['右', '左'].map(h => (
                  <button key={h} className={`px-4 py-1.5 rounded-lg text-xs font-black ${pitcherId && players.find(p=>p.id===pitcherId)?.throwing === h ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>
                    {h}投
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-10">
              {/* Strike Zone Grid */}
              <div className="flex-1">
                <div className="aspect-square bg-slate-100 rounded-3xl p-4 border-4 border-slate-200 relative">
                  <div className="grid grid-cols-5 grid-rows-5 gap-1 h-full w-full">
                    {Array.from({ length: 25 }).map((_, i) => {
                      const idx = i + 1;
                      const isStrike = [7,8,9,12,13,14,17,18,19].includes(idx);
                      return (
                        <button
                          key={idx}
                          onClick={() => setLocation(idx)}
                          className={`rounded-md transition-all flex items-center justify-center text-[8px] font-black ${
                            location === idx 
                              ? 'bg-indigo-600 text-white scale-105 shadow-lg z-10' 
                              : isStrike ? 'bg-white border-2 border-indigo-100 text-indigo-200 hover:bg-indigo-50' : 'bg-slate-50 text-slate-300 hover:bg-white'
                          }`}
                        >
                          {idx}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="text-[10px] text-center text-gray-400 mt-4 font-bold tracking-widest uppercase">Strike Zone (25-Cell)</p>
              </div>

              {/* Pitch Params */}
              <div className="flex-1 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block">球種</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['ストレート', 'スライダー', 'カット', 'カーブ', 'フォーク', 'チェンジアップ'] as PitchType[]).map(t => (
                      <button key={t} onClick={() => setPitchType(t)} className={`py-2 text-[10px] font-black rounded-xl border transition-all ${pitchType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">球速 (km/h)</label>
                    <input type="number" value={speed} onChange={e => setSpeed(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 border-none rounded-xl p-3 font-black text-xl text-center" placeholder="145" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">結果</label>
                    <select value={outcome} onChange={e => setOutcome(e.target.value as PitchOutcome)} className="w-full bg-slate-50 border-none rounded-xl p-3 font-black">
                      <option value="ストライク">ストライク</option>
                      <option value="ボール">ボール</option>
                      <option value="空振り">空振り</option>
                      <option value="ファウル">ファウル</option>
                      <option value="ヒット">ヒット</option>
                      <option value="アウト">アウト</option>
                      <option value="ホームラン">ホームラン</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                   <h5 className="text-[10px] font-black text-gray-400 uppercase border-b pb-2">Analysis (Subjective)</h5>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">意図</label>
                        <select value={intent} onChange={e => setIntent(e.target.value as any)} className="w-full text-xs bg-slate-50 rounded-lg p-2 font-bold">
                          <option value="ストライク">カウントを取りたい</option>
                          <option value="決め">勝負にいきたい</option>
                          <option value="釣り">誘いたい</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">打者反応</label>
                        <select value={reaction} onChange={e => setReaction(e.target.value as any)} className="w-full text-xs bg-slate-50 rounded-lg p-2 font-bold">
                          <option value="振り遅れ">振り遅れ</option>
                          <option value="差し込まれ">差し込まれ</option>
                          <option value="良反応">良反応</option>
                          <option value="見逃し">見逃し</option>
                          <option value="その他">その他</option>
                        </select>
                      </div>
                   </div>
                   <div className="flex items-center space-x-4">
                      <button onClick={() => setIsMiss(!isMiss)} className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${isMiss ? 'bg-red-500 border-red-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                        {isMiss ? '❌ 投げミス' : '✅ 狙い通り'}
                      </button>
                      <div className="flex-1 flex bg-slate-100 rounded-xl p-1">
                        {(['良い', '妥当', '悪い'] as const).map(v => (
                          <button key={v} onClick={() => setEvalValue(v)} className={`flex-1 py-1 text-[10px] font-black rounded-lg ${evalValue === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>
                            {v}
                          </option>
                        ))}
                      </div>
                   </div>
                </div>

                <button 
                  onClick={handleSubmit}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all mt-4"
                >
                  SAVE PITCH
                </button>
              </div>
            </div>
          </div>

          {/* Recent History Table */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 overflow-hidden">
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Recent Pitches</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-300 border-b">
                    <th className="pb-3">BATTER</th>
                    <th className="pb-3">PITCH</th>
                    <th className="pb-3">SPEED</th>
                    <th className="pb-3">LOC</th>
                    <th className="pb-3">RESULT</th>
                    <th className="pb-3">EVAL</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {recentPitches.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-3 font-bold">{p.batterName}</td>
                      <td className="py-3">{p.pitchType}</td>
                      <td className="py-3 font-mono">{p.speed || '-'} <span className="text-[10px] text-gray-300">km</span></td>
                      <td className="py-3 text-indigo-400 font-black">#{p.location}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          ['ヒット', 'ホームラン'].includes(p.outcome) ? 'bg-emerald-500 text-white' : 
                          p.outcome === '空振り' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {p.outcome}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`text-[10px] font-black ${p.evaluation === '良い' ? 'text-emerald-500' : p.evaluation === '悪い' ? 'text-red-500' : 'text-gray-400'}`}>{p.evaluation}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
      
      <style>{`
        .shadow-glow-blue { box-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
        .shadow-glow-yellow { box-shadow: 0 0 10px rgba(234, 179, 8, 0.5); }
      `}</style>
    </div>
  );
};
