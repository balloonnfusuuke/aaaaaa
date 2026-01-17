
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';
import { BatterRecord, Player, PAResult, GameSituation } from '../types';

export const BatterLogManager: React.FC = () => {
  const [logs, setLogs] = useState<BatterRecord[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingLog, setEditingLog] = useState<BatterRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    onSnapshot(collection(db, 'players'), (snap) => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Player))));
    const q = query(collection(db, 'batter_logs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as BatterRecord))));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !editingLog.id) return;
    try {
      const { id, ...data } = editingLog;
      await updateDoc(doc(db, 'batter_logs', id), { ...data, updatedAt: serverTimestamp() });
      setIsModalOpen(false);
    } catch (err) { alert("更新失敗"); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("この野手データを削除しますか？")) {
      await deleteDoc(doc(db, 'batter_logs', id));
    }
  };

  const playersMap = players.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>);

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black"><i className="fas fa-list-check mr-3 text-emerald-600"></i> 野手ログ・詳細分析</h3>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Full Performance Audit</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
            <tr>
              <th className="px-6 py-5">打者 / 試合</th>
              <th className="px-6 py-5">球数 / 投球</th>
              <th className="px-6 py-5">打球詳細</th>
              <th className="px-6 py-5">意思 / 反応</th>
              <th className="px-6 py-5">打席結果</th>
              <th className="px-6 py-5">隠れ価値</th>
              <th className="px-6 py-5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-50">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-emerald-50/20 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{playersMap[log.batterId] || log.batterId}</div>
                  <div className="text-[10px] text-gray-400 font-medium">vs {log.opponent} ({log.date})</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-indigo-600">{log.totalPitchesSeen}球</div>
                  <div className="text-[10px] text-gray-400">{log.pitchType} ({log.speed}k)</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-1">
                      {log.isHardHit && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[8px] font-black">HARD</span>}
                      {log.isSweetSpot && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[8px] font-black">SWEET</span>}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">{log.direction}{log.ballLocation} ({log.ballDepth})</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-[10px] font-black uppercase text-slate-400">{log.decision}</div>
                  <div className="text-[10px] font-bold text-indigo-400">{log.reaction}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-black ${['単打', '二塁打', '三塁打', '本塁打'].includes(log.paResult) ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {log.paResult}
                  </span>
                  {log.rbi > 0 && <span className="ml-2 text-[10px] font-black bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">{log.rbi}打点</span>}
                </td>
                <td className="px-6 py-4">
                   <div className="flex space-x-2">
                     {log.isQualityOut && <i className="fas fa-award text-amber-400" title="Quality Out"></i>}
                     {log.forcedCloserPitches && <i className="fas fa-battery-quarter text-red-400" title="Pitcher Impact"></i>}
                   </div>
                </td>
                <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => {setEditingLog(log); setIsModalOpen(true);}} className="p-2 text-slate-400 hover:text-indigo-600"><i className="fas fa-edit"></i></button>
                  <button onClick={() => handleDelete(log.id!)} className="p-2 text-slate-400 hover:text-red-600"><i className="fas fa-trash-alt"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && editingLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-10 shadow-2xl">
            <h4 className="text-2xl font-black mb-8 border-b border-slate-100 pb-6 flex items-center">
               <i className="fas fa-pen-to-square mr-4 text-emerald-500"></i> 打撃詳細データ修正
            </h4>
            <form onSubmit={handleUpdate} className="grid grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">打席結果</label>
                    <select value={editingLog.paResult} onChange={e => setEditingLog({...editingLog, paResult: e.target.value as any})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none">
                      {['単打', '二塁打', '三塁打', '本塁打', '凡打(アウト)', '三振(空振り)', '三振(見逃し)', '併殺打', '四球', '死球', '犠打', '犠飛'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">打点</label>
                      <input type="number" value={editingLog.rbi} onChange={e => setEditingLog({...editingLog, rbi: Number(e.target.value)})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">投げさせた球数</label>
                      <input type="number" value={editingLog.totalPitchesSeen} onChange={e => setEditingLog({...editingLog, totalPitchesSeen: Number(e.target.value)})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">打球方向・深度</label>
                    <div className="grid grid-cols-2 gap-4">
                      <select value={editingLog.direction} onChange={e => setEditingLog({...editingLog, direction: e.target.value as any})} className="bg-slate-50 p-4 rounded-2xl font-bold border-none">
                        {['左', '左中', '中', '右中', '右'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={editingLog.ballDepth} onChange={e => setEditingLog({...editingLog, ballDepth: e.target.value as any})} className="bg-slate-50 p-4 rounded-2xl font-bold border-none">
                        {['極浅', '浅い', '普通', '深い', '極深'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <button type="button" onClick={() => setEditingLog({...editingLog, isHardHit: !editingLog.isHardHit})} className={`flex-1 py-3 rounded-xl text-xs font-black border ${editingLog.isHardHit ? 'bg-orange-500 text-white' : 'bg-white'}`}>Hard Hit</button>
                    <button type="button" onClick={() => setEditingLog({...editingLog, isQualityOut: !editingLog.isQualityOut})} className={`flex-1 py-3 rounded-xl text-xs font-black border ${editingLog.isQualityOut ? 'bg-indigo-600 text-white' : 'bg-white'}`}>Quality Out</button>
                  </div>
               </div>

               <div className="col-span-2 pt-10 border-t border-slate-100 flex space-x-4">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-[1.5rem] font-bold">キャンセル</button>
                 <button type="submit" className="flex-2 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-2xl shadow-indigo-100">更新内容を保存</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
