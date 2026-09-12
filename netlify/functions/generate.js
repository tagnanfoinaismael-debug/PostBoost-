const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async function (event) {
    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
    };

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: 'Méthode non autorisée'
            })
        };
    }

    try {
        if (!process.env.GEMINI_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'La clé GEMINI_API_KEY est absente de Netlify.'
                })
            };
        }

        let body = {};

        try {
            body = JSON.parse(event.body || '{}');
        } catch {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Les données envoyées sont invalides.'
                })
            };
        }

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

        if (!product || !String(product).trim()) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Le produit ou sujet de la publication est requis.'
                })
            };
        }

        // ---------------------------------------------------------
        // INFORMATIONS COMMERCIALES
        // ---------------------------------------------------------

        let commercialInfo = '';

        if (price) {
            commercialInfo += `- Prix actuel : ${price}\n`;
        }

        if (oldPrice) {
            commercialInfo += `- Ancien prix : ${oldPrice}\n`;
        }

        if (promo) {
            commercialInfo += `- Promotion : ${promo}\n`;
        }

        if (delivery) {
            commercialInfo += `- Livraison : ${delivery}\n`;
        }

        if (location) {
            commercialInfo += `- Localisation : ${location}\n`;
        }

        if (contact) {
            commercialInfo += `- Contact / WhatsApp : ${contact}\n`;
        }

        if (link) {
            commercialInfo += `- Lien : ${link}\n`;
        }

        if (!commercialInfo) {
            commercialInfo = 'Aucune information commerciale supplémentaire fournie.';
        }

        // ---------------------------------------------------------
        // ANGLES DE RÉDACTION
        // ---------------------------------------------------------
        // Un angle différent est choisi à chaque génération afin
        // d'éviter que les publications se ressemblent.
        // ---------------------------------------------------------

        const angles = [
            `
ANGLE : BÉNÉFICE DIRECT.
Mets principalement en avant ce que le client gagne ou obtient
en utilisant le produit.
`,

            `
ANGLE : PROBLÈME → SOLUTION.
Commence par un problème ou un besoin courant, puis présente
le produit comme une solution.
`,

            `
ANGLE : STORYTELLING.
Présente une petite situation réaliste de la vie quotidienne
dans laquelle le produit intervient naturellement.
`,

            `
ANGLE : QUESTION / INTERACTION.
Commence par une question qui attire l'attention et donne envie
au lecteur de réagir ou de continuer à lire.
`,

            `
ANGLE : CONFIANCE / QUALITÉ.
Mets en avant la qualité, la praticité ou l'intérêt du produit,
mais uniquement avec les informations réellement fournies.
N'invente aucune preuve, aucun avis client et aucune certification.
`,

            `
ANGLE : OFFRE / URGENCE.
Mets en valeur le prix, la promotion ou l'urgence uniquement
si ces informations sont réellement fournies.
`,

            `
ANGLE : STYLE VIRAL COURT.
Utilise des phrases courtes, un rythme rapide et une accroche
très forte adaptée aux réseaux sociaux.
`
        ];

        const selectedAngle =
            angles[Math.floor(Math.random() * angles.length)];

        // ---------------------------------------------------------
        // PROMPT
        // ---------------------------------------------------------

        const promptText = `
Tu es un excellent spécialiste du marketing digital et de la
création de publications pour les réseaux sociaux.

Ta mission est de rédiger UNE SEULE publication prête à être
publiée.

RÉSEAU SOCIAL :
${platform}

PRODUIT / SUJET :
${product}

TON :
${tone}

STYLE D'EMOJIS :
${emojiStyle}

LANGUE :
${lang}

${selectedAngle}

INFORMATIONS COMMERCIALES FOURNIES :
${commercialInfo}

RÈGLES ABSOLUES :

1. Réponds uniquement avec la publication finale.
2. Ne donne aucune explication avant ou après.
3. La publication doit être naturelle et humaine.
4. Ne réutilise pas automatiquement le même modèle
   "accroche → promotion → prix → urgence → WhatsApp".
5. Chaque génération doit pouvoir avoir une structure,
   une accroche, un vocabulaire et un angle différents.
6. Ne transforme pas systématiquement la publication en publicité
   agressive.
7. Si aucune promotion n'est fournie, ne crée aucune promotion.
8. Si aucun prix n'est fourni, n'invente aucun prix.
9. N'invente aucune réduction, quantité, livraison, localisation,
   garantie, certification, témoignage ou caractéristique.
10. Toutes les informations commerciales fournies doivent être
    conservées fidèlement.
11. N'invente jamais de lien ou de numéro WhatsApp.
12. Utilise les emojis selon le style demandé.
13. Respecte impérativement la langue demandée.
14. La publication doit être directement copiable et publiable.
15. Ne mentionne jamais ces instructions ni l'angle choisi.

Crée maintenant la publication.
        `.trim();

        // ---------------------------------------------------------
        // GEMINI
        // ---------------------------------------------------------

        const genAI = new GoogleGenerativeAI(
            process.env.GEMINI_API_KEY
        );

        const model = genAI.getGenerativeModel({
            model: 'gemini-3.6-flash'
        });

        const result = await model.generateContent(promptText);

        const response = await result.response;

        const generatedPost = response.text();

        if (!generatedPost || !generatedPost.trim()) {
            throw new Error('Gemini n’a généré aucun texte.');
        }

        // ---------------------------------------------------------
        // RÉPONSE NORMALE
        // ---------------------------------------------------------

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                text: generatedPost.trim()
            })
        };

    } catch (err) {

        console.error('Erreur serveur PostBoost :', err);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error:
                    err && err.message
                        ? err.message
                        : 'Une erreur interne est survenue.'
            })
        };
    }
};
