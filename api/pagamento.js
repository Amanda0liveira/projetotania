export default async function handler(req, res) {
  // Regras de segurança para permitir que o seu site acesse essa API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      // AGORA RECEBEMOS O CARRINHO E O ID DO PEDIDO QUE O SITE CRIOU
      const { carrinho, pedido_id } = req.body;

      const items = carrinho.map(item => ({
        title: item.nome,
        unit_price: Number(item.preco),
        quantity: item.qtd,
        currency_id: 'BRL'
      }));

      const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

      // Cria a cobrança no Mercado Pago
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: items,
          back_urls: {
            success: "https://atelieencantosdoya.com.br",
            failure: "https://atelieencantosdoya.com.br",
            pending: "https://atelieencantosdoya.com.br"
          },
          auto_return: "approved",
          external_reference: String(pedido_id), // ESSA É A MÁGICA 1: Cola o ID do Pedido na cobrança
          notification_url: "https://projetotania.vercel.app/api/webhook" // ESSA É A MÁGICA 2: Diz onde o MP deve avisar quando for pago
        })
      });

      const data = await response.json();
      
      return res.status(200).json({ url_pagamento: data.init_point });
      
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao gerar pagamento' });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
}