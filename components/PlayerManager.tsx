
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase-config';
import { Player, Team } from '../types';

export const PlayerManager: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Team Form fields
  const [teamName, setTeamName] = useState('');
  const [teamAbbr, setTeamAbbr] = useState('');
  const [teamColor, setTeamColor] = useState('#4f46e5');

  // Player Form fields
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [throwing, setThrowing] = useState<'右' | '左'>('右');
  const [batting, setBatting] = useState<'右' | '左' | '両'>('右');
  const [position, setPosition] = useState('');

  useEffect(() => {
    const qTeams = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
    const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
      const teamData: Team[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamData);
      if (teamData.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teamData[0].id);
      }
    });

    const qPlayers = query(collection(db, 'players'), orderBy('number', 'asc'));
    const unsubscribePlayers = onSnapshot(qPlayers, (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    });

    return () => { unsubscribeTeams(); unsubscribePlayers(); };
  }, []);

  const handleOpenAddTeam = () => {
    setEditingTeam(null); setTeamName(''); setTeamAbbr(''); setTeamColor('#4f46e5');
    setIsTeamModalOpen(true);
  };

  const handleOpenAddPlayer = () => {
    if (!selectedTeamId) return alert("先にチームを選択してください");
    setEditingPlayer(null); setPlayerName(''); setPlayerNumber(''); setPosition('');
    setIsPlayerModalOpen(true);
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: teamName, abbreviation: teamAbbr, color: teamColor, updatedAt: serverTimestamp() };
    if (editingTeam) await updateDoc(doc(db, 'teams', editingTeam.id), data);
    else await addDoc(collection(db, 'teams'), { ...data, createdAt: serverTimestamp() });
    setIsTeamModalOpen(false);
  };

  const handlePlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    const data = { 
      teamId: selectedTeamId, name: playerName, number: playerNumber, 
      throwing, batting, position, updatedAt: serverTimestamp() 
    };
    if (editingPlayer) await updateDoc(doc(db, 'players', editingPlayer.id), data);
    else await addDoc(collection(db, 'players'), { ...data, createdAt: serverTimestamp() });
    setIsPlayerModalOpen(false);
  };

  const filteredPlayers = players.filter(p => p.teamId === selectedTeamId);
  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[70vh]">
      {/* Sidebar: Teams List */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden h-full">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Teams</h3>
             <button onClick={handleOpenAddTeam} className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-lg shadow-indigo-100"><i className="fas fa-plus"></i></button>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
            {teams.map(team => (
              <button 
                key={team.id} 
                onClick={() => setSelectedTeamId(team.id)}
                className={`w-full text-left p-4 rounded-2xl transition-all group flex items-center justify-between ${selectedTeamId === team.id ? 'bg-indigo-600 text-white shadow-xl' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs border border-white/10">
                    {team.abbreviation || team.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-black text-sm block">{team.name}</span>
                    <span className={`text-[8px] uppercase font-bold ${selectedTeamId === team.id ? 'text-indigo-200' : 'text-slate-400'}`}>Coach: {team.coach || '未設定'}</span>
                  </div>
                </div>
                <div onClick={(e) => { e.stopPropagation(); setEditingTeam(team); setTeamName(team.name); setTeamAbbr(team.abbreviation); setTeamColor(team.color || '#4f46e5'); setIsTeamModalOpen(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-black/5 rounded-lg">
                  <i className="fas fa-cog text-xs"></i>
                </div>
              </button>
            ))}
            {teams.length === 0 && <p className="text-center py-10 text-xs font-bold text-slate-300">チームが登録されていません</p>}
          </div>
        </div>
      </div>

      {/* Main Content: Players List (Roster) */}
      <div className="lg:col-span-9 space-y-6">
        {selectedTeamId ? (
          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col h-full">
            <div className="p-10 border-b border-slate-50 flex flex-wrap items-center justify-between gap-6 bg-slate-50/30">
               <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-2xl">
                    {selectedTeam?.abbreviation || selectedTeam?.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">{selectedTeam?.name}</h2>
                    <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">{filteredPlayers.length} Active Rosters</p>
                  </div>
               </div>
               <button 
                 onClick={handleOpenAddPlayer}
                 className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center"
               >
                 <i className="fas fa-plus mr-3 text-xs"></i> 選手を追加
               </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                    <th className="px-10 py-6 text-center">#</th>
                    <th className="px-10 py-6">選手名</th>
                    <th className="px-10 py-6">ポジション</th>
                    <th className="px-10 py-6">投 / 打</th>
                    <th className="px-10 py-6 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-10 py-24 text-center text-slate-300 font-black uppercase tracking-widest opacity-40">
                         選手が登録されていません
                      </td>
                    </tr>
                  ) : (
                    filteredPlayers.map(player => (
                      <tr key={player.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-5 text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-600 font-black text-sm">
                            {player.number}
                          </span>
                        </td>
                        <td className="px-10 py-5 font-black text-slate-900">{player.name}</td>
                        <td className="px-10 py-5">
                          <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black border border-indigo-100 uppercase">
                            {player.position}
                          </span>
                        </td>
                        <td className="px-10 py-5">
                          <div className="flex items-center space-x-3 text-slate-500 text-xs font-black">
                             <span className={player.throwing === '右' ? 'text-blue-500' : 'text-red-500'}>{player.throwing}投</span>
                             <span className="text-slate-200">/</span>
                             <span className={player.batting === '右' ? 'text-blue-500' : player.batting === '左' ? 'text-red-500' : 'text-purple-500'}>{player.batting}打</span>
                          </div>
                        </td>
                        <td className="px-10 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex justify-end space-x-2">
                             <button onClick={() => { setEditingPlayer(player); setPlayerName(player.name); setPlayerNumber(player.number); setPosition(player.position); setThrowing(player.throwing); setBatting(player.batting); setIsPlayerModalOpen(true); }} className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 flex items-center justify-center transition-all"><i className="fas fa-edit"></i></button>
                             <button onClick={async () => { if(window.confirm("削除しますか？")) await deleteDoc(doc(db, 'players', player.id)); }} className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-red-600 hover:border-red-100 flex items-center justify-center transition-all"><i className="fas fa-trash-alt"></i></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="h-full bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center p-20 text-center">
             <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 text-4xl mb-6">
                <i className="fas fa-users-viewfinder"></i>
             </div>
             <h3 className="text-2xl font-black text-slate-300 uppercase tracking-widest">Select a team to manage rosters</h3>
             <p className="text-slate-200 font-bold mt-2">左側のリストからチームを選択してください</p>
          </div>
        )}
      </div>

      {/* Team Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-scale-in">
             <div className="p-10 space-y-8">
                <div className="flex justify-between items-center">
                   <h4 className="text-2xl font-black">{editingTeam ? 'チーム編集' : 'チーム新規作成'}</h4>
                   <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-300 hover:text-slate-600 transition-colors"><i className="fas fa-times text-xl"></i></button>
                </div>
                <form onSubmit={handleTeamSubmit} className="space-y-6">
                   <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">略称</label>
                        <input value={teamAbbr} onChange={e=>setTeamAbbr(e.target.value)} maxLength={3} placeholder="ABC" className="w-full p-4 bg-slate-50 rounded-2xl font-black text-center" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">チーム名</label>
                        <input value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="チーム名を入力" className="w-full p-4 bg-slate-50 rounded-2xl font-black" required />
                      </div>
                   </div>
                   <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl">保存する</button>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* Player Modal */}
      {isPlayerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
             <div className="bg-slate-900 p-10 text-white">
                <h4 className="text-2xl font-black">{editingPlayer ? '選手データ修正' : '新入団選手の登録'}</h4>
                <p className="text-slate-500 font-bold text-xs mt-1">FOR {selectedTeam?.name}</p>
             </div>
             <form onSubmit={handlePlayerSubmit} className="p-10 space-y-8">
                <div className="grid grid-cols-4 gap-4">
                   <div className="col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">#背番号</label>
                      <input value={playerNumber} onChange={e=>setPlayerNumber(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-center text-xl" required />
                   </div>
                   <div className="col-span-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">選手氏名</label>
                      <input value={playerName} onChange={e=>setPlayerName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black" required />
                   </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">ポジション</label>
                  <select value={position} onChange={e=>setPosition(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black appearance-none border-none outline-none">
                    <option value="">選択してください</option>
                    {['投手', '捕手', '一塁手', '二塁手', '三塁手', '遊撃手', '左翼手', '中堅手', '右翼手', '指名打者'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 p-1.5 rounded-2xl flex">
                      {['右', '左'].map(t => <button key={t} type="button" onClick={()=>setThrowing(t as any)} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${throwing===t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{t}投</button>)}
                   </div>
                   <div className="bg-slate-50 p-1.5 rounded-2xl flex">
                      {['右', '左', '両'].map(b => <button key={b} type="button" onClick={()=>setBatting(b as any)} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${batting===b ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{b}打</button>)}
                   </div>
                </div>
                <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-2xl">ROSTER IN</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
