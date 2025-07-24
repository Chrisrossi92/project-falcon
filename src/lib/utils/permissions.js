// lib/utils/permissions.js

// Order Permissions
export const canViewAllOrders = (role) => role === 'admin';

export const canViewOrder = (role, orderAppraiserId, userId) =>
  role === 'admin' || (role === 'appraiser' && orderAppraiserId === userId) || (role === 'reviewer' && orderAppraiserId === userId); // Extend for reviewer seeing assigned reviews

export const canCreateOrder = (role) => role === 'admin';

export const canEditOrder = (role, orderAppraiserId, userId, orderStatus) => {
  if (role === 'admin') return true;
  if (role === 'appraiser' && orderAppraiserId === userId && ['In Progress', 'Site Visit Scheduled'].includes(orderStatus)) return true; // Appraisers edit own in active states
  if (role === 'reviewer' && orderAppraiserId === userId && orderStatus === 'Needs Review') return true; // Placeholder for reviewer edits
  return false;
};

export const canDeleteOrder = (role) => role === 'admin';

export const canAssignAppraiser = (role) => role === 'admin';

export const canUpdateOrderStatus = (role, orderAppraiserId, userId, newStatus) => {
  if (role === 'admin') return true;
  if (role === 'appraiser' && orderAppraiserId === userId) {
    return ['In Progress', 'Site Visit Completed', 'Ready for Review'].includes(newStatus); // Appraisers advance their own
  }
  if (role === 'reviewer' && orderAppraiserId === userId && newStatus === 'Reviewed') return true; // Placeholder
  return false;
};

export const canUploadFileToOrder = (role, orderAppraiserId, userId) =>
  role === 'admin' || (role === 'appraiser' && orderAppraiserId === userId) || (role === 'reviewer' && orderAppraiserId === userId);

// Calendar/Event Permissions (for useOrderEvents.js)
export const canViewSiteVisit = (role, orderAppraiserId, userId) =>
  role === 'admin' || (role === 'appraiser' && orderAppraiserId === userId);

export const canViewDueDate = (role, orderAppraiserId, userId) =>
  role === 'admin' || (role === 'appraiser' && orderAppraiserId === userId);

export const canViewReviewDue = (role, orderStatus, userId, orderReviewerId) =>
  (role === 'admin' || (role === 'reviewer' && orderReviewerId === userId)) && orderStatus === 'Needs Review'; // Add orderReviewerId if you add that field

// Client/User Permissions
export const canViewAllClients = (role) => role === 'admin';

export const canEditClient = (role) => role === 'admin';

export const canViewAllUsers = (role) => role === 'admin';

export const canEditUser = (role, targetUserId, userId) =>
  role === 'admin' || targetUserId === userId; // Users edit own profile

// Activity Log Permissions
export const canViewActivityLog = (role, logUserId, userId, isShared) => {
  if (role === 'admin') return true;
  if (role === 'appraiser' && logUserId === userId) return true; // Own logs
  return isShared; // Shared with team
};

export const canCreateActivityLog = (role) => ['admin', 'appraiser', 'reviewer'].includes(role); // All roles can log actions

// Review Workflow Placeholders (flesh out as implemented)
export const canAssignReviewer = (role) => role === 'admin';

export const canReviewOrder = (role, orderStatus, orderReviewerId, userId) =>
  role === 'reviewer' && orderStatus === 'Needs Review' && orderReviewerId === userId;