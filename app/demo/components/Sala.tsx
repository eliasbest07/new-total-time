"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Calendar, User } from "lucide-react";

interface Comentario {
    id: number;
    autor: string;
    avatar?: string;
    contenido: string;
    fecha: Date;
    respuestas?: number;
}

interface SalaData {
    id: number;
    nombre: string;
    descripcion: string;
    fechaCreacion: Date;
    totalComentarios: number;
    comentarios: Comentario[];
}

// Mock data
const salaDataMock: SalaData = {
    id: 1,
    nombre: "Desarrollo Frontend",
    descripcion: "Espacio dedicado al desarrollo de interfaces de usuario, discusión de mejores prácticas en React, Next.js y tecnologías frontend. Aquí compartimos avances, resolvemos dudas técnicas y colaboramos en proyectos de interfaz.",
    fechaCreacion: new Date("2024-01-15"),
    totalComentarios: 47,
    comentarios: [
        {
            id: 1,
            autor: "María González",
            avatar: "MG",
            contenido: "¿Alguien ha probado la nueva versión de Next.js 14? He visto que tiene mejoras significativas en el App Router.",
            fecha: new Date("2024-03-15T10:30:00"),
            respuestas: 3
        },
        {
            id: 2,
            autor: "Carlos Ruiz",
            avatar: "CR",
            contenido: "Estoy trabajando en la implementación del nuevo sistema de autenticación. ¿Qué opinan de usar Supabase vs Auth0?",
            fecha: new Date("2024-03-14T16:45:00"),
            respuestas: 7
        },
        {
            id: 3,
            autor: "Ana Martínez",
            avatar: "AM",
            contenido: "He terminado el componente de dashboard. Pueden revisarlo en la rama feature/dashboard-ui. Feedback bienvenido!",
            fecha: new Date("2024-03-14T14:20:00"),
            respuestas: 2
        },
        {
            id: 4,
            autor: "Diego López",
            avatar: "DL",
            contenido: "Propongo hacer una sesión de code review el viernes. Tenemos varios PRs pendientes que necesitan revisión.",
            fecha: new Date("2024-03-13T11:15:00"),
            respuestas: 5
        },
        {
            id: 5,
            autor: "Laura Silva",
            avatar: "LS",
            contenido: "¿Han notado problemas de performance en la página de productos? Creo que necesitamos optimizar las imágenes.",
            fecha: new Date("2024-03-13T09:30:00"),
            respuestas: 4
        },
        {
            id: 6,
            autor: "Roberto Chen",
            avatar: "RC",
            contenido: "Actualicé la documentación del proyecto. Ahora incluye guías de setup y mejores prácticas de desarrollo.",
            fecha: new Date("2024-03-12T17:00:00"),
            respuestas: 1
        },
        {
            id: 7,
            autor: "Sofia Herrera",
            avatar: "SH",
            contenido: "El nuevo diseño del sistema de notificaciones está listo. ¿Podemos agendar una reunión para revisarlo?",
            fecha: new Date("2024-03-12T13:45:00"),
            respuestas: 6
        },
        {
            id: 8,
            autor: "Miguel Torres",
            avatar: "MT",
            contenido: "Encontré un bug en el formulario de registro. Ya tengo la solución, subiré el fix en unas horas.",
            fecha: new Date("2024-03-11T20:30:00"),
            respuestas: 2
        }
    ]
};

export default function Sala() {
    const [currentPage, setCurrentPage] = useState(1);
    const comentariosPorPagina = 3;

    const totalPaginas = Math.ceil(salaDataMock.comentarios.length / comentariosPorPagina);
    const indiceInicio = (currentPage - 1) * comentariosPorPagina;
    const indiceFin = indiceInicio + comentariosPorPagina;
    const comentariosActuales = salaDataMock.comentarios.slice(indiceInicio, indiceFin);

    const irAPaginaAnterior = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const irAPaginaSiguiente = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPaginas));
    };

    const formatearFecha = (fecha: Date) => {
        return fecha.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header de la sala */}
            <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">💻</span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {salaDataMock.nombre}
                            </h1>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed mb-3">
                            {salaDataMock.descripcion}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Creada el {formatearFecha(salaDataMock.fechaCreacion)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                <span>{salaDataMock.totalComentarios} comentarios</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>8 miembros activos</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de comentarios */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Conversaciones Recientes</h2>
                    <p className="text-sm text-gray-600">Últimas actualizaciones y discusiones del equipo</p>
                </div>

                <div className="space-y-4">
                    {comentariosActuales.map((comentario) => (
                        <div key={comentario.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300">
                            <div className="flex items-start gap-3">
                                {/* Avatar */}
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                                    {comentario.avatar}
                                </div>

                                {/* Contenido del comentario */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-semibold text-gray-900 text-sm">
                                            {comentario.autor}
                                        </span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                            {formatearFecha(comentario.fecha)}
                                        </span>
                                    </div>

                                    <p className="text-gray-700 text-sm leading-relaxed mb-3">
                                        {comentario.contenido}
                                    </p>

                                    <div className="flex items-center gap-3">
                                        {comentario.respuestas && comentario.respuestas > 0 && (
                                            <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full transition-colors">
                                                <MessageCircle className="w-3 h-3" />
                                                {comentario.respuestas} respuesta{comentario.respuestas !== 1 ? 's' : ''}
                                            </button>
                                        )}
                                        <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors">
                                            👍 Me gusta
                                        </button>
                                        <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors">
                                            💬 Responder
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Paginación */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Mostrando <span className="font-medium">{indiceInicio + 1}-{Math.min(indiceFin, salaDataMock.comentarios.length)}</span> de <span className="font-medium">{salaDataMock.comentarios.length}</span> comentarios
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={irAPaginaAnterior}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1 px-4 py-2 text-sm bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 border border-gray-200 rounded-lg transition-colors shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Anterior
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
                                <button
                                    key={pagina}
                                    onClick={() => setCurrentPage(pagina)}
                                    className={`w-10 h-10 text-sm rounded-lg transition-colors shadow-sm ${pagina === currentPage
                                        ? 'bg-blue-500 text-white border border-blue-500'
                                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                                        }`}
                                >
                                    {pagina}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={irAPaginaSiguiente}
                            disabled={currentPage === totalPaginas}
                            className="flex items-center gap-1 px-4 py-2 text-sm bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 border border-gray-200 rounded-lg transition-colors shadow-sm"
                        >
                            Siguiente
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}