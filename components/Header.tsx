import React, { useRef } from 'react';
import { Download, Upload, Trash2, Activity, ChevronsDown, ChevronsUp } from 'lucide-react';

interface HeaderProps {
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onExport, 
  onImport, 
  onClear,
  onExpandAll,
  onCollapseAll
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
    }
    // Reset value so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <Activity className="w-6 h-6" />
          <span>VertiLine</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          
          {/* Collapse/Expand Controls */}
          <div className="flex bg-slate-100 rounded-lg p-1 mr-2">
            <button
              onClick={onExpandAll}
              className="p-1.5 text-slate-500 hover:text-primary hover:bg-white rounded shadow-sm transition-all"
              title="全部展开"
            >
              <ChevronsDown className="w-4 h-4" />
            </button>
            <div className="w-px bg-slate-200 mx-1 my-0.5"></div>
            <button
              onClick={onCollapseAll}
              className="p-1.5 text-slate-500 hover:text-primary hover:bg-white rounded shadow-sm transition-all"
              title="全部收缩"
            >
              <ChevronsUp className="w-4 h-4" />
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="application/json"
            onChange={handleFileChange}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
            title="Import JSON"
          >
            <Upload className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Import</span>
          </button>

          <button
            onClick={onExport}
            className="p-2 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
            title="Export JSON"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Export</span>
          </button>

          <div className="w-px h-6 bg-slate-300 mx-1"></div>

          <button
            onClick={onClear}
            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Clear All"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;