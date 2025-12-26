'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Bug, Target } from 'lucide-react';

interface DiagnosticoResultado {
  paso: string;
  estado: 'success' | 'warning' | 'error' | 'info';
  mensaje: string;
  detalles?: any;
}

interface MisionCardDebug {
  cardId: string;
  cardType: string;
  title: string;
  idMision: number | null;
  misionActiva?: {
    id: string;
    estado: string;
    isRunning: boolean;
    captureNow: string | null;
    fechaUltimoCapture: string | null;
  } | null;
}

interface ProyectoCardDebug {
  cardId: string;
  cardUUID: string;
  cardType: string;
  title: string;
  hasProyectoData: boolean;
  proyectoId: number | null;
  proyectoNombre: string | null;
  hasRelacionEnBD: boolean;
  relacionEnBD?: {
    id_card: string;
    id_proyecto: number;
  } | null;
  recursosCount?: number;
}

export default function DiagnosticoPizarra() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<DiagnosticoResultado[]>([]);
  const [misionCards, setMisionCards] = useState<MisionCardDebug[]>([]);
  const [proyectoCards, setProyectoCards] = useState<ProyectoCardDebug[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState<'misiones' | 'proyectos'>('proyectos');

  // Diagnóstico de misiones en tiempo real
  const diagnosticarMisiones = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const misionCardsData: MisionCardDebug[] = [];
      let allCards: any[] = [];

      // 1. Buscar en pizarra personal (tabla cards)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fin = new Date();
      fin.setHours(23, 59, 59, 999);

      const { data: pizarraPersonal } = await supabase
        .from('pizarras')
        .select('id')
        .eq('id_usuario', user.id)
        .gte('created_at', hoy.toISOString())
        .lte('created_at', fin.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pizarraPersonal) {
        const { data: cardsPersonales } = await supabase
          .from('cards')
          .select('*')
          .eq('id_pizarra', pizarraPersonal.id);

        if (cardsPersonales) {
          allCards.push(...cardsPersonales);
        }
      }

      // 2. Buscar en pizarra de organización (campo cards JSON)
      const { data: pizarraOrg } = await supabase
        .from('pizarras_organizacion')
        .select('id, cards')
        .limit(1)
        .maybeSingle();

      if (pizarraOrg?.cards) {
        const cardsOrg = pizarraOrg.cards as any[];
        allCards.push(...cardsOrg);
      }

      // 3. Filtrar cards de tipo misión (más tipos posibles)
      const misionTypeCards = allCards.filter(c =>
        c.type === 'mision' || 
        c.type === 'mision-organizacion' ||
        c.type === 'actividad' ||
        c.type === 'actividad-organizacion' ||
        (c.misionData && c.misionData.id_mision)
      );

      for (const card of misionTypeCards) {
        // Buscar id_mision en diferentes lugares
        const idMision = card.misionData?.id_mision || 
                         card.activityData?.id_mision ||
                         card.data?.id_mision ||
                         null;

        let misionActivaData = null;

        if (idMision) {
          // Buscar en misiones_activas (tanto mision como actividad)
          const { data: misionActiva } = await supabase
            .from('misiones_activas')
            .select('id, estado, is_running, capture_now, fecha_ultimo_capture')
            .or(`and(tipo.eq.mision,id_referencia.eq.${idMision}),and(tipo.eq.actividad,id_referencia.eq.${idMision})`)
            .maybeSingle();

          if (misionActiva) {
            misionActivaData = {
              id: misionActiva.id,
              estado: misionActiva.estado,
              isRunning: misionActiva.is_running,
              captureNow: misionActiva.capture_now,
              fechaUltimoCapture: misionActiva.fecha_ultimo_capture
            };
          }
        }

        misionCardsData.push({
          cardId: card.id || 'sin-id',
          cardType: card.type,
          title: card.title || card.misionData?.title || card.activityData?.title || 'Sin título',
          idMision: idMision,
          misionActiva: misionActivaData
        });
      }

      setMisionCards(misionCardsData);
    } catch (error) {
      console.error('Error diagnosticando misiones:', error);
    }
  };

  // Diagnóstico de proyectos en tiempo real
  const diagnosticarProyectos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const proyectoCardsData: ProyectoCardDebug[] = [];

      // 1. Obtener el usuario para saber su organización
      const { data: usuarioData } = await supabase
        .from('usuario')
        .select('id_organizacion')
        .eq('user_auth', user.id)
        .maybeSingle();

      if (!usuarioData?.id_organizacion) {
        console.log('🔍 [DEBUG] Usuario sin organización');
        setProyectoCards([]);
        return;
      }

      // 2. Buscar la pizarra de organización
      const { data: pizarraOrg } = await supabase
        .from('pizarras_organizacion')
        .select('id')
        .eq('id_organizacion', usuarioData.id_organizacion)
        .maybeSingle();

      if (!pizarraOrg) {
        console.log('🔍 [DEBUG] No hay pizarra de organización');
        setProyectoCards([]);
        return;
      }

      console.log('🔍 [DEBUG] Pizarra de organización encontrada:', pizarraOrg.id);

      // 3. Buscar cards en la tabla cards (NO en el campo JSON)
      const { data: cardsEnBD } = await supabase
        .from('cards')
        .select('id, card_id, type, title')
        .eq('id_pizarra', pizarraOrg.id);

      console.log('🔍 [DEBUG] Cards en BD:', cardsEnBD?.length || 0);

      // Filtrar cards de tipo proyecto
      const proyectoCards = (cardsEnBD || []).filter(c =>
        c.type === 'proyecto' || c.type === 'proyecto-organizacion'
      );

      console.log('🔍 [DEBUG] Cards de proyecto encontradas:', proyectoCards.length);

      for (const card of proyectoCards) {
        // Buscar relación en card_proyectos usando el UUID
        const { data: relacion } = await supabase
          .from('card_proyectos')
          .select('id_card, id_proyecto')
          .eq('id_card', card.id)
          .maybeSingle();

        // Si hay relación, buscar datos del proyecto
        let proyectoNombre = null;
        if (relacion?.id_proyecto) {
          const { data: proyecto } = await supabase
            .from('proyecto')
            .select('nombre')
            .eq('id', relacion.id_proyecto)
            .maybeSingle();
          proyectoNombre = proyecto?.nombre || null;
        }

        // Buscar recursos asociados a este proyecto
        let recursosCount = 0;
        if (relacion?.id_proyecto) {
          const { count } = await supabase
            .from('recursos')
            .select('id', { count: 'exact', head: true })
            .eq('proyecto_id', relacion.id_proyecto);
          recursosCount = count || 0;
        }

        proyectoCardsData.push({
          cardId: card.card_id || 'sin-id',
          cardUUID: card.id,
          cardType: card.type,
          title: card.title || 'Sin título',
          hasProyectoData: !!relacion,
          proyectoId: relacion?.id_proyecto || null,
          proyectoNombre: proyectoNombre,
          hasRelacionEnBD: !!relacion,
          relacionEnBD: relacion,
          recursosCount: recursosCount
        } as any);
      }

      setProyectoCards(proyectoCardsData);
    } catch (error) {
      console.error('Error diagnosticando proyectos:', error);
    }
  };

  // Auto-refresh cada 2 segundos si está activo
  useEffect(() => {
    if (!autoRefresh || !isOpen) return;

    const interval = setInterval(() => {
      diagnosticarMisiones();
      diagnosticarProyectos();
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh, isOpen]);

  // Cargar al abrir
  useEffect(() => {
    if (isOpen) {
      diagnosticarMisiones();
      diagnosticarProyectos();
    }
  }, [isOpen]);

  const ejecutarDiagnostico = async () => {
    setLoading(true);
    const nuevosResultados: DiagnosticoResultado[] = [];
    let cardsSupabase: any[] | null = null;

    try {
      // 1. Verificar usuario autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        nuevosResultados.push({
          paso: '1. Autenticación',
          estado: 'error',
          mensaje: 'Error de autenticación',
          detalles: userError
        });
        setResultados(nuevosResultados);
        setLoading(false);
        return;
      }

      nuevosResultados.push({
        paso: '1. Usuario',
        estado: 'success',
        mensaje: `${user.email}`,
        detalles: { id: user.id }
      });

      // 2. Buscar pizarra del día
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fin = new Date();
      fin.setHours(23, 59, 59, 999);

      const { data: pizarraHoy } = await supabase
        .from('pizarras')
        .select('*')
        .eq('id_usuario', user.id)
        .gte('created_at', hoy.toISOString())
        .lte('created_at', fin.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!pizarraHoy) {
        nuevosResultados.push({
          paso: '2. Pizarra',
          estado: 'warning',
          mensaje: 'No hay pizarra personal del día',
          detalles: null
        });
      } else {
        nuevosResultados.push({
          paso: '2. Pizarra',
          estado: 'success',
          mensaje: `ID: ${pizarraHoy.id.substring(0, 8)}...`,
          detalles: { id: pizarraHoy.id }
        });

        // 3. Buscar cards
        const { data: cards } = await supabase
          .from('cards')
          .select('*')
          .eq('id_pizarra', pizarraHoy.id);

        cardsSupabase = cards;

        nuevosResultados.push({
          paso: '3. Cards',
          estado: cards && cards.length > 0 ? 'success' : 'warning',
          mensaje: `${cards?.length || 0} cards encontradas`,
          detalles: cards?.map(c => ({ id: c.id.substring(0, 8), type: c.type, title: c.title }))
        });
      }

      // 4. Resumen de cards de misión encontradas
      const totalMisionCards = misionCards.length;
      const misionesConId = misionCards.filter(c => c.idMision).length;
      const misionesActivas = misionCards.filter(c => c.misionActiva?.isRunning).length;

      nuevosResultados.push({
        paso: '4. Cards de Misión',
        estado: totalMisionCards > 0 ? 'success' : 'warning',
        mensaje: `${totalMisionCards} cards encontradas (${misionesConId} con ID, ${misionesActivas} activas)`,
        detalles: {
          total: totalMisionCards,
          conId: misionesConId,
          activas: misionesActivas,
          tipos: misionCards.reduce((acc, c) => {
            acc[c.cardType] = (acc[c.cardType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      });

      // 5. Misiones activas en BD
      const { data: misionesActivasBD } = await supabase
        .from('misiones_activas')
        .select('id, tipo, id_referencia, estado, is_running, capture_now')
        .eq('tipo', 'mision');

      nuevosResultados.push({
        paso: '5. Misiones Activas BD',
        estado: misionesActivasBD && misionesActivasBD.length > 0 ? 'success' : 'warning',
        mensaje: `${misionesActivasBD?.length || 0} misiones activas en BD`,
        detalles: misionesActivasBD?.map(m => ({
          id: m.id.substring(0, 8),
          ref: m.id_referencia,
          estado: m.estado,
          running: m.is_running,
          capture: m.capture_now?.substring(0, 20)
        }))
      });

      // Actualizar diagnóstico de misiones
      await diagnosticarMisiones();

    } catch (error) {
      nuevosResultados.push({
        paso: 'Error general',
        estado: 'error',
        mensaje: 'Error inesperado durante el diagnóstico',
        detalles: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    setResultados(nuevosResultados);
    setLoading(false);
  };

  const getIcono = (estado: DiagnosticoResultado['estado']) => {
    switch (estado) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'info':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getColorBorde = (estado: DiagnosticoResultado['estado']) => {
    switch (estado) {
      case 'success':
        return 'border-green-500';
      case 'warning':
        return 'border-yellow-500';
      case 'error':
        return 'border-red-500';
      case 'info':
        return 'border-blue-500';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          if (resultados.length === 0) {
            ejecutarDiagnostico();
          }
        }}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-all duration-200"
        title="Abrir diagnóstico de pizarra"
      >
        <Bug className="w-4 h-4" />
        <span className="font-medium text-sm">Debug</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-[550px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-purple-600 text-white px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Debug Panel</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-1 rounded transition-colors ${autoRefresh ? 'bg-green-500' : 'hover:bg-purple-700'}`}
            title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          >
            <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={ejecutarDiagnostico}
            disabled={loading}
            className="p-1 hover:bg-purple-700 rounded transition-colors disabled:opacity-50"
            title="Reejecutar diagnóstico"
          >
            <Target className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-purple-700 rounded transition-colors"
          >
            <XCircle className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 bg-gray-800">
        <button
          onClick={() => setActiveTab('proyectos')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'proyectos'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          Proyectos ({proyectoCards.length})
        </button>
        <button
          onClick={() => setActiveTab('misiones')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'misiones'
              ? 'bg-orange-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          Misiones ({misionCards.length})
        </button>
      </div>

      {/* Cards de Proyecto en tiempo real */}
      {activeTab === 'proyectos' && (
        <div className="bg-gray-900 p-2 border-b border-gray-700">
          <h4 className="text-xs font-semibold text-blue-400 mb-2">Cards de Proyecto (Real-time)</h4>
          {proyectoCards.length === 0 ? (
            <p className="text-gray-500 text-xs">No hay cards de proyecto</p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {proyectoCards.map((card) => (
                <div
                  key={card.cardId}
                  className={`p-1.5 rounded text-xs ${
                    card.hasProyectoData && card.hasRelacionEnBD
                      ? 'bg-green-900/50 border border-green-500'
                      : card.hasProyectoData
                      ? 'bg-yellow-900/50 border border-yellow-500'
                      : 'bg-red-900/50 border border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white truncate flex-1">
                      {card.title}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-600 text-white">
                      {card.cardType}
                    </span>
                  </div>
                  <div className="text-[9px] text-gray-400 mb-1">
                    Card ID: {card.cardId.substring(0, 12)} | UUID: {card.cardUUID.substring(0, 8)}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div>
                      <span className="text-gray-500">Relación BD:</span>
                      <span className={`ml-1 ${card.hasRelacionEnBD ? 'text-green-400' : 'text-red-400'}`}>
                        {card.hasRelacionEnBD ? 'SI' : 'NO'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">proyectoId:</span>
                      <span className={`ml-1 ${card.proyectoId ? 'text-green-400' : 'text-red-400'}`}>
                        {card.proyectoId || 'null'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Nombre:</span>
                      <span className="ml-1 text-white truncate">
                        {card.proyectoNombre || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Recursos:</span>
                      <span className={`ml-1 ${(card.recursosCount || 0) > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {card.recursosCount || 0}
                      </span>
                    </div>
                  </div>
                  {!card.hasRelacionEnBD && (
                    <div className="mt-1 text-[9px] text-red-400 bg-red-900/30 p-1 rounded">
                      ⚠️ Falta relación en card_proyectos - guarda la pizarra para crearla
                    </div>
                  )}
                  {card.hasRelacionEnBD && (card.recursosCount || 0) === 0 && (
                    <div className="mt-1 text-[9px] text-yellow-400 bg-yellow-900/30 p-1 rounded">
                      ℹ️ No hay recursos asociados a este proyecto
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cards de Misión en tiempo real */}
      {activeTab === 'misiones' && (
      <div className="bg-gray-900 p-2 border-b border-gray-700">
        <h4 className="text-xs font-semibold text-green-400 mb-2">Cards de Misión (Real-time)</h4>
        {misionCards.length === 0 ? (
          <p className="text-gray-500 text-xs">No hay cards de misión</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {misionCards.map((card) => (
              <div
                key={card.cardId}
                className={`p-1.5 rounded text-xs ${
                  card.misionActiva?.isRunning
                    ? 'bg-green-900/50 border border-green-500'
                    : 'bg-gray-800 border border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white truncate flex-1">
                    {card.title}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    card.cardType === 'mision-organizacion'
                      ? 'bg-blue-600 text-white'
                      : 'bg-orange-600 text-white'
                  }`}>
                    {card.cardType}
                  </span>
                </div>
                <div className="text-[9px] text-gray-400 mb-1">
                  ID Misión: {card.idMision || 'null'} | Card: {card.cardId.substring(0, 8)}
                </div>
                {card.misionActiva ? (
                  <div className="space-y-1">
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      <div>
                        <span className="text-gray-500">Estado:</span>
                        <span className={`ml-1 ${
                          card.misionActiva.estado === 'en_progreso' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {card.misionActiva.estado}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Running:</span>
                        <span className={`ml-1 ${card.misionActiva.isRunning ? 'text-green-400' : 'text-red-400'}`}>
                          {card.misionActiva.isRunning ? 'SI' : 'NO'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Capture:</span>
                        <span className={`ml-1 ${
                          card.misionActiva.captureNow === '1' ? 'text-yellow-400 animate-pulse' :
                          card.misionActiva.captureNow?.startsWith('http') ? 'text-blue-400' : 'text-gray-500'
                        }`}>
                          {card.misionActiva.captureNow === '1' ? 'PEDIDA' :
                           card.misionActiva.captureNow?.startsWith('http') ? 'URL' :
                           card.misionActiva.captureNow || '-'}
                        </span>
                      </div>
                    </div>
                    <div className="text-[9px] text-gray-500">
                      Último capture: {card.misionActiva.fechaUltimoCapture
                        ? new Date(card.misionActiva.fechaUltimoCapture).toLocaleTimeString()
                        : 'nunca'}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-500">Sin misión activa (no hay registro en misiones_activas)</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Contenido - Diagnóstico general */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && resultados.length === 0 && (
          <div className="flex items-center justify-center py-6">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
              <p className="text-gray-600 text-xs">Ejecutando...</p>
            </div>
          </div>
        )}

        {resultados.map((resultado, index) => (
          <div
            key={index}
            className={`border-l-3 ${getColorBorde(resultado.estado)} bg-gray-50 p-2 rounded-r`}
          >
            <div className="flex items-start gap-1.5">
              <div className="flex-shrink-0 mt-0.5">
                {getIcono(resultado.estado)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs text-gray-900 mb-0.5">
                  {resultado.paso}
                </h4>
                <p className="text-xs text-gray-700 mb-1">{resultado.mensaje}</p>
                {resultado.detalles && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-purple-600 hover:text-purple-700 text-xs">
                      Detalles
                    </summary>
                    <pre className="bg-gray-900 text-green-400 p-1.5 rounded overflow-x-auto text-[10px] mt-1 max-h-32 overflow-y-auto">
                      {JSON.stringify(resultado.detalles, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {resultados.length > 0 && (
        <div className="border-t border-gray-200 px-3 py-1.5 bg-gray-50">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                <CheckCircle className="w-2.5 h-2.5 text-green-500" />
                {resultados.filter(r => r.estado === 'success').length}
              </span>
              <span className="flex items-center gap-0.5">
                <AlertCircle className="w-2.5 h-2.5 text-yellow-500" />
                {resultados.filter(r => r.estado === 'warning').length}
              </span>
              <span className="flex items-center gap-0.5">
                <XCircle className="w-2.5 h-2.5 text-red-500" />
                {resultados.filter(r => r.estado === 'error').length}
              </span>
            </div>
            <span className={`px-1.5 py-0.5 rounded ${autoRefresh ? 'bg-green-100 text-green-700' : 'text-gray-600'}`}>
              {autoRefresh ? 'Auto-refresh ON' : `${resultados.length} checks`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
