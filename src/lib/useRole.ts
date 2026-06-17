import { useState, useEffect } from "react";

export type UserRole = "admin" | "hr_manager" | "aho_employee" | "dean";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Администратор",
  hr_manager: "HR менеджер",
  aho_employee: "Сотрудник АХО",
  dean: "Декан",
};

export function useRole() {
  const [role, setRole] = useState<UserRole>("admin");

  useEffect(() => {
    const stored = localStorage.getItem("aida_user_role") as UserRole;
    if (stored && Object.keys(ROLE_LABELS).includes(stored)) {
      setRole(stored);
    }
  }, []);

  const changeRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem("aida_user_role", newRole);
  };

  const canChangeAHOStatus = role === "admin" || role === "aho_employee";

  return {
    role,
    setRole: changeRole,
    roleLabel: ROLE_LABELS[role],
    canChangeAHOStatus,
    allRoles: Object.entries(ROLE_LABELS) as [UserRole, string][],
  };
}
