'use client';

interface BotonMenuDashboardProps {
  onClick: () => void;
}

const BotonMenuDashboard = ({ onClick }: BotonMenuDashboardProps) => {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 right-4 w-14 h-14 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl z-50 group hover:scale-105"
    >
      <div className="flex flex-col gap-1.5 group-hover:gap-2 transition-all duration-200">
        <div className="w-6 h-0.5 bg-white rounded-full"></div>
        <div className="w-6 h-0.5 bg-white rounded-full"></div>
        <div className="w-6 h-0.5 bg-white rounded-full"></div>
      </div>
    </button>
  );
};

export default BotonMenuDashboard;