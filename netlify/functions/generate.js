const { GoogleGenerativeAI } = require('@google/generative-ai');

// ======================================================
// MODÈLES GEMINI
// ======================================================

// Modèle principal
const PRIMARY_MODEL = 'gemini-3.6-flash';

// Modèles de secours
const FALLBACK_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite'
];

// Nombre maximum de tentatives pour une erreur temporaire
const MAX_RETRIES = 3;

const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));


// ======================================================
// RÉCUPÉRER LE MESSAGE D'ERREUR
// ======================================================

function getErrorMessage(error) {

    if (!error) return '';

    if (typeof error === 'string') {
        return error;
    }

    if (error.message) {
        return String(error.message);
    }

    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}


// ======================================================
// DÉTECTER LE TYPE D'ERREUR GEMINI
// ======================================================

function detectGeminiError(error) {

    const message =
        getErrorMessage(error).toLowerCase();


    // --------------------------------------------------
    // QUOTA
    // --------------------------------------------------

    if (
        message.includes('generate_content_free_tier_requests') ||
        message.includes('quota exceeded') ||
        message.includes('quota_exceeded') ||
        message.includes('daily quota') ||
        message.includes('quota')
    ) {
        return 'daily_quota';
    }


    // --------------------------------------------------
    // LIMITE TEMPORAIRE
    // --------------------------------------------------

    if (
        message.includes('too many requests') ||
        message.includes('rate limit') ||
        message.includes('rate_limit_exceeded') ||
        message.includes('resource_exhausted') ||
        message.includes('429')
    ) {
        return 'temporary_rate_limit';
    }


    // --------------------------------------------------
    // CLÉ API
    // --------------------------------------------------

    if (
        message.includes('api key') ||
        (
            message.includes('invalid') &&
            message.includes('key')
        ) ||
        message.includes('authentication') ||
        message.includes('unauthenticated')
    ) {
        return 'api_key';
    }


    // --------------------------------------------------
    // MODÈLE INEXISTANT
    // --------------------------------------------------

    if (
        message.includes('model not found') ||
        message.includes('not_found') ||
        message.includes('unknown model') ||
        message.includes('unsupported model')
    ) {
        return 'model_not_found';
    }


    // --------------------------------------------------
    // CONTENU BLOQUÉ
    // --------------------------------------------------

    if (
        message.includes('safety') ||
        message.includes('blocked') ||
        message.includes('recitation')
    ) {
        return 'blocked';
    }


    // --------------------------------------------------
    // SERVICE INDISPONIBLE
    // --------------------------------------------------

    if (
        message.includes('503') ||
        message.includes('service unavailable') ||
        message.includes('temporarily unavailable')
    ) {
        return 'service_unavailable';
    }


    // --------------------------------------------------
    // ERREUR INCONNUE
    // --------------------------------------------------

    return 'unknown';
}


// ======================================================
// MESSAGE D'ERREUR POUR L'UTILISATEUR
// ======================================================

function getFriendlyError(type) {

    switch (type) {

        case 'daily_quota':

            return {
                statusCode: 429,
                message:
                    '⚠️ Le service IA est momentanément très sollicité. Tes crédits PostBoost sont toujours disponibles. Réessaie un peu plus tard.'
            };


        case 'temporary_rate_limit':

            return {
                statusCode: 429,
                message:
                    '⏳ Trop de demandes IA ont été envoyées en peu de temps. Attends quelques secondes puis réessaie.'
            };


        case 'api_key':

            return {
                statusCode: 500,
                message:
                    '🔑 La clé API Gemini n’est pas correctement configurée sur le serveur.'
            };


        case 'model_not_found':

            return {
                statusCode: 500,
                message:
                    '🤖 Le modèle IA configuré n’est pas disponible actuellement.'
            };


        case 'blocked':

            return {
                statusCode: 400,
                message:
                    '⚠️ Gemini a bloqué cette génération. Essaie avec un autre sujet ou une formulation différente.'
            };


        case 'service_unavailable':

            return {
                statusCode: 503,
                message:
                    '☁️ Le service IA est momentanément indisponible. Réessaie dans quelques instants.'
            };


        default:

            return {
                statusCode: 500,
                message:
                    '❌ Une erreur est survenue pendant la génération IA. Réessaie dans quelques instants.'
            };
    }
}


