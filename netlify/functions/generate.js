import { createClient } from '@jsdelivr/npm/@supabase/supabase-js' // ou selon ton import habituel
import { GoogleGenAI } from '@google/genai' // ou ton client Gemini

export default async function handler(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) }
    }

    try {
        // 1. Récupérer le token d'autorisation envoyé par le front-end
        const authHeader = event.headers.authorization
        if (!authHeader) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Non authentifié.' }) }
        }

        // 2. Initialiser Supabase avec le contexte de l'utilisateur (pour respecter les RLS)
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { authorization: authHeader } } }
        )

        // 3. Identifier l'utilisateur
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Session invalide.' }) }
        }

        // 4. Vérifier les crédits de l'utilisateur dans la table profiles
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single()

        if (profileError || !profile || profile.credits <= 0) {
            return { statusCode: 403, body: JSON.stringify({ error: 'Crédits insuffisants.' }) }
        }

        // 5. Récupérer le prompt envoyé par le front-end
        const { prompt } = JSON.parse(event.body)
        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Le prompt est vide.' }) }
        }

        // 6. Appeler l'API Gemini avec la variable d'environnement Netlify
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Rédige un post LinkedIn professionnel et percutant basé sur cette idée : ${prompt}`,
        })

        const generatedPost = aiResponse.text

        // 7. Débiter 1 crédit de manière sécurisée en base de données
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ credits: profile.credits - 1 })
            .eq('id', user.id)

        if (updateError) {
            console.error("Erreur lors de la mise à jour des crédits :", updateError)
        }

        // 8. Renvoyer le post généré et les crédits restants au front-end
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                post: generatedPost,
                remainingCredits: profile.credits - 1
            })
        }

    } catch (err) {
        console.error("Erreur serveur :", err)
        return { statusCode: 500, body: JSON.stringify({ error: 'Erreur interne du serveur.' }) }
    }
}
