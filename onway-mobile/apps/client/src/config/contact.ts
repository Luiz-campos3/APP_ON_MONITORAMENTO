// Contatos oficiais da OnWay (confirmados com o cliente em 22/08/2026). Não há
// endpoint de contato no backend — é config pública, não segredo. O env permite
// trocar sem rebuild. O WhatsApp é o MESMO número do telefone, por isso o
// `?? phone` abaixo é INTENCIONAL (não é bug: cai no número certo, que tem WhatsApp).
const phone = process.env.EXPO_PUBLIC_ONWAY_PHONE ?? '+556140428218';

function formatPhoneDisplay(value: string) {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('55') ? digits.slice(2) : digits;
  const ddd = national.slice(0, 2);
  const number = national.slice(2);
  if (!ddd || number.length < 8) return value;
  const split = number.length > 8 ? 5 : 4;
  return `+55 ${ddd} ${number.slice(0, split)}-${number.slice(split)}`;
}

export const supportContact = {
  whatsapp: process.env.EXPO_PUBLIC_ONWAY_WHATSAPP ?? phone,
  phone,
  phoneDisplay: formatPhoneDisplay(phone),
};
