import { createClient } from '@supabase/supabase-js';

// Variables mínimas necesarias
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variables de Supabase faltantes');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(request, response) {
    console.log('🚀 API procesando request...');
    
    try {
        // Solo POST
        if (request.method !== 'POST') {
            return response.status(405).json({ error: 'Solo POST permitido' });
        }

        const { userAnswers, contactInfo } = request.body;
        console.log('📥 Datos recibidos:', { answers: userAnswers?.length, email: contactInfo?.email });

        // Calcular perfil simple
        let sumaX = 0, sumaY = 0;
        userAnswers?.forEach(ans => {
            if (ans.respuesta?.valor_x !== undefined) sumaX += ans.respuesta.valor_x;
            if (ans.respuesta?.valor_y !== undefined) sumaY += ans.respuesta.valor_y;
        });
        
        const promedioX = userAnswers?.length > 0 ? sumaX / userAnswers.length : 2.5;
        const promedioY = userAnswers?.length > 0 ? sumaY / userAnswers.length : 2.5;
        
        // Determinar perfil
        let perfil = {};
        if (promedioX <= 2 && promedioY <= 2) {
            perfil = { etiqueta: 'Liberal Progresista', descripcion: 'Valoras la innovación y el cambio.' };
        } else if (promedioX <= 2 && promedioY > 2) {
            perfil = { etiqueta: 'Social-Democrata', descripcion: 'Prefieres políticas sociales fuertes.' };
        } else if (promedioX > 3 && promedioY <= 2) {
            perfil = { etiqueta: 'Liberal Conservador', descripcion: 'Libre mercado con valores tradicionales.' };
        } else {
            perfil = { etiqueta: 'Centrista Liberal', descripcion: 'Buscas equilibrio entre libertad y orden.' };
        }

        // Guardar en Supabase (opcional, no crítico)
        try {
            const { error } = await supabase
                .from('participacion_mapa_politico')
                .insert([{
                    perfil_etiqueta: perfil.etiqueta,
                    perfil_descripcion: perfil.descripcion,
                    promedio_x: promedioX,
                    promedio_y: promedioY,
                    email: contactInfo?.email,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) console.log('⚠️ Supabase error (no crítico):', error);
        } catch (dbError) {
            console.log('⚠️ Error DB (continuando):', dbError);
        }

        console.log('✅ Perfil generado:', perfil.etiqueta);
        
        // Responder SIEMPRE
        return response.status(200).json({
            success: true,
            perfil: {
                ...perfil,
                promedio_x: Math.round(promedioX * 100) / 100,
                promedio_y: Math.round(promedioY * 100) / 100,
                nombre: contactInfo?.nombre || ''
            }
        });

    } catch (error) {
        console.error('💥 Error:', error.message);
        
        // Responder con perfil de ejemplo SIEMPRE
        return response.status(200).json({
            success: true,
            perfil: {
                etiqueta: 'Centrista Liberal',
                descripcion: 'Buscas el equilibrio entre libertad individual y orden social.',
                promedio_x: 2.5,
                promedio_y: 2.0,
                nombre: contactInfo?.nombre || '',
                fallback: true
            }
        });
    }
}