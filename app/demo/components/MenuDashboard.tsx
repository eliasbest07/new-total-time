'use client';

interface MenuDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
    onConfiguracion: () => void;
}

const MenuDashboard = ({ isOpen, onClose, onLogout, onConfiguracion }: MenuDashboardProps) => {
    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity duration-300 animate-in fade-in"
                    onClick={onClose}
                />
            )}

            {/* Menu lateral */}
            <div className={`
                fixed top-0 right-0 h-full w-80 max-w-[85vw] sm:max-w-[90vw]
                bg-white/10 backdrop-blur-md border-l border-white/20
                shadow-2xl z-[9999] 
                transform transition-all duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                {/* Header del menú */}
                <div className="p-4 sm:p-6 border-b border-white/20 bg-gradient-to-r from-white/5 to-white/10">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-white text-lg sm:text-xl font-semibold">Menú</h2>
                            <p className="text-white/60 text-xs sm:text-sm">Opciones de usuario</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/70 hover:text-white text-xl sm:text-2xl transition-all duration-200 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/10 hover:rotate-90"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Contenido del menú */}
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                    {/* Botón Dashboard */}
                    <button
                        onClick={onClose}
                        className="w-full bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-200 flex items-center gap-3 sm:gap-4 group hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl flex items-center justify-center group-hover:from-blue-500/40 group-hover:to-purple-500/40 transition-all duration-200 flex-shrink-0">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </div>
                        <div className="text-left min-w-0 flex-1">
                            <p className="font-semibold text-sm sm:text-base">Dashboard</p>
                            <p className="text-white/70 text-xs sm:text-sm">Vista principal</p>
                        </div>
                        <div className="ml-auto flex-shrink-0">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/50 group-hover:text-white/80 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>

                    {/* Botón Configuración */}
                    <button
                        onClick={onConfiguracion}
                        className="w-full bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-200 flex items-center gap-3 sm:gap-4 group hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500/30 to-teal-500/30 rounded-xl flex items-center justify-center group-hover:from-green-500/40 group-hover:to-teal-500/40 transition-all duration-200 flex-shrink-0">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div className="text-left min-w-0 flex-1">
                            <p className="font-semibold text-sm sm:text-base">Configuración</p>
                            <p className="text-white/70 text-xs sm:text-sm">Ajustes de la cuenta</p>
                        </div>
                        <div className="ml-auto flex-shrink-0">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/50 group-hover:text-white/80 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>

                    {/* Botón Perfil */}
                    <button
                        className="w-full bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-200 flex items-center gap-3 sm:gap-4 group hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500/30 to-pink-500/30 rounded-xl flex items-center justify-center group-hover:from-orange-500/40 group-hover:to-pink-500/40 transition-all duration-200 flex-shrink-0">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div className="text-left min-w-0 flex-1">
                            <p className="font-semibold text-sm sm:text-base">Mi Perfil</p>
                            <p className="text-white/70 text-xs sm:text-sm">Información personal</p>
                        </div>
                        <div className="ml-auto flex-shrink-0">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/50 group-hover:text-white/80 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>

                    {/* Separador */}
                    <div className="border-t border-white/20 my-4 sm:my-6"></div>

                    {/* Botón Logout */}
                    <button
                        onClick={onLogout}
                        className="w-full bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-200 flex items-center gap-3 sm:gap-4 group hover:scale-[1.02] active:scale-[0.98] border border-red-500/30 hover:border-red-500/50"
                    >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500/30 to-red-600/30 rounded-xl flex items-center justify-center group-hover:from-red-500/40 group-hover:to-red-600/40 transition-all duration-200 flex-shrink-0">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <div className="text-left min-w-0 flex-1">
                            <p className="font-semibold text-sm sm:text-base">Cerrar Sesión</p>
                            <p className="text-white/70 text-xs sm:text-sm">Salir de la aplicación</p>
                        </div>
                    </button>
                </div>

                {/* Footer del menú */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 border-t border-white/20 bg-gradient-to-t from-white/5 to-transparent">
                    <div className="text-center text-white/50 text-xs sm:text-sm space-y-1">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-white/70 text-xs sm:text-sm">En línea</span>
                        </div>
                        <p className="font-medium">Dashboard v1.0</p>
                        <p>BTM Studio</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MenuDashboard;