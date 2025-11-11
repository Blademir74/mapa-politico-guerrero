// API PROCESAR CORREGIDO - MATCH CON FRONTEND
// Versión que SÍ acepta userAnswers como el frontend envía

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
        console.log('=== API PROCESAR LLAMADA ===');
        console.log('Request body completo:', JSON.stringify(req.body, null, 2));
        
        // MATCH CON FRONTEND: aceptar userAnswers
        const { userAnswers } = req.body;
        
        if (!userAnswers || !Array.isArray(userAnswers)) {
            console.log('ERROR: userAnswers no es válido');
            return res.status(400).json({ 
                error: 'Datos inválidos',
                message: 'Se requiere userAnswers como array',
                received_type: typeof userAnswers,
                is_array: Array.isArray(userAnswers)
            });
        }
        
        console.log('Procesando userAnswers:', userAnswers.length, 'elementos');
        
        // Extraer solo las respuestas de las preguntas (no contacto)
        const surveyAnswers = userAnswers.filter(answer => answer.pregunta_id !== 12);
        console.log('Survey answers filtrados:', surveyAnswers.length);
        
        // Convertir respuestas al formato esperado por el algoritmo
        const respuestas = [];
        
        for (const answer of surveyAnswers) {
            if (answer.respuesta) {
                // Opción múltiple: tomar valor_x y valor_y de la respuesta
                respuestas.push(answer.respuesta.valor_x < 50 ? 'si' : 'no');
            } else if (answer.valor !== undefined) {
                // Escala: convertir valor a si/no
                respuestas.push(answer.valor > 5 ? 'si' : 'no');
            } else if (answer.seleccionados) {
                // Casillas múltiples: tomar la primera opción
                respuestas.push('si');
            } else if (answer.valor) {
                // Desplegable: siempre sí
                respuestas.push('si');
            }
        }
        
        console.log('Respuestas convertidas:', respuestas);
        
        // Algoritmo de perfil político
        let ejeEconomico = 0;
        let ejeSocial = 0;
        
        const mapeo = [
            { econ: -15, social: -10 }, // Pregunta 1: Orgullo de Guerrero
            { econ: -10, social: -10 }, // Pregunta 2: Seguridad
            { econ: 10, social: 0 },    // Pregunta 3: Visión futuro
            { econ: 0, social: -15 },   // Pregunta 4: Presupuesto
            { econ: -10, social: -5 },  // Pregunta 5: Problema primero
            { econ: -10, social: 10 },  // Pregunta 6: Amapola
            { econ: -10, social: -10 }, // Pregunta 7: Líder
            { econ: -10, social: -10 }, // Pregunta 8: Intervención gobierno
            { econ: -10, social: 0 },   // Pregunta 9: Autonomía
            { econ: -10, social: -10 }  // Pregunta 10: Buen gobierno
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
        
        // Normalizar a rangos -100 a +100
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
        
        // FORMATO PARA FRONTEND: usar perfil.etiqueta como espera displayResultsPage
        const resultado = {
            success: true,
            perfil: {
                etiqueta: perfil,
                descripcion: descripcion,
                tema_principal: perfil,  // Simplificado
                liderazgo_preferido: 'Variable', // Simplificado
                valor_gobierno: perfil,  // Simplificado
                posicion_x: Math.round((ejeEconomico + 100) / 2), // Convertir -100,100 a 0,100
                posicion_y: Math.round((ejeSocial + 100) / 2),    // Convertir -100,100 a 0,100
                color: color,
                recomendaciones: recomendaciones
            },
            timestamp: new Date().toISOString(),
            debug: {
                eje_economico: ejeEconomico,
                eje_social: ejeSocial,
                respuestas_procesadas: respuestas.length
            }
        };
        
        console.log('Resultado generado exitosamente:', resultado.perfil.etiqueta);
        
        return res.status(200).json(resultado);
        
    } catch (error) {
        console.error('ERROR EN API:', error);
        
        // Respuesta de emergencia
        const emergencia = {
            success: true,
            perfil: {
                etiqueta: 'Centrista Liberal',
                descripcion: 'Perfil moderado y equilibrado.',
                tema_principal: 'Equilibrio',
                liderazgo_preferido: 'Pragmático',
                valor_gobierno: 'Moderación',
                posicion_x: 50,
                posicion_y: 50,
                color: '#8B5CF6',
                recomendaciones: ['Prefieres soluciones equilibradas', 'Te orientas hacia el pragmatismo político']
            },
            timestamp: new Date().toISOString(),
            modo_emergencia: true
        };
        
        return res.status(200).json(emergencia);
    }
}
