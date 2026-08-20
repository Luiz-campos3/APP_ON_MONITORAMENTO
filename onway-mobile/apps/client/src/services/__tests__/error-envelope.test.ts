import { readErrorCode } from '@/services/mobile-api';

// Formatos reais capturados da API no aceite A2 (backend v1.6.0).
describe('readErrorCode', () => {
  it('lê o código aninhado em errors.code (formato real)', () => {
    expect(readErrorCode({ status: 'error', message: 'Troca de senha obrigatória', errors: { code: 'PASSWORD_CHANGE_REQUIRED' } }))
      .toBe('PASSWORD_CHANGE_REQUIRED');
    expect(readErrorCode({ status: 'error', message: 'Senha atual inválida', errors: { code: 'SENHA_ATUAL_INVALIDA' } }))
      .toBe('SENHA_ATUAL_INVALIDA');
  });

  it('retorna undefined quando não há errors (ex.: 404 "Usina não encontrada")', () => {
    expect(readErrorCode({ status: 'error', message: 'Usina não encontrada' })).toBeUndefined();
  });

  it('tolera errors como array (formato legado) sem quebrar', () => {
    expect(readErrorCode({ status: 'error', message: 'x', errors: [] })).toBeUndefined();
  });

  it('usa code de raiz como fallback se o backend passar a emiti-lo', () => {
    expect(readErrorCode({ status: 'error', code: 'FUTURO_CODE' })).toBe('FUTURO_CODE');
  });

  it('prioriza errors.code sobre um eventual code de raiz', () => {
    expect(readErrorCode({ code: 'RAIZ', errors: { code: 'ANINHADO' } })).toBe('ANINHADO');
  });

  it('não quebra com body nulo ou vazio', () => {
    expect(readErrorCode(null)).toBeUndefined();
    expect(readErrorCode(undefined)).toBeUndefined();
    expect(readErrorCode({})).toBeUndefined();
  });
});
