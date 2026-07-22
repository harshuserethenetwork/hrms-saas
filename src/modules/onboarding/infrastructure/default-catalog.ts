export interface CatalogPermission {
  module: string;
  action: string;
  code: string;
  description: string;
}

export interface CatalogRole {
  name: string;
  description: string;
  isSystem: boolean;
  permissionCodes: string[];
}

export const DEFAULT_PERMISSIONS: CatalogPermission[] = [
  // Organization
  {
    module: 'organization',
    action: 'read',
    code: 'organization:read',
    description: 'View organization details',
  },
  {
    module: 'organization',
    action: 'update',
    code: 'organization:update',
    description: 'Update organization settings',
  },

  // Members
  {
    module: 'members',
    action: 'create',
    code: 'members:create',
    description: 'Add new organization members',
  },
  {
    module: 'members',
    action: 'read',
    code: 'members:read',
    description: 'View organization members list',
  },
  {
    module: 'members',
    action: 'update',
    code: 'members:update',
    description: 'Edit organization member details',
  },
  {
    module: 'members',
    action: 'delete',
    code: 'members:delete',
    description: 'Remove members from organization',
  },
  {
    module: 'members',
    action: 'invite',
    code: 'members:invite',
    description: 'Invite new users to organization',
  },

  // Roles
  {
    module: 'roles',
    action: 'create',
    code: 'roles:create',
    description: 'Create custom organization roles',
  },
  {
    module: 'roles',
    action: 'read',
    code: 'roles:read',
    description: 'View roles and their permissions',
  },
  {
    module: 'roles',
    action: 'update',
    code: 'roles:update',
    description: 'Modify custom roles',
  },
  {
    module: 'roles',
    action: 'delete',
    code: 'roles:delete',
    description: 'Delete custom roles',
  },
  {
    module: 'roles',
    action: 'assign',
    code: 'roles:assign',
    description: 'Assign roles to members',
  },

  // Employees
  {
    module: 'employees',
    action: 'create',
    code: 'employees:create',
    description: 'Create employee profiles',
  },
  {
    module: 'employees',
    action: 'read',
    code: 'employees:read',
    description: 'View employee directories and profiles',
  },
  {
    module: 'employees',
    action: 'update',
    code: 'employees:update',
    description: 'Modify employee profiles',
  },
  {
    module: 'employees',
    action: 'delete',
    code: 'employees:delete',
    description: 'Terminate or delete employee profiles',
  },

  // Leaves
  {
    module: 'leaves',
    action: 'create',
    code: 'leaves:create',
    description: 'Apply for leaves',
  },
  {
    module: 'leaves',
    action: 'read',
    code: 'leaves:read',
    description: 'View leave requests',
  },
  {
    module: 'leaves',
    action: 'update',
    code: 'leaves:update',
    description: 'Modify leave requests',
  },
  {
    module: 'leaves',
    action: 'delete',
    code: 'leaves:delete',
    description: 'Cancel leave requests',
  },
  {
    module: 'leaves',
    action: 'approve',
    code: 'leaves:approve',
    description: 'Approve leave requests',
  },
  {
    module: 'leaves',
    action: 'reject',
    code: 'leaves:reject',
    description: 'Reject leave requests',
  },

  // Attendance
  {
    module: 'attendance',
    action: 'create',
    code: 'attendance:create',
    description: 'Log clock-in/out times',
  },
  {
    module: 'attendance',
    action: 'read',
    code: 'attendance:read',
    description: 'View attendance logs',
  },
  {
    module: 'attendance',
    action: 'update',
    code: 'attendance:update',
    description: 'Modify attendance logs',
  },
  {
    module: 'attendance',
    action: 'approve',
    code: 'attendance:approve',
    description: 'Approve attendance records',
  },

  // Payroll
  {
    module: 'payroll',
    action: 'create',
    code: 'payroll:create',
    description: 'Generate payroll runs',
  },
  {
    module: 'payroll',
    action: 'read',
    code: 'payroll:read',
    description: 'View payslips and payroll reports',
  },
  {
    module: 'payroll',
    action: 'update',
    code: 'payroll:update',
    description: 'Edit payroll variables',
  },
  {
    module: 'payroll',
    action: 'approve',
    code: 'payroll:approve',
    description: 'Approve payroll payouts',
  },
];

export const DEFAULT_ROLES: CatalogRole[] = [
  {
    name: 'Company Admin',
    description:
      'Full administrative access to all modules and configurations.',
    isSystem: true,
    permissionCodes: DEFAULT_PERMISSIONS.map((p) => p.code),
  },
  {
    name: 'HR',
    description:
      'Manage organization members, employee directories, attendance, leaves, and payroll.',
    isSystem: true,
    permissionCodes: [
      'organization:read',
      'members:create',
      'members:read',
      'members:update',
      'members:invite',
      'roles:read',
      'roles:assign',
      'employees:create',
      'employees:read',
      'employees:update',
      'leaves:create',
      'leaves:read',
      'leaves:update',
      'leaves:delete',
      'leaves:approve',
      'leaves:reject',
      'attendance:create',
      'attendance:read',
      'attendance:update',
      'attendance:approve',
      'payroll:create',
      'payroll:read',
      'payroll:update',
    ],
  },
  {
    name: 'Manager',
    description:
      'Team leads and managers who view team directories and approve time/leave requests.',
    isSystem: true,
    permissionCodes: [
      'organization:read',
      'members:read',
      'employees:read',
      'leaves:create',
      'leaves:read',
      'leaves:update',
      'leaves:approve',
      'leaves:reject',
      'attendance:create',
      'attendance:read',
      'attendance:update',
    ],
  },
  {
    name: 'Employee',
    description:
      'Regular employees with access to self-service profiles, leave requests, and clocking in/out.',
    isSystem: true,
    permissionCodes: [
      'organization:read',
      'employees:read',
      'leaves:create',
      'leaves:read',
      'leaves:delete',
      'attendance:create',
      'attendance:read',
    ],
  },
];
