const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const data = JSON.parse(event.body);
        const { product, platform, tone, emojiStyle, lang, price, oldPrice, promo, delivery, location, contact, link } = data;

        if (!product) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Le produit ou sujet est requis.' }) };
        }

        // Rédiger les instructions selon la langue
        let langInstruction = "Rédige la publication en Français.";
        if (lang === 'en') langInstruction = "Write the post in English.";
        if (lang === 'zh') langInstruction = "用中文撰写帖子。";
        if (lang === 'es') langInstruction = "Escribe la publicación en Español.";

        // Règle anti-répétition et de variation d'angle
        const antiRepetitionRule = `
        IMPORTANT - VARIATION OBLIGATOIRE :
        À chaque génération, tu dois impérativement changer d'angle marketing, de structure de texte et d'accroche (hook). Ne formule jamais de la même manière. 
        Alterne aléatoirement entre différents styles d'approche : 
        1. L'angle "Curiosité / Question provocquante"
        2. L'angle "Bénéfice direct / Résolution de problème"
        3. L'angle "Urgence / Opportunité rare"
        4. L'angle "Storytelling immersif / Témoignage"
        Ne réutilise pas de structure répétitive. Sois créatif, percutant et unique.
        `;

        const commercialDetails = `
        Détails commerciaux à intégrer fidèlement (n'invente rien d'autre si ce n'est pas fourni) :
        - Prix : ${price || 'Non spécifié'}
        - Ancien prix : ${oldPrice || 'Non spécifié'}
        - Promotion : ${promo || 'Non spécifié'}
        - Livraison : ${delivery || 'Non spécifié'}
        - Localisation : ${location || 'Non spécifié'}
        - Contact / WhatsApp : ${contact || 'Non spécifié'}
        - Lien : ${link || 'Non spécifié'}
        `;

        const prompt = `
        Tu es un expert en marketing digital et copywriter d'élite pour les réseaux sociaux.
        ${langInstruction}
        ${antiRepetitionRule}

        Crée une publication ultra-engageante optimisée spécifiquement pour la plateforme : ${platform}.
        Le ton souhaité est : ${tone}.
        Le style d'emojis demandé est : ${emojiStyle}.
        Le produit ou sujet principal est : ${product}.

        ${commercialDetails}

        Respecte scrupuleusement le style d'emojis choisi. Structure ton texte avec des sauts de ligne propres, des accroches fortes et des appels à l'action clairs. N'ajoute aucun commentaire avant ou après, donne directement le texte prêt à être publié.
        `;

        // Appel à l'API Gemini avec une température élevée pour stimuler la créativité et la variété
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.9, // Température haute pour éviter les répétitions et forcer l'originalité
                maxOutputTokens: 1000,
            }
        });

        const generatedText = response.text;

        return {
            statusCode: 200,
            body: JSON.stringify({ text: generatedText })
        };

    } catch (error) {
        console.error('Erreur Backend :', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Erreur interne du serveur.' })
        };
    }
};
