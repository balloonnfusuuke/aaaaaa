
import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';
import { Player, Team, UnifiedRecord, PitchType, RunnerState, GameSituation, SwingDecision, LaunchAngle, HitDirection, BattedBallDepth, PAResult } from '../types';

export const UnifiedEntry: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [toast, setToast] = useState<{ message: string; show: boolean; type: 'success' | 'ending' }>({ message: '', show: false, type: 'success' });
  const [showInPlayModal, setShowInPlayModal] = useState(false);

  // ゲーム基本設定
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [myTeamId, setMyTeamId] = useState('');
  const [opponentId, setOpponentId] = useState('');
  const [isHome, setIsHome] = useState(true);

  // 試合状況
  const [inning, setInning] = useState(1);
  const [isTop, setIsTop] = useState(true);
  const [outs, setOuts] = useState(0);
  const [runners, setRunners] = useState<RunnerState>({ first: false, second: false, third: false });
  const [balls, setBalls] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [situation, setSituation] = useState<GameSituation>('接戦');

  // アクター・データ
  const [pitcherId, setPitcherId] = useState('');
  const [batterId, setBatterId] = useState('');
  const [atBatPitches, setAtBatPitches] = useState(1);
  const [pitchType, setPitchType] = useState<PitchType>('ストレート');
  const [speed, setSpeed] = useState<number | ''>('');
  const [location, setLocation] = useState(13);
  const [pitchOutcome, setPitchOutcome] = useState<UnifiedRecord['pitchOutcome']>('見逃しS');
  const [isHardHit, setIsHardHit] = useState(false);
  const [isSweetSpot, setIsSweetSpot] = useState(false);

  // 打席完了詳細
  const [paResult, setPaResult] = useState<PAResult>('進行中');
  const [battedAngle, setBattedAngle] = useState(10);
  const [direction, setDirection] = useState<HitDirection>('中');
  const [rbi, setRbi] = useState(0);
  const [isAdvancement, setIsAdvancement] = useState(false);

  useEffect(() => {
    onSnapshot(collection(db, 'teams'), (snap) => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team))));
    onSnapshot(collection(db, 'players'), (snap) => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Player))));
  }, []);

  const getAttackingTeamId = () => isHome ? (isTop ? opponentId : myTeamId) : (isTop ? myTeamId : opponentId);
  const getDefendingTeamId = () => isHome ? (isTop ? myTeamId : opponentId) : (isTop ? opponentId : myTeamId);
  const attackingTeamName = teams.find(t => t.id === getAttackingTeamId())?.name || '---';

  const showSuccessToast = (message: string, isEnding: boolean) => {
    setToast({ message, show: true, type: isEnding ? 'ending' : 'success' });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2000);
  };

  const handleSubmit = async () => {
    if (!pitcherId || !batterId || !myTeamId || !opponentId) return alert("入力が不完全です");
    const ending = (pitchOutcome === 'インプレー') || (pitchOutcome === 'ボール' && balls === 3) || (['見逃しS', '空振りS'].includes(pitchOutcome) && strikes === 2);
    const finalPA = pitchOutcome === 'インプレー' ? paResult : (pitchOutcome === 'ボール' && balls === 3 ? '四球' : (pitchOutcome === '見逃しS' && strikes === 2 ? '三振(見逃し)' : (pitchOutcome === '空振りS' && strikes === 2 ? '三振(空振り)' : '進行中')));

    try {
      await addDoc(collection(db, 'unified_logs'), {
        date, inning, isTop, outs, runners, balls, strikes, gameSituation: situation,
        pitcherId, pitcherName: players.find(p=>p.id===pitcherId)?.name || '',
        pitchType, speed: speed === '' ? null : Number(speed), location, pitchOutcome,
        batterId, batterName: players.find(p=>p.id===batterId)?.name || '',
        isHardHit, isSweetSpot, pitchesSeenInATBat: atBatPitches, paResult: finalPA,
        launchAngle: battedAngle < 10 ? 'ゴロ' : (battedAngle < 25 ? 'ライナー' : 'フライ'),
        battedAngle, hitDirection: direction, rbi, isQualityOut: isAdvancement,
        createdAt: serverTimestamp()
      });

      if (!ending) {
        setAtBatPitches(prev => prev + 1);
        if (pitchOutcome === 'ボール') setBalls(balls + 1);
        if (['見逃しS', '空振りS', 'ファウル'].includes(pitchOutcome)) if (strikes < 2) setStrikes(strikes + 1);
        showSuccessToast(`${atBatPitches}球目 保存`, false);
      } else {
        let nOuts = outs + (['三振(空振り)', '三振(見逃し)', '内野凡打', '外野フライ', 'ライナー', 'ポップフライ', '犠飛', '犠打'].includes(finalPA) ? 1 : (finalPA === '併殺打' ? 2 : 0));
        if (nOuts >= 3) { setOuts(0); setRunners({first:false,second:false,third:false}); if (isTop) setIsTop(false); else {setIsTop(true); setInning(i=>i+1);} setPitcherId(''); }
        else setOuts(nOuts);
        setBatterId(''); setAtBatPitches(1); setBalls(0); setStrikes(0); setPitchOutcome('見逃しS'); setPaResult('進行中'); setRbi(0); setShowInPlayModal(false);
        showSuccessToast(finalPA, true);
      }
      setSpeed('');
    } catch (e) { alert("保存失敗"); }
  };

  const PlayerSelect = ({ value, onChange, teamId, role }: { value: string, onChange: (v: string) => void, teamId: string | null, role: 'P' | 'B' }) => {
    const tp = players.filter(p => p.teamId === teamId);
    return (
      <select value={value} onChange={e=>onChange(e.target.value)} className="w-full bg-slate-100 p-2 rounded-xl font-black text-xs border-none outline-none appearance-none text-slate-700">
        <option value="">{role}選択</option>
        {tp.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
      </select>
    );
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-3 overflow-hidden animate-fade-in relative">
      {/* Toast */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[150] transition-all duration-300 ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 border ${toast.type === 'ending' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-white border-slate-800'}`}>
          <i className={`fas ${toast.type === 'ending' ? 'fa-check-double' : 'fa-check'} text-xs`}></i>
          <span className="font-black text-xs tracking-tight uppercase">{toast.message}</span>
        </div>
      </div>

      {/* 1. Compact Header (Config) */}
      <div className="bg-white px-6 py-2 rounded-2xl border flex items-center justify-between text-[10px] font-black shrink-0 shadow-sm">
        <div className="flex items-center space-x-4">
          <select value={myTeamId} onChange={e=>setMyTeamId(e.target.value)} className="bg-transparent border-none p-0 focus:ring-0">
            <option value="">自チーム</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <span className="text-slate-300">VS</span>
          <select value={opponentId} onChange={e=>setOpponentId(e.target.value)} className="bg-transparent border-none p-0 focus:ring-0">
            <option value="">対戦相手</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={()=>setIsHome(!isHome)} className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">{isHome?'Home':'Visitor'}</button>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="bg-transparent border-none p-0 focus:ring-0" />
        </div>
      </div>

      {/* 2. Unified Status & Actor Bar */}
      <div className="bg-slate-900 rounded-[2rem] p-4 flex items-center justify-between shrink-0 shadow-xl border-b-4 border-slate-950">
        <div className="flex items-center space-x-4">
          <div className="bg-slate-800 px-4 py-2 rounded-xl text-center min-w-[60px]">
            <span className="block text-[8px] text-slate-500 font-black uppercase">Inning</span>
            <span className="text-xl font-black text-white">{inning}<span className="text-[10px] ml-1">{isTop?'表':'裏'}</span></span>
          </div>
          <div className="flex space-x-1">
            {[1, 2].map(n => <div key={n} onClick={()=>setOuts(n===outs?n-1:n)} className={`w-4 h-4 rounded-full border-2 cursor-pointer ${outs>=n?'bg-red-500 border-red-400':'border-slate-700'}`}></div>)}
          </div>
        </div>

        <div className="flex-1 px-6 flex justify-center">
          <div className="bg-indigo-600 px-4 py-1.5 rounded-full shadow-lg">
             <span className="text-xs font-black italic text-white uppercase tracking-tighter">Attack: {attackingTeamName}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
           <div className="flex space-x-1"><span className="text-[10px] text-blue-400 font-black mr-1">B</span>{[1,2,3].map(n=><div key={n} onClick={()=>setBalls(n===balls?n-1:n)} className={`w-3.5 h-3.5 rounded-full ${balls>=n?'bg-blue-400 shadow-glow':'bg-slate-800'}`}></div>)}</div>
           <div className="flex space-x-1"><span className="text-[10px] text-yellow-400 font-black mr-1">S</span>{[1,2].map(n=><div key={n} onClick={()=>setStrikes(n===strikes?n-1:n)} className={`w-3.5 h-3.5 rounded-full ${strikes>=n?'bg-yellow-400 shadow-glow':'bg-slate-800'}`}></div>)}</div>
        </div>
      </div>

      {/* 3. Input Zone Area (The Core) */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left: Pitcher Card */}
        <div className="col-span-3 flex flex-col space-y-2">
          <div className="bg-white p-3 rounded-2xl border flex-1 space-y-2 overflow-hidden">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Pitcher</span>
            <PlayerSelect value={pitcherId} onChange={setPitcherId} teamId={getDefendingTeamId()} role="P" />
            <select value={pitchType} onChange={e=>setPitchType(e.target.value as any)} className="w-full bg-slate-50 p-2 rounded-xl text-[10px] font-bold border-none">
              {['ストレート', 'スライダー', 'カット', 'カーブ', 'フォーク', 'チェンジアップ', 'その他'].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" value={speed} onChange={e=>setSpeed(e.target.value===''?'':Number(e.target.value))} placeholder="km/h" className="w-full bg-slate-900 text-white p-3 rounded-xl font-black text-center text-sm outline-none" />
          </div>
        </div>

        {/* Center: Strike Zone */}
        <div className="col-span-6 bg-white p-4 rounded-[2.5rem] border shadow-sm flex flex-col items-center justify-center min-h-0 overflow-hidden">
           <div className="aspect-square w-full max-w-[280px] bg-slate-50 rounded-[2rem] p-4 border-4 border-slate-100 grid grid-cols-5 grid-rows-5 gap-1.5 relative shrink-0">
              {Array.from({length:25}).map((_,i)=>{
                const n = i+1; const isZ = [7,8,9,12,13,14,17,18,19].includes(n);
                return <button key={n} onClick={()=>setLocation(n)} className={`rounded-lg text-[8px] font-black transition-all ${location===n?'bg-indigo-600 text-white scale-110 shadow-lg z-10':isZ?'bg-white border-2 border-indigo-100 text-indigo-200':'bg-slate-100 text-slate-300'}`}>{n}</button>
              })}
           </div>
        </div>

        {/* Right: Batter Card */}
        <div className="col-span-3 flex flex-col space-y-2">
          <div className="bg-white p-3 rounded-2xl border flex-1 space-y-2 overflow-hidden">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Batter</span>
            <PlayerSelect value={batterId} onChange={setBatterId} teamId={getAttackingTeamId()} role="B" />
            <div className="grid grid-cols-1 gap-1.5 mt-2">
               <button onClick={()=>setIsHardHit(!isHardHit)} className={`py-2 rounded-xl text-[8px] font-black border transition-all ${isHardHit?'bg-orange-500 text-white border-orange-400 shadow-sm':'bg-slate-50 text-slate-400'}`}>HARD HIT</button>
               <button onClick={()=>setIsSweetSpot(!isSweetSpot)} className={`py-2 rounded-xl text-[8px] font-black border transition-all ${isSweetSpot?'bg-emerald-500 text-white border-emerald-400 shadow-sm':'bg-slate-50 text-slate-400'}`}>SWEET SPOT</button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Action Buttons (Compact Bottom) */}
      <div className="shrink-0 space-y-3 pb-2">
        <div className="grid grid-cols-5 gap-2">
          {(['見逃しS', '空振りS', 'ファウル', 'ボール'] as const).map(res => (
             <button key={res} onClick={()=>setPitchOutcome(res)} className={`py-4 rounded-xl text-[10px] font-black border-2 transition-all ${pitchOutcome===res?'bg-slate-900 text-white border-slate-900 shadow-lg': 'bg-white text-slate-400 border-slate-100'}`}>
               {res}
             </button>
          ))}
          <button onClick={()=>{ setPitchOutcome('インプレー'); setPaResult('内野凡打'); setShowInPlayModal(true); }} className="py-4 rounded-xl text-[10px] font-black border-2 bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100">
            IN-PLAY
          </button>
        </div>

        <button onClick={handleSubmit} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-[0_15px_40px_rgba(79,70,229,0.3)] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center space-x-3 border-b-4 border-indigo-800">
          <i className="fas fa-save text-sm"></i>
          <span className="uppercase tracking-tighter">
            {pitchOutcome==='ボール'&&balls===3?'Four-Ball' : ['見逃しS','空振りS'].includes(pitchOutcome)&&strikes===2?'Strike-Out' : 'Record Pitch'}
          </span>
        </button>
      </div>

      {/* Modal - InPlay (Remains as is, but ensuring it's efficient) */}
      {showInPlayModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-scale-in">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b flex justify-between items-center bg-indigo-600 text-white">
               <h3 className="text-2xl font-black italic tracking-tighter uppercase">In-Play Detail</h3>
               <button onClick={()=>{setShowInPlayModal(false); setPitchOutcome('見逃しS');}} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-8 overflow-y-auto grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase">RESULT</label>
                <div className="grid grid-cols-2 gap-2">
                  {['単打', '二塁打', '三塁打', '本塁打', '内野凡打', '外野フライ', 'ライナー', 'ポップフライ', '併殺打', '犠飛', '犠打'].map(res => (
                    <button key={res} onClick={()=>setPaResult(res as PAResult)} className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all ${paResult===res?'bg-slate-900 text-white border-slate-900':'bg-slate-50 text-slate-400 border-slate-100'}`}>{res}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">DIRECTION</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['左', '左中', '中', '右中', '右'].map(d => (
                      <button key={d} onClick={()=>setDirection(d as any)} className={`py-3 text-[10px] font-black rounded-xl border-2 ${direction===d?'bg-emerald-600 text-white border-emerald-500':'bg-slate-50 text-slate-400 border-slate-100'}`}>{d}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">RBI</label>
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                       <button onClick={()=>setRbi(Math.max(0,rbi-1))} className="w-8 h-8 bg-white rounded-lg shadow-sm"><i className="fas fa-minus text-[10px]"></i></button>
                       <span className="text-xl font-black text-indigo-600">{rbi}</span>
                       <button onClick={()=>setRbi(rbi+1)} className="w-8 h-8 bg-white rounded-lg shadow-sm"><i className="fas fa-plus text-[10px]"></i></button>
                    </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    <button onClick={()=>setIsAdvancement(!isAdvancement)} className={`w-full py-4 rounded-xl text-[10px] font-black border-2 ${isAdvancement?'bg-emerald-600 text-white border-emerald-500':'bg-slate-50 text-slate-400 border-slate-100'}`}>QUALITY OUT</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t flex space-x-4">
               <button onClick={handleSubmit} className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-xl flex items-center justify-center space-x-4">
                  <i className="fas fa-save"></i>
                  <span>COMPLETE AT-BAT</span>
               </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .shadow-glow { box-shadow: 0 0 10px rgba(96, 165, 250, 0.5); }
        .animate-scale-in { animation: scaleIn 0.2s ease-out; }
        @keyframes scaleIn { from { transform: scale(0.98); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};
