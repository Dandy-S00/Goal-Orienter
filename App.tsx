
import React, { useState, useRef } from 'react';
import { 
  RocketLaunchIcon, 
  ArrowPathIcon, 
  CheckCircleIcon,
  QueueListIcon,
  CpuChipIcon,
  LinkIcon,
  VideoCameraIcon,
  SparklesIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { Task, WorkspaceSummary, AnalysisStep } from './types';
import { generateIntelligentPlan } from './geminiService';

const App: React.FC = () => {
  const [goal, setGoal] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>(AnalysisStep.IDLE);
  const [isPolicyBlocked, setIsPolicyBlocked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const performAnalysis = async (screenshotBase64?: string) => {
    setAnalysisStep(AnalysisStep.ANALYZING);
    try {
      const result = await generateIntelligentPlan(goal, screenshotBase64);
      setTasks(result.tasks);
      setSummary(result.summary);
      setAnalysisStep(AnalysisStep.READY);
      setIsPolicyBlocked(false);
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisStep(AnalysisStep.IDLE);
      alert("AI analysis failed. Please check your network or API key.");
    }
  };

  const captureAndAnalyze = async () => {
    if (!goal) return;
    
    setAnalysisStep(AnalysisStep.CAPTURING);
    setIsPolicyBlocked(false);

    try {
      // Attempt automatic scanning
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      await new Promise(r => setTimeout(r, 500));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const screenshotBase64 = canvas.toDataURL('image/png').split(',')[1];
      stream.getTracks().forEach(track => track.stop());

      await performAnalysis(screenshotBase64);
    } catch (error: any) {
      console.error("Capture failed:", error);
      // Specifically handle permission policy errors
      if (error.name === 'NotAllowedError' || error.message.includes('disallowed by permissions policy')) {
        setIsPolicyBlocked(true);
        setAnalysisStep(AnalysisStep.IDLE);
      } else {
        setAnalysisStep(AnalysisStep.IDLE);
        alert("Could not capture screen. You may need to grant permissions in your browser.");
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        await performAnalysis(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
    ));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 selection:bg-indigo-100">
      {/* Sidebar - Goal Focus */}
      <aside className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col p-8 sticky top-0 h-auto md:h-screen">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-100">
            <CpuChipIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Aura Task Engine</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Autonomous Goal Mapping</p>
          </div>
        </div>

        <div className="space-y-8 flex-grow">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">
              <SparklesIcon className="w-4 h-4" />
              Your Objective
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ex: 'Build a marketing landing page' or 'Prepare my tax returns'..."
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition-all outline-none resize-none h-48 leading-relaxed shadow-inner"
            />
          </div>

          {isPolicyBlocked ? (
            <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-2 mb-2 text-amber-700">
                <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                <h4 className="text-xs font-bold uppercase">Policy Restriction</h4>
              </div>
              <p className="text-xs text-amber-600 leading-relaxed mb-4">
                Your environment's security policy prevents automatic screen capture. Please upload a screenshot manually to proceed.
              </p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-white border border-amber-200 text-amber-700 rounded-2xl text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
              >
                <PhotoIcon className="w-4 h-4" />
                Upload Screenshot
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
              <h4 className="text-xs font-bold text-indigo-600 uppercase mb-2">Automated Scanning</h4>
              <p className="text-xs text-indigo-500/80 leading-relaxed">
                When you start, Aura will request to see your workspace to identify open apps and helpful resources automatically.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={captureAndAnalyze}
          disabled={!goal || (analysisStep !== AnalysisStep.IDLE && analysisStep !== AnalysisStep.READY)}
          className={`mt-8 w-full py-5 rounded-[2rem] font-bold flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-2xl ${
            analysisStep === AnalysisStep.IDLE || analysisStep === AnalysisStep.READY
              ? 'bg-slate-900 text-white hover:bg-black shadow-slate-200' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          {analysisStep === AnalysisStep.IDLE || analysisStep === AnalysisStep.READY ? (
            <>
              <VideoCameraIcon className="w-5 h-5" />
              Scan & Plan Goal
            </>
          ) : (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              {analysisStep === AnalysisStep.CAPTURING ? 'Capturing Workspace...' : 'AI is Thinking...'}
            </>
          )}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-6 md:p-12 overflow-y-auto max-h-screen">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 flex items-center justify-center mb-8 animate-bounce duration-[2000ms]">
              <RocketLaunchIcon className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Zero configuration. Total focus.</h2>
            <p className="text-slate-500 leading-relaxed">
              Enter your goal and let Aura handle the breakdown. We'll find the right web tools and create a customized roadmap based on what you're currently working on.
            </p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-12 pb-20">
            {/* Header / Summary */}
            {summary && (
              <header className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                    <SparklesIcon className="w-32 h-32" />
                  </div>
                  <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">AI Context Synthesis</h3>
                  <p className="text-2xl font-bold text-slate-800 leading-tight mb-6">
                    {summary.intent}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {summary.detectedApps.map((app, i) => (
                      <span key={i} className="px-4 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-full border border-slate-100 uppercase">
                        {app}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                  <div className="relative z-10">
                    <h4 className="text-xs font-bold text-indigo-300 uppercase mb-6 flex items-center gap-2">
                      <GlobeAltIcon className="w-4 h-4" />
                      Recommended Resources
                    </h4>
                    <ul className="space-y-4">
                      {summary.resources.map((res, i) => (
                        <li key={i}>
                          <a 
                            href={res.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 group/link hover:text-indigo-300 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                              <LinkIcon className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium truncate">{res.title}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </header>
            )}

            {/* Task View */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
              <div className="xl:col-span-7 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                      <QueueListIcon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Strategy Roadmap</h3>
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-slate-100">
                    {tasks.filter(t => t.status === 'completed').length} / {tasks.length} Done
                  </span>
                </div>

                <div className="space-y-4">
                  {tasks.map((task, idx) => (
                    <div 
                      key={task.id} 
                      className={`group bg-white p-6 rounded-[2.5rem] border transition-all duration-500 ${
                        task.status === 'completed' 
                          ? 'border-emerald-100 opacity-60 scale-[0.98]' 
                          : 'border-slate-100 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/40'
                      }`}
                    >
                      <div className="flex items-start gap-6">
                        <button 
                          onClick={() => toggleTask(task.id)}
                          className={`mt-1.5 w-8 h-8 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 transform active:scale-90 ${
                            task.status === 'completed' 
                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                              : 'border-slate-200 group-hover:border-indigo-400 text-transparent'
                          }`}
                        >
                          <CheckCircleIcon className="w-5 h-5" />
                        </button>
                        <div className="flex-grow">
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 block">{task.category}</span>
                          <h4 className={`text-lg font-bold mb-2 transition-all ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {task.title}
                          </h4>
                          <p className={`text-sm mb-6 leading-relaxed ${task.status === 'completed' ? 'text-slate-300' : 'text-slate-500'}`}>
                            {task.description}
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {task.steps.map((step, sIdx) => (
                              <div key={sIdx} className="flex items-center gap-3 text-[11px] font-medium text-slate-500 bg-slate-50/80 p-3 rounded-2xl group-hover:bg-indigo-50/50 transition-colors border border-transparent group-hover:border-indigo-100/50">
                                <span className="w-5 h-5 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm shrink-0">
                                  {sIdx + 1}
                                </span>
                                {step}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Guidance Sidepanel */}
              <div className="xl:col-span-5 space-y-8">
                 <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-violet-900 p-10 rounded-[3.5rem] text-white shadow-3xl shadow-indigo-200 sticky top-12">
                   <div className="mb-10">
                      <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 backdrop-blur-md">
                        <SparklesIcon className="w-3 h-3 text-indigo-300" />
                        Next Best Action
                      </div>
                      <h2 className="text-3xl font-extrabold leading-tight">
                        {tasks.find(t => t.status === 'pending')?.title || "Roadmap Complete!"}
                      </h2>
                      <p className="text-indigo-100/80 mt-4 text-sm leading-relaxed">
                        {tasks.find(t => t.status === 'pending') 
                          ? "This step aligns perfectly with your active browser context. Finish this to gain significant momentum."
                          : "You've crushed your goal. Take a moment to review and archive this strategy."}
                      </p>
                   </div>

                   <div className="space-y-6">
                      <div className="flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/10">
                        <div className="space-y-1">
                          <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Success Metric</p>
                          <p className="text-sm font-medium">Verified by Gemini Search</p>
                        </div>
                        <CheckCircleIcon className="w-10 h-10 text-indigo-400/50" />
                      </div>

                      <button 
                        onClick={() => {
                          const next = tasks.find(t => t.status === 'pending');
                          if (next) toggleTask(next.id);
                        }}
                        className="w-full bg-white text-indigo-900 py-5 rounded-[2rem] font-black text-sm hover:bg-indigo-50 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                      >
                        Execute Next Step
                        <RocketLaunchIcon className="w-5 h-5" />
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
};

export default App;
