import { MercadoPagoConfig } from 'mercadopago';

// Configurar Mercado Pago con access token desde variables de entorno
const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

export default {
  mercadopago
};
