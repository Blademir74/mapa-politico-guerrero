import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Variables de entorno CRÍTICAS
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const adminPassword = process.env.ADMIN_PASSWORD; // NUEVA: Contraseña de admin desde variables de entorno

// === VERIFICACIÓN DE SEGURIDAD ===
if (!supabaseUrl || !supabaseAnonKey || !resendApiKey) {
    console.error("ERROR CRÍTICO: Faltan variables de entorno. Revisa la configuración en Vercel.");
    throw new Error("Configuración del servidor incompleta");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const resend = new Resend(resendApiKey);

// === FUNCIONES DE TRACKING AVANZADO ===
function logAnalyticsEvent(event, data) {
    console.log(`📊 ANALYTICS: ${event}`, data);
    
    // Aquí puedes integrar con Google Analytics, Mixpanel, etc.
    // Por ahora, solo loggamos
    return {
        timestamp: new Date().toISOString(),
        event: event,
        data: data
    };
}

function calculatePoliticalProfile(respuestas) {
    let suma_x = 0, suma_y = 0, contador = 0;
    let temas = [], liderazgo = "No definido", valor_gobierno = "No definido";
    
    respuestas.forEach(r => {
        if (r.respuesta && r.respuesta.valor_x !== undefined) {
            suma_x += r.respuesta.valor_x;
            suma_y += r.respuesta.valor_y;
            contador++;
            if (r.respuesta.tema) temas.push(r.respuesta.tema);
            if (r.respuesta.liderazgo) liderazgo = r.respuesta.liderazgo;
            if (r.respuesta.valor) valor_gobierno = r.respuesta.valor;
        } else if (r.seleccionados) {
            r.seleccionados.forEach(opcion => {
                temas.push(opcion.tema);
                suma_y += opcion.boost_y;
            });
        } else if (r.pregunta_id === 2 && r.valor) {
            suma_y += (r.valor * 7);
            contador++;
        } else if (r.pregunta_id === 6 && r.valor) {
            suma_x += (r.valor * 8);
            contador++;
        }
    });

    if (contador === 0) contador = 1;
    const posicion_x = Math.max(0, Math.min(100, (suma_x / contador) || 50));
    const posicion_y = Math.max(0, Math.min(100, (suma_y / contador) || 50));
    const etiqueta = determinarEtiqueta(posicion_x, posicion_y);
    const tema_principal = temas.length > 0 
        ? Object.entries(temas.reduce((acc, v) => (acc[v] = (acc[v] || 0) + 1, acc), {}))
                .reduce((a, b) => a[1] > b[1] ? a : b)[0] 
        : "Equilibrado";
    const municipio = respuestas.find(r => r.pregunta_id === 11)?.valor || "No especificado";

    return {
        posicion_x: Math.round(posicion_x),
        posicion_y: Math.round(posicion_y),
        etiqueta,
        tema_principal,
        liderazgo_preferido: liderazgo,
        valor_gobierno,
        municipio,
        calculoTimestamp: new Date().toISOString()
    };
}

function determinarEtiqueta(x, y) {
    if (x < 40) {
        if (y < 40) return "Conservador Liberal";
        if (y < 70) return "Conservador Moderado";
        return "Conservador Autoritario";
    } else if (x < 60) {
        if (y < 40) return "Centrista Pragmático";
        if (y < 70) return "Centrista Equilibrado";
        return "Centrista con Énfasis Social";
    } else {
        if (y < 40) return "Progresista Libertario";
        if (y < 70) return "Progresista Social";
        return "Progresista Radical";
    }
}

// === FUNCIÓN PRINCIPAL ===
export default async function handler(request, response) {
    console.log("🚀 PROCESAR: Iniciando función optimizada...");

    try {
        if (request.method !== 'POST') {
            console.log("❌ PROCESAR: Método no permitido");
            return response.status(405).json({ 
                success: false, 
                message: 'Método no permitido' 
            });
        }

        console.log("📥 PROCESAR: Request recibido...");
        const { userAnswers, contactInfo, userAgent, timestamp, municipality, referrer, utm } = request.body;

        if (!userAnswers) {
            console.log("❌ PROCESAR: No se encontraron respuestas");
            return response.status(400).json({ 
                success: false, 
                message: 'No se encontraron respuestas' 
            });
        }

        // === TRACKING AVANZADO ===
        const analyticsData = logAnalyticsEvent('survey_submission', {
            questions_count: userAnswers.length,
            has_contact: !!contactInfo?.email,
            municipality: municipality,
            user_agent: userAgent,
            referrer: referrer,
            utm: utm,
            submission_timestamp: timestamp
        });

        console.log("🧠 PROCESAR: Calculando perfil...");
        const perfil = calculatePoliticalProfile(userAnswers);
        console.log(`✅ PROCESAR: Perfil calculado: ${perfil.etiqueta}`);

        // === TRACKING DE PERFIL GENERADO ===
        logAnalyticsEvent('profile_generated', {
            ...analyticsData,
            perfil: perfil
        });

        // === GUARDAR EN SUPABASE CON DATOS ENRIQUECIDOS ===
        console.log("💾 PROCESAR: Guardando en Supabase...");
        
        // Preparar datos enriquecidos para análisis
        const participationData = {
            respuestas: userAnswers, 
            perfil_calculado: perfil,
            municipio: municipio || perfil.municipio,
            contacto: contactInfo,
            metadata: {
                user_agent: userAgent,
                submission_timestamp: timestamp,
                referrer: referrer,
                utm: utm,
                ip_address: request.headers['x-forwarded-for'] || request.headers['x-real-ip'],
                calculated_at: new Date().toISOString()
            }
        };

        const { data, error } = await supabase
            .from('participaciones')
            .insert([participationData]);
        
        if (error) {
            console.error("❌ PROCESAR: Error de Supabase:", error.message);
            
            // TRACKING DE ERROR
            logAnalyticsEvent('database_error', {
                error: error.message,
                perfil: perfil
            });
            
            throw new Error(`Error al guardar en la base de datos: ${error.message}`);
        }
        
        console.log("✅ PROCESAR: Guardado en Supabase exitoso.");

        // === ENVÍO DE EMAIL CON TRACKING ===
        if (contactInfo && contactInfo.email) {
            console.log("📧 PROCESAR: Enviando email...");
            
            try {
                await resend.emails.send({
                    from: 'Mapa Político de Guerrero <noreply@miperfilguerrero.com>',
                    to: contactInfo.email,
                    subject: `Tu Perfil Político de Guerrero: ${perfil.etiqueta}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h1 style="color: #1f2937; text-align: center;">¡Hola ${contactInfo.nombre || ''}! 🗺️</h1>
                            
                            <div style="background: linear-gradient(135deg, #10B981, #3B82F6); padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
                                <h2 style="color: white; margin: 0;">Tu Perfil Político es:</h2>
                                <h1 style="color: #FCD34D; margin: 10px 0 0 0;">${perfil.etiqueta}</h1>
                            </div>
                            
                            <div style="background: #F9FAFB; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                <h3 style="color: #1f2937;">Detalles de tu perfil:</h3>
                                <ul style="color: #4B5563;">
                                    <li><strong>Tema Prioritario:</strong> ${perfil.tema_principal}</li>
                                    <li><strong>Liderazgo Preferido:</strong> ${perfil.liderazgo_preferido}</li>
                                    <li><strong>Valor en Gobierno:</strong> ${perfil.valor_gobierno}</li>
                                    <li><strong>Municipio:</strong> ${perfil.municipio}</li>
                                </ul>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://mapa-politico-guerrero.vercel.app" 
                                   style="background: #FCD34D; color: #1f2937; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                                    🔄 Realizar el Test Nuevamente
                                </a>
                            </div>
                            
                            <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 30px;">
                                Este es un ejercicio de visualización de datos y no representa una encuesta electoral oficial.
                            </p>
                        </div>
                    `
                });
                
                console.log("✅ PROCESAR: Email enviado.");
                
                // TRACKING DE EMAIL
                logAnalyticsEvent('email_sent', {
                    email: contactInfo.email,
                    perfil: perfil
                });
                
            } catch (emailError) {
                console.error("❌ PROCESAR: Error enviando email:", emailError);
                // No fallar el proceso por error de email
                logAnalyticsEvent('email_error', {
                    error: emailError.message,
                    email: contactInfo.email
                });
            }
        }
        
        // === TRACKING FINAL ===
        logAnalyticsEvent('processing_completed', {
            ...analyticsData,
            perfil: perfil,
            success: true
        });
        
        console.log("🎉 PROCESAR: Enviando respuesta exitosa al frontend.");
        
        return response.status(200).json({ 
            success: true, 
            perfil: {
                ...perfil,
                nombre: contactInfo?.nombre || ''
            },
            analytics: {
                processed_at: new Date().toISOString(),
                data_enrichment: true
            }
        });

    } catch (error) {
        console.error("💥 PROCESAR: ERROR CRÍTICO:", error.message);
        
        // TRACKING DE ERROR GENERAL
        logAnalyticsEvent('processing_error', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        return response.status(500).json({ 
            success: false, 
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
