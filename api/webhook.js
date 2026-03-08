export default async function handler(req, res) {
  // O Webhook do Mercado Pago sempre envia dados via método POST
  if (req.method === 'POST') {
    try {
      // O MP pode enviar o ID do pagamento de duas formas dependendo da notificação
      const paymentId = req.query['data.id'] || req.query.id || req.body?.data?.id;
      const type = req.query.type || req.query.topic || req.body?.type;

      // Se for uma notificação de pagamento e tiver um ID válido
      if ((type === 'payment' || type === 'payment.created' || type === 'payment.updated') && paymentId) {
        
        const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

        // 1. Pergunta pro Mercado Pago se esse PIX/Cartão foi realmente pago
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${MP_TOKEN}`
          }
        });
        
        const paymentData = await mpResponse.json();

        // 2. Se o status for "approved" (aprovado), nós vamos lá no banco de dados!
        if (paymentData.status === 'approved') {
          // Pega aquele "pedido_id" que mandamos junto com a cobrança
          const pedidoId = paymentData.external_reference;

          // Suas chaves públicas do Supabase
          const SUPABASE_URL = "https://irtdylexllsoazmqhqvc.supabase.co";
          const SUPABASE_ANON_KEY = "sb_publishable_rXXq6Q2yzl2C20QHTemPvQ_CQlMTioF"; 

          // 3. Pede pro Supabase atualizar o status desse pedido para 'pago'
          await fetch(`${SUPABASE_URL}/rest/v1/pedidos?id=eq.${pedidoId}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ status: 'pago' })
          });
        }
      }

      // Devolve 200 OK pro Mercado Pago parar de enviar a mesma notificação
      return res.status(200).send('OK');
      
    } catch (error) {
      console.error('Erro no Webhook:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // Se tentarem acessar a URL pelo navegador (GET), ele bloqueia
  return res.status(405).send('Método não permitido');
}
