const VENDOR_ERROR_MESSAGES = Object.freeze({
  vendor_relationship_invalid: "This company cannot be added as a vendor for the current workspace.",
  vendor_profile_duplicate: "This vendor is already in your Vendor Directory.",
  vendor_company_required: "Choose an existing vendor company or enter a new vendor company name.",
  vendor_company_name_required: "Vendor company name is required.",
  vendor_payload_invalid: "Some vendor details are invalid. Review the form and try again.",
  vendor_create_permission_required: "You do not have permission to add vendors.",
  vendor_update_permission_required: "You do not have permission to update this vendor.",
  vendor_contacts_manage_permission_required: "You do not have permission to manage vendor contacts.",
  vendor_service_areas_manage_permission_required: "You do not have permission to manage vendor coverage.",
  vendor_contact_not_found_or_not_authorized: "That contact could not be found or you do not have access to it.",
  vendor_service_area_not_found_or_not_authorized: "That coverage could not be found or you do not have access to it.",
  vendor_profile_not_found_or_not_authorized: "That vendor could not be found or you do not have access to it.",
  vendor_directory_vendors_read_permission_required: "You do not have permission to view vendor suggestions.",
  order_scope_not_amc_operations: "Suggested vendors are available only for AMC Operations orders.",
  order_not_found_or_not_authorized: "That order could not be found or you do not have access to it.",
  order_not_found: "That order could not be found or you do not have access to it.",
  app_user_not_found: "Your user profile could not be verified. Sign out and back in, then try again.",
  current_company_membership_required: "Your current workspace membership could not be verified.",
  company_not_found: "Your current workspace could not be verified.",
  company_inactive: "Your current workspace is inactive.",
});

const KNOWN_VENDOR_ERROR_CODES = Object.keys(VENDOR_ERROR_MESSAGES);

function vendorErrorText(error) {
  return [
    error?.message,
    error?.code,
    error?.details,
    error?.hint,
  ].filter(Boolean).join(" ").toLowerCase();
}

export function getVendorErrorMessage(error, options = {}) {
  const text = vendorErrorText(error);

  if (options.selfVendorMessage && text.includes("vendor_relationship_invalid")) {
    return "You cannot add your current company as its own vendor.";
  }

  const matchedCode = KNOWN_VENDOR_ERROR_CODES.find((code) => text.includes(code));
  if (matchedCode) return VENDOR_ERROR_MESSAGES[matchedCode];

  if (text.includes("duplicate")) return VENDOR_ERROR_MESSAGES.vendor_profile_duplicate;
  if (text.includes("42501") || text.includes("permission")) {
    return options.permissionMessage || "You do not have permission to perform this vendor action.";
  }

  return options.fallback || "Vendor action failed. Please review the details and try again.";
}
