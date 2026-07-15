import { vi } from "vitest";

type SelectChainStep = {
  from: () => unknown;
};

export function createSelectChainMock(steps: SelectChainStep[]) {
  const select = vi.fn();

  for (const step of steps) {
    select.mockReturnValueOnce(step);
  }

  return { select };
}

export function fromOrderByResolved<T>(rows: T[]) {
  return {
    from: () => ({
      orderBy: vi.fn().mockResolvedValue(rows),
    }),
  };
}

export function fromWhereOrderByResolved<T>(rows: T[]) {
  return {
    from: () => ({
      where: () => ({
        orderBy: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

export function fromWhereResolved<T>(rows: T[]) {
  return {
    from: () => ({
      where: vi.fn().mockResolvedValue(rows),
    }),
  };
}
