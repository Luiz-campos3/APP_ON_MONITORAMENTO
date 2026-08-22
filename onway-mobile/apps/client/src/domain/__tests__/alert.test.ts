import { alertTimeLabel, toAlert, toAlertFeed } from '@/domain/alert';
import type { ApiAlert, AlertsResponse } from '@/services/mobile-api';

const NOW = new Date('2026-08-20T12:00:00.000Z').getTime();

function apiAlert(overrides: Partial<ApiAlert> = {}): ApiAlert {
  return {
    id: 'al-1',
    usinaId: 'u1',
    usinaNome: ' IE UFV-1 ',
    cidade: 'Brasília',
    tipo: 'baixa_geracao',
    severidade: 'warning',
    titulo: 'Geração abaixo do esperado',
    mensagem: 'Geração 20% abaixo do esperado.',
    status: 'aberto',
    abertoEm: '2026-08-20T10:00:00.000Z',
    resolvidoEm: null,
    lido: false,
    origem: 'tabela',
    ...overrides,
  };
}

function response(overrides: Partial<AlertsResponse> = {}): AlertsResponse {
  return {
    alertas: [apiAlert()],
    total: 1,
    naoLidos: 1,
    paginacao: { page: 1, limit: 20, total: 1 },
    ...overrides,
  };
}

describe('toAlert', () => {
  it('mapeia campos e normaliza textos', () => {
    const alert = toAlert(apiAlert(), NOW);
    expect(alert.plantName).toBe('IE UFV-1');
    expect(alert.city).toBe('Brasília');
    expect(alert.title).toBe('Geração abaixo do esperado');
    expect(alert.plantId).toBe('u1');
    expect(alert.read).toBe(false);
    expect(alert.origin).toBe('tabela');
  });

  it('usa fallbacks para nome/título vazios', () => {
    const alert = toAlert(apiAlert({ usinaNome: '  ', titulo: '', cidade: null }), NOW);
    expect(alert.plantName).toBe('Usina');
    expect(alert.title).toBe('Alerta');
    expect(alert.city).toBe('');
  });

  it('deriva o tom da severidade', () => {
    expect(toAlert(apiAlert({ severidade: 'critical' }), NOW).tone).toBe('danger');
    expect(toAlert(apiAlert({ severidade: 'warning' }), NOW).tone).toBe('warning');
  });

  it('escolhe o ícone pelo tipo, com fallback para desconhecido', () => {
    expect(toAlert(apiAlert({ tipo: 'sem_comunicacao' }), NOW).icon.android).toBe('wifi_off');
    expect(toAlert(apiAlert({ tipo: 'baixa_geracao' }), NOW).icon.android).toBe('trending_down');
    // tipo novo que o backend pode introduzir depois → não quebra, cai no sino
    expect(toAlert(apiAlert({ tipo: 'tipo_futuro_qualquer' }), NOW).icon.android).toBe('notifications_active');
  });

  it('preserva origem derivado e status', () => {
    const alert = toAlert(apiAlert({ origem: 'derivado', tipo: 'sem_comunicacao', severidade: 'critical' }), NOW);
    expect(alert.origin).toBe('derivado');
    expect(alert.tone).toBe('danger');
  });

  it('em tabela, timeLabel é a forma relativa crua (sem prefixo)', () => {
    // abertoEm padrão = 2h antes de NOW
    const alert = toAlert(apiAlert({ origem: 'tabela' }), NOW);
    expect(alert.timeLabel).toBe('há 2 h');
  });

  it('em derivado, timeLabel prefixa "última leitura" (abertoEm = última leitura, não abertura)', () => {
    const alert = toAlert(apiAlert({ origem: 'derivado' }), NOW);
    expect(alert.timeLabel).toBe('última leitura há 2 h');
    expect(alert.timeLabel.startsWith('última leitura ')).toBe(true);
  });

  it('sem abertoEm, timeLabel fica vazio mesmo em derivado (sem prefixo)', () => {
    expect(toAlert(apiAlert({ origem: 'derivado', abertoEm: null }), NOW).timeLabel).toBe('');
  });
});

describe('alertTimeLabel', () => {
  it('agora quando abaixo de 1 min', () => {
    expect(alertTimeLabel('2026-08-20T11:59:40.000Z', NOW)).toBe('agora');
  });
  it('minutos, horas e dias', () => {
    expect(alertTimeLabel('2026-08-20T11:30:00.000Z', NOW)).toBe('há 30 min');
    expect(alertTimeLabel('2026-08-20T09:00:00.000Z', NOW)).toBe('há 3 h');
    expect(alertTimeLabel('2026-08-18T12:00:00.000Z', NOW)).toBe('há 2 d');
  });
  it('data absoluta a partir de 7 dias', () => {
    expect(alertTimeLabel('2026-08-10T12:00:00.000Z', NOW)).toMatch(/\d{2}\/\d{2}\/\d{2}/);
  });
  it('vazio para nulo ou inválido', () => {
    expect(alertTimeLabel(null, NOW)).toBe('');
    expect(alertTimeLabel('data-ruim', NOW)).toBe('');
  });
});

describe('toAlertFeed', () => {
  it('mapeia lista, contadores e paginação', () => {
    const feed = toAlertFeed(response(), NOW);
    expect(feed.alerts).toHaveLength(1);
    expect(feed.total).toBe(1);
    expect(feed.unread).toBe(1);
    expect(feed.page).toBe(1);
    expect(feed.limit).toBe(20);
  });

  it('preserva a ordem do servidor (não reordena)', () => {
    const feed = toAlertFeed(
      response({
        alertas: [
          apiAlert({ id: 'a', lido: false, severidade: 'warning' }),
          apiAlert({ id: 'b', lido: true, severidade: 'critical' }),
        ],
        total: 2,
        naoLidos: 1,
      }),
      NOW,
    );
    expect(feed.alerts.map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('a mesma usina pode aparecer 2x com diagnósticos diferentes', () => {
    const feed = toAlertFeed(
      response({
        alertas: [
          apiAlert({ id: 'x', usinaId: 'u9', tipo: 'baixa_geracao', origem: 'tabela' }),
          apiAlert({ id: 'y', usinaId: 'u9', tipo: 'sem_comunicacao', origem: 'derivado', severidade: 'critical' }),
        ],
        total: 2,
      }),
      NOW,
    );
    expect(feed.alerts).toHaveLength(2);
    expect(feed.alerts[0].plantId).toBe(feed.alerts[1].plantId);
    expect(feed.alerts[0].tone).toBe('warning');
    expect(feed.alerts[1].tone).toBe('danger');
  });
});
