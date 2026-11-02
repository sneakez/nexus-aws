import { describe, it, expect } from 'vitest';

function generateWorkspaceSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

function validateOnboardingStep(step: number, data: {
  companyName?: string;
  warehouseName?: string;
  warehouseCode?: string;
  selectedChannels?: string[];
}): { valid: boolean; error?: string } {
  if (step === 1) {
    if (!data.companyName || data.companyName.trim().length < 2) {
      return { valid: false, error: 'Tên công ty phải có ít nhất 2 ký tự' };
    }
    return { valid: true };
  }

  if (step === 2) {
    if (!data.warehouseName || !data.warehouseCode) {
      return { valid: false, error: 'Tên kho và mã kho là bắt buộc' };
    }
    return { valid: true };
  }

  if (step === 3) {
    if (!data.selectedChannels || data.selectedChannels.length === 0) {
      return { valid: false, error: 'Vui lòng chọn ít nhất 1 kênh bán hàng' };
    }
    return { valid: true };
  }

  return { valid: true };
}

describe('V5 Onboarding Lifecycle', () => {
  it('generates clean URL slug from Vietnamese company names', () => {
    expect(generateWorkspaceSlug('Công Ty Cổ Phần Nexus')).toBe('cong-ty-co-phan-nexus');
    expect(generateWorkspaceSlug('Shop Thời Trang & Phụ Kiện')).toBe('shop-thoi-trang-phu-kien');
    expect(generateWorkspaceSlug('    Kho Vận   3PL Logistics   ')).toBe('kho-van-3pl-logistics');
  });

  it('validates Step 1: Company Profile requirements', () => {
    expect(validateOnboardingStep(1, { companyName: '' }).valid).toBe(false);
    expect(validateOnboardingStep(1, { companyName: 'A' }).valid).toBe(false);
    expect(validateOnboardingStep(1, { companyName: 'Thương Mại Việt' }).valid).toBe(true);
  });

  it('validates Step 2: Primary Warehouse requirements', () => {
    expect(validateOnboardingStep(2, { warehouseName: 'Kho Tổng', warehouseCode: '' }).valid).toBe(false);
    expect(validateOnboardingStep(2, { warehouseName: 'Kho Tổng', warehouseCode: 'WH-01' }).valid).toBe(true);
  });

  it('validates Step 3: Sales Channels selection', () => {
    expect(validateOnboardingStep(3, { selectedChannels: [] }).valid).toBe(false);
    expect(validateOnboardingStep(3, { selectedChannels: ['shopee'] }).valid).toBe(true);
  });
});
