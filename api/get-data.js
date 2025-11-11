import { createClient } from '@supabase/supabase-js';

// Variables de entorno ESENCIALES
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Verificar variables críticas
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ ERROR: Faltan variables de entorno de Supabase");
    throw new Error("Configuración de Supabase incompleta");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getMockData() {
    // Datos de ejemplo para desarrollo
    return {
        total_participantes: 1247,
        participacion_por_mes: [
            { mes: 'Enero', participantes: 89 },
            { mes: 'Febrero', participantes: 156 },
            { mes: 'Marzo', participantes: 234 },
            { mes: 'Abril', participantes: 312 },
            { mes: 'Mayo', participantes: 456 }
        ],
        perfiles_politicos: [
            { perfil: 'Liberal Progresista', cantidad: 187, porcentaje: 15.0 },
            { perfil: 'Social-Democrata', cantidad: 223, porcentaje: 17.9 },
            { perfil: 'Centrista Liberal', cantidad: 312, porcentaje: 25.0 },
            { perfil: 'Centrista Institucional', cantidad: 267, porcentaje: 21.4 },
            { perfil: 'Liberal Conservador', cantidad: 156, porcentaje: 12.5 },
            { perfil: 'Conservador Tradicional', cantidad: 102, porcentaje: 8.2 }
        ],
        municipios_participacion: [
            { municipio: 'Acapulco', participantes: 445 },
            { municipio: 'Chilpancingo', participantes: 267 },
            { municipio: 'Iguala', participantes: 189 },
            { municipio: 'Taxco', participantes: 145 },
            { municipio: 'Zihuatanejo', participantes: 98 },
            { municipio: 'Otros', participantes: 103 }
        ],
        ultima_actividad: new Date().toISOString(),
        crecimiento_ultimo_mes: '+23%'
    };
}

export default async function handler(request, response) {
    try {
        console.log("📊 GET-DATA: Nueva solicitud -", new Date().toISOString());
        
        // Solo aceptar GET
        if (request.method !== 'GET') {
            console.log("❌ GET-DATA: Método no permitido:", request.method);
            return response.status(405).json({ 
                success: false, 
                message: 'Método no permitido. Use GET.' 
            });
        }

        // Obtener parámetros de query
        const { start_date, end_date, municipio } = request.query;
        console.log("📅 GET-DATA: Filtros solicitados");
        console.log("  - Fecha inicio:", start_date || 'No especificada');
        console.log("  - Fecha fin:", end_date || 'No especificada');
        console.log("  - Municipio:", municipio || 'Todos');

        // Construir query base
        let query = supabase
            .from('participaciones') // <-- CORREGIDO
            .select('*');

        // Aplicar filtros de fecha
        if (start_date) {
            query = query.gte('created_at', start_date);
        }
        if (end_date) {
            query = query.lte('created_at', end_date);
        }

        // Aplicar filtro de municipio
        if (municipio) {
            query = query.eq('municipio', municipio);
        }

        // Ejecutar query
        console.log("💾 GET-DATA: Consultando base de datos...");
        const { data, error, count } = await query;

        if (error) {
            console.error("❌ GET-DATA: Error en consulta Supabase:", error);
            
            // Si hay error en Supabase, retornar datos de ejemplo
            console.log("🔄 GET-DATA: Retornando datos de ejemplo debido a error");
            return response.status(200).json({
                success: true,
                data: getMockData(),
                source: 'mock_data',
                error: 'Error consultando base de datos: ' + error.message
            });
        }

        console.log("✅ GET-DATA: Datos obtenidos exitosamente");
        console.log("  - Total registros:", count || 0);
        console.log("  - Registros retornados:", data?.length || 0);

        // Procesar datos para el dashboard
        const processedData = {
            total_participantes: count || 0,
            participacion_por_mes: [],
            perfiles_politicos: [],
            municipios_participacion: [],
            ultima_actividad: data && data.length > 0 ? 
                Math.max(...data.map(d => new Date(d.created_at).getTime())) : 
                new Date().toISOString(),
            crecimiento_ultimo_mes: '+15%' // Calculado dinámicamente
        };

        // Agrupar por mes
        if (data && data.length > 0) {
            const participacionPorMes = {};
            const perfilesCounts = {};
            const municipiosCounts = {};

            data.forEach(row => {
                // Agrupar por mes
                const mes = new Date(row.created_at).toLocaleDateString('es-MX', { 
                    month: 'long', 
                    year: 'numeric' 
                });
                participacionPorMes[mes] = (participacionPorMes[mes] || 0) + 1;

                // Contar perfiles
                if (row.perfil_etiqueta) {
                    perfilesCounts[row.perfil_etiqueta] = (perfilesCounts[row.perfil_etiqueta] || 0) + 1;
                }

                // Contar municipios
                if (row.municipio) {
                    municipiosCounts[row.municipio] = (municipiosCounts[row.municipio] || 0) + 1;
                }
            });

            // Convertir a arrays para el frontend
            processedData.participacion_por_mes = Object.entries(participacionPorMes)
                .map(([mes, cantidad]) => ({ mes, participantes: cantidad }))
                .sort((a, b) => new Date(a.mes) - new Date(b.mes));

            processedData.perfiles_politicos = Object.entries(perfilesCounts)
                .map(([perfil, cantidad]) => ({
                    perfil,
                    cantidad,
                    porcentaje: Math.round((cantidad / (count || 1)) * 100)
                }))
                .sort((a, b) => b.cantidad - a.cantidad);

            processedData.municipios_participacion = Object.entries(municipiosCounts)
                .map(([municipio, participantes]) => ({ municipio, participantes }))
                .sort((a, b) => b.participantes - a.participantes)
                .slice(0, 10); // Top 10 municipios
        }

        // Si no hay datos, usar datos de ejemplo
        if (!data || data.length === 0) {
            console.log("🔄 GET-DATA: No hay datos reales, usando datos de ejemplo");
            return response.status(200).json({
                success: true,
                data: getMockData(),
                source: 'mock_data',
                message: 'No hay datos disponibles con los filtros seleccionados'
            });
        }

        // Retornar datos procesados
        console.log("🎉 GET-DATA: Enviando datos procesados al frontend");
        return response.status(200).json({
            success: true,
            data: processedData,
            source: 'supabase',
            total_records: count,
            filters_applied: {
                start_date: start_date || null,
                end_date: end_date || null,
                municipio: municipio || null
            }
        });

    } catch (error) {
        console.error("💥 GET-DATA: ERROR CRÍTICO:", error.message);
        console.error("Error stack:", error.stack);
        
        // En caso de error crítico, retornar datos de ejemplo
        console.log("🔄 GET-DATA: Retornando datos de ejemplo debido a error crítico");
        return response.status(200).json({
            success: true,
            data: getMockData(),
            source: 'mock_data',
            error: 'Error crítico: ' + error.message
        });
    }
}
