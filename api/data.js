import { createClient } from '@supabase/supabase-js';

// Variables de entorno ESENCIALES
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Verificar variables críticas
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ ERROR: Faltan variables de entorno de Supabase");
    console.log("SUPABASE_URL:", supabaseUrl ? "✅ Configurada" : "❌ Falta");
    console.log("SUPABASE_ANON_KEY:", supabaseAnonKey ? "✅ Configurada" : "❌ Falta");
    throw new Error("Configuración de Supabase incompleta");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function calculatePoliticalProfile(respuestas) {
    console.log("🧠 Calculando perfil con", respuestas.length, "respuestas");
    
    let suma_x = 0, suma_y = 0;
    let temas = [];
    let municipio_info = "No especificado";
    
    // Perfilado detallado
    let liderazgo = "No definido";
    let valor_gobierno = "No definido";
    let contador_valores = 0; // Contador para promedios
    
    respuestas.forEach(r => {
        try {
            // Procesar respuesta normal (opción múltiple)
            if (r.respuesta) {
                if (r.respuesta.valor_x !== undefined) {
                    suma_x += r.respuesta.valor_x;
                    contador_valores++; // Contar solo si aporta al eje
                }
                if (r.respuesta.valor_y !== undefined) {
                    suma_y += r.respuesta.valor_y;
                }
                if (r.respuesta.tema) temas.push(r.respuesta.tema);
                if (r.respuesta.liderazgo) liderazgo = r.respuesta.liderazgo;
                if (r.respuesta.valor) valor_gobierno = r.respuesta.valor;
            }
            
            // Procesar selecciones múltiples (pregunta 4)
            if (r.seleccionados && Array.isArray(r.seleccionados)) {
                r.seleccionados.forEach(opcion => {
                    if (opcion.tema) temas.push(opcion.tema);
                    if (opcion.boost_y) suma_y += opcion.boost_y;
                });
            }
            
            // Procesar escalas (pregunta 2 y 6)
            if (r.pregunta_id === 2 && r.valor) { // Seguridad
                suma_y += (r.valor * 7); // Mismo peso que en el prompt original
                contador_valores++;
            }
            if (r.pregunta_id === 6 && r.valor) { // Amapola
                suma_x += (r.valor * 8); // Mismo peso que en el prompt original
                contador_valores++;
            }
            
            // Capturar municipio de la pregunta 11
            if (r.pregunta_id === 11 && r.valor) {
                municipio_info = r.valor;
            }
        } catch (error) {
            console.error("Error procesando respuesta:", r, error);
        }
    });
    
    // Calcular promedio
    const promedio_x = contador_valores > 0 ? suma_x / contador_valores : 50; // Evitar división por cero
    const promedio_y = contador_valores > 0 ? suma_y / contador_valores : 50;
    
    // Normalizar a 0-100
    const posicion_x = Math.max(0, Math.min(100, promedio_x));
    const posicion_y = Math.max(0, Math.min(100, promedio_y));

    console.log(`📊 Perfil calculado - X: ${posicion_x.toFixed(2)}, Y: ${posicion_y.toFixed(2)}`);
    
    // Determinar etiqueta (usando la lógica original de 9 perfiles)
    let etiqueta = "";
    if (posicion_x < 40) {
        if (posicion_y < 40) etiqueta = "Conservador Liberal";
        else if (posicion_y < 70) etiqueta = "Conservador Moderado";
        else etiqueta = "Conservador Autoritario";
    } else if (posicion_x < 60) {
        if (posicion_y < 40) etiqueta = "Centrista Pragmático";
        else if (posicion_y < 70) etiqueta = "Centrista Equilibrado";
        else etiqueta = "Centrista con Énfasis Social";
    } else {
        if (posicion_y < 40) etiqueta = "Progresista Libertario";
        else if (posicion_y < 70) etiqueta = "Progresista Social";
        else etiqueta = "Progresista Radical";
    }
    
    // Tema principal
    const tema_principal = temas.length > 0 ? Object.entries(temas.reduce((acc, v) => (acc[v] = (acc[v] || 0) + 1, acc), {})).reduce((a, b) => a[1] > b[1] ? a : b)[0] : "Equilibrado";
    
    return {
        etiqueta: etiqueta,
        posicion_x: parseFloat(posicion_x.toFixed(2)),
        posicion_y: parseFloat(posicion_y.toFixed(2)),
        tema_principal: tema_principal,
        liderazgo_preferido: liderazgo,
        valor_gobierno: valor_gobierno,
        municipio: municipio_info,
        fecha: new Date().toISOString()
    };
}

async function saveToSupabase(perfil, contactInfo, analytics) {
    try {
        console.log("💾 Guardando en Supabase...");
        
        const dataToSave = {
            // perfil_etiqueta: perfil.etiqueta, // Quitado, se usa el JSON
            // perfil_descripcion: perfil.descripcion, // Quitado
            // ... (etc)
            
            // Guardar el perfil completo como un solo objeto JSON
            perfil_calculado: {
                etiqueta: perfil.etiqueta,
                posicion_x: perfil.posicion_x,
                posicion_y: perfil.posicion_y,
                tema_principal: perfil.tema_principal,
                liderazgo: perfil.liderazgo_preferido,
                valor_gobierno: perfil.valor_gobierno
            },
            
            municipio: perfil.municipio,
            
            // Guardar contacto como JSON
            contacto: {
                nombre: contactInfo?.nombre || null,
                email: contactInfo?.email || null
            },
            
            // Guardar respuestas completas para análisis futuro
            respuestas: analytics.userAnswers, // Guardar las respuestas crudas
            
            // Metadatos de analytics
            created_at: new Date(analytics.timestamp).toISOString(),
            user_agent: analytics.userAgent,
            referrer: analytics.referrer,
            utm: analytics.utm
        };
        
        const { data, error } = await supabase
            .from('participaciones') // <-- ¡CORREGIDO!
            .insert([dataToSave])
            .select();
            
        if (error) {
            console.error("❌ Error en Supabase:", error);
            return false;
        }
        
        console.log("✅ Guardado en Supabase exitosamente");
        return true;
        
    } catch (error) {
        console.error("❌ Error guardando en Supabase:", error);
        return false;
    }
}

