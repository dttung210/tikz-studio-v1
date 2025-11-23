
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  PenTool, 
  Image as ImageIcon, 
  Code as CodeIcon, 
  Send, 
  Sparkles, 
  Upload, 
  AlertCircle,
  Wand2,
  ChevronRight,
  RefreshCw,
  Download,
  Play,
  Table,
  LineChart
} from 'lucide-react';
import { AppTab, TikZResponse } from './types';
import * as GeminiService from './services/geminiService';
import Button from './components/Button';
import CodeViewer from './components/CodeViewer';
import SVGPreview from './components/SVGPreview';

const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.TEXT_TO_TIKZ);
  
  // App Logic State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [currentResponse, setCurrentResponse] = useState<TikZResponse | null>(null);
  const [inputText, setInputText] = useState("");
  const [refinementText, setRefinementText] = useState("");
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [editorCode, setEditorCode] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync editor code when response changes
  useEffect(() => {
    if (currentResponse?.tikzCode) {
      setEditorCode(currentResponse.tikzCode);
    }
  }, [currentResponse]);

  // --- Handlers ---

  const resetState = (tab: AppTab) => {
    setActiveTab(tab);
    setCurrentResponse(null);
    setInputText("");
    setInputImage(null);
    setError(null);
    setEditorCode("");
  };

  const handleTextSubmit = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Pass the activeTab as mode to the service
      const result = await GeminiService.generateTikZFromText(inputText, undefined, activeTab);
      setCurrentResponse(result);
    } catch (err: any) {
      setError(err.message || "Failed to generate TikZ");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        setInputImage(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (activeTab !== AppTab.IMAGE_TO_TIKZ) return;
    
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setInputImage(base64.split(',')[1]);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  }, [activeTab]);

  const handleImageSubmit = async () => {
    if (!inputImage) return;
    setLoading(true);
    setError(null);
    try {
      const result = await GeminiService.generateTikZFromImage(inputImage, inputText);
      setCurrentResponse(result);
    } catch (err: any) {
      setError(err.message || "Failed to analyze image");
    } finally {
      setLoading(false);
    }
  };

  const handleManualRender = async () => {
    if (!editorCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await GeminiService.previewTikZ(editorCode);
      setCurrentResponse(result);
    } catch (err: any) {
      setError(err.message || "Failed to render TikZ");
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refinementText.trim()) return;
    
    const codeToRefine = editorCode || currentResponse?.tikzCode;

    if (!codeToRefine && activeTab !== AppTab.TIKZ_PREVIEW) return;

    setLoading(true);
    setError(null);
    try {
      let result;
      if (activeTab === AppTab.TIKZ_PREVIEW && !currentResponse) {
         result = await GeminiService.generateTikZFromText(refinementText, editorCode, AppTab.TEXT_TO_TIKZ);
      } else {
         result = await GeminiService.generateTikZFromText(refinementText, codeToRefine, activeTab);
      }
      
      setCurrentResponse(result);
      setRefinementText("");
    } catch (err: any) {
      setError(err.message || "Failed to refine TikZ");
    } finally {
      setLoading(false);
    }
  };

  // --- UI Components ---

  const renderSidebar = () => (
    <div className="w-16 md:w-64 bg-white text-slate-600 flex flex-col justify-between shrink-0 transition-all duration-300 border-r border-slate-200 z-20 shadow-sm">
      <div>
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-100">
          <div className="h-8 w-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold mr-0 md:mr-3 shrink-0 shadow-lg shadow-teal-600/20">
            T
          </div>
          <span className="hidden md:block font-bold text-slate-800 text-lg tracking-tight">TikZ Studio</span>
        </div>
        
        <nav className="p-2 space-y-1 mt-4">
          {[
            { id: AppTab.TEXT_TO_TIKZ, icon: PenTool, label: 'Text to TikZ' },
            { id: AppTab.VARIATION_TABLE, icon: Table, label: 'Variation Table' },
            { id: AppTab.FUNCTION_GRAPH, icon: LineChart, label: 'Function Graph' },
            { id: AppTab.IMAGE_TO_TIKZ, icon: ImageIcon, label: 'Image to TikZ' },
            { id: AppTab.TIKZ_PREVIEW, icon: CodeIcon, label: 'TikZ Editor' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => resetState(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative
                ${activeTab === item.id 
                  ? 'bg-teal-50 text-teal-700 font-medium' 
                  : 'hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <item.icon size={20} className={activeTab === item.id ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600"} />
              <span className="hidden md:block">{item.label}</span>
              {activeTab === item.id && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-teal-600 rounded-l hidden md:block" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 hidden md:block border-t border-slate-100 bg-slate-50/50">
        <div className="text-xs text-slate-500 font-mono">
          <p>Model: Gemini 2.5 Flash</p>
          <p className="mt-1 opacity-70">v1.5.1 • Online</p>
        </div>
      </div>
    </div>
  );

  // Helper: Is the user in "Workspace Mode"
  const isWorkspaceMode = !!currentResponse || activeTab === AppTab.TIKZ_PREVIEW;

  // Helper: Get Hero Text based on Tab
  const getHeroInfo = () => {
    switch (activeTab) {
      case AppTab.VARIATION_TABLE:
        return { title: "Create Variation Tables", subtitle: "Describe your function (e.g. 'y = x^3 - 3x') to generate a complete variation table." };
      case AppTab.FUNCTION_GRAPH:
        return { title: "Plot Functions", subtitle: "Draw mathematical function graphs with axes, grids, and labels." };
      case AppTab.IMAGE_TO_TIKZ:
        return { title: "Vision to TikZ", subtitle: "Upload an image of a diagram to convert it into LaTeX code." };
      default:
        return { title: "What do you want to draw?", subtitle: "Describe your geometric figure, graph, or diagram in natural language." };
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans text-slate-900 overflow-hidden" onPaste={handlePaste}>
      {renderSidebar()}
      
      <main className="flex-1 flex flex-col h-full relative min-w-0 bg-slate-50/30">
        
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
             <span className="font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                {activeTab === AppTab.TEXT_TO_TIKZ && "Creation Mode"}
                {activeTab === AppTab.VARIATION_TABLE && "Table Mode"}
                {activeTab === AppTab.FUNCTION_GRAPH && "Graph Mode"}
                {activeTab === AppTab.IMAGE_TO_TIKZ && "Vision Mode"}
                {activeTab === AppTab.TIKZ_PREVIEW && "Editor Mode"}
             </span>
             {isWorkspaceMode && (
               <>
                 <ChevronRight size={14} />
                 <span>Workspace</span>
               </>
             )}
          </div>
          <div className="flex items-center gap-3">
             {isWorkspaceMode && (
                <Button 
                  onClick={() => resetState(activeTab)} 
                  variant="ghost" 
                  className="!py-1 !px-2 text-xs h-8 text-slate-500 hover:text-teal-600"
                  title="Clear Workspace"
                >
                  <RefreshCw size={14} className="mr-1"/> Reset
                </Button>
             )}
             {!process.env.API_KEY && (
               <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-medium flex items-center border border-red-100">
                 <AlertCircle size={12} className="mr-1"/> API Key Missing
               </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          
          {/* STATE 1: HERO INPUT (Initial State for Text/Image) */}
          {!isWorkspaceMode && (
            <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center animate-in fade-in duration-500 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-50/50 via-transparent to-transparent">
              <div className="max-w-2xl w-full">
                
                {/* Text Input Hero (Shared for Text, Table, Graph) */}
                {activeTab !== AppTab.IMAGE_TO_TIKZ && activeTab !== AppTab.TIKZ_PREVIEW && (
                  <div className="text-center space-y-8">
                    <div className="space-y-2">
                       <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{getHeroInfo().title}</h2>
                       <p className="text-slate-500">{getHeroInfo().subtitle}</p>
                    </div>
                    <div className="bg-white p-2 rounded-2xl shadow-xl shadow-teal-900/5 border border-slate-200 focus-within:ring-4 focus-within:ring-teal-100 transition-all">
                      <textarea 
                        className="w-full h-32 p-4 border-none focus:ring-0 resize-none text-lg text-slate-700 placeholder-slate-300"
                        placeholder={activeTab === AppTab.VARIATION_TABLE ? "e.g. Hàm số y = x^3 - 3x + 1 trên đoạn [-2, 2]" : "e.g. A red triangle ABC..."}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); }}}
                      />
                      <div className="px-2 pb-2 flex justify-between items-center border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-400 font-medium px-2">Press Enter to generate</span>
                        <Button onClick={handleTextSubmit} isLoading={loading} className="rounded-xl px-6 bg-teal-600 hover:bg-teal-700 text-white">
                           Generate <Sparkles size={16} className="ml-2"/>
                        </Button>
                      </div>
                    </div>
                    {error && (
                       <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start text-left animate-in slide-in-from-bottom-2">
                          <AlertCircle size={16} className="mr-2 mt-0.5 shrink-0"/>
                          <div>
                             <p className="font-semibold">Generation Failed</p>
                             <p>{error}</p>
                          </div>
                       </div>
                    )}
                  </div>
                )}

                {/* Image Input Hero */}
                {activeTab === AppTab.IMAGE_TO_TIKZ && (
                   <div className="text-center space-y-8">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{getHeroInfo().title}</h2>
                        <p className="text-slate-500">{getHeroInfo().subtitle}</p>
                      </div>
                      
                      <div className="bg-white rounded-2xl shadow-xl shadow-teal-900/5 border border-slate-200 overflow-hidden">
                         <div 
                            className={`p-10 border-b border-slate-100 flex flex-col items-center justify-center cursor-pointer transition-colors ${!inputImage ? 'hover:bg-slate-50' : 'bg-slate-50'}`}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {inputImage ? (
                               <div className="relative group">
                                 <img src={`data:image/png;base64,${inputImage}`} className="max-h-64 rounded-lg shadow-sm" alt="Upload" />
                                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                    <p className="text-white font-medium">Change Image</p>
                                 </div>
                               </div>
                            ) : (
                              <>
                                <div className="h-16 w-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-4">
                                  <Upload size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">Click to upload or drag & drop</h3>
                                <p className="text-sm text-slate-400 mt-2">Supports PNG, JPG (Ctrl+V to paste)</p>
                              </>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                         </div>
                         
                         <div className="p-4 bg-slate-50/50">
                            <div className="flex gap-2">
                               <input 
                                 type="text" 
                                 className="flex-1 bg-white border border-slate-200 rounded-lg px-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                 placeholder="Optional: Add instructions (e.g., 'Make lines thicker')"
                                 value={inputText}
                                 onChange={(e) => setInputText(e.target.value)}
                               />
                               <Button onClick={handleImageSubmit} disabled={!inputImage} isLoading={loading} className="bg-teal-600 hover:bg-teal-700 text-white">
                                  Convert <Wand2 size={16} className="ml-2" />
                               </Button>
                            </div>
                         </div>
                      </div>
                       {error && (
                         <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start text-left animate-in slide-in-from-bottom-2">
                            <AlertCircle size={16} className="mr-2 mt-0.5 shrink-0"/>
                            <div>
                               <p className="font-semibold">Processing Failed</p>
                               <p>{error}</p>
                            </div>
                         </div>
                      )}
                   </div>
                )}
              </div>
            </div>
          )}

          {/* STATE 2: WORKSPACE (Split View) */}
          {isWorkspaceMode && (
             <div className="flex-1 flex flex-col h-full overflow-hidden">
                
                {/* Main Split Area */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                   
                   {/* Left: Code Editor */}
                   <div className="h-1/2 lg:h-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-[#1e1e2e]">
                      <div className="h-10 bg-[#252535] flex items-center justify-between px-4 border-b border-[#303040] shrink-0">
                         <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                           <CodeIcon size={12} /> TEH_TIKZ_SOURCE.tex
                         </span>
                         <div className="flex items-center gap-2">
                            <button 
                              onClick={handleManualRender}
                              className="text-xs bg-teal-600 hover:bg-teal-500 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                              title="Render current code (Ctrl+Enter)"
                            >
                              <Play size={10} fill="currentColor" /> Run
                            </button>
                         </div>
                      </div>
                      <div className="flex-1 relative overflow-hidden">
                         <CodeViewer 
                            code={editorCode} 
                            editable={true} 
                            onChange={setEditorCode} 
                            className="h-full border-none rounded-none"
                            label="" 
                         />
                      </div>
                   </div>

                   {/* Right: Preview */}
                   <div className="h-1/2 lg:h-full lg:w-1/2 flex flex-col bg-slate-100">
                      <div className="h-10 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
                         <span className="text-xs font-bold text-teal-600 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-teal-500"></span> Preview
                         </span>
                      </div>
                      <div className="flex-1 overflow-hidden relative bg-white">
                         <SVGPreview 
                            svgContent={currentResponse?.svgPreview || ""} 
                            isLoading={loading} 
                         />
                      </div>
                   </div>
                </div>

                {/* Bottom: Refinement Bar */}
                <div className="h-auto bg-white border-t border-slate-200 p-4 shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                   <div className="max-w-4xl mx-auto flex gap-3">
                      <div className="flex-1 relative">
                         <input 
                           type="text" 
                           className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none"
                           placeholder={activeTab === AppTab.TIKZ_PREVIEW && !currentResponse ? "Describe what to draw..." : "Ask AI to refine (e.g., 'Change the color to blue', 'Rotate by 90 deg')"}
                           value={refinementText}
                           onChange={(e) => setRefinementText(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                         />
                         <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hidden sm:block">
                            ↵ Enter
                         </div>
                      </div>
                      <Button onClick={handleRefine} isLoading={loading} className="px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white">
                        {loading ? "Working..." : <Send size={18} />}
                      </Button>
                   </div>
                   {error && (
                      <div className="max-w-4xl mx-auto mt-2 text-xs text-red-500 flex items-center">
                         <AlertCircle size={12} className="mr-1" /> {error}
                      </div>
                   )}
                </div>

             </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
