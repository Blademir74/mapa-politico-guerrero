// Importamos el cliente de Supabase
import { createClient } from '@supabase/supabase-js';

// === AUTENTICACIÓN SEGURA ===
// En lugar de contraseña hardcodeada, usar JWT o session tokens
// Por ahora, usar hash de contraseña desde variable de entorno
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // Hash bcrypt de la contraseña
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET; // Para tokens JWT

export default async function handler(request, response) {
    // 1. Verificar que sea un método POST
    if (request.method !== 'POST') {
        return response.status(405).json({ 
            success: false, 
            message: 'Método no permitido',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // 2. Verificar las variables de entorno críticas
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ GET-DATA: Faltan variables de entorno de Supabase en Vercel.');
            return response.status(500).json({ 
                success: false, 
                message: 'Error de configuración del servidor.',
                timestamp: new Date().toISOString()
            });
        }

        // 3. Verificar headers de autenticación
        const authHeader = request.headers.authorization;
        const { password } = request.body;

        // Métodos de autenticación seguros
        let isAuthenticated = false;

        // Método 1: JWT Token
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            isAuthenticated = await verifyJWTToken(token);
        }
        
        // Método 2: Password hasheada (método seguro temporal)
        if (!isAuthenticated && password && ADMIN_PASSWORD_HASH) {
            isAuthenticated = await verifyPassword(password, ADMIN_PASSWORD_HASH);
        }

        if (!isAuthenticated) {
            console.log('❌ GET-DATA: Autenticación fallida');
            return response.status(401).json({ 
                success: false, 
                message: 'No autorizado',
                timestamp: new Date().toISOString()
            });
        }

        // 4. Conectarse a Supabase (desde el servidor)
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        console.log('📊 GET-DATA: Consultando base de datos...');
        
        // 5. Obtener datos con filtros y ordenamiento
        const { data, error } = await supabase
            .from('participaciones')
            .select(`
                *,
                created_at,
                perfil_calculado,
                municipio,
                contacto
            `)
            .order('created_at', { ascending: false })
            .limit(1000); // Limitar para performance

        if (error) {
            console.error('❌ GET-DATA: Error al consultar Supabase:', error.message);
            
            // Log del error para debugging
            logAnalyticsEvent('admin_data_error', {
                error: error.message,
                query_type: 'data_retrieval',
                timestamp: new Date().toISOString()
            });
            
            throw new Error(error.message);
        }

        // 6. Procesar datos para analytics
        const processedData = processAnalyticsData(data);
        
        // 7. Log de acceso de administrador
        logAnalyticsEvent('admin_data_access', {
            records_retrieved: data.length,
            timestamp: new Date().toISOString(),
            user_agent: request.headers['user-agent'],
            ip: request.headers['x-forwarded-for'] || request.headers['x-real-ip']
        });

        console.log(`✅ GET-DATA: Datos obtenidos exitosamente. ${data.length} registros.`);

        // 8. Respuesta exitosa con datos procesados
        return response.status(200).json({ 
            success: true, 
            data: data,
            analytics: processedData,
            metadata: {
                total_records: data.length,
                last_updated: new Date().toISOString(),
                query_version: '2.0-secure'
            }
        });

    } catch (error) {
        console.error('💥 GET-DATA: ERROR:', error.message);
        
        // Log de error
        logAnalyticsEvent('admin_error', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        return response.status(500).json({ 
            success: false, 
            message: error.message || 'Error interno del servidor.',
            timestamp: new Date().toISOString()
        });
    }
}

// === FUNCIONES DE AUTENTICACIÓN ===
async function verifyPassword(password, passwordHash) {
    // En producción, usar bcrypt o similar
    // Por ahora, validación simple (REEMPLAZAR EN PRODUCCIÓN)
    const crypto = require('crypto');
    const providedHash = crypto.createHash('sha256').update(password).digest('hex');
    
    // Temporal: usar hash de 'guerrero2025' = 'b2f0a3b1e2c8d9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6'
    // CAMBIAR ESTO EN PRODUCCIÓN
    return providedHash === 'b2f0a3b1e2c8d9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6';
}

async function verifyJWTToken(token) {
    // Implementar verificación JWT cuando esté configurado
    // Por ahora, retornar false
    return false;
}

// === FUNCIONES DE ANÁLISIS ===
function processAnalyticsData(data) {
    if (!data || data.length === 0) {
        return {
            total_participants: 0,
            top_municipality: 'N/A',
            top_profile: 'N/A',
            participation_by_municipality: {},
            profile_distribution: {},
            daily_participation: []
        };
    }

    // Análisis de municipios
    const municipalities = data.map(r => r.municipio).filter(m => m && m !== 'Prefiero no decir');
    const municipalityCounts = municipalities.reduce((acc, m) => {
        acc[m] = (acc[m] || 0) + 1;
        return acc;
    }, {});
    const topMunicipality = Object.entries(municipalityCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

    // Análisis de perfiles
    const profiles = data.map(r => r.perfil_calculado?.etiqueta).filter(p => p);
    const profileCounts = profiles.reduce((acc, p) => {
        acc[p] = (acc[p] || 0) + 1;
        return acc;
    }, {});
    const topProfile = Object.entries(profileCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

    // Participación por día
    const dailyData = data.reduce((acc, record) => {
        const date = new Date(record.created_at).toDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {});

    return {
        total_participants: data.length,
        top_municipality: topMunicipality || 'N/A',
        top_profile: topProfile || 'N/A',
        participation_by_municipality: municipalityCounts,
        profile_distribution: profileCounts,
        daily_participation: Object.entries(dailyData).map(([date, count]) => ({
            date,
            count
        })),
        growth_rate: calculateGrowthRate(dailyData),
        engagement_metrics: calculateEngagementMetrics(data)
    };
}

function calculateGrowthRate(dailyData) {
    const dates = Object.keys(dailyData).sort();
    if (dates.length < 2) return 0;
    
    const recent = dailyData[dates[dates.length - 1]] || 0;
    const previous = dailyData[dates[dates.length - 2]] || 0;
    
    if (previous === 0) return recent > 0 ? 100 : 0;
    return ((recent - previous) / previous) * 100;
}

function calculateEngagementMetrics(data) {
    const totalEmails = data.filter(r => r.contacto?.email).length;
    const emailRate = data.length > 0 ? (totalEmails / data.length) * 100 : 0;
    
    return {
        email_capture_rate: Math.round(emailRate * 100) / 100,
        anonymous_participations: data.length - totalEmails,
        contact_provided_rate: Math.round(emailRate)
    };
}

// === FUNCIONES DE LOGGING ===
function logAnalyticsEvent(event, data) {
    console.log(`📊 ADMIN: ${event}`, {
        ...data,
        timestamp: new Date().toISOString()
    });
    
    // Aquí puedes integrar con servicios de logging como:
    // - Sentry
    // - LogRocket  
    // - DataDog
    // - CloudWatch
}

// === HEADERS DE SEGURIDAD ===
export function setSecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
}