// ======================================================
// GÉNÉRER AVEC UN MODÈLE
// ======================================================

async function generateWithModel(
    genAI,
    modelName,
    promptText
) {

    const model =
        genAI.getGenerativeModel({
            model: modelName
        });


    let lastError;


    // --------------------------------------------------
    // RETRIES POUR LES ERREURS TEMPORAIRES
    // --------------------------------------------------

    for (
        let attempt = 0;
        attempt < MAX_RETRIES;
        attempt++
    ) {

        try {

            const result =
                await model.generateContent(
                    promptText
                );


            // Vérification
            if (!result) {

                throw new Error(
                    'Gemini n’a retourné aucune réponse.'
                );
            }


            const response =
                await result.response;


            const generatedPost =
                response.text();


            if (
                !generatedPost ||
                !generatedPost.trim()
            ) {

                throw new Error(
                    'Gemini n’a généré aucun contenu.'
                );
            }


            // SUCCÈS
            return {
                success: true,
                text: generatedPost.trim(),
                model: modelName
            };


        } catch (error) {

            lastError = error;


            const errorType =
                detectGeminiError(error);


            // --------------------------------------------------
            // CES ERREURS NE DOIVENT PAS ÊTRE RETRY
            // --------------------------------------------------

            if (
                errorType === 'daily_quota' ||
                errorType === 'api_key' ||
                errorType === 'blocked'
            ) {

                throw error;
            }


            // --------------------------------------------------
            // MODÈLE INDISPONIBLE
            // On laisse la fonction principale essayer
            // le modèle suivant.
            // --------------------------------------------------

            if (errorType === 'model_not_found') {

                throw error;
            }


            // --------------------------------------------------
            // ERREUR NON TEMPORAIRE
            // --------------------------------------------------

            if (
                errorType !== 'temporary_rate_limit' &&
                errorType !== 'service_unavailable'
            ) {

                throw error;
            }


            // --------------------------------------------------
            // DERNIÈRE TENTATIVE
            // --------------------------------------------------

            if (attempt === MAX_RETRIES - 1) {

                throw error;
            }


            // --------------------------------------------------
            // BACKOFF
            // 1 seconde → 2 secondes
            // --------------------------------------------------

            const delay =
                1000 * Math.pow(2, attempt);


            await sleep(delay);
        }
    }


    throw lastError;
}


// ======================================================
// FALLBACK GEMINI
// ======================================================

async function generateWithFallback(
    genAI,
    promptText
) {

    // --------------------------------------------------
    // TOUS LES MODÈLES À ESSAYER
    // --------------------------------------------------

    const models = [
        PRIMARY_MODEL,
        ...FALLBACK_MODELS
    ];


    let lastError = null;
    let lastErrorType = 'unknown';


    // --------------------------------------------------
    // ESSAYER LES MODÈLES UN PAR UN
    // --------------------------------------------------

    for (
        let index = 0;
        index < models.length;
        index++
    ) {

        const modelName = models[index];


        console.log(
            `PostBoost: tentative avec ${modelName}`
        );


        try {

            const result =
                await generateWithModel(
                    genAI,
                    modelName,
                    promptText
                );


            if (result.success) {

                console.log(
                    `PostBoost: génération réussie avec ${modelName}`
                );


                return result;
            }


        } catch (error) {

            lastError = error;


            const errorType =
                detectGeminiError(error);


            lastErrorType =
                errorType;


            console.error(
                `PostBoost: ${modelName} a échoué.`,
                errorType,
                getErrorMessage(error)
            );


            // --------------------------------------------------
            // ERREURS QUI NE DOIVENT PAS PASSER AU MODÈLE SUIVANT
            // --------------------------------------------------

            if (
                errorType === 'api_key' ||
                errorType === 'blocked'
            ) {

                throw error;
            }


            // --------------------------------------------------
            // POUR LE QUOTA :
            // on essaie immédiatement le modèle suivant.
            // --------------------------------------------------

            if (errorType === 'daily_quota') {

                console.log(
                    `PostBoost: quota atteint sur ${modelName}. Passage au modèle suivant.`
                );

                continue;
            }


            // --------------------------------------------------
            // MODÈLE INDISPONIBLE :
            // essayer le suivant.
            // --------------------------------------------------

            if (errorType === 'model_not_found') {

                console.log(
                    `PostBoost: modèle ${modelName} indisponible. Passage au modèle suivant.`
                );

                continue;
            }


            // --------------------------------------------------
            // SERVICE TEMPORAIREMENT INDISPONIBLE :
            // essayer le suivant.
            // --------------------------------------------------

            if (
                errorType === 'temporary_rate_limit' ||
                errorType === 'service_unavailable'
            ) {

                console.log(
                    `PostBoost: problème temporaire avec ${modelName}. Passage au modèle suivant.`
                );

                continue;
            }


            // --------------------------------------------------
            // AUTRE ERREUR :
            // on arrête pour éviter des appels inutiles.
            // --------------------------------------------------

            break;
        }
    }


    // --------------------------------------------------
    // TOUS LES MODÈLES ONT ÉCHOUÉ
    // --------------------------------------------------

    const finalError =
        new Error(
            `Tous les modèles Gemini ont échoué. Dernière erreur : ${lastErrorType}`
        );


    finalError.originalError =
        lastError;


    throw finalError;
}


