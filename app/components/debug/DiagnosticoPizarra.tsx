'use client';

import { useState } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Bug } from 'lucide-react';

interface DiagnosticoResultado {
  paso: string;
  estado: 'success' | 'warning' | 'error' | 'info';
  mensaje: string;
  detalles?: any;
}

export default function DiagnosticoPizarra() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<DiagnosticoResultado[]>([]);

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
          estado: 'error',
          mensaje: 'No hay pizarra del día',
          detalles: null
        });
        setResultados(nuevosResultados);
        setLoading(false);
        return;
      }

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
        detalles: cards?.map(c => ({ id: c.id, type: c.type, title: c.title }))
      });

      // 4. DIAGNÓSTICO DETALLADO DE RECURSOS
      const resourceCards = cardsSupabase?.filter(c => c.type === 'resource') || [];

      if (resourceCards.length === 0) {
        nuevosResultados.push({
          paso: '4. Recursos',
          estado: 'warning',
          mensaje: 'No hay cards de recursos',
          detalles: null
        });
      } else {
        // Verificar cada card de recurso en detalle
        const recursosDetallados = [];

        for (const card of resourceCards) {
          // 1. Verificar relación en card_recurso
          const { data: cardRecurso, error: errorCardRecurso } = await supabase
            .from('card_recurso')
            .select('id_recurso')
            .eq('id_card', card.id)
            .maybeSingle();

          let recursoData = null;
          let errorRecurso = null;

          if (cardRecurso) {
            // 2. Verificar que el recurso existe en la tabla recursos
            const { data: recurso, error: errorRecursoQuery } = await supabase
              .from('recursos')
              .select('*')
              .eq('id', cardRecurso.id_recurso)
              .maybeSingle();

            recursoData = recurso;
            errorRecurso = errorRecursoQuery;
          }

          recursosDetallados.push({
            card_id: card.id,
            card_title: card.title,
            tiene_relacion_card_recurso: !!cardRecurso,
            id_recurso: cardRecurso?.id_recurso || null,
            recurso_existe: !!recursoData,
            recurso_datos: recursoData ? {
              id: recursoData.id,
              nombre: recursoData.nombre,
              tipo: recursoData.tipo_recurso,
              url: recursoData.url,
              icono: recursoData.icono
            } : null,
            errores: {
              error_card_recurso: errorCardRecurso?.message || null,
              error_recurso: errorRecurso?.message || null
            }
          });
        }

        const recursosOK = recursosDetallados.filter(r => r.tiene_relacion_card_recurso && r.recurso_existe);
        const recursosError = recursosDetallados.filter(r => !r.tiene_relacion_card_recurso || !r.recurso_existe);

        nuevosResultados.push({
          paso: '4. Recursos',
          estado: recursosError.length > 0 ? 'error' : 'success',
          mensaje: recursosError.length > 0
            ? `${recursosError.length} de ${resourceCards.length} recursos con problemas`
            : `${recursosOK.length} recursos OK`,
          detalles: {
            total: resourceCards.length,
            ok: recursosOK.length,
            con_errores: recursosError.length,
            detalle_completo: recursosDetallados
          }
        });
      }

    } catch (error) {
      nuevosResultados.push({
        paso: 'Error general',
        estado: 'error',
        mensaje: 'Error inesperado durante el diagnóstico',
        detalles: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          raw: error
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
    <div className="fixed bottom-4 right-4 z-50 w-72 max-h-[450px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-purple-600 text-white px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Diagnóstico</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={ejecutarDiagnostico}
            disabled={loading}
            className="p-1 hover:bg-purple-700 rounded transition-colors disabled:opacity-50"
            title="Reejecutar diagnóstico"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-purple-700 rounded transition-colors"
          >
            <XCircle className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Contenido */}
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

        {resultados.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <Bug className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Haz clic en el botón de refrescar para ejecutar el diagnóstico</p>
          </div>
        )}
      </div>

      {/* Footer con resumen y acciones */}
      {resultados.length > 0 && (
        <div className="border-t border-gray-200 px-3 py-1.5 bg-gray-50">
          <div className="flex items-center justify-between text-[10px] mb-1">
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
            <span className="text-gray-600">
              {resultados.length} checks
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
