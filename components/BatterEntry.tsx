
import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';
import { Player, BatterRecord, PitchType, RunnerState, GameSituation, SwingDecision, ExitVelocity, LaunchAngle, HitDirection, HangTime, ContactCategory, PAResult, BattedBallLocation, BattedBallDepth } from '../types';

export const BatterEntry: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [recentLogs, setRecentLogs] = useState<BatterRecord[]>([]);

  // 1. Context & Pitch
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState('');
  const [inning, setInning] = useState(1);
  const [isTop, setIsTop] = useState(true);
  const [outs, setOuts] = useState(0);
  const [runners, setRunners] = useState<RunnerState>({ first: false, second: false, third: false });
  const [balls, setBalls] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [scoreDiff, setScoreDiff] = useState(0);
  const [battingOrder, setBattingOrder] = useState(1);
  const [situation, setSituation] = useState<GameSituation>('接戦');
  const [totalPitchesSeen, setTotalPitchesSeen] = useState(1);

  // 2. Pitch Detail
  const [pitcherId, setPitcherId] = useState('');
  const [batterId, setBatterId] = useState('');
  const [pitchType, setPitchType] = useState<PitchType>('ストレート');
  const [speed, setSpeed] = useState<number | ''>('');
  const [location, setLocation] = useState(13);

  // 3. Decision & Swing Quality
  const [decision, setDecision] = useState<SwingDecision>('Take');
  const [reaction, setReaction] = useState<BatterRecord['reaction']>('その他');
  const [missAmount, setMissAmount] = useState<BatterRecord['missAmount']>('なし');
  const [isHardHit, setIsHardHit] = useState(false);
  const [isSweetSpot, setIsSweetSpot] = useState(false);

  // 4. Batted Ball Detail
  const [velocity, setVelocity] = useState<ExitVelocity>('Normal');
  const [angle, setAngle] = useState<LaunchAngle>('Line Drive');
  const [direction, setDirection] = useState<HitDirection>('中');
  const [ballLoc, setBallLoc] = useState<BattedBallLocation>('外野');
  const [ballDepth, setBallDepth] = useState<BattedBallDepth>('普通');
  const [fieldPlacement, setFieldPlacement] = useState<BatterRecord['fieldPlacement']>('正面');
  const [hangTime, setHangTime] = useState<HangTime>('普通');
  const [category, setCategory] = useState<ContactCategory>('Solid');
  const [isCaught, setIsCaught] = useState(false);

  // 5. Outcome & Value
  const [paResult, setPaResult] = useState<PAResult>('凡打(アウト)');
  const [rbi, setRbi] = useState(0);
  const [isQualityOut, setIsQualityOut] = useState(false);
  const [forcedCloserPitches, setForcedCloserPitches] = useState(false);

  useEffect(() => {
    onSnapshot(collection(db, 'players'), (snap) => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Player))));
    const q = query(collection(db, 'batter_logs'), orderBy('createdAt', 'desc'), limit(5));
    onSnapshot(q, (snap) => setRecentLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as BatterRecord))));
  }, []);

  const handleSubmit = async () => {
    const batter = players.find(p => p.id === batterId);
    if (!batter) return alert("打者を選択してください");

    const record: BatterRecord = {
      gameId: `batter-game-${date}-${opponent}`,
      date, opponent, inning, isTop, outs, runners, balls, strikes, scoreDiff, battingOrder, gameSituation: situation,
      pitcherId, pitcherName: pitcherId ? (players.find(p => p.id === pitcherId)?.name || '相手投手') : '相手投手',
      pitchType, speed: speed === '' ? null : Number(speed), location,
      pitchesInAtBat: totalPitchesSeen, totalPitchesSeen,
      decision, reaction, missAmount, isHardHit, isSweetSpot,
      exitVelocity: velocity, launchAngle: angle, direction, ballLocation: ballLoc, ballDepth, fieldPlacement, hangTime, category, isCaught,
      paResult, rbi, runs: 0, re24: 0,
      advancements: [], // 簡易化のため空
      isQualityOut, forcedCloserPitches,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'batter_logs'), record);
      // 自動リセット
      if (!['三振(空振り)', '三振(見逃し)', '単打', '二塁打', '三塁打', '本塁打', '凡打(アウト)', '四球', '死球'].includes(paResult)) {
        // 球数だけ増やす
        setTotalPitchesSeen(prev => prev + 1);
      } else {
        setTotalPitchesSeen(1);
        setBalls(0); setStrikes(0);
      }
      setSpeed('');
      setIsHardHit(false);
      setIsQualityOut(false);
    } catch (e) { console.error(e); alert("保存失敗"); }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-20">
      {/* 1. Context & Pitches */}
      <div className="xl:col-span-3 space-y-6">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center">
            <i className="fas fa-history mr-2"></i> 1. Situation
          </h4>
          <div className="space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              {(['接戦', '勝ち越し中', '追い上げ中', '大差(勝)'] as const).map(s => (
                <button key={s} onClick={() => setSituation(s)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${situation === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{s}</button>
              ))}
            </div>
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">投げさせた球数</span>
              <div className="flex items-center space-x-3">
                <button onClick={() => setTotalPitchesSeen(Math.max(1, totalPitchesSeen - 1))} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"><i className="fas fa-minus text-xs"></i></button>
                <span className="text-xl font-black text-indigo-600">{totalPitchesSeen}</span>
                <button onClick={() => setTotalPitchesSeen(totalPitchesSeen + 1)} className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"><i className="fas fa-plus text-xs"></i></button>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block px-1">打者</label>
            <select value={batterId} onChange={e => setBatterId(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none text-indigo-900 appearance-none">
              <option value="">打者を選択してください</option>
              {players.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center">
            <i className="fas fa-brain mr-2"></i> 2. Decision
          </h4>
          <div className="space-y-6">
            <div className="flex p-1 bg-slate-100 rounded-2xl">
              {(['Take', 'Swing'] as const).map(d => (
                <button key={d} onClick={() => setDecision(d)} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${decision === d ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>{d}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['振り遅れ', '差し込まれ', '良反応', '見逃し'] as const).map(r => (
                <button key={r} onClick={() => setReaction(r)} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${reaction === r ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm' : 'bg-white text-slate-400 border-slate-100'}`}>{r}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Pitch Detail (Strike Zone) */}
      <div className="xl:col-span-3 space-y-6">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
           <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center">
            <i className="fas fa-crosshairs mr-2"></i> 3. Pitch Quality
          </h4>
          <div className="aspect-square bg-slate-50 rounded-3xl p-3 border-2 border-slate-100 grid grid-cols-5 grid-rows-5 gap-1 mb-6">
             {Array.from({length: 25}).map((_, i) => {
               const n = i + 1;
               const isZone = [7,8,9,12,13,14,17,18,19].includes(n);
               return <button key={n} onClick={() => setLocation(n)} className={`h-full rounded text-[8px] font-black transition-all ${location === n ? 'bg-indigo-600 text-white scale-110 shadow-xl z-10' : isZone ? 'bg-white border border-indigo-100 text-indigo-200' : 'bg-slate-100/50 text-slate-300'}`}>{n}</button>
             })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <select value={pitchType} onChange={e => setPitchType(e.target.value as any)} className="bg-slate-50 p-3 rounded-xl text-xs font-bold border-none appearance-none">
              {['ストレート', 'スライダー', 'カット', 'カーブ', 'フォーク', 'チェンジアップ', 'その他'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" value={speed} onChange={e => setSpeed(e.target.value === '' ? '' : Number(e.target.value))} placeholder="km/h" className="bg-slate-50 p-3 rounded-xl text-xs font-black border-none text-center" />
          </div>
        </div>
      </div>

      {/* 3. Batted Ball Detail */}
      <div className="xl:col-span-3 space-y-6">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center">
            <i className="fas fa-baseball-bat-ball mr-2"></i> 4. Batted Ball
          </h4>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setIsHardHit(!isHardHit)} className={`py-4 rounded-2xl text-[10px] font-black border transition-all ${isHardHit ? 'bg-orange-500 text-white border-orange-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>HARD HIT</button>
              <button onClick={() => setIsSweetSpot(!isSweetSpot)} className={`py-4 rounded-2xl text-[10px] font-black border transition-all ${isSweetSpot ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>SWEET SPOT</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">角度</label>
                <select value={angle} onChange={e => setAngle(e.target.value as any)} className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold border-none appearance-none">
                  {['Grounder', 'Line Drive', 'Fly Ball', 'Pop Up'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">深度</label>
                <select value={ballDepth} onChange={e => setBallDepth(e.target.value as any)} className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold border-none appearance-none">
                  {['極浅', '浅い', '普通', '深い', '極深'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto">
              {(['左', '左中', '中', '右中', '右'] as const).map(d => (
                <button key={d} onClick={() => setDirection(d)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${direction === d ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>{d}</button>
              ))}
            </div>

            <div className="flex items-center space-x-4">
              <button onClick={() => setIsCaught(!isCaught)} className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all ${isCaught ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>
                {isCaught ? '捕球された' : 'ヒットゾーン'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Outcome & Hidden Value */}
      <div className="xl:col-span-3 space-y-6">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center">
            <i className="fas fa-star mr-2"></i> 5. Result & Value
          </h4>
          
          <div className="space-y-4 mb-8">
            <select value={paResult} onChange={e => setPaResult(e.target.value as any)} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-sm appearance-none border-none text-center shadow-xl">
              <optgroup label="ヒット系">
                <option value="単打">単打</option>
                <option value="二塁打">二塁打</option>
                <option value="三塁打">三塁打</option>
                <option value="本塁打">本塁打</option>
              </optgroup>
              <optgroup label="出塁系">
                <option value="四球">四球</option>
                <option value="敬遠">敬遠</option>
                <option value="死球">死球</option>
              </optgroup>
              <optgroup label="アウト系">
                <option value="凡打(アウト)">凡打(アウト)</option>
                <option value="三振(空振り)">三振(空振り)</option>
                <option value="三振(見逃し)">三振(見逃し)</option>
                <option value="併殺打">併殺打</option>
                <option value="犠打">犠打</option>
                <option value="犠飛">犠飛</option>
              </optgroup>
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
               <span className="text-[10px] font-black text-slate-400">QUALITY OUT (進塁打/強打)</span>
               <button onClick={() => setIsQualityOut(!isQualityOut)} className={`w-12 h-6 rounded-full transition-all relative ${isQualityOut ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                 <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isQualityOut ? 'right-1' : 'left-1'}`}></div>
               </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
               <span className="text-[10px] font-black text-slate-400">FORCED CLOSER (投手消耗)</span>
               <button onClick={() => setForcedCloserPitches(!forcedCloserPitches)} className={`w-12 h-6 rounded-full transition-all relative ${forcedCloserPitches ? 'bg-orange-600' : 'bg-slate-200'}`}>
                 <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${forcedCloserPitches ? 'right-1' : 'left-1'}`}></div>
               </button>
            </div>
          </div>

          <button onClick={handleSubmit} className="w-full mt-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
            SUBMIT DATA
          </button>
        </div>
      </div>
    </div>
  );
};
