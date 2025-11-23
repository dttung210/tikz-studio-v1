import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  label?: string;
  className?: string;
  editable?: boolean;
  onChange?: (val: string) => void;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ code, label, className = "", editable = false, onChange }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col h-full bg-[#1e1e2e] ${className}`}>
      {label && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#252535] border-b border-[#303040] shrink-0">
          <span className="text-xs font-semibold text-slate-400 font-mono">{label}</span>
          <button 
            onClick={handleCopy}
            className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white"
            title="Copy"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>
      )}
      
      <div className="relative flex-grow min-h-0 group">
        {editable ? (
             <textarea 
             className="w-full h-full p-4 font-mono text-[13px] leading-6 bg-[#1e1e2e] text-[#a6accd] resize-none focus:outline-none selection:bg-indigo-500/30"
             value={code}
             onChange={(e) => onChange && onChange(e.target.value)}
             spellCheck={false}
             placeholder="// Enter TikZ code here..."
           />
        ) : (
            <pre className="w-full h-full p-4 font-mono text-[13px] leading-6 bg-[#1e1e2e] text-[#a6accd] overflow-auto whitespace-pre-wrap">
            {code}
            </pre>
        )}
        
        {/* Copy button overlay if no label bar */}
        {!label && (
             <button 
             onClick={handleCopy}
             className="absolute top-2 right-2 p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
             title="Copy Code"
           >
             {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
           </button>
        )}
      </div>
    </div>
  );
};

export default CodeViewer;