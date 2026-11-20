/* País do visitante, para o site sugerir o idioma. Roda como Função da Vercel (Node, CommonJS).
   O país vem do cabeçalho que a própria Vercel acrescenta a cada requisição (x-vercel-ip-country,
   ISO 3166-1 alfa-2): nenhum serviço de terceiros e nenhum dado guardado. Fora da Vercel (ou sem o
   cabeçalho) responde 404 e o site usa a reserva (api.country.is) ou o idioma do navegador. */
module.exports = (req, res) => {
  const cc = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
  res.setHeader('Cache-Control', 'private, no-store');                    /* depende de quem pede: nunca em cache compartilhado */
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!/^[A-Z]{2}$/.test(cc)) { res.statusCode = 404; return res.end('{"error":"country unavailable"}'); }
  res.statusCode = 200;
  res.end(JSON.stringify({ country: cc }));
};
