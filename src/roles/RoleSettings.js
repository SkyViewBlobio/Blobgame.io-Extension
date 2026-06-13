export const HIDE_ADMIN_MD_STORAGE_KEY = 'blobio.roles.hideAdminMd';

export function isHideAdminMdEnabled(storage) {
  try {
    const value = storage?.getItem?.(HIDE_ADMIN_MD_STORAGE_KEY);
    return value === null || value === undefined ? true : value === '1';
  } catch {
    return true;
  }
}

export function setHideAdminMdEnabled(storage, enabled) {
  try {
    storage?.setItem?.(HIDE_ADMIN_MD_STORAGE_KEY, enabled ? '1' : '0');
    return Boolean(enabled);
  } catch {
    return isHideAdminMdEnabled(storage);
  }
}
