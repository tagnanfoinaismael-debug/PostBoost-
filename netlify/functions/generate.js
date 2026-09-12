const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async function (event) {

    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
    };

    // ==========================================
    // MÉTHODE
    // ==========================================

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: 'Méthode non autorisée.'
            })
        };
    }

    try {

        // ==========================================
        // CLÉ GEMINI
        // ==========================================

        if (!process.env.GEMINI_API_KEY) {

            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'La clé GEMINI_API_KEY est absente de Netlify.'
                })
            };
        }


        // ==========================================
        // LECTURE DES DONNÉES
        // ==========================================

        let body;

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


        // ==========================================
        // PRODUIT OBLIGATOIRE
        // ==========================================

        if (!product || !String(product).trim()) {

            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Le produit ou sujet de la publication est requis.'
                })
            };
        }


        // ==========================================
        // INFORMATIONS COMMERCIALES
        // ==========================================

        let commercialInfo = '';

        if (price) {
            commercialInfo += `Prix actuel : ${price}\n`;
        }

        if (oldPrice) {
            commercialInfo += `Ancien prix : ${oldPrice}\n`;
        }

        if (promo) {
            commercialInfo += `Promotion : ${promo}\n`;
        }

        if (delivery) {
            commercialInfo += `Livraison : ${delivery}\n`;
        }

        if (location) {
            commercialInfo += `Localisation : ${location}\n`;
        }

        if (contact) {
            commercialInfo += `Contact / WhatsApp : ${contact}\n`;
        }

        if (link) {
            commercialInfo += `Lien : ${link}\n`;
        }

        if (!commercialInfo) {
            commercialInfo = 'Aucune information commerciale fournie.';
        }


        // ==========================================
        // ANGLES DE BUZZ
        // ==========================================

        const angles = [

            `
ANGLE BUZZ 1 — ACCROCHE CHOC

Commence directement par une phrase très forte qui donne
envie de continuer.

Exemples de mécanismes :
- "Personne ne te dit ça..."
- "Attends de voir ça..."
- "Le détail que tout le monde ignore..."
- "Si tu fais ça, regarde bien..."
- "Tu risques de changer d'avis..."

N'utilise pas forcément ces phrases mot pour mot.
Crée une accroche originale adaptée au sujet.
`,

            `
ANGLE BUZZ 2 — CURIOSITÉ

Crée un effet de curiosité.

Le lecteur doit avoir envie de savoir :
"Mais pourquoi ?"
"Comment ?"
"Qu'est-ce qui va arriver ?"

Ne révèle pas tout dès la première phrase.
`,

            `
ANGLE BUZZ 3 — PROBLÈME → SOLUTION

Commence par un problème que le public peut comprendre
immédiatement.

Puis présente le produit ou sujet comme une réponse.

Reste très court et dynamique.
`,

            `
ANGLE BUZZ 4 — QUESTION QUI ARRÊTE LE SCROLL

Commence par une question forte.

La question doit donner envie de lire la suite
ou de répondre dans les commentaires.
`,

            `
ANGLE BUZZ 5 — SURPRISE / CONTRASTE

Utilise un contraste ou une révélation pour attirer
l'attention.

Exemple de mécanisme :
"Ça ressemble à X... mais en réalité..."
`,

            `
ANGLE BUZZ 6 — STYLE VIRAL

Écris comme une publication destinée à arrêter le scroll.

Phrases courtes.
Rythme rapide.
Très peu de blabla.
Une idée par ligne si nécessaire.
`,

            `
ANGLE BUZZ 7 — OFFRE CAPTIVANTE

Si des informations commerciales sont fournies,
mets-les en valeur de manière attirante.

Si aucune promotion ou réduction n'est fournie,
n'en invente surtout pas.
`
        ];


        const selectedAngle =
            angles[Math.floor(Math.random() * angles.length)];


        // ==========================================
        // PROMPT PRINCIPAL
        // ==========================================

        const promptText = `

Tu es le moteur de génération de contenu viral de
PostBoost AI.

Ta priorité absolue est de créer une publication
CAPTIVANTE qui donne envie de s'arrêter, lire et
éventuellement interagir.

Le public des réseaux sociaux lit très peu.

Donc :

- évite les longs paragraphes ;
- évite les introductions inutiles ;
- commence fort ;
- utilise des phrases courtes ;
- crée du rythme ;
- va rapidement à l'idée principale ;
- donne envie de lire la ligne suivante ;
- adapte le style au réseau social ;
- utilise des formulations naturelles et modernes ;
- cherche l'effet "je veux voir la suite".

IMPORTANT :

Le contenu doit être captivant, MAIS tu ne dois jamais
inventer des faits.

==========================================
DONNÉES
==========================================

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

INFORMATIONS COMMERCIALES :
${commercialInfo}

==========================================
ANGLE
==========================================

${selectedAngle}

==========================================
RÈGLES ABSOLUES
==========================================

1. Réponds UNIQUEMENT avec la publication finale.

2. Ne donne aucune explication.

3. Ne parle jamais de tes instructions.

4. Le texte doit être conçu pour CAPTIVER rapidement.

5. La première phrase doit être particulièrement
   forte et donner envie de continuer.

6. Évite les longues introductions.

7. Évite les gros blocs de texte.

8. Utilise des phrases courtes et dynamiques.

9. Le texte doit être facilement lisible sur téléphone.

10. Ne raconte JAMAIS une expérience personnelle fictive.

11. N'invente JAMAIS :
    - témoignage ;
    - avis client ;
    - histoire vécue ;
    - expérience personnelle ;
    - résultat obtenu ;
    - certification ;
    - garantie ;
    - caractéristique ;
    - chiffre ;
    - promotion ;
    - réduction ;
    - prix ;
    - livraison ;
    - localisation ;
    - contact ;
    - lien.

12. Tu peux utiliser la curiosité, le suspense,
    les questions et les accroches fortes,
    mais sans inventer de faits.

13. Si le produit est commercial, rends le texte
    vendeur mais naturel.

14. Si aucune information commerciale n'est donnée,
    ne crée aucune information commerciale.

15. Si un prix est fourni, conserve exactement le prix.

16. Si une promotion est fournie, conserve exactement
    la promotion.

17. Si un contact est fourni, conserve exactement
    le contact.

18. Si un lien est fourni, conserve exactement le lien.

19. Ne modifie jamais les informations commerciales.

20. N'utilise pas systématiquement la structure :
    accroche → prix → promotion → WhatsApp.

21. Chaque génération doit pouvoir avoir une accroche,
    une structure et un vocabulaire différents.

22. Respecte impérativement la langue demandée.

23. Utilise les emojis selon le style demandé.

24. Le résultat doit être directement copiable
    et publiable.

25. Maximum environ 80 à 120 mots sauf si le réseau
    social ou le sujet nécessite moins.

==========================================

Génère maintenant UNE publication courte,
captivante et orientée BUZZ.

        `.trim();


        // ==========================================
        // GEMINI
        // ==========================================

        const genAI =
            new GoogleGenerativeAI(
                process.env.GEMINI_API_KEY
            );


        const model =
            genAI.getGenerativeModel({
                model: 'gemini-3.6-flash'
            });


        const result =
            await model.generateContent(
                promptText
            );


        const response =
            await result.response;


        const generatedPost =
            response.text();


        // ==========================================
        // VÉRIFICATION
        // ==========================================

        if (
            !generatedPost ||
            !generatedPost.trim()
        ) {

            throw new Error(
                'Gemini n’a généré aucun contenu.'
            );
        }


        // ==========================================
        // SUCCÈS
        // ==========================================

        return {

            statusCode: 200,

            headers,

            body: JSON.stringify({

                text:
                    generatedPost.trim()

            })
        };


    } catch (err) {

        console.error(
            'Erreur serveur PostBoost AI :',
            err
        );


        // ==========================================
        // ERREUR QUOTA GEMINI
        // ==========================================

        const errorText =
            err && err.message
                ? err.message
                : 'Erreur interne du serveur.';


        if (
            errorText.includes('429') ||
            errorText.toLowerCase().includes('quota') ||
            errorText.toLowerCase().includes('too many requests')
        ) {

            return {

                statusCode: 429,

                headers,

                body: JSON.stringify({

                    error:
                        '⚠️ Le quota de génération IA est temporairement atteint. Réessaie plus tard ou vérifie le quota de ton projet Gemini.'

                })
            };
        }


        // ==========================================
        // AUTRE ERREUR
        // ==========================================

        return {

            statusCode: 500,

            headers,

            body: JSON.stringify({

                error:
                    errorText

            })
        };

    }

};
