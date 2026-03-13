/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart,
  BarChart, Bar, Cell, ComposedChart
} from 'recharts';
import { 
  BookOpen, TrendingUp, Target, Award, ChevronRight, BrainCircuit, 
  PenTool, Library, AlertCircle, CheckCircle2, ArrowRight, Users, 
  FileSpreadsheet, Search, Filter, Download, UserCircle, Sparkles,
  ArrowUpRight, ArrowDownRight, Upload, Loader2, LogOut, Image as ImageIcon,
  FileText, History
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Auth from './components/Auth';
import ReactMarkdown from 'react-markdown';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface StudentScore {
  id: string;
  name: string;
  choice: number;        // 选择题 (max 30) -> 语言建构
  modernReading: number; // 现代文 (max 30) -> 审美鉴赏
  classicReading: number;// 文言文 (max 20) -> 文化传承
  nonLinear: number;     // 非连续性文本 (max 10) -> 思维发展
  dictation: number;     // 默写 (max 10) -> 语言建构
  composition: number;   // 作文 (max 50) -> 表达创作
  total: number;
}

interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
}

interface WritingAnalysis {
  id: string;
  studentId: string;
  title: string;
  transcription: string;
  analysis: string;
  date: string;
}

// --- Mock Data Generator ---

const generateMockData = (count: number): StudentScore[] => {
  const names = ["张伟", "王芳", "李娜", "刘洋", "陈静", "杨光", "赵敏", "周强", "徐磊", "孙燕"];
  return Array.from({ length: count }, (_, i) => {
    const choice = Math.floor(Math.random() * 10) + 20;
    const modern = Math.floor(Math.random() * 10) + 18;
    const classic = Math.floor(Math.random() * 8) + 12;
    const nonLinear = Math.floor(Math.random() * 4) + 6;
    const dictation = Math.floor(Math.random() * 4) + 6;
    const composition = Math.floor(Math.random() * 15) + 30;
    return {
      id: `2026${(i + 1).toString().padStart(3, '0')}`,
      name: names[i % names.length] + (Math.floor(i / 10) || ''),
      choice,
      modernReading: modern,
      classicReading: classic,
      nonLinear,
      dictation,
      composition,
      total: choice + modern + classic + nonLinear + dictation + composition
    };
  }).sort((a, b) => b.total - a.total);
};

const ALL_STUDENTS = generateMockData(60);

// --- Components ---

