
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase-config';
import { PitchRecord, PitchType, PitchOutcome, Player } from '../types';

export const PitchLogManager: React.FC = () => {
  const [logs, setLogs] = useState<PitchRecord[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingLog, setEditingLog] = useState<PitchRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'pitch_logs'), orderBy('createdAt', 'desc'));
    const unsubscribeLogs = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as PitchRecord)));
    });

    const unsubscribePlayers = onSnapshot(collection(db, 'players'), (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    });

    return () => {
      unsubscribeLogs();
      unsubscribePlayers();
    };
  }, []);

  const handleEdit = (log: PitchRecord) => {
    setEditingLog({ ...log });
    setIsModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !editingLog.id) return;

    try {
      const { id, ...data } = editingLog;
      await updateDoc(doc(db, 'pitch_logs', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setEditingLog(null);
    } catch (err) {
      console.error(err);
      alert("更新に失敗しました。");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("この投球データを削除してもよろしいですか？（この操作は取り消せません）")) {
      try {
        await deleteDoc(doc(db, 'pitch_logs', id));
      } catch (err) {
        console.error(err);
        alert("削除に失敗しました。");
      }
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-xl font-black text-gray-900 flex items-center tracking-tight">
            <i className="fas fa-list-check mr-3 text-indigo-600"></i> 投球ログ管理
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Pitch-by-Pitch History</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
              <th className="px-6 py-5 text-center">試合日</th>
              <th className="px-6 py-5">状況</th>
              <th className="px-6 py-5">バッテリー/打者</th>
              <th className="px-6 py-5">球種 / 速 / コース</th>
              <th className="px-6 py-5 text-center">結果</th>
              <th className="px-6 py-5 text-right">アクション</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-gray-300">
                  <i className="fas fa-database text-3xl mb-4 block opacity-20"></i>
                  投球ログがありません
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-6 py-4 text-center">
                    <span className="text-[10px] font-black text-gray-400 block">{log.date}</span>
                    <span className="text-[8px] font-bold text-gray-300">vs {log.opponent}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700">{log.inning}回{log.isTop ? '表' : '裏'}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{log.outs}アウト {log.balls}B-{log.strikes}S</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center text-xs">
                        <span className="w-4 h-4 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-black mr-1 text-[8px]">P</span>
                        <span className="font-bold">{log.pitcherName}</span>
                      </div>
                      <div className="flex items-center text-xs mt-1">
                        <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center font-black mr-1 text-[8px]">B</span>
                        <span className="font-bold">{log.batterName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black">{log.pitchType}</span>
                      <span className="font-mono font-black text-indigo-600">{log.speed || '--'} <span className="text-[8px] font-bold text-gray-300">km</span></span>
                      <span className="text-gray-300 text-[10px] font-black">#{log.location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black shadow-sm ${
                      ['ヒット', 'ホームラン'].includes(log.outcome) ? 'bg-emerald-500 text-white' : 
                      ['アウト', '空振り'].includes(log.outcome) ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {log.outcome}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleEdit(log)} className="w-10 h-10 inline-flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-indigo-100 transition-all">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button onClick={() => handleDelete(log.id!)} className="w-10 h-10 inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-red-100 transition-all">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-indigo-600 p-8 text-white flex justify-between items-center shrink-0">
              <div>
                <h4 className="text-xl font-black">投球データ修正</h4>
                <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mt-1">Editing Pitch Record ID: {editingLog.id?.slice(-6)}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"><i className="fas fa-times"></i></button>
            </div>

            <form onSubmit={handleUpdate} className="p-8 space-y-8 overflow-y-auto">
              {/* Situation Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">イニング</label>
                    <input type="number" value={editingLog.inning} onChange={e => setEditingLog({...editingLog, inning: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">アウト数</label>
                    <input type="number" value={editingLog.outs} min="0" max="2" onChange={e => setEditingLog({...editingLog, outs: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">ボール</label>
                    <input type="number" value={editingLog.balls} min="0" max="3" onChange={e => setEditingLog({...editingLog, balls: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">ストライク</label>
                    <input type="number" value={editingLog.strikes} min="0" max="2" onChange={e => setEditingLog({...editingLog, strikes: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold" />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Visual Location Picker */}
                <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase mb-4 block">コース修正 (25分割)</label>
                   <div className="aspect-square bg-slate-50 rounded-2xl p-2 border-2 border-slate-100 grid grid-cols-5 grid-rows-5 gap-1">
                      {Array.from({ length: 25 }).map((_, i) => {
                        const num = i + 1;
                        return (
                          <button key={num} type="button" onClick={() => setEditingLog({...editingLog, location: num})} className={`rounded-sm text-[8px] font-black transition-all ${editingLog.location === num ? 'bg-indigo-600 text-white scale-110 shadow-lg z-10' : 'bg-white text-gray-200 border border-slate-100 hover:bg-slate-50'}`}>
                            {num}
                          </button>
                        );
                      })}
                   </div>
                </div>

                <div className="space-y-6">
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">球種</label>
                      <select value={editingLog.pitchType} onChange={e => setEditingLog({...editingLog, pitchType: e.target.value as PitchType})} className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold">
                        {['ストレート', 'スライダー', 'カット', 'カーブ', 'フォーク', 'チェンジアップ', 'シンカー', 'シュート', 'その他'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">球速</label>
                      <input type="number" value={editingLog.speed || ''} onChange={e => setEditingLog({...editingLog, speed: e.target.value === '' ? null : Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-xl p-3 font-black text-xl text-center" placeholder="-- km/h" />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">結果</label>
                      <select value={editingLog.outcome} onChange={e => setEditingLog({...editingLog, outcome: e.target.value as PitchOutcome})} className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold">
                        {['ストライク', 'ボール', '空振り', 'ファウル', 'ヒット', 'アウト', 'ホームラン'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                   </div>
                </div>
              </div>

              {/* Subjective Analysis Fields */}
              <div className="pt-6 border-t border-gray-100 space-y-6">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center">
                   <i className="fas fa-brain mr-2"></i> 分析データ（主観）
                </h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">投球の意図</label>
                    <select 
                      value={editingLog.intent} 
                      onChange={e => setEditingLog({...editingLog, intent: e.target.value as any})} 
                      className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-sm"
                    >
                      <option value="ストライク">カウントを取りたい</option>
                      <option value="決め">勝負にいきたい</option>
                      <option value="釣り">誘いたい</option>
                      <option value="その他">その他</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">打者反応</label>
                    <select 
                      value={editingLog.batterReaction} 
                      onChange={e => setEditingLog({...editingLog, batterReaction: e.target.value as any})} 
                      className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-sm"
                    >
                      <option value="振り遅れ">振り遅れ</option>
                      <option value="差し込まれ">差し込まれ</option>
                      <option value="良反応">良反応</option>
                      <option value="見逃し">見逃し</option>
                      <option value="その他">その他</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">投球の成否</label>
                    <button 
                      type="button"
                      onClick={() => setEditingLog({...editingLog, isMiss: !editingLog.isMiss})}
                      className={`w-full py-3 rounded-xl text-sm font-black border transition-all ${editingLog.isMiss ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}
                    >
                      {editingLog.isMiss ? <><i className="fas fa-times-circle mr-2"></i> 投げミス</> : <><i className="fas fa-check-circle mr-2"></i> 狙い通り</>}
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">自己評価</label>
                    <div className="flex bg-slate-100 rounded-xl p-1">
                      {(['良い', '妥当', '悪い'] as const).map(v => (
                        <button 
                          key={v} 
                          type="button"
                          onClick={() => setEditingLog({...editingLog, evaluation: v})} 
                          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${editingLog.evaluation === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex space-x-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-gray-500 font-bold rounded-2xl hover:bg-slate-100 transition-colors">キャンセル</button>
                <button type="submit" className="flex-2 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                  変更内容を保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