export default async function handler(request, response) {
    const startTime = Date.now();
    
    try {
        console.log("🚀 PROCESAR: Nueva solicitud iniciada -", new Date().toISOString());
        
        // Solo aceptar POST
        if (request.method !== 'POST') {
            console.log("❌ PROCESAR: Método no permitido:", request.method);
            return response.status(405).json({ 
                success: false, 
                message: 'Método no permitido. Use POST.' 
            });
        }

        // Extraer datos del request
        const { userAnswers, contactInfo, userAgent, timestamp, municipality, referrer, utm } = request.body;
        
        console.log("📥 PROCESAR: Datos recibidos");
        console.log("  - Respuestas:", userAnswers?.length || 0);
        console.log("  - Contacto:", contactInfo?.email ? "Sí" : "No");
        console.log("  - Municipio (detectado):", municipality);

        // Validación básica
        if (!userAnswers || !Array.isArray(userAnswers) || userAnswers.length === 0) {
            console.log("❌ PROCESAR: No se recibieron respuestas válidas");
            return response.status(400).json({ 
                success: false, 
                message: 'No se recibieron respuestas válidas del cuestionario.' 
            });
        }

        // Calcular perfil
        console.log("🧠 PROCESAR: Calculando perfil político...");
        const perfil = calculatePoliticalProfile(userAnswers);
        // Si el municipio de la P11 es más confiable, usar ese.
        if (perfil.municipio === "No especificado" && municipality) {
            perfil.municipio = municipality; // Usar el de geolocalización como fallback
        }
        console.log("✅ PROCESAR: Perfil calculado:", perfil.etiqueta);


        // Guardar en Supabase (independiente de la respuesta)
        console.log("💾 PROCESAR: Guardando en base de datos...");
        const supabaseSuccess = await saveToSupabase(perfil, contactInfo, {
            userAnswers, // Pasar las respuestas crudas
            userAgent,
            referrer,
            utm,
            timestamp
        });

        // Enviar email si tenemos clave (opcional)
        if (process.env.RESEND_API_KEY && contactInfo?.email) {
            try {
                console.log("📧 PROCESAR: Enviando email...");
                const { Resend } = await import('resend');
                const resend = new Resend(process.env.RESEND_API_KEY);
                
                await resend.emails.send({
                    from: 'Mapa Político Guerrero <noreply@mapapoliticoguerero.com>',
                    to: [contactInfo.email],
                    subject: `Tu Perfil Político: ${perfil.etiqueta}`,
                    html: `
                        <h2>¡Gracias por participar en el Mapa Político de Guerrero!</h2>
                        <p>Hola ${contactInfo.nombre || 'Participante'},</p>
                        <p>Tu perfil político es: <strong>${perfil.etiqueta}</strong></p>
                        <p>Tu tema prioritario es: ${perfil.tema_principal}</p>
                        <p>El tipo de liderazgo que prefieres es: ${perfil.liderazgo_preferido}</p>
                        <p>Comparte tu resultado con tus amigos y conoce el perfil de tu familia.</p>
                        <br>
                        <p>¡Gracias por participar en esta iniciativa ciudadana!</p>
                    `
                });
                console.log("✅ PROCESAR: Email enviado exitosamente");
            } catch (emailError) {
                console.error("⚠️ PROCESAR: Error enviando email (no crítico):", emailError.message);
            }
        }

        // Calcular tiempo de procesamiento
        const processingTime = Date.now() - startTime;
        console.log(`⚡ PROCESAR: Completado en ${processingTime}ms`);

        // Responder siempre con éxito
        const result = {
            success: true,
            perfil: {
                etiqueta: perfil.etiqueta,
                // descripcion: perfil.descripcion, // Ya no se usa
                posicion_x: perfil.posicion_x,
                posicion_y: perfil.posicion_y,
                tema_principal: perfil.tema_principal,
                liderazgo_preferido: perfil.liderazgo_preferido,
                valor_gobierno: perfil.valor_gobierno,
                municipio: perfil.municipio,
                nombre: contactInfo?.nombre || ''
            },
            analytics: {
                processed_at: new Date().toISOString(),
                processing_time_ms: processingTime,
                supabase_saved: supabaseSuccess,
                answers_count: userAnswers.length
            }
        };

        console.log("🎉 PROCESAR: Enviando respuesta exitosa al frontend");
        return response.status(200).json(result);

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error("💥 PROCESAR: ERROR CRÍTICO después de", processingTime, "ms");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        
        return response.status(500).json({ 
            success: false, 
            message: 'Error procesando tu solicitud. Por favor intenta nuevamente.',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
