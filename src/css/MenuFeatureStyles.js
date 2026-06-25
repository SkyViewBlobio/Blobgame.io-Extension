import { buildMenuPageLayoutCss } from './menu/MenuFeaturePageLayoutStyles.js';
import { buildMenuToolbarCss } from './menu/MenuFeatureToolbarStyles.js';
import { buildMenuSettingsCss } from './menu/MenuFeatureSettingsStyles.js';

export function buildMenuCss({ className, hiddenClass, toolbarClass }) {
  return [
    buildMenuPageLayoutCss({ className, hiddenClass, toolbarClass }),
    buildMenuToolbarCss({ className, hiddenClass, toolbarClass }),
    buildMenuSettingsCss({ className, hiddenClass, toolbarClass }),
  ].join('\n\n').trim();
}
