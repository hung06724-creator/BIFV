import { AllocationService } from '../services/allocation.service';

describe('AllocationService', () => {
  const service = new AllocationService();

  it('creates one full allocation for direct transactions', () => {
    const allocations = service.createAllocations({
      id: 'tx-001',
      raw_desc: 'Le phi xet tuyen',
      normalized_amount: 200000,
    });

    expect(service.detectSplitMode({ raw_desc: 'Le phi xet tuyen', normalized_amount: 200000 })).toBe('direct');
    expect(allocations).toHaveLength(1);
    expect(allocations[0].allocation_type).toBe('direct');
    expect(allocations[0].amount).toBe(200000);
  });

  it('detects horizontal split when multiple fee components appear', () => {
    const allocations = service.createAllocations({
      id: 'tx-002',
      raw_desc: 'Nhap hoc hoc phi bhyt dong phuc',
      normalized_amount: 10000000,
    });

    expect(service.detectSplitMode({ raw_desc: 'Nhap hoc hoc phi bhyt dong phuc', normalized_amount: 10000000 })).toBe(
      'horizontal'
    );
    expect(allocations.length).toBeGreaterThan(1);
    expect(allocations.every((allocation) => allocation.allocation_type === 'horizontal')).toBe(true);
  });

  it('keeps beneficiary-style transfers as direct until user chooses split', () => {
    const allocations = service.createAllocations({
      id: 'tx-003',
      raw_desc: 'Giao vien dong hoc phi cho 3 hoc sinh',
      normalized_amount: 9072000,
    });

    expect(service.detectSplitMode({ raw_desc: 'Giao vien dong hoc phi cho 3 hoc sinh', normalized_amount: 9072000 })).toBe(
      'direct'
    );
    expect(allocations).toHaveLength(1);
    expect(allocations[0].allocation_type).toBe('direct');
    expect(allocations[0].amount).toBe(9072000);
  });

  it('requires balanced, confirmed allocations before confirming transaction', () => {
    const validation = service.validateAllocations(10000000, 'horizontal', [
      {
        id: 'a1',
        transaction_id: 'tx-004',
        allocation_no: 1,
        allocation_type: 'horizontal',
        amount: 5000000,
        suggested_category_id: 'cat-1',
        suggested_category_code: 'HOC_PHI',
        suggested_category_name: 'Hoc phi',
        confirmed_category_id: 'cat-1',
        confirmed_category_code: 'HOC_PHI',
        confirmed_category_name: 'Hoc phi',
        beneficiary_code: null,
        beneficiary_name: 'Nguyen Van A',
        status: 'confirmed',
        notes: null,
      },
      {
        id: 'a2',
        transaction_id: 'tx-004',
        allocation_no: 2,
        allocation_type: 'horizontal',
        amount: 4000000,
        suggested_category_id: 'cat-2',
        suggested_category_code: 'BAO_HIEM_YT',
        suggested_category_name: 'Bao hiem y te',
        confirmed_category_id: null,
        confirmed_category_code: null,
        confirmed_category_name: null,
        beneficiary_code: null,
        beneficiary_name: 'Nguyen Van A',
        status: 'classified',
        notes: null,
      },
    ]);

    expect(validation.is_balanced).toBe(false);
    expect(validation.can_confirm).toBe(false);
    expect(validation.remaining_amount).toBe(1000000);
  });

  it('lets user switch transaction to vertical manually', () => {
    const transaction = {
      id: 'tx-005',
      batch_id: 'batch-1',
      raw_date: '2026-03-17',
      raw_desc: 'Dong hoc phi',
      raw_reference: null,
      normalized_date: '2026-03-17',
      normalized_amount: 4000000,
      debit_amount: 0,
      credit_amount: 4000000,
      balance_after: null,
      type: 'credit' as const,
      split_mode: 'direct' as const,
      status: 'pending_classification' as const,
      sender_name: null,
      allocations: [
        {
          id: 'tx-005-alloc-1',
          transaction_id: 'tx-005',
          allocation_no: 1,
          allocation_type: 'direct' as const,
          amount: 4000000,
          suggested_category_id: null,
          suggested_category_code: null,
          suggested_category_name: null,
          confirmed_category_id: null,
          confirmed_category_code: null,
          confirmed_category_name: null,
          beneficiary_code: null,
          beneficiary_name: null,
          status: 'draft' as const,
          notes: null,
        },
      ],
      match: null,
    };

    const next = service.applySplitModeSelection(transaction, 'vertical');

    expect(next.split_mode).toBe('vertical');
    expect(next.allocations).toHaveLength(2);
    expect(next.allocations.every((allocation) => allocation.allocation_type === 'vertical')).toBe(true);
  });
});
