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

    // Instructions pour forcer la variété des structures et éviter les bugs de caractères
    const prompt = `Tu es un expert en copy-writing et en marketing digital. Rédige une publication pour ${platform} avec un ton ${tone} concernant ce produit/sujet : "${product}". La langue de la réponse doit être ${lang}.

    RÈGLES IMPORTANTES :
    1. Utilise un encodage de texte propre (UTF-8) sans caractères corrompus ou bizarres.
    2. VARIE LA STRUCTURE À CHAQUE FOIS : ne fais pas toujours le même schéma classique (emoji + titre + paragraphes + hashtags). Alterne aléatoirement entre des formats créatifs tels que :
       - Le storytelling immersif (récit ou expérience vécue)
       - L'accroche choc / question directe
       - Le format minimaliste et percutant (phrases courtes, percutantes)
       - L'humour ou le décalage
       - La structure axée sur l'urgence et la preuve sociale.
    3. Adapte la mise en forme (retour à la ligne, listes à puces ou texte brut) selon le format choisi pour que cela reste captivant.`;

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
