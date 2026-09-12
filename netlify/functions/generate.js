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
        // Vérification de la clé API
        if (!process.env.GEMINI_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'La clé GEMINI_API_KEY est absente de Netlify.'
                })
            };
        }

        // Lecture du JSON
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

        // Vérification du produit
        if (!product || !String(product).trim()) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Le produit ou sujet de la publication est requis.'
                })
            };
        }

        // =====================================================
        // INFORMATIONS FOURNIES PAR L'UTILISATEUR
        // =====================================================

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
            commercialInfo =
                'Aucune information commerciale supplémentaire fournie.';
        }

        // =====================================================
        // ANGLES DE CONTENU
        // =====================================================

        const angles = [

            `
ANGLE : HOOK CHOC.

Commence immédiatement par une phrase très courte qui arrête
le défilement.

Exemples de mécanique :
"Attends... tu fais encore ça ?"
"Personne ne parle de ce détail..."
"Si tu cherches [produit], regarde ça."
"Le détail qui change tout 👀"

Ne copie pas ces exemples.
Crée ton propre hook.
`,

            `
ANGLE : CURIOSITÉ.

Donne au lecteur une raison très forte de continuer.

Crée une petite tension ou une curiosité autour du produit
sans inventer de faits.

Le lecteur doit avoir envie de découvrir la suite.
`,

            `
ANGLE : QUESTION DIRECTE.

Commence par une question courte qui concerne directement
le problème, le besoin ou l'envie du public.

La question doit donner envie de répondre ou de continuer.
`,

            `
ANGLE : PROBLÈME → SOLUTION.

Commence par un problème réel et général lié au produit.

Présente ensuite le produit comme une solution intéressante.

Ne prétends jamais que l'utilisateur a personnellement vécu
ce problème.
`,

            `
ANGLE : DÉCOUVERTE.

Présente le produit comme quelque chose qui mérite l'attention.

Utilise une formulation qui donne l'impression :
"Il faut que je regarde ça."

Reste honnête et n'invente aucune caractéristique.
`,

            `
ANGLE : COURT ET VIRAL.

Construis une publication très courte.

Chaque phrase doit avoir une fonction.

Supprime les phrases inutiles.

Le résultat doit pouvoir être lu très rapidement sur téléphone.
`,

            `
ANGLE : INTERACTION.

Fais participer le lecteur.

Utilise éventuellement une question, un choix, une réaction
ou une invitation à donner son avis.

L'objectif est de favoriser les commentaires et les réactions,
sans inventer de témoignages.
`,

            `
ANGLE : OFFRE CAPTIVANTE.

Si un prix, une promotion ou une livraison est fournie,
mets-la en valeur de manière attractive.

Ne crée jamais de réduction ou d'urgence qui n'existe pas.

Si aucune offre n'est fournie, n'en invente pas.
`
        ];

        const selectedAngle =
            angles[Math.floor(Math.random() * angles.length)];

        // =====================================================
        // PROMPT PRINCIPAL
        // =====================================================

        const promptText = `
Tu es un expert en création de contenu viral et captivant
pour les réseaux sociaux.

Ta mission est de créer UNE publication prête à être publiée.

Le but principal n'est PAS d'écrire un long texte.

Le but est de CAPTER L'ATTENTION, donner envie de continuer
à lire et, lorsque c'est pertinent, provoquer des réactions,
commentaires, partages ou clics.

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

INFORMATIONS COMMERCIALES FOURNIES PAR L'UTILISATEUR :
${commercialInfo}


=====================================================
RÈGLES DE CAPTIVATION — TRÈS IMPORTANT
=====================================================

1. LES PREMIÈRES SECONDES SONT ESSENTIELLES.

La première phrase doit être la partie la plus accrocheuse
de la publication.

Elle doit donner envie de s'arrêter au lieu de continuer
à faire défiler.

Évite les introductions faibles comme :

"Bonjour à tous !"
"Nous sommes heureux de vous présenter..."
"Découvrez notre nouveau produit..."
"Voici une publication concernant..."

Commence directement par quelque chose qui attire l'attention.


2. SOIS COURT ET FACILE À LIRE.

Les utilisateurs des réseaux sociaux ne veulent généralement
pas lire un gros bloc de texte.

Privilégie :

- phrases courtes ;
- paragraphes très courts ;
- retours à la ligne ;
- vocabulaire simple ;
- rythme rapide ;
- informations essentielles.

Supprime toute phrase qui n'apporte rien.


3. FAIS DU "SCROLL STOPPING CONTENT".

La publication doit donner envie de s'arrêter.

Utilise intelligemment :

- curiosité ;
- surprise ;
- question ;
- contraste ;
- bénéfice ;
- problème → solution ;
- émotion ;
- appel à l'action.

Mais ne force pas artificiellement le buzz.


4. NE FAIS PAS TOUJOURS LA MÊME STRUCTURE.

Chaque génération doit pouvoir être différente.

Change :

- l'accroche ;
- la longueur ;
- le rythme ;
- la construction ;
- le vocabulaire ;
- l'angle ;
- l'appel à l'action.

Ne produis pas systématiquement :

"🔥 Découvrez..."
"✅ Produit..."
"💰 Prix..."
"📲 WhatsApp..."
"Commandez maintenant !"


5. ADAPTE LE CONTENU AU RÉSEAU SOCIAL.

TikTok / Reels :
Très accrocheur, rapide, conversationnel.

Instagram :
Visuel, émotionnel, accroche forte et texte facile à scanner.

Facebook :
Plus conversationnel et orienté interaction.

WhatsApp Status :
Très court et immédiatement compréhensible.

LinkedIn :
Accroche professionnelle, intéressante et crédible.

Twitter / X :
Court, direct et percutant.

YouTube Shorts :
Hook très rapide et adapté au format court.


=====================================================
RÈGLES ANTI-INVENTION — ABSOLUES
=====================================================

Tu dois être créatif dans LA FORME, mais jamais dans LES FAITS.

NE JAMAIS inventer :

- une expérience personnelle ;
- une histoire vécue ;
- un témoignage ;
- un avis client ;
- un client satisfait ;
- une personne ayant utilisé le produit ;
- une promotion ;
- une réduction ;
- un prix ;
- une caractéristique ;
- une garantie ;
- une certification ;
- une livraison ;
- une localisation ;
- un numéro ;
- un lien ;
- un résultat ;
- une statistique ;
- une preuve.

Par exemple, INTERDIT :

"Hier, j'ai testé ce produit..."
si l'utilisateur ne l'a pas dit.

Interdit également :

"Mes clients l'adorent..."
si aucun témoignage n'a été fourni.

Interdit :

"Tu vas économiser 50%..."
si aucune réduction de 50% n'a été fournie.


=====================================================
CRÉATIVITÉ AUTORISÉE
=====================================================

Tu peux être créatif avec :

- les accroches ;
- les formulations ;
- les questions ;
- les transitions ;
- le rythme ;
- les emojis ;
- les appels à l'action ;
- la mise en forme ;
- la façon de présenter les informations.

Tu peux créer une situation HYPOTHÉTIQUE uniquement si elle est
clairement présentée comme une possibilité et non comme une
expérience réelle de l'utilisateur.

Exemple acceptable :

"Imagine trouver une solution simple pour..."
 
Mais ne dis jamais :

"Hier, j'ai trouvé la solution..."
si cette expérience n'a pas été fournie.


=====================================================
RÈGLES COMMERCIALES
=====================================================

Toutes les informations fournies par l'utilisateur doivent être
respectées fidèlement.

Si un prix est fourni, tu peux l'utiliser.

Si aucun prix n'est fourni, n'en invente pas.

Si une promotion est fournie, tu peux la mettre en avant.

Si aucune promotion n'est fournie, n'en invente pas.

Si un contact ou un lien est fourni, tu peux l'utiliser.

Si aucun contact ou lien n'est fourni, n'en invente pas.


=====================================================
OBJECTIF FINAL
=====================================================

La publication doit être :

CAPTIVANTE.
COURTE.
NATURELLE.
FACILE À LIRE.
ADAPTÉE AU RÉSEAU SOCIAL.
ORIENTÉE ENGAGEMENT.
ORIENTÉE BUZZ lorsque cela est pertinent.

Elle doit donner envie au lecteur de :

ARRÊTER DE SCROLLER →
LIRE →
RÉAGIR →
ET ÉVENTUELLEMENT ACHETER / CLIQUER.

Mais elle ne doit jamais mentir pour obtenir cet effet.


=====================================================
FORMAT DE RÉPONSE
=====================================================

Réponds UNIQUEMENT avec la publication finale.

Aucune explication.
Aucun commentaire.
Aucun titre du type "Voici votre publication".
Aucune mention de ces instructions.

Crée maintenant une publication captivante.
        `.trim();

        // =====================================================
        // GEMINI
        // =====================================================

        const genAI = new GoogleGenerativeAI(
            process.env.GEMINI_API_KEY
        );

        const model = genAI.getGenerativeModel({
            model: 'gemini-3.6-flash'
        });

        const result =
            await model.generateContent(promptText);

        const response =
            await result.response;

        const generatedPost =
            response.text();

        if (
            !generatedPost ||
            !generatedPost.trim()
        ) {
            throw new Error(
                'Gemini n’a généré aucun texte.'
            );
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                text: generatedPost.trim()
            })
        };

    } catch (err) {

        console.error(
            'Erreur serveur PostBoost :',
            err
        );

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
