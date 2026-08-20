import {
  formatDateBR,
  ticketKindMeta,
  ticketNeedsAttention,
  ticketStatusTone,
  toTicket,
  type SupportTicket,
} from '@/domain/support';
import type { ApiTicket } from '@/services/mobile-api';

function apiTicket(overrides: Partial<ApiTicket> = {}): ApiTicket {
  return {
    id: 'ch-1',
    numero: 'CH-0043',
    status: 'novo',
    statusLabel: 'Novo',
    encerrado: false,
    categoria: 'Manutenção',
    subcategoria: null,
    natureza: null,
    urgencia: 'alta',
    descricaoProblema: '  Inversor com luz vermelha  ',
    usinaId: 'u1',
    usinaNome: 'Usina Alpha',
    canalOrigem: 'app',
    dataCriacao: '2026-08-20',
    dataFechamento: null,
    temAnexo: true,
    criadoEm: '2026-08-20T09:30:00.000Z',
    ...overrides,
  };
}

describe('toTicket', () => {
  it('mapeia os campos do backend e faz trim da descrição', () => {
    const ticket = toTicket(apiTicket());
    expect(ticket.numero).toBe('CH-0043');
    expect(ticket.statusLabel).toBe('Novo');
    expect(ticket.encerrado).toBe(false);
    expect(ticket.categoria).toBe('Manutenção');
    expect(ticket.description).toBe('Inversor com luz vermelha');
    expect(ticket.plantName).toBe('Usina Alpha');
    expect(ticket.hasAttachment).toBe(true);
    expect(ticket.createdAtLabel).toBe('20/08/2026');
  });

  it('normaliza campos vazios para null e timeline ausente para []', () => {
    const ticket = toTicket(apiTicket({ categoria: '  ', usinaNome: null, urgencia: null, timeline: undefined }));
    expect(ticket.categoria).toBeNull();
    expect(ticket.plantName).toBeNull();
    expect(ticket.urgencia).toBeNull();
    expect(ticket.timeline).toEqual([]);
  });

  it('mapeia a timeline em marcos com data/hora legível', () => {
    const ticket = toTicket(apiTicket({
      timeline: [
        { em: '2026-08-20T09:30:00.000Z', titulo: 'Chamado aberto' },
        { em: '2026-08-20T14:05:00.000Z', titulo: 'Em triagem' },
      ],
    }));
    expect(ticket.timeline).toHaveLength(2);
    expect(ticket.timeline[0].title).toBe('Chamado aberto');
    expect(ticket.timeline[0].atLabel).toMatch(/20\/08\/2026 às \d{2}:\d{2}/);
  });

  it('usa dataFechamento quando o chamado está encerrado', () => {
    const ticket = toTicket(apiTicket({ status: 'resolvido', statusLabel: 'Resolvido', encerrado: true, dataFechamento: '2026-08-25' }));
    expect(ticket.encerrado).toBe(true);
    expect(ticket.closedAtLabel).toBe('25/08/2026');
  });
});

describe('ticketStatusTone', () => {
  it('destaca aguardando_cliente e aguardando_aprovacao como atenção', () => {
    expect(ticketStatusTone('aguardando_cliente')).toBe('warning');
    expect(ticketStatusTone('aguardando_aprovacao')).toBe('warning');
  });

  it('marca resolvido como sucesso e cancelado como neutro', () => {
    expect(ticketStatusTone('resolvido')).toBe('success');
    expect(ticketStatusTone('cancelado')).toBe('neutral');
  });

  it('usa accent para os estados em andamento e para status desconhecido', () => {
    expect(ticketStatusTone('em_atendimento')).toBe('accent');
    expect(ticketStatusTone('status_novo_do_backend')).toBe('accent');
  });
});

describe('ticketNeedsAttention', () => {
  it('só sinaliza aguardando_cliente', () => {
    const base = toTicket(apiTicket());
    expect(ticketNeedsAttention({ ...base, status: 'aguardando_cliente' } as SupportTicket)).toBe(true);
    expect(ticketNeedsAttention({ ...base, status: 'em_atendimento' } as SupportTicket)).toBe(false);
  });
});

describe('formatDateBR', () => {
  it('formata AAAA-MM-DD e recorta timestamps ISO', () => {
    expect(formatDateBR('2026-08-20')).toBe('20/08/2026');
    expect(formatDateBR('2026-08-20T09:30:00.000Z')).toBe('20/08/2026');
  });

  it('devolve travessão para valores vazios', () => {
    expect(formatDateBR(null)).toBe('—');
    expect(formatDateBR('')).toBe('—');
  });
});

describe('ticketKindMeta', () => {
  it('cada tipo de UX carrega a categoria que vai no POST', () => {
    expect(ticketKindMeta('verificacao').categoria).toBe('Verificação de sistema');
    expect(ticketKindMeta('orcamento').categoria).toBe('Orçamento');
    expect(ticketKindMeta('ordem_servico').categoria).toBe('Manutenção');
  });
});
