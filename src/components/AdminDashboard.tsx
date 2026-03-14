import React, { useState, useEffect } from 'react';
import { 
  Users, Database, Trash2, Shield, Search, 
  History, AlertCircle, CheckCircle2, Loader2,
  FileText, Trash
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'data'>('users');
  const [mockUsers, setMockUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const users = JSON.parse(localStorage.getItem('lexis_mock_users') || '{}');
    setMockUsers(Object.values(users));
  };

  const clearAllData = () => {
    if (window.confirm('确定要清除所有本地存储的数据吗？这将删除所有注册用户和历史记录。')) {
      localStorage.removeItem('lexis_mock_users');
      localStorage.removeItem('lexis_user');
      // Also clear history if it's in localStorage
      // For now, we assume history is handled by the API, but if it's mock, we might need to clear it too.
      alert('数据已清除，请重新登录。');
      onLogout();
    }
  };

  const deleteUser = (email: string) => {
    if (window.confirm(`确定要删除用户 ${email} 吗？`)) {
      const users = JSON.parse(localStorage.getItem('lexis_mock_users') || '{}');
      delete users[email];
      localStorage.setItem('lexis_mock_users', JSON.stringify(users));
      loadData();
    }
  };

  const filteredUsers = mockUsers.filter(u => 
    u.name.includes(searchTerm) || u.email.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-serif font-bold tracking-wider">管理后台</h1>
          </div>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest">System Administrator</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              activeTab === 'users' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" /> 用户管理
          </button>
          <button 
            onClick={() => setActiveTab('data')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              activeTab === 'data' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Database className="w-4 h-4" /> 数据维护
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <History className="w-4 h-4" /> 退出登录
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {activeTab === 'users' ? '注册用户列表' : '系统数据维护'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="搜索用户..."
                className="pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'users' ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">姓名</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">邮箱</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">身份</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">注册时间</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.email} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {u.name[0]}
                          </div>
                          <span className="text-sm font-bold text-slate-700">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          u.role === 'teacher' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {u.role === 'teacher' ? '教师' : '学生'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => deleteUser(u.email)}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                        未找到匹配的用户
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">危险区域</h3>
                    <p className="text-sm text-slate-500">清除系统中的所有持久化数据</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-700 leading-relaxed">
                      警告：此操作将永久删除所有本地存储的用户账户、作文诊断历史和系统配置。操作不可撤销，请谨慎操作。
                    </p>
                  </div>
                  
                  <button 
                    onClick={clearAllData}
                    className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
                  >
                    <Trash className="w-4 h-4" /> 清除所有本地数据
                  </button>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">系统状态</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">总用户数</p>
                    <p className="text-2xl font-black text-slate-800">{mockUsers.length}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">系统版本</p>
                    <p className="text-2xl font-black text-slate-800">v1.2.0</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