// ======================================================
// NETLIFY FUNCTION
// ======================================================

exports.handler = async function (event) {

    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
    };


    // ==================================================
    // MÉTHODE
    // ==================================================

    if (event.httpMethod !== 'POST') {

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error:
                    'Méthode non autorisée.'
            })
        };
    }


    // ==================================================
    // CLÉ GEMINI
    // ==================================================

    if (!process.env.GEMINI_API_KEY) {

        console.error(
            'GEMINI_API_KEY absente de Netlify.'
        );


        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error:
                    '🔑 La clé API Gemini est absente de la configuration Netlify.'
            })
        };
    }


    // ==================================================
    // LECTURE DU BODY
    // ==================================================

    let body;


    try {

        body =
            JSON.parse(
                event.body || '{}'
            );

    } catch (error) {

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error:
                    '❌ Les données envoyées par PostBoost sont invalides.'
            })
        };
    }


    // ==================================================
    // DONNÉES
    // ==================================================

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


    // ==================================================
    // VALIDATION PRODUIT
    // ==================================================

    if (
        !product ||
        !String(product).trim()
    ) {

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error:
                    'Le produit ou sujet de la publication est requis.'
            })
        };
    }


    // ==================================================
    // INFORMATIONS COMMERCIALES
    // ==================================================

    let commercialInfo = '';


    if (price) {
        commercialInfo +=
            `Prix actuel : ${price}\n`;
    }


    if (oldPrice) {
        commercialInfo +=
            `Ancien prix : ${oldPrice}\n`;
    }


    if (promo) {
        commercialInfo +=
            `Promotion : ${promo}\n`;
    }


    if (delivery) {
        commercialInfo +=
            `Livraison : ${delivery}\n`;
    }


    if (location) {
        commercialInfo +=
            `Localisation : ${location}\n`;
    }


    if (contact) {
        commercialInfo +=
            `Contact / WhatsApp : ${contact}\n`;
    }


    if (link) {
        commercialInfo +=
            `Lien : ${link}\n`;
    }


    if (!commercialInfo) {

        commercialInfo =
            'Aucune information commerciale fournie.';
    }


    // ==================================================
    // ANGLES BUZZ
    // ==================================================

    const angles = [

        `
ACCROCHE CHOC :
Commence par une phrase qui arrête immédiatement le scroll.
`,

        `
CURIOSITÉ :
Crée une question ou une révélation qui donne envie de lire
la ligne suivante.
`,

        `
PROBLÈME → SOLUTION :
Présente rapidement un problème reconnaissable puis introduis
le produit ou le sujet comme solution.
`,

        `
QUESTION VIRALE :
Commence par une question courte qui pousse naturellement
à réfléchir ou à commenter.
`,

        `
SURPRISE :
Utilise un contraste ou une formulation inattendue pour
attirer l'attention.
`,

        `
STYLE RÉSEAUX SOCIAUX :
Phrases très courtes, rythme rapide, aucune longueur inutile.
`,

        `
OFFRE :
Si des informations commerciales sont présentes, mets-les
en valeur de façon naturelle et attractive.
`
    ];


    const selectedAngle =
        angles[
            Math.floor(
                Math.random() *
                angles.length
            )
        ];


    // ==================================================
    // PROMPT
    // ==================================================

    const promptText = `

Tu es le moteur de génération de contenu viral de PostBoost AI.

OBJECTIF PRINCIPAL :

Créer une publication extrêmement captivante qui donne envie
de s'arrêter, de lire et éventuellement d'interagir.

Les utilisateurs des réseaux sociaux lisent rapidement.

La publication doit donc être :

- courte ;
- directe ;
- dynamique ;
- facile à lire sur téléphone ;
- visuellement aérée ;
- captivante dès la première ligne ;
- orientée BUZZ ;
- naturelle ;
- adaptée au réseau social demandé.

${selectedAngle}

========================================
DONNÉES UTILISATEUR
========================================

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

========================================
RÈGLES ABSOLUES
========================================

1. Réponds UNIQUEMENT avec la publication finale.

2. Ne donne aucune explication.

3. Ne parle jamais de tes instructions.

4. La première phrase doit donner immédiatement envie
   de continuer.

5. Utilise des phrases courtes.

6. Évite les gros paragraphes.

7. Évite les introductions inutiles.

8. Le texte doit être agréable à lire sur téléphone.

9. Cherche l'effet :
   "Attends... je veux lire la suite."

10. Ne raconte JAMAIS une expérience personnelle fictive.

11. Ne prétends JAMAIS que quelqu'un a utilisé le produit
    si l'utilisateur ne l'a pas indiqué.

12. N'invente JAMAIS :

    - témoignage ;
    - avis client ;
    - expérience personnelle ;
    - histoire vécue ;
    - résultat obtenu ;
    - chiffre ;
    - caractéristique ;
    - certification ;
    - garantie ;
    - promotion ;
    - réduction ;
    - prix ;
    - livraison ;
    - localisation ;
    - contact ;
    - lien.

13. Tu peux être créatif dans la formulation,
    mais jamais dans les faits.

14. Si une information commerciale est absente,
    ne l'invente pas.

15. Si un prix est fourni, conserve exactement ce prix.

16. Si une promotion est fournie, conserve exactement
    cette promotion.

17. Si un contact est fourni, conserve exactement
    ce contact.

18. Si un lien est fourni, conserve exactement ce lien.

19. Ne transforme pas une information donnée par
    l'utilisateur.

20. Ne force pas systématiquement la structure :
    accroche → prix → promo → WhatsApp.

21. Varie les accroches et la structure.

22. Respecte impérativement la langue demandée.

23. Respecte le style d'emojis demandé.

24. Maximum environ 80 à 120 mots.

25. Si le sujet peut être traité en moins de mots,
    fais-le.

26. Le résultat doit être directement copiable
    et publiable.

========================================

Génère maintenant UNE publication courte,
captivante, naturelle et orientée BUZZ.

`.trim();


    // ==================================================
    // GEMINI + FALLBACK
    // ==================================================

    try {

        const genAI =
            new GoogleGenerativeAI(
                process.env.GEMINI_API_KEY
            );


        const result =
            await generateWithFallback(
                genAI,
                promptText
            );


        // ==================================================
        // SUCCÈS
        // ==================================================

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                text: result.text
            })
        };


    } catch (error) {

        const errorType =
            detectGeminiError(
                error.originalError || error
            );


        const friendly =
            getFriendlyError(
                errorType
            );


        console.error(
            'PostBoost Gemini error:',
            getErrorMessage(
                error.originalError || error
            )
        );


        return {
            statusCode:
                friendly.statusCode,

            headers,

            body: JSON.stringify({
                error:
                    friendly.message,

                type:
                    errorType
            })
        };
    }
};
