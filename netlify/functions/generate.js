exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  try {
    const { product, platform, tone, lang } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Clé API Gemini non configurée sur Netlify.' }) };
    }

    // Prompt strict interdisant l'invention de faits non fournis
    const prompt = `Tu es un expert en copy-writing et en marketing digital. Rédige une publication pour ${platform} avec un ton ${tone} concernant ce produit/sujet : "${product}". La langue de la réponse doit être ${lang}.

    RÈGLES STRICTES DE FIABILITÉ :
    1. Utilise un encodage de texte propre (UTF-8) sans caractères corrompus.
    2. N'invente JAMAIS de prix, de réductions, de statistiques, de nombres d'avis, de volumes de ventes, de stocks, de pointures spécifiques ou de délais de livraison qui n'ont pas été explicitement fournis par l'utilisateur dans le sujet/produit.
    3. Si une information factuelle manque (comme une promo ou un stock), utilise une formulation générique (ex: "Découvre notre collection" au lieu de "-20%") ou des emplacements à compléter (ex: "[Indique ton prix ici]").
    4. VARIE LA STRUCTURE À CHAQUE FOIS (storytelling, accroche choc, format minimaliste, humour ou urgence modérée) sans toujours utiliser le même schéma classique.`;

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
