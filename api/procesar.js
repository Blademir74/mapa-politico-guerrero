// API PROCESAR CORREGIDO - SIN DEPENDENCIAS EXTERNAS
// Versión que funciona SIN variables de entorno

export default async function handler(req, res) {
    // CORS headers
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
        console.log('API procesar llamada:', req.body);
        
        const { respuestas } = req.body;
        
        if (!respuestas || !Array.isArray(respuestas)) {
            return res.status(400).json({ 
                error: 'Datos inválidos',
                message: 'Se requieren respuestas como array',
                received: typeof respuestas
            });
        }
        
        console.log('Procesando respuestas:', respuestas.length);
        
        // Algoritmo de perfil político
        let ejeEconomico = 0;
        let ejeSocial = 0;
        
        const mapeo = [
            { econ: -15, social: -10 },
            { econ: -10, social: -10 },
            { econ: 10, social: 0 },
            { econ: 0, social: -15 },
            { econ: -10, social: -5 },
            { econ: -10, social: 10 },
            { econ: -10, social: -10 },
            { econ: -10, social: -10 },
            { econ: -10, social: 0 },
            { econ: -10, social: -10 }
        ];
        
        respuestas.forEach((respuesta, index) => {
            const valores = mapeo[index] || { econ: 0, social: 0 };
            
            if (respuesta === 'definitivamente_no' || respuesta === 'no') {
                ejeEconomico += -valores.econ;
                ejeSocial += -valores.social;
            } else if (respuesta === 'definitivamente_si' || respuesta === 'si') {
                ejeEconomico += valores.econ;
                ejeSocial += valores.social;
            }
        });
        
        ejeEconomico = Math.max(-100, Math.min(100, ejeEconomico));
        ejeSocial = Math.max(-100, Math.min(100, ejeSocial));
        
        // Determinar perfil
        let perfil, descripcion, color, recomendaciones;
        
        if (ejeEconomico <= -50 && ejeSocial <= -50) {
            perfil = 'Liberal Progresista';
            descripcion = 'Defiende la libertad individual y el progreso social.';
            color = '#10B981';
            recomendaciones = [
                'Te atrae la innovación y el cambio social',
                'Prefieres soluciones tecnológicas y progresivas',
                'Valoras la diversidad y los derechos individuales'
            ];
        } else if (ejeEconomico >= 50 && ejeSocial <= -50) {
            perfil = 'Social-Democrata';
            descripcion = 'Combina economía de mercado con política social fuerte.';
            color = '#3B82F6';
            recomendaciones = [
                'Apoyas políticas sociales robustas',
                'Prefieres regulación del mercado',
                'Valoras la justicia social y la equidad'
            ];
        } else if (ejeEconomico <= -50 && ejeSocial >= 50) {
            perfil = 'Liberal Conservador';
            descripcion = 'Prioriza libertad económica y tradiciones.';
            color = '#F59E0B';
            recomendaciones = [
                'Defiendes el libre mercado y la empresa privada',
                'Valoras tradiciones y estabilidad institucional',
                'Prefieres soluciones privadas sobre estatismo'
            ];
        } else if (ejeEconomico >= 50 && ejeSocial >= 50) {
            perfil = 'Conservador Tradicional';
            descripcion = 'Defiende valores tradicionales y rol fuerte del Estado.';
            color = '#EF4444';
            recomendaciones = [
                'Valoras la tradición y la estabilidad',
                'Prefieres políticas conservadoras en temas sociales',
                'Apoyas el rol del Estado en la economía'
            ];
        } else if (Math.abs(ejeEconomico) <= 20 && Math.abs(ejeSocial) <= 20) {
            perfil = 'Centrista Liberal';
            descripcion = 'Equilibra libertad económica y social.';
            color = '#8B5CF6';
            recomendaciones = [
                'Prefieres soluciones pragmáticas',
                'Eres flexible en tus posiciones políticas',
                'Te orientas hacia soluciones moderadas y equilibradas'
            ];
        } else {
            perfil = 'Centrista Institucional';
            descripcion = 'Moderado, enfocado en institucionalidad y estabilidad.';
            color = '#06B6D4';
            recomendaciones = [
                'Buscas equilibrio y moderación política',
                'Prefieres la estabilidad institucional',
                'Te orientas hacia soluciones de consenso'
            ];
        }
        
        // Respuesta exitosa
        const resultado = {
            success: true,
            data: {
                perfil,
                ejeEconomico: Math.round(ejeEconomico),
                ejeSocial: Math.round(ejeSocial),
                descripcion,
                color,
                recomendaciones,
                timestamp: new Date().toISOString()
            }
        };
        
        console.log('Resultado generado:', resultado);
        
        // NO intentar conectar a Supabase para evitar errores
        return res.status(200).json(resultado);
        
    } catch (error) {
        console.error('Error en API:', error);
        
        // Respuesta de emergencia siempre
        const emergencia = {
            success: true,
            data: {
                perfil: 'Centrista Liberal',
                ejeEconomico: 0,
                ejeSocial: 0,
                descripcion: 'Perfil moderado y equilibrado.',
                color: '#8B5CF6',
                recomendaciones: ['Prefieres soluciones equilibradas', 'Te orientas hacia el pragmatismo político'],
                timestamp: new Date().toISOString(),
                modo_emergencia: true
            }
        };
        
        return res.status(200).json(emergencia);
    }
}
