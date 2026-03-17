import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserCircle, BookOpen, PenTool, Sparkles, 
  TrendingUp, Award, AlertCircle, CheckCircle2, 
  Search, Filter, Download, Upload, LogOut, 
  ChevronRight, BrainCircuit, Target, FileText,
  Loader2, ImageIcon, History, Square, ArrowRight,
  BarChart3, Activity, Volume2, Edit3, Trash2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import * as XLSX from 'xlsx';
import { cn } from './lib/utils';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';

// --- Types ---
interface Student {
  dbId?: number;
  id: string;
  name: string;
  choice: number;
  modernReading: number;
  classicReading: number;
  nonLinear: number;
  dictation: number;
  composition: number;
  total: number;
}

interface WritingRecord {
  id: string;
  studentId: string;
  title: string;
  analysis: string;
  date: string;
}

interface User {
  uid: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  studentId?: string;
}

// --- UI Components ---
const Card = ({ title, subtitle, children, className, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={cn("bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500", className)}
  >
    {(title || subtitle) && (
      <div className="mb-8">
        {title && <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>}
        {subtitle && <p className="text-xs text-slate-400 font-bold mt-1.5 uppercase tracking-widest">{subtitle}</p>}
      </div>
    )}
    {children}
  </motion.div>
);

const StatBox = ({ label, value, subValue, icon: Icon, colorClass, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay }}
    className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-indigo-100 transition-all duration-300"
  >
    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500", colorClass)}>
      <Icon className="w-7 h-7" />
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-slate-900">{value}</span>
        {subValue && <span className="text-xs font-bold text-emerald-500">{subValue}</span>}
      </div>
    </div>
  </motion.div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'teacher' | 'student' | 'admin'>('teacher');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrescription, setAiPrescription] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'practice' | 'essay' | 'graph' | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionContent, setActionContent] = useState<string | null>(null);
  const [essayTitle, setEssayTitle] = useState('');
  const [essayImages, setEssayImages] = useState<string[]>([]);
  const [isAnalyzingEssay, setIsAnalyzingEssay] = useState(false);
  const [essayAnalysis, setEssayAnalysis] = useState<WritingRecord | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<WritingRecord[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [preGeneratedAudio, setPreGeneratedAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('lexis_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        if (userData.role === 'student') {
          setView('student');
          const sid = userData.studentId || userData.uid;
          setSelectedStudentId(sid);
          fetchAnalysisHistory(sid, userData.uid);
        } else if (userData.role === 'admin') setView('admin');
      } catch (e) { localStorage.removeItem('lexis_user'); }
    }
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role === 'teacher') {
      fetch(`/api/students?teacher_id=${user.uid}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data)) {
            setStudents(data.map(s => ({
              dbId: s.id,
              id: s.student_id || 'N/A', 
              name: s.name,
              choice: s.choice || 0, 
              modernReading: s.modern_reading || 0, 
              classicReading: s.classic_reading || 0, 
              nonLinear: s.non_linear || 0, 
              dictation: s.dictation || 0, 
              composition: s.composition || 0, 
              total: s.total || 0
            })));
          }
        }).catch(() => setStudents([]));
    }
  }, [user]);

  useEffect(() => {
    if (selectedStudentId && user?.uid) {
      fetchAnalysisHistory(selectedStudentId);
    }
  }, [selectedStudentId, user]);

  const fetchAnalysisHistory = async (studentId: string, teacherId?: string) => {
    if (!studentId) return;
    const tId = teacherId || user?.uid;
    if (!tId) return;
    try {
      const res = await fetch(`/api/history?studentId=${studentId}&teacherId=${tId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAnalysisHistory(data);
      }
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('lexis_user');
    setView('teacher');
  };

  const handleSaveStudent = async (student: Student) => {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          students: [student],
          teacher_id: user?.uid 
        })
      });
      if (res.ok) {
        // 重新获取以确保 ID 同步
        const r = await fetch(`/api/students?teacher_id=${user?.uid}`);
        const data = await r.json();
        if (Array.isArray(data)) {
          setStudents(data.map(s => ({
            dbId: s.id,
            id: s.student_id || 'N/A',
            name: s.name,
            choice: s.choice || 0,
            modernReading: s.modern_reading || 0,
            classicReading: s.classic_reading || 0,
            nonLinear: s.non_linear || 0,
            dictation: s.dictation || 0,
            composition: s.composition || 0,
            total: s.total || 0
          })));
        }
        setIsEditModalOpen(false);
        setEditingStudent(null);
      } else {
        alert("保存失败，请重试");
      }
    } catch (err) {
      console.error(err);
      alert("网络错误，保存失败");
    }
  };

  const handleDeleteStudent = async (dbId: number) => {
    if (window.confirm('确定要删除该学生成绩吗？此操作不可撤销。')) {
      try {
        const res = await fetch(`/api/students?id=${dbId}&teacher_id=${user?.uid}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setStudents(prev => prev.filter(s => s.dbId !== dbId));
        } else {
          const errData = await res.json().catch(() => ({ error: '未知错误' }));
          alert(`删除失败: ${errData.error || '服务器错误'}`);
        }
      } catch (err) {
        console.error(err);
        alert("网络错误，删除失败");
      }
    }
  };

  const generateAIAnalysis = async (student: Student) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/analyze_student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student })
      });
      const data = await res.json();
      setAiPrescription(data.analysis || "分析失败");
    } catch (err) { setAiPrescription("网络错误"); }
    finally { setIsGenerating(false); }
  };

  const analyzeEssay = async () => {
    if (!essayTitle.trim() || essayImages.length === 0) return;
    setIsAnalyzingEssay(true);
    try {
      const formData = new FormData();
      formData.append('title', essayTitle);
      formData.append('studentId', selectedStudentId || '');
      formData.append('teacherId', user?.uid || '');
      essayImages.forEach(img => formData.append('images', img));
      const res = await fetch('/api/analyze_essay', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setEssayAnalysis(data);
        setAnalysisHistory(prev => [data, ...prev]);
        setEssayImages([]);
        setEssayTitle('');
      } else alert(data.error || "阅卷失败");
    } catch (err) { alert("网络错误"); }
    finally { setIsAnalyzingEssay(false); }
  };

  const fetchUpgradedEssay = async () => {
    if (!essayAnalysis) return;
    setIsActionLoading(true);
    setActiveAction('essay');
    setPreGeneratedAudio(null);
    try {
      const res = await fetch('/api/upgrade_essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: essayAnalysis.title, content: essayAnalysis.analysis })
      });
      const data = await res.json();
      setActionContent(data.text);
      
      // 立即触发后台语音预生成
      if (data.text) {
        preGenerateTTS(data.text);
      }
    } catch (err) { console.error(err); }
    finally { setIsActionLoading(false); }
  };

  const fetchPractice = async () => {
    setIsActionLoading(true);
    setActiveAction('practice');
    try {
      const res = await fetch('/api/generate_practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student: selectedStudent })
      });
      const data = await res.json();
      setActionContent(data.text);
    } catch (err) { console.error(err); }
    finally { setIsActionLoading(false); }
  };

  const preGenerateTTS = async (text: string) => {
    let textToRead = text;
    const patterns = [
      /【升格范文】([\s\S]*?)(?=【亮点解析】|【亮点赏析】|【|$)/,
      /(?:^|\n)升格范文(?:$|\n)([\s\S]*?)(?=(?:^|\n)亮点解析|$)/m,
      /范文正文([\s\S]*?)(?=亮点解析|解析|【|$)/
    ];

    let found = false;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 10) {
        textToRead = match[1].trim();
        found = true;
        break;
      }
    }
    
    if (!found) {
      const markerIndex = text.indexOf('升格范文');
      if (markerIndex !== -1) {
        textToRead = text.substring(markerIndex + 4).trim();
      }
    }
    
    // 限制长度并清理 Markdown 标记
    textToRead = textToRead.replace(/[#*`]/g, '').substring(0, 600);
    
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToRead })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.audio) {
          setPreGeneratedAudio(data.audio);
        }
      }
    } catch (err) {
      console.error("语音预生成失败:", err);
    }
  };

  const playAudioFromBase64 = (base64: string) => {
    try {
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const buffer = new ArrayBuffer(44 + len);
      const view = new DataView(buffer);
      const sampleRate = 24000;

      // RIFF identifier
      view.setUint32(0, 0x52494646, false);
      // file length
      view.setUint32(4, 36 + len, true);
      // RIFF type
      view.setUint32(8, 0x57415645, false);
      // format chunk identifier
      view.setUint32(12, 0x666d7420, false);
      // format chunk length
      view.setUint32(16, 16, true);
      // sample format (raw PCM)
      view.setUint16(20, 1, true);
      // channel count (1 for mono)
      view.setUint16(22, 1, true);
      // sample rate
      view.setUint32(24, sampleRate, true);
      // byte rate (sample rate * block align)
      view.setUint32(28, sampleRate * 2, true);
      // block align (channel count * bytes per sample)
      view.setUint16(32, 2, true);
      // bits per sample
      view.setUint16(34, 16, true);
      // data chunk identifier
      view.setUint32(36, 0x64617461, false);
      // data chunk length
      view.setUint32(40, len, true);

      for (let i = 0; i < len; i++) {
        view.setUint8(44 + i, binaryString.charCodeAt(i));
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => setIsPlayingAudio(true);
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setIsPlayingAudio(false);
        setIsTTSLoading(false);
        alert("音频播放失败，请重试");
      };
      audio.onended = () => { 
        setIsPlayingAudio(false); 
        audioRef.current = null; 
        URL.revokeObjectURL(url); 
      };
      audio.play().catch(err => {
        console.error("Play error:", err);
        setIsPlayingAudio(false);
        setIsTTSLoading(false);
      });
    } catch (err) {
      console.error("Base64 decode error:", err);
      alert("音频数据解析失败");
      setIsTTSLoading(false);
    }
  };

  const playTTS = async (text: string) => {
    if (isPlayingAudio) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setIsPlayingAudio(false);
      return;
    }

    if (preGeneratedAudio) {
      playAudioFromBase64(preGeneratedAudio);
      return;
    }

    setIsTTSLoading(true);
    let textToRead = text;
    // 更加精准的提取逻辑：优先匹配带括号的标题，或者独立行
    const patterns = [
      /【升格范文】([\s\S]*?)(?=【亮点解析】|【亮点赏析】|【|$)/,
      /(?:^|\n)升格范文(?:$|\n)([\s\S]*?)(?=(?:^|\n)亮点解析|$)/m,
      /范文正文([\s\S]*?)(?=亮点解析|解析|【|$)/
    ];

    let found = false;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 10) {
        textToRead = match[1].trim();
        found = true;
        break;
      }
    }

    if (!found) {
      const markerIndex = text.indexOf('升格范文');
      if (markerIndex !== -1) {
        textToRead = text.substring(markerIndex + 4).trim();
      }
    }

    // 限制长度并清理 Markdown 标记
    textToRead = textToRead.replace(/[#*`]/g, '').substring(0, 600);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToRead })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: '请求失败' }));
        throw new Error(errData.error || 'TTS 请求失败');
      }

      const data = await res.json();
      if (data.audio) {
        playAudioFromBase64(data.audio);
      } else {
        throw new Error("未能生成音频数据");
      }
    } catch (err: any) { 
      console.error("TTS Error:", err); 
      alert(`播放失败: ${err.message}`);
    }
    finally { setIsTTSLoading(false); }
  };

  const downloadTemplate = () => {
    const data = [
      ["学号", "姓名", "选择题", "现代文阅读", "文言文阅读", "非连续性文本", "默写填空", "作文"],
      ["2026001", "张三", 25, 20, 15, 8, 8, 42],
      ["2026002", "李四", 22, 18, 12, 7, 9, 38]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "成绩模板");
    
    // 导出为 .xlsx 文件，这是现代 Excel 的标准格式
    XLSX.writeFile(wb, "智语系统_成绩导入模板.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 转换为 JSON 对象数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // 过滤掉表头和空行
        const rows = jsonData.slice(1);
        const newStudents = rows.map(row => {
          if (!row || row.length < 2) return null;
          
          const [id, name, choice, modern, classic, nonLinear, dictation, composition] = row.map(v => v?.toString().trim());
          if (!id || !name) return null;
          
          const s = { 
            id, 
            name, 
            choice: parseInt(choice) || 0, 
            modernReading: parseInt(modern) || 0, 
            classicReading: parseInt(classic) || 0, 
            nonLinear: parseInt(nonLinear) || 0, 
            dictation: parseInt(dictation) || 0, 
            composition: parseInt(composition) || 0, 
            total: 0 
          };
          s.total = s.choice + s.modernReading + s.classicReading + s.nonLinear + s.dictation + s.composition;
          return s;
        }).filter(Boolean) as Student[];
        
        if (newStudents.length > 0) {
          // 保存到数据库
          fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              students: newStudents,
              teacher_id: user?.uid 
            })
          }).then(async res => {
            if (res.ok) {
              // 重新获取以获取数据库生成的 ID
              fetch(`/api/students?teacher_id=${user?.uid}`)
                .then(r => r.json())
                .then(data => {
                  if (Array.isArray(data)) {
                    setStudents(data.map(s => ({
                      dbId: s.id,
                      id: s.student_id || 'N/A',
                      name: s.name,
                      choice: s.choice || 0,
                      modernReading: s.modern_reading || 0,
                      classicReading: s.classic_reading || 0,
                      nonLinear: s.non_linear || 0,
                      dictation: s.dictation || 0,
                      composition: s.composition || 0,
                      total: s.total || 0
                    })));
                  }
                });
              alert(`成功导入并保存 ${newStudents.length} 名学生成绩！`);
            } else {
              const errData = await res.json().catch(() => ({}));
              alert(`导入失败: ${errData.error || '服务器错误，请检查网络或联系管理员'}`);
            }
          }).catch(err => {
            console.error("Upload error:", err);
            alert("网络连接失败，请检查您的网络设置。");
          });
        } else {
          alert("未发现有效数据，请检查模板格式。");
        }
      } catch (err) {
        console.error("Import error:", err);
        alert("文件解析失败，请确保使用标准的 Excel 或 CSV 模板。");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleEssayImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => setEssayImages(prev => [...prev, event.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0] || {
    id: 'N/A', name: '未选择', choice: 0, modernReading: 0, classicReading: 0, nonLinear: 0, dictation: 0, composition: 0, total: 0
  };

  const classStats = {
    avg: students.length ? Math.round(students.reduce((acc, s) => acc + s.total, 0) / students.length) : 0,
    passRate: students.length ? Math.round((students.filter(s => s.total >= 90).length / students.length) * 100) : 0,
    excellentRate: students.length ? Math.round((students.filter(s => s.total >= 120).length / students.length) * 100) : 0
  };

  const getLiteracyData = (s: Student) => [
    { subject: '语言建构', value: Math.round(((s.choice + s.dictation) / 40) * 100) || 0 },
    { subject: '思维发展', value: Math.round(((s.modernReading + s.nonLinear) / 40) * 100) || 0 },
    { subject: '审美鉴赏', value: Math.round((s.composition / 50) * 100) || 0 },
    { subject: '文化传承', value: Math.round((s.classicReading / 20) * 100) || 0 },
    { subject: '表达创作', value: Math.round(((s.composition + s.modernReading) / 80) * 100) || 0 },
  ];

  const filteredStudents = students.filter(s => s.name.includes(searchTerm) || s.id.includes(searchTerm));

  if (authLoading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      <p className="text-slate-500 font-medium animate-pulse">正在加载智语系统...</p>
    </div>
  );

  if (!user) return <Auth onAuthSuccess={(userData) => {
    setUser(userData);
    localStorage.setItem('lexis_user', JSON.stringify(userData));
    if (userData.role === 'student') {
      setView('student');
      const sid = userData.studentId || userData.uid;
      setSelectedStudentId(sid);
      fetchAnalysisHistory(sid, userData.uid);
    } else if (userData.role === 'admin') setView('admin');
    else setView('teacher');
  }} />;

  if (view === 'admin') return <AdminDashboard onLogout={handleLogout} />;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-slate-900 text-white hidden lg:flex flex-col p-8 z-50">
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20">
            <Sparkles className="text-white w-7 h-7" />
          </div>
          <span className="font-bold text-xl tracking-tight">智语·SmartLexis</span>
        </div>
        <nav className="space-y-3 flex-1">
          {user?.role === 'teacher' && (
            <button onClick={() => setView('teacher')} className={cn("w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all", view === 'teacher' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-800 hover:text-white")}>
              <BarChart3 className="w-5 h-5" /> 班级看板
            </button>
          )}
          <button onClick={() => setView('student')} className={cn("w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all", view === 'student' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-800 hover:text-white")}>
            <Activity className="w-5 h-5" /> {user?.role === 'teacher' ? '学情诊断' : '我的诊断'}
          </button>
          {user?.role === 'teacher' && (
            <>
              <div className="pt-8 pb-3 px-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">数据中心</div>
              <button onClick={downloadTemplate} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                <Download className="w-5 h-5" /> 下载模板
              </button>
              <label className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer">
                <Upload className="w-5 h-5" /> 成绩导入
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              </label>
            </>
          )}
        </nav>
        <div className="mt-auto p-5 bg-slate-800/50 rounded-[32px] border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-black">{user?.role === 'teacher' ? '教师' : '学生'}</p>
              <p className="text-sm font-bold truncate max-w-[120px]">{user?.name}</p>
            </div>
            <button onClick={handleLogout} className="p-2.5 text-slate-400 hover:text-rose-400 transition-colors"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-8 md:p-12 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'teacher' ? (
            <motion.div key="teacher" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-10">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                  <h1 className="text-5xl font-black text-slate-900 tracking-tighter">班级学情看板</h1>
                  <p className="text-slate-500 mt-3 font-bold text-lg">高二(3)班 · 2026年春季第一次月考分析</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="搜索姓名或学号..." className="pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[24px] text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none w-80 transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <button onClick={() => { setEditingStudent(null); setIsEditModalOpen(true); }} className="p-4 bg-indigo-600 text-white rounded-[24px] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all"><Users className="w-6 h-6" /></button>
                </div>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatBox label="班级平均分" value={classStats.avg} subValue="+2.4" icon={TrendingUp} colorClass="bg-indigo-50 text-indigo-600" delay={0.1} />
                <StatBox label="及格率 (90+)" value={`${classStats.passRate}%`} subValue="↑ 5%" icon={CheckCircle2} colorClass="bg-emerald-50 text-emerald-600" delay={0.2} />
                <StatBox label="优秀率 (120+)" value={`${classStats.excellentRate}%`} subValue="稳定" icon={Award} colorClass="bg-amber-50 text-amber-600" delay={0.3} />
                <StatBox label="待关注人数" value="5" subValue="需辅导" icon={AlertCircle} colorClass="bg-rose-50 text-rose-600" delay={0.4} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card title="分数段分布" subtitle="全班成绩正态分布" className="lg:col-span-2" delay={0.5}>
                  <div className="h-[360px] mt-6">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={[{ range: '130+', count: 4 }, { range: '120-130', count: 12 }, { range: '110-120', count: 18 }, { range: '100-110', count: 15 }, { range: '90-100', count: 6 }, { range: '<90', count: 5 }]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 600}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 600}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.05)'}} />
                        <Bar dataKey="count" fill="#6366f1" radius={[12, 12, 0, 0]} barSize={50}>
                          {[0,1,2,3,4,5].map((_, index) => <Cell key={`cell-${index}`} fill={index === 5 ? '#f43f5e' : '#6366f1'} fillOpacity={0.8} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="题型得分率排行" subtitle="全班平均表现" delay={0.6}>
                  <div className="space-y-8 mt-6">
                    {[{ label: '选择题', val: 88, color: 'bg-emerald-500' }, { label: '默写填空', val: 82, color: 'bg-emerald-400' }, { label: '作文', val: 74, color: 'bg-indigo-500' }, { label: '现代文阅读', val: 68, color: 'bg-amber-500' }, { label: '文言文阅读', val: 52, color: 'bg-rose-500' }].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs font-black mb-3"><span className="text-slate-600">{item.label}</span><span className="text-slate-900">{item.val}%</span></div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${item.val}%` }} transition={{ duration: 1, delay: 0.8 }} className={cn("h-full rounded-full", item.color)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <Card title="学生成绩明细" subtitle={`共 ${filteredStudents.length} 条记录`} delay={0.7}>
                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                        <th className="pb-6">排名</th><th className="pb-6">姓名</th><th className="pb-6 text-center">选择</th><th className="pb-6 text-center">现代文</th><th className="pb-6 text-center">文言文</th><th className="pb-6 text-center">作文</th><th className="pb-6 text-right">总分</th><th className="pb-6 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredStudents.map((s, idx) => (
                        <tr key={s.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                          <td className="py-6 text-sm font-black text-slate-300">#{(idx + 1).toString().padStart(2, '0')}</td>
                          <td className="py-6"><div className="font-black text-slate-900 text-base">{s.name}</div><div className="text-[10px] text-slate-400 font-bold tracking-wider">{s.id}</div></td>
                          <td className="py-6 text-center text-sm font-bold text-slate-600">{s.choice}</td>
                          <td className="py-6 text-center text-sm font-bold text-slate-600">{s.modernReading}</td>
                          <td className="py-6 text-center text-sm font-bold text-slate-600">{s.classicReading}</td>
                          <td className="py-6 text-center text-sm font-black text-indigo-600">{s.composition}</td>
                          <td className="py-6 text-right"><span className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-black shadow-lg shadow-slate-900/10">{s.total}</span></td>
                          <td className="py-6">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => { setSelectedStudentId(s.id); setView('student'); }} 
                                title="查看诊断报告"
                                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => { setEditingStudent(s); setIsEditModalOpen(true); }} 
                                title="修改成绩"
                                className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => s.dbId && handleDeleteStudent(s.dbId)} 
                                title="删除记录"
                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="student" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  {user?.role === 'teacher' && (
                    <button onClick={() => setView('teacher')} className="w-14 h-14 flex items-center justify-center bg-white border border-slate-200 rounded-[24px] hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"><ArrowRight className="w-6 h-6 rotate-180" /></button>
                  )}
                  <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{user?.role === 'student' ? '我的诊断报告' : `${selectedStudent.name} 的诊断报告`}</h1>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full uppercase tracking-[0.15em]">学号: {selectedStudent.id}</span>
                      <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full uppercase tracking-[0.15em]">2026年春季月考</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-6xl font-black text-indigo-600 leading-none tracking-tighter">{selectedStudent.total}</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-3">Total Score</div>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {/* AI Writing - Bento Large */}
                <Card className="md:col-span-3 lg:col-span-3 bg-emerald-50/30 border-emerald-100/50" delay={0.1}>
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-[20px] flex items-center justify-center"><PenTool className="w-6 h-6 text-emerald-600" /></div>
                      <div><h3 className="text-xl font-bold text-slate-900">AI 作文深度诊断</h3><p className="text-xs text-slate-500 font-bold">多维度自动阅卷与修改建议</p></div>
                    </div>
                    {essayAnalysis && <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><History className="w-4 h-4" /> {new Date(essayAnalysis.date).toLocaleDateString()}</div>}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div className="space-y-6">
                        <div className="relative">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">作文题目 / Essay Title</label>
                          <input type="text" placeholder="请输入作文题目..." className="w-full px-6 py-4 bg-white border border-slate-200 rounded-[24px] text-sm font-bold outline-none focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm" value={essayTitle} onChange={(e) => setEssayTitle(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {essayImages.map((img, idx) => (
                            <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative aspect-[3/4] rounded-[24px] overflow-hidden border border-slate-200 group shadow-lg">
                              <img src={img} alt="Essay" className="w-full h-full object-cover" />
                              <button onClick={() => setEssayImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl"><AlertCircle className="w-4 h-4" /></button>
                            </motion.div>
                          ))}
                          {essayImages.length < 5 && (
                            <label className="aspect-[3/4] rounded-[24px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
                              <ImageIcon className="w-10 h-10 text-slate-300 group-hover:text-emerald-400 transition-colors" />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">添加图片</span>
                              <input type="file" accept="image/*" multiple className="hidden" onChange={handleEssayImageUpload} />
                            </label>
                          )}
                        </div>
                      </div>
                      <button onClick={analyzeEssay} disabled={isAnalyzingEssay || essayImages.length < 1 || !essayTitle.trim()} className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-emerald-200 disabled:opacity-50 disabled:shadow-none">
                        {isAnalyzingEssay ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                        {isAnalyzingEssay ? 'AI 正在深度阅卷...' : '开始深度诊断'}
                      </button>
                    </div>
                    <div className="bg-white rounded-[32px] border border-slate-100 p-8 min-h-[450px] flex flex-col shadow-inner overflow-hidden">
                      {isAnalyzingEssay ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center animate-bounce"><Sparkles className="w-10 h-10 text-emerald-600" /></div>
                          <p className="text-lg text-slate-500 font-black animate-pulse">AI 正在阅读并分析您的作文...</p>
                        </div>
                      ) : essayAnalysis ? (
                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar prose prose-sm prose-indigo max-w-none prose-p:leading-relaxed">
                          <ReactMarkdown>{essayAnalysis.analysis}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                          <FileText className="w-20 h-20 text-slate-300" />
                          <p className="text-base text-slate-400 font-black">暂无分析报告，请先提交作文</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Score Summary */}
                <Card className="md:col-span-1 lg:col-span-1" title="得分明细" delay={0.2}>
                  <div className="space-y-6 mt-8">
                    {[{ label: '选择题', score: selectedStudent.choice, max: 30, color: 'bg-indigo-500' }, { label: '现代文', score: selectedStudent.modernReading, max: 30, color: 'bg-indigo-400' }, { label: '文言文', score: selectedStudent.classicReading, max: 20, color: 'bg-amber-500' }, { label: '非连续', score: selectedStudent.nonLinear, max: 10, color: 'bg-emerald-500' }, { label: '默写', score: selectedStudent.dictation, max: 10, color: 'bg-emerald-400' }, { label: '作文', score: selectedStudent.composition, max: 50, color: 'bg-rose-500' }].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-[10px] font-black mb-2.5"><span className="text-slate-500 uppercase tracking-widest">{item.label}</span><span className="text-slate-900">{item.score} / {item.max}</span></div>
                        <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(item.score/item.max)*100}%` }} transition={{ duration: 1, delay: 0.5 }} className={cn("h-full rounded-full", item.color)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* AI Prescription - Full Width */}
                <Card className="md:col-span-3 lg:col-span-4 bg-indigo-50/30 border-indigo-100/50" delay={0.3}>
                  <div className="flex flex-col lg:flex-row gap-12">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-indigo-100 rounded-[20px] flex items-center justify-center"><BrainCircuit className="w-6 h-6 text-indigo-600" /></div>
                        <div><h3 className="text-xl font-bold text-slate-900">AI 智能学习处方</h3><p className="text-xs text-slate-500 font-bold">基于大数据分析的个性化提升路径</p></div>
                      </div>
                      {!aiPrescription && !isGenerating ? (
                        <div className="py-16 text-center space-y-8">
                          <div className="w-24 h-24 bg-white rounded-[40px] flex items-center justify-center mx-auto shadow-xl border border-indigo-50"><Sparkles className="w-12 h-12 text-indigo-600" /></div>
                          <div className="space-y-3"><h3 className="text-2xl font-black text-slate-900">生成您的专属学习处方</h3><p className="text-base text-slate-500 max-w-md mx-auto leading-relaxed font-medium">AI 将深度解析您的各项得分，挖掘潜在提分空间，并为您量身定制本周的学习计划。</p></div>
                          <button onClick={() => generateAIAnalysis(selectedStudent)} className="px-10 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-lg hover:bg-indigo-700 transition-all flex items-center gap-4 mx-auto shadow-2xl shadow-indigo-200"><Sparkles className="w-6 h-6" /> 开启智能分析</button>
                        </div>
                      ) : isGenerating ? (
                        <div className="py-24 text-center space-y-8">
                          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto" />
                          <div className="space-y-3"><p className="text-indigo-600 font-black text-2xl animate-pulse">AI 正在深度分析学情数据...</p><p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Processing Data</p></div>
                        </div>
                      ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-10 rounded-[40px] border border-indigo-100 shadow-sm relative group">
                          <div className="absolute top-8 right-8 flex gap-3 no-print">
                            <button onClick={() => playTTS(aiPrescription || '')} className={cn("p-3.5 rounded-2xl transition-all shadow-sm", isPlayingAudio ? "bg-rose-500 text-white" : "bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50")}>{isPlayingAudio ? <Square className="w-5 h-5 fill-current" /> : <Volume2 className="w-5 h-5" />}</button>
                            <button onClick={() => generateAIAnalysis(selectedStudent)} className="p-3.5 bg-slate-50 text-slate-400 rounded-2xl hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"><TrendingUp className="w-5 h-5" /></button>
                          </div>
                          <div className="prose prose-indigo max-w-none prose-p:leading-relaxed prose-headings:font-serif prose-headings:tracking-tight">
                            <ReactMarkdown>{aiPrescription}</ReactMarkdown>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <div className="w-full lg:w-80 space-y-8">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">推荐行动路径 / Action Path</h4>
                      <div className="grid grid-cols-1 gap-5">
                        {[
                          { id: 'practice', title: '专项提分练习', desc: '针对薄弱项的精选试题', icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-50', action: fetchPractice },
                          { id: 'essay', title: '范文升格赏析', desc: '高分作文与名家名篇', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50', action: fetchUpgradedEssay },
                          { id: 'graph', title: '核心素养图谱', desc: '查看关联知识点掌握', icon: BrainCircuit, color: 'text-amber-600', bg: 'bg-amber-50', action: () => setActiveAction('graph') },
                        ].map(action => (
                          <button key={action.id} onClick={action.action} className="group p-6 bg-white border border-slate-100 rounded-[32px] text-left hover:border-indigo-200 hover:shadow-2xl transition-all duration-500">
                            <div className="flex items-center justify-between mb-4">
                              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", action.bg)}><action.icon className={cn("w-6 h-6", action.color)} /></div>
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-2 transition-all" />
                            </div>
                            <h5 className="text-base font-black text-slate-900 mb-1.5">{action.title}</h5>
                            <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{action.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Radar Chart */}
                <Card className="md:col-span-1 lg:col-span-2" title="核心素养维度" subtitle="基于 6 大题型加权计算" delay={0.4}>
                  <div className="h-[400px] mt-6 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getLiteracyData(selectedStudent).map((d, i) => ({ ...d, avg: [82, 75, 78, 70, 72][i] }))}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 800 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="个人得分率" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} strokeWidth={4} />
                        <Radar name="全班平均" dataKey="avg" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.05} strokeDasharray="4 4" />
                        <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.05)'}} />
                        <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '30px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* History */}
                <Card className="md:col-span-2 lg:col-span-2" title="历史诊断记录" subtitle="作文深度诊断历史" delay={0.5}>
                  <div className="mt-8 space-y-4 max-h-[380px] overflow-y-auto pr-4 custom-scrollbar">
                    {analysisHistory.length > 0 ? analysisHistory.map((item) => (
                      <button key={item.id} onClick={() => setEssayAnalysis(item)} className={cn("w-full p-6 rounded-[24px] border text-left transition-all duration-300 group", essayAnalysis?.id === item.id ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-100 hover:border-indigo-100 hover:shadow-lg")}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn("text-base font-black", essayAnalysis?.id === item.id ? "text-indigo-600" : "text-slate-700")}>{item.title}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1 font-bold leading-relaxed">{(item.analysis || "").substring(0, 120)}...</p>
                      </button>
                    )) : (
                      <div className="py-24 text-center opacity-30">
                        <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-base text-slate-400 font-black">暂无历史记录</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Action Modals */}
      <AnimatePresence>
        {activeAction && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 40 }} className="bg-white rounded-[48px] w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 flex items-center gap-4">
                    {activeAction === 'practice' && <><Target className="text-indigo-600" /> 专项提分练习</>}
                    {activeAction === 'essay' && <><Award className="text-emerald-600" /> 范文升格赏析</>}
                    {activeAction === 'graph' && <><BrainCircuit className="text-amber-600" /> 核心素养图谱</>}
                  </h3>
                  <p className="text-slate-500 text-base font-bold mt-2 tracking-tight">基于 AI 诊断结果生成的个性化提升方案</p>
                </div>
                <button onClick={() => { setActiveAction(null); setActionContent(null); }} className="w-16 h-16 flex items-center justify-center bg-white border border-slate-200 rounded-[24px] hover:bg-slate-50 transition-all shadow-sm hover:rotate-90 duration-500"><AlertCircle className="w-8 h-8 text-slate-400 rotate-45" /></button>
              </div>
              <div className="p-12 overflow-y-auto flex-1 custom-scrollbar">
                {isActionLoading ? (
                  <div className="py-24 text-center space-y-8">
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto" />
                    <p className="text-indigo-600 font-black text-2xl animate-pulse">AI 正在为您精心准备内容...</p>
                  </div>
                ) : activeAction === 'graph' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="h-[450px] w-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getLiteracyData(selectedStudent)}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 14, fontWeight: 800 }} />
                          <Radar name="个人" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} strokeWidth={5} />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-8">
                      <h4 className="text-2xl font-black text-slate-800 font-serif italic tracking-tight">维度深度解析 / Analysis</h4>
                      <div className="space-y-5">
                        {[{ label: '语言建构', desc: '词汇运用、语法规范、表达流畅度', score: getLiteracyData(selectedStudent)[0].value }, { label: '思维发展', desc: '逻辑严密性、批判性思维、推理能力', score: getLiteracyData(selectedStudent)[1].value }, { label: '审美鉴赏', desc: '文学修辞感知、情感共鸣、审美评价', score: getLiteracyData(selectedStudent)[2].value }, { label: '文化传承', desc: '传统文化理解、文言底蕴、文化自信', score: getLiteracyData(selectedStudent)[3].value }].map(dim => (
                          <div key={dim.label} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 hover:border-indigo-100 transition-all">
                            <div className="flex justify-between items-center mb-3"><span className="text-base font-black text-indigo-600">{dim.label}</span><span className="text-sm font-black text-slate-400">{dim.score}%</span></div>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">{dim.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : actionContent ? (
                  <div className="relative group">
                    {activeAction === 'essay' && (
                      <div className="absolute top-0 right-0 no-print">
                        <button 
                          onClick={() => playTTS(actionContent)} 
                          disabled={isTTSLoading} 
                          className={cn(
                            "p-4 rounded-2xl transition-all shadow-lg flex items-center gap-3", 
                            isPlayingAudio 
                              ? "bg-rose-500 text-white shadow-rose-200 animate-pulse" 
                              : isTTSLoading 
                                ? "bg-indigo-800 text-white" 
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                          )}
                        >
                          {isTTSLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlayingAudio ? <Square className="w-5 h-5 fill-current" /> : <Volume2 className="w-5 h-5" />}
                          <span className="text-sm font-black">
                            {isTTSLoading ? '正在准备播音...' : isPlayingAudio ? '停止朗读' : '播音员朗读范文'}
                          </span>
                        </button>
                      </div>
                    )}
                    <div className="prose prose-indigo max-w-none prose-p:leading-loose prose-headings:font-serif prose-headings:tracking-tight">
                      <ReactMarkdown>{actionContent}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="py-24 text-center opacity-30">
                    <FileText className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                    <p className="text-base text-slate-400 font-black">暂无内容</p>
                  </div>
                )}
              </div>
              <div className="p-10 border-t border-slate-100 flex justify-center"><button onClick={() => { setActiveAction(null); setActionContent(null); }} className="px-16 py-5 bg-slate-900 text-white rounded-[24px] font-black text-lg hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200">完成学习</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.95, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 40 }} className="bg-white rounded-[48px] w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-900 text-xl flex items-center gap-4"><UserCircle className="w-8 h-8 text-indigo-600" /> {editingStudent ? '编辑学生信息' : '新增学生信息'}</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"><AlertCircle className="w-6 h-6 text-slate-400 rotate-45" /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const choice = parseInt(formData.get('choice') as string);
                const modern = parseInt(formData.get('modernReading') as string);
                const classic = parseInt(formData.get('classicReading') as string);
                const nonLinear = parseInt(formData.get('nonLinear') as string);
                const dictation = parseInt(formData.get('dictation') as string);
                const composition = parseInt(formData.get('composition') as string);
                handleSaveStudent({ id: formData.get('id') as string, name: formData.get('name') as string, choice, modernReading: modern, classicReading: classic, nonLinear, dictation, composition, total: choice + modern + classic + nonLinear + dictation + composition });
              }} className="p-12 space-y-10">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">学号 / ID</label><input name="id" defaultValue={editingStudent?.id} required disabled={!!editingStudent} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[24px] text-sm font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all disabled:opacity-50" /></div>
                  <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">姓名 / Name</label><input name="name" defaultValue={editingStudent?.name} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[24px] text-sm font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" /></div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {[{ name: 'choice', label: '选择', max: 30 }, { name: 'modernReading', label: '现代文', max: 30 }, { name: 'classicReading', label: '文言文', max: 20 }, { name: 'nonLinear', label: '非连续', max: 10 }, { name: 'dictation', label: '默写', max: 10 }, { name: 'composition', label: '作文', max: 50 }].map(field => (
                    <div key={field.name} className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{field.label}</label><input type="number" name={field.name} defaultValue={editingStudent ? (editingStudent as any)[field.name] : 0} min="0" max={field.max} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[24px] text-sm font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" /></div>
                  ))}
                </div>
                <div className="pt-6 flex gap-6"><button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[24px] font-black text-lg hover:bg-slate-200 transition-all">取消</button><button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-lg hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all">保存信息</button></div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
