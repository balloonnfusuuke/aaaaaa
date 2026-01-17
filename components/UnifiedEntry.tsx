
import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';
import { Player, Team, UnifiedRecord, PitchType, RunnerState, GameSituation, SwingDecision, LaunchAngle, HitDirection, BattedBallDepth, PAResult } from '../types';

export const UnifiedEntry: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  // 試合状況
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState('');
  const [inning, setInning] = useState(1);
  const [isTop, setIsTop] = useState(true);
  const [outs, setOuts] = useState(0);
  const [runners, setRunners] = useState<RunnerState>({ first: false, second: false, third: false });
  const [balls, setBalls] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [situation, setSituation] = useState<GameSituation>('接戦');

  // アクター
  const [pitcherId, setPitcherId] = useState('');
  const [batterId, setBatterId] = useState('');
  const [atBatPitches, setAtBatPitches] = useState(1);

  // 投手データ
  const [pitchType, setPitchType] = useState<PitchType>('ストレート');
  const [speed, setSpeed] = useState<number | ''>('');
  const [location, setLocation] = useState(13);
  const [intent, setIntent] = useState<UnifiedRecord['intent']>('ストライク');
  const [intentResult, setIntentResult] = useState<UnifiedRecord['intentResult']>('成功');
  const [isPitchMiss, setIsPitchMiss] = useState(false);
  const [pitchOutcome, setPitchOutcome] = useState<UnifiedRecord['pitchOutcome']>('見逃しS');

  // 打者データ
  const [decision, setDecision] = useState<SwingDecision>('Take');
  const [reaction, setReaction] = useState<UnifiedRecord['reaction']>('その他');
  const [isHardHit, setIsHardHit] = useState(false);
  const [isSweetSpot, setIsSweetSpot] = useState(false);

  // 打席完了詳細
  const [paResult, setPaResult] = useState<PAResult>('進行中');
  const [battedAngle, setBattedAngle] = useState(10);
  const [direction, setDirection] = useState<HitDirection>('中');
  const [ballDepth, setBallDepth] = useState<BattedBallDepth>('普通');
  const [rbi, setRbi] = useState(0);
  const [isAdvancement, setIsAdvancement] = useState(false);

  useEffect(() => {
    onSnapshot(collection(db, 'teams'), (snap) => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team))));
    onSnapshot(collection(db, 'players'), (snap) => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Player))));
  }, []);

  const getAngleCategory = (deg: number): LaunchAngle => {
    if (deg < 10) return 'ゴロ';
    if (deg < 25) return 'ライナー';
    if (deg < 50) return 'フライ';
    return 'ポップフライ';
  };

  const getTrajectoryColor = (deg: number) => {
    if (deg < 10) return '#ef4444'; // Red for Grounder
    if (deg < 25) return '#10b981'; // Emerald for Liner
    if (deg < 50) return '#6366f1'; // Indigo for Fly
    return '#a855f7'; // Purple for Pop
  };

  const handleSubmit = async () => {
    if (!pitcherId || !batterId) return alert("投手と打者を選択してください");

    const record: UnifiedRecord = {
      date, opponent, inning, isTop, outs, runners, balls, strikes, scoreDiff: 0, gameSituation: situation,
      pitcherId, pitcherName: players.find(p=>p.id===pitcherId)?.name || '',
      pitchType, speed: speed === '' ? null : Number(speed), location, intent, intentResult, isPitchMiss, pitchEval: '妥当',
      pitchOutcome,
      batterId, batterName: players.find(p=>p.id===batterId)?.name || '',
      decision, reaction, isHardHit, isSweetSpot, pitchesSeenInATBat: atBatPitches,
      paResult: pitchOutcome === 'インプレー' ? paResult : '進行中',
      exitVelocity: 'Normal', launchAngle: getAngleCategory(battedAngle), battedAngle,
      hitDirection: direction,
      ballLoc: ['左', '左中', '中', '右中', '右'].includes(direction) ? '外野' : '内野',
      ballDepth, isCaught: !['単打', '二塁打', '三塁打', '本塁打', '四球', '死球'].includes(paResult), 
      rbi, isQualityOut: isAdvancement, forcedCloserPitches: atBatPitches >= 6,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'unified_logs'), record);
      
      // 次の1球への状態更新ロジック
      if (pitchOutcome !== 'インプレー') {
         setAtBatPitches(prev => prev + 1);
         if (pitchOutcome === 'ボール' && balls < 3) setBalls(balls + 1);
         if (['見逃しS', '空振りS'].includes(pitchOutcome) && strikes < 2) setStrikes(strikes + 1);
         if (pitchOutcome === 'ファウル' && strikes < 2) setStrikes(strikes + 1);
      } else {
         // インプレー保存時のオートイニング進行ロジック
         let newOuts = outs;
         const isSingleOut = ['三振(空振り)', '三振(見逃し)', '内野凡打', '外野フライ', 'ライナー', 'ポップフライ', '犠飛', '犠打'].includes(paResult);
         const isDoublePlay = paResult === '併殺打';
         
         if (isSingleOut) newOuts += 1;
         if (isDoublePlay) newOuts += 2;

         if (newOuts >= 3) {
            // チェンジ
            setOuts(0);
            setRunners({ first: false, second: false, third: false });
            if (isTop) {
               setIsTop(false);
            } else {
               setIsTop(true);
               setInning(prev => prev + 1);
            }
         } else {
            setOuts(newOuts);
         }

         // カウントリセット
         setAtBatPitches(1);
         setBalls(0);
         setStrikes(0);
         
         // 入力バッファリセット
         setPitchOutcome('見逃しS');
         setPaResult('進行中');
         setIsAdvancement(false);
         setRbi(0);
         setBattedAngle(10);
      }
      setSpeed('');
      setIsPitchMiss(false);
      setIntentResult('成功');
    } catch (e) { alert("保存失敗"); }
  };

  const PlayerSelect = ({ id, value, onChange, label }: { id: string, value: string, onChange: (val: string) => void, label: string }) => {
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{label}</label>
        <select value={value} onChange={e=>onChange(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-slate-800 border-none outline-none appearance-none">
          <option value="">選手を選択</option>
          {teams.map(team => (
            <optgroup key={team.id} label={team.name}>
              {players.filter(p => p.teamId === team.id).map(p => (
                <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    );
  };

  const isInPlayMode = pitchOutcome === 'インプレー';

  return (
    <div className="relative space-y-8 animate-fade-in pb-96">
      {/* Status Bar */}
      <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl flex flex-wrap items-center justify-between gap-8 border-b-8 border-slate-950">
        <div className="flex items-center space-x-10">
           <div className="space-y-1 text-center">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">アウト</span>
             <div className="flex space-x-2">
                {[1, 2].map(n => <div key={n} onClick={() => setOuts(n === outs ? n - 1 : n)} className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-all ${outs >= n ? 'bg-red-500 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-slate-700'}`}></div>)}
             </div>
           </div>
           <div className="h-12 w-px bg-slate-800"></div>
           <div className="space-y-1">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">B-S カウント</span>
             <div className="flex items-center space-x-6">
                <div className="flex space-x-2">
                  <span className="text-xs font-black text-blue-400 mr-1">B</span>
                  {[1,2,3].map(n => <div key={n} onClick={() => setBalls(n === balls ? n - 1 : n)} className={`w-5 h-5 rounded-full cursor-pointer transition-all ${balls >= n ? 'bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.6)]' : 'bg-slate-800'}`}></div>)}
                </div>
                <div className="flex space-x-2">
                  <span className="text-xs font-black text-yellow-400 mr-1">S</span>
                  {[1,2].map(n => <div key={n} onClick={() => setStrikes(n === strikes ? n - 1 : n)} className={`w-5 h-5 rounded-full cursor-pointer transition-all ${strikes >= n ? 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]' : 'bg-slate-800'}`}></div>)}
                </div>
             </div>
           </div>
        </div>
        <div className="flex items-center space-x-4">
          <input value={opponent} onChange={e=>setOpponent(e.target.value)} placeholder="対戦相手" className="bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold w-40 outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="bg-slate-800 px-6 py-3 rounded-2xl flex items-center space-x-2">
             <span className="text-2xl font-black text-white">{inning}</span>
             <button onClick={() => setIsTop(!isTop)} className={`px-2 py-1 rounded-lg text-[10px] font-black ${isTop ? 'bg-indigo-600' : 'bg-emerald-600'}`}>{isTop ? '表' : '裏'}</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-6"><i className="fas fa-mound mr-2"></i> PITCHER</h4>
            <div className="space-y-6">
              <PlayerSelect id="pitcher" value={pitcherId} onChange={setPitcherId} label="投手" />
              <div className="grid grid-cols-2 gap-3">
                <select value={pitchType} onChange={e=>setPitchType(e.target.value as any)} className="bg-slate-50 p-3 rounded-xl font-bold border-none text-xs">
                  {['ストレート', 'スライダー', 'カット', 'カーブ', 'フォーク', 'チェンジアップ', 'シンカー', 'シュート', 'その他'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="number" value={speed} onChange={e=>setSpeed(e.target.value===''?'':Number(e.target.value))} placeholder="km/h" className="bg-slate-50 p-3 rounded-xl font-black border-none text-center outline-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">ZONE SELECTION</h4>
            <div className="aspect-square w-full max-w-md bg-slate-50 rounded-[3rem] p-8 border-4 border-slate-100 grid grid-cols-5 grid-rows-5 gap-2 relative">
               {Array.from({length: 25}).map((_, i) => {
                 const n = i+1;
                 const isZone = [7,8,9,12,13,14,17,18,19].includes(n);
                 return (
                   <button key={n} onClick={()=>setLocation(n)} className={`rounded-xl text-[10px] font-black transition-all ${location===n ? 'bg-indigo-600 text-white scale-125 shadow-2xl z-10' : isZone ? 'bg-white border-2 border-indigo-100 text-indigo-200' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}>
                     {n}
                   </button>
                 );
               })}
            </div>

            <div className="w-full mt-12 space-y-8">
               <div className="grid grid-cols-5 gap-3">
                  {(['見逃しS', '空振りS', 'ファウル', 'ボール', 'インプレー'] as const).map(res => (
                     <button key={res} onClick={() => { setPitchOutcome(res); if (res === 'インプレー') setDecision('Swing'); }} className={`py-5 rounded-2xl text-[10px] font-black transition-all border-2 ${pitchOutcome === res ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'}`}>
                       {res}
                     </button>
                  ))}
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-6"><i className="fas fa-bat mr-2"></i> BATTER</h4>
            <div className="space-y-6">
              <PlayerSelect id="batter" value={batterId} onChange={setBatterId} label="打者" />
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={()=>setIsHardHit(!isHardHit)} className={`py-4 rounded-xl text-[10px] font-black border transition-all ${isHardHit ? 'bg-orange-500 text-white shadow-lg border-orange-400' : 'bg-white text-slate-400 border-slate-100'}`}>強打</button>
                 <button onClick={()=>setIsSweetSpot(!isSweetSpot)} className={`py-4 rounded-xl text-[10px] font-black border transition-all ${isSweetSpot ? 'bg-emerald-500 text-white shadow-lg border-emerald-400' : 'bg-white text-slate-400 border-slate-100'}`}>芯</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RESULT PANEL with VISUAL TRAJECTORY DIAGRAM */}
      {isInPlayMode && (
        <div className="bg-white p-10 rounded-[4rem] border-2 border-indigo-600 shadow-[0_30px_80px_rgba(79,70,229,0.2)] animate-scale-in space-y-10">
          <div className="flex items-center justify-between border-b pb-6">
             <h3 className="text-2xl font-black italic tracking-tighter text-indigo-600">IN-PLAY RESULT DETAILS</h3>
             <div className="flex space-x-2">
               <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">Trajectory Simulator Active</span>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Diagram Column */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center space-y-6">
               <div className="w-full aspect-[4/3] bg-slate-50 rounded-[2rem] border-2 border-slate-100 relative overflow-hidden p-4">
                  <svg viewBox="0 0 100 60" className="w-full h-full drop-shadow-lg">
                    {/* Ground line */}
                    <line x1="10" y1="55" x2="90" y2="55" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                    {/* Trajectory Arc */}
                    <path 
                      d={`M 10 55 Q 50 ${55 - (battedAngle * 1.5)} 90 ${battedAngle > 0 ? 55 - (battedAngle * 0.8) : 55}`} 
                      fill="none" 
                      stroke={getTrajectoryColor(battedAngle)} 
                      strokeWidth="3" 
                      strokeDasharray="2 2"
                      className="transition-all duration-300"
                    />
                    {/* Ball Indicator */}
                    <circle 
                      cx="50" 
                      cy={55 - (battedAngle * 0.75)} 
                      r="2.5" 
                      fill={getTrajectoryColor(battedAngle)}
                      className="transition-all duration-300"
                    />
                    {/* Start Point */}
                    <circle cx="10" cy="55" r="3" fill="#64748b" />
                    {/* Labels */}
                    <text x="50" y="58" textAnchor="middle" fontSize="4" fontWeight="bold" fill="#94a3b8">FIELD SURFACE</text>
                  </svg>
               </div>
               <div className="text-center">
                 <span className="text-4xl font-black italic text-slate-900">{battedAngle}°</span>
                 <span className="block text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: getTrajectoryColor(battedAngle) }}>
                   {getAngleCategory(battedAngle)}
                 </span>
               </div>
            </div>

            {/* Inputs Column */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">打席結果</label>
                    <select value={paResult} onChange={e=>setPaResult(e.target.value as any)} className="w-full p-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm appearance-none outline-none focus:ring-4 focus:ring-indigo-300 transition-all">
                        <option value="進行中">--- 選択 ---</option>
                        <optgroup label="ヒット">
                          <option value="単打">単打</option><option value="二塁打">二塁打</option><option value="三塁打">三塁打</option><option value="本塁打">本塁打</option>
                        </optgroup>
                        <optgroup label="アウト">
                          <option value="内野凡打">内野凡打</option><option value="外野フライ">外野フライ</option><option value="ライナー">ライナー</option><option value="ポップフライ">ポップフライ</option><option value="併殺打">併殺打</option><option value="三振(空振り)">三振(空振り)</option><option value="三振(見逃し)">三振(見逃し)</option>
                        </optgroup>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">打球角度調整</label>
                    <input type="range" min="-30" max="80" value={battedAngle} onChange={e=>setBattedAngle(Number(e.target.value))} className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    <div className="grid grid-cols-5 gap-2">
                       {[-10, 5, 15, 30, 60].map(deg => (
                         <button key={deg} onClick={()=>setBattedAngle(deg)} className="py-2 bg-slate-50 rounded-lg text-[10px] font-black hover:bg-slate-100">{deg}°</button>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">打点 (RBI)</label>
                      <div className="flex items-center bg-slate-50 p-2 rounded-2xl justify-between border border-slate-100">
                        <button onClick={()=>setRbi(Math.max(0, rbi-1))} className="w-10 h-10 bg-white rounded-xl shadow-sm"><i className="fas fa-minus text-slate-400"></i></button>
                        <span className="text-xl font-black text-indigo-600">{rbi}</span>
                        <button onClick={()=>setRbi(rbi+1)} className="w-10 h-10 bg-white rounded-xl shadow-sm"><i className="fas fa-plus text-slate-400"></i></button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">貢献度</label>
                      <button onClick={()=>setIsAdvancement(!isAdvancement)} className={`w-full py-5 rounded-2xl text-[10px] font-black border-2 transition-all ${isAdvancement ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                        {isAdvancement ? 'QUALITY' : 'NORMAL'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">打球方向・深度</label>
                     <div className="grid grid-cols-5 gap-1 mb-2">
                        {(['左', '左中', '中', '右中', '右'] as const).map(d => (
                          <button key={d} onClick={()=>setDirection(d)} className={`py-3 text-[8px] font-black rounded-xl transition-all ${direction === d ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-400'}`}>{d}</button>
                        ))}
                     </div>
                     <div className="grid grid-cols-5 gap-1">
                        {(['極浅', '浅い', '普通', '深い', '極深'] as const).map(d => (
                          <button key={d} onClick={()=>setBallDepth(d)} className={`py-3 text-[8px] font-black rounded-xl transition-all ${ballDepth === d ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-400'}`}>{d}</button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION AREA */}
      <div className="fixed bottom-36 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-[65]">
        <button onClick={handleSubmit} className="w-full py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl shadow-[0_25px_60px_rgba(79,70,229,0.4)] hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center space-x-6 border-b-8 border-indigo-800">
          <i className="fas fa-save text-white"></i>
          <span>{isInPlayMode ? '打席完了を保存' : 'この1球を記録'}</span>
        </button>
      </div>

      <style>{`
        .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};
