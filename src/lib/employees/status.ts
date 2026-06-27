export const EMPLOYEE_CODE_PREFIX = "N9-";
export const EMPLOYEE_CODE_START = 1001;

export type EmployeeStatusValue = "active" | "inactive" | "terminated" | "on_leave";

export const EMPLOYEE_STATUS_OPTIONS: { value: EmployeeStatusValue; label: string }[] = [
  { value: "active", label: "At Office" },
  { value: "on_leave", label: "On Leave" },
  { value: "inactive", label: "Resigned" },
  { value: "terminated", label: "Fired" },
];

export function getEmployeeStatusLabel(status: string): string {
  return EMPLOYEE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}
