import React, { useState } from 'react';
import { LogIn, UserPlus, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      if (isLogin) {
        // 极简逻辑：如果本地有这个邮箱，就登录；否则报错
        const users = JSON.parse(localStorage.getItem('lexis_mock_users') || '{}');
        if (users[email] && users[email].password === password) {
          onAuthSuccess(users[email]);
        } else if (email === 'admin@lexis.com' && password === 'admin123') {
          // 预设一个管理员账号
          const adminUser = { uid: 'admin', email, name: '系统管理员', role: 'teacher' };
          onAuthSuccess(adminUser);
        } else {
          setError('邮箱或密码错误，或用户不存在。');
        }
      } else {
        // 注册逻辑：存入本地模拟数据库
        const users = JSON.parse(localStorage.getItem('lexis_mock_users') || '{}');
        if (users[email]) {
          setError('该邮箱已注册。');
        } else {
          const newUser = {
            uid: Date.now().toString(),
            email,
            password, // 实际开发中绝不能明文存储
            name,
            role,
            createdAt: new Date().toISOString()
          };
          users[email] = newUser;
          localStorage.setItem('lexis_mock_users', JSON.stringify(users));
          onAuthSuccess(newUser);
        }
      }
    } catch (err: any) {
      setError('操作失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰：水墨山水意向 */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 100 C 20 80, 40 90, 60 70 S 80 80, 100 60 L 100 100 Z" fill="#1e293b" />
          <path d="M0 100 C 10 90, 30 95, 50 85 S 70 90, 100 75 L 100 100 Z" fill="#2d3748" />
        </svg>
      </div>
      <div className="absolute top-10 right-10 w-32 h-32 border border-slate-200 rounded-full opacity-20 animate-pulse" />
      <div className="absolute bottom-10 left-10 w-48 h-48 border-2 border-slate-200 rounded-full opacity-10" />

      <div className="max-w-md w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 overflow-hidden relative z-10">
        <div className="bg-[#1E293B] p-10 text-center text-white relative">
          {/* 印章装饰 */}
          <div className="absolute top-4 right-4 w-8 h-8 border-2 border-[#C0392B] flex items-center justify-center text-[#C0392B] font-serif text-[10px] leading-none rotate-12 bg-white/5">
            智<br/>语
          </div>
          
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20 shadow-inner">
            <Sparkles className="w-10 h-10 text-indigo-300" />
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-widest mb-2">智语 · SmartLexis</h1>
          <div className="h-px w-12 bg-indigo-400/50 mx-auto mb-3" />
          <p className="text-indigo-100/80 text-sm font-medium tracking-loose">博观而约取 · 厚积而薄发</p>
        </div>

        <div className="p-10">
          <div className="flex gap-6 mb-10 relative">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all relative z-10 ${isLogin ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              登录
              {isLogin && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full" />}
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all relative z-10 ${!isLogin ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              注册
              {!isLogin && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full" />}
            </button>
            <div 
              className={`absolute top-0 h-full w-1/2 bg-indigo-50/50 rounded-2xl transition-transform duration-300 ease-out ${isLogin ? 'translate-x-0' : 'translate-x-full'}`}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">姓名 / Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="请输入真实姓名"
                    className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">身份 / Identity</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                  >
                    <option value="student">学生 (Student)</option>
                    <option value="teacher">教师 (Teacher)</option>
                  </select>
                </div>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">邮箱 / Email</label>
              <input 
                type="email" 
                required 
                placeholder="example@email.com"
                className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">密码 / Password</label>
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-3 rounded-xl animate-in shake-in">
                <AlertCircle className="w-4 h-4" />
                <p className="text-[10px] font-bold">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-[#1E293B] text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 disabled:opacity-50 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span className="tracking-[0.3em]">开启诊断</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="tracking-[0.3em]">创建卷宗</span>
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-400 font-medium">
              © 2026 智语教育科技 · 传承文明 启迪智慧
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
