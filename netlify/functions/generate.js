const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async function(event, context) {

    // ==========================================
    // MÉTHODE HTTP
    // ==========================================

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Méthode non autorisée'
            })
        };
    }

    try {

        // ==========================================
        // LECTURE DES DONNÉES
        // ==========================================

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


        // ==========================================
        // VÉRIFICATION DU PRODUIT
        // ==========================================

        if (!product || !product.trim()) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Le produit ou sujet de la publication est requis.'
                })
            };
        }


        // ==========================================
        // VÉRIFICATION DE LA CLÉ GEMINI
        // ==========================================

        if (!process.env.GEMINI_API_KEY) {
            throw new Error(
                'La clé GEMINI_API_KEY est absente des variables Netlify.'
            );
        }


        // ==========================================
        // INFORMATIONS COMMERCIALES
        // ==========================================

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
            commercialInfo += `- Lien de commande : ${link}\n`;
        }


        // ==========================================
        // ANGLES MARKETING
        // ==========================================

        const angles = [
            'Accroche choc et directe',
            'Mise en avant du principal bénéfice du produit',
            'Question qui interpelle directement le public',
            'Style conversationnel et naturel',
            'Mini storytelling',
            'Présentation du produit comme une découverte',
            'Mise en avant du problème que le produit peut résoudre',
            'Recommandation naturelle du produit',
            'Style exclusivité et nouveauté',
            'Style élégant et professionnel',
            'Style énergique et très dynamique',
            'Style simple, court et mémorable',
            'Style proche d’une conversation avec un ami',
            'Mise en avant de l’expérience utilisateur',
            'Accroche basée sur une situation du quotidien'
        ];

        const randomAngle =
            angles[Math.floor(Math.random() * angles.length)];


        // ==========================================
        // IDENTIFIANT ALÉATOIRE DE GÉNÉRATION
        // Permet de demander une publication différente
        // même lorsque le même produit est utilisé.
        // ==========================================

        const variationSeed =
            Math.random().toString(36).substring(2, 10);


        // ==========================================
        // PROMPT
        // ==========================================

        const promptText = `
Tu es un expert professionnel en copywriting, marketing digital
et création de contenu pour les réseaux sociaux.

Tu dois créer UNE publication originale à partir des informations
fournies par l'utilisateur.

RÉSEAU SOCIAL :
${platform}

PRODUIT OU SUJET :
${product}

TON :
${tone}

STYLE D'EMOJIS :
${emojiStyle}

LANGUE OBLIGATOIRE :
${lang}

ANGLE MARKETING À PRIVILÉGIER :
${randomAngle}

IDENTIFIANT DE VARIATION :
${variationSeed}

INFORMATIONS COMMERCIALES FOURNIES :
${commercialInfo || 'Aucune information commerciale fournie.'}


========================================
RÈGLES ABSOLUES
========================================

1. Réponds UNIQUEMENT dans la langue demandée.

2. Retourne uniquement la publication finale.
   Ne donne aucune explication avant ou après.

3. N'invente aucune information.

4. Si un prix est fourni, respecte exactement le prix fourni.

5. Si une promotion est fournie, respecte exactement la promotion fournie.

6. Si une livraison est fournie, respecte exactement cette information.

7. Si une localisation est fournie, respecte exactement cette information.

8. Si un contact ou numéro WhatsApp est fourni, conserve-le exactement.

9. Si un lien est fourni, conserve-le exactement.

10. Si une information commerciale n'est pas fournie,
    n'en invente pas.

========================================
VARIÉTÉ
========================================

La publication doit être clairement différente d'une autre publication
créée précédemment avec le même produit.

NE REPRODUIS PAS systématiquement cette structure :

🔥 PROMOTION
Produit
Ancien prix
Nouveau prix
Dépêchez-vous
Contactez-nous

Évite également de commencer systématiquement par :
- 🔥
- 🚨
- ALERTE
- BOOM
- PROFITEZ
- NE MANQUEZ PAS

Varie fortement :

- l'accroche ;
- la longueur ;
- le vocabulaire ;
- la construction des phrases ;
- la structure des paragraphes ;
- la position des informations commerciales ;
- la position des emojis ;
- le nombre d'emojis ;
- le style de l'appel à l'action.

Tu peux utiliser par exemple :
- une question ;
- une phrase très courte ;
- une observation ;
- une mini-histoire ;
- une situation quotidienne ;
- un bénéfice ;
- une recommandation ;
- une découverte ;
- une accroche humoristique si le ton le permet.

========================================
PROMOTION
========================================

Si une promotion est fournie, elle doit être mentionnée,
mais elle ne doit pas obligatoirement être le premier élément
de la publication.

Ne transforme pas automatiquement chaque publication
en annonce promotionnelle classique.

========================================
EMOJIS
========================================

Respecte le style d'emojis demandé.

Si le style est :
- très dynamique : utilise plusieurs emojis sans exagérer ;
- modéré : utilise quelques emojis bien placés ;
- professionnel : utilise très peu d'emojis ;
- sans emojis : n'utilise aucun emoji.

========================================
NATUREL
========================================

La publication doit donner l'impression d'avoir été écrite
par une vraie personne qui connaît son produit.

Évite les phrases artificielles, répétitives ou trop génériques.

L'appel à l'action doit être naturel et peut être différent
d'une génération à l'autre.

========================================
IMPORTANT
========================================

Même avec exactement le même produit et les mêmes informations,
produis une publication avec un angle et une structure différents.

Ne fais jamais une copie légèrement modifiée d'une publication précédente.
`.trim();


        // ==========================================
        // INITIALISATION GEMINI
        // ==========================================

        const genAI = new GoogleGenerativeAI(
            process.env.GEMINI_API_KEY
        );

        const model = genAI.getGenerativeModel({
            model: 'gemini-3.6-flash'
        });


        // ==========================================
        // GÉNÉRATION
        // ==========================================

        const result = await model.generateContent(promptText);

        const response = await result.response;

        const generatedPost = response.text();


        // ==========================================
        // VÉRIFICATION DU TEXTE
        // ==========================================

        if (!generatedPost || !generatedPost.trim()) {
            throw new Error(
                'Gemini n’a retourné aucun contenu.'
            );
        }


        // ==========================================
        // RÉPONSE DE SUCCÈS
        // ==========================================

        return {
            statusCode: 200,

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                text: generatedPost.trim()
            })
        };


    } catch (err) {

        // ==========================================
        // ERREUR
        // ==========================================

        console.error(
            'Erreur serveur generate.js :',
            err
        );

        return {
            statusCode: 500,

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                error: err.message || 'Erreur interne du serveur.'
            })
        };
    }
};
