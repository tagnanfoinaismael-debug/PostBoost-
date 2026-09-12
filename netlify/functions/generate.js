import { GoogleGenAI } from '@google/genai';

export default async function handler(event, context) {
    // Vérifie que la méthode est bien POST
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: 'Méthode non autorisée' }) 
        };
    }

    try {
        // Récupération des données envoyées par ton formulaire frontend
        const body = JSON.parse(event.body || '{}');
        const { 
            product, 
            platform = 'TikTok', 
            tone = 'Vendeur & Dynamique', 
            emojiStyle = 'Modéré', 
            lang = 'fr',
            price,
            oldPrice,
            promo,
            delivery,
            location,
            contact,
            link
        } = body;

        if (!product) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'Le produit ou sujet de la publication est requis.' }) 
            };
        }

        // Construction des informations commerciales optionnelles pour l'IA
        let commercialInfo = '';
        if (price) commercialInfo += `- Prix : ${price}\n`;
        if (oldPrice) commercialInfo += `- Ancien prix : ${oldPrice}\n`;
        if (promo) commercialInfo += `- Promotion : ${promo}\n`;
        if (delivery) commercialInfo += `- Livraison : ${delivery}\n`;
        if (location) commercialInfo += `- Localisation : ${location}\n`;
        if (contact) commercialInfo += `- Contact / WhatsApp : ${contact}\n`;
        if (link) commercialInfo += `- Lien : ${link}\n`;

        // Création du prompt ultra-précis pour l'IA
        const promptText = `
Rédige une publication ultra-percutante et adaptée pour le réseau social ${platform}.
Sujet / Produit : ${product}
Ton souhaité : ${tone}
Style d'emojis : ${emojiStyle}
Langue de rédaction : ${lang} (Réponds impérativement dans cette langue).

Informations commerciales à inclure fidèlement si elles sont présentes (n'invente aucune fausse information si elles sont vides) :
${commercialInfo}
        `.trim();

        // Appel de l'API Google GenAI avec ton modèle et ta clé d'environnement Netlify
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptText,
        });

        const generatedPost = aiResponse.text || '';

        // Renvoie le texte généré au format attendu par ton index.html ({ text: ... })
        return {
            statusCode: 200,
            body: JSON.stringify({ text: generatedPost })
        };

    } catch (err) {
        console.error("Erreur serveur :", err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: err.message || 'Erreur interne du serveur.' }) 
        };
    }
}