const Card = ({ children, className, title, icon: Icon, subtitle }: any) => (
  <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
    {(title || subtitle) && (
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-indigo-600" />}
            {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const StatBox = ({ label, value, subValue, icon: Icon, colorClass }: any) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
    <div className="flex justify-between items-start mb-2">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <div className={cn("p-2 rounded-lg", colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-slate-900">{value}</span>
      {subValue && <span className="text-xs font-medium text-emerald-600">{subValue}</span>}
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<'teacher' | 'student'>('teacher');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<StudentScore[]>(ALL_STUDENTS);
  const [aiPrescription, setAiPrescription] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Action States
  const [activeAction, setActiveAction] = useState<'practice' | 'essay' | 'graph' | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [practiceContent, setPracticeContent] = useState<string | null>(null);
  const [upgradedEssay, setUpgradedEssay] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [preGeneratedAudio, setPreGeneratedAudio] = useState<string | null>(null);
  const [isPreGenerating, setIsPreGenerating] = useState(false);
  const [shouldPlayWhenReady, setShouldPlayWhenReady] = useState(false);

  // Essay Analysis States
  const [essayImages, setEssayImages] = useState<string[]>([]);
  const [essayTitle, setEssayTitle] = useState('');
  const [isAnalyzingEssay, setIsAnalyzingEssay] = useState(false);
  const [essayAnalysis, setEssayAnalysis] = useState<WritingAnalysis | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<WritingAnalysis[]>([]);

  useEffect(() => {
    // 极简模拟：从本地存储获取用户信息，或默认一个 ID
    const savedUser = localStorage.getItem('lexis_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      // 强制根据角色设置初始视图
      if (userData.role === 'student') {
        setView('student');
        setSelectedStudentId(userData.uid);
        fetchAnalysisHistory(userData.uid);
      } else {
        setView('teacher');
      }
    }
    setAuthLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('lexis_user');
    setUser(null);
    setSelectedStudentId(null);
    setAiPrescription(null);
    setEssayAnalysis(null);
    setAnalysisHistory([]);
  };

  const fetchAnalysisHistory = async (uid: string) => {
    try {
      const response = await fetch(`/api/history?studentId=${uid}`);
      if (response.ok) {
        const data = await response.json();
        setAnalysisHistory(data);
      }
    } catch (error) {
      console.error("Fetch history error:", error);
    }
  };

  // 监听范文变化，自动后台预生成语音
  useEffect(() => {
    if (upgradedEssay) {
      preGenerateTTS(upgradedEssay);
    } else {
      setPreGeneratedAudio(null);
      setIsPreGenerating(false);
      setShouldPlayWhenReady(false);
    }
  }, [upgradedEssay]);

  // 当预生成完成且用户已点击播放时，自动开始播放
  useEffect(() => {
    if (preGeneratedAudio && shouldPlayWhenReady) {
      setShouldPlayWhenReady(false);
      setIsTTSLoading(false);
      playAudioFromBase64(preGeneratedAudio);
    }
  }, [preGeneratedAudio, shouldPlayWhenReady]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
    };
  }, []);

  const preGenerateTTS = async (text: string) => {
    if (!text || isPreGenerating) return;
    setPreGeneratedAudio(null);
    setIsPreGenerating(true);
    
    // 提取“升格范文”部分的内容，只朗读正文
    let textToRead = text;
    // 兼容多种可能的范文标题格式
    const essayMatch = text.match(/(?:【?升格(?:版)?范文】?|1\.\s*升格版范文)([\s\S]*?)(?=【|2\.|\n\n亮点解析|$)/i);
    if (essayMatch && essayMatch[1]) {
      textToRead = essayMatch[1].trim();
    }

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToRead }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.audio) {
          setPreGeneratedAudio(data.audio);
        } else if (shouldPlayWhenReady) {
          throw new Error("未收到音频数据");
        }
      } else if (shouldPlayWhenReady) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.error("Pre-generation TTS error:", error);
      if (shouldPlayWhenReady) {
        setIsTTSLoading(false);
        setShouldPlayWhenReady(false);
        alert(`语音准备失败: ${error.message}`);
      }
    } finally {
      setIsPreGenerating(false);
    }
  };

  const playAudioFromBase64 = async (base64: string) => {
    console.log("Preparing to play audio, base64 length:", base64.length);
    setIsTTSLoading(true);
    
    // Clean up previous audio resources synchronously
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current.src = "";
      audioRef.current = null;
    }

    try {
      // 使用 fetch 转换 base64 为 blob，这在处理大数据时比 atob 更高效且稳定
      const blob = await fetch(`data:audio/wav;base64,${base64}`).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.oncanplaythrough = () => {
        // Double check if this is still the current audio we want to play
        if (audioRef.current !== audio) {
          URL.revokeObjectURL(url);
          return;
        }
        
        console.log("Audio blob ready, starting playback...");
        setIsTTSLoading(false);
        setIsPlayingAudio(true);
        audio.play().then(() => {
          console.log("Playback started successfully (Blob URL)");
        }).catch(e => {
          console.error("Playback failed:", e);
          setIsPlayingAudio(false);
          alert("播放失败：浏览器可能阻止了自动播放，请点击页面任意位置后再试。");
        });
      };

      audio.onerror = (e) => {
        console.error("Audio element error event:", e);
        if (audioRef.current === audio) {
          setIsTTSLoading(false);
          setIsPlayingAudio(false);
          alert("音频加载失败，请检查网络或重试。");
        }
      };

      audio.onended = () => {
        console.log("Audio playback ended naturally");
        if (audioRef.current === audio) {
          setIsPlayingAudio(false);
          URL.revokeObjectURL(url);
        }
      };
    } catch (err) {
      console.error("Error creating Audio object from blob:", err);
      setIsTTSLoading(false);
      setIsPlayingAudio(false);
      alert("处理音频数据失败。");
    }
  };

  // --- Action Handlers ---
  const fetchPractice = async () => {
    if (!selectedStudent) return;
    setIsActionLoading(true);
    setActiveAction('practice');
    try {
      const response = await fetch('/api/generate_practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentScore: selectedStudent })
      });
      const data = await response.json();
      setPracticeContent(data.text);
    } catch (error) {
      console.error("Practice generation error:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const fetchUpgradedEssay = async () => {
    if (!essayAnalysis) {
      alert("请先完成作文诊断");
      return;
    }
    setIsActionLoading(true);
    setActiveAction('essay');
    try {
      const response = await fetch('/api/upgrade_essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ essayText: essayAnalysis.analysis, title: essayAnalysis.title })
      });
      const data = await response.json();
      setUpgradedEssay(data.text);
    } catch (error) {
      console.error("Essay upgrade error:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const playTTS = async (text: string) => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
      return;
    }

    if (preGeneratedAudio) {
      playAudioFromBase64(preGeneratedAudio);
      return;
    }

    if (isPreGenerating) {
      setShouldPlayWhenReady(true);
      setIsTTSLoading(true);
      return;
    }

    if (isTTSLoading) return;

    setIsTTSLoading(true);
    console.log("Starting TTS request...");
    
    // 提取“升格范文”部分的内容，只朗读正文
    let textToRead = text;
    // 兼容多种可能的范文标题格式
    const essayMatch = text.match(/(?:【?升格(?:版)?范文】?|1\.\s*升格版范文)([\s\S]*?)(?=【|2\.|\n\n亮点解析|$)/i);
    if (essayMatch && essayMatch[1]) {
      textToRead = essayMatch[1].trim();
      console.log("Extracted essay content for reading:", textToRead.slice(0, 20) + "...");
    }

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 延长至 120 秒超时

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToRead }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log("TTS response received, status:", response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        let details = "";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          details = errorData.details || "";
        } catch (e) {
          const textError = await response.text().catch(() => "");
          if (textError) errorMessage += `: ${textError.slice(0, 100)}`;
        }
        throw new Error(`${errorMessage}${details ? `\n\n详情: ${details}` : ""}`);
      }

      const data = await response.json();
      if (!data.audio) {
        throw new Error("服务器未返回音频数据");
      }

      console.log("Audio data received, initializing player...");
      setPreGeneratedAudio(data.audio);
      playAudioFromBase64(data.audio);

      } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("TTS error:", error);
      setIsTTSLoading(false);
      setIsPlayingAudio(false);
      
      if (error.name === 'AbortError') {
        alert("朗读请求超时，请检查您的网络连接或稍后重试。");
      } else if (error.message.includes("API Key missing")) {
        alert("朗读失败：未配置 GEMINI_API_KEY。\n\n请在 Cloudflare 控制台的 Settings -> Variables 中添加 GEMINI_API_KEY 环境变量。");
      } else {
        alert(`朗读失败: ${error.message}\n\n提示：请确保已在 Cloudflare 后端配置了 GEMINI_API_KEY，且网络通畅。`);
      }
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  // --- AI Analysis ---
  const generateAIAnalysis = async (student: StudentScore) => {
    setIsGenerating(true);
    setAiPrescription(null);
    try {
      // 调用 Cloudflare 后端 API 进行学情分析
      const response = await fetch('/api/analyze_student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student })
      });
      
      if (!response.ok) throw new Error('AI 分析失败');
      const data = await response.json();
      setAiPrescription(data.text || "生成失败，请稍后再试。");
    } catch (error) {
      console.error("AI Error:", error);
      setAiPrescription("AI 诊断暂时不可用，请检查网络或 API 配置。");
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeEssay = async () => {
    if (essayImages.length < 2) {
      alert("请至少上传 2 张作文图片（最多 5 张）");
      return;
    }
    if (!essayTitle.trim()) {
      alert("请输入作文题目");
      return;
    }
    setIsAnalyzingEssay(true);
    try {
      // 调用 Cloudflare 后端 API 进行作文诊断 (OCR + 分析)
      const response = await fetch('/api/analyze_essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: essayImages, title: essayTitle })
      });

      if (!response.ok) throw new Error('作文分析失败');
      const data = await response.json();

      const result: WritingAnalysis = {
        id: Date.now().toString(),
        studentId: user!.uid,
        title: essayTitle,
        transcription: "已包含在诊断报告中",
        analysis: data.text || "分析失败",
        date: new Date().toISOString()
      };

      // 调用 Cloudflare 后端 API 保存到 D1
      const saveResponse = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: result.studentId,
          title: result.title,
          transcription: result.transcription,
          analysis: result.analysis,
          score: 45 
        })
      });

      if (!saveResponse.ok) {
        const saveError = await saveResponse.json().catch(() => ({ error: "保存到历史记录失败" }));
        console.warn("Save analysis warning:", saveError.error);
      }

      setEssayAnalysis(result);
      fetchAnalysisHistory(user!.uid);
      setEssayImages([]);
      setEssayTitle('');
    } catch (error) {
      console.error("Essay Analysis Error:", error);
      alert("分析失败，请稍后再试。");
    } finally {
      setIsAnalyzingEssay(false);
    }
  };

  const handleEssayImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + essayImages.length > 5) {
      alert("最多上传 5 张图片");
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEssayImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // --- Data Import ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const newStudents: StudentScore[] = [];

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length >= 8) {
          const choice = parseInt(cols[2]);
          const modernReading = parseInt(cols[3]);
          const classicReading = parseInt(cols[4]);
          const nonLinear = parseInt(cols[5]);
          const dictation = parseInt(cols[6]);
          const composition = parseInt(cols[7]);
          const total = choice + modernReading + classicReading + nonLinear + dictation + composition;
          
          newStudents.push({
            id: cols[0],
            name: cols[1],
            choice,
            modernReading,
            classicReading,
            nonLinear,
            dictation,
            composition,
            total
          });
        }
      }
      if (newStudents.length > 0) {
        setStudents(newStudents);
        alert(`成功导入 ${newStudents.length} 名学生数据`);
      }
    };
    reader.readAsText(file);
  };

  const selectedStudent = useMemo(() => {
    const found = students.find(s => s.id === selectedStudentId);
    if (found) return found;
    // 如果是学生登录且没在预设名单中，返回一个空数据的学生对象，避免看到别人的数据
    if (user?.role === 'student' && user.uid === selectedStudentId) {
      return {
        id: user.uid,
        name: user.name,
        choice: 0,
        dictation: 0,
        nonLinear: 0,
        modernReading: 0,
        classicReading: 0,
        composition: 0,
        total: 0
      };
    }
    return students[0];
  }, [selectedStudentId, students, user]);

  const classStats = useMemo(() => {
    const total = students.reduce((acc, s) => acc + s.total, 0);
    const avg = (total / students.length).toFixed(1);
    const passCount = students.filter(s => s.total >= 90).length;
    const excellentCount = students.filter(s => s.total >= 120).length;
    
    return { 
      avg, 
      passRate: ((passCount/students.length)*100).toFixed(1), 
      excellentRate: ((excellentCount/students.length)*100).toFixed(1) 
    };
  }, [students]);

  // Map scores to literacy dimensions
  const getLiteracyData = (student: StudentScore) => [
    { subject: '语言建构', value: Math.round(((student.choice + student.dictation) / 40) * 100) },
    { subject: '思维发展', value: Math.round((student.nonLinear / 10) * 100) },
    { subject: '审美鉴赏', value: Math.round((student.modernReading / 30) * 100) },
    { subject: '文化传承', value: Math.round((student.classicReading / 20) * 100) },
    { subject: '表达创作', value: Math.round((student.composition / 50) * 100) },
  ];

  const filteredStudents = students.filter(s => 
    s.name.includes(searchTerm) || s.id.includes(searchTerm)
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">正在加载智语系统...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={(userData) => {
      setUser(userData);
      localStorage.setItem('lexis_user', JSON.stringify(userData));
      if (userData.role === 'student') {
        setView('student');
        setSelectedStudentId(userData.uid);
        fetchAnalysisHistory(userData.uid);
      } else {
        setView('teacher');
      }
    }} />;
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans">
      {/* Modals for Actions */}
      {activeAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-[32px]">
              <div>
                <h3 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-3">
                  {activeAction === 'practice' && <><Target className="text-indigo-600" /> 专项提分练习</>}
                  {activeAction === 'essay' && <><Award className="text-emerald-600" /> 范文升格赏析</>}
                  {activeAction === 'graph' && <><BrainCircuit className="text-indigo-600" /> 核心素养图谱</>}
                </h3>
                <p className="text-slate-500 text-sm mt-1">基于 AI 诊断结果生成的个性化提升方案</p>
              </div>
              <button 
                onClick={() => { 
                  setActiveAction(null); 
                  setPracticeContent(null); 
                  setUpgradedEssay(null); 
                  if (audioRef.current) {
                    audioRef.current.pause();
                    setIsPlayingAudio(false);
                  }
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <AlertCircle className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 print:p-0">
              {isActionLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                  <p className="text-slate-500 font-medium animate-pulse">AI 正在为您精心准备内容...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeAction === 'practice' && practiceContent && (
                    <div className="prose prose-indigo max-w-none print:prose-sm">
                      <div className="flex justify-end mb-4 no-print">
                        <button 
                          onClick={exportToPDF}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200"
                        >
                          <Download className="w-4 h-4" /> 导出 PDF 打印
                        </button>
                      </div>
                      <ReactMarkdown>{practiceContent}</ReactMarkdown>
                    </div>
                  )}

                  {activeAction === 'essay' && upgradedEssay && (
                    <div className="space-y-8">
                      <div className="flex justify-end gap-3 no-print">
                        <button 
                          onClick={() => playTTS(upgradedEssay)}
                          disabled={isTTSLoading}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            isPlayingAudio ? "bg-rose-500 text-white" : 
                            isTTSLoading ? "bg-slate-400 text-white cursor-not-allowed" :
                            "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                          )}
                        >
                          {(isPlayingAudio || isTTSLoading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                          {isPlayingAudio ? "停止朗读" : isTTSLoading ? (isPreGenerating ? "正在准备语音..." : "正在生成语音...") : "范文朗读 (AI)"}
                        </button>
                      </div>
                      <div className="prose prose-indigo max-w-none">
                        <ReactMarkdown>{upgradedEssay}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {activeAction === 'graph' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getLiteracyData(selectedStudent).map((d, i) => ({
                              ...d,
                              avg: [82, 75, 78, 70, 72][i]
                            }))}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar name="个人" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} />
                              <Radar name="全班平均" dataKey="avg" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} strokeDasharray="4 4" />
                              <Tooltip />
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-800">维度分析说明</h4>
                          <div className="space-y-3">
                            {[
                              { label: '语言建构', desc: '词汇运用、语法规范、表达流畅度' },
                              { label: '思维发展', desc: '逻辑严密性、批判性思维、推理能力' },
                              { label: '审美鉴赏', desc: '文学修辞感知、情感共鸣、审美评价' },
                              { label: '文化传承', desc: '传统文化理解、文言底蕴、文化自信' },
                              { label: '表达创作', desc: '写作技巧、立意深度、素材整合' },
                            ].map(dim => (
                              <div key={dim.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-xs font-bold text-indigo-600 block mb-1">{dim.label}</span>
                                <p className="text-[10px] text-slate-500">{dim.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 text-center no-print">
              <button 
                onClick={() => { 
                  setActiveAction(null); 
                  setPracticeContent(null); 
                  setUpgradedEssay(null); 
                  if (audioRef.current) {
                    audioRef.current.pause();
                    setIsPlayingAudio(false);
                  }
                }}
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
              >
                完成学习
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print\\:p-0 { padding: 0 !important; }
          aside, header, nav { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
        }
      `}</style>
      <aside className="fixed top-0 left-0 h-full w-64 bg-slate-900 text-white hidden lg:flex flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">智语·SmartLexis</span>
        </div>

        <nav className="space-y-2 flex-1">
          {user?.role === 'teacher' && (
            <button 
              onClick={() => setView('teacher')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                view === 'teacher' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Users className="w-4 h-4" /> 班级概览
            </button>
          )}
          <button 
            onClick={() => setView('student')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              view === 'student' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <UserCircle className="w-4 h-4" /> {user?.role === 'teacher' ? '学情诊断' : '我的诊断'}
          </button>
          
          {user?.role === 'teacher' && (
            <>
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">数据管理</div>
              <label className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer">
                <Upload className="w-4 h-4" /> 成绩导入
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
              <button 
                onClick={() => {
                  const csv = "学号,姓名,选择题,现代文阅读,文言文阅读,非连续性文本,默写填空,作文\n2026001,学生A,25,24,15,8,9,42";
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.setAttribute('hidden', '');
                  a.setAttribute('href', url);
                  a.setAttribute('download', '成绩导入模板.csv');
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <Download className="w-4 h-4" /> 下载模板
              </button>
            </>
          )}
        </nav>

        <div className="mt-auto p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-slate-400 mb-1">当前登录</p>
              <p className="text-sm font-bold">{user?.name || '未登录'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{user?.role === 'teacher' ? '教师' : '学生'}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-6 md:p-10 max-w-7xl mx-auto">
        
        {view === 'teacher' && user?.role === 'teacher' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">班级学情看板</h1>
                <p className="text-slate-500 mt-1">高二(3)班 · 2026年春季第一次月考分析</p>
              </div>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                  <Upload className="w-4 h-4" />
                  导入
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="搜索学生姓名..." 
                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><Filter className="w-4 h-4" /></button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatBox label="班级平均分" value={classStats.avg} subValue="+2.4" icon={TrendingUp} colorClass="bg-indigo-50 text-indigo-600" />
              <StatBox label="及格率 (90+)" value={`${classStats.passRate}%`} subValue="↑ 5%" icon={CheckCircle2} colorClass="bg-emerald-50 text-emerald-600" />
              <StatBox label="优秀率 (120+)" value={`${classStats.excellentRate}%`} subValue="稳定" icon={Award} colorClass="bg-amber-50 text-amber-600" />
              <StatBox label="待关注人数" value="5" subValue="需辅导" icon={AlertCircle} colorClass="bg-rose-50 text-rose-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card title="分数段分布" className="lg:col-span-2">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { range: '130+', count: 4 },
                      { range: '120-130', count: 12 },
                      { range: '110-120', count: 18 },
                      { range: '100-110', count: 15 },
                      { range: '90-100', count: 6 },
                      { range: '<90', count: 5 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40}>
                        { [0,1,2,3,4,5].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 5 ? '#f43f5e' : '#6366f1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="题型得分率排行" subtitle="全班平均表现">
                <div className="space-y-5">
                  {[
                    { label: '选择题', val: 88, color: 'bg-emerald-500' },
                    { label: '默写填空', val: 82, color: 'bg-emerald-400' },
                    { label: '作文', val: 74, color: 'bg-indigo-500' },
                    { label: '现代文阅读', val: 68, color: 'bg-amber-500' },
                    { label: '文言文阅读', val: 52, color: 'bg-rose-500' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span>{item.label}</span>
                        <span>{item.val}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", item.color)} style={{ width: `${item.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card title="学生成绩明细" subtitle={`共 ${filteredStudents.length} 条记录`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="pb-4 font-semibold">排名</th>
                      <th className="pb-4 font-semibold">姓名</th>
                      <th className="pb-4 font-semibold text-center text-slate-600">选择</th>
                      <th className="pb-4 font-semibold text-center text-slate-600">现代文</th>
                      <th className="pb-4 font-semibold text-center text-slate-600">文言文</th>
                      <th className="pb-4 font-semibold text-center text-slate-600">作文</th>
                      <th className="pb-4 font-semibold text-right">总分</th>
                      <th className="pb-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.slice(0, 10).map((s, idx) => (
                      <tr key={s.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 text-sm font-medium text-slate-400">#{(idx + 1).toString().padStart(2, '0')}</td>
                        <td className="py-4">
                          <div className="font-bold text-slate-800">{s.name}</div>
                          <div className="text-[10px] text-slate-400">{s.id}</div>
                        </td>
                        <td className="py-4 text-center text-sm">{s.choice}</td>
                        <td className="py-4 text-center text-sm">{s.modernReading}</td>
                        <td className="py-4 text-center text-sm">{s.classicReading}</td>
                        <td className="py-4 text-center text-sm font-medium text-indigo-600">{s.composition}</td>
                        <td className="py-4 text-right font-black text-slate-900">{s.total}</td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => { setSelectedStudentId(s.id); setView('student'); }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {user?.role === 'teacher' && (
                  <button 
                    onClick={() => setView('teacher')}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </button>
                )}
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    {user?.role === 'student' ? '我的诊断报告' : `${selectedStudent.name} 的诊断报告`}
                    <span className="text-xs font-normal bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      学号: {selectedStudent.id}
                    </span>
                  </h1>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-indigo-600">{selectedStudent.total}</div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">Total Score</div>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* AI Writing Analysis - NEW FEATURE */}
              <Card title="AI 作文深度诊断" className="lg:col-span-3 bg-emerald-50/30 border-emerald-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <PenTool className="w-4 h-4 text-emerald-600" /> 提交手写作文
                      </h4>
                      <p className="text-xs text-slate-500">
                        上传 2-5 张清晰的手写作文图片，AI 将自动识别文字并进行多维度深度诊断。
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">作文题目 / Essay Title</label>
                        <input 
                          type="text" 
                          placeholder="请输入作文题目..."
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          value={essayTitle}
                          onChange={(e) => setEssayTitle(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {essayImages.map((img, idx) => (
                          <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 group">
                            <img src={img} alt={`Essay page ${idx + 1}`} className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setEssayImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <AlertCircle className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {essayImages.length < 5 && (
                          <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                            <ImageIcon className="w-6 h-6 text-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400">添加图片</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleEssayImageUpload} />
                          </label>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={analyzeEssay}
                      disabled={isAnalyzingEssay || essayImages.length < 2 || !essayTitle.trim()}
                      className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-50"
                    >
                      {isAnalyzingEssay ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      {isAnalyzingEssay ? 'AI 正在深度阅卷...' : '开始深度诊断'}
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-6 min-h-[300px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" /> 诊断报告
                      </h4>
                      {essayAnalysis && (
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <History className="w-3 h-3" /> {new Date(essayAnalysis.date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {isAnalyzingEssay ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                          <Sparkles className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="text-sm text-slate-500 font-medium">AI 正在阅读并分析您的作文...</p>
                      </div>
                    ) : essayAnalysis ? (
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar prose prose-sm prose-indigo max-w-none">
                        <ReactMarkdown>{essayAnalysis.analysis}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 opacity-40">
                        <PenTool className="w-12 h-12 text-slate-300" />
                        <p className="text-sm text-slate-400">暂无分析报告，请先提交作文</p>
                      </div>
                    )}
                  </div>
                </div>

                {analysisHistory.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">历史诊断记录</h5>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {analysisHistory.map((item, idx) => (
                        <button 
                          key={item.id}
                          onClick={() => setEssayAnalysis(item)}
                          className={cn(
                            "flex-shrink-0 px-4 py-2 rounded-xl border text-xs font-medium transition-all",
                            essayAnalysis?.id === item.id ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-500 hover:border-indigo-200"
                          )}
                        >
                          {item.title} ({new Date(item.date).toLocaleDateString()})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* AI Prescription */}
              <Card title="AI 智能学习处方" className="lg:col-span-3 bg-indigo-50/50 border-indigo-100">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1 space-y-4">
                    {!aiPrescription && !isGenerating ? (
                      <div className="py-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                          <BrainCircuit className="w-8 h-8 text-indigo-600" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-slate-900">获取个性化 AI 诊断</h3>
                          <p className="text-slate-500 max-w-md mx-auto">
                            基于学生的考试数据，利用大语言模型生成深度学情分析与针对性提升建议。
                          </p>
                        </div>
                        <button 
                          onClick={() => generateAIAnalysis(selectedStudent)}
                          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto shadow-lg shadow-indigo-200"
                        >
                          <Sparkles className="w-4 h-4" />
                          开始智能分析
                        </button>
                      </div>
                    ) : isGenerating ? (
                      <div className="py-12 text-center space-y-4">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                        <p className="text-indigo-600 font-medium animate-pulse">AI 正在深度分析学情数据，请稍候...</p>
                      </div>
                    ) : (
                      <div className="prose prose-indigo max-w-none">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-indigo-700 font-bold">
                            <Sparkles className="w-5 h-5" />
                            AI 诊断结果
                          </div>
                          <button 
                            onClick={() => generateAIAnalysis(selectedStudent)}
                            className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <TrendingUp className="w-3 h-3" /> 重新生成
                          </button>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm text-slate-700 leading-relaxed prose prose-indigo max-w-none">
                          <ReactMarkdown>{aiPrescription}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full md:w-72 space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">推荐行动路径</h4>
                    <div className="space-y-3">
                      <button 
                        onClick={fetchPractice}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-900">专项练习</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <p className="text-xs text-slate-500">针对薄弱项的精选试题集</p>
                      </button>
                      <button 
                        onClick={fetchUpgradedEssay}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-900">范文赏析</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <p className="text-xs text-slate-500">高分作文与名家名篇推荐</p>
                      </button>
                      <button 
                        onClick={() => setActiveAction('graph')}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-900">知识图谱</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <p className="text-xs text-slate-500">查看关联知识点掌握情况</p>
                      </button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Radar Chart */}
              <Card title="核心素养维度" subtitle="基于 6 大题型加权计算">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getLiteracyData(selectedStudent).map((d, i) => ({
                      ...d,
                      avg: [82, 75, 78, 70, 72][i] // Mock class average
                    }))}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="个人得分率"
                        dataKey="value"
                        stroke="#4f46e5"
                        fill="#4f46e5"
                        fillOpacity={0.3}
                      />
                      <Radar
                        name="全班平均"
                        dataKey="avg"
                        stroke="#94a3b8"
                        fill="#94a3b8"
                        fillOpacity={0.1}
                        strokeDasharray="4 4"
                      />
                      <Tooltip contentStyle={{borderRadius: '12px'}} />
                      <Legend verticalAlign="bottom" />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Detailed Scores */}
              <Card title="题型得分明细" className="lg:col-span-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    { label: '基础选择', score: selectedStudent.choice, max: 30, icon: CheckCircle2 },
                    { label: '现代文阅读', score: selectedStudent.modernReading, max: 30, icon: BookOpen },
                    { label: '文言文阅读', score: selectedStudent.classicReading, max: 20, icon: Library },
                    { label: '非连续文本', score: selectedStudent.nonLinear, max: 10, icon: BrainCircuit },
                    { label: '默写填空', score: selectedStudent.dictation, max: 10, icon: PenTool },
                    { label: '作文', score: selectedStudent.composition, max: 50, icon: Award },
                  ].map(item => (
                    <div key={item.label} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-2">
                        <item.icon className="w-3 h-3" /> {item.label}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-800">{item.score}</span>
                        <span className="text-xs text-slate-400">/ {item.max}</span>
                      </div>
                      <div className="mt-2 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", (item.score/item.max) > 0.8 ? "bg-emerald-500" : (item.score/item.max) > 0.6 ? "bg-amber-500" : "bg-rose-500")} 
                          style={{ width: `${(item.score/item.max)*100}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* AI Prescription */}
              <div className="lg:col-span-3">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="text-white w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-bold">AI 智能学习处方</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border-l-4 border-l-rose-500 border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-rose-500" /> 重点攻坚：文言文断句与实词
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      诊断显示你在“文化传承”维度得分率仅为 {Math.round((selectedStudent.classicReading/20)*100)}%。
                      主要失分点在于文言虚词的用法辨析。建议本周完成《世说新语》选段的精读练习，并整理 20 个核心实词。
                    </p>
                    <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all">
                      获取推荐练习题 <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border-l-4 border-l-indigo-500 border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-indigo-500" /> 进阶建议：作文立意深度
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      你的作文分数（{selectedStudent.composition}/50）处于班级中上游。
                      若想突破 45 分，需在“思维发展”维度加强。建议关注近期社会热点评论，练习从多维度切入论点，提升论证的逻辑严密性。
                    </p>
                    <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all">
                      查看优秀范文解析 <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
