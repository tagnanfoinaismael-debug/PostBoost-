exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  try {
    // Récupération des nouveaux champs optionnels envoyés par le formulaire
    const { product, platform, tone, lang, price, oldPrice, promo, delivery, location, link, contact } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Clé API Gemini non configurée sur Netlify.' }) };
    }

    // Construction dynamique du bloc d'informations commerciales facultatives fournies
    let commercialDetails = "";
    if (price) commercialDetails += `- Prix : ${price}\n`;
    if (oldPrice) commercialDetails += `- Ancien prix : ${oldPrice}\n`;
    if (promo) commercialDetails += `- Réduction : ${promo}\n`;
    if (delivery) commercialDetails += `- Livraison : ${delivery}\n`;
    if (location) commercialDetails += `- Localisation : ${location}\n`;
    if (link) commercialDetails += `- Lien : ${link}\n`;
    if (contact) commercialDetails += `- Contact : ${contact}\n`;

    // Prompt strict axé sur l'utilisation exclusive des données fournies et la variété des structures
    const prompt = `Tu es un expert en copy-writing et en marketing digital. Rédige une publication commerciale pour ${platform} avec un ton ${tone}. 
    
    Produit ou sujet de base : "${product}"
    
    INFORMATIONS COMMERCIALES FOURNIES PAR L'UTILISATEUR (utilise UNIQUEMENT celles-ci si elles sont présentes, n'en invente aucune autre) :
    ${commercialDetails || "Aucune information commerciale spécifique fournie (reste neutre et focalise-toi sur le produit de base sans inventer de chiffres)."}

    RÈGLES ABSOLUES DE FIABILITÉ ET DE STYLE :
    1. Utilise un encodage de texte propre (UTF-8) sans caractères corrompus.
    2. INTERDICTION FORMELLE d'inventer des prix, réductions, avis clients, volumes de ventes, stocks, pointures, délais de livraison ou caractéristiques techniques (comme l'autonomie, la qualité audio ou le maintien) si l'utilisateur ne les a pas fournis.
    3. Si une information n'est pas fournie, ne l'invente pas. Fais simple ou utilise des formulations générales.
    4. VARIE LA STRUCTURE À CHAQUE FOIS : alterne entre storytelling, accroche choc, format minimaliste, humour ou urgence, sans garder le même schéma répétitif. La langue de la réponse doit être ${lang}.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Erreur lors de l’appel à l’API Gemini');
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Aucun contenu n’a été retourné par l’IA.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
