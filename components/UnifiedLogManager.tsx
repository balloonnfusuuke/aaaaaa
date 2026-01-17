
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';
import { UnifiedRecord, Player } from '../types';

export const UnifiedLogManager: React.FC = () => {
  const [logs, setLogs] = useState<UnifiedRecord[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    onSnapshot(collection(db, 'players'), (snap) => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Player))));
    const q = query(collection(db, 'unified_logs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as UnifiedRecord))));
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("この詳細データを削除しますか？")) {
      await deleteDoc(doc(db, 'unified_logs', id));
    }
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-10 border-b bg-slate-50/50 flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black tracking-tighter uppercase">データ監査・詳細ログ</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">1球ごとの詳細シーケンシャルデータ</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b">
            <tr>
              <th className="px-8 py-6">状況 / カウント</th>
              <th className="px-8 py-6">投手詳細</th>
              <th className="px-8 py-6">打者・反応</th>
              <th className="px-8 py-6">結果 / 価値</th>
              <th className="px-8 py-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-50">
            {logs.length === 0 ? (
               <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest">ログが見つかりません</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                   <div className="font-black text-slate-900">{log.inning}回{log.isTop?'表':'裏'} vs {log.opponent}</div>
                   <div className="text-[10px] text-slate-400 font-bold mt-1">
                     {log.balls}B - {log.strikes}S / {log.outs} OUT
                   </div>
                </td>
                <td className="px-8 py-6">
                  <div className="font-bold text-indigo-600">P: {log.pitcherName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{log.pitchType} ({log.speed}km)</div>
                  <div className={`text-[10px] font-black mt-1 ${log.isPitchMiss ? 'text-red-500' : 'text-slate-300'}`}>コース: #{log.location}</div>
                </td>
                <td className="px-8 py-6">
                  <div className="font-bold text-emerald-600">B: {log.batterName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{log.decision} / {log.reaction}</div>
                  <div className="flex space-x-1 mt-1">
                    {log.isHardHit && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[8px] font-black uppercase">強打</span>}
                    {log.isSweetSpot && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[8px] font-black uppercase">芯</span>}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className={`font-black text-lg tracking-tight ${log.paResult === '進行中' ? 'text-slate-300' : 'text-slate-900'}`}>
                    {log.pitchOutcome === 'インプレー' ? log.paResult : log.pitchOutcome}
                  </div>
                  {log.paResult !== '進行中' && log.pitchOutcome === 'インプレー' && (
                    <div className="text-[10px] text-slate-400 font-bold">
                      {log.hitDirection} {log.launchAngle} / {log.ballDepth}
                      {log.rbi > 0 && <span className="ml-2 text-red-500">{log.rbi} 打点</span>}
                    </div>
                  )}
                </td>
                <td className="px-8 py-6 text-right">
                   <button onClick={()=>handleDelete(log.id!)} className="w-10 h-10 rounded-xl text-slate-300 hover:text-red-500 hover:bg-white hover:shadow-sm transition-all"><i className="fas fa-trash-alt"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
