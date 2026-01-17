
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase-config';
import { UserRole, UserProfile } from './types';
import { PlayerManager } from './components/PlayerManager';
import { UnifiedEntry } from './components/UnifiedEntry';
import { UnifiedLogManager } from './components/UnifiedLogManager';
import { Leaderboard } from './components/Leaderboard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'players' | 'unified_entry' | 'unified_logs' | 'leaderboard'>('dashboard');
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      if (unsubscribeProfile) unsubscribeProfile();
      if (currentUser) {
        unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              role: 'user',
              createdAt: new Date()
            };
            setProfile(newProfile);
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => { unsubscribeAuth(); if (unsubscribeProfile) unsubscribeProfile(); };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (isSignUp) {
        if (password !== confirmPassword) throw new Error("パスワードが一致しません。");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          role: 'user',
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      let msg = "エラーが発生しました。";
      if (error.code === 'auth/invalid-credential') msg = "メールアドレスまたはパスワードが正しくありません。";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const isAdmin = profile?.role === 'admin';

  // ログイン後に管理権限がない場合、自動的に成績閲覧画面へ
  useEffect(() => {
    if (user && !loading && !isAdmin && currentView !== 'leaderboard') {
      setCurrentView('leaderboard');
    }
  }, [user, loading, isAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-indigo-600 animate-pulse uppercase tracking-widest">System Booting...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900">
        <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in">
          <div className="bg-indigo-600 p-12 text-center text-white relative">
            <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl backdrop-blur-md">
              <i className="fas fa-baseball"></i>
            </div>
            <h1 className="text-4xl font-black tracking-tighter mb-2 italic">ANALYSIS</h1>
            <p className="text-indigo-100 font-bold opacity-80">{isSignUp ? 'REGISTER' : 'LOG IN'}</p>
          </div>
          <form onSubmit={handleAuth} className="p-10 space-y-6">
            {authError && <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-black rounded-2xl flex items-center"><i className="fas fa-exclamation-circle mr-3"></i>{authError}</div>}
            <div className="space-y-4">
              <input type="email" placeholder="Email" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700" value={password} onChange={e => setPassword(e.target.value)} required />
              {isSignUp && <input type="password" placeholder="Confirm Password" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />}
            </div>
            <button type="submit" disabled={authLoading} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">{authLoading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}</button>
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full text-slate-400 font-bold text-sm hover:text-slate-600">{isSignUp ? 'Back to Login' : 'Create a new account'}</button>
          </form>
        </div>
      </div>
    );
  }

  const NavItem = ({ view, icon, label }: { view: any, icon: string, label: string }) => {
    const isActive = currentView === view;
    return (
      <button 
        onClick={() => setCurrentView(view)} 
        className={`flex flex-col lg:flex-row items-center justify-center lg:space-x-3 px-6 py-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
      >
        <i className={`fas ${icon} ${isActive ? 'text-white' : 'text-slate-300'} text-lg`}></i>
        <span className="text-[10px] lg:text-xs font-black mt-1 lg:mt-0 uppercase tracking-tighter">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b sticky top-0 z-[60] h-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 h-full flex justify-between items-center w-full">
          <button onClick={() => isAdmin ? setCurrentView('dashboard') : setCurrentView('leaderboard')} className="flex items-center space-x-4">
             <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg"><i className="fas fa-chart-line"></i></div>
             <div className="text-left hidden sm:block">
               <span className="text-xl font-black tracking-tighter block leading-none">BALL ENGINE</span>
               <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{isAdmin ? 'ADMIN CONSOLE' : 'VIEWER MODE'}</span>
             </div>
          </button>
          
          <div className="flex items-center space-x-2 bg-slate-100/50 p-1.5 rounded-[1.8rem]">
            {isAdmin && <NavItem view="dashboard" icon="fa-house" label="ホーム" />}
            <NavItem view="leaderboard" icon="fa-trophy" label="成績" />
            {isAdmin && (
              <>
                <NavItem view="unified_entry" icon="fa-plus-circle" label="入力" />
                <NavItem view="unified_logs" icon="fa-database" label="ログ" />
                <NavItem view="players" icon="fa-users" label="選手" />
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:block text-right">
              <span className="block text-xs font-black text-slate-900">{profile?.email?.split('@')[0]}</span>
              <span className={`block text-[8px] font-black uppercase ${isAdmin ? 'text-indigo-600' : 'text-emerald-600'}`}>
                {isAdmin ? 'ADMIN' : 'MEMBER'}
              </span>
            </div>
            <button onClick={() => signOut(auth)} className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors bg-white shadow-sm"><i className="fas fa-power-off"></i></button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-6 pt-10 pb-32 flex-1 w-full">
        {isAdmin && currentView === 'dashboard' ? (
           <div className="space-y-12 animate-fade-in">
              <header>
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter">ADMIN DASHBOARD</h2>
                <p className="text-slate-400 font-bold mt-2 italic">Welcome back, manager. Data awaits your decision.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <button onClick={() => setCurrentView('unified_entry')} className="group bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl hover:scale-[1.02] transition-all text-left">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-xl mb-6"><i className="fas fa-plus"></i></div>
                  <h3 className="text-2xl font-black mb-2 tracking-tight">DATA ENTRY</h3>
                  <p className="text-indigo-100 text-xs font-bold opacity-80 leading-relaxed">全ての投球・打席イベントをリアルタイムに記録します。</p>
                </button>

                <button onClick={() => setCurrentView('leaderboard')} className="group bg-white p-10 rounded-[3rem] text-slate-900 shadow-sm border border-slate-100 hover:scale-[1.02] transition-all text-left">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-xl mb-6 text-indigo-600"><i className="fas fa-trophy"></i></div>
                  <h3 className="text-2xl font-black mb-2 tracking-tight">LEADERBOARD</h3>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed">期間別、カテゴリ別のチーム成績を分析します。</p>
                </button>

                <button onClick={() => setCurrentView('unified_logs')} className="group bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl hover:scale-[1.02] transition-all text-left">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-xl mb-6 text-slate-400"><i className="fas fa-database"></i></div>
                  <h3 className="text-2xl font-black mb-2 tracking-tight">AUDIT LOGS</h3>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed">過去の全てのログを確認し、必要に応じて修正します。</p>
                </button>

                <button onClick={() => setCurrentView('players')} className="group bg-white p-10 rounded-[3rem] text-slate-900 shadow-sm border border-slate-100 hover:scale-[1.02] transition-all text-left">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-xl mb-6 text-emerald-600"><i className="fas fa-users"></i></div>
                  <h3 className="text-2xl font-black mb-2 tracking-tight">ROSTERS</h3>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed">チームと選手の所属・詳細情報を管理します。</p>
                </button>
              </div>
           </div>
        ) : currentView === 'leaderboard' ? <Leaderboard />
          : currentView === 'unified_entry' ? <UnifiedEntry />
          : currentView === 'unified_logs' ? <UnifiedLogManager />
          : <PlayerManager />
        }
      </main>
    </div>
  );
};

export default App;
