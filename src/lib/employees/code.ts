export const EMPLOYEE_CODE_PREFIX = "N9-";
export const EMPLOYEE_CODE_START = 1001;

import type { Prisma } from "@prisma/client";

type EmployeeClient = {
  employee: {
    findMany: (args: Prisma.EmployeeFindManyArgs) => Promise<{ employeeCode: string }[]>;
  };
};

export async function resolveNextEmployeeCode(client: EmployeeClient): Promise<string> {
  const employees = await client.employee.findMany({
    where: { employeeCode: { startsWith: EMPLOYEE_CODE_PREFIX } },
    select: { employeeCode: true },
  });

  let max = EMPLOYEE_CODE_START - 1;
  for (const row of employees) {
    const match = row.employeeCode.match(/^N9-(\d+)$/i);
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }

  return `${EMPLOYEE_CODE_PREFIX}${max + 1}`;
}
