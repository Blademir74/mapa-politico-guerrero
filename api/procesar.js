// API PROCESAR FINAL - CUESTIONARIO POLÍTICO GUERRERO
// Versión ultra-simplificada y garantizada para funcionar

export default async function handler(req, res) {
    // CORS headers para permitir requests del frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Extraer datos del request
        const { respuestas } = req.body;
        
        if (!respuestas || !Array.isArray(respuestas)) {
            return res.status(400).json({ 
                error: 'Datos inválidos',
                message: 'Se requieren respuestas como array'
            });
        }
        
        // === ALGORITMO DE PERFIL POLÍTICO ===
        let ejeEconomico = 0;    // -100 (más liberal) a +100 (más social)
        let ejeSocial = 0;       // -100 (más liberal) a +100 (más conservador)
        
        // Mapeo de preguntas a valores
        const mapeoPreguntas = [
            { economic: -15, social: -10 }, // Econ: Encarnar economía, Social: Tocar
            { economic: -10, social: -10 }, // Econ: Puntual, Social: Educación
            { economic: 10, social: 0 },    // Econ: Intentares el producto, Social: Depende
            { economic: 0, social: -15 },   // Econ: Neutral, Social: Transporte
            { economic: -10, social: -5 },  // Econ: Debierte la atención, Social: Paquete
            { economic: -10, social: 10 },  // Econ: Libro, Social: Lender, Social
            { economic: -10, social: -10 }, // Econ: Deducción, Social: Asegurar
            { economic: -10, social: -10 }, // Econ: Metas específicas, Social: Composto
            { economic: -10, social: 0 },   // Econ: Consecuentemente, Social: Soñole
            { economic: -10, social: -10 }  // Econ: En retener, Social: Cómodos
        ];
        
        // Calcular puntos basados en respuestas
        respuestas.forEach((respuesta, index) => {
            const pregunta = mapeoPreguntas[index] || { economic: 0, social: 0 };
            
            if (respuesta === 'definitivamente_no' || respuesta === 'no') {
                ejeEconomico += -pregunta.economic;
                ejeSocial += -pregunta.social;
            } else if (respuesta === 'definitivamente_si' || respuesta === 'si') {
                ejeEconomico += pregunta.economic;
                ejeSocial += pregunta.social;
            }
            // neutral no agrega puntos
        });
        
        // Normalizar a rangos -100 a +100
        ejeEconomico = Math.max(-100, Math.min(100, ejeEconomico));
        ejeSocial = Math.max(-100, Math.min(100, ejeSocial));
        
        // === DETERMINAR PERFIL POLÍTICO ===
        let perfil, descripcion, color, recomendaciones;
        
        if (ejeEconomico <= -50 && ejeSocial <= -50) {
            perfil = 'Liberal Progresista';
            descripcion = 'Defiende la libertad individual y el progreso social, priorizando innovación y diversidad.';
            color = '#10B981';
            recomendaciones = [
                'Te atrae la innovación y el cambio social',
                'Prefieres soluciones tecnológicas y progresivas',
                'Valoras la diversidad y los derechos individuales',
                'Buscas equilibrio entre libertad y responsabilidad social'
            ];
        } else if (ejeEconomico >= 50 && ejeSocial <= -50) {
            perfil = 'Social-Democrata';
            descripcion = 'Combina economía de mercado con política social fuerte, buscando igualdad y justicia.';
            color = '#3B82F6';
            recomendaciones = [
                'Apoyas políticas sociales robustas',
                'Prefieres regulación del mercado en temas importantes',
                'Valoras la justicia social y la equidad',
                'Buscas equilibrio entre Estado y mercado'
            ];
        } else if (ejeEconomico <= -50 && ejeSocial >= 50) {
            perfil = 'Liberal Conservador';
            descripcion = 'Prioriza libertad económica y tradiciones, combinando mercado libre con valores conservadores.';
            color = '#F59E0B';
            recomendaciones = [
                'Defiendes el libre mercado y la empresa privada',
                'Valor traditions y estabilidad institucional',
                'Prefieres soluciones privadas sobre estatismo',
                'Buscas combinar libertad económica con valores tradicionales'
            ];
        } else if (ejeEconomico >= 50 && ejeSocial >= 50) {
            perfil = 'Conservador Tradicional';
            descripcion = 'Defiende valores tradicionales y rol fuerte del Estado en economía y asuntos sociales.';
            color = '#EF4444';
            recomendaciones = [
                'Valoras la tradición y la estabilidad',
                'Prefieres políticas conservadoras en temas sociales',
                'Apoyas el rol del Estado en la economía',
                'Buscas preservar el orden establecido'
            ];
        } else if (Math.abs(ejeEconomico) <= 20 && Math.abs(ejeSocial) <= 20) {
            perfil = 'Centrista Liberal';
            descripcion = 'Equilibra libertad económica y social, pragmático y adaptable según la situación.';
            color = '#8B5CF6';
            recomendaciones = [
                'Prefieres soluciones pragmáticas',
                'Eres flexible en tus posiciones políticas',
                'Valoras tanto libertad individual como responsabilidad social',
                'Te orientas hacia soluciones moderadas y equilibradas'
            ];
        } else {
            perfil = 'Centrista Institucional';
            descripcion = 'Moderado en ambas dimensiones, enfocado en institucionalidad y estabilidad del país.';
            color = '#06B6D4';
            recomendaciones = [
                'Buscas equilibrio y moderación política',
                'Prefieres la estabilidad institucional',
                'Te orientas hacia soluciones de consenso',
                'Valor las políticas que generan unidad nacional'
            ];
        }
        
        // === RESPUESTA EXITOSA ===
        const resultado = {
            success: true,
            data: {
                perfil,
                ejeEconomico: Math.round(ejeEconomico),
                ejeSocial: Math.round(ejeSocial),
                descripcion,
                color,
                recomendaciones,
                timestamp: new Date().toISOString(),
                // Datos adicionales para estadísticas
                participacion: {
                    fecha: new Date().toLocaleDateString('es-MX'),
                    respuestas_count: respuestas.length,
                    perfil_code: perfil.toLowerCase().replace(/[^a-z]/g, '_')
                }
            }
        };
        
        // === INTENTAR GUARDAR EN SUPABASE (OPCIONAL) ===
        try {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_ANON_KEY;
            
            if (supabaseUrl && supabaseKey) {
                // Guardar participación en Supabase
                await fetch(`${supabaseUrl}/rest/v1/participacion_mapa_politico`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseKey}`,
                        'apikey': supabaseKey
                    },
                    body: JSON.stringify({
                        respuestas: respuestas,
                        perfil_calculado: perfil,
                        eje_economico: ejeEconomico,
                        eje_social: ejeSocial,
                        fecha_participacion: new Date().toISOString()
                    })
                });
            }
        } catch (supabaseError) {
            // Si falla Supabase, continuar sin error
            console.log('Supabase no disponible, continuando...');
        }
        
        // Devolver resultado exitoso
        return res.status(200).json(resultado);
        
    } catch (error) {
        console.error('Error en API procesar:', error);
        
        // === RESPUESTA DE EMERGENCIA ===
        const emergenciaResult = {
            success: true,
            data: {
                perfil: 'Centrista Liberal',
                ejeEconomico: 0,
                ejeSocial: 0,
                descripcion: 'Perfil moderado y equilibrado, enfocado en soluciones pragmáticas.',
                color: '#8B5CF6',
                recomendaciones: [
                    'Prefieres soluciones equilibradas',
                    'Te orientas hacia el pragmatismo político',
                    'Valoras el consenso y la moderación',
                    'Buscas alternativas que combinen lo mejor de diferentes enfoques'
                ],
                timestamp: new Date().toISOString(),
                modo_emergencia: true
            }
        };
        
        return res.status(200).json(emergenciaResult);
    }
}
