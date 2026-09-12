const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: 'Méthode non autorisée' }) 
        };
    }

    try {
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

        let commercialInfo = '';
        if (price) commercialInfo += `- Prix : ${price}\n`;
        if (oldPrice) commercialInfo += `- Ancien prix : ${oldPrice}\n`;
        if (promo) commercialInfo += `- Promotion : ${promo}\n`;
        if (delivery) commercialInfo += `- Livraison : ${delivery}\n`;
        if (location) commercialInfo += `- Localisation : ${location}\n`;
        if (contact) commercialInfo += `- Contact / WhatsApp : ${contact}\n`;
        if (link) commercialInfo += `- Lien : ${link}\n`;

        const promptText = `
Rédige une publication ultra-percutante et adaptée pour le réseau social ${platform}.
Sujet / Produit : ${product}
Ton souhaité : ${tone}
Style d'emojis : ${emojiStyle}
Langue de rédaction : ${lang} (Réponds impérativement dans cette langue).

Informations commerciales à inclure fidèlement si elles sont présentes (n'invente aucune fausse information si elles sont vides) :
${commercialInfo}
        `.trim();

        // Initialisation avec le SDK officiel correct
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent(promptText);
        const response = await result.response;
        const generatedPost = response.text() || '';

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
};
