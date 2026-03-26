import React from 'react';

export function Footer() {
  return (
    <footer className="w-full pt-12 pb-[100px] sm:pb-12 mt-auto border-t border-gray-100 bg-white/40 backdrop-blur-md overflow-hidden relative">
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-green-50/20 rounded-full blur-3xl -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-emerald-50/20 rounded-full blur-3xl -z-10" />
      
      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <p className="text-gray-400 text-[10px] sm:text-xs font-bold tracking-wide leading-relaxed">
            © 2026 جميع الحقوق محفوظة لشركة <a href="https://www.qitaf.tech/" target="_blank" rel="noopener noreferrer" className="text-green-600/90 font-black hover:text-green-700 transition-colors">قِطَاف</a> للتكنولوجيا
          </p>
          
          <div className="flex items-center gap-1.5 opacity-30">
             <div className="w-1 h-1 rounded-full bg-green-600" />
             <div className="w-1 h-1 rounded-full bg-green-400" />
             <div className="w-1 h-1 rounded-full bg-green-200" />
          </div>
        </div>
      </div>
    </footer>
  );
}
