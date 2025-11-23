
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ZoomIn, ZoomOut, Maximize, Download, FileImage } from 'lucide-react';

interface SVGPreviewProps {
  svgContent: string;
  isLoading?: boolean;
}

const SVGPreview: React.FC<SVGPreviewProps> = ({ svgContent, isLoading }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom when content changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [svgContent]);

  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(0.1, prev + delta), 5));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- Export Logic ---
  const downloadFile = (href: string, filename: string) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSVG = () => {
    if (!svgContent) return;
    // Base64 encode safe for UTF-8
    const base64 = btoa(unescape(encodeURIComponent(svgContent)));
    const href = `data:image/svg+xml;base64,${base64}`;
    downloadFile(href, `tikz_export_${Date.now()}.svg`);
  };

  const handleExportPNG = () => {
    if (!svgContent) return;
    
    // Create an image to render the SVG
    const img = new Image();
    const base64 = btoa(unescape(encodeURIComponent(svgContent)));
    img.src = `data:image/svg+xml;base64,${base64}`;

    img.onload = () => {
        const canvas = document.createElement('canvas');
        // Get dimensions from SVG or default to 800x600 if not set
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgEl = doc.documentElement;
        
        // Ensure explicit width/height
        const width = parseInt(svgEl.getAttribute('width') || '800');
        const height = parseInt(svgEl.getAttribute('height') || '600');
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Fill white background for PNG
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0, width, height);
        
        const href = canvas.toDataURL('image/png');
        downloadFile(href, `tikz_export_${Date.now()}.png`);
    };
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 text-teal-600 animate-spin mb-3" />
        <div className="text-sm font-medium text-slate-500 animate-pulse">Rendering graphics...</div>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white text-slate-400">
        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        </div>
        <p className="text-sm">Preview will appear here</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-white overflow-hidden flex flex-col">
       {/* Toolbar */}
       <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white p-1 rounded-lg shadow-sm border border-slate-200 z-20">
          <button onClick={() => handleZoom(-0.1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Zoom Out">
             <ZoomOut size={16} />
          </button>
          <span className="text-xs font-mono text-slate-500 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => handleZoom(0.1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Zoom In">
             <ZoomIn size={16} />
          </button>
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          <button onClick={handleReset} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Reset View">
             <Maximize size={16} />
          </button>
       </div>

       {/* Export Tools */}
       <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
          <button 
             onClick={handleExportPNG} 
             className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-700 shadow-sm"
          >
             <FileImage size={14} /> PNG
          </button>
          <button 
             onClick={handleExportSVG} 
             className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-700 shadow-sm"
          >
             <Download size={14} /> SVG
          </button>
       </div>

       {/* Canvas Area */}
       <div 
        className="flex-1 overflow-hidden relative cursor-move flex items-center justify-center bg-white"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={containerRef}
       >
          <div 
            className="transition-transform duration-75 ease-out origin-center"
            style={{ 
               transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
       </div>
    </div>
  );
};

export default SVGPreview;
